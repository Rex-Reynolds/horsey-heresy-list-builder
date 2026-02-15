"""Evaluate BSData modifiers for dynamic slot/cost adjustments."""
import json
import logging
from collections import Counter
from typing import Dict, Any, Optional

from src.bsdata.detachment_loader import (
    TERCIO_UNLOCK_IDS,
    COHORT_DOCTRINES,
    COST_TYPE_AUXILIARY,
    COST_TYPE_APEX,
)

logger = logging.getLogger(__name__)


class ModifierEvaluator:
    """
    Evaluate modifier rules against roster state.

    Modifiers from BSData adjust detachment slot limits and costs based on:
    - Tercio Unlock category counts (how many units with that category are in the roster)
    - Cohort Doctrine selection (which doctrine, if any, is active)
    """

    def __init__(self, roster):
        """
        Initialize evaluator with current roster state.

        Args:
            roster: Roster model instance
        """
        self.roster = roster
        self._category_counts = None
        self._doctrine_id = roster.doctrine if hasattr(roster, 'doctrine') else None

    @property
    def category_counts(self) -> Counter:
        """Lazily compute category selection counts from roster entries."""
        if self._category_counts is None:
            self._category_counts = Counter()
            for rd in self.roster.detachments:
                for entry in rd.entries:
                    unit = entry.unit
                    if unit and unit.tercio_categories:
                        try:
                            cats = json.loads(unit.tercio_categories)
                            for cat_id in cats:
                                self._category_counts[cat_id] += entry.quantity
                        except (json.JSONDecodeError, TypeError):
                            pass
        return self._category_counts

    def evaluate_detachment(self, detachment) -> Dict[str, Any]:
        """
        Evaluate modifiers for a detachment and return adjusted constraints and costs.

        Args:
            detachment: Detachment model instance

        Returns:
            Dict with:
                - constraints: adjusted {slot_key: {min, max}} dict
                - costs: adjusted {auxiliary: float, apex: float} dict
                - max_instances: max number of this detachment type allowed (0 = not available)
        """
        base_constraints = json.loads(detachment.constraints) if detachment.constraints else {}
        base_costs = json.loads(detachment.costs) if detachment.costs else {}

        if not detachment.modifiers:
            return {
                'constraints': base_constraints,
                'costs': base_costs,
                'max_instances': 999,
            }

        try:
            mod_data = json.loads(detachment.modifiers)
        except (json.JSONDecodeError, TypeError):
            return {
                'constraints': base_constraints,
                'costs': base_costs,
                'max_instances': 999,
            }

        rules = mod_data.get('rules', [])
        constraint_id_map = mod_data.get('constraint_id_map', {})

        # Track adjustments to constraint field IDs and cost type IDs
        field_adjustments: Dict[str, float] = {}
        cost_adjustments: Dict[str, Optional[float]] = {}

        for rule in rules:
            if not self._check_conditions(rule.get('conditions', [])):
                continue

            field = rule['field']
            value = rule['value']
            mod_type = rule['type']

            # Calculate repeat multiplier
            repeat_count = self._calc_repeats(rule.get('repeats', []))

            if mod_type == 'increment':
                effective_value = value * repeat_count
                if field in (COST_TYPE_AUXILIARY, COST_TYPE_APEX):
                    cost_adjustments[field] = cost_adjustments.get(field, 0) + effective_value
                else:
                    field_adjustments[field] = field_adjustments.get(field, 0) + effective_value
            elif mod_type == 'set':
                if field in (COST_TYPE_AUXILIARY, COST_TYPE_APEX):
                    cost_adjustments[field] = value  # Set overrides
                else:
                    field_adjustments[field] = value

        # Apply constraint field adjustments to slot limits
        adjusted_constraints = {}
        for slot_key, limits in base_constraints.items():
            adjusted_constraints[slot_key] = dict(limits)

        for field_id, adjustment in field_adjustments.items():
            slot_key = constraint_id_map.get(field_id)
            if not slot_key:
                continue
            if slot_key == '__detachment_instances__':
                continue  # Handled below
            if slot_key in adjusted_constraints:
                adjusted_constraints[slot_key]['max'] = max(
                    0, adjusted_constraints[slot_key]['max'] + int(adjustment)
                )

        # Calculate max instances for this detachment
        max_instances = 999
        for field_id, adjustment in field_adjustments.items():
            slot_key = constraint_id_map.get(field_id)
            if slot_key == '__detachment_instances__':
                max_instances = max(0, int(adjustment))

        # Apply cost adjustments
        adjusted_costs = dict(base_costs)
        for cost_id, value in cost_adjustments.items():
            if cost_id == COST_TYPE_AUXILIARY:
                if isinstance(value, float) and value < 1:
                    # Fractional set = multiplier
                    adjusted_costs['auxiliary'] = max(0, round(base_costs.get('auxiliary', 0) * value))
                else:
                    adjusted_costs['auxiliary'] = base_costs.get('auxiliary', 0) + int(value)
            elif cost_id == COST_TYPE_APEX:
                if isinstance(value, float) and value < 1:
                    adjusted_costs['apex'] = max(0, round(base_costs.get('apex', 0) * value))
                else:
                    adjusted_costs['apex'] = base_costs.get('apex', 0) + int(value)

        return {
            'constraints': adjusted_constraints,
            'costs': adjusted_costs,
            'max_instances': max_instances,
        }

    def _check_conditions(self, conditions: list) -> bool:
        """
        Check if all conditions are met.

        BSData conditions check the count of selections matching a childId
        in a given scope (usually "roster").
        """
        if not conditions:
            return True

        for cond in conditions:
            child_id = cond.get('childId', '')
            cond_type = cond.get('type', '')
            threshold = cond.get('value', 0)

            # SA faction instance check — always true since we only serve SA
            if cond.get('field') == 'selections' and cond.get('scope') in ('primary-catalogue', 'parent'):
                if child_id == '7851-69ac-f701-034e':  # SA catalogue ID
                    continue

            # Count selections for this category in the roster
            actual_count = self._get_selection_count(child_id)

            if cond_type == 'equalTo' and actual_count != threshold:
                return False
            elif cond_type == 'lessThan' and actual_count >= threshold:
                return False
            elif cond_type == 'atLeast' and actual_count < threshold:
                return False
            elif cond_type == 'greaterThan' and actual_count <= threshold:
                return False
            elif cond_type == 'instanceOf':
                continue  # SA catalogue check, always true

        return True

    def _get_selection_count(self, child_id: str) -> int:
        """
        Get the number of selections matching a category ID in the roster.

        For Tercio Unlock IDs: count units with that category
        For Doctrine IDs: 1 if that doctrine is selected, 0 otherwise
        """
        if child_id in TERCIO_UNLOCK_IDS:
            return self.category_counts.get(child_id, 0)
        elif child_id in COHORT_DOCTRINES:
            return 1 if self._doctrine_id == child_id else 0
        return 0

    def _calc_repeats(self, repeats: list) -> int:
        """
        Calculate the repeat multiplier.

        Repeats scale the modifier value by the count of selections matching
        the repeat's childId. E.g., "increment by 1 per Veletaris Tercio Unlock".
        """
        if not repeats:
            return 1

        total = 0
        for rep in repeats:
            child_id = rep.get('childId', '')
            count = self._get_selection_count(child_id)
            total += count * int(rep.get('repeats', 1))

        return total


