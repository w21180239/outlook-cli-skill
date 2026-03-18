import { loadConfig } from '../auth/tokenStore.js';
import { loginWithPKCE } from '../auth/pkce.js';
import { loginWithDeviceCode, isHeadlessEnvironment } from '../auth/deviceCode.js';

export async function loginCommand(args: string[]): Promise<void> {
  const config = loadConfig();
  if (!config || !config.clientId || !config.tenantId) {
    console.error('Error: No Azure App configured.');
    console.error('Run: outlook-auth config set clientId <your-id> tenantId <your-id>');
    console.error('Or set AZURE_CLIENT_ID and AZURE_TENANT_ID environment variables.');
    process.exit(1);
  }

  const useDeviceCode = args.includes('--device-code') || isHeadlessEnvironment();

  try {
    if (useDeviceCode) {
      await loginWithDeviceCode(config.clientId, config.tenantId);
    } else {
      await loginWithPKCE(config.clientId, config.tenantId);
    }
    console.error('Login successful!');
  } catch (err) {
    console.error(`Login failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
