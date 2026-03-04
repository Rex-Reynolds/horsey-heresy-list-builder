"""Abstract base classes for game system plugins."""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional


class BaseCatalogueLoader(ABC):
    """Base class for loading catalogue data into the database."""

    @abstractmethod
    def populate_database(self, faction: Optional[str] = None) -> dict:
        """Load all catalogue data into the database.

        Returns:
            dict with counts: {"units": N, "weapons": N, "upgrades": N, ...}
        """

    @abstractmethod
    def get_game_system_id(self) -> str:
        """Return the game system identifier (e.g., 'hh3', '40k10e')."""


class BaseCompositionValidator(ABC):
    """Base class for army composition validation."""

    @abstractmethod
    def validate(self, roster) -> tuple[bool, list[str]]:
        """Validate a roster's composition.

        Returns:
            (is_valid, list_of_error_strings)
        """

    @abstractmethod
    def can_add_unit(self, roster, unit, detachment) -> tuple[bool, Optional[str]]:
        """Check if a unit can be added to a roster detachment.

        Returns:
            (allowed, reason_if_not)
        """


class BaseCategoryMapping(ABC):
    """Base class for category/slot display mapping."""

    @abstractmethod
    def get_display_groups(self) -> dict:
        """Return display group definitions for the unit browser."""

    @abstractmethod
    def get_native_categories_for_group(self, group_name: str) -> list[str]:
        """Map a display group name to native BSData category names."""


class BasePointsCalculator(ABC):
    """Base class for points calculation."""

    @abstractmethod
    def calculate_unit_cost(self, unit, upgrades: list, quantity: int) -> int:
        """Calculate total cost for a unit with upgrades and quantity."""
