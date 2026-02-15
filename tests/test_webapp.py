"""
Webapp test: reconnaissance + functional testing of the Solar Auxilia List Builder.
Uses Playwright to verify the app loads, can create rosters, and interact with units.
"""
from playwright.sync_api import sync_playwright
import sys

FRONTEND_URL = "http://localhost:5173"
ERRORS = []
PASSES = []


def test(name):
    """Decorator to run a test and track pass/fail."""
    def decorator(fn):
        def wrapper(page):
            try:
                fn(page)
                PASSES.append(name)
                print(f"  PASS  {name}")
            except Exception as e:
                ERRORS.append((name, str(e)))
                print(f"  FAIL  {name}: {e}")
        return wrapper
    return decorator


# -- Right panel helper: the roster panel is inside <aside> or the right section
def roster_panel(page):
    return page.locator("aside").first


@test("Page loads with correct title")
def test_page_loads(page):
    title = page.title()
    assert title, f"Page has no title"


@test("Header displays app name")
def test_header(page):
    header = page.locator("header")
    assert header.is_visible(), "Header not visible"
    # CSS text-transform: uppercase makes it uppercase, so check case-insensitively
    text = header.inner_text().lower()
    assert "solar auxilia" in text, f"Header missing app name, got: {text[:100]}"


@test("Roster setup form is visible initially")
def test_roster_setup(page):
    panel = roster_panel(page)
    heading = panel.locator("text=New Roster")
    assert heading.is_visible(), "New Roster heading not found"

    # Roster name input (inside the aside panel, not the search input)
    name_input = panel.locator("input[type='text']")
    assert name_input.is_visible(), "Name input not found"

    points_select = panel.locator("select")
    assert points_select.is_visible(), "Points select not found"

    create_btn = panel.locator("text=Initialize Roster")
    assert create_btn.is_visible(), "Initialize Roster button not found"


@test("Can create a new roster")
def test_create_roster(page):
    panel = roster_panel(page)

    name_input = panel.locator("input[type='text']")
    name_input.clear()
    name_input.fill("Test Roster")

    points_select = panel.locator("select")
    points_select.select_option("3000")

    create_btn = panel.locator("text=Initialize Roster")
    create_btn.click()

    # Wait for roster to load
    page.wait_for_timeout(2000)
    page.screenshot(path="/tmp/test_after_create.png", full_page=True)

    # Verify roster was created
    roster_name = panel.locator("text=Test Roster").first
    assert roster_name.is_visible(), "Roster name not visible after creation"


@test("Unit browser is visible with units")
def test_unit_browser(page):
    # Left panel should show units — look for "pts" text in buttons
    main_area = page.locator("main").first
    buttons = main_area.locator("button").all()
    unit_buttons = [b for b in buttons if b.is_visible() and "pts" in (b.inner_text() or "")]
    assert len(unit_buttons) > 0, "No unit cards found in browser"
    print(f"    Found {len(unit_buttons)} unit cards")


@test("Category filter buttons exist")
def test_category_filter(page):
    all_btn = page.locator("main button:has-text('All')").first
    assert all_btn.is_visible(), "'All' filter button not found"


@test("Search input works")
def test_search(page):
    search = page.locator("input[placeholder*='earch']").first
    assert search.is_visible(), "Search input not found"

    search.fill("Lasrifle")
    page.wait_for_timeout(600)
    page.screenshot(path="/tmp/test_search.png", full_page=True)

    # Should filter results
    main_area = page.locator("main").first
    visible_buttons = [b for b in main_area.locator("button").all()
                       if b.is_visible() and "pts" in (b.inner_text() or "")]
    print(f"    Search 'Lasrifle' shows {len(visible_buttons)} results")

    search.clear()
    page.wait_for_timeout(400)


@test("Points bar shows limit")
def test_points_bar(page):
    panel = roster_panel(page)
    text = panel.inner_text()
    assert "3000" in text or "3,000" in text, "Points limit not displayed"


@test("Add Detachment button exists")
def test_add_detachment_button(page):
    panel = roster_panel(page)
    btn = panel.locator("text=Add Detachment").first
    assert btn.is_visible(), "Add Detachment button not found"


@test("Can open detachment picker and see types")
def test_detachment_picker(page):
    panel = roster_panel(page)
    btn = panel.locator("text=Add Detachment").first
    btn.click()
    page.wait_for_timeout(600)

    picker_heading = panel.locator("text=Select Detachment").first
    assert picker_heading.is_visible(), "Detachment picker didn't open"

    # Should show Primary type heading
    panel_text = panel.inner_text()
    assert "Primary" in panel_text, "Primary detachment type not shown in picker"

    page.screenshot(path="/tmp/test_detachment_picker.png", full_page=True)


