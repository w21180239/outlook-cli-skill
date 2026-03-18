import { loadConfig, loadTokens, saveTokens, isTokenExpired } from '../auth/tokenStore.js';
import { tokenUrl } from '../auth/config.js';
import type { StoredTokens } from '../auth/tokenStore.js';

async function refreshToken(clientId: string, tenantId: string, refreshToken: string): Promise<StoredTokens> {
  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenUrl(tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const body = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const error = body.error as string;
    if (error === 'invalid_grant') {
      throw new Error('REAUTH_REQUIRED');
    }
    throw new Error(`Token refresh failed: ${error}`);
  }

  return {
    access_token: body.access_token as string,
    refresh_token: (body.refresh_token as string) || refreshToken,
    expires_at: Date.now() + (body.expires_in as number) * 1000,
    scope: (body.scope as string) || '',
  };
}

export async function tokenCommand(): Promise<void> {
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

  if (!isTokenExpired(tokens)) {
    process.stdout.write(tokens.access_token);
    return;
  }

  try {
    const refreshed = await refreshToken(config.clientId, config.tenantId, tokens.refresh_token);
    saveTokens(refreshed);
    process.stdout.write(refreshed.access_token);
  } catch (err) {
    if (err instanceof Error && err.message === 'REAUTH_REQUIRED') {
      console.error('Error: Session expired. Run: outlook-auth login');
      process.exit(1);
    }
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
