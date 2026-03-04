"""40k 10th Edition composition validator — placeholder for Milestone 3."""
import json
import logging
from typing import Optional

from src.gamesystems.base import BaseCompositionValidator

logger = logging.getLogger(__name__)


class W40K10eCompositionValidator(BaseCompositionValidator):
    """Validates 40k 10e army composition rules.

    Rules:
    - Max 3 copies of any non-Battleline/non-Transport datasheet
    - Max 6 copies of Battleline and Dedicated Transport
    - Epic Heroes: max 1 each
    - Enhancement uniqueness (each enhancement taken only once)
    - Leader attachment legality (CHARACTER keyword, valid target, 1:1 binding)
    """

    def validate(self, roster) -> tuple[bool, list[str]]:
        """Validate a 40k roster. Full implementation in Milestone 3."""
        errors = []

        # Points limit check
        if roster.total_points > roster.points_limit:
            errors.append(
                f"Over points limit: {roster.total_points}/{roster.points_limit}"
            )

        # Copy limits
        errors.extend(self._validate_copy_limits(roster))

        # Leader attachments
        errors.extend(self._validate_leader_attachments(roster))

        is_valid = len(errors) == 0
        return is_valid, errors

    def can_add_unit(self, roster, unit, detachment) -> tuple[bool, Optional[str]]:
        """Check if a unit can be added (copy limit check)."""
        from src.models.roster import RosterEntry, RosterDetachment

        # Count existing copies across the roster
        existing = (
            RosterEntry.select()
            .join(RosterDetachment)
            .where(
                (RosterDetachment.roster == roster) &
                (RosterEntry.unit == unit)
            )
            .count()
        )

        max_copies = self._get_max_copies(unit)
        if existing >= max_copies:
            return False, f"'{unit.name}' limited to {max_copies} copies per army"

        return True, None

    def _get_max_copies(self, unit) -> int:
        """Get max copies allowed for a unit based on its type."""
        from src.models.catalogue import UnitKeyword

        keywords = set(
            uk.keyword for uk in
            UnitKeyword.select().where(UnitKeyword.unit == unit)
        )

        if "Epic Hero" in keywords or unit.unit_type == "Epic Hero":
            return 1
        if unit.unit_type in ("Battleline", "Dedicated Transport"):
            return 6
        return 3

    def _validate_copy_limits(self, roster) -> list[str]:
        """Check datasheet copy limits across the army."""
        from src.models.roster import RosterEntry, RosterDetachment
        from collections import Counter

        entries = (
            RosterEntry.select(RosterEntry, RosterDetachment)
            .join(RosterDetachment)
            .where(RosterDetachment.roster == roster)
        )

        unit_counts = Counter()
        for entry in entries:
            unit_counts[entry.unit_id] += 1

        errors = []
        for unit_id, count in unit_counts.items():
            from src.models.catalogue import Unit
            try:
                unit = Unit.get_by_id(unit_id)
            except Unit.DoesNotExist:
                continue

            max_copies = self._get_max_copies(unit)
            if count > max_copies:
                errors.append(
                    f"'{unit.name}' has {count} copies (max {max_copies})"
                )

        return errors

    def _validate_leader_attachments(self, roster) -> list[str]:
        """Validate leader attachment legality. Full implementation in Milestone 3."""
        return []
