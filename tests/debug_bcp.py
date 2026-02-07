"""Debug script to inspect Best Coast Pairings website structure."""
import asyncio
from playwright.async_api import async_playwright

async def debug_bcp():
    """Inspect BCP website to find correct selectors."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)  # Headless for speed
        page = await browser.new_page()

        print("Navigating to Best Coast Pairings...")
        await page.goto("https://www.bestcoastpairings.com/events", timeout=30000)
        await page.wait_for_load_state("networkidle")

        # Take a screenshot
        await page.screenshot(path="data/bcp_debug.png")
        print("Screenshot saved to data/bcp_debug.png")

        # Get page title
        title = await page.title()
        print(f"Page title: {title}")

        # Try to find search input
        search_inputs = await page.locator('input').all()
        print(f"\nFound {len(search_inputs)} input elements")
        for i, input_elem in enumerate(search_inputs[:5]):
            placeholder = await input_elem.get_attribute("placeholder") or ""
            name = await input_elem.get_attribute("name") or ""
            input_type = await input_elem.get_attribute("type") or ""
            print(f"  Input {i}: type={input_type}, name={name}, placeholder={placeholder}")

        # Try to find event links
        links = await page.locator('a').all()
        print(f"\nFound {len(links)} total links")

        event_links = [link for link in links if "event" in (await link.get_attribute("href") or "").lower()]
        print(f"Found {len(event_links)} links with 'event' in href")

        if event_links:
            print("\nFirst 5 event-related links:")
            for i, link in enumerate(event_links[:5]):
                href = await link.get_attribute("href")
                text = await link.text_content()
                print(f"  {i}: {href} - {text[:50] if text else 'No text'}")

        # Check for specific elements
        print("\nLooking for common BCP elements...")

        # Try different selectors
        selectors_to_try = [
            'a[href*="/event"]',
            'a[href*="eventlanding"]',
            '.event-card',
            '.tournament',
            '[class*="event"]',
            '[data-event-id]',
        ]

        for selector in selectors_to_try:
            count = await page.locator(selector).count()
            print(f"  {selector}: {count} elements")

        await browser.close()
        print("\nDone!")

if __name__ == "__main__":
    asyncio.run(debug_bcp())
