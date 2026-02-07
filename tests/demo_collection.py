"""Demo script for collection-based list building."""
from src.models import db, initialize_database
from src.builder.collection_builder import CollectionManager, ListGenerator
from src.models import Collection

# Initialize
initialize_database()

print("="*60)
print("DEMO: Collection-Based List Builder")
print("="*60)

# Create a realistic collection
print("\n1. Creating a sample collection...")
print("   (Simulating models you might own)\n")

manager = CollectionManager()

# Add some units
units_to_add = [
    ("Legate Commander", 1, "Painted"),
    ("Lasrifle Section", 4, "3 painted, 1 NiB"),
    ("Dracosan Armoured Transport", 2, "Both painted"),
    ("Leman Russ Battle Tank", 2, "Magnetized weapons"),
    ("Charonite Ogryns", 1, "NiB"),
    ("Veletaris Storm Section", 2, "Painted"),
    ("Malcador Heavy Tank", 1, "Partially assembled"),
]

for unit_name, qty, notes in units_to_add:
    manager.add_unit(unit_name, qty, notes)
    print(f"  ✓ Added {qty}x {unit_name}")

print(f"\n✓ Collection created with {len(units_to_add)} unit types\n")

# Show collection with meta stats
print("="*60)
print("2. Your Collection (with tournament stats)")
print("="*60 + "\n")

items = manager.list_collection()
for item in items:
    print(f"{item['quantity']}x {item['unit_name']}")
    print(f"   Tournament inclusion: {item['inclusion_rate']:.1f}% {item['trend']}")
    if item['notes']:
        print(f"   Notes: {item['notes']}")
    print()

# Generate lists
print("="*60)
print("3. Generated Tournament Lists")
print("="*60 + "\n")

coll = Collection.get(Collection.name == "My Collection")
generator = ListGenerator(coll)
lists = generator.generate_lists(max_lists=3)

for idx, list_data in enumerate(lists, 1):
    print(f"List #{idx}: {list_data['name']}")
    print(f"Strategy: {list_data['strategy']}")
    print(f"Meta Score: {list_data['score']:.1f}\n")

    for unit in list_data['units']:
        print(f"  {unit['quantity']}x {unit['unit_name']}")
        print(f"     └─ {unit['reason']}")

    print("\n" + "-"*60 + "\n")

# Recommendations
print("="*60)
print("4. Purchase Recommendations")
print("="*60 + "\n")

recommendations = generator.recommend_purchases(top_n=5)

if recommendations:
    print("What to buy next (based on tournament meta):\n")
    for rec in recommendations:
        print(f"[{rec['priority']}] {rec['unit_name']}")
        print(f"    {rec['reason']}")
        print(f"    Average quantity in lists: {rec['avg_quantity']:.1f}\n")
else:
    print("You have all the top tournament units! 🎉\n")

print("="*60)
print("DEMO COMPLETE")
print("="*60)
print("\nTry the CLI commands:")
print("  auxilia collection show")
print("  auxilia collection generate")
print("  auxilia collection recommend")
