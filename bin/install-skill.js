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

// Read skill template and inject absolute reference paths
let skillContent = fs.readFileSync(SKILL_FILE, 'utf-8');

// Replace the reference file resolution section with baked-in absolute paths
skillContent = skillContent.replace(
  /## Reference Files[\s\S]*?URL-encode/,
  `## Reference Files

Load the appropriate reference file (via Read tool) based on user intent:

| Intent | Reference File |
|--------|---------------|
| Email (read, send, search, reply, forward, draft, delete, move, flag) | \`${REF_DIR}/outlook-email.md\` |
| Folders (list, create, rename, stats) | \`${REF_DIR}/outlook-folders.md\` |
| Attachments (list, download, add, scan) | \`${REF_DIR}/outlook-attachments.md\` |
| Inbox rules (list, create, delete) | \`${REF_DIR}/outlook-rules.md\` |

## Error Handling

\`outlook-auth api\` exits code 1 on errors, printing the error body.

| Status | Action |
|--------|--------|
| 401 | Run \`outlook-auth login\` to re-authenticate |
| 403 | User needs to check Azure App API permissions |
| 404 | Bad message/folder ID — inform user |
| 429 | Rate limited — wait a few seconds, retry |
| 5xx | Transient error — retry once after 2s |

## Pagination

If response contains \`@odata.nextLink\`, follow it for more results:

\`\`\`bash
outlook-auth api GET '<nextLink-path-after-/me>'
\`\`\`

## High-Stakes Actions (confirm with user first)

- Sending emails (send, reply, reply all, forward)
- Deleting emails or rules
- Creating inbox rules

## Common Query Patterns

| Pattern | Example |
|---------|---------|
| Limit | \`$top=10\` |
| Select fields | \`$select=id,subject,from,receivedDateTime\` |
| Sort | \`$orderby=receivedDateTime desc\` |
| Filter | \`$filter=isRead eq false\` |
| Date filter | \`$filter=receivedDateTime ge 2024-01-01T00:00:00Z\` |

URL-encode`
);

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
  const skillDir = path.join(target, 'outlook');
  fs.mkdirSync(skillDir, { recursive: true });
  const dest = path.join(skillDir, 'SKILL.md');
  fs.writeFileSync(dest, skillContent);
  console.log(`Skill installed to ${dest}`);
}

console.log('');
console.log('Next steps:');
console.log('  1. Set up Azure App (see https://github.com/w21180239/outlook-cli-skill#azure-app-setup)');
console.log('  2. outlook-auth config set clientId <your-id> tenantId <your-id>');
console.log('  3. outlook-auth login');
console.log('  4. outlook-auth status');
