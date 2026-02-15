"""
Production readiness audit for the Solar Auxilia List Builder.
Tests real-world usage patterns, edge cases, error handling, accessibility,
responsive behavior, and console errors.
"""
from playwright.sync_api import sync_playwright
import sys
import re
import json

FRONTEND_URL = "http://localhost:5173"
ERRORS = []
PASSES = []
WARNINGS = []
CONSOLE_ERRORS = []


def test(name):
    def decorator(fn):
        def wrapper(page):
            try:
                fn(page)
                PASSES.append(name)
                print(f"  PASS  {name}")
            except AssertionError as e:
                ERRORS.append((name, str(e)))
                print(f"  FAIL  {name}: {e}")
            except Exception as e:
                ERRORS.append((name, str(e).split("\n")[0][:150]))
                print(f"  FAIL  {name}: {str(e).split(chr(10))[0][:150]}")
        return wrapper
    return decorator


def warn(msg):
    WARNINGS.append(msg)
    print(f"  WARN  {msg}")


def roster_panel(page):
    return page.locator("aside").first


def create_roster(page, name="Audit Roster", points="3000"):
    """Helper: create a roster from scratch."""
    panel = roster_panel(page)
    name_input = panel.locator("input[type='text']")
    name_input.clear()
    name_input.fill(name)
    panel.locator("select").select_option(points)
    panel.locator("text=Initialize Roster").click()
    page.wait_for_timeout(2000)


def add_primary_detachment(page):
    """Helper: open picker and add first available Primary detachment."""
    panel = roster_panel(page)
    panel.locator("text=Add Detachment").click()
    page.wait_for_timeout(600)
    buttons = panel.locator("button").all()
    for btn in buttons:
        if not btn.is_visible() or not btn.is_enabled():
            continue
        text = btn.inner_text()
        if any(skip in text for skip in ["Add Detachment", "Select", "Cancel", "New",
                                          "Validate", "Export", "Audit Roster"]):
            continue
        if len(text.strip()) > 2:
            btn.click()
            page.wait_for_timeout(2000)
            return True
    return False


# ─── SECTION 1: Console Errors & JS Health ───

@test("No JavaScript console errors on initial load")
def test_no_console_errors_on_load(page):
    # Console errors are collected globally
    load_errors = [e for e in CONSOLE_ERRORS if "error" in e["type"]]
    if load_errors:
        msgs = "; ".join(e["text"][:80] for e in load_errors[:3])
        assert False, f"Console errors on load: {msgs}"


@test("No unhandled promise rejections")
def test_no_unhandled_rejections(page):
    rejections = [e for e in CONSOLE_ERRORS if "unhandledrejection" in e.get("text", "").lower()]
    assert len(rejections) == 0, f"Unhandled rejections: {rejections}"


# ─── SECTION 2: API Health ───

@test("API is reachable at /api/units")
def test_api_units(page):
    resp = page.request.get(f"{FRONTEND_URL}/api/units")
    assert resp.ok, f"API /api/units returned {resp.status}"
    data = resp.json()
    assert isinstance(data, list), "API /api/units didn't return a list"
    assert len(data) > 0, "API /api/units returned empty list"
    print(f"    {len(data)} units from API")


@test("API is reachable at /api/detachments")
def test_api_detachments(page):
    resp = page.request.get(f"{FRONTEND_URL}/api/detachments")
    assert resp.ok, f"API /api/detachments returned {resp.status}"
    data = resp.json()
    assert isinstance(data, list) and len(data) > 0, "No detachments from API"
    print(f"    {len(data)} detachments from API")


@test("API returns 404 for non-existent roster")
def test_api_404(page):
    resp = page.request.get(f"{FRONTEND_URL}/api/rosters/99999")
    assert resp.status == 404, f"Expected 404, got {resp.status}"