DOCTRINE_DESCRIPTIONS = {
    "f2be-abfe-311c-afe2": {
        "tercio": "Veletaris Tercio",
        "effect": "Veletaris Tercio slot caps scale with Tercio Unlock count and auxiliary cost is halved.",
        "flavour": "Elite shock infantry doctrine — Veletaris storm sections form the cohort's spearhead.",
    },
    "1241-4ccd-80b8-8ff2": {
        "tercio": "Infantry Tercio",
        "effect": "Infantry Tercio slot caps scale with Tercio Unlock count and auxiliary cost is halved.",
        "flavour": "Massed infantry doctrine — Lasrifle sections advance in overwhelming numbers.",
    },
    "7f98-e8eb-f86e-180d": {
        "tercio": "Scout Tercio",
        "effect": "Scout Tercio slot caps scale with Tercio Unlock count and auxiliary cost is halved.",
        "flavour": "Reconnaissance doctrine — Sentinel squadrons and outriders secure forward positions.",
    },
    "1d7a-eb2d-5d0f-0fa4": {
        "tercio": "Armour Tercio",
        "effect": "Armour Tercio slot caps scale with Tercio Unlock count and auxiliary cost is halved.",
        "flavour": "Armoured warfare doctrine — Leman Russ and Malcador squadrons lead the assault.",
    },
    "c9ef-b204-e951-6b7e": {
        "tercio": "Artillery Tercio",
        "effect": "Artillery Tercio slot caps scale with Tercio Unlock count and auxiliary cost is halved.",
        "flavour": "Siege doctrine — massed artillery batteries reduce fortifications to rubble.",
    },
    "28ba-8660-5266-8674": {
        "tercio": "Iron Tercio",
        "effect": "Iron Tercio slot caps increase and auxiliary cost is halved.",
        "flavour": "Mechanicum alliance doctrine — Cybernetica cohorts bolster the battleline.",
    },
}


def get_available_doctrines() -> list[dict]:
    """Return the list of available Cohort Doctrines for UI selection."""
    return [
        {
            'id': cat_id,
            'name': name,
            **DOCTRINE_DESCRIPTIONS.get(cat_id, {}),
        }
        for cat_id, name in COHORT_DOCTRINES.items()
    ]
