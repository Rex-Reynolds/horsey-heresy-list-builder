# Horus Heresy Solar Auxilia List Builder

## Project Rules

- Always update memory files in `.claude/projects/.../memory/` when new architectural patterns, pitfalls, or project knowledge is discovered during a session.
- Use `venv/bin/python` (not system python) for all Python commands.
- Run API with: `venv/bin/uvicorn api.main:app --reload`
- Build frontend with: `cd frontend && npm run build`
- Lint frontend with: `cd frontend && npm run lint`
- Seed DB with: `venv/bin/python -m src.cli.main bsdata load`
- Always run `npm run lint` before committing frontend changes — CI will reject ESLint errors.

## Architecture

- **Backend**: Python + FastAPI + Peewee ORM + SQLite (`data/auxilia.db`)
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS 4 + TanStack Query + Zustand
- **Data Source**: BSData XML catalogues (`.gst` / `.cat` files in `data/bsdata/`)
- **Pipeline**: XML → BattleScribeParser → CatalogueLoader → SQLite → FastAPI → React

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

- Playwright tests in project root (`test_ui.py`) — run with `scripts/with_server.py` helper.
- When testing features that require roster entries, seed data via API (`/api/rosters`, `/api/rosters/{id}/detachments`, `/api/rosters/{id}/detachments/{id}/entries`) then set `localStorage('sa_roster_id')` and reload. Playwright quick-add clicks don't reliably persist due to Zustand store sync timing in headless mode.