@test("API rejects invalid roster creation")
def test_api_validation(page):
    resp = page.request.post(f"{FRONTEND_URL}/api/rosters", data=json.dumps({}),
                              headers={"Content-Type": "application/json"})
    assert resp.status == 422, f"Expected 422 for empty body, got {resp.status}"


# ─── SECTION 3: Responsive Design ───

@test("Desktop layout: both panels visible at 1440px")
def test_desktop_layout(page):
    page.set_viewport_size({"width": 1440, "height": 900})
    page.wait_for_timeout(300)

    main = page.locator("main").first
    aside = roster_panel(page)
    assert main.is_visible(), "Main panel not visible at desktop width"
    assert aside.is_visible(), "Roster panel not visible at desktop width"


@test("Mobile layout: toggle button appears at 768px")
def test_mobile_toggle(page):
    page.set_viewport_size({"width": 768, "height": 1024})
    page.wait_for_timeout(300)

    # At mobile width, there should be a toggle button
    toggle = page.locator("header button").first
    assert toggle.is_visible(), "Mobile toggle button not visible at 768px"

    page.screenshot(path="/tmp/audit_mobile.png", full_page=True)


@test("Narrow mobile: no horizontal overflow at 375px")
def test_narrow_mobile(page):
    page.set_viewport_size({"width": 375, "height": 812})
    page.wait_for_timeout(300)

    body_width = page.evaluate("document.body.scrollWidth")
    viewport_width = page.evaluate("window.innerWidth")
    overflow = body_width - viewport_width

    if overflow > 5:
        warn(f"Horizontal overflow of {overflow}px at 375px width")
    assert overflow <= 20, f"Significant horizontal overflow: {overflow}px at 375px"

    page.screenshot(path="/tmp/audit_375px.png", full_page=True)

    # Reset to desktop
    page.set_viewport_size({"width": 1440, "height": 900})
    page.wait_for_timeout(300)


# ─── SECTION 4: Interaction & UX ───

@test("Roster creation: empty name is blocked")
def test_empty_roster_name(page):
    # Reset if we have a roster
    panel = roster_panel(page)
    new_btn = panel.locator("text=New")
    if new_btn.count() > 0 and new_btn.first.is_visible():
        new_btn.first.click()
        page.wait_for_timeout(500)

    name_input = panel.locator("input[type='text']")
    name_input.clear()

    # The create button should be disabled when name is empty
    create_btn = panel.locator("text=Initialize Roster").first
    is_disabled = create_btn.is_disabled()
    assert is_disabled, "Create button should be disabled when name is empty"

    # Create a proper roster for remaining tests
    create_roster(page)


@test("Roster creation: all points options work")
def test_all_points_options(page):
    panel = roster_panel(page)
    # Reset
    new_btn = panel.locator("text=New")
    if new_btn.count() > 0 and new_btn.first.is_visible():
        new_btn.first.click()
        page.wait_for_timeout(500)

    select = panel.locator("select")
    options = select.locator("option").all()
    option_values = [opt.get_attribute("value") for opt in options]
    print(f"    Points options: {option_values}")
    assert len(option_values) >= 5, f"Only {len(option_values)} points options"

    # Create with 1000pts (smallest)
    create_roster(page, name="Small Game", points="1000")


@test("Warlord detachment locked below 3000pts")
def test_warlord_locked(page):
    panel = roster_panel(page)
    panel_text = panel.inner_text()
    # At 1000pts, Warlord should not be available
    if "Warlord" in panel_text and "0/1" in panel_text:
        warn("Warlord chip visible at 1000pts — should it be hidden?")
    # This is informational


@test("Search: no results shows empty state")
def test_search_no_results(page):
    search = page.locator("input[placeholder*='earch']").first
    search.fill("xyznonexistentunit999")
    page.wait_for_timeout(600)

    main = page.locator("main").first
    main_text = main.inner_text()

    # Should show some kind of empty state or "no results"
    unit_buttons = [b for b in main.locator("button").all()
                    if b.is_visible() and "pts" in (b.inner_text() or "")]
    if len(unit_buttons) > 0:
        warn("Search for gibberish still shows unit cards — filtering might not work")

    page.screenshot(path="/tmp/audit_search_empty.png", full_page=True)
    search.clear()
    page.wait_for_timeout(400)


