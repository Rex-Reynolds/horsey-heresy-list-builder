# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Rules

- Always update memory files in `.claude/projects/.../memory/` when new architectural patterns, pitfalls, or project knowledge is discovered during a session.
- Use `venv/bin/python` (not system python) for all Python commands.
- Always run `cd frontend && npm run lint` before committing frontend changes — CI will reject ESLint errors.

## Commands

```bash
# Backend
venv/bin/uvicorn api.main:app --reload           # Run API (port 8000)
venv/bin/python -m src.cli.main bsdata load       # Seed DB from BSData XML
venv/bin/pytest tests/test_api.py -v              # Run all backend tests
venv/bin/pytest tests/test_api.py -v -k "test_name"  # Run a single test

# Frontend
cd frontend && npm run dev        # Vite dev server
cd frontend && npm run build      # Production build (tsc + vite)
cd frontend && npm run lint       # ESLint (CI-enforced)
cd frontend && npx tsc -b         # TypeScript type check only
```

## CI Pipeline (`.github/workflows/ci.yml`)

On push/PR to `main`: Python import check → pytest `tests/test_api.py` → TS type check → ESLint → Vite build. Deploy to `heresy.build` via SSH on main push.

## Architecture

- **Backend**: Python + FastAPI + Peewee ORM + SQLite (`data/auxilia.db`)
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS 4 + TanStack Query + Zustand
- **Data Source**: BSData XML catalogues (`.gst` / `.cat` files in `data/bsdata/`)
- **Pipeline**: XML → `BattleScribeParser` → `CatalogueLoader` → SQLite → FastAPI → React

### Backend Layout
- `src/bsdata/` — Data pipeline: `parser.py` (XML/lxml), `catalogue_loader.py` (DB seed), `upgrade_extractor.py` (recursive), `detachment_loader.py`, `composition_validator.py` (budget/FOC), `modifier_evaluator.py` (Tercio/Doctrine), `category_mapping.py`, `points_calculator.py`
- `src/models/catalogue.py` — Unit, Weapon, Upgrade, UnitUpgrade, Detachment
- `src/models/roster.py` — Roster, RosterDetachment, RosterEntry
- `api/main.py` — REST API (~1200 lines): rate-limited, CORS, GZip, batch-loaded queries via Peewee `prefetch()`

### Frontend Layout
- `frontend/src/stores/` — `rosterStore.ts` (roster state), `uiStore.ts` (toasts, drawer)
- `frontend/src/components/roster/` — RosterPanel, DetachmentSection, RosterEntryCard, DoctrinePicker, CompositionSummary
- `frontend/src/components/units/` — UnitBrowser (search/filter)
- `frontend/src/hooks/` — useRosterStore, useUnitAvailability, useUndoRedo, useSwipeActions, useTouchReorder
- `frontend/src/api/` — Typed API client (Axios + TanStack Query)

### API Routes
- `/api/units` — list/filter units; `/api/units/{id}/upgrades` — grouped upgrades
- `/api/detachments` — list detachments (module-level cache); `/api/doctrines` — list doctrines (cached)
- `/api/rosters` — CRUD; `/api/rosters/{id}/detachments` — manage detachments; `/api/rosters/{id}/detachments/{id}/entries` — add/update/remove units
- `/api/rosters/{id}/validate` — full roster validation
- `/api/rosters/{id}/doctrine` — set doctrine; `/api/rosters/{id}/duplicate` — clone roster

## Key Conventions

### BSData / Backend
- BSData categories (High Command, Armour, Recon, etc.) are the native HH3 slot names — normalize to FOC in `category_mapping.py` but always preserve the original
- War-engine = Heavy Support (walkers), NOT Lord of War
- Transport / Heavy Transport = Dedicated Transport, NOT Heavy Support
- Detachments use nested sub-detachment system, not simple 40k FOC
- Upgrade extraction must recurse into child models/units — don't just look at top-level entry_links
- Unit profiles have type "Profile" (infantry) or "Vehicle" — only "Profile" types have M/WS/BS/S/T/W/I/A/LD/SAV stats

### Frontend
- State: Zustand (`rosterStore`) for roster state, `uiStore` for UI state (toasts, drawer). TanStack Query for server data.
- Themes: dual theme system (Dataslate dark / Parchment light) via `data-theme` attribute on `<html>`. CSS variables in `index.css` handle theming. Saved to `localStorage('sa_theme')`.
- Fonts: self-hosted via `@fontsource` — no external font requests.
- ESLint: `react-hooks/set-state-in-effect` rule is active — never call `setState` synchronously inside `useEffect`. Initialize from external APIs (matchMedia, localStorage) in the `useState` initializer instead.
- Tailwind v4: class-based CSS selectors like `.text-valid` don't work in JS queries. Use `[class*="text-valid"]` attribute selectors instead.

## Testing

- **Backend tests**: `tests/test_api.py` using pytest + FastAPI TestClient. `tests/conftest.py` provides auto-isolated temp SQLite DB and fixtures (`seed_units`, `seed_detachment`, `seed_upgrades`). Rate limiting is disabled in tests.
- **Playwright tests**: Root-level `test_ui.py` and `test_round*.py` files. When testing features that require roster entries, seed data via API (`/api/rosters`, `/api/rosters/{id}/detachments`, `/api/rosters/{id}/detachments/{id}/entries`) then set `localStorage('sa_roster_id')` and reload. Playwright quick-add clicks don't reliably persist due to Zustand store sync timing in headless mode.
