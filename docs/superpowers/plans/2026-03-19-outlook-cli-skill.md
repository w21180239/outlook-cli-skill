# outlook-cli-skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hybrid CLI + skill toolkit that gives any AI agent Outlook email capabilities via Microsoft Graph API, without running an MCP server.

**Architecture:** A zero-dependency Node.js CLI (`outlook-auth`) handles OAuth 2.0 PKCE and device code authentication, storing tokens as plaintext JSON. Five Markdown skill files provide curl templates for 26 email operations across 4 categories. AGENTS.md enables self-installation by any AI agent.

**Tech Stack:** Node.js 18+ (built-in `fetch`, `crypto`, `http`), TypeScript, Markdown skills

**Spec:** `docs/superpowers/specs/2026-03-19-outlook-cli-skill-design.md`

---

## File Map

### CLI (`cli/`)

| File | Responsibility |
|------|---------------|
| `cli/package.json` | Package config, bin entry, scripts |
| `cli/tsconfig.json` | TypeScript config (ES2022, ESM) |
| `cli/src/index.ts` | CLI entry point — parse args, dispatch to commands |
| `cli/src/auth/config.ts` | OAuth endpoints, scopes, tenant URL builders |
| `cli/src/auth/tokenStore.ts` | Read/write `~/.outlook-auth/{config,tokens}.json`, chmod 600 |
| `cli/src/auth/pkce.ts` | PKCE flow: code_verifier/challenge, localhost server, browser open, code exchange |
| `cli/src/auth/deviceCode.ts` | Device code flow: request code, poll for token |
| `cli/src/commands/login.ts` | `login [--device-code]` command |
| `cli/src/commands/token.ts` | `token` command — output valid access token, auto-refresh |
| `cli/src/commands/status.ts` | `status [--json]` command |
| `cli/src/commands/logout.ts` | `logout` command — clear tokens |
| `cli/src/commands/config.ts` | `config set/show` command |

### Skills (`skills/`)

| File | Responsibility |
|------|---------------|
| `skills/outlook.md` | Router skill — token pattern, intent routing, error handling table, pagination |
| `skills/outlook-email.md` | 15 email operations with curl templates |
| `skills/outlook-folders.md` | 4 folder operations with curl templates |
| `skills/outlook-attachments.md` | 4 attachment operations with curl templates |
| `skills/outlook-rules.md` | 3 rule operations with curl templates |

### Project Root

| File | Responsibility |
|------|---------------|
| `AGENTS.md` | Self-install guide for AI agents |
| `README.md` | Human docs, Azure App setup, usage examples |
| `install.sh` | One-command installer |
| `.gitignore` | Ignore node_modules, dist, .outlook-auth |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `.gitignore`
- Create: `cli/package.json`
- Create: `cli/tsconfig.json`

- [ ] **Step 1: Initialize git repo**

```bash
cd ~/tools/outlook-cli-skill
git init
```

- [ ] **Step 2: Create .gitignore**

```gitignore
node_modules/
dist/
.outlook-auth/
*.js.map
```

- [ ] **Step 3: Create cli/package.json**

```json
{
  "name": "outlook-cli-skill",
  "version": "0.1.0",
  "description": "Lightweight OAuth CLI for Outlook email skills",
  "type": "module",
  "bin": {
    "outlook-auth": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc && chmod +x dist/index.js",
    "dev": "tsc --watch"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 4: Create cli/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 5: Install dev dependencies and verify build**

```bash
cd ~/tools/outlook-cli-skill/cli
npm install
npx tsc --version
```

Expected: TypeScript version printed, node_modules created.

- [ ] **Step 6: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add .gitignore cli/package.json cli/tsconfig.json cli/package-lock.json
git commit -m "chore: scaffold project with package.json and tsconfig"
```

---

## Task 2: Auth Config Module

**Files:**
- Create: `cli/src/auth/config.ts`

- [ ] **Step 1: Create auth config with OAuth endpoints and scopes**

