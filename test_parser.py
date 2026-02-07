"""Test BSData parser."""
from src.bsdata.parser import BattleScribeParser
from pathlib import Path

cat_path = Path("data/bsdata/Solar Auxilia.cat")
parser = BattleScribeParser(cat_path)

print("Catalogue info:")
print(parser.get_catalogue_info())
print()

# Test the get_all_selection_entries method
print("Testing get_all_selection_entries()...")
all_units = parser.get_all_selection_entries(entry_type='unit')
all_models = parser.get_all_selection_entries(entry_type='model')
all_upgrades = parser.get_all_selection_entries(entry_type='upgrade')

print(f"Type='unit': {len(all_units)}")
print(f"Type='model': {len(all_models)}")
print(f"Type='upgrade': {len(all_upgrades)}")
print()

# Get some unit examples
print(f"First 5 units:")
for unit in all_units[:5]:
    print(f"  - {unit.get('name')} (id: {unit.get('id')})")