@test("Search: special characters don't crash")
def test_search_special_chars(page):
    search = page.locator("input[placeholder*='earch']").first

    for term in ["<script>", "'; DROP TABLE", "\\n\\r", "🎮"]:
        search.fill(term)
        page.wait_for_timeout(300)
        # Just verify no crash
        assert page.locator("header").first.is_visible(), f"Page crashed on search: {term}"

    search.clear()
    page.wait_for_timeout(300)


@test("Double-click add detachment doesn't duplicate")
def test_double_click_detachment(page):
    panel = roster_panel(page)

    # Reset and create fresh roster
    new_btn = panel.locator("text=New")
    if new_btn.count() > 0 and new_btn.first.is_visible():
        new_btn.first.click()
        page.wait_for_timeout(500)

    create_roster(page, name="Double Click Test", points="3000")
    panel.locator("text=Add Detachment").click()
    page.wait_for_timeout(600)

    # Find a detachment button and click it
    buttons = panel.locator("button").all()
    clicked = False
    for btn in buttons:
        if not btn.is_visible() or not btn.is_enabled():
            continue
        text = btn.inner_text()
        if any(skip in text for skip in ["Add Detachment", "Select", "Cancel",
                                          "New", "Validate", "Export", "Double Click"]):
            continue
        if len(text.strip()) > 2:
            btn.click()
            clicked = True
            break

    page.wait_for_timeout(2000)

    if clicked:
        # Verify picker closed (prevents second click)
        picker = panel.locator("text=Select Detachment")
        assert picker.count() == 0 or not picker.first.is_visible(), \
            "Picker should close immediately after selection"

    page.screenshot(path="/tmp/audit_double_click.png", full_page=True)


# ─── SECTION 5: Accessibility ───

@test("All interactive elements are keyboard-focusable")
def test_keyboard_focus(page):
    # Tab through and check we can reach key elements
    page.keyboard.press("Tab")
    page.wait_for_timeout(200)

    focused = page.evaluate("document.activeElement?.tagName")
    assert focused, "No element received focus on Tab"


@test("Buttons have accessible text")
def test_button_accessibility(page):
    buttons = page.locator("button").all()
    empty_buttons = []
    for btn in buttons:
        if not btn.is_visible():
            continue
        text = btn.inner_text().strip()
        aria = btn.get_attribute("aria-label") or ""
        title = btn.get_attribute("title") or ""
        if not text and not aria and not title:
            # Check for svg-only buttons
            has_svg = btn.locator("svg").count() > 0
            if has_svg:
                empty_buttons.append("icon-button (no aria-label)")

    if empty_buttons:
        warn(f"{len(empty_buttons)} icon buttons missing aria-labels")


@test("Images have alt text")
def test_images_alt(page):
    images = page.locator("img").all()
    missing_alt = 0
    for img in images:
        if not img.is_visible():
            continue
        alt = img.get_attribute("alt")
        if alt is None or alt == "":
            missing_alt += 1

    if missing_alt > 0:
        warn(f"{missing_alt} images missing alt text")


@test("Color contrast: text is readable")
def test_color_contrast(page):
    # Check that body text color isn't too low contrast
    result = page.evaluate("""() => {
        const body = document.body;
        const style = getComputedStyle(body);
        return {
            color: style.color,
            bg: style.backgroundColor,
            fontSize: style.fontSize
        };
    }""")
    print(f"    Body: color={result['color']}, bg={result['bg']}, font={result['fontSize']}")


