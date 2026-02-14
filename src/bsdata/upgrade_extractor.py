"""Extract weapons and upgrades from BSData catalogues."""
import json
import logging
from typing import Dict, List, Any, Optional

from lxml import etree

from src.bsdata.parser import BattleScribeParser
from src.bsdata.catalogue_cache import CatalogueCache

logger = logging.getLogger(__name__)


class UpgradeExtractor:
    """Extract weapons and upgrades from shared catalogues and link to units."""

    def __init__(self, parser: BattleScribeParser, catalogue_cache: CatalogueCache):
        """
        Initialize upgrade extractor.

        Args:
            parser: BattleScribeParser instance for the main catalogue
            catalogue_cache: CatalogueCache with loaded shared catalogues
        """
        self.parser = parser
        self.cache = catalogue_cache

    def extract_weapons_from_shared(self) -> List[Dict[str, Any]]:
        """
        Extract all weapons from Weapons.cat.

        Returns:
            List of weapon dicts ready for database insertion
        """
        weapons = []

        # Get all cached weapons
        weapon_cache = self.cache.loaded_catalogues.get('Weapons', {})

        for entry_id, entry_data in weapon_cache.items():
            # Skip profiles (we want selection entries only)
            if entry_data.get('entry_type') == 'profile':
                continue

            try:
                weapon_dict = self._parse_weapon_entry(entry_data)
                if weapon_dict:
                    weapons.append(weapon_dict)
            except Exception as e:
                logger.warning(f"Failed to parse weapon '{entry_data.get('name')}': {e}")
                continue

        logger.info(f"Extracted {len(weapons)} weapons from Weapons.cat")
        return weapons

    def _parse_weapon_entry(self, entry_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse a weapon entry into database format.

        Args:
            entry_data: Parsed selection entry from cache

        Returns:
            Weapon dict for database insertion
        """
        # Skip hidden entries
        if entry_data.get('hidden'):
            return None

        name = entry_data.get('name')
        entry_id = entry_data.get('id')

        if not name or not entry_id:
            return None

        # Get weapon profile from profiles list
        profiles = entry_data.get('profiles', [])
        range_value = None
        strength = None
        ap = None
        weapon_type = None

        if profiles:
            # Use first profile (usually the main weapon profile)
            weapon_profile = profiles[0]
            characteristics = weapon_profile.get('characteristics', {})

            range_value = characteristics.get('Range', characteristics.get('range'))
            strength = characteristics.get('Strength', characteristics.get('S', characteristics.get('Str')))
            ap = characteristics.get('AP', characteristics.get('Ap'))
            weapon_type = characteristics.get('Type', characteristics.get('type'))

        # Get cost
        costs = entry_data.get('costs', {})
        cost = int(costs.get('Point(s)', 0) or costs.get('Points', 0))

        # Get special rules
        rules = entry_data.get('rules', [])
        special_rules = [rule.get('name') for rule in rules if rule.get('name')]

        return {
            'bs_id': entry_id,
            'name': name,
            'range_value': range_value,
            'strength': strength,
            'ap': ap,
            'weapon_type': weapon_type,
            'special_rules': json.dumps(special_rules) if special_rules else None,
            'profile': json.dumps(profiles) if profiles else None,
            'cost': cost,
        }

    def extract_upgrades_from_shared(self) -> List[Dict[str, Any]]:
        """
        Extract all wargear/upgrades from Wargear.cat.

        Returns:
            List of upgrade dicts ready for database insertion
        """
        upgrades = []

        # Get all cached wargear
        wargear_cache = self.cache.loaded_catalogues.get('Wargear', {})

        for entry_id, entry_data in wargear_cache.items():
            # Skip profiles
            if entry_data.get('entry_type') == 'profile':
                continue

            try:
                upgrade_dict = self._parse_upgrade_entry(entry_data)
                if upgrade_dict:
                    upgrades.append(upgrade_dict)
            except Exception as e:
                logger.warning(f"Failed to parse upgrade '{entry_data.get('name')}': {e}")
                continue

        logger.info(f"Extracted {len(upgrades)} upgrades from Wargear.cat")
        return upgrades

    def _parse_upgrade_entry(self, entry_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse an upgrade entry into database format.

        Args:
            entry_data: Parsed selection entry from cache

        Returns:
            Upgrade dict for database insertion
        """
        # Skip hidden entries
        if entry_data.get('hidden'):
            return None

        name = entry_data.get('name')
        entry_id = entry_data.get('id')

        if not name or not entry_id:
            return None

        # Get cost
        costs = entry_data.get('costs', {})
        cost = int(costs.get('Point(s)', 0) or costs.get('Points', 0))

        # Determine upgrade type from profiles
        profiles = entry_data.get('profiles', [])
        upgrade_type = 'Wargear'
        if profiles:
            profile_type = profiles[0].get('type', '')
            if 'Weapon' in profile_type:
                upgrade_type = 'Weapon'

        return {
            'bs_id': entry_id,
            'name': name,
            'cost': cost,
            'applicable_units': json.dumps([]),
            'upgrade_type': upgrade_type,
            'upgrade_group': None,
            'constraints': None,
        }

    # ======================================================================
    # New: Full upgrade extraction from raw XML elements
    # ======================================================================

    def extract_all_unit_upgrades(self, unit_element: etree.Element, context_prefix: str = "") -> List[Dict[str, Any]]:
        """
        Recursively extract ALL upgrades from a unit's XML element.

        Walks: unit → child models/units → their entry_links, groups, inline entries.

        Args:
            unit_element: Raw XML element for the unit
            context_prefix: Prefix for group_name (e.g., "Legate Marshall > ")

        Returns:
            List of upgrade relationship dicts for UnitUpgrade table.
            Each dict includes 'upgrade_id', 'upgrade_name', 'group_name',
            'is_inline' (True if not found in cache), 'inline_data' (dict if inline).
        """
        upgrades = []

        # A. Direct entry_links on this element
        upgrades.extend(self._extract_entry_links(unit_element, context_prefix))

        # B. Direct inline selectionEntries[@type="upgrade"] on this element
        upgrades.extend(self._extract_inline_upgrades(unit_element, context_prefix))

        # C. selectionEntryGroups (with both entry_links AND inline entries)
        upgrades.extend(self._extract_from_groups(unit_element, context_prefix))

        # D. Recurse into child models and child units
        child_entries = self.parser._xpath(unit_element, './selectionEntries/selectionEntry')
        for child in child_entries:
            child_type = child.get('type', '')
            child_name = child.get('name', '')

            if child_type in ('model', 'unit'):
                child_prefix = f"{context_prefix}{child_name} > " if child_name else context_prefix
                child_upgrades = self.extract_all_unit_upgrades(child, child_prefix)
                upgrades.extend(child_upgrades)

        return upgrades

    def _extract_entry_links(self, element: etree.Element, context_prefix: str) -> List[Dict[str, Any]]:
        """Extract upgrades from entryLink references on an element."""
        upgrades = []
        link_elements = self.parser._xpath(element, './entryLinks/entryLink')

        for link in link_elements:
            if link.get('hidden') == 'true':
                continue

            target_id = link.get('targetId')
            link_name = link.get('name')
            if not target_id:
                continue

            # Look up the target in cache
            entry = self.cache.get_entry_by_id(target_id)
            if not entry:
                logger.debug(f"Entry link target not found in cache: {target_id} ({link_name})")
                continue

            # Skip if it's not a weapon or upgrade type
            entry_type = entry.get('type', '')
            if entry_type not in ('upgrade', 'model'):
                continue

            upgrades.append({
                'upgrade_id': target_id,
                'upgrade_name': link_name or entry.get('name'),
                'group_name': f"{context_prefix}Equipment" if context_prefix else None,
                'is_inline': False,
                'inline_data': None,
                'min_quantity': 0,
                'max_quantity': 1,
            })

        return upgrades

    def _extract_inline_upgrades(self, element: etree.Element, context_prefix: str) -> List[Dict[str, Any]]:
        """Extract inline selectionEntry[@type='upgrade'] directly on an element."""
        upgrades = []
        inline_entries = self.parser._xpath(element, './selectionEntries/selectionEntry[@type="upgrade"]')

        for entry in inline_entries:
            if entry.get('hidden') == 'true':
                continue

            entry_id = entry.get('id')
            entry_name = entry.get('name')
            if not entry_id or not entry_name:
                continue

            # Check if this upgrade already exists in cache
            cached = self.cache.get_entry_by_id(entry_id)
            if cached:
                upgrades.append({
                    'upgrade_id': entry_id,
                    'upgrade_name': entry_name,
                    'group_name': f"{context_prefix}Equipment" if context_prefix else None,
                    'is_inline': False,
                    'inline_data': None,
                    'min_quantity': 0,
                    'max_quantity': 1,
                })
            else:
                # Inline upgrade not in shared cache — extract data from XML
                inline_data = self._parse_inline_upgrade_from_xml(entry)
                upgrades.append({
                    'upgrade_id': entry_id,
                    'upgrade_name': entry_name,
                    'group_name': f"{context_prefix}Equipment" if context_prefix else None,
                    'is_inline': True,
                    'inline_data': inline_data,
                    'min_quantity': 0,
                    'max_quantity': 1,
                })

        return upgrades

    def _extract_from_groups(self, element: etree.Element, context_prefix: str) -> List[Dict[str, Any]]:
        """Extract upgrades from selectionEntryGroups (entry_links + inline entries)."""
        upgrades = []
        group_elements = self.parser._xpath(element, './selectionEntryGroups/selectionEntryGroup')

        for group in group_elements:
            if group.get('hidden') == 'true':
                continue

            group_name = group.get('name', '')
            full_group_name = f"{context_prefix}{group_name}" if context_prefix else group_name

            # Parse group-level constraints
            min_qty, max_qty = self._parse_group_constraints(group)

            # A. Entry links within the group
            group_links = self.parser._xpath(group, './entryLinks/entryLink')
            for link in group_links:
                if link.get('hidden') == 'true':
                    continue

                target_id = link.get('targetId')
                link_name = link.get('name')
                if not target_id:
                    continue

                entry = self.cache.get_entry_by_id(target_id)
                if not entry:
                    logger.debug(f"Group entry link target not found: {target_id} ({link_name})")
                    continue

                upgrades.append({
                    'upgrade_id': target_id,
                    'upgrade_name': link_name or entry.get('name'),
                    'group_name': full_group_name,
                    'is_inline': False,
                    'inline_data': None,
                    'min_quantity': min_qty,
                    'max_quantity': max_qty,
                })

            # B. Inline selectionEntries within the group
            inline_entries = self.parser._xpath(group, './selectionEntries/selectionEntry')
            for entry in inline_entries:
                if entry.get('hidden') == 'true':
                    continue

                entry_id = entry.get('id')
                entry_name = entry.get('name')
                entry_type = entry.get('type', '')
                if not entry_id or not entry_name:
                    continue

                # Skip non-upgrade types (models handled by recursion)
                if entry_type not in ('upgrade', ''):
                    continue

                cached = self.cache.get_entry_by_id(entry_id)
                if cached:
                    upgrades.append({
                        'upgrade_id': entry_id,
                        'upgrade_name': entry_name,
                        'group_name': full_group_name,
                        'is_inline': False,
                        'inline_data': None,
                        'min_quantity': min_qty,
                        'max_quantity': max_qty,
                    })
                else:
                    inline_data = self._parse_inline_upgrade_from_xml(entry)
                    upgrades.append({
                        'upgrade_id': entry_id,
                        'upgrade_name': entry_name,
                        'group_name': full_group_name,
                        'is_inline': True,
                        'inline_data': inline_data,
                        'min_quantity': min_qty,
                        'max_quantity': max_qty,
                    })

            # C. Nested sub-groups (recurse)
            sub_groups = self.parser._xpath(group, './selectionEntryGroups/selectionEntryGroup')
            if sub_groups:
                for sub_group in sub_groups:
                    # Temporarily wrap as if it were a parent element with this sub-group
                    sub_upgrades = self._extract_from_single_group(sub_group, full_group_name + " > ")
                    upgrades.extend(sub_upgrades)

        return upgrades

    def _extract_from_single_group(self, group: etree.Element, context_prefix: str) -> List[Dict[str, Any]]:
        """Extract from a single group element (for nested sub-groups)."""
        upgrades = []
        if group.get('hidden') == 'true':
            return upgrades

        group_name = group.get('name', '')
        full_group_name = f"{context_prefix}{group_name}" if context_prefix else group_name
        min_qty, max_qty = self._parse_group_constraints(group)

        # Entry links
        group_links = self.parser._xpath(group, './entryLinks/entryLink')
        for link in group_links:
            if link.get('hidden') == 'true':
                continue
            target_id = link.get('targetId')
            link_name = link.get('name')
            if not target_id:
                continue
            entry = self.cache.get_entry_by_id(target_id)
            if not entry:
                continue
            upgrades.append({
                'upgrade_id': target_id,
                'upgrade_name': link_name or entry.get('name'),
                'group_name': full_group_name,
                'is_inline': False,
                'inline_data': None,
                'min_quantity': min_qty,
                'max_quantity': max_qty,
            })

        # Inline entries
        inline_entries = self.parser._xpath(group, './selectionEntries/selectionEntry')
        for entry in inline_entries:
            if entry.get('hidden') == 'true':
                continue
            entry_id = entry.get('id')
            entry_name = entry.get('name')
            if not entry_id or not entry_name:
                continue
            cached = self.cache.get_entry_by_id(entry_id)
            if cached:
                upgrades.append({
                    'upgrade_id': entry_id,
                    'upgrade_name': entry_name,
                    'group_name': full_group_name,
                    'is_inline': False,
                    'inline_data': None,
                    'min_quantity': min_qty,
                    'max_quantity': max_qty,
                })
            else:
                inline_data = self._parse_inline_upgrade_from_xml(entry)
                upgrades.append({
                    'upgrade_id': entry_id,
                    'upgrade_name': entry_name,
                    'group_name': full_group_name,
                    'is_inline': True,
                    'inline_data': inline_data,
                    'min_quantity': min_qty,
                    'max_quantity': max_qty,
                })

        # Recurse into sub-sub-groups
        sub_groups = self.parser._xpath(group, './selectionEntryGroups/selectionEntryGroup')
        for sg in sub_groups:
            upgrades.extend(self._extract_from_single_group(sg, full_group_name + " > "))

        return upgrades

    def _parse_group_constraints(self, group: etree.Element) -> tuple:
        """Parse min/max constraints from a group element. Returns (min_qty, max_qty)."""
        min_qty = 0
        max_qty = 1

        constraint_elements = self.parser._xpath(group, './constraints/constraint')
        for c in constraint_elements:
            c_type = c.get('type')
            c_field = c.get('field', '')
            value = int(float(c.get('value', 0)))

            if c_field == 'selections':
                if c_type == 'min':
                    min_qty = value
                elif c_type == 'max':
                    max_qty = value

        return min_qty, max_qty

    def _parse_inline_upgrade_from_xml(self, entry: etree.Element) -> Dict[str, Any]:
        """
        Parse an inline selectionEntry into upgrade data for DB insertion.

        Args:
            entry: XML selectionEntry element

        Returns:
            Dict with bs_id, name, cost, upgrade_type, profiles
        """
        costs = self.parser._parse_costs(entry)
        cost = int(costs.get('Point(s)', 0) or costs.get('Points', 0))

        profiles = self.parser._parse_profiles(entry)
        upgrade_type = 'Wargear'
        if profiles:
            profile_type = profiles[0].get('type', '')
            if 'Weapon' in profile_type:
                upgrade_type = 'Weapon'

        return {
            'bs_id': entry.get('id'),
            'name': entry.get('name'),
            'cost': cost,
            'upgrade_type': upgrade_type,
            'applicable_units': json.dumps([]),
            'upgrade_group': None,
            'constraints': None,
        }

    # ======================================================================
    # Legacy method (kept for backwards compatibility, but prefer extract_all_unit_upgrades)
    # ======================================================================

    def extract_unit_upgrades(self, unit_entry_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract available upgrades for a unit from its entry_links and selection_entry_groups.
        Legacy method — see extract_all_unit_upgrades() for full XML-based extraction.
        """
        unit_upgrades = []

        entry_links = unit_entry_data.get('entry_links', [])
        for link in entry_links:
            if link.get('hidden'):
                continue
            upgrade_data = self._process_entry_link(link)
            if upgrade_data:
                unit_upgrades.append(upgrade_data)

        selection_groups = unit_entry_data.get('selection_entry_groups', [])
        for group in selection_groups:
            if group.get('hidden'):
                continue
            group_upgrades = self._process_selection_group(group)
            unit_upgrades.extend(group_upgrades)

        return unit_upgrades

    def _process_entry_link(self, link: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process an entryLink to extract upgrade reference."""
        target_id = link.get('target_id')
        if not target_id:
            return None

        entry = self.cache.get_entry_by_id(target_id)
        if not entry:
            return None

        entry_type = entry.get('type', '')
        if entry_type not in ['upgrade', 'model']:
            return None

        return {
            'upgrade_id': target_id,
            'upgrade_name': link.get('name', entry.get('name')),
            'group_name': None,
            'constraints': {},
            'min_quantity': 0,
            'max_quantity': 1,
        }

    def _process_selection_group(self, group: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process a selectionEntryGroup to extract upgrade options."""
        upgrades = []
        group_name = group.get('name')

        constraints = group.get('constraints', [])
        min_qty = 0
        max_qty = 1

        for constraint in constraints:
            constraint_type = constraint.get('type')
            value = int(constraint.get('value', 0))
            if constraint_type == 'min':
                min_qty = value
            elif constraint_type == 'max':
                max_qty = value

        group_links = group.get('entry_links', [])
        for link in group_links:
            if link.get('hidden'):
                continue

            target_id = link.get('target_id')
            if not target_id:
                continue

            entry = self.cache.get_entry_by_id(target_id)
            if not entry:
                continue

            upgrades.append({
                'upgrade_id': target_id,
                'upgrade_name': link.get('name', entry.get('name')),
                'group_name': group_name,
                'constraints': {'group_constraints': constraints},
                'min_quantity': min_qty,
                'max_quantity': max_qty,
            })

        return upgrades

    def resolve_upgrade_by_id(self, upgrade_id: str) -> Optional[str]:
        """Get upgrade name by BattleScribe ID."""
        entry = self.cache.get_entry_by_id(upgrade_id)
        return entry.get('name') if entry else None
