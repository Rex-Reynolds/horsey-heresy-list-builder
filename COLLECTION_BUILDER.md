# Collection-Based List Builder

Build tournament-viable lists using **only the models you own**, with meta insights from real tournament data!

## 🎯 What It Does

1. **Track Your Collection**: Record what Solar Auxilia models you own
2. **Generate Lists**: Create multiple list suggestions using ONLY your models
3. **Meta Insights**: See tournament inclusion rates for each unit you own
4. **Smart Recommendations**: Get purchase advice based on what's winning tournaments
5. **Synergy Detection**: Lists that use units which frequently appear together

## 🚀 Quick Start

```bash
source venv/bin/activate

# Add your models (first time setup)
auxilia collection add "Legate Commander" 1 --notes "Painted"
auxilia collection add "Lasrifle Section" 4 --notes "3 painted, 1 NiB"
auxilia collection add "Dracosan Armoured Transport" 2 --notes "Both painted"
auxilia collection add "Leman Russ Battle Tank" 2 --notes "Magnetized"

# View your collection with tournament stats
auxilia collection show

# Generate list suggestions
auxilia collection generate

# Get purchase recommendations
auxilia collection recommend
```

## 📋 Commands

### Add Units to Collection

```bash
auxilia collection add "Unit Name" <quantity> [--notes "text"]
```

**Examples:**
```bash
# Basic
auxilia collection add "Charonite Ogryns" 1

# With notes
auxilia collection add "Veletaris Storm Section" 3 --notes "Painted and based"

# New in box
auxilia collection add "Malcador Heavy Tank" 1 --notes "NiB"
```

### Show Your Collection

```bash
auxilia collection show
```

**Output includes:**
- Unit name and quantity
- Tournament inclusion percentage (meta data!)
- Trend indicator (↑ increasing, → stable, ↓ decreasing)
- Your notes

**Example output:**
```
═══ Your Collection ═══

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━┳━━━━━━━━━━━━┳━━━━┳━━━━━━━━━━━━┓
┃ Unit Name                 ┃ Qty┃Tournament %┃Trend┃ Notes      ┃
┡━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━╇━━━━━━━━━━━━╇━━━━╇━━━━━━━━━━━━┩
│ Legate Commander          │  1 │      66.7% │  →  │ Painted    │
│ Dracosan Transport        │  2 │      66.7% │  →  │ Both ready │
│ Charonite Ogryns          │  1 │      40.0% │  →  │ NiB        │
└───────────────────────────┴────┴────────────┴─────┴────────────┘
```

The **Tournament %** shows what percentage of competitive lists include that unit!

### Generate Lists

```bash
auxilia collection generate [--count N]
```

Generates up to 3 different list strategies using your models:

1. **Tournament Meta List**: Most popular units from your collection
2. **High Synergy List**: Units that work well together (based on tournament pairings)
3. **Balanced List**: Even distribution across FOC categories

**Example:**
```bash
auxilia collection generate --count 3
```

**Output:**
```
#1: Tournament Meta List
Strategy: Uses most popular tournament units from your collection
Meta Score: 44.6

  1x Legate Commander
     └─ Appears in 67% of tournament lists
  2x Dracosan Armoured Transport
     └─ Appears in 67% of tournament lists
  1x Charonite Ogryns
     └─ Appears in 40% of tournament lists
  ...
```

Each unit shows **why it was chosen** based on tournament data!

### Get Purchase Recommendations

```bash
auxilia collection recommend [--top N]
```

Suggests what to buy next based on:
- Tournament popularity
- Units you don't own yet
- Average quantities used

**Example:**
```bash
auxilia collection recommend --top 5
```

**Output:**
```
═══ Purchase Recommendations ═══

┏━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━┳━━━━━━━━┓
┃Priority┃ Unit Name             ┃Tournament%┃Avg Qty ┃
┡━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━╇━━━━━━━━┩
│ HIGH  │ Leman Russ Squadron   │    40.0%  │    2.0 │
│ MED   │ Tactical Command      │    33.3%  │    1.2 │
└───────┴───────────────────────┴───────────┴────────┘
```

