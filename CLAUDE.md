# Horus Heresy Solar Auxilia List Builder

## Project Rules

- Always update memory files in `.claude/projects/.../memory/` when new architectural patterns, pitfalls, or project knowledge is discovered during a session.
- Use `venv/bin/python` (not system python) for all Python commands.
- Run API with: `venv/bin/uvicorn api.main:app --reload`
- Build frontend with: `cd frontend && npm run build`
- Seed DB with: `venv/bin/python -m src.cli.main bsdata load`

## Architecture

- **Backend**: Python + FastAPI + Peewee ORM + SQLite (`data/auxilia.db`)
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS 4 + TanStack Query + Zustand
- **Data Source**: BSData XML catalogues (`.gst` / `.cat` files in `data/bsdata/`)
- **Pipeline**: XML → BattleScribeParser → CatalogueLoader → SQLite → FastAPI → React

## Key Conventions

- BSData categories (High Command, Armour, Recon, etc.) are the native HH3 slot names — normalize to FOC in `category_mapping.py` but always preserve the original
- War-engine = Heavy Support (walkers), NOT Lord of War
- Transport / Heavy Transport = Dedicated Transport, NOT Heavy Support
- Detachments use nested sub-detachment system, not simple 40k FOC
- Upgrade extraction must recurse into child models/units — don't just look at top-level entry_links
