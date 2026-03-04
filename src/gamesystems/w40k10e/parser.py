"""40k 10th Edition BSData XML parser — loads GSC (and future factions) into the DB."""
import json
import logging
import re
from pathlib import Path
from typing import Optional
from lxml import etree

from src.models.database import db
from src.models.catalogue import Unit, Weapon, Upgrade, UnitUpgrade, Detachment, UnitKeyword

logger = logging.getLogger(__name__)

NS = {'bs': 'http://www.battlescribe.net/schema/catalogueSchema'}
PTS_TYPE_ID = '51b2-306e-1021-d207'  # Standard 40k pts cost type ID


def parse_40k_catalogue(gst_path: Path, cat_path: Path, faction: str) -> dict:
    """Parse a 40k faction catalogue and insert into the database.

    Args:
        gst_path: Path to Warhammer 40,000.gst
        cat_path: Path to faction .cat file (e.g., Genestealer Cults.cat)
        faction: Faction name for DB records

    Returns:
        dict with counts: {"units": N, "weapons": N, ...}
    """
    cat_tree = etree.parse(str(cat_path))
    cat_root = cat_tree.getroot()

    # Detect namespace
    ns_uri = cat_root.nsmap.get(None, NS['bs'])
    ns = {'bs': ns_uri}

    # Load linked library catalogues for detachment rules
    library_trees = _load_linked_catalogues(cat_root, cat_path.parent, ns)

    # Parse units from sharedSelectionEntries
    shared = cat_root.find('.//bs:sharedSelectionEntries', ns)
    if shared is None:
        raise ValueError(f"No sharedSelectionEntries found in {cat_path}")

    units_data = []
    weapons_data = []
    keywords_data = []

    for entry in shared.findall('bs:selectionEntry', ns):
        entry_type = entry.attrib.get('type', '')
        if entry_type not in ('unit', 'model'):
            continue

        unit_info = _parse_unit(entry, ns, faction)
        if unit_info:
            units_data.append(unit_info)

    # Parse detachment rules from library catalogues
    detachments_data = _parse_detachments(library_trees, ns, faction)

    # Insert into DB
    counts = _insert_into_db(units_data, detachments_data, faction)

    return counts


def _load_linked_catalogues(cat_root, cat_dir: Path, ns: dict) -> list:
    """Load library catalogues referenced by catalogueLinks."""
    trees = []
    cat_links = cat_root.find('.//bs:catalogueLinks', ns)
    if cat_links is None:
        return trees

    for link in cat_links.findall('bs:catalogueLink', ns):
        link_name = link.attrib.get('name', '')
        # Try to find the .cat file
        cat_file = cat_dir / f"{link_name}.cat"
        if cat_file.exists():
            try:
                trees.append(etree.parse(str(cat_file)))
                logger.debug(f"Loaded linked catalogue: {link_name}")
            except Exception as e:
                logger.warning(f"Failed to parse linked catalogue {link_name}: {e}")

    return trees