**Priority levels:**
- **HIGH**: Appears in >50% of tournament lists
- **MEDIUM**: Appears in 20-50% of lists

### Remove Units

```bash
auxilia collection remove "Unit Name"
```

**Example:**
```bash
auxilia collection remove "Lasrifle Section"
```

### Clear Collection

```bash
auxilia collection clear
```

⚠️ Removes all units (asks for confirmation)

## 🎮 Complete Example Workflow

### 1. Set Up Your Collection

```bash
# You just bought the Solar Auxilia army box
auxilia collection add "Legate Commander" 1 --notes "In progress"
auxilia collection add "Lasrifle Section" 4
auxilia collection add "Dracosan Armoured Transport" 1

# Plus some extra units
auxilia collection add "Leman Russ Battle Tank" 2 --notes "Magnetized"
```

### 2. Check What You Have

```bash
auxilia collection show
```

You'll see each unit with its **tournament inclusion rate** - super useful!

### 3. Build Lists from Your Collection

```bash
auxilia collection generate
```

You get **3 different list suggestions**, each optimized differently:
- One maximizes tournament-popular units
- One focuses on synergies
- One balances across categories

Each unit shows **why it was included** (e.g., "67% tournament inclusion", "pairs with Legate Commander").

### 4. See What to Buy Next

```bash
auxilia collection recommend
```

Get shopping advice based on real tournament results!

## 🔍 Features

### Meta-Informed Generation

Every list is generated with tournament data:
- **Popularity-based**: Uses units that appear in most winning lists
- **Synergy-based**: Pairs units that frequently appear together (e.g., "Dracosan + Malcador = 100% synergy")
- **Balanced**: Ensures you fill required FOC slots

### Intelligent Scoring

Lists are scored on "meta strength":
```
Meta Score = (Average Tournament Inclusion %) × Strategy Bonus
```

Higher scores = more aligned with tournament meta

### Real Tournament Data

All recommendations come from actual parsed tournament lists:
- Unit popularity percentages
- Common pairings and combos
- Trend tracking (↑ rising, ↓ falling, → stable)

## 💡 Tips

### Build Your Collection Gradually

```bash
# Start with what you have
auxilia collection add "Lasrifle Section" 2

# Get recommendations
auxilia collection recommend

# Buy recommended units
auxilia collection add "Dracosan Armoured Transport" 1

# Generate updated lists
auxilia collection generate
```

As you add more units, list quality improves!

### Use Notes for Organization

```bash
# Track painting status
auxilia collection add "Legate Commander" 1 --notes "Primed"

# Track assembly
auxilia collection add "Malcador Heavy Tank" 1 --notes "Need to magnetize"

# Track storage
auxilia collection add "Lasrifle Section" 6 --notes "4 painted, 2 NiB"
```

### Compare Generated Lists

Run `generate` multiple times to see different combinations:
```bash
auxilia collection generate --count 3
```

- List #1 might use more Dracosans (popular in meta)
- List #2 might pair Ogryns + Commander (high synergy)
- List #3 might balance HQ/Troops/Heavy Support evenly

### Check Unit Value Before Buying

Before purchasing, add it temporarily to see its impact:

```bash
# See current recommendations
auxilia collection recommend

# Buy it
auxilia collection add "Charonite Ogryns" 1

# See if it appears in generated lists
auxilia collection generate

# Does it improve meta score?
```

## 📊 Understanding the Output

### Tournament Inclusion %

```
Legate Commander: 66.7%
```

This unit appears in **66.7% of tournament lists** in the database.

**Interpretation:**
- **>60%**: Meta staple, almost auto-include
- **40-60%**: Very popular, strong choice
- **20-40%**: Common, situational
- **<20%**: Niche or underrepresented

### Trend Indicators

- **↑**: Increasing in popularity (last 3 months vs previous 3)
- **→**: Stable
- **↓**: Decreasing

### Meta Score

