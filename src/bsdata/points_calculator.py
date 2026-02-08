"""Calculate points costs for units and rosters."""
import json
import logging
from typing import List, Dict, Any

from src.models.catalogue import Unit, Weapon, Upgrade

logger = logging.getLogger(__name__)


class PointsCalculator:
    """Calculate points costs for units with upgrades and rosters."""

    @staticmethod
    def calculate_unit_cost(unit: Unit, selected_upgrades: List[Dict[str, Any]]) -> int:
        """
        Calculate total cost for a unit with selected upgrades.

        Args:
            unit: Unit model instance
            selected_upgrades: List of dicts with format:
                [{"upgrade_id": str, "quantity": int}, ...]
                or [{"bs_id": str, "quantity": int}, ...]

        Returns:
            Total points cost (base + upgrades)
        """
        total = unit.base_cost

        for selected in selected_upgrades:
            try:
                # Support both database ID and BattleScribe ID
                upgrade_id = selected.get('upgrade_id') or selected.get('id')
                bs_id = selected.get('bs_id')
                quantity = selected.get('quantity', 1)

                # Look up upgrade
                upgrade = None

                if upgrade_id:
                    # Database ID
                    try:
                        upgrade = Upgrade.get_by_id(upgrade_id)
                    except Exception:
                        logger.debug(f"Upgrade not found by ID: {upgrade_id}")

                if not upgrade and bs_id:
                    # BattleScribe ID
                    upgrade = Upgrade.get_or_none(Upgrade.bs_id == bs_id)

                    # Also check weapons
                    if not upgrade:
                        weapon = Weapon.get_or_none(Weapon.bs_id == bs_id)
                        if weapon:
                            # Use weapon cost directly
                            total += weapon.cost * quantity
                            continue

                if upgrade:
                    total += upgrade.cost * quantity
                else:
                    logger.warning(f"Upgrade not found: {selected}")

            except Exception as e:
                logger.error(f"Error calculating upgrade cost: {e}")
                continue

        return total

    @staticmethod
    def calculate_roster_total(roster) -> int:
        """
        Calculate total points for a roster.

        Args:
            roster: Roster model instance with .entries backref

        Returns:
            Total points cost for the roster
        """
        total = 0

        for entry in roster.entries:
            # Use cached total_cost if available
            if entry.total_cost:
                total += entry.total_cost
            else:
                # Recalculate if not cached
                if entry.unit:
                    upgrades = json.loads(entry.upgrades) if entry.upgrades else []
                    entry_cost = PointsCalculator.calculate_unit_cost(entry.unit, upgrades)
                    entry_cost *= entry.quantity  # Multiply by quantity
                    total += entry_cost

        return total

    @staticmethod
    def calculate_and_cache_entry_cost(roster_entry) -> int:
        """
        Calculate and cache the total cost for a roster entry.

        Args:
            roster_entry: RosterEntry model instance

        Returns:
            Total points cost (base + upgrades) * quantity
        """
        if not roster_entry.unit:
            logger.warning(f"Roster entry has no unit: {roster_entry.unit_name}")
            return 0

        # Parse upgrades
        upgrades = []
        if roster_entry.upgrades:
            try:
                upgrades = json.loads(roster_entry.upgrades)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse upgrades for {roster_entry.unit_name}")

        # Calculate unit cost
        unit_cost = PointsCalculator.calculate_unit_cost(roster_entry.unit, upgrades)

        # Multiply by quantity
        total_cost = unit_cost * roster_entry.quantity

        # Cache the result
        roster_entry.total_cost = total_cost
        roster_entry.save()

        return total_cost

    @staticmethod
    def get_upgrade_cost(upgrade_id: int = None, bs_id: str = None) -> int:
        """
        Get the cost of a single upgrade.

        Args:
            upgrade_id: Database ID of upgrade
            bs_id: BattleScribe ID of upgrade

        Returns:
            Points cost, or 0 if not found
        """
        upgrade = None

        if upgrade_id:
            try:
                upgrade = Upgrade.get_by_id(upgrade_id)
            except Exception:
                pass

        if not upgrade and bs_id:
            upgrade = Upgrade.get_or_none(Upgrade.bs_id == bs_id)

            # Also check weapons
            if not upgrade:
                weapon = Weapon.get_or_none(Weapon.bs_id == bs_id)
                if weapon:
                    return weapon.cost

        return upgrade.cost if upgrade else 0

    @staticmethod
    def breakdown_unit_cost(unit: Unit, selected_upgrades: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Get detailed cost breakdown for a unit.

        Args:
            unit: Unit model instance
            selected_upgrades: List of selected upgrade dicts

        Returns:
            Dict with format:
            {
                'base_cost': int,
                'upgrades': [{'name': str, 'cost': int, 'quantity': int}, ...],
                'total': int
            }
        """
        breakdown = {
            'base_cost': unit.base_cost,
            'upgrades': [],
            'total': unit.base_cost,
        }

        for selected in selected_upgrades:
            try:
                upgrade_id = selected.get('upgrade_id') or selected.get('id')
                bs_id = selected.get('bs_id')
                quantity = selected.get('quantity', 1)

                # Look up upgrade
                upgrade = None
                upgrade_name = "Unknown"
                upgrade_cost = 0

                if upgrade_id:
                    try:
                        upgrade = Upgrade.get_by_id(upgrade_id)
                    except Exception:
                        pass

                if not upgrade and bs_id:
                    upgrade = Upgrade.get_or_none(Upgrade.bs_id == bs_id)

                    if not upgrade:
                        weapon = Weapon.get_or_none(Weapon.bs_id == bs_id)
                        if weapon:
                            upgrade_name = weapon.name
                            upgrade_cost = weapon.cost

                if upgrade:
                    upgrade_name = upgrade.name
                    upgrade_cost = upgrade.cost

                total_upgrade_cost = upgrade_cost * quantity

                breakdown['upgrades'].append({
                    'name': upgrade_name,
                    'cost': upgrade_cost,
                    'quantity': quantity,
                    'total': total_upgrade_cost,
                })

                breakdown['total'] += total_upgrade_cost

            except Exception as e:
                logger.error(f"Error in cost breakdown: {e}")
                continue

        return breakdown
