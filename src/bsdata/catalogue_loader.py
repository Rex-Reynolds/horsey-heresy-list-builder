"""Load and process Solar Auxilia catalogue data."""
import json
import logging
from pathlib import Path
from typing import Optional

from src.bsdata.parser import BattleScribeParser
from src.bsdata.repository import get_catalogue_path
from src.bsdata.category_mapping import normalize_category
from src.models import Unit, Weapon, Upgrade, db

logger = logging.getLogger(__name__)


class SolarAuxiliaCatalogue:
    """Load and manage Solar Auxilia catalogue data."""

    def __init__(self, catalogue_path: Optional[Path] = None):
        """
        Initialize catalogue loader.

        Args:
            catalogue_path: Path to Solar Auxilia.cat, or None to auto-find
        """
        if catalogue_path is None:
            catalogue_path = get_catalogue_path("Solar Auxilia")

        if catalogue_path is None:
            raise FileNotFoundError("Solar Auxilia catalogue not found")

        self.parser = BattleScribeParser(catalogue_path)
        self.catalogue_info = self.parser.get_catalogue_info()

        # Build category mapping from entryLinks
        self.category_map = self._build_category_map()

        logger.info(f"Loaded Solar Auxilia catalogue (revision {self.catalogue_info['revision']})")

    def _build_category_map(self) -> dict[str, str]:
        """
        Build mapping of unit ID -> category from root-level entryLinks.

        Returns:
            Dict mapping target IDs to category names
        """
        category_map = {}

        # Use explicit namespace query
        if self.parser.ns:
            ns = self.parser.ns
            entry_links = self.parser.root.xpath(
                './bs:entryLinks/bs:entryLink',
                namespaces=ns
            )

            for link in entry_links:
                target_id = link.get('targetId')

                # Get primary category
                cat_links = link.xpath(
                    './bs:categoryLinks/bs:categoryLink[@primary="true"]',
                    namespaces=ns
                )
                if cat_links:
                    category_name = cat_links[0].get('name')
                    category_map[target_id] = category_name
        else:
            entry_links = self.parser.root.xpath('./entryLinks/entryLink')

            for link in entry_links:
                target_id = link.get('targetId')
                cat_links = link.xpath('./categoryLinks/categoryLink[@primary="true"]')
                if cat_links:
                    category_name = cat_links[0].get('name')
                    category_map[target_id] = category_name

        logger.debug(f"Built category map with {len(category_map)} entries")
        return category_map

    def load_all_units(self) -> list[dict]:
        """
        Load all units from the catalogue.

        Returns:
            List of unit dicts with full details
        """
        logger.info("Loading all units from catalogue...")

        units = []
        unit_entries = self.parser.get_all_selection_entries(entry_type='unit')

        for entry_element in unit_entries:
            unit_data = self.parser.parse_selection_entry(entry_element)

            # Skip hidden units
            if unit_data['hidden']:
                continue

            # Get category from our mapping and normalize to FOC
            unit_id = unit_data['id']
            bsdata_category = self.category_map.get(unit_id, "Uncategorized")
            primary_category = normalize_category(bsdata_category)

            # Get base cost
            base_cost = unit_data['costs'].get('Point(s)', 0) or unit_data['costs'].get('Points', 0)

            units.append({
                'bs_id': unit_data['id'],
                'name': unit_data['name'],
                'unit_type': primary_category,
                'base_cost': int(base_cost),
                'profiles': unit_data['profiles'],
                'rules': unit_data['rules'],
                'constraints': unit_data['constraints'],
                'entry_links': unit_data['entry_links'],
                'selection_entry_groups': unit_data['selection_entry_groups'],
            })

        logger.info(f"Loaded {len(units)} units")
        return units

    def _get_primary_category(self, category_links: list[dict]) -> str:
        """
        Get primary FOC category from category links.

        Args:
            category_links: List of category link dicts

        Returns:
            Primary category name (HQ, Troops, etc.)
        """
        # Look for primary category
        for cat in category_links:
            if cat.get('primary'):
                return cat['name']

        # Fallback to first category
        if category_links:
            return category_links[0]['name']

        return "Uncategorized"

    def populate_database(self):
        """Load catalogue data into database."""
        logger.info("Populating database with catalogue data...")

        units = self.load_all_units()

        with db.atomic():
            # Clear existing catalogue data
            Unit.delete().execute()
            logger.info("Cleared existing unit data")

            # Insert units
            for unit_data in units:
                Unit.create(
                    bs_id=unit_data['bs_id'],
                    name=unit_data['name'],
                    unit_type=unit_data['unit_type'],
                    base_cost=unit_data['base_cost'],
                    profiles=json.dumps(unit_data['profiles']),
                    rules=json.dumps(unit_data['rules']),
                    constraints=json.dumps(unit_data['constraints']),
                )

            logger.info(f"✓ Inserted {len(units)} units into database")

    def get_unit_by_name(self, name: str) -> Optional[dict]:
        """
        Get unit details by name.

        Args:
            name: Unit name to search for

        Returns:
            Unit dict with full details, or None if not found
        """
        entry = self.parser.find_entry_by_name(name)

        if entry:
            # Use category map and normalize to FOC
            unit_id = entry['id']
            bsdata_category = self.category_map.get(unit_id, "Uncategorized")
            primary_category = normalize_category(bsdata_category)
            base_cost = entry['costs'].get('Point(s)', 0) or entry['costs'].get('Points', 0)

            return {
                'bs_id': entry['id'],
                'name': entry['name'],
                'unit_type': primary_category,
                'base_cost': int(base_cost),
                'profiles': entry['profiles'],
                'rules': entry['rules'],
                'constraints': entry['constraints'],
            }

        return None

    def get_all_unit_names(self) -> list[str]:
        """Get list of all available unit names."""
        units = self.load_all_units()
        return sorted([u['name'] for u in units])

    def search_units(self, query: str) -> list[str]:
        """
        Search for units by partial name match.

        Args:
            query: Search query

        Returns:
            List of matching unit names
        """
        all_names = self.get_all_unit_names()
        query_lower = query.lower()

        matches = [
            name for name in all_names
            if query_lower in name.lower()
        ]

        return matches

    def get_unit_stats(self, unit_name: str) -> Optional[dict]:
        """
        Get unit profile stats.

        Args:
            unit_name: Name of unit

        Returns:
            Dict of characteristics, or None if not found
        """
        unit = self.get_unit_by_name(unit_name)

        if unit and unit['profiles']:
            # Return first profile's characteristics
            first_profile = unit['profiles'][0]
            return first_profile.get('characteristics', {})

        return None

    def get_category_units(self, category: str) -> list[str]:
        """
        Get all units in a specific category.

        Args:
            category: Category name (HQ, Troops, etc.)

        Returns:
            List of unit names in that category
        """
        units = self.load_all_units()
        category_units = [
            u['name'] for u in units
            if u['unit_type'] == category
        ]

        return sorted(category_units)
