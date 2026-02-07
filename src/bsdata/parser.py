"""BattleScribe XML catalogue parser."""
import logging
from pathlib import Path
from typing import Optional
from lxml import etree

logger = logging.getLogger(__name__)


class BattleScribeParser:
    """Parse BattleScribe .cat files."""

    def __init__(self, catalogue_path: Path):
        """
        Initialize parser with a catalogue file.

        Args:
            catalogue_path: Path to .cat file
        """
        self.catalogue_path = catalogue_path
        self.tree = None
        self.root = None
        self.namespace = None

        self._load_catalogue()

    def _load_catalogue(self):
        """Load and parse the XML catalogue."""
        try:
            self.tree = etree.parse(str(self.catalogue_path))
            self.root = self.tree.getroot()

            # Extract namespace - BattleScribe uses a namespace
            self.nsmap = self.root.nsmap
            if None in self.nsmap:
                # Default namespace
                self.ns = {'bs': self.nsmap[None]}
            else:
                self.ns = {}

            logger.info(f"Loaded catalogue: {self.root.get('name', 'Unknown')}")
            logger.debug(f"Namespace: {self.ns}")

        except Exception as e:
            logger.error(f"Failed to load catalogue: {e}")
            raise

    def _xpath(self, element: etree.Element, xpath: str) -> list:
        """Execute XPath with namespace support."""
        if not self.ns:
            return element.xpath(xpath)

        # Simple mapping for common XPath patterns
        # For .// just prepend bs: to element names
        import re

        # Replace //element with //bs:element
        xpath_ns = re.sub(r'//([\w]+)(\[|$|/)', r'//bs:\1\2', xpath)
        # Replace ./element with ./bs:element
        xpath_ns = re.sub(r'\.([\w]+)(\[|$|/)', r'.\1\2', xpath_ns)  # Keep ./ as-is
        # Replace /element with /bs:element (but not at start of string, and not after @)
        xpath_ns = re.sub(r'([^@])/([a-zA-Z][\w]*)', r'\1/bs:\2', xpath_ns)

        # Clean up any double bs:bs:
        xpath_ns = xpath_ns.replace('bs:bs:', 'bs:')

        return element.xpath(xpath_ns, namespaces=self.ns)

    def get_catalogue_info(self) -> dict:
        """Get basic catalogue information."""
        return {
            'name': self.root.get('name'),
            'id': self.root.get('id'),
            'revision': self.root.get('revision'),
            'battleScribeVersion': self.root.get('battleScribeVersion'),
            'gameSystemId': self.root.get('gameSystemId'),
        }

    def get_all_selection_entries(self, entry_type: Optional[str] = None) -> list[etree.Element]:
        """
        Get all selectionEntry elements.

        Args:
            entry_type: Filter by type (e.g., 'unit', 'model', 'upgrade')

        Returns:
            List of selectionEntry elements
        """
        # Build XPath with namespace
        xpath = './/bs:selectionEntry' if self.ns else './/selectionEntry'
        if entry_type:
            xpath += f'[@type="{entry_type}"]'

        # Execute XPath
        entries = self.root.xpath(xpath, namespaces=self.ns) if self.ns else self.root.xpath(xpath)

        logger.debug(f"Found {len(entries)} selection entries (type={entry_type})")
        return entries

    def parse_selection_entry(self, entry: etree.Element) -> dict:
        """
        Parse a selectionEntry into a dict.

        Args:
            entry: selectionEntry XML element

        Returns:
            Dict with entry details
        """
        data = {
            'id': entry.get('id'),
            'name': entry.get('name'),
            'type': entry.get('type'),
            'hidden': entry.get('hidden') == 'true',
            'costs': self._parse_costs(entry),
            'profiles': self._parse_profiles(entry),
            'rules': self._parse_rules(entry),
            'constraints': self._parse_constraints(entry),
            'category_links': self._parse_category_links(entry),
            'entry_links': self._parse_entry_links(entry),
            'selection_entry_groups': self._parse_selection_entry_groups(entry),
        }

        return data

    def _parse_costs(self, element: etree.Element) -> dict:
        """Parse cost elements."""
        costs = {}
        cost_elements = self._xpath(element, './/cost')

        for cost in cost_elements:
            cost_name = cost.get('name', 'Points')
            cost_value = float(cost.get('value', 0))
            costs[cost_name] = cost_value

        return costs

    def _parse_profiles(self, element: etree.Element) -> list[dict]:
        """Parse profile elements (unit stats, weapon stats, etc.)."""
        profiles = []
        profile_elements = self._xpath(element, './/profile')

        for profile in profile_elements:
            profile_data = {
                'id': profile.get('id'),
                'name': profile.get('name'),
                'type': profile.get('typeName'),
                'hidden': profile.get('hidden') == 'true',
                'characteristics': {}
            }

            # Parse characteristics (stats)
            char_elements = self._xpath(profile, './/characteristic')
            for char in char_elements:
                char_name = char.get('name')
                char_value = char.text or ''
                profile_data['characteristics'][char_name] = char_value.strip()

            profiles.append(profile_data)

        return profiles

    def _parse_rules(self, element: etree.Element) -> list[dict]:
        """Parse special rules."""
        rules = []
        rule_elements = self._xpath(element, './/rule')

        for rule in rule_elements:
            rule_data = {
                'id': rule.get('id'),
                'name': rule.get('name'),
                'hidden': rule.get('hidden') == 'true',
                'description': ''
            }

            # Get description (direct child, not XPath)
            for child in rule:
                if child.tag.endswith('description'):
                    if child.text:
                        rule_data['description'] = child.text.strip()
                    break

            rules.append(rule_data)

        return rules

    def _parse_constraints(self, element: etree.Element) -> list[dict]:
        """Parse constraints (min/max limits)."""
        constraints = []
        constraint_elements = self._xpath(element, './/constraint')

        for constraint in constraint_elements:
            constraints.append({
                'type': constraint.get('type'),  # 'min' or 'max'
                'value': float(constraint.get('value', 0)),
                'field': constraint.get('field'),
                'scope': constraint.get('scope'),
            })

        return constraints

    def _parse_category_links(self, element: etree.Element) -> list[dict]:
        """Parse categoryLink elements (FOC categories)."""
        categories = []
        category_elements = self._xpath(element, './categoryLinks/categoryLink')

        for cat in category_elements:
            categories.append({
                'id': cat.get('id'),
                'name': cat.get('name'),
                'target_id': cat.get('targetId'),
                'primary': cat.get('primary') == 'true',
            })

        return categories

    def _parse_entry_links(self, element: etree.Element) -> list[dict]:
        """Parse entryLink elements (references to other entries)."""
        links = []
        link_elements = self._xpath(element, './entryLinks/entryLink')

        for link in link_elements:
            links.append({
                'id': link.get('id'),
                'name': link.get('name'),
                'target_id': link.get('targetId'),
                'type': link.get('type'),
                'import': link.get('import') == 'true',
                'hidden': link.get('hidden') == 'true',
            })

        return links

    def _parse_selection_entry_groups(self, element: etree.Element) -> list[dict]:
        """Parse selectionEntryGroup elements (option groups)."""
        groups = []
        group_elements = self._xpath(element, './selectionEntryGroups/selectionEntryGroup')

        for group in group_elements:
            groups.append({
                'id': group.get('id'),
                'name': group.get('name'),
                'hidden': group.get('hidden') == 'true',
                'default_id': group.get('defaultSelectionEntryId'),
                'constraints': self._parse_constraints(group),
                'entry_links': self._parse_entry_links(group),
            })

        return groups

    def get_shared_profiles(self) -> list[dict]:
        """Get all shared profiles (weapons, rules, etc.)."""
        shared = []
        profile_elements = self._xpath(self.root, './/sharedProfiles/profile')

        for profile in profile_elements:
            shared.append({
                'id': profile.get('id'),
                'name': profile.get('name'),
                'type': profile.get('typeName'),
                'characteristics': {
                    char.get('name'): char.text.strip() if char.text else ''
                    for char in self._xpath(profile, './/characteristic')
                }
            })

        return shared

    def find_entry_by_name(self, name: str) -> Optional[dict]:
        """
        Find a selection entry by name.

        Args:
            name: Entry name to search for

        Returns:
            Parsed entry dict, or None if not found
        """
        entries = self._xpath(self.root, f'.//selectionEntry[@name="{name}"]')

        if entries:
            return self.parse_selection_entry(entries[0])

        return None

    def get_force_entries(self) -> list[dict]:
        """
        Get force entries (detachment types).

        Note: This is typically in the .gst file, not .cat
        """
        force_entries = []
        force_elements = self._xpath(self.root, './/forceEntry')

        for force in force_elements:
            force_entries.append({
                'id': force.get('id'),
                'name': force.get('name'),
                'hidden': force.get('hidden') == 'true',
                'category_links': self._parse_category_links(force),
                'constraints': self._parse_constraints(force),
            })

        return force_entries