```typescript
// cli/src/auth/config.ts

export const OAUTH_SCOPES = [
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'User.Read',
  'MailboxSettings.ReadWrite',
  'offline_access',
].join(' ');

export function authorizeUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
}

export function tokenUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
}

export function deviceCodeUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/devicecode`;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd ~/tools/outlook-cli-skill/cli && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add cli/src/auth/config.ts
git commit -m "feat: add OAuth config with endpoints and scopes"
```

---

## Task 3: Token Store

**Files:**
- Create: `cli/src/auth/tokenStore.ts`

- [ ] **Step 1: Create token store module**

Handles reading/writing `~/.outlook-auth/config.json` and `~/.outlook-auth/tokens.json` with chmod 600.

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

```bash
cd ~/tools/outlook-cli-skill/cli && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add cli/src/auth/tokenStore.ts
git commit -m "feat: add token store for config and token persistence"
```

---

## Task 4: PKCE Auth Flow

**Files:**
- Create: `cli/src/auth/pkce.ts`

- [ ] **Step 1: Create PKCE module**

Handles code_verifier/challenge generation, localhost callback server, browser open, and code-to-token exchange.

```typescript
// cli/src/auth/pkce.ts

import crypto from 'node:crypto';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { authorizeUrl, tokenUrl, OAUTH_SCOPES } from './config.js';
import { saveTokens } from './tokenStore.js';
import type { StoredTokens } from './tokenStore.js';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

function generateVerifier(): string {
  return crypto.randomBytes(64).toString('base64url');
}

function generateChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function openBrowser(url: string): void {
  const platform = process.platform;
  let cmd: string;
  let args: string[];

  switch (platform) {
    case 'darwin':
      cmd = 'open';
      args = [url];
      break;
    case 'win32':
      cmd = 'cmd';
      args = ['/c', 'start', '', url];
      break;
    default:
      cmd = 'xdg-open';
      args = [url];
      break;
  }

  execFile(cmd, args, (error) => {
    if (error) {
      console.error(`Could not open browser automatically. Please visit the URL above manually.`);
    }
  });
}

async function exchangeCode(
  clientId: string,
  tenantId: string,
  code: string,
  verifier: string,
  redirectUri: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const response = await fetch(tokenUrl(tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token exchange failed (HTTP ${response.status}): ${body}`);
  }

  return (await response.json()) as TokenResponse;
}

export async function loginWithPKCE(clientId: string, tenantId: string): Promise<StoredTokens> {
  const verifier = generateVerifier();
  const challenge = generateChallenge(verifier);
  const state = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    // Capture redirectUri in outer scope — server.address() returns null after close()
    let capturedRedirectUri = '';

    const server = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url!, `http://localhost`);

      if (reqUrl.pathname !== '/callback') return;

      const code = reqUrl.searchParams.get('code');
      const returnedState = reqUrl.searchParams.get('state');

      if (returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><p>State mismatch. Please try again.</p>');
        server.close();
        reject(new Error('State mismatch — possible CSRF attack'));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><p>No authorization code received.</p>');
        server.close();
        reject(new Error('No authorization code received'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Success!</h1><p>You can close this tab and return to your terminal.</p>');
      server.close();

      try {
        const tokenResponse = await exchangeCode(clientId, tenantId, code, verifier, capturedRedirectUri);

        const stored: StoredTokens = {
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token,
          expires_at: Date.now() + tokenResponse.expires_in * 1000,
          scope: tokenResponse.scope,
        };
        saveTokens(stored);
        resolve(stored);
      } catch (err) {
        reject(err);
      }
    });

    server.listen(0, () => {
      const addr = server.address() as { port: number };
      const port = addr.port;
      capturedRedirectUri = `http://localhost:${port}/callback`;

      const authUrlObj = new URL(authorizeUrl(tenantId));
      authUrlObj.searchParams.set('client_id', clientId);
      authUrlObj.searchParams.set('response_type', 'code');
      authUrlObj.searchParams.set('redirect_uri', capturedRedirectUri);
      authUrlObj.searchParams.set('scope', OAUTH_SCOPES);
      authUrlObj.searchParams.set('state', state);
      authUrlObj.searchParams.set('code_challenge', challenge);
      authUrlObj.searchParams.set('code_challenge_method', 'S256');
      authUrlObj.searchParams.set('prompt', 'select_account');

      const fullUrl = authUrlObj.toString();
      console.error(`\nOpening browser for Microsoft login...`);
      console.error(`If it doesn't open, visit: ${fullUrl}\n`);
      openBrowser(fullUrl);
    });

    server.on('error', reject);

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Login timed out after 5 minutes'));
    }, 5 * 60 * 1000);
  });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd ~/tools/outlook-cli-skill/cli && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add cli/src/auth/pkce.ts
