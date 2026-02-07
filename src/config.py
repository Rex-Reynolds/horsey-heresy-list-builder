"""Configuration settings for the Solar Auxilia list builder."""
import os
from pathlib import Path

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
BSDATA_DIR = DATA_DIR / "bsdata"
CACHE_DIR = DATA_DIR / "cache"
EXPORT_DIR = PROJECT_ROOT / "exports"
DB_PATH = DATA_DIR / "auxilia.db"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)
EXPORT_DIR.mkdir(exist_ok=True)

# BSData configuration
BSDATA_REPO = "https://github.com/BSData/horus-heresy-3rd-edition"
FACTION = "Solar Auxilia"

# Web scraping configuration
BCP_BASE_URL = "https://www.bestcoastpairings.com"
SCRAPE_DELAY = float(os.getenv("SCRAPE_DELAY", "3.0"))
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# Analysis configuration
MIN_TOURNAMENT_SIZE = int(os.getenv("MIN_TOURNAMENT_SIZE", "8"))
RECENT_MONTHS = int(os.getenv("RECENT_MONTHS", "6"))

# Association rule mining thresholds
MIN_SUPPORT = 0.20  # 20% minimum support for combo detection
CONFIDENCE_THRESHOLD = 0.50  # 50% confidence for synergy recommendations
