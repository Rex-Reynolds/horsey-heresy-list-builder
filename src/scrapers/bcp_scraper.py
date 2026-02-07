"""Best Coast Pairings tournament scraper."""
import asyncio
import logging
import re
from datetime import datetime
from typing import Optional

from playwright.async_api import async_playwright, Page, TimeoutError as PlaywrightTimeout

from src.config import BCP_BASE_URL, USER_AGENT
from src.scrapers.base import TournamentScraper
from src.models import Tournament, ArmyList, db

logger = logging.getLogger(__name__)


class BCPScraper(TournamentScraper):
    """Scraper for Best Coast Pairings tournament data."""

    async def scrape_tournaments(self, game: str = "Horus Heresy") -> list[dict]:
        """
        Scrape tournament listings from BCP.

        Returns list of tournament metadata dicts with:
        - name, date, location, player_count, bcp_event_id
        """
        logger.info(f"Searching for {game} tournaments on BCP")
        tournaments = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(user_agent=USER_AGENT)
            page = await context.new_page()

            try:
                # Navigate to BCP events search
                await page.goto(f"{BCP_BASE_URL}/events", timeout=30000)
                await self.rate_limited_delay()

                # Search for Horus Heresy events
                search_input = page.locator('input[placeholder*="Search"], input[name="search"]').first
                if await search_input.count() > 0:
                    await search_input.fill(game)
                    await page.keyboard.press("Enter")
                    await page.wait_for_load_state("networkidle", timeout=15000)

                # Extract event links
                event_links = await page.locator('a[href*="/eventlanding/"]').all()
                logger.info(f"Found {len(event_links)} potential events")

                for link in event_links[:20]:  # Limit to 20 most recent
                    try:
                        event_url = await link.get_attribute("href")
                        if not event_url:
                            continue

                        # Extract event ID from URL
                        event_id_match = re.search(r'/eventlanding/([^/]+)', event_url)
                        if not event_id_match:
                            continue

                        event_id = event_id_match.group(1)
                        cache_key = f"tournament_{event_id}"

                        # Check cache first
                        cached = self.read_cache(cache_key)
                        if cached:
                            tournaments.append(cached)
                            continue

                        # Scrape tournament details
                        tournament_data = await self._scrape_tournament_details(page, event_id)
                        if tournament_data:
                            self.write_cache(cache_key, tournament_data)
                            tournaments.append(tournament_data)

                        await self.rate_limited_delay()

                    except Exception as e:
                        logger.error(f"Error processing event link: {e}")
                        continue

            except PlaywrightTimeout:
                logger.error("Timeout while loading BCP events page")
            except Exception as e:
                logger.error(f"Error scraping tournaments: {e}")
            finally:
                await browser.close()

        logger.info(f"Successfully scraped {len(tournaments)} tournaments")
        return tournaments

    async def _scrape_tournament_details(self, page: Page, event_id: str) -> Optional[dict]:
        """Scrape details for a specific tournament."""
        try:
            url = f"{BCP_BASE_URL}/eventlanding/{event_id}"
            await page.goto(url, timeout=20000)
            await page.wait_for_load_state("domcontentloaded")

            # Extract tournament name
            name_elem = page.locator('h1, .event-name, [class*="title"]').first
            name = await name_elem.text_content() if await name_elem.count() > 0 else f"Event {event_id}"
            name = name.strip()

            # Extract date (try multiple selectors)
            date_text = None
            date_selectors = ['.event-date', '[class*="date"]', 'time']
            for selector in date_selectors:
                elem = page.locator(selector).first
                if await elem.count() > 0:
                    date_text = await elem.text_content()
                    break

            # Parse date
            event_date = self._parse_date(date_text) if date_text else datetime.now().date()

            # Extract location
            location_elem = page.locator('.event-location, [class*="location"]').first
            location = await location_elem.text_content() if await location_elem.count() > 0 else None
            if location:
                location = location.strip()

            # Extract player count
            player_count = 0
            player_selectors = ['[class*="player"]', '[class*="participant"]', '.roster']
            for selector in player_selectors:
                elements = await page.locator(selector).all()
                if elements:
                    player_count = len(elements)
                    break

            return {
                "name": name,
                "date": event_date.isoformat(),
                "location": location,
                "player_count": player_count,
                "bcp_event_id": event_id,
            }

        except Exception as e:
            logger.error(f"Error scraping tournament {event_id}: {e}")
            return None

    async def scrape_tournament_lists(self, tournament_id: str) -> list[dict]:
        """
        Scrape army lists from a specific tournament.

        Returns list of army list dicts with:
        - player_name, faction, list_text, points, placement
        """
        logger.info(f"Scraping army lists for tournament {tournament_id}")
        lists = []

        cache_key = f"lists_{tournament_id}"
        cached = self.read_cache(cache_key)
        if cached:
            return cached

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(user_agent=USER_AGENT)
            page = await context.new_page()

            try:
                url = f"{BCP_BASE_URL}/eventlanding/{tournament_id}"
                await page.goto(url, timeout=30000)
                await page.wait_for_load_state("networkidle", timeout=15000)

                # Look for roster/player list links
                player_links = await page.locator('a[href*="/roster/"], a[href*="/player/"]').all()
                logger.info(f"Found {len(player_links)} player entries")

                for idx, link in enumerate(player_links):
                    try:
                        player_url = await link.get_attribute("href")
                        if not player_url:
                            continue

                        # Visit player page to get list
                        await page.goto(f"{BCP_BASE_URL}{player_url}" if not player_url.startswith("http") else player_url, timeout=20000)
                        await page.wait_for_load_state("domcontentloaded")

                        # Extract player name
                        player_name_elem = page.locator('h2, .player-name, [class*="name"]').first
                        player_name = await player_name_elem.text_content() if await player_name_elem.count() > 0 else f"Player {idx+1}"
                        player_name = player_name.strip()

                        # Extract faction (look for "Solar Auxilia" or similar)
                        faction = "Unknown"
                        faction_elem = page.locator('[class*="faction"], [class*="army"]').first
                        if await faction_elem.count() > 0:
                            faction_text = await faction_elem.text_content()
                            if "Solar Auxilia" in faction_text or "auxilia" in faction_text.lower():
                                faction = "Solar Auxilia"

                        # Extract army list text
                        list_elem = page.locator('[class*="list"], [class*="roster"], pre, textarea').first
                        list_text = ""
                        if await list_elem.count() > 0:
                            list_text = await list_elem.text_content()

                        if not list_text or len(list_text) < 50:
                            logger.debug(f"No valid list found for {player_name}")
                            continue

                        # Extract points (look for total)
                        points = self._extract_points(list_text)

                        lists.append({
                            "player_name": player_name,
                            "faction": faction,
                            "list_text": list_text.strip(),
                            "points": points,
                            "placement": None,  # BCP doesn't always show placement
                        })

                        await self.rate_limited_delay()

                    except Exception as e:
                        logger.error(f"Error processing player {idx}: {e}")
                        continue

            except Exception as e:
                logger.error(f"Error scraping lists for tournament {tournament_id}: {e}")
            finally:
                await browser.close()

        self.write_cache(cache_key, lists)
        logger.info(f"Scraped {len(lists)} army lists")
        return lists

    def _parse_date(self, date_text: str) -> datetime:
        """Parse date from various text formats."""
        date_text = date_text.strip()

        # Try common formats
        formats = [
            "%Y-%m-%d",
            "%m/%d/%Y",
            "%B %d, %Y",
            "%b %d, %Y",
            "%d %B %Y",
            "%d %b %Y",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_text, fmt).date()
            except ValueError:
                continue

        # Default to current date if parsing fails
        logger.warning(f"Could not parse date: {date_text}")
        return datetime.now().date()

    def _extract_points(self, list_text: str) -> Optional[int]:
        """Extract total points from list text."""
        # Look for patterns like "Total: 2000pts", "[2000pts]", "2000 Points"
        patterns = [
            r'Total[:\s]+(\d+)\s*pts?',
            r'\[(\d+)\s*pts?\]',
            r'(\d+)\s*Points',
            r'Army Total:\s*(\d+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, list_text, re.IGNORECASE)
            if match:
                return int(match.group(1))

        return None


async def scrape_and_store_tournaments(scraper: BCPScraper):
    """Convenience function to scrape tournaments and store in database."""
    tournaments = await scraper.scrape_tournaments()

    with db.atomic():
        for t_data in tournaments:
            # Check if tournament already exists
            existing = Tournament.get_or_none(Tournament.bcp_event_id == t_data["bcp_event_id"])
            if existing:
                logger.info(f"Tournament {t_data['name']} already exists, skipping")
                continue

            # Create tournament
            tournament = Tournament.create(
                name=t_data["name"],
                date=t_data["date"],
                location=t_data.get("location"),
                player_count=t_data.get("player_count", 0),
                bcp_event_id=t_data["bcp_event_id"],
            )
            logger.info(f"Created tournament: {tournament.name}")

            # Scrape lists for this tournament
            lists = await scraper.scrape_tournament_lists(t_data["bcp_event_id"])

            for list_data in lists:
                # Only store Solar Auxilia lists
                if "Solar Auxilia" not in list_data["faction"]:
                    continue

                ArmyList.create(
                    tournament=tournament,
                    player_name=list_data["player_name"],
                    faction=list_data["faction"],
                    list_text=list_data["list_text"],
                    points=list_data.get("points"),
                    placement=list_data.get("placement"),
                )

            logger.info(f"Stored {len(lists)} lists for {tournament.name}")