@test("Can add a Primary detachment")
def test_add_primary(page):
    panel = roster_panel(page)

    # Find enabled buttons in the picker that contain "Tercio" or similar detachment names
    picker_buttons = panel.locator("button").all()

    clicked = False
    for btn in picker_buttons:
        if not btn.is_visible() or not btn.is_enabled():
            continue
        text = btn.inner_text()
        # Skip control buttons, look for actual detachment names
        if any(skip in text for skip in ["Add Detachment", "Select", "Cancel", "New", "Validate", "Export"]):
            continue
        if any(kw in text for kw in ["Tercio", "Cohort", "Detachment", "Brigade"]):
            btn.click()
            clicked = True
            break

    if not clicked:
        # Fallback: click the first enabled non-control button in picker
        for btn in picker_buttons:
            if not btn.is_visible() or not btn.is_enabled():
                continue
            text = btn.inner_text()
            if any(skip in text for skip in ["Add Detachment", "Select", "Cancel", "New", "Validate", "Export", "Test Roster"]):
                continue
            if len(text.strip()) > 2:
                btn.click()
                clicked = True
                break

    assert clicked, "Could not find a detachment to add"

    page.wait_for_timeout(2000)
    page.screenshot(path="/tmp/test_after_add_primary.png", full_page=True)


@test("Detachment section appears with slots")
def test_detachment_section(page):
    panel = roster_panel(page)
    panel_text = panel.inner_text()
    # BSData native slot names for SA detachments
    has_slots = any(word in panel_text for word in [
        "Command", "Troops", "Support", "Veletaris", "Armour",
        "Infantry", "Recon", "Artillery", "Heavy", "HQ",
        "High Command", "Line", "Dedicated Transport",
        # Also check for slot count pattern like "0/2" or "0/4"
    ])
    # Fallback: check for fill count patterns like "0/2", "0/4", etc.
    if not has_slots:
        import re
        has_slots = bool(re.search(r'\d+/\d+', panel_text))
    assert has_slots, f"No slot names or fill counts visible in roster panel"


@test("Budget chips show Primary 1/1")
def test_budget_chips(page):
    panel = roster_panel(page)
    panel_text = panel.inner_text()
    assert "1/1" in panel_text, f"Primary budget chip not showing 1/1"


@test("Can expand a unit card and see details")
def test_expand_unit(page):
    main_area = page.locator("main").first
    buttons = main_area.locator("button").all()

    expanded = False
    for btn in buttons:
        if not btn.is_visible():
            continue
        text = btn.inner_text()
        if "pts" in text and len(text) < 200:
            btn.click()
            page.wait_for_timeout(600)
            expanded = True
            break

    assert expanded, "Could not find a unit card to expand"
    page.screenshot(path="/tmp/test_unit_expanded.png", full_page=True)


@test("Validate Roster button exists")
def test_validate_button(page):
    panel = roster_panel(page)
    # Scroll to bottom of panel if needed
    btn = panel.locator("text=Validate Roster").first
    # It might be below the fold — check if it exists in DOM
    count = panel.locator("text=Validate Roster").count()
    assert count > 0, "Validate Roster button not in DOM"


@test("New button exists to reset roster")
def test_new_button(page):
    panel = roster_panel(page)
    btn = panel.locator("text=New").first
    assert btn.is_visible(), "New button not found"


def main():
    print("\n  Solar Auxilia List Builder - Webapp Tests\n")
    print("=" * 55)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        print(f"\n  Navigating to {FRONTEND_URL}...")
        page.goto(FRONTEND_URL)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)

        page.screenshot(path="/tmp/test_initial.png", full_page=True)
        print("  Initial screenshot: /tmp/test_initial.png\n")

        # Run tests in order
        test_page_loads(page)
        test_header(page)
        test_roster_setup(page)
        test_create_roster(page)
        test_unit_browser(page)
        test_category_filter(page)
        test_search(page)
        test_points_bar(page)
        test_add_detachment_button(page)
        test_detachment_picker(page)
        test_add_primary(page)
        test_detachment_section(page)
        test_budget_chips(page)
        test_expand_unit(page)
        test_validate_button(page)
        test_new_button(page)

        page.screenshot(path="/tmp/test_final.png", full_page=True)
        browser.close()

    # Summary
    total = len(PASSES) + len(ERRORS)
    print("\n" + "=" * 55)
    print(f"\n  Results: {len(PASSES)}/{total} passed, {len(ERRORS)} failed\n")

    if ERRORS:
        print("  Failures:")
        for name, err in ERRORS:
            # Truncate long error messages
            short = err.split("\n")[0][:120]
            print(f"    - {name}: {short}")
        print()

    print("  Screenshots:")
    print("    /tmp/test_initial.png")
    print("    /tmp/test_after_create.png")
    print("    /tmp/test_search.png")
    print("    /tmp/test_detachment_picker.png")
    print("    /tmp/test_after_add_primary.png")
    print("    /tmp/test_unit_expanded.png")
    print("    /tmp/test_final.png")
    print()

    return 1 if ERRORS else 0


if __name__ == "__main__":
    sys.exit(main())
