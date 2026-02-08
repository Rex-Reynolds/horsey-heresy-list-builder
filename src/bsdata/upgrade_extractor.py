"""Extract weapons and upgrades from BSData catalogues."""
import json
import logging
from typing import Dict, List, Any, Optional

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
        weapon_profile = None
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
            'applicable_units': json.dumps([]),  # Will be populated via UnitUpgrade relationships
            'upgrade_type': upgrade_type,
            'upgrade_group': None,
            'constraints': None,
        }

    def extract_unit_upgrades(self, unit_entry_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract available upgrades for a unit from its entry_links and selection_entry_groups.

        Args:
            unit_entry_data: Parsed unit entry with entry_links and selection_entry_groups

        Returns:
            List of upgrade relationship dicts for UnitUpgrade table
        """
        unit_upgrades = []

        # Process entry_links - direct weapon/wargear references
        entry_links = unit_entry_data.get('entry_links', [])
        for link in entry_links:
            if link.get('hidden'):
                continue

            upgrade_data = self._process_entry_link(link)
            if upgrade_data:
                unit_upgrades.append(upgrade_data)

        # Process selection_entry_groups - option groups
        selection_groups = unit_entry_data.get('selection_entry_groups', [])
        for group in selection_groups:
            if group.get('hidden'):
                continue

            group_upgrades = self._process_selection_group(group)
            unit_upgrades.extend(group_upgrades)

        return unit_upgrades

    def _process_entry_link(self, link: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process an entryLink to extract upgrade reference.

        Args:
            link: Entry link dict from parser

        Returns:
            Upgrade relationship dict, or None if not an upgrade
        """
        target_id = link.get('target_id')
        if not target_id:
            return None

        # Look up the target in cache
        entry = self.cache.get_entry_by_id(target_id)
        if not entry:
            logger.debug(f"Entry link target not found in cache: {target_id}")
            return None

        # Skip if it's not a weapon or upgrade type
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
        """
        Process a selectionEntryGroup to extract upgrade options.

        Args:
            group: Selection entry group dict from parser

        Returns:
            List of upgrade relationship dicts
        """
        upgrades = []
        group_name = group.get('name')

        # Parse constraints for min/max
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

        # Process entry links within the group
        group_links = group.get('entry_links', [])
        for link in group_links:
            if link.get('hidden'):
                continue

            target_id = link.get('target_id')
            if not target_id:
                continue

            # Look up in cache
            entry = self.cache.get_entry_by_id(target_id)
            if not entry:
                logger.debug(f"Group entry link target not found: {target_id}")
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
        """
        Get upgrade database ID by BattleScribe ID.

        Args:
            upgrade_id: BattleScribe entry ID

        Returns:
            Upgrade name for lookup, or None
        """
        entry = self.cache.get_entry_by_id(upgrade_id)
        return entry.get('name') if entry else None
