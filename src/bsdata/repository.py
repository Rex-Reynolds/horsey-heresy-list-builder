"""BSData repository management."""
import logging
import subprocess
from pathlib import Path
from typing import Optional

from src.config import BSDATA_DIR, BSDATA_REPO, BSDATA_REPOS

logger = logging.getLogger(__name__)


def _clone_or_update_dir(repo_url: str, target_dir: Path) -> bool:
    """Clone or update a git repo into target_dir."""
    try:
        if not target_dir.exists():
            logger.info(f"Cloning {repo_url} to {target_dir}")
            target_dir.parent.mkdir(parents=True, exist_ok=True)

            result = subprocess.run(
                ["git", "clone", repo_url, str(target_dir)],
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode == 0:
                logger.info("Repository cloned successfully")
                return True
            else:
                logger.error(f"Git clone failed: {result.stderr}")
                return False
        else:
            logger.info(f"Updating repository at {target_dir}")

            result = subprocess.run(
                ["git", "-C", str(target_dir), "pull"],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                logger.info("Repository updated successfully")
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


def clone_or_update_repo(game_system: str = "hh3") -> bool:
    """
    Clone BSData repository if it doesn't exist, otherwise update it.

    Args:
        game_system: Which game system repo to clone/update ("hh3" or "40k10e")

    Returns:
        bool: True if successful, False otherwise
    """
    config = BSDATA_REPOS.get(game_system)
    if not config:
        logger.error(f"Unknown game system: {game_system}")
        return False

    return _clone_or_update_dir(config["repo"], config["directory"])


def get_bsdata_dir(game_system: str = "hh3") -> Path:
    """Get the BSData directory for a game system."""
    config = BSDATA_REPOS.get(game_system)
    if config:
        return config["directory"]
    return BSDATA_DIR


def get_catalogue_path(catalogue_name: str, game_system: str = "hh3") -> Optional[Path]:
    """
    Get path to a specific catalogue file.

    Args:
        catalogue_name: Name of catalogue (e.g., "Solar Auxilia", "Genestealer Cults")
        game_system: Which game system to look in

    Returns:
        Path to .cat file, or None if not found
    """
    bsdata_dir = get_bsdata_dir(game_system)
    if not bsdata_dir.exists():
        logger.error(f"BSData repository not found at {bsdata_dir}. Run clone_or_update_repo() first.")
        return None

    # Try exact match
    cat_file = bsdata_dir / f"{catalogue_name}.cat"
    if cat_file.exists():
        return cat_file

    # Try case-insensitive search
    for cat_file in bsdata_dir.glob("*.cat"):
        if cat_file.stem.lower() == catalogue_name.lower():
            return cat_file

    logger.warning(f"Catalogue '{catalogue_name}' not found in {bsdata_dir}")
    return None


def list_available_catalogues(game_system: str = "hh3") -> list[str]:
    """
    List all available catalogue files.

    Returns:
        List of catalogue names (without .cat extension)
    """
    bsdata_dir = get_bsdata_dir(game_system)
    if not bsdata_dir.exists():
        logger.error(f"BSData repository not found at {bsdata_dir}")
        return []

    catalogues = []
    for cat_file in bsdata_dir.glob("*.cat"):
        catalogues.append(cat_file.stem)

    return sorted(catalogues)


def get_game_system_path(game_system: str = "hh3") -> Optional[Path]:
    """
    Get path to the game system file (.gst).

    Returns:
        Path to .gst file, or None if not found
    """
    config = BSDATA_REPOS.get(game_system)
    if not config:
        return None

    bsdata_dir = config["directory"]
    if not bsdata_dir.exists():
        return None

    gst_name = config.get("gst_name")
    if gst_name:
        gst_path = bsdata_dir / gst_name
        if gst_path.exists():
            return gst_path

    # Fallback: search for any .gst file
    for gst_file in bsdata_dir.glob("*.gst"):
        return gst_file

    return None


def check_for_updates(game_system: str = "hh3") -> dict:
    """
    Check if there are updates available from remote.

    Returns:
        dict with 'has_updates' (bool) and 'commits_behind' (int)
    """
    bsdata_dir = get_bsdata_dir(game_system)
    if not bsdata_dir.exists():
        return {"has_updates": False, "commits_behind": 0}

    try:
        subprocess.run(
            ["git", "-C", str(bsdata_dir), "fetch"],
            capture_output=True,
            timeout=30
        )

        result = subprocess.run(
            ["git", "-C", str(bsdata_dir), "rev-list", "--count", "HEAD..@{u}"],
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
