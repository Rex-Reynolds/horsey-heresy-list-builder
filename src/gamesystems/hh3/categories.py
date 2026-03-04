"""HH3 category mapping — wraps existing category_mapping module."""
from src.gamesystems.base import BaseCategoryMapping
from src.bsdata.category_mapping import DISPLAY_GROUPS, get_native_categories_for_group


class HH3CategoryMapping(BaseCategoryMapping):
    """HH3 display groups: HQ, Troops, Elites, Fast Attack, Heavy Support, etc."""

    def get_display_groups(self) -> dict:
        return DISPLAY_GROUPS

    def get_native_categories_for_group(self, group_name: str) -> list[str]:
        return get_native_categories_for_group(group_name)