def _parse_unit(entry, ns: dict, faction: str) -> Optional[dict]:
    """Parse a single unit from a selectionEntry element."""
    name = entry.attrib.get('name', '')
    bs_id = entry.attrib.get('id', '')

    # Skip legends units
    if '[Legends]' in name:
        return None

    # Base points cost
    base_pts = 0
    for cost in entry.findall('bs:costs/bs:cost', ns):
        if cost.attrib.get('name') == 'pts':
            base_pts = int(float(cost.attrib.get('value', '0')))

    # Categories (slot type + keywords)
    categories = []
    primary_category = None
    faction_keywords = []
    unit_keywords = []

    for cat_link in entry.findall('bs:categoryLinks/bs:categoryLink', ns):
        cat_name = cat_link.attrib.get('name', '')
        is_primary = cat_link.attrib.get('primary', 'false') == 'true'

        if cat_name.startswith('Faction: '):
            faction_keywords.append(cat_name.replace('Faction: ', ''))
        elif cat_name in ('Grenades', 'Great Devourer'):
            # Skip meta-categories
            unit_keywords.append(cat_name)
        elif is_primary:
            primary_category = cat_name
            unit_keywords.append(cat_name)
        else:
            unit_keywords.append(cat_name)
            categories.append(cat_name)

    if not primary_category:
        # Fallback: use first non-faction category
        for kw in unit_keywords:
            if kw not in ('Grenades', 'Great Devourer'):
                primary_category = kw
                break

    if not primary_category:
        primary_category = "Uncategorized"

    # Profiles (stats, weapons, abilities)
    profiles = []
    stat_profile = None
    weapon_profiles = []
    ability_profiles = []

    for profile in entry.findall('.//bs:profile', ns):
        p_name = profile.attrib.get('name', '')
        p_type = profile.attrib.get('typeName', '')
        chars = {}
        for char in profile.findall('.//bs:characteristic', ns):
            char_name = char.attrib.get('name', '')
            chars[char_name] = char.text or ''

        profile_data = {
            'name': p_name,
            'type': p_type,
            'characteristics': chars,
        }

        if p_type == 'Unit':
            if stat_profile is None:
                stat_profile = profile_data  # Use first stat line
            profiles.append(profile_data)
        elif p_type in ('Ranged Weapons', 'Melee Weapons'):
            weapon_profiles.append(profile_data)
            profiles.append(profile_data)
        elif p_type == 'Abilities':
            ability_profiles.append(profile_data)
            profiles.append(profile_data)
        else:
            profiles.append(profile_data)

    # Rules from infoLinks
    rules = []
    for info_link in entry.findall('bs:infoLinks/bs:infoLink', ns):
        rule_name = info_link.attrib.get('name', '')
        if rule_name:
            rules.append({'name': rule_name, 'type': info_link.attrib.get('type', '')})

    # Points brackets from modifiers
    brackets = _extract_points_brackets(entry, ns, base_pts)

    # Model count from selection groups
    model_min, model_max = _extract_model_counts(entry, ns)

    # Max copies per roster from constraints
    max_roster = _extract_max_roster(entry, ns)

    # Leader targets from ability text
    leader_targets = _extract_leader_targets(ability_profiles)

    # Build constraints list
    constraints = []
    if max_roster is not None:
        constraints.append({'scope': 'roster', 'type': 'max', 'value': max_roster})

    return {
        'bs_id': bs_id,
        'name': name,
        'unit_type': primary_category,
        'base_cost': base_pts,
        'profiles': profiles,
        'rules': rules,
        'constraints': constraints,
        'model_min': model_min,
        'model_max': model_max,
        'points_brackets': brackets if len(brackets) > 1 else None,
        'leader_targets': leader_targets,
        'keywords': unit_keywords + faction_keywords,
        'faction_keywords': faction_keywords,
        'weapon_profiles': weapon_profiles,
        'ability_profiles': ability_profiles,
    }


def _extract_points_brackets(entry, ns: dict, base_pts: int) -> list[dict]:
    """Extract discrete points brackets from cost modifiers.

    40k uses modifiers that `set` the pts cost based on model count thresholds.
    The threshold condition is `greaterThan selections N` where N refers to the total
    selections (models) in the unit. The base cost applies at min size, the set cost
    at the threshold+1 and above.
    """
    # Collect cost-setting modifiers
    set_brackets = []
    for modifier in entry.findall('.//bs:modifier', ns):
        m_field = modifier.attrib.get('field', '')
        m_type = modifier.attrib.get('type', '')
        m_value = modifier.attrib.get('value', '')

        if m_type != 'set' or m_field != PTS_TYPE_ID:
            continue

        try:
            set_cost = int(float(m_value))
        except (ValueError, TypeError):
            continue

        for cond in modifier.findall('.//bs:condition', ns):
            c_type = cond.attrib.get('type', '')
            c_value = cond.attrib.get('value', '')
            if c_type in ('greaterThan', 'atLeast') and c_value:
                try:
                    threshold = int(float(c_value))
                    set_brackets.append((threshold, set_cost))
                except (ValueError, TypeError):
                    pass

    if not set_brackets:
        return []  # No brackets for this unit

    # Get model count range
    model_min, model_max = _extract_model_counts(entry, ns)

    # Build brackets: base cost at min size, each set_bracket at its threshold
    brackets = [{"models": model_min, "cost": base_pts}]
    set_brackets.sort(key=lambda x: x[0])

    for threshold, cost in set_brackets:
        # The threshold is on selections count; model_min already accounts for base
        # greaterThan N means the bracket starts at total > N, i.e., threshold+1 models
        bracket_models = threshold + 1
        if bracket_models > model_min:
            brackets.append({"models": bracket_models, "cost": cost})

    return brackets


