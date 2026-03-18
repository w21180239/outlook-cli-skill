// cli/src/auth/tokenStore.ts

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const AUTH_DIR = path.join(os.homedir(), '.outlook-auth');
const CONFIG_PATH = path.join(AUTH_DIR, 'config.json');
const TOKENS_PATH = path.join(AUTH_DIR, 'tokens.json');

export interface AppConfig {
  clientId: string;
  tenantId: string;
}

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
}

function ensureDir(): void {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { mode: 0o700 });
  }
}

// --- App Config ---

export function loadConfig(): AppConfig | null {
  // Env vars override file
  const clientId = process.env.AZURE_CLIENT_ID;
  const tenantId = process.env.AZURE_TENANT_ID;
  if (clientId && tenantId) {
    return { clientId, tenantId };
  }

  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      clientId: clientId ?? parsed.clientId ?? '',
      tenantId: tenantId ?? parsed.tenantId ?? '',
    };
  } catch {
    return null;
  }
}

export function saveConfig(config: AppConfig): void {
  ensureDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

// --- Tokens ---

export function loadTokens(): StoredTokens | null {
  if (!fs.existsSync(TOKENS_PATH)) return null;
  try {
    const raw = fs.readFileSync(TOKENS_PATH, 'utf-8');
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: StoredTokens): void {
  ensureDir();
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

export function clearTokens(): void {
  if (fs.existsSync(TOKENS_PATH)) {
    fs.unlinkSync(TOKENS_PATH);
  }
}

export function isTokenExpired(tokens: StoredTokens): boolean {
  // Consider expired 60 seconds before actual expiry for safety margin
  return Date.now() >= tokens.expires_at - 60_000;
}
