#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const SKILL_FILE = path.join(SKILLS_DIR, 'outlook.md');
const REF_DIR = path.join(SKILLS_DIR, 'references');

const args = process.argv.slice(2);
const command = args[0];

if (command !== 'install') {
  console.log(`
outlook-cli-skill — Turn Outlook email into AI skills

Commands:
  install    Install the outlook skill to your AI tool's skills directory

After install, use 'outlook-auth' for authentication management.
  `.trim());
  process.exit(0);
}

// Read skill template and inject absolute reference path
let skillContent = fs.readFileSync(SKILL_FILE, 'utf-8');
skillContent = skillContent.replace(
  /## Loading Reference Files[\s\S]*?(\| Intent)/,
  `## Loading Reference Files

The detailed curl templates and API wrapper examples are in reference files.

**Reference directory:** \`${REF_DIR}\`

Use the Read tool to load the appropriate reference file based on user intent:

$1`
);
skillContent = skillContent.replace(/\`\$REF_DIR\//g, `\`${REF_DIR}/`);

// Detect AI tool directories
const targets = [];

const sharedSkills = path.join(os.homedir(), '.shared-ai-skills');
const claudeSkills = path.join(os.homedir(), '.claude', 'skills');
const cursorSkills = path.join(os.homedir(), '.cursor', 'skills');
const codexSkills = path.join(os.homedir(), '.codex', 'skills');

if (fs.existsSync(sharedSkills)) {
  targets.push(sharedSkills);
} else if (fs.existsSync(path.join(os.homedir(), '.claude'))) {
  targets.push(claudeSkills);
}

if (fs.existsSync(path.join(os.homedir(), '.cursor'))) {
  targets.push(cursorSkills);
}

if (fs.existsSync(path.join(os.homedir(), '.codex'))) {
  targets.push(codexSkills);
}

if (targets.length === 0) {
  console.log('No AI tool directories detected.');
  console.log('Manually copy the skill file to your AI tool\'s skills directory:');
  console.log(`  ${SKILL_FILE}`);
  process.exit(0);
}

for (const target of targets) {
  fs.mkdirSync(target, { recursive: true });
  const dest = path.join(target, 'outlook.md');
  fs.writeFileSync(dest, skillContent);
  console.log(`Skill installed to ${dest}`);
}

console.log('');
console.log('Next steps:');
console.log('  1. Set up Azure App (see https://github.com/w21180239/outlook-cli-skill#azure-app-setup)');
console.log('  2. outlook-auth config set clientId <your-id> tenantId <your-id>');
console.log('  3. outlook-auth login');
console.log('  4. outlook-auth status');