git commit -m "feat: add PKCE auth flow with localhost callback"
```

---

## Task 5: Device Code Auth Flow

**Files:**
- Create: `cli/src/auth/deviceCode.ts`

- [ ] **Step 1: Create device code module**

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

```bash
cd ~/tools/outlook-cli-skill/cli && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add cli/src/auth/deviceCode.ts
git commit -m "feat: add device code auth flow for headless environments"
```

---

## Task 6: CLI Commands

**Files:**
- Create: `cli/src/commands/login.ts`
- Create: `cli/src/commands/token.ts`
- Create: `cli/src/commands/status.ts`
- Create: `cli/src/commands/logout.ts`
- Create: `cli/src/commands/config.ts`

- [ ] **Step 1: Create login command**

```typescript
// cli/src/commands/login.ts

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
```

- [ ] **Step 2: Create token command**

```typescript
// cli/src/commands/token.ts

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
    // Token is still valid — output to stdout
    process.stdout.write(tokens.access_token);
    return;
  }

  // Token expired — try refresh
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
```

- [ ] **Step 3: Create status command**

```typescript
// cli/src/commands/status.ts

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

  // Human-readable output
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
```

- [ ] **Step 4: Create logout command**

```typescript
// cli/src/commands/logout.ts

import { clearTokens } from '../auth/tokenStore.js';

export function logoutCommand(): void {
  clearTokens();
  console.log('Logged out. Tokens cleared.');
}
```

- [ ] **Step 5: Create config command**

```typescript
// cli/src/commands/config.ts

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
```

- [ ] **Step 6: Verify all commands compile**

```bash
cd ~/tools/outlook-cli-skill/cli && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add cli/src/commands/
git commit -m "feat: add all CLI commands (login, token, status, logout, config)"
```

---

## Task 7: CLI Entry Point

**Files:**
- Create: `cli/src/index.ts`

- [ ] **Step 1: Create CLI entry point with arg parsing**

```typescript
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
```

- [ ] **Step 2: Build and verify CLI runs**

```bash
cd ~/tools/outlook-cli-skill/cli && npm run build
head -1 dist/index.js  # Verify shebang preserved
node dist/index.js --help
```

Expected: First line is `#!/usr/bin/env node`. Usage text printed.

- [ ] **Step 3: Link globally and test**

```bash
cd ~/tools/outlook-cli-skill/cli && npm link && outlook-auth --help
```

Expected: `outlook-auth` command works globally, prints usage.

- [ ] **Step 4: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add cli/src/index.ts
git commit -m "feat: add CLI entry point with command dispatch"
```

---

## Task 8: Router Skill (outlook.md)

**Files:**
- Create: `skills/outlook.md`

- [ ] **Step 1: Write the router skill**

The router skill should contain:
- Skill frontmatter (name, description)
- Prerequisites (outlook-auth installed and authenticated)
- Token acquisition pattern
- Intent-to-sub-skill routing table
- Error handling table (401, 403, 404, 429, 5xx)
- Pagination pattern (`@odata.nextLink`)
- High-stakes action confirmation list
- Common query conventions ($top, $select, $filter, $orderby, date formats)

Key content for the routing table:

| User intent keywords | Sub-skill to Read |
|---|---|
| email, mail, send, reply, forward, draft, inbox, unread, search | outlook-email.md |
| folder, mailbox, subfolder | outlook-folders.md |
| attachment, download, upload, file attached | outlook-attachments.md |
| rule, auto-sort, inbox rule, filter mail | outlook-rules.md |

- [ ] **Step 2: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add skills/outlook.md
git commit -m "feat: add router skill with error handling and routing table"
```

---

## Task 9: Email Sub-Skill (outlook-email.md)

**Files:**
- Create: `skills/outlook-email.md`

- [ ] **Step 1: Write the email skill with all 15 operations**

Each operation needs: section heading, brief description, complete curl template, key response fields.

Operations to include (reference existing MCP tool implementations for Graph API paths and parameters):

1. **List emails** — `GET /me/mailFolders/{folder}/messages` with `$top`, `$orderby`, `$select`, `$filter`
2. **Search emails** — `GET /me/messages?$search="keyword"` with `$top`, `$select`
3. **Get email** — `GET /me/messages/{id}` with `$select`
4. **Send email** — `POST /me/sendMail` with message JSON body
5. **Reply** — `POST /me/messages/{id}/reply` with comment
6. **Reply all** — `POST /me/messages/{id}/replyAll` with comment
7. **Forward** — `POST /me/messages/{id}/forward` with toRecipients + comment
8. **Create draft** — `POST /me/messages` (or `POST /me/messages/{id}/createReply` for reply drafts)
9. **Delete email** — `DELETE /me/messages/{id}` (permanent) or `POST /me/messages/{id}/move` to deletedItems
10. **Move email** — `POST /me/messages/{id}/move` with destinationId
11. **Mark as read/unread** — `PATCH /me/messages/{id}` with `{"isRead": true/false}`
12. **Flag email** — `PATCH /me/messages/{id}` with flag object
13. **Categorize email** — `PATCH /me/messages/{id}` with categories array
14. **Archive email** — `POST /me/messages/{id}/move` with archive folder ID
15. **Batch process** — skill-level pattern: loop over message IDs applying any of the above operations

