# Horus Heresy Solar Auxilia List Builder

A tournament-informed army list builder for Horus Heresy 3.0 Solar Auxilia forces, powered by competitive tournament data analysis and official BSData catalogues.

## Project Status

**Current Phase:** Phase 2 Complete ✓ (95%) | **Next:** Phase 3 - UI Development

- ✅ **Phase 1:** Tournament data scraping & analysis
- ✅ **Phase 2:** BSData integration (weapons, upgrades, FOC validation, points calculation)
- ⏭️ **Phase 3:** Interactive list builder UI

See [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) for Phase 2 implementation details.

## Features

### ✅ Phase 1: Tournament Analysis (Complete)
- **Web Scraping**: Automated scraping of tournament data from Best Coast Pairings
- **List Parsing**: Intelligent parsing of army list text with fuzzy unit name matching
- **Meta Analysis**:
  - Unit popularity tracking with trend indicators
  - Points distribution analysis by Force Organization category
  - Efficient unit identification (high popularity, low cost)
  - Unit combination detection (frequently paired units)
- **Collection Management**: Track your models and get purchase recommendations
- **Rich CLI**: Beautiful terminal interface with tables and formatted output

### ✅ Phase 2: BSData Integration (95% Complete)
- **Catalogue Loading**: Clone and parse BSData Horus Heresy repository
- **Weapons Database**: 317 weapons loaded with full profiles (Range, Str, AP, Type, Cost)
- **Upgrades Database**: 63 wargear upgrades extracted
- **Units Database**: 53 Solar Auxilia units with stats and profiles
- **FOC Validation**: Validate rosters against Force Organization Chart rules
- **Points Calculator**: Automatic points calculation (base cost + upgrades)
- **Rich CLI Commands**:
  - `auxilia bsdata weapons` - Browse weapon database
  - `auxilia bsdata weapon <name>` - View weapon details
  - `auxilia bsdata detachments` - List FOC types with constraints
  - `auxilia bsdata upgrades <unit>` - View unit upgrade options (in progress)

### 🚧 Phase 3: List Builder (Coming Soon)
- Interactive list building with meta recommendations
- Real-time FOC validation during list construction
- Export to text, HTML, and PDF formats
- Synergy suggestions based on tournament data

## Installation

```bash
# Clone repository
git clone https://github.com/yourusername/horsey-heresy-list-builder
cd horsey-heresy-list-builder

# Install dependencies
pip install -e .

# Install Playwright browsers (for web scraping)
playwright install chromium

# Initialize database
python -c "from src.models.database import initialize_database; initialize_database()"
```

## Quick Start

### 1. Load BSData Catalogue

```bash
# Clone/update BSData repository
auxilia bsdata update

# Load Solar Auxilia catalogue into database
auxilia bsdata load
```

This will parse and populate:
- 53 units with full stats
- 317 weapons with profiles
- 63 upgrades
- FOC detachment rules

### 2. Browse Weapons & Units

```bash
# List all weapons
auxilia bsdata weapons --limit 20

# View specific weapon details
auxilia bsdata weapon "Lasrifle"

# View unit details
auxilia bsdata unit "Lasrifle Section"

# List FOC detachment types
auxilia bsdata detachments

# Check database status
auxilia bsdata status
```

### 3. Scrape Tournament Data

```bash
# Scrape tournaments and parse lists
auxilia tournament update

# View meta statistics
auxilia tournament stats

# View specific unit popularity
auxilia tournament unit "Dracosan Armoured Transport"

# Export meta report
auxilia tournament export -o meta_report.txt
```

### 4. Manage Your Collection

```bash
# Add models to collection
auxilia collection add "Lasrifle Section" 3

# View collection summary
auxilia collection summary

# Get purchase recommendations
auxilia collection recommend
```

## Programmatic Usage

### Create and Validate a Roster

```python
from src.models import Roster, RosterEntry, Unit

# Create roster
roster = Roster.create(
    name="My 3000pt Primary Detachment",
    detachment_type="Crusade Force Organization Chart",
    points_limit=3000
)

# Add units
lasrifle = Unit.get(Unit.name == "Lasrifle Section")
RosterEntry.create(
    roster=roster,
    unit=lasrifle,
    unit_name=lasrifle.name,
    quantity=2,
    total_cost=lasrifle.base_cost * 2,
    category="Troops"
)

# Calculate points and validate
roster.calculate_total_points()  # Returns total points
is_valid, errors = roster.validate()  # Validate FOC

# Get detailed status
status = roster.get_validation_status()
print(f"Valid: {status['is_valid']}")
print(f"Points: {status['total_points']}/{status['points_limit']}")
```

### Calculate Unit Costs with Upgrades

```python
from src.bsdata.points_calculator import PointsCalculator
from src.models import Unit

unit = Unit.get(Unit.name == "Lasrifle Section")
selected_upgrades = [
    {"bs_id": "weapon-id-123", "quantity": 1},
    {"bs_id": "upgrade-id-456", "quantity": 2},
]

# Calculate total cost
total = PointsCalculator.calculate_unit_cost(unit, selected_upgrades)

# Get detailed breakdown
breakdown = PointsCalculator.breakdown_unit_cost(unit, selected_upgrades)
print(f"Base: {breakdown['base_cost']} pts")
for upgrade in breakdown['upgrades']:
    print(f"  {upgrade['name']}: {upgrade['cost']} x{upgrade['quantity']}")
print(f"Total: {breakdown['total']} pts")
```

