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

  const child = execFile(cmd, args, (error) => {
    if (error) {
      console.error(`Could not open browser automatically. Please visit the URL above manually.`);
    }
  });
  child.unref();
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
        res.writeHead(400, { 'Content-Type': 'text/html', 'Connection': 'close' });
        res.end('<h1>Error</h1><p>State mismatch. Please try again.</p>');
        server.close();
        server.closeAllConnections();
        reject(new Error('State mismatch — possible CSRF attack'));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html', 'Connection': 'close' });
        res.end('<h1>Error</h1><p>No authorization code received.</p>');
        server.close();
        server.closeAllConnections();
        reject(new Error('No authorization code received'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Connection': 'close' });
      res.end('<h1>Success!</h1><p>You can close this tab and return to your terminal.</p>');
      server.close();
      server.closeAllConnections();

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

    // Ensure server shuts down promptly after close() by disabling keep-alive
    server.keepAliveTimeout = 0;

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
    const timeout = setTimeout(() => {
      server.close();
      server.closeAllConnections();
      reject(new Error('Login timed out after 5 minutes'));
    }, 5 * 60 * 1000);
    timeout.unref();
  });
}
