import { loadConfig, saveConfig } from '../auth/tokenStore.js';
import type { AppConfig } from '../auth/tokenStore.js';

const VALID_KEYS = ['clientId', 'tenantId'] as const;

export function configCommand(args: string[]): void {
  const subcommand = args[0];

  if (subcommand === 'show') {
    const config = loadConfig();
    if (!config) {
      console.log('No configuration found.');
      console.log('Run: outlook-auth config set clientId <id> tenantId <id>');
      return;
    }
    console.log(`Client ID: ${config.clientId || '(not set)'}`);
    console.log(`Tenant ID: ${config.tenantId || '(not set)'}`);
    return;
  }

  if (subcommand === 'set') {
    const pairs = args.slice(1);
    if (pairs.length === 0 || pairs.length % 2 !== 0) {
      console.error('Usage: outlook-auth config set <key> <value> [<key2> <value2> ...]');
      console.error('Valid keys: clientId, tenantId');
      process.exit(1);
    }

    const existing = loadConfig() || { clientId: '', tenantId: '' };
    const updated: AppConfig = { ...existing };

    for (let i = 0; i < pairs.length; i += 2) {
      const key = pairs[i] as (typeof VALID_KEYS)[number];
      const value = pairs[i + 1];
      if (!VALID_KEYS.includes(key)) {
        console.error(`Unknown key: ${key}. Valid keys: ${VALID_KEYS.join(', ')}`);
        process.exit(1);
      }
      updated[key] = value;
    }

    saveConfig(updated);
    console.log('Configuration saved.');
    return;
  }

  console.error('Usage: outlook-auth config <show|set>');
  process.exit(1);
}
