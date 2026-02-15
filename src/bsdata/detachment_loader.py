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

# Slot name prefixes to exclude — faction-specific slots irrelevant to Solar Auxilia
NON_SA_SLOT_PREFIXES = [
    "EotL",           # "Enemies of the Line" — per-legion slots
    "Rewards of Treachery",  # Blackshields only
    "Clade Operative",       # Mechanicum/Assassin
    "Cult Operative",        # Ruinstorm
    "Legiones Thallaxes",    # Mechanicum
    "Lord of Automata",      # Mechanicum
    "Master of Automata",    # Mechanicum
    "Transport - Logisticae",   # Logisticae sub-faction only
    "Heavy Transport - Logisticae",  # Logisticae sub-faction only
    "Command - Centurions Only",     # Blackshields
    "Recon - Land Raider Explorator Only",  # Specific legion character
    "War-engine - Upgraded by The Iron-clad",  # Iron Hands character
]

# Cost type IDs from BSData
COST_TYPE_AUXILIARY = "3e8e-05ee-be52-12d6"
COST_TYPE_APEX = "159d-855c-533d-f592"

# Budget-relevant category IDs
BUDGET_CATEGORIES = {
    "6dbf-654a-f06f-2d69": {"name": "Command", "target": "auxiliary", "value": 1},
    "901a-6b71-7a29-4597": {"name": "Officer of the Line (2)", "target": "auxiliary", "value": 2},
    "ff44-f49f-732b-c3a7": {"name": "+1 Auxiliary from High Command", "target": "auxiliary", "value": 1},
    "8a97-1585-93e7-c561": {"name": "+1 Apex from High Command", "target": "apex", "value": 1},
}

# IDs that decrement auxiliary budget
BUDGET_DECREMENTS = {
    "c857-47bd-6a4f-fcf8": {"name": "Special Assignment", "target": "auxiliary", "value": -1},
    "9501-add0-621d-f40f": {"name": "Crux Magisterium", "target": "auxiliary", "value": -1},
}

# Tercio Unlock category IDs
TERCIO_UNLOCK_IDS = {
    "67d3-556b-b619-28e2": "Veletaris Tercio Unlock",
    "390f-d9dc-10d8-56aa": "Armour Tercio Unlock",
    "2a0c-b2b2-0f48-2e90": "Artillery Tercio Unlock",
    "847c-d351-32a7-cc2a": "Infantry Tercio Unlock",
    "3bba-e8bb-7463-b0b2": "Scout Tercio Unlock",
    "deba-d402-8204-1d13": "Iron Tercio Unlock",
}

