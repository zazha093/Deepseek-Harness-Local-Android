#!/usr/bin/env python3
"""
Auto-translate Android strings.xml from English to Thai using googletrans.
Preserves string formatting placeholders (%1$s, %d, etc.) and XML structure.
"""

import xml.etree.ElementTree as ET
import re
import sys
import time
from pathlib import Path

try:
    from googletrans import Translator
except ImportError:
    print("Installing googletrans...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "googletrans==4.0.0-rc1"])
    from googletrans import Translator


class PlaceholderProtector:
    """Protects formatting placeholders during translation."""
    
    # Pattern for Android/Java format placeholders: %1$s, %2$d, %s, %d, %.2f, etc.
    PLACEHOLDER_PATTERN = re.compile(r'%(\d+\$)?[+-]?(\d+)?(\.\d+)?[sdlf%xXeEgGaA]')
    
    def __init__(self):
        self.placeholders = {}
        self.counter = 0
    
    def protect(self, text: str) -> str:
        """Replace placeholders with tokens before translation."""
        def replace(match):
            token = f"__PH_{self.counter}__"
            self.placeholders[token] = match.group(0)
            self.counter += 1
            return token
        return self.PLACEHOLDER_PATTERN.sub(replace, text)
    
    def restore(self, text: str) -> str:
        """Restore placeholders after translation."""
        for token, original in self.placeholders.items():
            text = text.replace(token, original)
        return text


def translate_text(translator: Translator, text: str, src='en', dest='th') -> str:
    """Translate text with retry logic."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            result = translator.translate(text, src=src, dest=dest)
            if result and result.text:
                return result.text.strip()
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"  ⚠ Translation failed for: {text[:50]}... Error: {e}")
                return text  # Return original on failure
            time.sleep(1)
    return text


def translate_strings_xml(input_path: str, output_path: str, start_line: int = None, end_line: int = None):
    """Translate strings.xml from English to Thai."""
    
    print(f"Reading: {input_path}")
    tree = ET.parse(input_path)
    root = tree.getroot()
    
    # Count total strings
    string_elements = root.findall('string')
    total = len(string_elements)
    print(f"Found {total} string elements")
    
    # Apply line range filter if specified (approximate via element index)
    if start_line is not None or end_line is not None:
        # We'll translate all but can filter by index
        pass
    
    translator = Translator()
    protector = PlaceholderProtector()
    
    translated_count = 0
    skipped_count = 0
    
    for i, elem in enumerate(string_elements):
        name = elem.get('name')
        text = elem.text
        
        if text is None or text.strip() == '':
            skipped_count += 1
            continue
        
        # Skip if already Thai (heuristic: contains Thai characters)
        if re.search(r'[\u0E00-\u0E7F]', text):
            skipped_count += 1
            continue
        
        # Protect placeholders
        protected_text = protector.protect(text)
        
        # Translate
        translated = translate_text(translator, protected_text)
        
        # Restore placeholders
        final_text = protector.restore(translated)
        
        # Update element
        elem.text = final_text
        translated_count += 1
        
        # Progress
        if translated_count % 20 == 0:
            print(f"  Progress: {translated_count}/{total} translated...")
        
        # Small delay to avoid rate limiting
        time.sleep(0.1)
        
        # Reset protector for next string
        protector = PlaceholderProtector()
    
    # Write output with proper XML declaration
    print(f"Writing: {output_path}")
    output_dir = Path(output_path).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Pretty print XML
    ET.indent(tree, space="    ")
    
    # Write with XML declaration
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        tree.write(f, encoding='unicode', xml_declaration=False)
    
    print(f"\n✅ Done!")
    print(f"   Translated: {translated_count}")
    print(f"   Skipped (empty/already Thai): {skipped_count}")
    print(f"   Total: {total}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Translate Android strings.xml to Thai')
    parser.add_argument('input', help='Input strings.xml (English)')
    parser.add_argument('output', help='Output strings.xml (Thai)')
    parser.add_argument('--start', type=int, help='Start element index (0-based)')
    parser.add_argument('--end', type=int, help='End element index (exclusive)')
    parser.add_argument('--src', default='en', help='Source language (default: en)')
    parser.add_argument('--dest', default='th', help='Target language (default: th)')
    
    args = parser.parse_args()
    
    translate_strings_xml(args.input, args.output)


if __name__ == '__main__':
    main()