def _extract_model_counts(entry, ns: dict) -> tuple[int, int]:
    """Extract min/max model count from selection entry groups.

    40k units have structure like:
    - A leader/base model (implicit, always 1)
    - Selection groups like "4-9 Aberrants" with min/max constraints on 'parent' scope

    Total model count = leader + group models. For single-model units, both are 1.
    """
    entry_type = entry.attrib.get('type', '')

    # Single-model entries (type='model') have no expandable group
    if entry_type == 'model':
        return 1, 1

    group_min = 0
    group_max = 0
    has_model_group = False

    for seg in entry.findall('bs:selectionEntryGroups/bs:selectionEntryGroup', ns):
        g_name = seg.attrib.get('name', '')

        # Check if this group contains model-type entries (not just upgrades/wargear)
        has_models_in_group = False
        for sub_entry in seg.findall('.//bs:selectionEntry', ns):
            if sub_entry.attrib.get('type') == 'model':
                has_models_in_group = True
                break

        if not has_models_in_group:
            continue

        for constraint in seg.findall('bs:constraints/bs:constraint', ns):
            c_type = constraint.attrib.get('type', '')
            c_field = constraint.attrib.get('field', '')
            c_scope = constraint.attrib.get('scope', '')
            c_value = constraint.attrib.get('value', '')

            if c_field == 'selections' and c_scope == 'parent':
                try:
                    val = int(float(c_value))
                    if c_type == 'min':
                        group_min = max(group_min, val)
                        has_model_group = True
                    elif c_type == 'max':
                        group_max = max(group_max, val)
                        has_model_group = True
                except (ValueError, TypeError):
                    pass

    if has_model_group:
        # Total = leader/base (1) + group models
        return group_min + 1, group_max + 1

    return 1, 1


def _extract_max_roster(entry, ns: dict) -> Optional[int]:
    """Extract max copies per roster from constraints."""
    for constraint in entry.findall('bs:constraints/bs:constraint', ns):
        c_type = constraint.attrib.get('type', '')
        c_field = constraint.attrib.get('field', '')
        c_scope = constraint.attrib.get('scope', '')
        c_value = constraint.attrib.get('value', '')

        if c_type == 'max' and c_field == 'selections' and c_scope == 'roster':
            try:
                return int(float(c_value))
            except (ValueError, TypeError):
                pass
    return None


def _extract_leader_targets(ability_profiles: list) -> Optional[list[str]]:
    """Extract leader attachment targets from Leader ability description text."""
    for ability in ability_profiles:
        a_name = ability.get('name', '')
        if 'leader' not in a_name.lower():
            continue

        desc = ability.get('characteristics', {}).get('Description', '')
        if 'can be attached to' not in desc.lower():
            continue

        # Extract unit names (ALL CAPS between dashes)
        targets = re.findall(r'-\s*([A-Z][A-Z\s]+[A-Z])\s*(?:\n|$)', desc)
        if targets:
            # Normalize: title case
            return [t.strip().title() for t in targets]

    return None


def _parse_detachments(library_trees: list, ns: dict, faction: str) -> list[dict]:
    """Parse detachment rules from library catalogues."""
    DETACHMENT_GROUP_ID = '7170-c243-d89f-6644'
    detachments = []

    for tree in library_trees:
        root = tree.getroot()
        lib_ns_uri = root.nsmap.get(None, NS['bs'])
        lib_ns = {'bs': lib_ns_uri}

        # Build enhancement lookup: "Detachment Name Enhancements" -> list of enhancements
        enhancement_lookup = _build_enhancement_lookup(root, lib_ns)

        for elem in root.iter():
            tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            if tag == 'selectionEntryGroup' and elem.attrib.get('id') == DETACHMENT_GROUP_ID:
                for se in elem.findall('bs:selectionEntries/bs:selectionEntry', lib_ns):
                    det_name = se.attrib.get('name', '')
                    det_id = se.attrib.get('id', '')

                    # Get enhancements from shared group lookup
                    enh_key = f"{det_name} Enhancements"
                    enhancements = enhancement_lookup.get(enh_key, [])

                    # Extract detachment rules from <rule> elements
                    rules = []
                    for rule in se.findall('.//bs:rule', lib_ns):
                        r_name = rule.attrib.get('name', '')
                        desc_el = rule.find('bs:description', lib_ns)
                        desc = desc_el.text if desc_el is not None and desc_el.text else ''
                        rules.append({
                            'name': r_name,
                            'description': desc,
                        })

                    # Also capture infoLinks (referenced keywords like Ignores Cover)
                    for il in se.findall('bs:infoLinks/bs:infoLink', lib_ns):
                        il_name = il.attrib.get('name', '')
                        if il_name:
                            rules.append({
                                'name': il_name,
                                'description': f'(referenced rule)',
                            })

                    detachments.append({
                        'bs_id': det_id,
                        'name': det_name,
                        'faction': faction,
                        'enhancements': enhancements,
                        'rules': rules,
                    })

    return detachments


