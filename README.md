# outlook-cli-skill

Turn Outlook email into AI skills — no MCP server required.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-blue)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()

---

## Why Skills Over MCP?

|  | outlook-cli-skill | MCP-based servers |
|---|---|---|
| **Runtime** | No server process, zero overhead | Long-running MCP server process |
| **Install** | `npm i -g` + one command | Clone repo, configure MCP client JSON |
| **Agent support** | Any AI agent (Claude, Cursor, Codex, Gemini...) | Only MCP-compatible clients |
| **Token cost** | Load only the operations you need | All 46 tool schemas loaded every session |
| **Auth** | Same PKCE, zero secrets | Same |
| **Maintenance** | Skill files + thin CLI wrapper | Full TypeScript server to maintain |

---

## How It Works

```
AI Agent → invokes outlook skill → gets API template
    ↓
outlook-auth api GET /messages → handles token + headers automatically
    ↓
Microsoft Graph API → results
```

Two components:
- **`outlook-auth` CLI** — handles OAuth (PKCE + device code), token refresh, and API calls
- **Skill file** — tells your AI agent what operations are available and how to call them

---

## Quick Start

```bash
npm install -g outlook-cli-skill
outlook-cli-skill install
outlook-auth config set clientId YOUR_CLIENT_ID tenantId YOUR_TENANT_ID
outlook-auth login
```

That's it. Your AI agent now has Outlook email capabilities.

---

<details>
<summary><b>Azure App Setup (one-time, 5 min)</b></summary>

### Step 1: Register an app

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) → **New registration**
2. Name: anything (e.g., "Outlook CLI Skill")
3. Supported account types:
   - **Work/school**: "Accounts in this organizational directory only"
   - **Personal** (outlook.com, hotmail.com): "Accounts in any organizational directory and personal Microsoft accounts"
4. Redirect URI: select **Mobile and desktop applications** → `http://localhost`

### Step 2: Enable public client

Go to **Authentication** → enable **Allow public client flows** → **Save**

### Step 3: Add API permissions

Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**:

- `Mail.ReadWrite`
- `Mail.Send`
- `User.Read`
- `MailboxSettings.ReadWrite`

### Step 4: Copy your IDs

On the **Overview** page, copy:
- **Application (client) ID**
- **Directory (tenant) ID**

> **Personal accounts** (outlook.com, hotmail.com, live.com): use `consumers` as Tenant ID — **not** the Directory ID from Azure Portal.

No client secret needed. This uses PKCE (public client) authentication.

</details>

---

## Supported Operations

| Category | Count | Operations |
|----------|-------|-----------|
| Email | 15 | List, search, get, send, reply, reply all, forward, draft, delete, move, mark read, flag, categorize, archive, batch |
| Folders | 4 | List, create, rename, stats |
| Attachments | 4 | List, download, add, scan |
| Rules | 3 | List, create, delete |

---

## Example Prompts

```
"Show me unread emails from this week"
"Find all emails from Alice about the budget"
"Reply to that email thanking her for the update"
"Move all newsletters to the Archive folder"
"Download the PDF attachment from the latest Finance email"
```

---

## API Wrapper

The `outlook-auth api` command wraps Microsoft Graph API calls — no need to manage tokens or headers manually:

```bash
# List recent emails
outlook-auth api GET '/mailFolders/inbox/messages?$top=5&$select=subject,from,receivedDateTime'

# Send an email
outlook-auth api POST /sendMail -d '{"message":{"subject":"Hi","body":{"contentType":"Text","content":"Hello!"},"toRecipients":[{"emailAddress":{"address":"alice@example.com"}}]}}'

# Mark as read
outlook-auth api PATCH '/messages/{id}' -d '{"isRead": true}'

# Delete
outlook-auth api DELETE '/messages/{id}'
```

All paths are relative to `https://graph.microsoft.com/v1.0/me`.

---

## For AI Agents

> If you're an AI agent, read [`AGENTS.md`](AGENTS.md) for automated installation instructions.

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `outlook-auth login [--device-code]` | Sign in to Microsoft |
| `outlook-auth token` | Output raw access token |
| `outlook-auth status [--json]` | Show auth state |
| `outlook-auth logout` | Clear stored tokens |
| `outlook-auth config set <key> <value>` | Set config values |
| `outlook-auth config show` | Show current config |
| `outlook-auth api <METHOD> <path> [-d body]` | Call Graph API |

---

## How PKCE Auth Works

```
outlook-auth login
       |
  Token cached? ──yes──> Use it
       | no
  Refresh works? ──yes──> Silent refresh
       | no
  PKCE flow:
    1. Generate code_verifier + code_challenge
    2. Browser opens → Microsoft login
    3. Redirect to localhost with auth code
    4. Exchange code + verifier for tokens
    5. Store tokens locally (chmod 600)
```

No client secret anywhere. Tokens are stored in `~/.outlook-auth/` with restricted permissions.

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_CLIENT_ID` | Yes | Application (client) ID from Azure |
| `AZURE_TENANT_ID` | Yes | `consumers` for personal, tenant ID for work, `common` for both |

Environment variables override `~/.outlook-auth/config.json`.

---

<details>
<summary><b>Alternative: Clone Install</b></summary>

```bash
git clone https://github.com/w21180239/outlook-cli-skill.git
cd outlook-cli-skill
./install.sh
```

</details>

---

## See Also

**[mcp-outlook-lite](https://github.com/w21180239/mcp-outlook-lite)** — Full-featured Outlook MCP server by the same author. 46 tools covering email, calendar, attachments, SharePoint, and rules. Best for MCP-compatible clients (Claude Desktop, Cursor) that need calendar and document parsing capabilities.

| | outlook-cli-skill | mcp-outlook-lite |
|---|---|---|
| **Approach** | CLI + skill files | MCP server |
| **Scope** | Email-focused (26 ops) | Full Outlook (46 tools incl. calendar, SharePoint) |
| **Agent support** | Any AI agent | MCP-compatible clients |
| **Runtime** | No server process | Long-running MCP server |
| **Attachment parsing** | Raw download | Auto-parse PDF/Word/Excel/PPT |

---

## License

[MIT](LICENSE)
