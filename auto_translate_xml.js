#!/usr/bin/env node
/**
 * Auto-translate Android strings.xml from English to Thai using Google Translate API.
 * Preserves string formatting placeholders (%1$s, %d, etc.) and XML structure.
 */

const fs = require('fs');
const path = require('path');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

// Simple Google Translate using free API (no key needed)
async function translateText(text, src = 'en', dest = 'th') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src}&tl=${dest}&dt=t&q=${encodeURIComponent(text)}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0].trim();
    }
  } catch (e) {
    console.error(`Translation failed: ${e.message}`);
  }
  return text; // Return original on failure
}

// Placeholder protector
const PLACEHOLDER_PATTERN = /%(\d+\$)?[+-]?(\d+)?(\.\d+)?[sdlf%xXeEgGaA]/g;

class PlaceholderProtector {
  constructor() {
    this.placeholders = {};
    this.counter = 0;
  }
  
  protect(text) {
    return text.replace(PLACEHOLDER_PATTERN, (match) => {
      const token = `__PH_${this.counter}__`;
      this.placeholders[token] = match;
      this.counter++;
      return token;
    });
  }
  
  restore(text) {
    for (const [token, original] of Object.entries(this.placeholders)) {
      text = text.replace(new RegExp(token, 'g'), original);
    }
    return text;
  }
}

async function translateStringsXml(inputPath, outputPath) {
  console.log(`Reading: ${inputPath}`);
  
  const xmlContent = fs.readFileSync(inputPath, 'utf-8');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  const stringElements = doc.getElementsByTagName('string');
  const total = stringElements.length;
  console.log(`Found ${total} string elements`);
  
  let translatedCount = 0;
  let skippedCount = 0;
  
  for (let i = 0; i < stringElements.length; i++) {
    const elem = stringElements[i];
    const name = elem.getAttribute('name');
    const text = elem.textContent;
    
    if (!text || text.trim() === '') {
      skippedCount++;
      continue;
    }
    
    // Skip if already Thai (contains Thai characters)
    if (/[\u0E00-\u0E7F]/.test(text)) {
      skippedCount++;
      continue;
    }
    
    const protector = new PlaceholderProtector();
    const protectedText = protector.protect(text);
    
    console.log(`  Translating [${translatedCount + 1}/${total}]: ${name}`);
    const translated = await translateText(protectedText);
    const finalText = protector.restore(translated);
    
    // Update element text content
    while (elem.firstChild) {
      elem.removeChild(elem.firstChild);
    }
    elem.appendChild(doc.createTextNode(finalText));
    
    translatedCount++;
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 150));
  }
  
  // Write output
  const serializer = new XMLSerializer();
  let outputXml = serializer.serializeToString(doc);
  
  // Ensure XML declaration
  if (!outputXml.startsWith('<?xml')) {
    outputXml = '<?xml version="1.0" encoding="utf-8"?>\n' + outputXml;
  }
  
  // Pretty print (basic)
  outputXml = outputXml
    .replace(/><\//g, '>\n</')
    .replace(/>\\s*</g, '>\n<');
  
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, outputXml, 'utf-8');
  
  console.log(`\n✅ Done!`);
  console.log(`   Translated: ${translatedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${total}`);
  console.log(`   Output: ${outputPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node auto_translate_xml.js <input.xml> <output.xml>');
    process.exit(1);
  }
  
  const [inputPath, outputPath] = args;
  await translateStringsXml(inputPath, outputPath);
}

main().catch(console.error);