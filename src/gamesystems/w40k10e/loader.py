"""40k 10th Edition catalogue loader — parses BSData/wh40k-10e catalogues."""
import json
import logging
from pathlib import Path
from typing import Optional

from src.gamesystems.base import BaseCatalogueLoader

logger = logging.getLogger(__name__)


class W40K10eCatalogueLoader(BaseCatalogueLoader):
    """Loads 40k 10th Edition faction catalogues into the database."""

    def get_game_system_id(self) -> str:
        return "40k10e"

    def populate_database(self, faction: Optional[str] = None) -> dict:
        """Load a 40k faction catalogue into the database.

        Args:
            faction: Faction name (e.g., "Genestealer Cults"). Required.

        Returns:
            dict with insert counts
        """
        if not faction:
            raise ValueError("Faction name is required for 40k catalogue loading")

        from src.config import BSDATA_REPOS
        from src.bsdata.repository import get_catalogue_path, get_game_system_path

        config = BSDATA_REPOS["40k10e"]
        bsdata_dir = config["directory"]

        if not bsdata_dir.exists():
            raise FileNotFoundError(
                f"40k BSData repository not found at {bsdata_dir}. "
                "Run: bsdata update --game-system 40k10e"
            )

        # Parse game system file for global categories
        gst_path = get_game_system_path("40k10e")
        if not gst_path:
            raise FileNotFoundError("Warhammer 40,000.gst not found")

        # Parse faction catalogue
        cat_path = get_catalogue_path(faction, "40k10e")
        if not cat_path:
            raise FileNotFoundError(f"Catalogue for '{faction}' not found in {bsdata_dir}")

        logger.info(f"Loading 40k catalogue: {faction} from {cat_path}")

        # Import the actual parser (implemented in Milestone 2)
        from src.gamesystems.w40k10e.parser import parse_40k_catalogue
        counts = parse_40k_catalogue(gst_path, cat_path, faction)

        return counts
