# outlook-cli-skill Design Spec

## Overview

Replace the outlook-mcp MCP server with a lightweight hybrid architecture: a Node.js CLI for OAuth authentication + Claude Code skills for Outlook email operations via Microsoft Graph API.

**Scope:** Email operations only (no calendar, no SharePoint). 26 tools across 4 categories.

## Architecture

```
User's AI Agent
      |
      | reads skill → gets curl template
      |
      v
  outlook.md (router)
      |
      | Read sub-skill based on intent
      v
  outlook-email.md / outlook-folders.md / outlook-attachments.md / outlook-rules.md
      |
      | $(outlook-auth token) → gets access token
      | curl → Microsoft Graph API
      v
  https://graph.microsoft.com/v1.0/me/...
```

Two components:

1. **outlook-auth CLI** — handles OAuth 2.0 PKCE + device code flow, token storage and refresh
2. **Skill files** — self-contained Markdown files with curl templates for Graph API operations

## Project Structure

```
~/tools/outlook-cli-skill/
├── AGENTS.md                   # Agent self-install guide
├── README.md                   # Human docs + Azure App setup
├── install.sh                  # One-command installer
│
├── cli/                        # Node.js auth CLI
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            # CLI entry (outlook-auth command)
│       ├── auth/
│       │   ├── pkce.ts         # PKCE browser login flow
│       │   ├── deviceCode.ts   # Device code headless login
│       │   ├── tokenStore.ts   # Token read/write (~/.outlook-auth/tokens.json)
│       │   └── config.ts       # Azure OAuth endpoints, scopes
│       └── commands/
│           ├── login.ts        # outlook-auth login [--device-code]
│           ├── token.ts        # outlook-auth token (stdout)
│           ├── status.ts       # outlook-auth status
│           ├── logout.ts       # outlook-auth logout
│           └── config.ts       # outlook-auth config set/show
│
├── skills/                     # Skill source files (install targets)
│   ├── outlook.md              # Main entry skill (router)
│   ├── outlook-email.md        # 15 email operations
│   ├── outlook-folders.md      # 4 folder operations
│   ├── outlook-attachments.md  # 4 attachment operations
│   └── outlook-rules.md        # 3 rule operations
│
└── docs/
    └── superpowers/specs/      # This spec
```

## Component 1: outlook-auth CLI

### Commands

| Command | Description |
|---------|-------------|
| `outlook-auth login [--device-code]` | OAuth login (PKCE or device code) |
| `outlook-auth token` | Output valid access token to stdout (auto-refresh if expired) |
| `outlook-auth status [--json]` | Show auth state, token expiry, scopes (--json for machine-readable output) |
| `outlook-auth logout` | Clear stored tokens |
| `outlook-auth config set <key> <value> [<key2> <value2> ...]` | Set one or more config keys (clientId, tenantId) |
| `outlook-auth config show` | Show current config |

### Storage

```
~/.outlook-auth/
├── config.json          # { "clientId": "...", "tenantId": "..." }
└── tokens.json          # File permissions: 600
                         # {
                         #   "access_token": "...",
                         #   "refresh_token": "...",
                         #   "expires_at": 1234567890,  (computed: now + expires_in)
                         #   "scope": "Mail.Read Mail.ReadWrite ..."
                         # }
```

### Auth Flow

```
outlook-auth login
       |
  Headless or --device-code?
       |
  NO → PKCE flow:
       1. Generate code_verifier (random 64 bytes, base64url)
       2. Compute code_challenge = SHA256(code_verifier), base64url
       3. Start temp HTTP server on localhost (random port)
       4. Open browser → Microsoft login with challenge
          (platform-specific: `open` on macOS, `xdg-open` on Linux, `start` on Windows
           via child_process.exec — no npm dependency needed)
       5. Receive auth code on localhost callback
       6. POST token endpoint: code + code_verifier → tokens
       7. Write tokens.json (chmod 600)
       |
  YES → Device code flow:
       1. POST device code endpoint → get user_code + verification_uri
       2. Print: "Go to {uri} and enter code: {code}"
       3. Poll token endpoint every 5s
       4. On success → write tokens.json (chmod 600)
```

```
outlook-auth token
       |
  Read tokens.json
       |
  access_token expired?
       | NO → print access_token to stdout
       | YES → POST token endpoint with refresh_token
              → update tokens.json
              → print new access_token to stdout
       |
  refresh_token invalid? (detect via `invalid_grant` error from token endpoint)
              → exit 1 with "Run: outlook-auth login"
  Note: Microsoft refresh tokens don't carry expires_at — detect expiry
  from the token endpoint's error response, not from a local timestamp.
```

### Dependencies

Zero npm runtime dependencies. Uses only Node.js built-in modules:

- `http` — localhost callback server for PKCE
- `crypto` — code_verifier/challenge generation
- `fs` — read/write config and token files
- `readline` — device code flow prompts (if needed)
- `fetch` — token endpoint HTTP calls (Node 18+ built-in)

Dev dependencies: `typescript`, `@types/node` only.

### OAuth Scopes

```
Mail.Read  Mail.ReadWrite  Mail.Send
User.Read  MailboxSettings.ReadWrite
offline_access
```

Minimal set — no Calendar, Files, Sites, Contacts, or Tasks scopes.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_CLIENT_ID` | Yes (or config.json) | Azure App client ID |
| `AZURE_TENANT_ID` | Yes (or config.json) | `consumers` for personal, tenant ID for work, `common` for both |

Env vars override config.json values.

## Component 2: Skill Files

### Skill Architecture

```
outlook.md (router)
    |
    | detects user intent
    | Read → loads sub-skill file
    v
