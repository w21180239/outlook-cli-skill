# AGENTS.md — AI Agent Self-Installation Guide

This project is a lightweight CLI + skill toolkit for Outlook email via the Microsoft Graph API. There is no MCP server — the CLI handles OAuth token management, and your AI agent calls the Graph API directly with curl using templates from the skill files.

---

## Installation (for AI agents)

### Step 1: Install the CLI

```bash
cd <this-repo>/cli && npm install && npm run build && npm link
```

This makes `outlook-auth` available as a global command.

### Step 2: Detect AI tool and install skills

**Claude Code** — symlink to `~/.shared-ai-skills/` (if it exists) or `~/.claude/skills/`:

```bash
for f in <this-repo>/skills/*.md; do ln -sf "$f" ~/.shared-ai-skills/$(basename "$f"); done
```

**Cursor** — symlink to `~/.cursor/skills/`:

```bash
for f in <this-repo>/skills/*.md; do ln -sf "$f" ~/.cursor/skills/$(basename "$f"); done
```

**Codex** — symlink to `~/.codex/skills/`:

```bash
for f in <this-repo>/skills/*.md; do ln -sf "$f" ~/.codex/skills/$(basename "$f"); done
```

**Other agents** — read the skill files directly from this repo:

```
<this-repo>/skills/outlook-email.md
<this-repo>/skills/outlook-folders.md
<this-repo>/skills/outlook-attachments.md
<this-repo>/skills/outlook-rules.md
```

### Step 3: Check config

```bash
outlook-auth config show
```

### Step 4: If not configured, set up Azure App

If no `clientId` or `tenantId` is shown, the user needs to register an Azure App. Direct them to **README.md → Step 1: Register Azure App** for the full guide.

Once they provide the IDs:

```bash
outlook-auth config set clientId <id> tenantId <id>
```

### Step 5: Authenticate

```bash
outlook-auth login
```

### Step 6: Verify

```bash
outlook-auth status
```

---

## Using Outlook Skills (after installation)

**Token pattern** — obtain a fresh token before each request:

```bash
TOKEN=$(outlook-auth token)
```

**Base URL:**

```
https://graph.microsoft.com/v1.0/me
```

**Available skill files:**

| File | Contents |
|------|----------|
| `outlook-email.md` | List, search, get, send, reply, reply all, forward, draft, delete, move, mark read, flag, categorize, archive, batch |
| `outlook-folders.md` | List, create, rename, stats |
| `outlook-attachments.md` | List, download, add, scan |
| `outlook-rules.md` | List, create, delete |

**How to use:** Read the relevant skill file and follow the curl templates. Each template uses `$TOKEN` for authorization and documents required parameters inline.

---

## High-stakes actions

Always confirm with the user before executing:

- Sending emails (`POST /sendMail`, `POST /messages/{id}/send`)
- Deleting emails (`DELETE /messages/{id}`)
- Deleting inbox rules (`DELETE /mailFolders/inbox/messageRules/{id}`)
- Creating inbox rules (`POST /mailFolders/inbox/messageRules`)

Do not proceed with these actions unless the user has explicitly approved the specific operation.