- [ ] **Step 2: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add skills/outlook-email.md
git commit -m "feat: add email skill with 15 operations"
```

---

## Task 10: Folders Sub-Skill (outlook-folders.md)

**Files:**
- Create: `skills/outlook-folders.md`

- [ ] **Step 1: Write the folders skill with 4 operations**

1. **List folders** — `GET /me/mailFolders` with `$top`, include child folders via `?includeHiddenFolders=true`
2. **Create folder** — `POST /me/mailFolders` with `{"displayName": "..."}` (or `POST /me/mailFolders/{parentId}/childFolders` for subfolders)
3. **Rename folder** — `PATCH /me/mailFolders/{id}` with `{"displayName": "..."}`
4. **Get folder stats** — `GET /me/mailFolders/{id}` — returns totalItemCount, unreadItemCount

- [ ] **Step 2: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add skills/outlook-folders.md
git commit -m "feat: add folders skill with 4 operations"
```

---

## Task 11: Attachments Sub-Skill (outlook-attachments.md)

**Files:**
- Create: `skills/outlook-attachments.md`

- [ ] **Step 1: Write the attachments skill with 4 operations**

1. **List attachments** — `GET /me/messages/{messageId}/attachments` with `$select`
2. **Download attachment** — `GET /me/messages/{messageId}/attachments/{attachmentId}` — response contains `contentBytes` (base64). Decode: `echo "$CONTENT_BYTES" | base64 -d > output.file`
3. **Add attachment** — `POST /me/messages/{messageId}/attachments` with `{"@odata.type": "#microsoft.graph.fileAttachment", "name": "...", "contentBytes": "..."}` (for drafts)
4. **Scan attachments** — skill-level pattern: list emails with `hasAttachments eq true`, then list attachments per message, report name/size/contentType

