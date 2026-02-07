"""Fix user's collection with correct units."""
from src.builder.collection_builder import CollectionManager
from src.models import Collection, CollectionItem, db

print("Fixing collection...\n")

manager = CollectionManager()

# Remove incorrect entry
manager.remove_unit("Auxilia Tactical Command Section")
print("✓ Removed incorrect Tactical Command entry")

# Add special characters correctly
manager.add_unit("Aevos Jhovan", 1, "Special character HQ with retinue")
print("✓ Added Aevos Jhovan (special character)")

manager.add_unit("Davinite Lodge Priest", 1, "Special character")
print("✓ Added Davinite Lodge Priest")

# Update notes on Lasrifle Sections to reflect flexibility
with db.atomic():
    item = CollectionItem.get(
        (CollectionItem.collection == manager.collection) &
        (CollectionItem.unit_name == "Lasrifle Section")
    )
    item.notes = "120 models - can be configured as Lasrifle/Tactical Command/etc"
    item.save()
    print("✓ Updated Lasrifle Section notes (flexible configuration)")

print("\n" + "="*60)
print("Collection updated!")
print("="*60)
print("\nYour collection now correctly shows:")
print("  • Aevos Jhovan (special character HQ)")
print("  • Davinite Lodge Priest (special character)")
print("  • 120 Auxiliaries (flexible loadouts)")
