# Horus Heresy Solar Auxilia List Builder

A full-stack army list builder for Horus Heresy 3.0 Solar Auxilia forces, powered by official BSData catalogues with multi-detachment roster management, composition enforcement, and a "Regimental Dataslate" UI.

## Features

- **52 units** seeded from BSData XML catalogues with full stat profiles, upgrades, and points
- **27 detachments** — Primary, Auxiliary, Apex, and SA-specific Tercios (Infantry, Armour, Artillery, etc.)
- **Multi-detachment rosters** with per-slot fill tracking and unit restriction enforcement
- **Composition rules** — budget system (Command grants Auxiliary slots, High Command grants Apex), enforced at API level
- **Legacy unit indicators** — 25 Expanded units from the *Legacies of the Age of Darkness* PDF marked with a "Legacy" badge
- **Regimental Dataslate UI** — warm service grey backgrounds, burnished bronze accents, category-colored left stripes, cohort heraldry badges, Instrument Serif unit names
- **Roster validation** against detachment constraints with real-time feedback
- **Export** roster to text format

## Architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS 4, TanStack Query, Zustand |
| **Backend** | Python, FastAPI, Peewee ORM, SQLite |
| **Data** | BSData XML catalogues (`.gst` / `.cat` files) |

**Pipeline:** XML → BattleScribeParser → CatalogueLoader → SQLite → FastAPI → React

## Quick Start

```bash
# Clone
git clone https://github.com/yourusername/horsey-heresy-list-builder
cd horsey-heresy-list-builder

# Backend setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Initialize database and seed from BSData
venv/bin/python -c "from src.models.database import initialize_database; initialize_database()"
venv/bin/python -m src.cli.main bsdata load

# Start API
venv/bin/uvicorn api.main:app --reload

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`, API docs at `http://localhost:8000/docs`.

## Project Structure

```
horsey-heresy-list-builder/
├── api/
│   └── main.py              # FastAPI REST API with composition enforcement
├── frontend/src/
│   ├── components/
│   │   ├── common/          # Badge, CategoryFilter, SearchInput, etc.
│   │   ├── layout/          # AppHeader, AppLayout, PointsBar
│   │   ├── roster/          # RosterPanel, DetachmentSection, RosterEntryCard
│   │   └── units/           # UnitBrowser, UnitCard, UnitDetail, StatBlock
│   ├── hooks/               # useUnitAvailability
│   ├── stores/              # Zustand roster store
│   └── types/               # TypeScript interfaces, slot constants
├── src/
│   ├── bsdata/
│   │   ├── parser.py              # XML parsing with namespace handling
│   │   ├── catalogue_loader.py    # DB seeding + legacy unit list
│   │   ├── catalogue_cache.py     # Shared catalogue cache (Weapons.cat, Wargear.cat)
│   │   ├── upgrade_extractor.py   # Weapon/upgrade extraction
│   │   ├── detachment_loader.py   # Force org chart + costs from .gst
│   │   ├── composition_validator.py # Budget computation + enforcement
│   │   ├── foc_validator.py       # Per-detachment slot validation
│   │   └── points_calculator.py   # Points calculation
│   └── models/
│       ├── catalogue.py     # Unit (+ is_legacy, budget_categories), Weapon, Upgrade, Detachment
│       ├── roster.py        # Roster, RosterDetachment, RosterEntry
│       └── database.py      # SQLite setup + migrations
└── data/
    ├── bsdata/              # Cloned BSData repo (42 XML files)
    └── auxilia.db           # SQLite database
```

## Key Concepts

### HH3 Detachment System
Not simple "1-2 HQ, 2-6 Troops" — nested sub-detachments with per-slot constraints and unit restrictions. SA uses Tercio variants (Infantry, Armour, Artillery, etc.) with native category names (Armour, Support, Recon) rather than standard 40k FOC.

### Composition Budget
Each Command unit grants +1 Auxiliary detachment slot. High Command grants Apex slots. The API enforces these budgets — attempting to add a detachment beyond budget returns a 422.

### Legacy Units
25 Solar Auxilia units from the *Legacies of the Age of Darkness* PDF (v1.1) are flagged as `is_legacy=true`. These are "Expanded" units that are legal for play but not part of the Core army list. They display a "Legacy" badge in the unit browser.

## Data Sources

- [BSData Horus Heresy 3rd Edition](https://github.com/BSData/horus-heresy-3rd-edition)
- [Legacies of the Age of Darkness](https://www.warhammer-community.com) (PDF v1.1)

## License

MIT
