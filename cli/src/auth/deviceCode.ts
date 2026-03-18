// cli/src/auth/deviceCode.ts

import { deviceCodeUrl, tokenUrl, OAUTH_SCOPES } from './config.js';
import { saveTokens } from './tokenStore.js';
import type { StoredTokens } from './tokenStore.js';

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
  message: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export function isHeadlessEnvironment(): boolean {
  if (process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.SSH_CONNECTION) return true;
  if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) return true;
  if (process.env.container || process.env.DOCKER_CONTAINER) return true;
  return false;
}

async function requestDeviceCode(clientId: string, tenantId: string): Promise<DeviceCodeResponse> {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: OAUTH_SCOPES,
  });

  const response = await fetch(deviceCodeUrl(tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Device code request failed (HTTP ${response.status}): ${body}`);
  }

  return (await response.json()) as DeviceCodeResponse;
}

async function pollForToken(
  clientId: string,
  tenantId: string,
  deviceCode: string,
  interval: number,
  expiresIn: number
): Promise<TokenResponse> {
  const deadline = Date.now() + expiresIn * 1000;
  let pollInterval = interval;

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    device_code: deviceCode,
  });

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));

    const response = await fetch(tokenUrl(tenantId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const body = (await response.json()) as Record<string, unknown>;

    if (response.ok) {
      return body as unknown as TokenResponse;
    }

    const error = body.error as string;
    if (error === 'authorization_pending') continue;
    if (error === 'slow_down') { pollInterval += 5; continue; }
    if (error === 'authorization_declined') throw new Error('User declined authentication');
    if (error === 'expired_token') throw new Error('Device code expired. Please try again.');
    throw new Error(`Device code auth failed: ${error}`);
  }

  throw new Error('Device code authentication timed out');
}

export async function loginWithDeviceCode(clientId: string, tenantId: string): Promise<StoredTokens> {
  console.error('\n=== Device Code Authentication ===');
  console.error('Browser-based login is not available in this environment.\n');

  const dcResponse = await requestDeviceCode(clientId, tenantId);

  console.error(dcResponse.message);
  console.error(`\nCode: ${dcResponse.user_code}`);
  console.error(`URL:  ${dcResponse.verification_uri}`);
  console.error('\nWaiting for authentication...\n');

  const tokenResponse = await pollForToken(
    clientId,
    tenantId,
    dcResponse.device_code,
    dcResponse.interval,
    dcResponse.expires_in
  );

  const stored: StoredTokens = {
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token,
    expires_at: Date.now() + tokenResponse.expires_in * 1000,
    scope: tokenResponse.scope,
  };
  saveTokens(stored);

  console.error('Authentication successful!\n');
  return stored;
}