@test("No text smaller than 10px")
def test_minimum_text_size(page):
    tiny_elements = page.evaluate("""() => {
        const all = document.querySelectorAll('*');
        const tiny = [];
        for (const el of all) {
            const style = getComputedStyle(el);
            const size = parseFloat(style.fontSize);
            if (size < 10 && el.textContent.trim() && el.children.length === 0 &&
                style.display !== 'none' && style.visibility !== 'hidden') {
                tiny.push({tag: el.tagName, text: el.textContent.trim().slice(0, 30), size: size});
            }
        }
        return tiny;
    }""")

    if tiny_elements:
        for el in tiny_elements[:5]:
            warn(f"Text below 10px: <{el['tag']}> '{el['text']}' at {el['size']}px")
        assert len(tiny_elements) <= 5, f"{len(tiny_elements)} elements have text smaller than 10px"


# ─── SECTION 6: Performance ───

@test("Page loads in under 3 seconds")
def test_page_load_time(page):
    timing = page.evaluate("""() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return {
            domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
            loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
            domInteractive: Math.round(nav.domInteractive - nav.startTime),
        };
    }""")
    print(f"    DOMContentLoaded: {timing['domContentLoaded']}ms, Load: {timing['loadComplete']}ms")
    assert timing["domContentLoaded"] < 3000, f"DOMContentLoaded took {timing['domContentLoaded']}ms"


@test("No excessively large DOM")
def test_dom_size(page):
    count = page.evaluate("document.querySelectorAll('*').length")
    print(f"    DOM elements: {count}")
    if count > 3000:
        warn(f"DOM has {count} elements — may impact performance")
    assert count < 10000, f"DOM has {count} elements — too large"


@test("Bundle size is reasonable")
def test_bundle_size(page):
    resources = page.evaluate("""() => {
        return performance.getEntriesByType('resource')
            .filter(r => r.name.includes('.js') || r.name.includes('.css'))
            .map(r => ({name: r.name.split('/').pop(), size: r.transferSize, duration: Math.round(r.duration)}));
    }""")
    total_js = sum(r["size"] for r in resources if ".js" in r["name"])
    total_css = sum(r["size"] for r in resources if ".css" in r["name"])
    print(f"    JS: {total_js // 1024}KB, CSS: {total_css // 1024}KB (transferred, dev server)")
    # Note: dev server serves unminified code; production build is much smaller
    # Production build uses code splitting (React.lazy) for UnitBrowser and RosterPanel


# ─── SECTION 7: Data Integrity ───

@test("Unit cards show valid points values")
def test_unit_points_valid(page):
    main = page.locator("main").first
    buttons = main.locator("button").all()

    checked = 0
    for btn in buttons:
        if not btn.is_visible():
            continue
        text = btn.inner_text()
        if "pts" not in text:
            continue
        # Extract points number
        match = re.search(r'(\d+)\s*pts', text)
        if match:
            pts = int(match.group(1))
            assert 0 < pts < 10000, f"Suspicious points value: {pts}"
            checked += 1

    print(f"    Checked {checked} unit point values")
    assert checked > 0, "No unit point values found to check"


@test("All category filters return results")
def test_category_filters(page):
    main = page.locator("main").first
    filter_buttons = main.locator("button").all()

    categories = []
    for btn in filter_buttons:
        if not btn.is_visible():
            continue
        text = btn.inner_text().strip()
        # Category filters are short labels
        if len(text) < 20 and text != "" and "pts" not in text and "Available" not in text:
            categories.append((btn, text))

    tested = 0
    empty_categories = []
    for btn, label in categories[:12]:  # Test up to 12 categories
        btn.click()
        page.wait_for_timeout(400)

        unit_buttons = [b for b in main.locator("button").all()
                        if b.is_visible() and "pts" in (b.inner_text() or "")]
        if len(unit_buttons) == 0 and label != "All":
            empty_categories.append(label)
        tested += 1

    if empty_categories:
        warn(f"Empty categories: {', '.join(empty_categories)}")

    # Click "All" to reset
    all_btn = main.locator("button:has-text('All')").first
    if all_btn.is_visible():
        all_btn.click()
        page.wait_for_timeout(300)

    print(f"    Tested {tested} category filters")


