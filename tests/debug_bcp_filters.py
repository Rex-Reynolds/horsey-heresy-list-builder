"""Debug BCP filters to find Horus Heresy events."""
import asyncio
from playwright.async_api import async_playwright

async def debug_filters():
    """Explore BCP filter options."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Loading BCP events page...")
        await page.goto("https://www.bestcoastpairings.com/events", timeout=30000)
        await page.wait_for_load_state("networkidle")

        # Try to find game type dropdown/select
        print("\nLooking for game type selector...")

        # Check for select element
        selects = await page.locator('select').all()
        print(f"Found {len(selects)} select elements")

        for i, select in enumerate(selects):
            name = await select.get_attribute("name") or ""
            print(f"\n  Select {i} (name={name}):")

            # Get options
            options = await select.locator('option').all()
            for j, option in enumerate(options[:20]):  # Limit to first 20
                value = await option.get_attribute("value") or ""
                text = await option.text_content() or ""
                print(f"    {j}: value='{value}', text='{text}'")

        # Try interacting with game type filter
        print("\n\nTrying to filter by game...")

        # Look for input with name="gameType"
        game_type_input = page.locator('input[name="gameType"]')
        if await game_type_input.count() > 0:
            print("Found gameType input (might be autocomplete)")
            await game_type_input.fill("Horus")
            await page.wait_for_timeout(2000)  # Wait for autocomplete

            # Look for dropdown results
            dropdown_items = await page.locator('[role="option"], .autocomplete-item, [class*="dropdown"]').all()
            print(f"Found {len(dropdown_items)} dropdown items after typing")

            for item in dropdown_items[:10]:
                text = await item.text_content()
                print(f"  - {text}")

        await page.screenshot(path="data/bcp_filters_debug.png")
        print("\nScreenshot saved to data/bcp_filters_debug.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_filters())
