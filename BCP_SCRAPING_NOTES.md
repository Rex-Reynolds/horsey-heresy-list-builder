# Best Coast Pairings Scraping Notes

## Current Status

The BCP scraper is implemented but **not finding tournaments** due to website complexity.

## Issue

Best Coast Pairings uses a complex JavaScript SPA with:
- Custom autocomplete filtering (not standard HTML `<select>`)
- Dynamic event loading (no events visible without filters)
- React/Vue components that don't render in initial HTML

## What We Found

From debugging (`tests/debug_bcp_filters.py`):
- Events page has filter inputs: `location`, `gameType`, `startDate`, `endDate`
- No `<select>` elements - uses custom autocomplete
- No events visible until filters are applied
- 0 dropdown items appear after typing "Horus"

## Alternative Data Sources

### NewRecruit.com (Recommended)
**Pros:**
- Primary platform for Horus Heresy tournaments
- Direct list downloads (may be easier to scrape)
- More complete Heresy community coverage

**Cons:**
- Different scraping approach needed
- May also use JavaScript SPA

### Manual Import
**Pros:**
- Most reliable
- User can curate data quality

**Implementation:**
- Add CLI command: `auxilia tournament import <file.txt>`
- Support BattleScribe format
- Bulk import directory of lists

## Solutions

### Option 1: Fix BCP Scraper (Complex)
**Tasks:**
1. Study BCP's JavaScript API calls (use browser DevTools Network tab)
2. Replicate API calls directly with httpx
3. Parse JSON responses instead of HTML
4. Bypass Playwright entirely

**Estimated Time:** 4-6 hours

### Option 2: Build NewRecruit Scraper (Medium)
**Tasks:**
1. Study NewRecruit's structure
2. Implement similar Playwright-based scraper
3. Parse list format
4. May be simpler than BCP

**Estimated Time:** 2-3 hours

### Option 3: Manual Import (Easy)
**Tasks:**
1. Add `import` command to CLI
2. Support pasting/uploading tournament lists
3. Batch process directory of `.txt` files

**Estimated Time:** 1-2 hours

**Example:**
```bash
auxilia tournament import lists/*.txt --event "GT Los Angeles 2026"
```

### Option 4: Use Demo Data (Immediate)
**Current Solution:**
```bash
python tests/create_demo_data.py
```

Creates 12 realistic lists showing all features.

## Current Workaround

For now, users can:
1. Use demo data: `python tests/create_demo_data.py`
2. See all analytics features working
3. Wait for Phase 2 to add real data sources

## Recommendation

**Short term:** Document demo data as primary way to test
**Medium term:** Implement manual import (Option 3)
**Long term:** Add NewRecruit scraper (Option 2) in Phase 2

## Files

- `src/scrapers/bcp_scraper.py` - Current implementation
- `tests/debug_bcp.py` - Website structure inspector
- `tests/debug_bcp_filters.py` - Filter interaction test
- `data/bcp_debug.png` - Screenshot of events page
- `data/bcp_filters_debug.png` - Screenshot after filter attempt

## Next Steps for BCP Scraping

If pursuing Option 1 (fix BCP):

1. Open Chrome DevTools on https://www.bestcoastpairings.com/events
2. Navigate to Network tab
3. Fill in filters manually (select "Horus Heresy")
4. Identify API calls that load events
5. Replicate those calls in Python with httpx
6. Parse JSON response

Example observed pattern (hypothetical):
```python
# Instead of Playwright navigation:
async with httpx.AsyncClient() as client:
    response = await client.post(
        "https://www.bestcoastpairings.com/api/events/search",
        json={
            "gameType": "horus-heresy",
            "startDate": "2025-01-01",
            "endDate": "2026-12-31"
        }
    )
    events = response.json()
```

This would be much faster and more reliable than Playwright.

## Current Analytics Working

All analytics features are working with demo data:
- ✅ Unit popularity tracking
- ✅ Point distribution analysis
- ✅ Efficiency scoring
- ✅ Combo detection
- ✅ Rich CLI output
- ✅ Unit detail views
- ✅ Export functionality

The core system is complete - just needs real data input!
