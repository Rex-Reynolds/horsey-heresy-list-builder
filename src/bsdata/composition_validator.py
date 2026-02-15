"""Validate roster composition rules (detachment budgets, Primary limits, etc.)."""
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from src.bsdata.detachment_loader import BUDGET_CATEGORIES, BUDGET_DECREMENTS

logger = logging.getLogger(__name__)

# Default rules (matches BSData .gst extraction)
DEFAULT_RULES = {
    "primary": {"min": 1, "max": 1},
    "warlord_points_threshold": 3000,
}


@dataclass
class CompositionBudget:
    """Current composition budget state for a roster."""
    primary_count: int = 0
    primary_max: int = 1
    auxiliary_budget: int = 0
    auxiliary_used: int = 0
    apex_budget: int = 0
    apex_used: int = 0
    warlord_available: bool = False
    warlord_count: int = 0
    warlord_max: int = 1
    errors: list = field(default_factory=list)


class CompositionValidator:
    """Validate and compute detachment composition budgets."""

    def __init__(self, rules_path: Optional[Path] = None):
        if rules_path and rules_path.exists():
            with open(rules_path) as f:
                self.rules = json.load(f)
        else:
            self.rules = DEFAULT_RULES

        self.warlord_threshold = self.rules.get("warlord_points_threshold", 3000)
        self.primary_max = self.rules.get("primary", {}).get("max", 1)

    def get_budget(self, roster) -> CompositionBudget:
        """
        Compute the current composition budget from roster state.

        Args:
            roster: Roster model instance (with detachments and entries loaded)

        Returns:
            CompositionBudget with all budget counts
        """
        from src.models.roster import RosterDetachment, RosterEntry

        budget = CompositionBudget()

        # Load all detachments for this roster
        roster_dets = list(
            RosterDetachment.select().where(RosterDetachment.roster == roster)
        )

        # Count detachments by type and sum costs
        for rd in roster_dets:
            det_type = rd.detachment_type
            if det_type == 'Primary':
                budget.primary_count += 1
                # Warlord is also classified as Primary
                if 'Warlord' in rd.detachment_name:
                    budget.warlord_count += 1

            # Sum costs from the detachment template
            det = rd.detachment
            if det and det.costs:
                costs = json.loads(det.costs)
                budget.auxiliary_used += costs.get('auxiliary', 0)
                budget.apex_used += costs.get('apex', 0)

        # Compute budget from unit entries across all detachments
        all_entries = list(
            RosterEntry.select().join(RosterDetachment).where(
                RosterDetachment.roster == roster
            )
        )

        for entry in all_entries:
            unit = entry.unit
            if not unit:
                continue

            # Check budget categories on the unit
            if unit.budget_categories:
                cats = json.loads(unit.budget_categories)
                for cat_id in cats:
                    if cat_id in BUDGET_CATEGORIES:
                        info = BUDGET_CATEGORIES[cat_id]
                        if info['target'] == 'auxiliary':
                            budget.auxiliary_budget += info['value'] * entry.quantity
                        elif info['target'] == 'apex':
                            budget.apex_budget += info['value'] * entry.quantity

            # Check for decrement-relevant upgrades on the entry
            if entry.upgrades:
                upgrades = json.loads(entry.upgrades)
                for upg in upgrades:
                    upg_id = upg.get('upgrade_id', '')
                    if upg_id in BUDGET_DECREMENTS:
                        info = BUDGET_DECREMENTS[upg_id]
                        qty = upg.get('quantity', 1)
                        if info['target'] == 'auxiliary':
                            budget.auxiliary_budget += info['value'] * qty

        # Warlord available at threshold
        budget.warlord_available = (
            roster.points_limit >= self.warlord_threshold
        )

        return budget

    def can_add_detachment(self, roster, detachment) -> tuple:
        """
        Check if adding a detachment to this roster is legal.

        Args:
            roster: Roster model instance
            detachment: Detachment model instance to add

        Returns:
            (allowed: bool, reason: str)
        """
        budget = self.get_budget(roster)
        det_type = detachment.detachment_type
        det_name = detachment.name

        # Primary: max 1
        if det_type == 'Primary' and 'Warlord' not in det_name:
            if budget.primary_count >= self.primary_max:
                return False, "Already have a Primary Detachment (max 1)"

        # Warlord: needs points threshold and max 1
        if 'Warlord' in det_name:
            if not budget.warlord_available:
                return False, f"Warlord Detachment requires {self.warlord_threshold}+ points limit"
            if budget.warlord_count >= 1:
                return False, "Already have a Warlord Detachment (max 1)"

        # Check cost budget
        if detachment.costs:
            costs = json.loads(detachment.costs)
            aux_cost = costs.get('auxiliary', 0)
            apex_cost = costs.get('apex', 0)

            if aux_cost > 0:
                remaining = budget.auxiliary_budget - budget.auxiliary_used
                if aux_cost > remaining:
                    return (
                        False,
                        f"Auxiliary budget full ({budget.auxiliary_used}/{budget.auxiliary_budget}). "
                        f"Add more Command units to unlock slots."
                    )

            if apex_cost > 0:
                remaining = budget.apex_budget - budget.apex_used
                if apex_cost > remaining:
                    return (
                        False,
                        f"Apex budget full ({budget.apex_used}/{budget.apex_budget}). "
                        f"Add High Command units with +1 Apex to unlock slots."
                    )

        return True, ""

    def validate_composition(self, roster) -> list:
        """
        Full validation of roster composition.

        Returns list of error strings (empty = valid).
        """
        budget = self.get_budget(roster)
        errors = []

        # Must have exactly 1 Primary
        if budget.primary_count == 0:
            errors.append("Roster must have a Primary Detachment")
        elif budget.primary_count > self.primary_max:
            errors.append(
                f"Too many Primary Detachments: {budget.primary_count}/{self.primary_max}"
            )

        # Auxiliary budget
        if budget.auxiliary_used > budget.auxiliary_budget:
            errors.append(
                f"Auxiliary budget exceeded: {budget.auxiliary_used}/{budget.auxiliary_budget}"
            )

        # Apex budget
        if budget.apex_used > budget.apex_budget:
            errors.append(
                f"Apex budget exceeded: {budget.apex_used}/{budget.apex_budget}"
            )

        # Warlord without enough points
        if budget.warlord_count > 0 and not budget.warlord_available:
            errors.append(
                f"Warlord Detachment requires {self.warlord_threshold}+ points limit"
            )

        return errors
