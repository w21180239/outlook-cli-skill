import { loadConfig, loadTokens, isTokenExpired } from '../auth/tokenStore.js';

export function statusCommand(args: string[]): void {
  const config = loadConfig();
  const tokens = loadTokens();
  const jsonMode = args.includes('--json');

  const status = {
    configured: !!(config?.clientId && config?.tenantId),
    clientId: config?.clientId ?? null,
    tenantId: config?.tenantId ?? null,
    authenticated: false,
    tokenExpired: true,
    expiresAt: null as string | null,
    scope: null as string | null,
  };

  if (tokens) {
    status.authenticated = true;
    status.tokenExpired = isTokenExpired(tokens);
    status.expiresAt = new Date(tokens.expires_at).toISOString();
    status.scope = tokens.scope;
  }

  if (jsonMode) {
    process.stdout.write(JSON.stringify(status, null, 2) + '\n');
    return;
  }

  console.log(`Configured:    ${status.configured ? 'Yes' : 'No'}`);
  if (status.configured) {
    console.log(`Client ID:     ${status.clientId}`);
    console.log(`Tenant ID:     ${status.tenantId}`);
  }
  console.log(`Authenticated: ${status.authenticated ? 'Yes' : 'No'}`);
  if (status.authenticated) {
    console.log(`Token expired: ${status.tokenExpired ? 'Yes' : 'No'}`);
    console.log(`Expires at:    ${status.expiresAt}`);
    console.log(`Scopes:        ${status.scope}`);
  }
}
