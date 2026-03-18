# outlook-cli-skill

Turn Outlook email into AI skills — no MCP server required. A lightweight CLI handles OAuth, your AI agent handles the rest with curl.

---

## How It Works

The CLI authenticates once and stores tokens locally. From that point, any AI agent can request a fresh token and call the Microsoft Graph API directly using the curl templates in the skill files.

```
AI Agent → reads skill → gets curl template
    ↓
outlook-auth token → valid access token
    ↓
curl → Microsoft Graph API → results
```

---

## Step 1: Register Azure App (5 min, one-time)

1. Go to [Azure Portal](https://portal.azure.com) → **App registrations** → **New registration**
2. Give it any name (e.g., "Outlook CLI Skill")
3. Choose **Supported account types**:
   - Work/school account: "Accounts in this organizational directory only"
   - Personal account (outlook.com, hotmail.com): "Accounts in any organizational directory and personal Microsoft accounts"
4. Under **Redirect URI**, select **Mobile and desktop applications** from the dropdown, then enter `http://localhost` (no port, no trailing path)
5. Go to **Authentication** → enable **Allow public client flows** → Save
6. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**, then add:
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `User.Read`
   - `MailboxSettings.ReadWrite`
7. On the **Overview** page, copy:
   - **Application (client) ID**
   - **Directory (tenant) ID**

> **Personal accounts (outlook.com, hotmail.com, live.com):** You MUST use `consumers` as the Tenant ID when configuring the CLI — do not use the Directory (tenant) ID shown in Azure Portal. Using the Directory ID will cause authentication to fail for personal accounts.

No client secret is needed. This uses PKCE (public client) authentication.

---

## Step 2: Install

```bash
git clone https://github.com/w21180239/outlook-cli-skill.git
cd outlook-cli-skill
./install.sh
```

Or install manually:

```bash
cd cli && npm install && npm run build && npm link
```

---

## Step 3: Configure & Login

```bash
outlook-auth config set clientId YOUR_CLIENT_ID tenantId YOUR_TENANT_ID
outlook-auth login
outlook-auth status
```

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

- "Show me unread emails from this week"
- "Find all emails from Alice about the budget"
- "Reply to that email thanking her for the update"
- "Move all newsletters to the Archive folder"
- "Download the PDF attachment from the latest Finance email"

---

## For AI Agents

> If you're an AI agent, read `AGENTS.md` for automated installation instructions.

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `outlook-auth login [--device-code]` | Sign in |
| `outlook-auth token` | Output access token |
| `outlook-auth status [--json]` | Show auth state |
| `outlook-auth logout` | Clear tokens |
| `outlook-auth config set key value` | Set a config value |
| `outlook-auth config show` | Show current config |

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_CLIENT_ID` | Yes | Application (client) ID from Azure Portal |
| `AZURE_TENANT_ID` | Yes | `consumers` for personal accounts, tenant ID for work accounts, `common` for both |

---

## License

MIT
