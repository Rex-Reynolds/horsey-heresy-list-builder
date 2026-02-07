"""Army list text parsers."""
import re
import logging
from typing import Optional
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)

# Common Solar Auxilia unit names for fuzzy matching
KNOWN_UNITS = {
    "lasrifle section": "Lasrifle Section",
    "veletaris storm section": "Veletaris Storm Section",
    "charonite ogryns": "Charonite Ogryns",
    "dracosan transport": "Dracosan Armoured Transport",
    "leman russ": "Leman Russ Battle Tank",
    "malcador": "Malcador Heavy Tank",
    "cyclops": "Cyclops Demolition Vehicle",
    "rapier": "Rapier Battery",
    "legate commander": "Legate Commander",
    "auxilia tactical command": "Auxilia Tactical Command Section",
    "medicae orderly": "Medicae Orderly Detachment",
    "veletaris tercios": "Veletaris Tercios",
    "auxilia flamer section": "Auxilia Flamer Section",
    "tarantula": "Tarantula Sentry Gun Battery",
    "ogryn charonite": "Charonite Ogryns",
}

# Force organization categories
CATEGORIES = ["HQ", "TROOPS", "ELITES", "FAST ATTACK", "HEAVY SUPPORT", "LORD OF WAR"]


class ListParser:
    """Parse tournament army list text into structured data."""

    def __init__(self):
        # Regex patterns for parsing
        self.unit_pattern = re.compile(
            r'(?:^|\n)\s*(?:[-•*]\s*)?(\d+)x?\s+(.+?)\s+\[(\d+)\s*pts?\]',
            re.MULTILINE | re.IGNORECASE
        )
        self.simple_unit_pattern = re.compile(
            r'(?:^|\n)\s*(?:[-•*]\s*)?(.+?)\s+\[(\d+)\s*pts?\]',
            re.MULTILINE | re.IGNORECASE
        )
        self.category_pattern = re.compile(
            r'(?:^|\n)\s*(?:\+\s*)?(HQ|TROOPS?|ELITES?|FAST ATTACK|HEAVY SUPPORT|LORD OF WAR)\s*:?\s*(?:\+\s*)?',
            re.MULTILINE | re.IGNORECASE
        )
        self.upgrade_pattern = re.compile(
            r'(?:^|\n)\s*(?:·|•|-|\*)\s+(.+?)(?:\s+\[(\d+)\s*pts?\])?',
            re.MULTILINE
        )

    def parse_list(self, list_text: str) -> tuple[list[dict], float]:
        """
        Parse army list text into structured unit entries.

        Returns:
            tuple: (list of unit dicts, confidence score 0-1)
            Each unit dict has: name, quantity, points, category, upgrades
        """
        if not list_text or len(list_text) < 50:
            return [], 0.0

        units = []
        current_category = None
        confidence_scores = []

        # Split into sections by category headers
        sections = self._split_by_categories(list_text)

        for category, section_text in sections.items():
            current_category = category

            # Try to find units with quantity prefix (e.g., "3x Lasrifle Section [450pts]")
            matches = self.unit_pattern.finditer(section_text)

            for match in matches:
                quantity = int(match.group(1))
                unit_name_raw = match.group(2).strip()
                points = int(match.group(3))

                # Normalize unit name
                unit_name, name_confidence = self._normalize_unit_name(unit_name_raw)

                # Look for upgrades following this unit
                unit_end = match.end()
                next_match = self.unit_pattern.search(section_text, unit_end)
                upgrade_text = section_text[unit_end:next_match.start()] if next_match else section_text[unit_end:]
                upgrades = self._extract_upgrades(upgrade_text)

                units.append({
                    "name": unit_name,
                    "quantity": quantity,
                    "points": points,
                    "category": current_category,
                    "upgrades": "; ".join(upgrades) if upgrades else None,
                })

                confidence_scores.append(name_confidence)

            # Also try simple pattern without quantity (implies 1x)
            simple_matches = self.simple_unit_pattern.finditer(section_text)
            for match in simple_matches:
                # Skip if already matched by quantity pattern
                if self.unit_pattern.search(match.group(0)):
                    continue

                unit_name_raw = match.group(1).strip()
                points = int(match.group(2))

                # Skip if this looks like an upgrade line
                if unit_name_raw.lower().startswith(('with', 'upgrade', '·', '•', '-')):
                    continue

                unit_name, name_confidence = self._normalize_unit_name(unit_name_raw)

                units.append({
                    "name": unit_name,
                    "quantity": 1,
                    "points": points,
                    "category": current_category,
                    "upgrades": None,
                })

                confidence_scores.append(name_confidence)

        # Calculate overall confidence
        overall_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0

        # Bonus confidence if we found a reasonable number of units
        if 3 <= len(units) <= 20:
            overall_confidence = min(1.0, overall_confidence + 0.1)

        logger.info(f"Parsed {len(units)} units with {overall_confidence:.2f} confidence")
        return units, overall_confidence

    def _split_by_categories(self, list_text: str) -> dict[str, str]:
        """Split list text into sections by FOC category."""
        sections = {}
        current_category = "UNCATEGORIZED"
        current_pos = 0

        # Find all category headers
        category_matches = list(self.category_pattern.finditer(list_text))

        if not category_matches:
            # No category headers found, treat as single section
            return {"UNCATEGORIZED": list_text}

        for i, match in enumerate(category_matches):
            # Store previous section
            if current_pos < match.start():
                sections[current_category] = list_text[current_pos:match.start()]

            current_category = match.group(1).upper()
            current_pos = match.end()

        # Store final section
        sections[current_category] = list_text[current_pos:]

        return sections

    def _normalize_unit_name(self, raw_name: str) -> tuple[str, float]:
        """
        Normalize unit name using fuzzy matching against known units.

        Returns:
            tuple: (normalized_name, confidence 0-1)
        """
        # Clean the raw name
        clean_name = raw_name.strip().lower()
        clean_name = re.sub(r'\s+', ' ', clean_name)

        # Remove common prefixes/suffixes
        clean_name = re.sub(r'^(squadron|section|detachment|battery)\s+', '', clean_name)
        clean_name = re.sub(r'\s+(squadron|section|detachment|battery)$', '', clean_name)

        # Try exact match first
        if clean_name in KNOWN_UNITS:
            return KNOWN_UNITS[clean_name], 1.0

        # Try fuzzy matching
        best_match = None
        best_ratio = 0.0

        for known_key, known_value in KNOWN_UNITS.items():
            ratio = SequenceMatcher(None, clean_name, known_key).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = known_value

        # Use fuzzy match if confidence is high enough
        if best_ratio >= 0.7:
            return best_match, best_ratio

        # Fall back to title case of original name
        return raw_name.strip().title(), 0.5

    def _extract_upgrades(self, text: str) -> list[str]:
        """Extract upgrade/wargear items from text block."""
        upgrades = []
        matches = self.upgrade_pattern.finditer(text)

        for match in matches:
            upgrade_text = match.group(1).strip()

            # Skip if this looks like a unit entry
            if re.search(r'\d+x', upgrade_text):
                continue

            # Clean up upgrade text
            upgrade_text = re.sub(r'\s+', ' ', upgrade_text)

            # Only include if reasonable length
            if 3 <= len(upgrade_text) <= 100:
                upgrades.append(upgrade_text)

        return upgrades


def parse_army_list(list_text: str) -> tuple[list[dict], float]:
    """
    Convenience function to parse an army list.

    Args:
        list_text: Raw tournament list text

    Returns:
        tuple: (list of unit dicts, confidence score)
    """
    parser = ListParser()
    return parser.parse_list(list_text)
