"""Load detachment (FOC) rules from .gst file."""
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

from src.bsdata.parser import BattleScribeParser

logger = logging.getLogger(__name__)


class DetachmentLoader:
    """Load Force Organization Chart detachment rules from game system file."""

    def __init__(self, gst_path: Path):
        """
        Initialize detachment loader.

        Args:
            gst_path: Path to Horus Heresy 3rd Edition.gst file
        """
        if not gst_path.exists():
            raise FileNotFoundError(f"Game system file not found: {gst_path}")

        self.parser = BattleScribeParser(gst_path)
        logger.info(f"Loaded game system: {self.parser.get_catalogue_info()['name']}")

    def load_all_detachments(self) -> List[Dict[str, Any]]:
        """
        Parse all forceEntry elements from .gst.

        Returns:
            List of detachment dicts ready for database insertion
        """
        detachments = []
        force_entries = self.parser.get_force_entries()

        for force in force_entries:
            if force.get('hidden'):
                continue

            try:
                detachment = self._parse_force_entry(force)
                if detachment:
                    detachments.append(detachment)
            except Exception as e:
                logger.warning(f"Failed to parse force entry '{force.get('name')}': {e}")
                continue

        logger.info(f"Loaded {len(detachments)} detachment types")
        return detachments

    def _parse_force_entry(self, force: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse a forceEntry into database format.

        Args:
            force: Force entry dict from parser

        Returns:
            Detachment dict for database insertion
        """
        name = force.get('name')
        force_id = force.get('id')

        if not name or not force_id:
            return None

        # Determine detachment type from name
        detachment_type = self._classify_detachment_type(name)

        # Parse FOC constraints from category links and constraints
        foc_constraints = self._parse_foc_constraints(force)

        return {
            'bs_id': force_id,
            'name': name,
            'detachment_type': detachment_type,
            'constraints': json.dumps(foc_constraints),
        }

    def _classify_detachment_type(self, name: str) -> str:
        """
        Classify detachment type from name.

        Args:
            name: Detachment name

        Returns:
            Detachment type (Primary, Auxiliary, etc.)
        """
        name_lower = name.lower()

        if 'primary' in name_lower:
            return 'Primary'
        elif 'auxiliary' in name_lower or 'allied' in name_lower:
            return 'Auxiliary'
        elif 'apex' in name_lower:
            return 'Apex'
        else:
            return 'Other'

    def _parse_foc_constraints(self, force: Dict[str, Any]) -> Dict[str, Dict[str, int]]:
        """
        Parse FOC constraints (min/max by category).

        Args:
            force: Force entry dict

        Returns:
            Dict mapping category names to {min, max}
        """
        foc_constraints = {}

        # Get category links - these define which categories are available
        category_links = force.get('category_links', [])

        for cat_link in category_links:
            category_name = cat_link.get('name')
            if not category_name:
                continue

            # Skip non-FOC categories
            foc_categories = ['HQ', 'Troops', 'Elites', 'Fast Attack', 'Heavy Support', 'Lord of War', 'Fortification']
            if category_name not in foc_categories:
                continue

            # Initialize with defaults
            foc_constraints[category_name] = {
                'min': 0,
                'max': 999,  # Effectively unlimited
            }

        # Parse constraints from the force entry
        constraints = force.get('constraints', [])

        for constraint in constraints:
            constraint_type = constraint.get('type')
            value = int(constraint.get('value', 0))
            field = constraint.get('field')
            scope = constraint.get('scope')

            # Try to match constraint to a category
            # This is tricky - constraints may reference category IDs
            # For now, apply force-level constraints as defaults
            if constraint_type == 'min' and scope == 'force':
                # Apply to all categories as default minimum
                pass
            elif constraint_type == 'max' and scope == 'force':
                # Apply to all categories as default maximum
                pass

        # Apply common FOC patterns based on detachment name
        name_lower = force.get('name', '').lower()

        if 'primary' in name_lower:
            # Primary detachment typical constraints
            if 'HQ' in foc_constraints:
                foc_constraints['HQ'] = {'min': 1, 'max': 2}
            if 'Troops' in foc_constraints:
                foc_constraints['Troops'] = {'min': 2, 'max': 6}
            if 'Elites' in foc_constraints:
                foc_constraints['Elites'] = {'min': 0, 'max': 3}
            if 'Fast Attack' in foc_constraints:
                foc_constraints['Fast Attack'] = {'min': 0, 'max': 3}
            if 'Heavy Support' in foc_constraints:
                foc_constraints['Heavy Support'] = {'min': 0, 'max': 3}
            if 'Lord of War' in foc_constraints:
                foc_constraints['Lord of War'] = {'min': 0, 'max': 1}

        elif 'auxiliary' in name_lower:
            # Auxiliary detachment typical constraints
            if 'HQ' in foc_constraints:
                foc_constraints['HQ'] = {'min': 0, 'max': 1}
            if 'Troops' in foc_constraints:
                foc_constraints['Troops'] = {'min': 1, 'max': 3}
            if 'Elites' in foc_constraints:
                foc_constraints['Elites'] = {'min': 0, 'max': 2}
            if 'Fast Attack' in foc_constraints:
                foc_constraints['Fast Attack'] = {'min': 0, 'max': 2}
            if 'Heavy Support' in foc_constraints:
                foc_constraints['Heavy Support'] = {'min': 0, 'max': 2}

        return foc_constraints

    def get_detachment_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific detachment by name.

        Args:
            name: Detachment name

        Returns:
            Detachment dict, or None if not found
        """
        detachments = self.load_all_detachments()

        for detachment in detachments:
            if detachment['name'] == name:
                return detachment

        return None

    def get_detachment_names(self) -> List[str]:
        """
        Get list of all detachment names.

        Returns:
            List of detachment names
        """
        detachments = self.load_all_detachments()
        return [d['name'] for d in detachments]
