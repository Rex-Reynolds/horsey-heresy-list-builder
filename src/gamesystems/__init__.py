"""Game system plugin registry."""
from typing import Optional
from src.gamesystems.base import (
    BaseCatalogueLoader,
    BaseCompositionValidator,
    BaseCategoryMapping,
    BasePointsCalculator,
)

# Registry: game_system_id → plugin classes (lazy-loaded)
GAME_SYSTEMS = {
    "hh3": {
        "name": "Horus Heresy — Age of Darkness",
        "short_name": "Horus Heresy",
        "module": "src.gamesystems.hh3",
    },
    "40k10e": {
        "name": "Warhammer 40,000 — 10th Edition",
        "short_name": "Warhammer 40k",
        "module": "src.gamesystems.w40k10e",
    },
}


def get_game_system_info(game_system: str) -> Optional[dict]:
    """Get info dict for a game system."""
    return GAME_SYSTEMS.get(game_system)


def get_loader(game_system: str) -> BaseCatalogueLoader:
    """Get catalogue loader for a game system."""
    if game_system == "hh3":
        from src.gamesystems.hh3.loader import HH3CatalogueLoader
        return HH3CatalogueLoader()
    elif game_system == "40k10e":
        from src.gamesystems.w40k10e.loader import W40K10eCatalogueLoader
        return W40K10eCatalogueLoader()
    else:
        raise ValueError(f"Unknown game system: {game_system}")


def get_validator(game_system: str) -> BaseCompositionValidator:
    """Get composition validator for a game system."""
    if game_system == "hh3":
        from src.gamesystems.hh3.validator import HH3CompositionValidator
        return HH3CompositionValidator()
    elif game_system == "40k10e":
        from src.gamesystems.w40k10e.validator import W40K10eCompositionValidator
        return W40K10eCompositionValidator()
    else:
        raise ValueError(f"Unknown game system: {game_system}")


def get_category_mapping(game_system: str) -> BaseCategoryMapping:
    """Get category mapping for a game system."""
    if game_system == "hh3":
        from src.gamesystems.hh3.categories import HH3CategoryMapping
        return HH3CategoryMapping()
    elif game_system == "40k10e":
        from src.gamesystems.w40k10e.categories import W40K10eCategoryMapping
        return W40K10eCategoryMapping()
    else:
        raise ValueError(f"Unknown game system: {game_system}")


def get_points_calculator(game_system: str) -> BasePointsCalculator:
    """Get points calculator for a game system."""
    if game_system == "hh3":
        from src.gamesystems.hh3.points import HH3PointsCalculator
        return HH3PointsCalculator()
    elif game_system == "40k10e":
        from src.gamesystems.w40k10e.points import W40K10ePointsCalculator
        return W40K10ePointsCalculator()
    else:
        raise ValueError(f"Unknown game system: {game_system}")
