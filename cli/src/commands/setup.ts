// cli/src/commands/setup.ts
// Point ~/.outlook-auth/config.json at a file in another repo (e.g. personal-credentials).
// Two modes: symlink (live link — edits in source propagate) or copy (independent snapshot).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export async function setupCommand(args: string[]): Promise<void> {
  const sub = args[0];

  if (sub === 'help' || sub === '--help' || sub === '-h') {
    console.log(`
outlook-auth setup — wire config into ~/.outlook-auth/

Usage:
  outlook-auth setup symlink <path-to-config.json>
    Symlink <path> → ~/.outlook-auth/config.json (live link; edits propagate)

  outlook-auth setup copy <path-to-config.json>
    Copy <path> → ~/.outlook-auth/config.json (independent local copy)

  outlook-auth setup reset
    Remove the symlink/copy so config reverts to the default location
    (~/.outlook-auth/config.json without a pointer).

Examples:
  outlook-auth setup symlink ~/tools/personal-credentials/outlook/config.json
  outlook-auth setup copy  /Volumes/Keys/outlook/config.json
  outlook-auth setup reset
`.trim());
    return;
  }

  const action = args[0];
  const src = args[1];
  const target = path.join(os.homedir(), '.outlook-auth', 'config.json');

  if (action === 'reset') {
    try { fs.unlinkSync(target); } catch {}
    try { fs.unlinkSync(target + '.sym'); } catch {}
    console.log('Reset: removed ~/.outlook-auth/config.json');
    return;
  }

  if (!action || !src) {
    console.error('Usage: outlook-auth setup <symlink|copy|reset> [path]');
    process.exit(1);
  }
  if (action !== 'symlink' && action !== 'copy') {
    console.error('Invalid action: ' + action + '. Use symlink, copy, or reset.');
    process.exit(1);
  }
  if (!fs.existsSync(src)) {
    console.error('Source not found: ' + src);
    process.exit(1);
  }

  const resolved = path.resolve(src);
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
  } catch {}

  if (action === 'symlink') {
    try { fs.unlinkSync(target); } catch {}
    try { fs.unlinkSync(target + '.sym'); } catch {}
    // Use a marker file so reset can find the source path
    fs.writeFileSync(target + '.sym', resolved, 'utf-8');
    fs.symlinkSync(resolved, target);
    console.log('Symlinked: ' + target + ' -> ' + resolved);
  } else {
    // copy mode: store source path alongside the copy for traceability
    const raw = fs.readFileSync(resolved, 'utf-8');
    fs.writeFileSync(target, raw, { mode: 0o600 });
    fs.writeFileSync(target + '.sym', resolved, 'utf-8');
    console.log('Copied: ' + target + ' <- ' + resolved);
  }

  console.log('Next: run  outlook-auth login');
}
