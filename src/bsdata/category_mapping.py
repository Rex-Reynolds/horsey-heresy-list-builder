"""Map BSData native categories to display groups for the unit browser."""

# Display groups for the unit browser sidebar.
# Groups similar native HH3 slot types for browsing convenience.
# The actual slot assignment uses the native BSData category name directly.
DISPLAY_GROUPS = {
    "HQ": ["High Command", "Command"],
    "Troops": ["Troops"],
    "Elites": ["Elites", "Retinue"],
    "Fast Attack": ["Fast Attack", "Recon"],
    "Heavy Support": ["Support", "Armour", "Heavy Assault", "War-engine"],
    "Dedicated Transport": ["Transport", "Heavy Transport"],
    "Lord of War": ["Lord of War"],
}

# Reverse lookup: native category -> display group
_NATIVE_TO_GROUP = {}
for group, natives in DISPLAY_GROUPS.items():
    for native in natives:
        _NATIVE_TO_GROUP[native] = group

# All known native HH3 slot names
NATIVE_SLOTS = [
    "High Command", "Command", "Troops", "Elites", "Retinue",
    "Fast Attack", "Recon", "Support", "Armour", "Heavy Assault",
    "War-engine", "Transport", "Heavy Transport", "Lord of War",
]

# Display group names in order (for UI filter pills)
DISPLAY_GROUP_ORDER = [
    "HQ",
    "Troops",
    "Elites",
    "Fast Attack",
    "Heavy Support",
    "Dedicated Transport",
    "Lord of War",
]

# Categories to skip during loading (non-unit categories)
SKIP_CATEGORIES = {
    "Allegiance", "Asset", "Army Configuration", "Primary Detachment",
}

# "Prime" prefixed categories are locked/conditional variants
PRIME_CATEGORY_PREFIXES = ["Prime ", "Officer of the Line"]


def get_display_group(native_category: str) -> str:
    """
    Get the display group for a native BSData category.

    Used by the unit browser for filter pills. NOT used for roster validation.

    Args:
        native_category: Native BSData category name (e.g., "Armour", "Recon")

    Returns:
        Display group name (e.g., "Heavy Support", "Fast Attack")
    """
    return _NATIVE_TO_GROUP.get(native_category, "Uncategorized")


def get_native_categories_for_group(display_group: str) -> list[str]:
    """
    Get all native categories that belong to a display group.

    Args:
        display_group: Display group name (e.g., "Heavy Support")

    Returns:
        List of native category names
    """
    return DISPLAY_GROUPS.get(display_group, [])
