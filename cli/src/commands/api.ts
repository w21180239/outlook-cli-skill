// cli/src/commands/api.ts
// Wrapper for Microsoft Graph API calls — handles token, base URL, headers automatically.

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadConfig, loadTokens } from '../auth/tokenStore.js';
import { getValidToken, BASE_URL } from '../auth/graphClient.js';

// Git Bash rewrites a leading-slash arg like /messages/x into <msys-root>/messages/x
// (e.g. D:/Git/messages/x) before node sees it; args containing '?' are left alone,
// which is why GETs with query strings worked while plain POST paths 404'd.
export function undoMsysPathConversion(apiPath: string, msysRoot?: string): string {
  if (!/^[A-Za-z]:[\\/]/.test(apiPath)) return apiPath;
  let root = msysRoot;
  if (root === undefined && process.env.MSYSTEM) {
    try {
      root = execFileSync('cygpath', ['-m', '/'], { encoding: 'utf-8' }).trim();
    } catch {
      root = undefined;
    }
  }
  const normalised = apiPath.replace(/\\/g, '/');
  if (root) {
    const r = root.replace(/\\/g, '/').replace(/\/+$/, '');
    if (normalised.toLowerCase().startsWith(r.toLowerCase() + '/')) {
      return normalised.slice(r.length);
    }
  }
  console.error(`Error: path "${apiPath}" looks like a filesystem path, not a Graph path.`);
  console.error('Git Bash rewrites leading-slash args; rerun with MSYS_NO_PATHCONV=1.');
  process.exit(1);
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    // If stdin is a TTY (no pipe), return empty immediately
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
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

  // Parse args: METHOD PATH [-d BODY | -d @file | --stdin]
  const method = (args[0] || '').toUpperCase();
  let apiPath = args[1] || '';

  if (!method || !apiPath) {
    console.error('Usage: outlook-auth api <METHOD> <path> [-d <json-body> | -d @<file> | --stdin]');
    console.error('');
    console.error('Examples:');
    console.error('  outlook-auth api GET /mailFolders/inbox/messages?\\$top=5');
    console.error('  outlook-auth api POST /sendMail -d \'{"message":{...}}\'');
    console.error('  outlook-auth api POST /sendMail -d @payload.json');
    console.error('  echo \'{"message":{...}}\' | outlook-auth api POST /sendMail --stdin');
    console.error('  outlook-auth api PATCH /messages/{id} -d \'{"isRead":true}\'');
    console.error('  outlook-auth api DELETE /messages/{id}');
    process.exit(1);
  }

  // Determine request body
  let body: string | undefined;
  const useStdin = args.includes('--stdin');

  if (useStdin) {
    const stdinData = await readStdin();
    if (stdinData.trim()) {
      body = stdinData;
    }
  } else {
    const dashD = args.indexOf('-d');
    if (dashD !== -1 && args[dashD + 1]) {
      const dValue = args[dashD + 1];
      if (dValue.startsWith('@')) {
        const filePath = dValue.slice(1);
        try {
          body = fs.readFileSync(filePath, 'utf-8');
        } catch (err) {
          console.error(`Error: Cannot read file "${filePath}": ${err instanceof Error ? err.message : err}`);
          process.exit(1);
        }
      } else {
        body = dValue;
      }
    }
  }

  apiPath = undoMsysPathConversion(apiPath);

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
