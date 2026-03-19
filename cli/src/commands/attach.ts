// cli/src/commands/attach.ts
// Attach a file to a draft message via Microsoft Graph API.

import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, loadTokens } from '../auth/tokenStore.js';
import { getValidToken, BASE_URL } from '../auth/graphClient.js';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

export async function attachCommand(args: string[]): Promise<void> {
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

  // Parse args: <message-id> <file-path> [--name <display-name>]
  const messageId = args[0];
  const filePath = args[1];

  if (!messageId || !filePath) {
    console.error('Usage: outlook-auth attach <message-id> <file-path> [--name <display-name>]');
    console.error('');
    console.error('Attaches a file (up to 3 MB) to a draft message.');
    process.exit(1);
  }

  // Optional --name flag
  let displayName: string | undefined;
  const nameIdx = args.indexOf('--name');
  if (nameIdx !== -1 && args[nameIdx + 1]) {
    displayName = args[nameIdx + 1];
  }
  if (!displayName) {
    displayName = path.basename(filePath);
  }

  // Read and validate file
  let fileBuffer: Buffer;
  try {
    fileBuffer = fs.readFileSync(filePath);
  } catch (err) {
    console.error(`Error: Cannot read file "${filePath}": ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    console.error(`Error: File size (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB) exceeds 3 MB limit. Use an upload session for larger files.`);
    process.exit(1);
  }

  const contentBytes = fileBuffer.toString('base64');

  const token = await getValidToken(config.clientId, config.tenantId, tokens);
  const url = `${BASE_URL}/messages/${messageId}/attachments`;

  const payload = {
    '@odata.type': '#microsoft.graph.fileAttachment',
    name: displayName,
    contentBytes,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    console.error(`HTTP ${response.status}`);
    process.stdout.write(responseBody);
    process.exit(1);
  }

  process.stdout.write(responseBody);
}
