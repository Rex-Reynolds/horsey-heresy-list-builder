"""Validate rosters against Force Organization Chart rules."""
import json
import logging
from typing import List, Tuple, Dict, Any
from collections import Counter

from src.models import Detachment

logger = logging.getLogger(__name__)


class FOCValidator:
    """Validate army rosters against detachment constraints using native HH3 slot names."""

    def __init__(self, detachment: Detachment):
        """
        Initialize FOC validator for a specific detachment.

        Args:
            detachment: Detachment model instance
        """
        self.detachment = detachment
        self.detachment_name = detachment.name
        self.constraints = json.loads(detachment.constraints) if detachment.constraints else {}
        self.unit_restrictions = (
            json.loads(detachment.unit_restrictions) if detachment.unit_restrictions else {}
        )

    def validate_entries(self, entries: List[Any]) -> List[str]:
        """
        Validate entries against this detachment's constraints.

        Args:
            entries: List of RosterEntry instances with .category and .unit_name

        Returns:
            List of error strings (empty = valid)
        """
        errors = []

        # Count entries by native slot name (each entry = 1 unit)
        slot_counts = Counter()
        for entry in entries:
            slot_counts[entry.category] += 1

        # Validate each slot against constraints
        for slot_name, limits in self.constraints.items():
            count = slot_counts.get(slot_name, 0)
            min_required = limits.get('min', 0)
            max_allowed = limits.get('max', 999)

            if count < min_required:
                errors.append(
                    f"[{self.detachment_name}] {slot_name}: "
                    f"minimum {min_required} required, found {count}"
                )

            if count > max_allowed:
                errors.append(
                    f"[{self.detachment_name}] {slot_name}: "
                    f"maximum {max_allowed} allowed, found {count}"
                )

        # Check for entries in slots not allowed by this detachment
        for slot_name in slot_counts:
            if slot_name not in self.constraints:
                errors.append(
                    f"[{self.detachment_name}] {slot_name}: "
                    f"{slot_counts[slot_name]} unit(s) not allowed in this detachment"
                )

        # Check unit restrictions
        for entry in entries:
            restriction = self.unit_restrictions.get(entry.category)
            if restriction:
                # Check if the unit name matches any allowed pattern
                if not self._matches_restriction(entry.unit_name, restriction):
                    errors.append(
                        f"[{self.detachment_name}] {entry.unit_name}: "
                        f"not allowed in {entry.category} slot (restricted to: {restriction})"
                    )

        return errors

    @staticmethod
    def _matches_restriction(unit_name: str, restriction: str) -> bool:
        """
        Check if a unit name matches a restriction string.

        Restriction examples:
            "Leman Russ Strike, Leman Russ Assault or Malcador Heavy tank units only"
            "Lasrifle Section Units only"
            "Hermes Light Sentinel units only"
        """
        # Clean restriction text
        restriction_clean = restriction.lower()
        restriction_clean = restriction_clean.replace(" units only", "")
        restriction_clean = restriction_clean.replace(" only", "")

        # Split on ", " and " or "
        parts = []
        for part in restriction_clean.replace(" or ", ", ").split(", "):
            parts.append(part.strip())

        unit_lower = unit_name.lower()
        return any(part in unit_lower or unit_lower in part for part in parts if part)

    def get_slot_status(self, entries: List[Any]) -> Dict[str, Dict[str, Any]]:
        """Get detailed slot status for each constraint."""
        slot_counts = Counter()
        for entry in entries:
            slot_counts[entry.category] += 1

        status = {}
        for slot_name, limits in self.constraints.items():
            status[slot_name] = {
                'min': limits.get('min', 0),
                'max': limits.get('max', 999),
                'filled': slot_counts.get(slot_name, 0),
                'restriction': self.unit_restrictions.get(slot_name),
            }

        return status
