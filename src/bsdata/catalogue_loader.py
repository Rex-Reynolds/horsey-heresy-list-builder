"""Load and process Solar Auxilia catalogue data."""
import json
import logging
from pathlib import Path
from typing import Optional

from src.bsdata.parser import BattleScribeParser
from src.bsdata.repository import get_catalogue_path
from src.bsdata.category_mapping import SKIP_CATEGORIES
from src.bsdata.catalogue_cache import CatalogueCache
from src.bsdata.upgrade_extractor import UpgradeExtractor
from src.bsdata.detachment_loader import DetachmentLoader, BUDGET_CATEGORIES, TERCIO_UNLOCK_IDS
from src.models import Unit, Weapon, Upgrade, UnitUpgrade, Detachment, db
from src.config import BSDATA_DIR

logger = logging.getLogger(__name__)

# Solar Auxilia Legacy/Expanded units from "Legacies of the Age of Darkness" PDF v1.1
LEGACY_UNIT_NAMES = frozenset([
    'Surgeon-Primus Aevos Jovan',
    'Expeditionary Navigator',
    'Davinite Lodge Priest',
    'Companion Section',
    'Medicae Section',
    'Cyclops Demolition Vehicle',
    'Aurox Transport',
    'Tarantula Section',
    'Carnodon Strike Tank',
    'Avenger Strike Fighter',
    'Destroyer Tank Hunter',
    'Thunderer Siege Tank',
    'Minotaur Artillery Tank',
    'Macharius Heavy Tank',
    'Praetor Armoured Assault Launcher',
    'Crassus Armoured Assault Transport',
    'Baneblade Super-heavy Battle Tank',
    'Hellhammer Super-heavy Battle Tank',
    'Banehammer Super-heavy Assault Tank',
    'Stormlord Super-heavy Assault Tank',
    'Stormblade Super-heavy Tank',
    'Shadowsword Super-heavy Tank Destroyer',
    'Stormsword Super-heavy Siege Tank',
    'Marauder Bomber',
    'Marauder Destroyer',
])


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
        self.cache.load_shared_catalogue("Solar Auxilia")

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

    def _build_budget_category_map(self) -> dict[str, list[str]]:
        """
        Build mapping of unit ID -> budget-relevant category IDs from entryLinks.

        Budget categories like "+1 Apex from High Command" or "Officer of the Line (2)"
        are non-primary categoryLinks on the root entryLink elements.
        """
        budget_map: dict[str, list[str]] = {}
        budget_ids = set(BUDGET_CATEGORIES.keys())

        if self.parser.ns:
            ns = self.parser.ns
            entry_links = self.parser.root.xpath(
                './bs:entryLinks/bs:entryLink', namespaces=ns
            )
            for link in entry_links:
                target_id = link.get('targetId')
                cat_links = link.xpath(
                    './bs:categoryLinks/bs:categoryLink', namespaces=ns
                )
                cats = []
                for cl in cat_links:
                    cat_target = cl.get('targetId')
                    if cat_target in budget_ids:
                        cats.append(cat_target)
                if cats:
                    budget_map[target_id] = cats
        else:
            entry_links = self.parser.root.xpath('./entryLinks/entryLink')
            for link in entry_links:
                target_id = link.get('targetId')
                cat_links = link.xpath('./categoryLinks/categoryLink')
                cats = []
                for cl in cat_links:
                    cat_target = cl.get('targetId')
                    if cat_target in budget_ids:
                        cats.append(cat_target)
                if cats:
                    budget_map[target_id] = cats

        logger.debug(f"Built budget category map: {len(budget_map)} units with budget categories")
        return budget_map

    def _build_tercio_category_map(self) -> dict[str, list[str]]:
        """
        Build mapping of unit ID -> tercio unlock category IDs.

        Tercio Unlock categories are on the sharedSelectionEntries (the actual
        unit definitions), not on the root entryLinks. We map entryLink targetId
        -> shared entry's categoryLinks that match Tercio Unlock IDs.
        """
        tercio_map: dict[str, list[str]] = {}
        tercio_ids = set(TERCIO_UNLOCK_IDS.keys())

        # Build a map of shared entry ID -> tercio categories
        shared_tercio: dict[str, list[str]] = {}
        if self.parser.ns:
            ns = self.parser.ns
            shared_entries = self.parser.root.xpath(
                './/bs:sharedSelectionEntries/bs:selectionEntry', namespaces=ns
            )
            for entry in shared_entries:
                entry_id = entry.get('id')
                cat_links = entry.xpath(
                    './bs:categoryLinks/bs:categoryLink', namespaces=ns
                )
                cats = [cl.get('targetId') for cl in cat_links if cl.get('targetId') in tercio_ids]
                if cats:
                    shared_tercio[entry_id] = cats
        else:
            shared_entries = self.parser.root.xpath(
                './/sharedSelectionEntries/selectionEntry'
            )
            for entry in shared_entries:
                entry_id = entry.get('id')
                cat_links = entry.xpath('./categoryLinks/categoryLink')
                cats = [cl.get('targetId') for cl in cat_links if cl.get('targetId') in tercio_ids]
                if cats:
                    shared_tercio[entry_id] = cats

        # Map root entryLink targetIds to their shared entry tercio categories
        if self.parser.ns:
            ns = self.parser.ns
            entry_links = self.parser.root.xpath(
                './bs:entryLinks/bs:entryLink', namespaces=ns
            )
        else:
            entry_links = self.parser.root.xpath('./entryLinks/entryLink')

        for link in entry_links:
            target_id = link.get('targetId')
            if target_id in shared_tercio:
                tercio_map[target_id] = shared_tercio[target_id]

        logger.debug(f"Built tercio category map: {len(tercio_map)} units with tercio categories")
        return tercio_map

    def _extract_model_bounds(self, unit_element) -> tuple[int, int | None]:
        """
        Extract model count bounds from child selectionEntry[@type="model"] elements.

        Sums min/max constraints across all model children. Returns (model_min, model_max).
        model_max=None means no upper bound (single-model units without children).
        """
        model_children = self.parser._xpath(
            unit_element, './selectionEntries/selectionEntry[@type="model"]'
        )
        if not model_children:
            return 1, None

        total_min = 0
        total_max = 0
        for child in model_children:
            constraints = self.parser._parse_constraints(child)
            child_min = 0
            child_max = None
            for c in constraints:
                if c['field'] == 'selections' and c['scope'] == 'parent':
                    if c['type'] == 'min':
                        child_min = int(c['value'])
                    elif c['type'] == 'max':
                        child_max = int(c['value'])
            total_min += child_min
            if child_max is not None:
                total_max += child_max
            else:
                # No max constraint on this child — treat unit as unbounded
                return total_min or 1, None

        return max(total_min, 1), total_max or None

    def load_all_units(self) -> list[dict]:
        """
        Load all units from the catalogue.

        Returns:
            List of unit dicts with full details. Each dict includes an '_element'
            key with the raw XML element for upgrade extraction.
        """
        logger.info("Loading all units from catalogue...")

        budget_map = self._build_budget_category_map()
        tercio_map = self._build_tercio_category_map()
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

            # Skip non-unit categories
            if bsdata_category in SKIP_CATEGORIES:
                continue

            # Get base cost (unit's own cost + mandatory children)
            base_cost = self.parser.compute_base_unit_cost(entry_element)

            # Extract model count bounds from child model entries
            model_min, model_max = self._extract_model_bounds(entry_element)

            units.append({
                'bs_id': unit_data['id'],
                'name': unit_data['name'],
                'unit_type': bsdata_category,  # Native HH3 slot name
                'bsdata_category': bsdata_category,
                'base_cost': int(base_cost),
                'profiles': unit_data['profiles'],
                'rules': unit_data['rules'],
                'constraints': unit_data['constraints'],
                'entry_links': unit_data['entry_links'],
                'selection_entry_groups': unit_data['selection_entry_groups'],
                'budget_categories': budget_map.get(unit_id),
                'tercio_categories': tercio_map.get(unit_id),
                'model_min': model_min,
                'model_max': model_max,
                '_element': entry_element,  # Raw XML for upgrade extraction
            })

        logger.info(f"Loaded {len(units)} units")
        return units

    def _extract_sa_shared_upgrades(self) -> list[dict]:
        """
        Extract upgrades from Solar Auxilia.cat's sharedSelectionEntries.

        These are SA-specific upgrades (Charonite Claws, hull weapons, etc.)
        that are in the cache but not yet in the Upgrade table.
        """
        sa_cache = self.cache.loaded_catalogues.get('Solar Auxilia', {})
        upgrades = []
        # Track IDs already in Weapon or Upgrade tables (from Weapons.cat / Wargear.cat)
        existing_weapon_ids = {w.bs_id for w in Weapon.select(Weapon.bs_id)}
        existing_upgrade_ids = {u.bs_id for u in Upgrade.select(Upgrade.bs_id)}
        skip_ids = existing_weapon_ids | existing_upgrade_ids

        for entry_id, entry_data in sa_cache.items():
            if entry_data.get('entry_type') == 'profile':
                continue
            if entry_data.get('hidden'):
                continue
            if entry_id in skip_ids:
                continue

            name = entry_data.get('name')
            if not name:
                continue

            # Determine cost
            costs = entry_data.get('costs', {})
            cost = int(costs.get('Point(s)', 0) or costs.get('Points', 0))

            # Determine type from profiles
            profiles = entry_data.get('profiles', [])
            upgrade_type = 'Wargear'
            if profiles:
                profile_type = profiles[0].get('type', '')
                if 'Weapon' in profile_type:
                    upgrade_type = 'Weapon'

            upgrades.append({
                'bs_id': entry_id,
                'name': name,
                'cost': cost,
                'applicable_units': json.dumps([]),
                'upgrade_type': upgrade_type,
                'upgrade_group': None,
                'constraints': None,
            })

        logger.info(f"Found {len(upgrades)} SA-specific shared upgrades")
        return upgrades

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

            # Step 2b: Populate SA-inline shared upgrades from Solar Auxilia.cat cache
            sa_upgrades = self._extract_sa_shared_upgrades()
            if sa_upgrades:
                Upgrade.insert_many(sa_upgrades).execute()
                logger.info(f"Inserted {len(sa_upgrades)} SA-specific upgrades into database")

            # Step 3: Populate units and link to upgrades using XML-based extraction
            logger.info("Loading units from Solar Auxilia.cat...")
            units = self.load_all_units()

            unit_upgrade_links = []
            inline_upgrade_count = 0

            for unit_data in units:
                # Create unit record
                budget_cats = unit_data.get('budget_categories')
                tercio_cats = unit_data.get('tercio_categories')
                unit = Unit.create(
                    bs_id=unit_data['bs_id'],
                    name=unit_data['name'],
                    unit_type=unit_data['unit_type'],
                    bsdata_category=unit_data['bsdata_category'],
                    base_cost=unit_data['base_cost'],
                    profiles=json.dumps(unit_data['profiles']),
                    rules=json.dumps(unit_data['rules']),
                    constraints=json.dumps(unit_data['constraints']),
                    budget_categories=json.dumps(budget_cats) if budget_cats else None,
                    tercio_categories=json.dumps(tercio_cats) if tercio_cats else None,
                    model_min=unit_data.get('model_min', 1),
                    model_max=unit_data.get('model_max'),
                    is_legacy=unit_data['name'] in LEGACY_UNIT_NAMES,
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

                # Step 6: Generate composition rules JSON
                rules = det_loader.load_composition_rules()
                rules_path = BSDATA_DIR.parent / "composition_rules.json"
                with open(rules_path, 'w') as f:
                    json.dump(rules, f, indent=2)
                logger.info(f"Wrote composition rules to {rules_path}")
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

        # Use native category as slot type
        unit_id = entry['id']
        bsdata_category = self.category_map.get(unit_id, "Uncategorized")
        base_cost = self.parser.compute_base_unit_cost(element)

        return {
            'bs_id': entry['id'],
            'name': entry['name'],
            'unit_type': bsdata_category,  # Native HH3 slot name
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
