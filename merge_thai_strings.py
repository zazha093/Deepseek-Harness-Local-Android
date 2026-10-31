#!/usr/bin/env python3
"""
Merge old Thai translations with new v1.4.76 base strings.
Preserves placeholders and only uses old Thai translations for matching keys.
"""

import xml.etree.ElementTree as ET
import sys
from pathlib import Path

def parse_strings_xml(filepath):
    """Parse strings.xml and return dict of name -> (value, has_placeholders)"""
    tree = ET.parse(filepath)
    root = tree.getroot()
    strings = {}
    for string_elem in root.findall('string'):
        name = string_elem.get('name')
        if name:
            # Get the full text including any child elements (though strings usually don't have children)
            text = string_elem.text if string_elem.text else ''
            # Check for placeholders like %1$s, %2$d, etc.
            has_placeholders = '%' in text and '$' in text
            strings[name] = (text, has_placeholders)
    return strings

def write_strings_xml(output_path, strings_dict):
    """Write strings dictionary to strings.xml format"""
    root = ET.Element('resources')
    root.text = '\n    '
    root.tail = '\n'
    
    for name in sorted(strings_dict.keys()):
        value, _ = strings_dict[name]
        string_elem = ET.SubElement(root, 'string', name=name)
        string_elem.text = value
        string_elem.tail = '\n    '
    
    # Fix the last element's tail
    if len(root) > 0:
        root[-1].tail = '\n'
    
    tree = ET.ElementTree(root)
    # Write with proper formatting
    ET.indent(tree, space='    ', level=0)
    tree.write(output_path, encoding='utf-8', xml_declaration=True)

def main():
    old_thai_path = Path('/data/user/0/app.dsh.mobile/files/dsh-home/DSH-Fork/agent-work/old_thai_strings.xml')
    new_base_path = Path('/data/user/0/app.dsh.mobile/files/dsh-home/DSH-Fork/agent-work/new_base_strings.xml')
    output_path = Path('/data/user/0/app.dsh.mobile/files/dsh-home/DSH-Fork/agent-work/app/src/main/res/values-th/strings.xml')
    
    # Parse both files
    old_thai = parse_strings_xml(old_thai_path)
    new_base = parse_strings_xml(new_base_path)
    
    print(f"Old Thai strings: {len(old_thai)}")
    print(f"New base strings: {len(new_base)}")
    
    # Merge: keep Thai for keys that exist in old Thai, use English for new keys
    merged = {}
    thai_count = 0
    new_keys = 0
    
    for key, (base_value, has_placeholders) in new_base.items():
        if key in old_thai:
            thai_value, _ = old_thai[key]
            # Preserve Thai translation
            merged[key] = (thai_value, has_placeholders)
            thai_count += 1
        else:
            # New key in v1.4.76 - use English (base) value
            merged[key] = (base_value, has_placeholders)
            new_keys += 1
    
    print(f"Keys with Thai translation: {thai_count}")
    print(f"New keys (using English): {new_keys}")
    print(f"Total keys in merged: {len(merged)}")
    
    # Check for placeholder preservation
    base_with_placeholders = sum(1 for v in new_base.values() if v[1])
    merged_with_placeholders = sum(1 for v in merged.values() if v[1])
    print(f"Base strings with placeholders: {base_with_placeholders}")
    print(f"Merged strings with placeholders: {merged_with_placeholders}")
    
    # Create output directory if needed
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write merged strings
    write_strings_xml(output_path, merged)
    print(f"\nWritten to: {output_path}")

if __name__ == '__main__':
    main()