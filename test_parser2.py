"""Debug XML parsing."""
from lxml import etree

cat_path = "data/bsdata/Solar Auxilia.cat"
tree = etree.parse(cat_path)
root = tree.getroot()

print(f"Root tag: {root.tag}")
print(f"Root attribs: {root.attrib}")
print(f"Namespace map: {root.nsmap}")
print()

# Try to find children
print(f"Direct children: {len(list(root))}")
for child in list(root)[:5]:
    print(f"  - {child.tag} ({child.get('name', 'no name')})")
