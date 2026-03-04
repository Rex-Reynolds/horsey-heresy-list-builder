"""40k 10th Edition category mapping."""
from src.gamesystems.base import BaseCategoryMapping

# 40k display groups map directly to slot types (flat, no nesting)
DISPLAY_GROUPS_40K = {
    "Character": ["Character"],
    "Battleline": ["Battleline"],
    "Infantry": ["Infantry"],
    "Mounted": ["Mounted"],
    "Vehicle": ["Vehicle"],
    "Monster": ["Monster"],
    "Epic Hero": ["Epic Hero"],
    "Dedicated Transport": ["Dedicated Transport"],
}

# Reverse lookup
_NATIVE_TO_GROUP_40K = {}
for group, natives in DISPLAY_GROUPS_40K.items():
    for native in natives:
        _NATIVE_TO_GROUP_40K[native] = group

DISPLAY_GROUP_ORDER_40K = [
    "Epic Hero",
    "Character",
    "Battleline",
    "Infantry",
    "Mounted",
    "Vehicle",
    "Monster",
    "Dedicated Transport",
]


class W40K10eCategoryMapping(BaseCategoryMapping):
    """40k display groups: Character, Battleline, Infantry, etc."""

    def get_display_groups(self) -> dict:
        return DISPLAY_GROUPS_40K

    def get_native_categories_for_group(self, group_name: str) -> list[str]:
        return DISPLAY_GROUPS_40K.get(group_name, [])
