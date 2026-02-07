"""Base scraper interface and utilities."""
import asyncio
import hashlib
import json
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional
import logging

from src.config import CACHE_DIR, SCRAPE_DELAY

logger = logging.getLogger(__name__)


class TournamentScraper(ABC):
    """Abstract base class for tournament data scrapers."""

    def __init__(self, cache_enabled: bool = True, rate_limit: float = SCRAPE_DELAY):
        self.cache_enabled = cache_enabled
        self.rate_limit = rate_limit
        self.cache_dir = CACHE_DIR / self.__class__.__name__.lower()
        if cache_enabled:
            self.cache_dir.mkdir(exist_ok=True)

    @abstractmethod
    async def scrape_tournaments(self, game: str = "Horus Heresy") -> list[dict]:
        """Scrape tournament listings. Returns list of tournament metadata."""
        pass

    @abstractmethod
    async def scrape_tournament_lists(self, tournament_id: str) -> list[dict]:
        """Scrape army lists from a specific tournament."""
        pass

    async def rate_limited_delay(self):
        """Apply rate limiting between requests."""
        await asyncio.sleep(self.rate_limit)

    def get_cache_path(self, key: str) -> Path:
        """Generate cache file path for a given key."""
        cache_key = hashlib.md5(key.encode()).hexdigest()
        return self.cache_dir / f"{cache_key}.json"

    def read_cache(self, key: str) -> Optional[dict]:
        """Read data from cache if it exists."""
        if not self.cache_enabled:
            return None

        cache_path = self.get_cache_path(key)
        if cache_path.exists():
            try:
                with open(cache_path, 'r') as f:
                    logger.debug(f"Cache hit: {key}")
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Cache read error for {key}: {e}")
                return None
        return None

    def write_cache(self, key: str, data: dict):
        """Write data to cache."""
        if not self.cache_enabled:
            return

        cache_path = self.get_cache_path(key)
        try:
            with open(cache_path, 'w') as f:
                json.dump(data, f, indent=2)
            logger.debug(f"Cache written: {key}")
        except IOError as e:
            logger.warning(f"Cache write error for {key}: {e}")