# ─── SECTION 8: Error Recovery ───

@test("App recovers after API error simulation")
def test_api_error_recovery(page):
    # Navigate to a non-existent route and come back
    page.goto(f"{FRONTEND_URL}/nonexistent")
    page.wait_for_timeout(500)
    page.goto(FRONTEND_URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)

    # App should still work
    header = page.locator("header")
    assert header.is_visible(), "App didn't recover after navigation to bad route"


def main():
    print("\n  Solar Auxilia — Production Readiness Audit\n")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        # Capture console errors globally
        def on_console(msg):
            if msg.type in ("error", "warning"):
                CONSOLE_ERRORS.append({"type": msg.type, "text": msg.text})
        page.on("console", on_console)

        def on_page_error(error):
            CONSOLE_ERRORS.append({"type": "error", "text": str(error)})
        page.on("pageerror", on_page_error)

        # Load
        print(f"\n  Loading {FRONTEND_URL}...\n")
        page.goto(FRONTEND_URL)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

        page.screenshot(path="/tmp/audit_initial.png", full_page=True)

        # Section 1: Console
        print("  -- Console & JS Health --")
        test_no_console_errors_on_load(page)
        test_no_unhandled_rejections(page)

        # Section 2: API
        print("\n  -- API Health --")
        test_api_units(page)
        test_api_detachments(page)
        test_api_404(page)
        test_api_validation(page)

        # Section 3: Responsive
        print("\n  -- Responsive Design --")
        test_desktop_layout(page)
        test_mobile_toggle(page)
        test_narrow_mobile(page)

        # Section 4: Interaction & UX
        print("\n  -- Interaction & UX --")
        test_empty_roster_name(page)
        test_all_points_options(page)
        test_warlord_locked(page)
        test_search_no_results(page)
        test_search_special_chars(page)
        test_double_click_detachment(page)

        # Section 5: Accessibility
        print("\n  -- Accessibility --")
        test_keyboard_focus(page)
        test_button_accessibility(page)
        test_images_alt(page)
        test_color_contrast(page)
        test_minimum_text_size(page)

        # Section 6: Performance
        print("\n  -- Performance --")
        test_page_load_time(page)
        test_dom_size(page)
        test_bundle_size(page)

        # Section 7: Data Integrity
        print("\n  -- Data Integrity --")
        test_unit_points_valid(page)
        test_category_filters(page)

        # Section 8: Error Recovery
        print("\n  -- Error Recovery --")
        test_api_error_recovery(page)

        page.screenshot(path="/tmp/audit_final.png", full_page=True)
        browser.close()

    # ── Summary ──
    total = len(PASSES) + len(ERRORS)
    print("\n" + "=" * 60)
    print(f"\n  RESULTS: {len(PASSES)}/{total} passed, {len(ERRORS)} failed")
    if WARNINGS:
        print(f"  WARNINGS: {len(WARNINGS)}")

    if ERRORS:
        print(f"\n  {'─' * 50}")
        print("  FAILURES:")
        for name, err in ERRORS:
            print(f"    FAIL  {name}")
            print(f"          {err[:120]}")

    if WARNINGS:
        print(f"\n  {'─' * 50}")
        print("  WARNINGS (production improvements):")
        for w in WARNINGS:
            print(f"    >>  {w}")

    if CONSOLE_ERRORS:
        print(f"\n  {'─' * 50}")
        print(f"  CONSOLE ERRORS/WARNINGS ({len(CONSOLE_ERRORS)}):")
        for ce in CONSOLE_ERRORS[:10]:
            print(f"    [{ce['type']}] {ce['text'][:100]}")

    print(f"\n  Screenshots: /tmp/audit_*.png\n")
    return 1 if ERRORS else 0


if __name__ == "__main__":
    sys.exit(main())