- [ ] **Step 2: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add skills/outlook-attachments.md
git commit -m "feat: add attachments skill with 4 operations"
```

---

## Task 12: Rules Sub-Skill (outlook-rules.md)

**Files:**
- Create: `skills/outlook-rules.md`

- [ ] **Step 1: Write the rules skill with 3 operations**

1. **List rules** — `GET /me/mailFolders/inbox/messageRules`
2. **Create rule** — `POST /me/mailFolders/inbox/messageRules` with conditions/actions JSON
3. **Delete rule** — `DELETE /me/mailFolders/inbox/messageRules/{id}`

Include an example rule body for "move emails from X to folder Y":

```json
{
  "displayName": "Move from Alice to Projects",
  "conditions": {
    "senderContains": ["alice@example.com"]
  },
  "actions": {
    "moveToFolder": "{folderId}"
  },
  "isEnabled": true
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add skills/outlook-rules.md
git commit -m "feat: add rules skill with 3 operations"
```

---

## Task 13: AGENTS.md

**Files:**
- Create: `AGENTS.md`

- [ ] **Step 1: Write the agent self-install guide**

Must include:
1. What this project is (one paragraph)
2. Installation steps (agent-executable):
   - Install CLI: `cd <repo>/cli && npm install && npm run build && npm link`
   - Detect AI tool + install skills:
     - Claude Code: `ln -sf <repo>/skills/<file>.md ~/.shared-ai-skills/<file>.md` (fallback `~/.claude/skills/`)
     - Cursor: `cp skills/*.md ~/.cursor/skills/`
     - Codex: `cp skills/*.md ~/.codex/skills/`
     - Other: read directly from repo
   - Check config: `outlook-auth config show`
   - If not configured: guide user to README.md "Step 1", then `outlook-auth config set clientId <id> tenantId <id>`
   - Auth: `outlook-auth login`
   - Verify: `outlook-auth status`
3. Usage section (after installation):
   - Token pattern: `TOKEN=$(outlook-auth token)`
   - Base URL: `https://graph.microsoft.com/v1.0/me`
   - Reference to skill files for curl templates
4. High-stakes actions requiring user confirmation

- [ ] **Step 2: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add AGENTS.md
git commit -m "docs: add AGENTS.md for AI agent self-installation"
```

---

## Task 14: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the human-facing documentation**

Sections:
1. **Header** — project name, one-line description, badges (optional)
2. **How it works** — brief architecture explanation (CLI + skills + curl)
3. **Step 1: Register Azure App** — adapted from mcp-outlook-lite + XenoXilus:
   - Azure Portal → App registrations → New
   - Account type (work vs personal)
   - Redirect URI: **Mobile and desktop applications** → `http://localhost`
   - Enable "Allow public client flows"
   - API permissions: Mail.Read, Mail.ReadWrite, Mail.Send, User.Read, MailboxSettings.ReadWrite, offline_access
   - Copy Client ID + Tenant ID
   - Warning: personal accounts → `consumers`
4. **Step 2: Install** — `./install.sh` or manual steps
5. **Step 3: Configure & login**
   - `outlook-auth config set clientId <id> tenantId <id>`
   - `outlook-auth login`
6. **Supported operations** — table with 4 categories, 26 ops
7. **Example prompts** — email-focused examples
8. **For AI agents** — pointer to AGENTS.md
9. **Configuration reference** — env vars table
10. **License** — MIT

- [ ] **Step 2: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add README.md
git commit -m "docs: add README with Azure setup guide and usage docs"
```

---

## Task 15: install.sh

**Files:**
- Create: `install.sh`

- [ ] **Step 1: Write the installer script**

```bash
#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== outlook-cli-skill installer ==="
echo ""

# 1. Build and link CLI
echo "Installing outlook-auth CLI..."
cd "$REPO_DIR/cli" && npm install && npm run build && npm link
echo "✓ outlook-auth command available"
echo ""

# 2. Detect AI tools and install skills
install_skills() {
  local target="$1"
  local method="$2"
  mkdir -p "$target"
  for f in "$REPO_DIR"/skills/*.md; do
    local base
    base="$(basename "$f")"
    if [ "$method" = "symlink" ]; then
      ln -sf "$f" "$target/$base"
    else
      cp "$f" "$target/$base"
    fi
  done
  echo "✓ Skills installed to $target ($method)"
}

INSTALLED=0

if [ -d "$HOME/.shared-ai-skills" ]; then
  install_skills "$HOME/.shared-ai-skills" "symlink"
  INSTALLED=1
elif [ -d "$HOME/.claude" ]; then
  install_skills "$HOME/.claude/skills" "symlink"
  INSTALLED=1
fi

if [ -d "$HOME/.cursor" ]; then
  install_skills "$HOME/.cursor/skills" "symlink"
  INSTALLED=1
fi

if [ -d "$HOME/.codex" ]; then
  install_skills "$HOME/.codex/skills" "symlink"
  INSTALLED=1
fi

if [ "$INSTALLED" -eq 0 ]; then
  echo "⚠ No AI tool config directories detected."
  echo "  Manually copy skills/*.md to your AI tool's skills directory."
fi

echo ""
echo "=== Next steps ==="
echo "1. Set up Azure App (see README.md Step 1) if you haven't already"
echo "2. outlook-auth config set clientId <your-id> tenantId <your-id>"
echo "3. outlook-auth login"
echo "4. outlook-auth status"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x ~/tools/outlook-cli-skill/install.sh
```

- [ ] **Step 3: Commit**

```bash
cd ~/tools/outlook-cli-skill
git add install.sh
git commit -m "feat: add install.sh for one-command setup"
```

---

## Task 16: End-to-End Verification

- [ ] **Step 1: Clean build from scratch**

```bash
cd ~/tools/outlook-cli-skill/cli
rm -rf node_modules dist
npm install && npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 2: Verify CLI commands work**

```bash
outlook-auth --help
outlook-auth config show
outlook-auth status
outlook-auth status --json
```

Expected: All commands produce sensible output without crashing.

- [ ] **Step 3: Verify all files present**

```bash
cd ~/tools/outlook-cli-skill
ls -la AGENTS.md README.md install.sh
ls -la skills/*.md
ls -la cli/dist/index.js
```

Expected: All files exist.

- [ ] **Step 4: Verify install.sh runs**

```bash
cd ~/tools/outlook-cli-skill && bash install.sh
```

Expected: CLI builds, skills installed to detected AI tool directories.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
cd ~/tools/outlook-cli-skill
git status
# If there are changes, commit them
```