def _build_enhancement_lookup(root, ns: dict) -> dict:
    """Build a lookup of enhancement groups from the shared Enhancements group."""
    lookup = {}

    for seg in root.findall('.//bs:sharedSelectionEntryGroups/bs:selectionEntryGroup', ns):
        if seg.attrib.get('name') != 'Enhancements':
            continue

        # Each sub-group is "{Detachment Name} Enhancements"
        for sub_seg in seg.findall('bs:selectionEntryGroups/bs:selectionEntryGroup', ns):
            group_name = sub_seg.attrib.get('name', '')
            enhancements = []

            for se in sub_seg.findall('bs:selectionEntries/bs:selectionEntry', ns):
                enh_cost = 0
                for cost in se.findall('bs:costs/bs:cost', ns):
                    if cost.attrib.get('name') == 'pts':
                        enh_cost = int(float(cost.attrib.get('value', '0')))

                # Get enhancement description from profiles
                enh_desc = ''
                for profile in se.findall('.//bs:profile', ns):
                    for char in profile.findall('.//bs:characteristic', ns):
                        if char.text:
                            enh_desc = char.text

                enhancements.append({
                    'name': se.attrib.get('name', ''),
                    'cost': enh_cost,
                    'bs_id': se.attrib.get('id', ''),
                    'description': enh_desc,
                })

            lookup[group_name] = enhancements

    return lookup


def _insert_into_db(units_data: list, detachments_data: list, faction: str) -> dict:
    """Insert parsed data into the database."""
    counts = {'units': 0, 'weapons': 0, 'upgrades': 0, 'keywords': 0, 'detachments': 0}

    with db.atomic():
        # Clear existing 40k10e data for this faction to allow re-seeding
        existing_units = Unit.select().where(
            (Unit.game_system == '40k10e')
        )
        unit_ids = [u.id for u in existing_units]
        if unit_ids:
            UnitKeyword.delete().where(UnitKeyword.unit.in_(unit_ids)).execute()
            UnitUpgrade.delete().where(UnitUpgrade.unit.in_(unit_ids)).execute()
            Unit.delete().where(Unit.id.in_(unit_ids)).execute()

        Detachment.delete().where(
            (Detachment.game_system == '40k10e')
        ).execute()

        # Insert units
        for unit_info in units_data:
            unit = Unit.create(
                bs_id=unit_info['bs_id'],
                name=unit_info['name'],
                unit_type=unit_info['unit_type'],
                bsdata_category=unit_info['unit_type'],
                base_cost=unit_info['base_cost'],
                profiles=json.dumps(unit_info['profiles']),
                rules=json.dumps(unit_info['rules']) if unit_info['rules'] else None,
                constraints=json.dumps(unit_info['constraints']) if unit_info['constraints'] else None,
                model_min=unit_info['model_min'],
                model_max=unit_info['model_max'],
                game_system='40k10e',
                points_brackets=json.dumps(unit_info['points_brackets']) if unit_info['points_brackets'] else None,
                leader_targets=json.dumps(unit_info['leader_targets']) if unit_info['leader_targets'] else None,
                cost_per_model=0,  # 40k uses brackets, not per-model
            )
            counts['units'] += 1

            # Insert keywords
            for kw in unit_info['keywords']:
                kw_type = 'faction' if kw in unit_info['faction_keywords'] else 'keyword'
                UnitKeyword.create(
                    unit=unit,
                    keyword=kw,
                    keyword_type=kw_type,
                )
                counts['keywords'] += 1

        # Insert detachments
        for det_info in detachments_data:
            abilities = {
                'enhancements': det_info['enhancements'],
                'rules': det_info['rules'],
            }

            Detachment.create(
                bs_id=det_info['bs_id'],
                name=det_info['name'],
                detachment_type='Detachment',
                constraints=json.dumps({}),  # 40k uses flat army, no slot constraints
                faction=det_info['faction'],
                game_system='40k10e',
                abilities=json.dumps(abilities),
            )
            counts['detachments'] += 1

    logger.info(f"Inserted: {counts}")
    return counts
