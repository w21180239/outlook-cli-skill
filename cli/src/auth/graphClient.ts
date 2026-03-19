// cli/src/auth/graphClient.ts
// Shared Graph API helpers — token refresh + base URL.

import { saveTokens, isTokenExpired } from './tokenStore.js';
import { tokenUrl } from './config.js';
import type { StoredTokens } from './tokenStore.js';

export const BASE_URL = 'https://graph.microsoft.com/v1.0/me';

export async function getValidToken(clientId: string, tenantId: string, tokens: StoredTokens): Promise<string> {
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
