"""Map BSData categories to standard Force Organization Chart categories."""

# Solar Auxilia uses unique category names - map to standard FOC
CATEGORY_TO_FOC = {
    # HQ equivalents
    "High Command": "HQ",
    "Prime Command": "HQ",

    # Command/Officer categories
    "Command": "HQ",
    "Officer of the Line (2)": "HQ",

    # Troops
    "Troops": "Troops",
    "Prime Troops": "Troops",

    # Elites
    "Elites": "Elites",
    "Prime Elites": "Elites",
    "Retinue": "Elites",
    "Prime Retinue": "Elites",

    # Fast Attack
    "Fast Attack": "Fast Attack",
    "Recon": "Fast Attack",

    # Heavy Support
    "Heavy Assault": "Heavy Support",
    "Support": "Heavy Support",
    "Armour": "Heavy Support",
    "War-engine": "Heavy Support",  # Walkers (Aethon Heavy Sentinel), NOT Lord of War

    # Dedicated Transport
    "Transport": "Dedicated Transport",
    "Heavy Transport": "Dedicated Transport",

    # Lord of War
    "Lord of War": "Lord of War",

    # Special categories
    "Allegiance": "Special",
    "Asset": "Special",
    "Army Configuration": "Special",
    "Primary Detachment": "Special",
}

# Standard FOC categories in order
STANDARD_FOC_ORDER = [
    "HQ",
    "Troops",
    "Elites",
    "Fast Attack",
    "Heavy Support",
    "Dedicated Transport",
    "Lord of War",
    "Special",
]


def normalize_category(bsdata_category: str) -> str:
    """
    Convert BSData category to standard FOC category.

    Args:
        bsdata_category: Category name from BSData

    Returns:
        Standard FOC category name
    """
    return CATEGORY_TO_FOC.get(bsdata_category, "Uncategorized")


def get_foc_display_name(category: str) -> str:
    """
    Get display name for FOC category.

    Args:
        category: FOC category name

    Returns:
        Formatted display name
    """
    return category
