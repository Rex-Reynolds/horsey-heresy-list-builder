"""Load and process Solar Auxilia catalogue data."""
import json
import logging
from pathlib import Path
from typing import Optional

from src.bsdata.parser import BattleScribeParser
from src.bsdata.repository import get_catalogue_path
from src.bsdata.category_mapping import normalize_category
from src.bsdata.catalogue_cache import CatalogueCache
from src.bsdata.upgrade_extractor import UpgradeExtractor
from src.bsdata.detachment_loader import DetachmentLoader
from src.models import Unit, Weapon, Upgrade, UnitUpgrade, Detachment, db
from src.config import BSDATA_DIR

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

        # Initialize catalogue cache and load shared catalogues
        self.cache = CatalogueCache(BSDATA_DIR)
        logger.info("Loading shared catalogues...")
        self.cache.load_shared_catalogue("Weapons")
        self.cache.load_shared_catalogue("Wargear")

        # Initialize upgrade extractor
        self.upgrade_extractor = UpgradeExtractor(self.parser, self.cache)

        logger.info(f"Loaded Solar Auxilia catalogue (revision {self.catalogue_info['revision']})")
        logger.info(f"Cache stats: {self.cache.get_cache_stats()}")

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
            List of unit dicts with full details. Each dict includes an '_element'
            key with the raw XML element for upgrade extraction.
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

            # Skip nested children (e.g. "Rapier Crew" inside "Rapier Section")
            # Only root-level units appear in the category map
            if unit_id not in self.category_map:
                continue

            bsdata_category = self.category_map[unit_id]
            primary_category = normalize_category(bsdata_category)

            # Get base cost (unit's own cost + mandatory children)
            base_cost = self.parser.compute_base_unit_cost(entry_element)

            units.append({
                'bs_id': unit_data['id'],
                'name': unit_data['name'],
                'unit_type': primary_category,
                'bsdata_category': bsdata_category,
                'base_cost': int(base_cost),
                'profiles': unit_data['profiles'],
                'rules': unit_data['rules'],
                'constraints': unit_data['constraints'],
                'entry_links': unit_data['entry_links'],
                'selection_entry_groups': unit_data['selection_entry_groups'],
                '_element': entry_element,  # Raw XML for upgrade extraction
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

        with db.atomic():
            # Clear existing catalogue data (in correct order for FK constraints)
            logger.info("Clearing existing catalogue data...")
            UnitUpgrade.delete().execute()
            Upgrade.delete().execute()
            Weapon.delete().execute()
            Unit.delete().execute()
            Detachment.delete().execute()
            logger.info("Cleared existing data")

            # Step 1: Populate weapons from Weapons.cat
            logger.info("Extracting weapons from Weapons.cat...")
            weapons = self.upgrade_extractor.extract_weapons_from_shared()
            if weapons:
                Weapon.insert_many(weapons).execute()
                logger.info(f"Inserted {len(weapons)} weapons into database")
            else:
                logger.warning("No weapons extracted")

            # Step 2: Populate upgrades from Wargear.cat
            logger.info("Extracting upgrades from Wargear.cat...")
            upgrades = self.upgrade_extractor.extract_upgrades_from_shared()
            if upgrades:
                Upgrade.insert_many(upgrades).execute()
                logger.info(f"Inserted {len(upgrades)} upgrades into database")
            else:
                logger.warning("No upgrades extracted")

            # Step 3: Populate units and link to upgrades using XML-based extraction
            logger.info("Loading units from Solar Auxilia.cat...")
            units = self.load_all_units()

            unit_upgrade_links = []
            inline_upgrade_count = 0

            for unit_data in units:
                # Create unit record
                unit = Unit.create(
                    bs_id=unit_data['bs_id'],
                    name=unit_data['name'],
                    unit_type=unit_data['unit_type'],
                    bsdata_category=unit_data['bsdata_category'],
                    base_cost=unit_data['base_cost'],
                    profiles=json.dumps(unit_data['profiles']),
                    rules=json.dumps(unit_data['rules']),
                    constraints=json.dumps(unit_data['constraints']),
                )

                # Extract upgrades from raw XML element (new comprehensive approach)
                try:
                    xml_element = unit_data['_element']
                    unit_upgrades = self.upgrade_extractor.extract_all_unit_upgrades(xml_element)

                    for uu in unit_upgrades:
                        upgrade_id = uu['upgrade_id']

                        if uu.get('is_inline') and uu.get('inline_data'):
                            # Create inline Upgrade record that doesn't exist in shared cache
                            inline_data = uu['inline_data']
                            upgrade = Upgrade.get_or_none(Upgrade.bs_id == upgrade_id)
                            if not upgrade:
                                upgrade = Upgrade.create(
                                    bs_id=inline_data['bs_id'],
                                    name=inline_data['name'],
                                    cost=inline_data['cost'],
                                    applicable_units=inline_data['applicable_units'],
                                    upgrade_type=inline_data['upgrade_type'],
                                    upgrade_group=inline_data.get('upgrade_group'),
                                    constraints=inline_data.get('constraints'),
                                )
                                inline_upgrade_count += 1
                        else:
                            # Look up in Weapon table first, then Upgrade table
                            upgrade = Upgrade.get_or_none(Upgrade.bs_id == upgrade_id)
                            if not upgrade:
                                weapon = Weapon.get_or_none(Weapon.bs_id == upgrade_id)
                                if weapon:
                                    # Create synthetic Upgrade for this weapon
                                    upgrade = Upgrade.create(
                                        bs_id=upgrade_id,
                                        name=uu['upgrade_name'],
                                        cost=weapon.cost,
                                        applicable_units=json.dumps([]),
                                        upgrade_type='Weapon',
                                    )

                        if upgrade:
                            unit_upgrade_links.append({
                                'unit': unit.id,
                                'upgrade': upgrade.id,
                                'min_quantity': uu.get('min_quantity', 0),
                                'max_quantity': uu.get('max_quantity', 1),
                                'group_name': uu.get('group_name'),
                                'constraints': None,
                            })
                        else:
                            logger.debug(f"Upgrade not found for ID {upgrade_id}: {uu['upgrade_name']}")

                except Exception as e:
                    logger.warning(f"Failed to extract upgrades for unit '{unit_data['name']}': {e}")

            logger.info(f"Inserted {len(units)} units into database")
            if inline_upgrade_count:
                logger.info(f"Created {inline_upgrade_count} inline upgrade records")

            # Step 4: Deduplicate and bulk insert unit-upgrade relationships
            if unit_upgrade_links:
                seen = set()
                unique_links = []
                for link in unit_upgrade_links:
                    key = (link['unit'], link['upgrade'])
                    if key not in seen:
                        seen.add(key)
                        unique_links.append(link)

                logger.info(f"Deduplicating: {len(unit_upgrade_links)} -> {len(unique_links)} unique relationships")

                UnitUpgrade.insert_many(unique_links).execute()
                logger.info(f"Created {len(unique_links)} unit-upgrade relationships")
            else:
                logger.warning("No unit-upgrade relationships created")

            # Step 5: Populate detachments
            logger.info("Loading detachments from .gst file...")
            try:
                gst_path = BSDATA_DIR / "Horus Heresy 3rd Edition.gst"
                det_loader = DetachmentLoader(gst_path)
                detachments = det_loader.load_all_detachments()
                if detachments:
                    Detachment.insert_many(detachments).execute()
                    logger.info(f"Inserted {len(detachments)} detachments into database")
                else:
                    logger.warning("No detachments extracted")
            except Exception as e:
                logger.warning(f"Failed to load detachments: {e}")

        logger.info("Database population complete!")

    def get_unit_by_name(self, name: str) -> Optional[dict]:
        """
        Get unit details by name.

        Args:
            name: Unit name to search for

        Returns:
            Unit dict with full details, or None if not found
        """
        # Look up raw XML element for cost computation
        elements = self.parser._xpath(self.parser.root, f'.//selectionEntry[@name="{name}"]')
        if not elements:
            return None

        element = elements[0]
        entry = self.parser.parse_selection_entry(element)

        # Use category map and normalize to FOC
        unit_id = entry['id']
        bsdata_category = self.category_map.get(unit_id, "Uncategorized")
        primary_category = normalize_category(bsdata_category)
        base_cost = self.parser.compute_base_unit_cost(element)

        return {
            'bs_id': entry['id'],
            'name': entry['name'],
            'unit_type': primary_category,
            'bsdata_category': bsdata_category,
            'base_cost': base_cost,
            'profiles': entry['profiles'],
            'rules': entry['rules'],
            'constraints': entry['constraints'],
        }

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
