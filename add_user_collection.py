"""Add user's actual collection."""
from src.builder.collection_builder import CollectionManager
from src.models import initialize_database

initialize_database()

print("Adding your Solar Auxilia collection...\n")

manager = CollectionManager()

# User's collection
units = [
    # HQ
    ("Legate Commander", 1, "Legate Marshal variant"),

    # Special Characters
    ("Auxilia Tactical Command Section", 1, "Aveos Jhovan with retinue"),

    # Troops - 120 auxiliaries = 12 sections (10 models each)
    ("Lasrifle Section", 12, "120 models total"),

    # Elites - 20 Veletaris = 2 sections (10 models each)
    ("Veletaris Storm Section", 2, "20 models total"),

    # Elites - 9 Charonite Ogryns = 3 units (3 models each)
    ("Charonite Ogryns", 3, "9 models total"),

    # Heavy Support
    ("Malcador Heavy Tank", 1, "Infernus variant"),
    ("Leman Russ Battle Tank", 4, "4 individual tanks"),

    # Fast Attack
    ("Cyclops Demolition Vehicle", 3, "3 vehicles"),

    # Sentinels (treating as separate units)
    ("Hermes Light Sentinel", 4, "Light variant"),
    ("Aethon Heavy Sentinel", 3, "Heavy variant"),
]

for unit_name, qty, notes in units:
    manager.add_unit(unit_name, qty, notes)
    print(f"✓ Added {qty}x {unit_name}")
    if notes:
        print(f"  └─ {notes}")

print(f"\n{'='*60}")
print(f"Collection complete! You have {len(units)} unit types.")
print(f"{'='*60}\n")

print("Now run:")
print("  auxilia collection show")
print("  auxilia collection generate")
print("  auxilia collection recommend")
