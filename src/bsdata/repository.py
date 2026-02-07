"""BSData repository management."""
import logging
import subprocess
from pathlib import Path
from typing import Optional

from src.config import BSDATA_DIR, BSDATA_REPO

logger = logging.getLogger(__name__)


def clone_or_update_repo() -> bool:
    """
    Clone BSData repository if it doesn't exist, otherwise update it.

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        if not BSDATA_DIR.exists():
            logger.info(f"Cloning BSData repository to {BSDATA_DIR}")
            BSDATA_DIR.parent.mkdir(parents=True, exist_ok=True)

            result = subprocess.run(
                ["git", "clone", BSDATA_REPO, str(BSDATA_DIR)],
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode == 0:
                logger.info("✓ Repository cloned successfully")
                return True
            else:
                logger.error(f"Git clone failed: {result.stderr}")
                return False
        else:
            logger.info(f"Updating BSData repository at {BSDATA_DIR}")

            result = subprocess.run(
                ["git", "-C", str(BSDATA_DIR), "pull"],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                logger.info("✓ Repository updated successfully")
                return True
            else:
                logger.warning(f"Git pull failed: {result.stderr}")
                return False

    except subprocess.TimeoutExpired:
        logger.error("Git operation timed out")
        return False
    except Exception as e:
        logger.error(f"Error managing repository: {e}")
        return False


def get_catalogue_path(catalogue_name: str) -> Optional[Path]:
    """
    Get path to a specific catalogue file.

    Args:
        catalogue_name: Name of catalogue (e.g., "Solar Auxilia")

    Returns:
        Path to .cat file, or None if not found
    """
    if not BSDATA_DIR.exists():
        logger.error("BSData repository not found. Run clone_or_update_repo() first.")
        return None

    # Try exact match
    cat_file = BSDATA_DIR / f"{catalogue_name}.cat"
    if cat_file.exists():
        return cat_file

    # Try case-insensitive search
    for cat_file in BSDATA_DIR.glob("*.cat"):
        if cat_file.stem.lower() == catalogue_name.lower():
            return cat_file

    logger.warning(f"Catalogue '{catalogue_name}' not found")
    return None


def list_available_catalogues() -> list[str]:
    """
    List all available catalogue files.

    Returns:
        List of catalogue names (without .cat extension)
    """
    if not BSDATA_DIR.exists():
        logger.error("BSData repository not found")
        return []

    catalogues = []
    for cat_file in BSDATA_DIR.glob("*.cat"):
        catalogues.append(cat_file.stem)

    return sorted(catalogues)


def get_game_system_path() -> Optional[Path]:
    """
    Get path to the game system file (.gst).

    Returns:
        Path to .gst file, or None if not found
    """
    if not BSDATA_DIR.exists():
        return None

    # Look for Horus Heresy game system file
    for gst_file in BSDATA_DIR.glob("*.gst"):
        if "horus heresy" in gst_file.stem.lower():
            return gst_file

    return None


def check_for_updates() -> dict:
    """
    Check if there are updates available from remote.

    Returns:
        dict with 'has_updates' (bool) and 'commits_behind' (int)
    """
    if not BSDATA_DIR.exists():
        return {"has_updates": False, "commits_behind": 0}

    try:
        # Fetch latest
        subprocess.run(
            ["git", "-C", str(BSDATA_DIR), "fetch"],
            capture_output=True,
            timeout=30
        )

        # Check commits behind
        result = subprocess.run(
            ["git", "-C", str(BSDATA_DIR), "rev-list", "--count", "HEAD..@{u}"],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            commits_behind = int(result.stdout.strip())
            return {
                "has_updates": commits_behind > 0,
                "commits_behind": commits_behind
            }

    except Exception as e:
        logger.debug(f"Could not check for updates: {e}")

    return {"has_updates": False, "commits_behind": 0}
