"""Validate rosters against Force Organization Chart rules."""
import json
import logging
from typing import List, Tuple, Dict, Any
from collections import Counter

from src.models import Detachment
from src.bsdata.detachment_loader import DetachmentLoader
from src.config import BSDATA_DIR

logger = logging.getLogger(__name__)

# Default Primary Detachment constraints for Solar Auxilia
# Used when DB is empty and .gst parsing fails
SA_PRIMARY_DEFAULTS = {
    'High Command': {'min': 0, 'max': 1},
    'Command': {'min': 1, 'max': 3},
    'Troops': {'min': 2, 'max': 4},
    'Elites': {'min': 0, 'max': 4},
    'Fast Attack': {'min': 0, 'max': 2},
    'Support': {'min': 0, 'max': 3},
    'Armour': {'min': 0, 'max': 3},
    'Heavy Assault': {'min': 0, 'max': 2},
    'Recon': {'min': 0, 'max': 2},
    'War-engine': {'min': 0, 'max': 1},
    'Transport': {'min': 0, 'max': 4},
    'Heavy Transport': {'min': 0, 'max': 2},
    'Lord of War': {'min': 0, 'max': 1},
    'Retinue': {'min': 0, 'max': 1},
}


class FOCValidator:
    """Validate army rosters against FOC detachment constraints."""

    def __init__(self, detachment_type: str = "Crusade Primary Detachment"):
        """
        Initialize FOC validator.

        Args:
            detachment_type: Name of detachment to validate against
        """
        self.detachment_data = None
        self.unit_restrictions = {}

        # Try DB first
        try:
            det = Detachment.get_or_none(Detachment.name == detachment_type)
            if det:
                self.detachment_data = {
                    'name': det.name,
                    'constraints': det.constraints,
                    'unit_restrictions': det.unit_restrictions,
                }
        except Exception:
            pass

        # Fallback to .gst loader
        if not self.detachment_data:
            try:
                gst_path = BSDATA_DIR / "Horus Heresy 3rd Edition.gst"
                loader = DetachmentLoader(gst_path)
                det_data = loader.get_detachment_by_name(detachment_type)
                if det_data:
                    self.detachment_data = det_data
            except Exception:
                pass

        # Final fallback to hardcoded defaults
        if not self.detachment_data:
            logger.warning(f"Detachment '{detachment_type}' not found, using SA primary defaults")
            self.detachment_data = {
                'name': detachment_type,
                'constraints': json.dumps(SA_PRIMARY_DEFAULTS),
                'unit_restrictions': None,
            }

        self.detachment_name = self.detachment_data['name']
        self.constraints = json.loads(self.detachment_data['constraints'])
        if self.detachment_data.get('unit_restrictions'):
            self.unit_restrictions = json.loads(self.detachment_data['unit_restrictions'])

        logger.debug(f"FOC Validator initialized for: {self.detachment_name}")

    def validate_roster(self, roster_entries: List[Any]) -> Tuple[bool, List[str]]:
        """
        Validate roster entries against FOC constraints.

        Args:
            roster_entries: List of RosterEntry instances with .category attribute

        Returns:
            Tuple of (is_valid: bool, errors: list[str])
        """
        errors = []

        # Count units by category (use bsdata_category if available, fall back to category)
        category_counts = self._count_categories(roster_entries)

        # Validate each category against constraints
        for category, limits in self.constraints.items():
            count = category_counts.get(category, 0)
            min_required = limits.get('min', 0)
            max_allowed = limits.get('max', 999)

            if count < min_required:
                errors.append(
                    f"{category}: minimum {min_required} required, found {count}"
                )

            if count > max_allowed:
                errors.append(
                    f"{category}: maximum {max_allowed} allowed, found {count}"
                )

        # Check for uncategorized units
        for category in category_counts.keys():
            if category not in self.constraints:
                count = category_counts[category]
                errors.append(
                    f"{category}: {count} unit(s) not allowed in {self.detachment_name}"
                )

        is_valid = len(errors) == 0

        if is_valid:
            logger.info(f"Roster is valid for {self.detachment_name}")
        else:
            logger.warning(f"Roster validation failed: {len(errors)} error(s)")

        return is_valid, errors

    def _count_categories(self, roster_entries: List[Any]) -> Dict[str, int]:
        """Count roster entries by category."""
        categories = [entry.category for entry in roster_entries]
        return dict(Counter(categories))

    def get_category_limits(self, category: str) -> Tuple[int, int]:
        """Get min/max limits for a specific FOC category."""
        limits = self.constraints.get(category, {'min': 0, 'max': 0})
        return limits.get('min', 0), limits.get('max', 0)

    def get_all_category_limits(self) -> Dict[str, Dict[str, int]]:
        """Get all category limits for this detachment."""
        return self.constraints.copy()

    def get_remaining_slots(self, roster_entries: List[Any]) -> Dict[str, Dict[str, int]]:
        """Calculate remaining slots for each category."""
        category_counts = self._count_categories(roster_entries)
        remaining = {}

        for category, limits in self.constraints.items():
            current = category_counts.get(category, 0)
            max_allowed = limits.get('max', 999)
            min_required = limits.get('min', 0)

            remaining[category] = {
                'current': current,
                'min': min_required,
                'max': max_allowed,
                'remaining': max_allowed - current,
                'deficit': max(0, min_required - current),
            }

        return remaining

    def suggest_additions(self, roster_entries: List[Any]) -> List[str]:
        """Suggest which categories need more units to meet minimums."""
        remaining = self.get_remaining_slots(roster_entries)
        suggestions = []

        for category, stats in remaining.items():
            if stats['deficit'] > 0:
                suggestions.append(
                    f"Add {stats['deficit']} more {category} unit(s) (minimum: {stats['min']})"
                )

        return suggestions
