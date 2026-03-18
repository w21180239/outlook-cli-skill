#!/usr/bin/env node
// cli/src/index.ts

import { loginCommand } from './commands/login.js';
import { tokenCommand } from './commands/token.js';
import { statusCommand } from './commands/status.js';
import { logoutCommand } from './commands/logout.js';
import { configCommand } from './commands/config.js';

const USAGE = `
outlook-auth — OAuth CLI for Outlook email skills

Commands:
  login [--device-code]                  Sign in to Microsoft account
  token                                  Output valid access token (auto-refresh)
  status [--json]                        Show auth state
  logout                                 Clear stored tokens
  config set <key> <value> [...]         Set clientId / tenantId
  config show                            Show current config

Environment variables (override config.json):
  AZURE_CLIENT_ID                        Azure App client ID
  AZURE_TENANT_ID                        Tenant ID (use "consumers" for personal accounts)
`.trim();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'login':
      await loginCommand(args.slice(1));
      break;
    case 'token':
      await tokenCommand();
      break;
    case 'status':
      statusCommand(args.slice(1));
      break;
    case 'logout':
      logoutCommand();
      break;
    case 'config':
      configCommand(args.slice(1));
      break;
    case '--help':
    case '-h':
    case undefined:
      console.log(USAGE);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(USAGE);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Fatal: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
