"""Test namespace XPath."""
from lxml import etree

cat_path = "data/bsdata/Solar Auxilia.cat"
tree = etree.parse(cat_path)
root = tree.getroot()

# Get namespace
nsmap = root.nsmap
if None in nsmap:
    ns = {'bs': nsmap[None]}
    print(f"Namespace: {ns}")

    # Test with namespace
    result = root.xpath('.//bs:selectionEntry[@type="unit"]', namespaces=ns)
    print(f"With namespace: {len(result)} units")

    if result:
        print("\nFirst 5 units:")
        for unit in result[:5]:
            print(f"  - {unit.get('name')}")
else:
    print("No namespace")