# Cohort Doctrine category IDs
COHORT_DOCTRINES = {
    "f2be-abfe-311c-afe2": "Solar Pattern Cohort",
    "1241-4ccd-80b8-8ff2": "Ultima Pattern Cohort",
    "7f98-e8eb-f86e-180d": "Reconnaissance Pattern Cohort",
    "1d7a-eb2d-5d0f-0fa4": "Mechanised Pattern Cohort",
    "c9ef-b204-e951-6b7e": "Siege Pattern Cohort",
    "28ba-8660-5266-8674": "Iron Pattern Cohort",
}


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
        """
        Check if a detachment is relevant to Solar Auxilia.

        Uses multiple signals:
        1. Primary detachments are always included
        2. SA-specific keywords in the name
        3. SA catalogue ID in condition checks (unhide modifiers)
        4. SA comments in XML
        """
        # Always include the Primary Detachment
        if 'Primary' in force_name:
            return True

        # Check for SA-specific keywords
        for kw in SA_DETACHMENT_KEYWORDS:
            if kw in force_name:
                return True

        # Check if this detachment has an SA unhide modifier
        # (modifier type="set" field="hidden" with SA catalogue condition)
        conditions = self.parser._xpath(force_element, './/condition')
        for cond in conditions:
            if cond.get('childId') == SA_CATALOGUE_ID:
                return True

        # Check for SA comments
        comments = self.parser._xpath(force_element, './/comment')
        for comment in comments:
            if comment.text and 'Solar Auxilia' in comment.text:
                return True

        # Check generic keywords — but only if the detachment has an unhide
        # modifier (hidden="true" detachments with no SA condition are excluded)
        is_hidden = force_element.get('hidden') == 'true'
        if not is_hidden:
            for kw in GENERIC_DETACHMENT_KEYWORDS:
                if kw in force_name:
                    return True

        return False

    def _parse_costs(self, force_element) -> Dict[str, int]:
        """Extract budget costs from forceEntry <costs> elements."""
        costs = {}
        cost_elements = self.parser._xpath(force_element, './costs/cost')
        for c in cost_elements:
            type_id = c.get('typeId')
            value = int(float(c.get('value', 0)))
            if type_id == COST_TYPE_AUXILIARY:
                costs['auxiliary'] = value
            elif type_id == COST_TYPE_APEX:
                costs['apex'] = value
        return costs

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
        costs = self._parse_costs(force_element)
        modifiers = self._parse_modifiers(force_element)
        constraint_id_map = self._parse_constraint_id_map(force_element)

        return {
            'bs_id': force_id,
            'name': name,
            'detachment_type': detachment_type,
            'parent_id': parent_id,
            'constraints': json.dumps(constraints),
            'unit_restrictions': json.dumps(unit_restrictions) if unit_restrictions else None,
            'faction': faction,
            'costs': json.dumps(costs) if costs else None,
            'modifiers': json.dumps({
                'rules': modifiers,
                'constraint_id_map': constraint_id_map,
            }) if modifiers else None,
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
            costs = self._parse_costs(fe)
            modifiers = self._parse_modifiers(fe)
            constraint_id_map = self._parse_constraint_id_map(fe)

            detachments.append({
                'bs_id': force_id,
                'name': name,
                'detachment_type': self._classify_detachment_type(name),
                'parent_id': None,
                'constraints': json.dumps(constraints),
                'unit_restrictions': json.dumps(unit_restrictions) if unit_restrictions else None,
                'faction': None,
                'costs': json.dumps(costs) if costs else None,
                'modifiers': json.dumps({
                    'rules': modifiers,
                    'constraint_id_map': constraint_id_map,
                }) if modifiers else None,
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

    def _is_faction_gated_to_non_sa(self, element) -> bool:
        """Check if element has modifiers conditioned on a specific non-SA primary catalogue.

        BSData uses instanceOf conditions on primary-catalogue to gate slots to specific
        factions (e.g., Blackshields). If any such condition references a catalogue that
        isn't Solar Auxilia, this slot shouldn't appear for SA rosters.
        """
        modifiers = self.parser._xpath(element, './modifiers/modifier')
        for mod in modifiers:
            conditions = self.parser._xpath(mod, './/condition')
            for cond in conditions:
                if (cond.get('type') == 'instanceOf'
                        and cond.get('scope') == 'primary-catalogue'
                        and cond.get('childId')
                        and cond.get('childId') != SA_CATALOGUE_ID):
                    return True
        return False

    def _parse_category_slots(self, force_element) -> tuple:
        """
        Parse categoryLinks to extract slot constraints and unit restrictions.

        Returns:
            (constraints_dict, unit_restrictions_dict)
            constraints: {slot_key: {min, max}}
            unit_restrictions: {slot_key: "restriction text"} or empty dict

        Slot keys:
            - Unrestricted slots use base name: "Command"
            - Restricted variants use full raw name: "Command - Centurions Only"
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

            # Skip slot names that are clearly non-SA (EotL per-legion, Mechanicum, etc.)
            if any(raw_name.startswith(prefix) for prefix in NON_SA_SLOT_PREFIXES):
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

            # Use the full raw name as key for restricted variants to avoid
            # collisions (e.g., "Command" max=3 vs "Command - Centurions Only" max=7)
            slot_key = raw_name.strip() if restriction else slot_name
            # Normalize "War Engine" in the full key too
            if slot_name == 'War-engine' and restriction:
                slot_key = f"War-engine - {restriction}"

            constraints[slot_key] = {'min': min_val, 'max': max_val}

            if restriction:
                unit_restrictions[slot_key] = restriction

        return constraints, unit_restrictions

    def _parse_constraint_id_map(self, force_element) -> Dict[str, str]:
        """
        Build a mapping of constraint IDs to slot keys.

        Modifiers reference constraint IDs (e.g., "0cdf-ec44-4886-b292") to modify
        slot max values. We need this map to know which slot a modifier targets.

        Also includes the forceEntry's own direct constraints (which have max=0
        base values that get incremented by modifiers).
        """
        id_map = {}

        # Map categoryLink constraint IDs to their slot keys
        category_links = self.parser._xpath(force_element, './categoryLinks/categoryLink')
        for cat_link in category_links:
            raw_name = cat_link.get('name', '')
            if any(raw_name.startswith(prefix) for prefix in SKIP_CATEGORY_PREFIXES):
                continue
            if cat_link.get('hidden') == 'true':
                continue

            slot_name, restriction = self._parse_slot_name(raw_name)
            slot_key = raw_name.strip() if restriction else slot_name
            if slot_name == 'War-engine' and restriction:
                slot_key = f"War-engine - {restriction}"

            link_constraints = self.parser._xpath(cat_link, './constraints/constraint')
            for c in link_constraints:
                c_id = c.get('id')
                if c_id:
                    id_map[c_id] = slot_key

        # Map forceEntry-level constraint IDs (these are the "max instances" constraints
        # for the detachment itself — used for Tercio slot scaling)
        force_constraints = self.parser._xpath(force_element, './constraints/constraint')
        for c in force_constraints:
            c_id = c.get('id')
            c_field = c.get('field', '')
            if c_id and c_field == 'forces':
                id_map[c_id] = '__detachment_instances__'

        return id_map

    def _parse_modifiers(self, force_element) -> List[Dict[str, Any]]:
        """
        Parse <modifier> elements from a forceEntry.

        Extracts modifier rules that adjust slot constraints and costs
        based on Tercio Unlock counts and Doctrine selections.

        Returns:
            List of modifier dicts, each with:
                - type: "increment" | "set"
                - field: target field ID (constraint ID or cost type ID)
                - value: numeric value
                - conditions: list of condition dicts
                - repeats: list of repeat dicts (for scaling)
        """
        modifiers = []
        modifier_elements = self.parser._xpath(force_element, './modifiers/modifier')

        for mod in modifier_elements:
            mod_type = mod.get('type')
            mod_field = mod.get('field', '')
            mod_value_str = mod.get('value', '0')

            # Skip hidden-toggling modifiers (type="set", field="hidden")
            if mod_field == 'hidden':
                continue

            try:
                mod_value = float(mod_value_str)
            except ValueError:
                continue

            # Parse conditions
            conditions = []
            cond_elements = self.parser._xpath(mod, './conditions/condition')
            for cond in cond_elements:
                conditions.append({
                    'type': cond.get('type'),
                    'value': float(cond.get('value', 0)),
                    'field': cond.get('field', ''),
                    'scope': cond.get('scope', ''),
                    'childId': cond.get('childId', ''),
                })

            # Parse condition groups
            cond_group_elements = self.parser._xpath(mod, './conditionGroups/conditionGroup')
            for cg in cond_group_elements:
                group_conds = []
                for cond in self.parser._xpath(cg, './conditions/condition'):
                    group_conds.append({
                        'type': cond.get('type'),
                        'value': float(cond.get('value', 0)),
                        'field': cond.get('field', ''),
                        'scope': cond.get('scope', ''),
                        'childId': cond.get('childId', ''),
                    })
                if group_conds:
                    conditions.extend(group_conds)

            # Parse repeats
            repeats = []
            repeat_elements = self.parser._xpath(mod, './repeats/repeat')
            for rep in repeat_elements:
                repeats.append({
                    'value': float(rep.get('value', 1)),
                    'repeats': float(rep.get('repeats', 1)),
                    'field': rep.get('field', ''),
                    'scope': rep.get('scope', ''),
                    'childId': rep.get('childId', ''),
                })

            # Only keep modifiers we can actually evaluate:
            # - Conditions reference known tercio/doctrine IDs
            # - Or repeats reference known tercio IDs
            relevant = False
            all_ids = set(TERCIO_UNLOCK_IDS.keys()) | set(COHORT_DOCTRINES.keys())
            for c in conditions:
                if c['childId'] in all_ids:
                    relevant = True
                    break
            for r in repeats:
                if r['childId'] in all_ids:
                    relevant = True
                    break
            # Also include cost modifiers (field is a cost type ID)
            if mod_field in (COST_TYPE_AUXILIARY, COST_TYPE_APEX):
                relevant = True

            if relevant:
                modifiers.append({
                    'type': mod_type,
                    'field': mod_field,
                    'value': mod_value,
                    'conditions': conditions,
                    'repeats': repeats,
                })

        return modifiers

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
            slot_name = slot_name.strip()
        else:
            slot_name = raw_name.strip()
            restriction = None

        # Normalize "War Engine" (no hyphen) -> "War-engine" (with hyphen)
        # BSData uses both forms inconsistently
        if slot_name.lower() == 'war engine':
            slot_name = 'War-engine'

        return slot_name, restriction.strip() if restriction else None

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

    def load_composition_rules(self) -> Dict[str, Any]:
        """
        Extract composition rules from the root Crusade FOC.

        Returns static budget rules used by CompositionValidator:
        - Budget categories and their effects
        - Budget decrements (Special Assignment, Crux Magisterium)
        - Primary min/max
        - Warlord points threshold
        """
        return {
            "budget_increments": {
                cat_id: info for cat_id, info in BUDGET_CATEGORIES.items()
            },
            "budget_decrements": {
                cat_id: info for cat_id, info in BUDGET_DECREMENTS.items()
            },
            "primary": {"min": 1, "max": 1},
            "warlord_points_threshold": 3000,
        }
