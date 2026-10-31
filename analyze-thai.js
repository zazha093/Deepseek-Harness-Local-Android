#!/usr/bin/env node
// Analyze Thai translation needs: compare upstream/main values with sync/upstream-1.4.40 values-th

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseStringsXml(xmlContent) {
  const strings = {};
  const regex = /<string\s+name="([^"]+)">([\s\S]*?)<\/string>/g;
  let match;
  while ((match = regex.exec(xmlContent)) !== null) {
    const key = match[1];
    const value = match[2];
    strings[key] = value;
  }
  return strings;
}

function getFileFromGit(ref, filePath) {
  try {
    const outputFile = filePath.replace(/\//g, '_').replace(/\./g, '_') + '.xml';
    execSync(`/data/user/0/app.dsh.mobile/files/engine/bin/bash -c "git show ${ref}:${filePath} > ${outputFile}"`, { 
      cwd: '/data/user/0/app.dsh.mobile/files/dsh-home/DSH-Fork/agent-work',
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10,
      shell: '/data/user/0/app.dsh.mobile/files/engine/bin/bash'
    });
    const content = fs.readFileSync(outputFile, 'utf8');
    fs.unlinkSync(outputFile);
    return content;
  } catch (e) {
    console.error(`Error reading ${ref}:${filePath}`, e.message);
    return null;
  }
}

// Get upstream/main values/strings.xml (base)
const upstreamValuesXml = getFileFromGit('upstream/main', 'app/src/main/res/values/strings.xml');
if (!upstreamValuesXml) {
  console.error('Failed to read upstream/main values/strings.xml');
  process.exit(1);
}
const upstreamStrings = parseStringsXml(upstreamValuesXml);
console.log(`Upstream/main values/strings.xml: ${Object.keys(upstreamStrings).length} keys`);

// Get sync/upstream-1.4.40 values-th/strings.xml (base Thai)
const syncThaiXml = getFileFromGit('sync/upstream-1.4.40', 'app/src/main/res/values-th/strings.xml');
if (!syncThaiXml) {
  console.error('Failed to read sync/upstream-1.4.40 values-th/strings.xml');
  process.exit(1);
}
const syncThaiStrings = parseStringsXml(syncThaiXml);
console.log(`Sync/upstream-1.4.40 values-th/strings.xml: ${Object.keys(syncThaiStrings).length} keys`);

// Get current agent-work values-th/strings.xml (current state)
const currentThaiPath = '/data/user/0/app.dsh.mobile/files/dsh-home/DSH-Fork/agent-work/app/src/main/res/values-th/strings.xml';
const currentThaiXml = fs.readFileSync(currentThaiPath, 'utf8');
const currentThaiStrings = parseStringsXml(currentThaiXml);
console.log(`Current agent-work values-th/strings.xml: ${Object.keys(currentThaiStrings).length} keys`);

// Fork-specific patterns to detect and fix
const forkPatterns = [
  { pattern: /1308/, desc: 'port 13080' },
  { pattern: /1309/, desc: 'port 13090' },
  { pattern: /DSH Thai/i, desc: 'DSH Thai name' },
  { pattern: /app\.dsh\.mobile\.th/i, desc: 'applicationId .th' },
];

// Category 1: Keys in sync Thai that upstream doesn't have (to remove)
const keysToRemove = [];
for (const key of Object.keys(syncThaiStrings)) {
  if (!upstreamStrings[key]) {
    keysToRemove.push(key);
  }
}
console.log(`\n=== Keys in sync Thai but NOT in upstream (to remove): ${keysToRemove.length} ===`);
keysToRemove.forEach(k => console.log(`  - ${k}: ${syncThaiStrings[k].substring(0, 80)}`));

// Category 2: Keys in sync Thai with fork-specific values (need restore to upstream)
const keysWithForkValues = [];
for (const key of Object.keys(syncThaiStrings)) {
  if (upstreamStrings[key]) {
    const value = syncThaiStrings[key];
    for (const fp of forkPatterns) {
      if (fp.pattern.test(value)) {
        keysWithForkValues.push({ key, value, upstreamValue: upstreamStrings[key], reason: fp.desc });
        break;
      }
    }
  }
}
console.log(`\n=== Keys with fork-specific values (need restore): ${keysWithForkValues.length} ===`);
keysWithForkValues.forEach(k => console.log(`  - ${k.key}: ${k.reason} -> "${k.upstreamValue.substring(0, 80)}"`));

// Category 3: Keys in upstream but NOT in sync Thai (need translation)
const keysNeedingTranslation = [];
for (const key of Object.keys(upstreamStrings)) {
  if (!syncThaiStrings[key]) {
    keysNeedingTranslation.push({ key, value: upstreamStrings[key] });
  }
}
console.log(`\n=== Keys in upstream but NOT in sync Thai (need translation): ${keysNeedingTranslation.length} ===`);
keysNeedingTranslation.slice(0, 20).forEach(k => console.log(`  - ${k.key}: ${k.value.substring(0, 80)}`));
if (keysNeedingTranslation.length > 20) {
  console.log(`  ... and ${keysNeedingTranslation.length - 20} more`);
}

// Write todo-keys.txt
const backupDir = '/data/user/0/app.dsh.mobile/files/dsh-home/backups/pr-thai';
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const todoPath = path.join(backupDir, 'todo-keys.txt');
let output = `# Thai Translation TODO\n`;
output += `# Generated: ${new Date().toISOString()}\n`;
output += `# Upstream keys: ${Object.keys(upstreamStrings).length}\n`;
output += `# Sync Thai keys: ${Object.keys(syncThaiStrings).length}\n`;
output += `# Keys to remove: ${keysToRemove.length}\n`;
output += `# Keys with fork values: ${keysWithForkValues.length}\n`;
output += `# Keys needing translation: ${keysNeedingTranslation.length}\n\n`;

output += `## KEYS TO REMOVE (not in upstream anymore)\n`;
keysToRemove.forEach(k => output += `${k}\n`);
output += `\n`;

output += `## KEYS WITH FORK-SPECIFIC VALUES (restore to upstream)\n`;
keysWithForkValues.forEach(k => output += `${k.key} | ${k.reason} | upstream: ${k.upstreamValue}\n`);
output += `\n`;

output += `## KEYS NEEDING TRANSLATION (in upstream, not in sync Thai)\n`;
keysNeedingTranslation.forEach(k => output += `${k.key} | ${k.value}\n`);

fs.writeFileSync(todoPath, output);
console.log(`\nWritten to ${todoPath}`);

// Also write just the keys needing translation for the translation script
const keysOnlyPath = path.join(backupDir, 'keys-to-translate.txt');
fs.writeFileSync(keysOnlyPath, keysNeedingTranslation.map(k => k.key).join('\n'));
console.log(`Keys only written to ${keysOnlyPath}`);