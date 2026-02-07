# Horus Heresy Solar Auxilia List Builder

A tournament-informed army list builder for Horus Heresy 3.0 Solar Auxilia forces.

## Features

### Phase 1: Tournament Analysis (✅ Complete)
- **Web Scraping**: Automated scraping of tournament data from Best Coast Pairings
- **List Parsing**: Intelligent parsing of army list text with fuzzy unit name matching
- **Meta Analysis**:
  - Unit popularity tracking with trend indicators
  - Points distribution analysis by Force Organization category
  - Efficient unit identification (high popularity, low cost)
  - Unit combination detection (frequently paired units)
- **Rich CLI**: Beautiful terminal interface with tables and formatted output

### Phase 2: BSData Integration (🚧 Coming Soon)
- Clone and parse BSData Horus Heresy repository
- Extract Solar Auxilia unit stats, weapons, and rules
- Force Organization Chart validation
- Points calculation engine

### Phase 3: List Builder (🚧 Coming Soon)
- Interactive list building with meta recommendations
- Real-time FOC validation
- Export to text, HTML, and PDF formats
- Synergy suggestions based on tournament data

## Installation

```bash
# Install dependencies
pip install -e .

# Install Playwright browsers (for web scraping)
playwright install chromium
```

## Usage

### Initialize Database
```bash
auxilia tournament update
```

This will:
1. Scrape Horus Heresy tournaments from Best Coast Pairings
2. Download Solar Auxilia army lists
3. Parse lists into structured data
4. Store everything in local SQLite database

### View Meta Statistics
```bash
# View overall meta report
auxilia tournament stats

# View stats for 3000pt games
auxilia tournament stats --points 3000

# View specific unit details
auxilia tournament unit "Dracosan Armoured Transport"
```

### Export Reports
```bash
# Export meta report to file
auxilia tournament export -o my_report.txt --points 2000
```

## Project Structure

```
horsey-heresy-list-builder/
├── src/
│   ├── cli/              # Command-line interface
│   ├── scrapers/         # Tournament data collection
│   │   ├── base.py       # Abstract scraper with caching
│   │   ├── bcp_scraper.py # Best Coast Pairings implementation
│   │   └── parsers.py    # Army list text parser
│   ├── models/           # Database models (Peewee ORM)
│   │   ├── database.py   # Database connection
│   │   ├── tournament.py # Tournament data models
│   │   ├── catalogue.py  # BSData models
│   │   └── roster.py     # User list models
│   ├── analytics/        # Meta analysis engine
│   │   ├── unit_popularity.py
│   │   ├── point_distribution.py
│   │   ├── combo_detector.py
│   │   └── reports.py
│   ├── bsdata/          # BSData integration (Phase 2)
│   └── builder/         # List builder (Phase 3)
├── data/
│   ├── cache/           # Cached web scraper data
│   └── auxilia.db       # SQLite database
├── exports/             # Generated reports and lists
└── tests/
```

## Development

### Debug Mode
```bash
auxilia --debug tournament update
```

### Configuration
Environment variables:
- `SCRAPE_DELAY`: Delay between requests (default: 3.0 seconds)
- `MIN_TOURNAMENT_SIZE`: Minimum players for analysis (default: 8)
- `RECENT_MONTHS`: Months to analyze for trends (default: 6)

## Data Sources

- **Tournament Data**: [Best Coast Pairings](https://www.bestcoastpairings.com)
- **Unit Rules**: [BSData Horus Heresy 3rd Edition](https://github.com/BSData/horus-heresy-3rd-edition)

## License

MIT
