"""Debug category map."""
from src.bsdata.catalogue_loader import SolarAuxiliaCatalogue

cat = SolarAuxiliaCatalogue()

print(f"Category map size: {len(cat.category_map)}")
print("\nFirst 10 entries:")
for i, (unit_id, category) in enumerate(list(cat.category_map.items())[:10]):
    print(f"  {unit_id[:20]}... -> {category}")

# Check if Legatine Command Section is in there
legatine_id = "8641-1dd0-7e76-de7d"
if legatine_id in cat.category_map:
    print(f"\n✓ Legatine Command Section found: {cat.category_map[legatine_id]}")
else:
    print(f"\n✗ Legatine Command Section ({legatine_id}) NOT in map")

# Get unit and check
unit = cat.get_unit_by_name("Legatine Command Section")
if unit:
    print(f"\nUnit lookup result:")
    print(f"  ID: {unit['bs_id']}")
    print(f"  Category: {unit['unit_type']}")