outlook-email.md        (15 ops: list, search, get, send, reply, reply_all,
                          forward, create_draft, delete, move, mark_read,
                          flag, categorize, archive, batch_process)
Note: batch_process is a skill-level pattern — the agent loops over
multiple single API calls (not Graph $batch endpoint), applying the
same operation (e.g., markAsRead, move, delete) to a list of message IDs.
outlook-folders.md      (4 ops: list, create, rename, stats)
outlook-attachments.md  (4 ops: list, download, add, scan)
outlook-rules.md        (3 ops: list, create, delete)
```

### Main Skill (outlook.md)

Responsibilities:
- Token acquisition pattern: `TOKEN=$(outlook-auth token)`
- Route to sub-skill by user intent
- Common conventions: base URL, pagination, date filters
- Error handling table:
  - 401 → token expired, re-run `TOKEN=$(outlook-auth token)` and retry
  - 403 → insufficient permissions, inform user to check Azure App API permissions
  - 404 → resource not found (bad ID), inform user
  - 429 → rate limited, wait `Retry-After` header seconds and retry
  - 5xx → transient server error, retry once after 2s
- Pagination pattern: if response contains `@odata.nextLink`, follow that URL for next page
- High-stakes action confirmation list

### Sub-Skills

Each sub-skill file is self-contained and follows the same structure:

1. **Token section** — how to get token
2. **Base URL** — `https://graph.microsoft.com/v1.0/me`
3. **Operations** — each operation has:
   - Section heading with operation name
   - Brief description
   - Complete curl template with placeholder parameters
   - Response format notes (key fields to extract)

Curl templates are directly executable — agent substitutes parameters and runs.

### Example: Send Email (from outlook-email.md)

```bash
TOKEN=$(outlook-auth token)
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://graph.microsoft.com/v1.0/me/sendMail" \
  -d '{
    "message": {
      "subject": "{subject}",
      "body": {
        "contentType": "HTML",
        "content": "{body}"
      },
      "toRecipients": [
        { "emailAddress": { "address": "{to}" } }
      ],
      "ccRecipients": [],
      "bccRecipients": []
    }
  }'
```

## Component 3: AGENTS.md (Self-Install Guide)

AGENTS.md serves as the universal entry point for any AI agent accessing this repo.

### Installation Steps (agent-executable)

1. **Install CLI**: `cd <repo>/cli && npm install && npm run build && npm link`
2. **Detect AI tool** and install skills:
   - Claude Code → symlink `skills/*.md` to `~/.shared-ai-skills/` (fallback `~/.claude/skills/`)
   - Cursor → symlink `skills/*.md` to `~/.cursor/skills/`
   - Codex → symlink `skills/*.md` to `~/.codex/skills/`
   - Other → read directly from repo
3. **Auth**: run `outlook-auth login` (or guide user to set up Azure App first if no config)
4. **Verify**: `outlook-auth status`

### Azure App Prerequisite Handling

If `outlook-auth login` fails due to missing config, AGENTS.md instructs the agent to:
1. Direct user to README.md "Step 1: Register Azure App"
2. After user provides IDs: `outlook-auth config set clientId <id> tenantId <id>`
3. Retry login

## Component 4: README.md

### Azure App Registration Guide

Adapted from mcp-outlook-lite (concise) + XenoXilus/outlook-mcp (detailed steps):

1. Azure Portal → App registrations → New registration
2. Account type guidance:
   - Work/school: "Accounts in this organizational directory only"
   - Personal (outlook.com/hotmail.com): "Accounts in any org directory and personal Microsoft accounts"
3. Redirect URI: Select **Mobile and desktop applications** platform → `http://localhost`
   (no port, no path — Azure AD will accept any localhost port, which is required for PKCE's random-port callback)
4. Authentication → Enable "Allow public client flows"
5. API permissions → Microsoft Graph → Delegated:
   - `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`
   - `User.Read`, `MailboxSettings.ReadWrite`
   - `offline_access`
6. Copy Application (client) ID and Directory (tenant) ID
7. **Warning**: Personal accounts MUST use `consumers` as Tenant ID

### Installation Sections

- Quick install via `install.sh`
- Manual install steps
- Supported AI tools table

### Usage Examples

Email-focused example prompts.

## Component 5: install.sh

One-command installer that:
1. Builds and links CLI globally
2. Detects existing AI tool config directories
3. Symlinks skill files to detected directories
4. Prints next-steps guidance

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Zero npm dependencies for CLI | Minimize install surface, no supply chain risk, Node 18+ has everything needed |
| Plaintext token storage (chmod 600) | Personal tool, file permissions sufficient. Avoids keytar/native module complexity |
| Skills as Markdown, not code | Universal — any AI agent can Read and follow, no framework dependency |
| Symlink skills (not copy) | `git pull` on repo automatically updates installed skills |
| Single router skill + sub-skills | Router is small (low token cost for routing), sub-skills load on demand |
| curl (not WebFetch) | Full REST control (any method, headers, body), debug-transparent |
| Env vars override config.json | Flexible — works with CI, containers, and local dev |

## Out of Scope

- Calendar operations
- SharePoint / OneDrive integration
- Attachment content parsing (Word/Excel/PPT) — download raw files only
- Token encryption — deferred, can add later if needed
- Rate limiting logic in skills — rely on Graph API 429 response + agent retry
