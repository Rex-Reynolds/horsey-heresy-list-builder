"""Catalogue cache system for shared BSData catalogues."""
import logging
from pathlib import Path
from typing import Optional, Dict, Any

from src.bsdata.parser import BattleScribeParser

logger = logging.getLogger(__name__)


class CatalogueCache:
    """Cache shared catalogue entries for fast cross-catalogue lookups."""

    def __init__(self, bsdata_dir: Path):
        """
        Initialize catalogue cache.

        Args:
            bsdata_dir: Path to BSData directory containing .cat files
        """
        self.bsdata_dir = bsdata_dir
        self.loaded_catalogues: Dict[str, Dict[str, Any]] = {}
        logger.debug(f"CatalogueCache initialized with directory: {bsdata_dir}")

    def load_shared_catalogue(self, catalogue_name: str) -> int:
        """
        Parse and cache a shared catalogue (e.g., Weapons, Wargear).

        Args:
            catalogue_name: Name of catalogue without .cat extension

        Returns:
            Number of entries cached
        """
        # Check if already loaded
        if catalogue_name in self.loaded_catalogues:
            logger.debug(f"Catalogue '{catalogue_name}' already cached")
            return len(self.loaded_catalogues[catalogue_name])

        # Find catalogue file
        catalogue_path = self.bsdata_dir / f"{catalogue_name}.cat"
        if not catalogue_path.exists():
            logger.error(f"Catalogue not found: {catalogue_path}")
            return 0

        logger.info(f"Loading shared catalogue: {catalogue_name}")

        try:
            parser = BattleScribeParser(catalogue_path)

            # Build entry cache by ID
            entry_cache = {}

            # Cache sharedSelectionEntries - these are the main entries
            shared_entries = self._get_shared_selection_entries(parser)
            for entry_data in shared_entries:
                entry_id = entry_data.get('id')
                if entry_id:
                    entry_cache[entry_id] = entry_data

            # Also cache sharedProfiles for weapon stats
            shared_profiles = parser.get_shared_profiles()
            for profile in shared_profiles:
                profile_id = profile.get('id')
                if profile_id:
                    # Store as a special type to distinguish from entries
                    entry_cache[profile_id] = {
                        'entry_type': 'profile',
                        **profile
                    }

            self.loaded_catalogues[catalogue_name] = entry_cache
            logger.info(f"✓ Cached {len(entry_cache)} entries from {catalogue_name}")

            return len(entry_cache)

        except Exception as e:
            logger.error(f"Failed to load catalogue '{catalogue_name}': {e}")
            return 0

    def _get_shared_selection_entries(self, parser: BattleScribeParser) -> list[dict]:
        """
        Extract all sharedSelectionEntries from a catalogue.

        Args:
            parser: BattleScribeParser instance

        Returns:
            List of parsed entry dicts
        """
        entries = []

        # Use namespace-aware XPath
        if parser.ns:
            shared_entries = parser.root.xpath(
                './/bs:sharedSelectionEntries/bs:selectionEntry',
                namespaces=parser.ns
            )
        else:
            shared_entries = parser.root.xpath(
                './/sharedSelectionEntries/selectionEntry'
            )

        for entry_element in shared_entries:
            try:
                entry_data = parser.parse_selection_entry(entry_element)
                entries.append(entry_data)
            except Exception as e:
                entry_name = entry_element.get('name', 'Unknown')
                logger.warning(f"Failed to parse entry '{entry_name}': {e}")
                continue

        return entries

    def get_entry_by_id(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """
        Resolve entry ID across all loaded catalogues.

        Args:
            entry_id: BattleScribe entry ID

        Returns:
            Cached entry dict, or None if not found
        """
        for catalogue_name, cache in self.loaded_catalogues.items():
            if entry_id in cache:
                return cache[entry_id]

        return None

    def get_entry_name(self, entry_id: str) -> Optional[str]:
        """
        Get entry name by ID.

        Args:
            entry_id: BattleScribe entry ID

        Returns:
            Entry name, or None if not found
        """
        entry = self.get_entry_by_id(entry_id)
        return entry.get('name') if entry else None

    def clear(self):
        """Clear all cached catalogues."""
        self.loaded_catalogues.clear()
        logger.debug("Catalogue cache cleared")

    def get_loaded_catalogues(self) -> list[str]:
        """Get list of loaded catalogue names."""
        return list(self.loaded_catalogues.keys())

    def get_cache_stats(self) -> Dict[str, int]:
        """
        Get statistics about cached data.

        Returns:
            Dict with catalogue names and entry counts
        """
        return {
            name: len(cache)
            for name, cache in self.loaded_catalogues.items()
        }
