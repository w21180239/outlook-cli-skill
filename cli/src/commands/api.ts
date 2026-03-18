// cli/src/commands/api.ts
// Wrapper for Microsoft Graph API calls — handles token, base URL, headers automatically.

import { loadConfig, loadTokens, saveTokens, isTokenExpired } from '../auth/tokenStore.js';
import { tokenUrl } from '../auth/config.js';
import type { StoredTokens } from '../auth/tokenStore.js';

const BASE_URL = 'https://graph.microsoft.com/v1.0/me';

async function getValidToken(clientId: string, tenantId: string, tokens: StoredTokens): Promise<string> {
  if (!isTokenExpired(tokens)) {
    return tokens.access_token;
  }

  // Refresh
  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  });

  const response = await fetch(tokenUrl(tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const body = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    if (body.error === 'invalid_grant') {
      console.error('Error: Session expired. Run: outlook-auth login');
      process.exit(1);
    }
    throw new Error(`Token refresh failed: ${body.error}`);
  }

  const refreshed: StoredTokens = {
    access_token: body.access_token as string,
    refresh_token: (body.refresh_token as string) || tokens.refresh_token,
    expires_at: Date.now() + (body.expires_in as number) * 1000,
    scope: (body.scope as string) || '',
  };
  saveTokens(refreshed);
  return refreshed.access_token;
}

export async function apiCommand(args: string[]): Promise<void> {
  const config = loadConfig();
  if (!config || !config.clientId || !config.tenantId) {
    console.error('Error: Not configured. Run: outlook-auth config set clientId <id> tenantId <id>');
    process.exit(1);
  }

  const tokens = loadTokens();
  if (!tokens) {
    console.error('Error: Not logged in. Run: outlook-auth login');
    process.exit(1);
  }

  // Parse args: METHOD PATH [-d BODY]
  const method = (args[0] || '').toUpperCase();
  let apiPath = args[1] || '';

  if (!method || !apiPath) {
    console.error('Usage: outlook-auth api <METHOD> <path> [-d <json-body>]');
    console.error('');
    console.error('Examples:');
    console.error('  outlook-auth api GET /mailFolders/inbox/messages?\\$top=5');
    console.error('  outlook-auth api POST /sendMail -d \'{"message":{...}}\'');
    console.error('  outlook-auth api PATCH /messages/{id} -d \'{"isRead":true}\'');
    console.error('  outlook-auth api DELETE /messages/{id}');
    process.exit(1);
  }

  // Find -d flag for request body
  let body: string | undefined;
  const dashD = args.indexOf('-d');
  if (dashD !== -1 && args[dashD + 1]) {
    body = args[dashD + 1];
  }

  // Ensure path starts with /
  if (!apiPath.startsWith('/')) {
    apiPath = '/' + apiPath;
  }

  const token = await getValidToken(config.clientId, config.tenantId, tokens);
  const url = `${BASE_URL}${apiPath}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body || undefined,
  });

  // Handle no-content responses (202, 204)
  if (response.status === 204 || (response.status === 202 && response.headers.get('content-length') === '0')) {
    // Success with no body — output status for the agent
    console.log(JSON.stringify({ status: response.status, ok: true }));
    return;
  }

  const responseBody = await response.text();

  if (!response.ok) {
    console.error(`HTTP ${response.status}`);
    // Still output the error body so the agent can see it
    process.stdout.write(responseBody);
    process.exit(1);
  }

  process.stdout.write(responseBody);
}