```
Meta Score: 44.6
```

Average tournament inclusion of units in the list, weighted by strategy.

**Interpretation:**
- **50+**: Extremely meta-aligned
- **40-50**: Strong tournament viability
- **30-40**: Solid competitive list
- **<30**: Casual or experimental

### Synergy Confidence

```
Pairs with Legate Commander (67% confidence)
```

When Legate Commander appears in a list, **67% of the time** that list also includes this unit.

**High confidence (>70%)**: Strong tactical synergy
**Medium confidence (50-70%)**: Often paired together
**Low confidence (<50%)**: Occasional pairing

## 🎯 Strategic Advantages

### 1. Maximize ROI on Purchases

Don't buy blindly - see what's actually winning tournaments:

```bash
auxilia collection recommend --top 10
```

Prioritize units with:
- High tournament inclusion
- HIGH priority rating
- Synergy with what you own

### 2. Build Multiple Lists from Same Collection

One collection → multiple valid lists for different matchups:

```bash
auxilia collection generate --count 3
```

Try different strategies without buying new models!

### 3. Track Collection Value

Sort your units by tournament relevance:

```bash
auxilia collection show
```

Units are **automatically sorted by tournament inclusion** - see your best units first!

### 4. Plan Purchases Strategically

```bash
# What do I need most?
auxilia collection recommend

# If I buy this, what lists can I make?
auxilia collection add "Malcador Heavy Tank" 1
auxilia collection generate

# Not happy? Remove it
auxilia collection remove "Malcador Heavy Tank"
```

Test purchases virtually before spending money!

## 🚀 Advanced Usage

### Export Generated Lists

Currently manual, but you can:
1. Generate lists: `auxilia collection generate`
2. Copy output
3. Save to file

Future: Direct export to PDF/HTML

### Compare with Full Meta

```bash
# See your collection's meta alignment
auxilia collection show

# Compare to full tournament stats
auxilia tournament stats

# Identify gaps
auxilia collection recommend
```

### Iterate on Collection

```bash
# Current state
auxilia collection generate

# Add unit
auxilia collection add "New Unit" 1

# How did lists improve?
auxilia collection generate
```

Watch meta scores increase as you add popular units!

## 📝 Example Session

```bash
# Day 1: Set up initial collection
auxilia collection add "Legate Commander" 1
auxilia collection add "Lasrifle Section" 3
auxilia collection show
# Legate: 66.7% inclusion ✓
# Lasrifle: 13.3% inclusion

# Day 2: See what to buy
auxilia collection recommend
# Recommended: Dracosan (66.7%), Leman Russ Squadron (40%)

# Day 3: Bought Dracosans!
auxilia collection add "Dracosan Armoured Transport" 2
auxilia collection generate
# List #1 Meta Score: 52.1 (up from 40!)

# Day 4: Build a tournament list
auxilia collection generate --count 3
# Choose "High Synergy List" for tournament
# Includes Legate + Dracosan (60% confidence pairing)
```

## 🎉 Why This Is Awesome

✅ **No guesswork** - Data from real tournaments
✅ **Build with what you have** - No need to own everything
✅ **Smart suggestions** - See why each unit was chosen
✅ **Purchase planning** - Know what to buy next
✅ **Multiple strategies** - Different lists from same collection
✅ **Meta tracking** - See which units are rising/falling

## 🔮 Future Enhancements (Phase 2/3)

- [ ] Points calculation (from BSData)
- [ ] FOC validation (legal/illegal lists)
- [ ] Export to PDF/HTML/BattleScribe
- [ ] Save/load multiple collections
- [ ] "If I buy X, what lists can I make?" simulator
- [ ] Collection value estimator (points coverage)

## 📚 Related Commands

```bash
# Tournament meta analysis
auxilia tournament stats

# Specific unit details
auxilia tournament unit "Dracosan Armoured Transport"

# Export meta report
auxilia tournament export
```

---

**Start building tournament lists with your own models NOW!** 🚀

```bash
auxilia collection add "Your First Unit" 1
```
