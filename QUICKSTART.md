# Solar Auxilia List Builder - Quick Start

## Streamlined Workflow

The app now has a simplified command structure focused on the core value: building tournament-informed army lists from your collection using official BSData.

### One-Time Setup

Initialize the app (downloads BSData, loads catalogue, sets up database):

```bash
./venv/bin/python -m src.cli.main init
```

This will:
- Set up the database
- Clone the official BSData repository
- Load the Solar Auxilia catalogue (53 units)
- Parse all unit stats, points, and rules

### Daily Workflow

#### 1. Add Units to Your Collection

```bash
# Add a unit with quantity
./venv/bin/python -m src.cli.main add "Legatine Command Section" 1

# Add with notes
./venv/bin/python -m src.cli.main add "Leman Russ Battle Tank" 4 --notes "All painted"
```

**Tip**: Use exact names from BSData. If unsure, check available units with `info`.

#### 2. View Your Collection

```bash
./venv/bin/python -m src.cli.main show
```

Shows:
- All units in your collection
- Tournament popularity percentage
- Trend indicators
- Your notes

#### 3. Generate Army Lists

```bash
# Generate 3 different list strategies
./venv/bin/python -m src.cli.main build

# Generate just 1 list
./venv/bin/python -m src.cli.main build --count 1
```

Lists are generated based on:
- **High Synergy**: Units that work well together in tournaments
- **Popularity**: Most common tournament units
- **Balanced**: Even FOC distribution

#### 4. Look Up Unit Details

```bash
./venv/bin/python -m src.cli.main info "Legatine Command Section"
```

Shows:
- Category (HQ, Troops, etc.)
- Base points cost
- Model profiles with stats (WS, BS, S, T, W, I, A, LD, SAV)
- Rules and special abilities

## Common Unit Names (from BSData)

### HQ
- Legatine Command Section
- Tactical Command Section
- Line Command Section
- Veletaris Command Section
- Davinite Lodge Priest
- Surgeon-Primus Aevos Jovan

### Troops
- Lasrifle Section

### Elites
- Charonite Ogryns
- Veletaris Storm Section
- Velites Support Section

### Fast Attack
- Hermes Light Sentinel
- Tarantula Sentry Gun Battery

### Heavy Support
- Leman Russ Battle Tank
- Malcador Heavy Tank
- Dracosan Armoured Transport
- Aethon Heavy Sentinel
- Cyclops Demolition Vehicle

### Lord of War
- Baneblade Super-Heavy Tank
- Macharius Heavy Tank

## Advanced Commands

### View Tournament Meta Stats

```bash
./venv/bin/python -m src.cli.main tournament stats
```

### Manage Collection (full interface)

```bash
./venv/bin/python -m src.cli.main collection show
./venv/bin/python -m src.cli.main collection generate
```

### BSData Management

```bash
# Update to latest catalogue
./venv/bin/python -m src.cli.main bsdata update

# View catalogue info
./venv/bin/python -m src.cli.main bsdata info

# List all available units
./venv/bin/python -m src.cli.main bsdata list
```

## Example Session

```bash
# 1. First-time setup
./venv/bin/python -m src.cli.main init

# 2. Add your collection
./venv/bin/python -m src.cli.main add "Legatine Command Section" 1 --notes "Legate Marshal variant"
./venv/bin/python -m src.cli.main add "Lasrifle Section" 12 --notes "120 models - flexible configuration"
./venv/bin/python -m src.cli.main add "Leman Russ Battle Tank" 4 --notes "All painted"

# 3. View your collection
./venv/bin/python -m src.cli.main show

# 4. Get unit details
./venv/bin/python -m src.cli.main info "Legatine Command Section"

# 5. Generate lists from what you own
./venv/bin/python -m src.cli.main build --count 3
```

## Key Features

✅ **BSData Integration**: All unit stats, points, and rules from official BattleScribe data (revision 31)
✅ **Tournament Insights**: See which units are popular in competitive play
✅ **Smart List Building**: Generate lists based on proven unit combinations
✅ **Collection Tracking**: Manage what models you own with notes
✅ **Fuzzy Search**: Suggestions when unit names don't match exactly
✅ **FOC Categories**: Proper categorization (HQ, Troops, Elites, Fast Attack, Heavy Support, Lord of War)

## Tips

1. **Exact Names Matter**: BSData uses specific names. Use `info` to check exact spelling.

2. **Note Your Variants**: Use `--notes` to track configurations:
   ```bash
   ./venv/bin/python -m src.cli.main add "Lasrifle Section" 12 --notes "120 models - can configure as different squad types"
   ```

3. **Check Categories**: Use `info` to verify FOC category before adding units

4. **Update Regularly**: Run `bsdata update` monthly to get latest rules updates

## Troubleshooting

### "Unit not found in catalogue"
**Problem:** Unit name doesn't match BSData exactly
**Solution:** The command will suggest similar units. Copy the exact name from suggestions.

### "No module named 'click'"
**Problem:** Virtual environment not activated
**Solution:** Use the venv python directly: `./venv/bin/python -m src.cli.main`

### Unit shows "Uncategorized"
**Problem:** Unit isn't in the main catalogue
**Solution:** This shouldn't happen anymore - categories are now properly mapped from BSData

## Data Sources

- **Unit Data**: BSData repository (https://github.com/BSData/horus-heresy-3rd-edition)
- **Meta Analysis**: Demo tournament data (15 lists from 2025-2026)
- **Points**: Official BattleScribe catalogue (revision 31)
- **Categories**: Normalized to standard FOC (HQ, Troops, Elites, Fast Attack, Heavy Support, Lord of War)

## What's Next?

### Planned Features
- ⏳ FOC validation (enforce min/max unit limits per detachment type)
- ⏳ Upgrade/wargear configuration for units
- ⏳ Points calculation with upgrades
- ⏳ Export lists to PDF/HTML/BattleScribe format
- ⏳ Real tournament data scraping (when BCP API available)
- ⏳ Win rate analysis by unit

### Current Limitations
- Demo tournament data only (15 sample lists)
- Base points only (no upgrades yet)
- No FOC validation yet (min/max slots not enforced)
- No export functionality yet

## File Locations

```
data/
  auxilia.db              # Database (units, collection, tournament data)
  bsdata/                 # Cloned BSData repository
    Solar Auxilia.cat     # Unit catalogue (XML)
    Weapons.cat           # Weapon stats (XML)
exports/                  # Generated reports
venv/                     # Python environment
```

## Quick Command Reference

```bash
# Core Workflow
./venv/bin/python -m src.cli.main init                           # First-time setup
./venv/bin/python -m src.cli.main add "<unit>" <qty>            # Add to collection
./venv/bin/python -m src.cli.main show                          # View collection
./venv/bin/python -m src.cli.main build                         # Generate lists
./venv/bin/python -m src.cli.main info "<unit>"                 # Unit details

# Advanced
./venv/bin/python -m src.cli.main bsdata update                 # Update catalogue
./venv/bin/python -m src.cli.main tournament stats              # Meta analysis
./venv/bin/python -m src.cli.main collection show               # Full collection UI

# Options
--notes "text"                # Add notes when adding units
--count 3                     # Number of lists to generate
--debug                       # Verbose logging
```

Enjoy building tournament-winning Solar Auxilia lists! ⚙️🛡️
