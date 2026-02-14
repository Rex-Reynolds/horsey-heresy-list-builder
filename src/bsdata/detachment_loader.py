"""Load detachment (FOC) rules from .gst file."""
import json
import logging
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

from src.bsdata.parser import BattleScribeParser

logger = logging.getLogger(__name__)

# Solar Auxilia catalogue identifier used in condition checks
SA_CATALOGUE_ID = "7851-69ac-f701-034e"

# SA-specific detachment names (identified by comment="SA Only" or SA condition)
SA_DETACHMENT_KEYWORDS = [
    "Tercio",
    "Grenadier Muster",
    "Ogryn Auxilia",
    "Infantry Cohort",
    "Artillery Division",
    "Cavalry Wing",
    "Armoured Phalanx",
]

# Generic detachments available to all factions
GENERIC_DETACHMENT_KEYWORDS = [
    "Crusade Primary",
    "Armoured Fist",
    "Tactical Support",
    "Armoured Support",
    "Heavy Support",
    "Combat Pioneer",
    "Shock Assault",
    "First Strike",
    "Veteran Cadre",
    "Dreadnought Talon",
    "Storm Battery",
    "Recon Demi-Company",
    "Storm Cadre",
]

# Categories to skip (locked "Prime" variants, etc.)
SKIP_CATEGORY_PREFIXES = ["Prime ", "Officer of the Line"]


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
        Parse all detachments relevant to Solar Auxilia from the .gst file.

        Returns:
            List of detachment dicts ready for database insertion
        """
        detachments = []

        # Find the root "Crusade Force Organization Chart" force entry
        root_foc = self._find_crusade_foc()
        if root_foc is None:
            logger.warning("Crusade Force Organization Chart not found in .gst")
            return detachments

        root_id = root_foc.get('id')

        # Parse child forceEntries (the actual sub-detachments)
        child_forces = self.parser._xpath(root_foc, './forceEntries/forceEntry')
        logger.info(f"Found {len(child_forces)} sub-detachments under Crusade FOC")

        for force_element in child_forces:
            force_name = force_element.get('name', '')

            # Filter to SA-relevant detachments
            if not self._is_sa_relevant(force_element, force_name):
                continue

            try:
                detachment = self._parse_sub_detachment(force_element, root_id)
                if detachment:
                    detachments.append(detachment)
            except Exception as e:
                logger.warning(f"Failed to parse detachment '{force_name}': {e}")
                continue

        # Also parse standalone force entries (Lord of War Detachment, etc.)
        standalone = self._parse_standalone_detachments()
        detachments.extend(standalone)

        logger.info(f"Loaded {len(detachments)} SA-relevant detachment types")
        return detachments

    def _find_crusade_foc(self) -> Optional[Any]:
        """Find the root Crusade Force Organization Chart forceEntry element."""
        # Look for the top-level forceEntries
        force_elements = self.parser._xpath(
            self.parser.root,
            './forceEntries/forceEntry'
        )

        for fe in force_elements:
            if 'Crusade Force Organization Chart' in (fe.get('name') or ''):
                return fe

        return None

    def _is_sa_relevant(self, force_element, force_name: str) -> bool:
        """Check if a detachment is relevant to Solar Auxilia."""
        # Always include the Primary Detachment
        if 'Primary' in force_name:
            return True

        # Check for SA-specific keywords
        for kw in SA_DETACHMENT_KEYWORDS:
            if kw in force_name:
                return True

        # Check for generic keywords
        for kw in GENERIC_DETACHMENT_KEYWORDS:
            if kw in force_name:
                return True

        # Check for SA condition in modifiers (comment="Solar Auxilia")
        comments = self.parser._xpath(force_element, './/comment')
        for comment in comments:
            if comment.text and 'Solar Auxilia' in comment.text:
                return True

        return False

    def _parse_sub_detachment(self, force_element, parent_id: str) -> Optional[Dict[str, Any]]:
        """
        Parse a sub-detachment forceEntry into database format.

        Args:
            force_element: XML forceEntry element
            parent_id: bs_id of parent force entry

        Returns:
            Detachment dict for database insertion
        """
        name = force_element.get('name')
        force_id = force_element.get('id')

        if not name or not force_id:
            return None

        detachment_type = self._classify_detachment_type(name)
        faction = self._detect_faction(force_element, name)
        constraints, unit_restrictions = self._parse_category_slots(force_element)

        return {
            'bs_id': force_id,
            'name': name,
            'detachment_type': detachment_type,
            'parent_id': parent_id,
            'constraints': json.dumps(constraints),
            'unit_restrictions': json.dumps(unit_restrictions) if unit_restrictions else None,
            'faction': faction,
        }

    def _parse_standalone_detachments(self) -> List[Dict[str, Any]]:
        """Parse standalone force entries (Lord of War Detachment, etc.)."""
        detachments = []

        force_elements = self.parser._xpath(
            self.parser.root,
            './forceEntries/forceEntry'
        )

        for fe in force_elements:
            name = fe.get('name', '')
            if name == 'Crusade Force Organization Chart':
                continue  # Already handled
            if fe.get('hidden') == 'true':
                continue
            if 'Example' in name or 'Unrestricted' in name:
                continue

            force_id = fe.get('id')
            constraints, unit_restrictions = self._parse_category_slots(fe)

            detachments.append({
                'bs_id': force_id,
                'name': name,
                'detachment_type': self._classify_detachment_type(name),
                'parent_id': None,
                'constraints': json.dumps(constraints),
                'unit_restrictions': json.dumps(unit_restrictions) if unit_restrictions else None,
                'faction': None,
            })

        return detachments

    def _classify_detachment_type(self, name: str) -> str:
        """Classify detachment type from name."""
        name_lower = name.lower()

        if 'primary' in name_lower:
            return 'Primary'
        elif 'warlord' in name_lower:
            return 'Primary'
        elif 'apex' in name_lower:
            return 'Apex'
        elif 'auxiliary' in name_lower or 'tercio' in name_lower:
            return 'Auxiliary'
        elif 'lord of war' in name_lower:
            return 'Lord of War'
        elif 'allied' in name_lower:
            return 'Allied'
        elif 'mech' in name_lower:
            return 'Primary'
        else:
            return 'Other'

    def _detect_faction(self, force_element, name: str) -> Optional[str]:
        """Detect if this detachment is faction-specific."""
        # Check comment element
        comment_elements = self.parser._xpath(force_element, './comment')
        for comment in comment_elements:
            if comment.text:
                text = comment.text.strip()
                if text == 'SA Only':
                    return 'Solar Auxilia'
                if 'Solar Auxilia' in text:
                    return 'Solar Auxilia'

        # Check SA keywords in name
        for kw in SA_DETACHMENT_KEYWORDS:
            if kw in name:
                return 'Solar Auxilia'

        # Check if SA condition exists in modifiers
        conditions = self.parser._xpath(force_element, './/condition')
        for cond in conditions:
            if cond.get('childId') == SA_CATALOGUE_ID:
                return 'Solar Auxilia'

        return None  # Generic

    def _parse_category_slots(self, force_element) -> tuple:
        """
        Parse categoryLinks to extract slot constraints and unit restrictions.

        Returns:
            (constraints_dict, unit_restrictions_dict)
            constraints: {slot_name: {min, max}}
            unit_restrictions: {slot_name: "restriction text"} or empty dict
        """
        constraints = {}
        unit_restrictions = {}

        category_links = self.parser._xpath(force_element, './categoryLinks/categoryLink')

        for cat_link in category_links:
            raw_name = cat_link.get('name', '')

            # Skip "Prime" variants (locked/conditional slots)
            if any(raw_name.startswith(prefix) for prefix in SKIP_CATEGORY_PREFIXES):
                continue

            # Skip hidden categories
            if cat_link.get('hidden') == 'true':
                continue

            # Parse slot name and unit restriction from the raw name
            # e.g., "Armour - Leman Russ Strike, Leman Russ Assault or Malcador Heavy tank units only"
            slot_name, restriction = self._parse_slot_name(raw_name)

            # Parse max constraint from categoryLink constraints
            max_val = 999  # Default unlimited
            min_val = 0
            link_constraints = self.parser._xpath(cat_link, './constraints/constraint')
            for c in link_constraints:
                c_type = c.get('type')
                c_field = c.get('field', '')
                value = int(float(c.get('value', 0)))

                if c_field == 'selections':
                    if c_type == 'max':
                        max_val = value
                    elif c_type == 'min':
                        min_val = value

            # Store with the cleaned slot name
            constraints[slot_name] = {'min': min_val, 'max': max_val}

            if restriction:
                unit_restrictions[slot_name] = restriction

        return constraints, unit_restrictions

    def _parse_slot_name(self, raw_name: str) -> tuple:
        """
        Parse slot name and unit restriction from a categoryLink name.

        Examples:
            "Armour" -> ("Armour", None)
            "Armour - Leman Russ Strike, Leman Russ Assault or Malcador Heavy tank units only"
                -> ("Armour", "Leman Russ Strike, Leman Russ Assault or Malcador Heavy tank units only")
            "Support - Rapier Section, Basilisk Artillery Tank or Medusa Artillery tank units only"
                -> ("Support", "Rapier Section, Basilisk Artillery Tank or Medusa Artillery tank units only")
            "Troops - Lasrifle Section Units only"
                -> ("Troops", "Lasrifle Section Units only")

        Returns:
            (slot_name, restriction_text or None)
        """
        if ' - ' in raw_name:
            slot_name, restriction = raw_name.split(' - ', 1)
            return slot_name.strip(), restriction.strip()
        return raw_name.strip(), None

    def get_detachment_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a specific detachment by name."""
        detachments = self.load_all_detachments()
        for detachment in detachments:
            if detachment['name'] == name:
                return detachment
        return None

    def get_detachment_names(self) -> List[str]:
        """Get list of all detachment names."""
        detachments = self.load_all_detachments()
        return [d['name'] for d in detachments]
