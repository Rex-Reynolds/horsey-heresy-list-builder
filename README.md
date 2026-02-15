# Horus Heresy Solar Auxilia List Builder

A full-stack army list builder for Horus Heresy 3.0 Solar Auxilia forces, powered by official BSData catalogues with multi-detachment roster management, composition enforcement, and a "Regimental Dataslate" UI.

## Features

- **52 units** seeded from BSData XML catalogues with full stat profiles, upgrades, and points
- **27 detachments** — Primary, Auxiliary, Apex, and SA-specific Tercios (Infantry, Armour, Artillery, etc.)
- **Multi-detachment rosters** with per-slot fill tracking and unit restriction enforcement
- **Composition rules** — budget system (Command grants Auxiliary slots, High Command grants Apex), enforced at API level
- **Cohort Doctrines** — roster-level doctrine selection with dynamic slot cap and cost modifiers via BSData modifier evaluation
- **Tercio Unlock system** — units with Tercio categories auto-unlock additional detachment capacity
- **Legacy unit indicators** — 25 Expanded units from the *Legacies of the Age of Darkness* PDF marked with a "Legacy" badge
- **Roster validation** against detachment constraints with detailed per-error feedback
- **Export** roster to text format

### UI / UX

- **Regimental Dataslate aesthetic** — warm service grey backgrounds, burnished bronze accents, noise grain overlay, scan-line textures, custom scrollbars
- **Category-colored unit cards** — left stripe + subtle background tint gradient per slot type, gold cost pill badges, always-visible quick-add buttons
- **Color-coded category filter** — colored dot indicators, unit count badges per group, category-colored active states
- **Slot fill bars** — mini progress bars on each detachment slot with category-colored fills and state-aware coloring (green=full, amber=under min, red=over)
- **Segmented points bar** — per-detachment colored segments within the fill bar, game-size threshold markers (1k, 2k, 3k), over-budget glow warning
- **Card-based detachment picker** — type-colored stripes and section headers, slot preview chips, disabled-reason badges, 400px scroll area
- **Datasheet stat table** — gold accent bar, alternating column tints, Instrument Serif profile names, color-coded stat values (green=exceptional, dim=low)
- **Validation results panel** — icon badges, structured error list with count, status indicator on validate button
- **Mobile-responsive** — bottom sheet roster panel with slide-up animation, sticky points summary bar, touch-friendly controls
- **Toast notifications** — auto-dismissing feedback for add/remove actions
- **Staggered entrance animations** — fade-in with delay cascading, entry flash for new roster additions, points flash on value change

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
│   │   ├── common/          # Badge, CategoryFilter, SearchInput, ToastContainer
│   │   ├── layout/          # AppHeader, AppLayout, PointsBar
│   │   ├── roster/          # RosterPanel, DetachmentSection, RosterEntryCard, DoctrinePicker
│   │   └── units/           # UnitBrowser, UnitCard, UnitDetail, StatBlock, UpgradeList
│   ├── hooks/               # useUnitAvailability
│   ├── stores/              # Zustand roster + UI stores
│   └── types/               # TypeScript interfaces, slot/color constants
├── src/
│   ├── bsdata/
│   │   ├── parser.py              # XML parsing with namespace handling
│   │   ├── catalogue_loader.py    # DB seeding + legacy unit list
│   │   ├── catalogue_cache.py     # Shared catalogue cache (Weapons.cat, Wargear.cat)
│   │   ├── upgrade_extractor.py   # Weapon/upgrade extraction
│   │   ├── detachment_loader.py   # Force org chart + costs + modifiers from .gst
│   │   ├── modifier_evaluator.py  # BSData modifier evaluation (Tercio/Doctrine adjustments)
│   │   ├── composition_validator.py # Budget computation + enforcement
│   │   ├── foc_validator.py       # Per-detachment slot validation
│   │   └── points_calculator.py   # Points calculation
│   └── models/
│       ├── catalogue.py     # Unit (+ is_legacy, budget_categories, tercio_categories), Weapon, Upgrade, Detachment
│       ├── roster.py        # Roster (+ doctrine), RosterDetachment, RosterEntry
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

### Tercio / Doctrine Modifiers
BSData encodes dynamic modifiers on `forceEntry` elements that adjust slot caps and costs based on roster state. The `ModifierEvaluator` evaluates these conditions against the current roster — for example, Tercio Unlock categories on units increment max slots, while Cohort Doctrines halve auxiliary costs for matching detachment types.

### Legacy Units
25 Solar Auxilia units from the *Legacies of the Age of Darkness* PDF (v1.1) are flagged as `is_legacy=true`. These are "Expanded" units that are legal for play but not part of the Core army list. They display a "Legacy" badge in the unit browser.

## Data Sources

- [BSData Horus Heresy 3rd Edition](https://github.com/BSData/horus-heresy-3rd-edition)
- [Legacies of the Age of Darkness](https://www.warhammer-community.com) (PDF v1.1)

## License

MIT