## Project Structure

```
horsey-heresy-list-builder/
├── src/
│   ├── cli/              # Command-line interface
│   │   ├── main.py       # Main CLI entry point
│   │   ├── bsdata_menu.py # BSData commands
│   │   ├── tournament_menu.py # Tournament commands
│   │   └── collection_menu.py # Collection commands
│   ├── scrapers/         # Tournament data collection
│   │   ├── base.py       # Abstract scraper with caching
│   │   ├── bcp_scraper.py # Best Coast Pairings implementation
│   │   └── parsers.py    # Army list text parser
│   ├── models/           # Database models (Peewee ORM)
│   │   ├── database.py   # Database connection
│   │   ├── tournament.py # Tournament data models
│   │   ├── catalogue.py  # BSData models (Unit, Weapon, Upgrade, etc.)
│   │   ├── roster.py     # User roster models with validation
│   │   └── collection.py # Collection tracking
│   ├── analytics/        # Meta analysis engine
│   │   ├── unit_popularity.py
│   │   ├── point_distribution.py
│   │   ├── combo_detector.py
│   │   └── reports.py
│   ├── bsdata/          # BSData integration (Phase 2) ✅
│   │   ├── parser.py            # XML catalogue parser
│   │   ├── catalogue_loader.py  # Solar Auxilia loader
│   │   ├── catalogue_cache.py   # Shared catalogue cache
│   │   ├── upgrade_extractor.py # Weapon/upgrade extraction
│   │   ├── detachment_loader.py # FOC rules loader
│   │   ├── foc_validator.py     # Roster validation
│   │   └── points_calculator.py # Points calculation
│   └── builder/         # List builder UI (Phase 3) 🚧
├── data/
│   ├── bsdata/          # Cloned BSData repository
│   ├── cache/           # Cached web scraper data
│   └── auxilia.db       # SQLite database
├── exports/             # Generated reports and lists
└── tests/
```

## Database Schema

### Phase 2 Models

**Catalogue Models:**
- `Unit`: Solar Auxilia units with stats, profiles, base cost
- `Weapon`: 317 weapons with Range/Str/AP/Type/Cost
- `Upgrade`: 63 wargear upgrades
- `UnitUpgrade`: Many-to-many unit ↔ upgrade relationships
- `Detachment`: FOC detachment types with constraints

**Roster Models:**
- `Roster`: User-created army lists with validation
- `RosterEntry`: Units in roster with upgrades and quantities

**Tournament Models:**
- `Tournament`: Tournament metadata
- `ArmyList`: Scraped tournament lists
- `UnitEntry`: Parsed units from lists

**Collection Models:**
- `Collection`: User model collection
- `CollectionItem`: Individual owned models

## Configuration

Environment variables (optional):
- `SCRAPE_DELAY`: Delay between requests (default: 3.0 seconds)
- `MIN_TOURNAMENT_SIZE`: Minimum players for analysis (default: 8)
- `RECENT_MONTHS`: Months to analyze for trends (default: 6)

Configuration in `src/config.py`:
- `BSDATA_REPO`: BSData repository URL
- `FACTION`: Target faction (Solar Auxilia)
- `MIN_SUPPORT`: Association rule mining threshold (0.20)
- `CONFIDENCE_THRESHOLD`: Combo detection confidence (0.50)

## Development

### Debug Mode
```bash
auxilia --debug bsdata load
auxilia --debug tournament update
```

### Running Tests
```bash
pytest tests/
```

### Recreate Database Schema
```bash
python -c "from src.models import db, Unit, Weapon, Upgrade, UnitUpgrade, Detachment; \
db.connect(); \
UnitUpgrade.drop_table(safe=True); \
Upgrade.drop_table(safe=True); \
Weapon.drop_table(safe=True); \
Detachment.drop_table(safe=True); \
Unit.drop_table(safe=True); \
db.create_tables([Unit, Weapon, Upgrade, UnitUpgrade, Detachment]); \
db.close()"
```

## Known Issues

### Phase 2 (Minor)
1. **Unit-Upgrade Linking** - Unit-upgrade relationships not yet created (0 links). Core extraction framework complete, ID resolution needs debugging.
2. **FOC Constraints** - Detachment constraint parsing uses fallback logic. .gst file structure more complex than expected.

Both issues don't block core functionality - weapons/upgrades load successfully, validation engine works with fallback constraints.

## Data Sources

- **Tournament Data**: [Best Coast Pairings](https://www.bestcoastpairings.com)
- **Unit Rules**: [BSData Horus Heresy 3rd Edition](https://github.com/BSData/horus-heresy-3rd-edition)

## Contributing

Contributions welcome! See [IMPLEMENTATION.md](IMPLEMENTATION.md) for architecture details and [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) for recent work.

## License

MIT

## Acknowledgments

- BSData for maintaining the Horus Heresy data files
- Best Coast Pairings for tournament data
- Rich library for beautiful CLI output
- The Warhammer: The Horus Heresy community
