"""40k 10th Edition points calculator — bracket-based discrete sizing."""
import json
import logging
from typing import List, Dict, Any

from src.gamesystems.base import BasePointsCalculator

logger = logging.getLogger(__name__)


class W40K10ePointsCalculator(BasePointsCalculator):
    """40k: discrete points brackets instead of per-model scaling."""

    def calculate_unit_cost(self, unit, upgrades: list, quantity: int) -> int:
        """Calculate cost using points brackets if available, else base_cost.

        40k units have discrete size brackets: [{"models": 5, "cost": 65}, ...]
        The quantity must match one of the bracket model counts exactly.
        Enhancements (upgrades) are added on top.
        """
        cost = self._get_bracket_cost(unit, quantity)

        # Add enhancement/upgrade costs
        for selected in upgrades:
            upgrade_cost = self._resolve_upgrade_cost(selected)
            cost += upgrade_cost

        return cost

    def _get_bracket_cost(self, unit, quantity: int) -> int:
        """Look up cost from points_brackets JSON, or fall back to base_cost."""
        if unit.points_brackets:
            try:
                brackets = json.loads(unit.points_brackets)
                for bracket in brackets:
                    if bracket["models"] == quantity:
                        return bracket["cost"]
                # If no exact match, use closest bracket <= quantity
                valid = [b for b in brackets if b["models"] <= quantity]
                if valid:
                    return max(valid, key=lambda b: b["models"])["cost"]
            except (json.JSONDecodeError, KeyError, TypeError):
                logger.warning(f"Invalid points_brackets for {unit.name}")

        return unit.base_cost

    def _resolve_upgrade_cost(self, selected: dict) -> int:
        """Resolve an upgrade/enhancement to its points cost."""
        from src.models.catalogue import Upgrade
        bs_id = selected.get('upgrade_id') or selected.get('bs_id')
        qty = selected.get('quantity', 1)
        if not bs_id:
            return 0

        upgrade = Upgrade.get_or_none(Upgrade.bs_id == bs_id)
        if upgrade:
            return upgrade.cost * qty
        return 0

    @staticmethod
    def get_available_brackets(unit) -> list[dict]:
        """Get the list of available model-count brackets for a unit."""
        if unit.points_brackets:
            try:
                return json.loads(unit.points_brackets)
            except (json.JSONDecodeError, TypeError):
                pass
        return [{"models": unit.model_min or 1, "cost": unit.base_cost}]
