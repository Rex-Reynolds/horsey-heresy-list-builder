"""Debug category parsing."""
from src.bsdata.parser import BattleScribeParser
from pathlib import Path

cat_path = Path("data/bsdata/Solar Auxilia.cat")
parser = BattleScribeParser(cat_path)

# Get a unit
units = parser.get_all_selection_entries(entry_type='unit')
first_unit = units[0]

print(f"Unit: {first_unit.get('name')}")
print(f"ID: {first_unit.get('id')}")
print()

# Try to find categoryLinks
print("Looking for categoryLinks...")

# Direct children
print(f"Direct children: {len(list(first_unit))}")
for child in first_unit:
    tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
    print(f"  - {tag} ({child.get('name', 'no name')})")

# Try XPath with namespace
cat_links = parser._xpath(first_unit, './categoryLinks/categoryLink')
print(f"\nCategoryLinks found: {len(cat_links)}")
for cat in cat_links:
    print(f"  - {cat.get('name')} (primary: {cat.get('primary')})")

# Parse the whole entry
print("\n\nParsing full entry...")
parsed = parser.parse_selection_entry(first_unit)
print(f"Category links in parsed data: {parsed['category_links']}")
