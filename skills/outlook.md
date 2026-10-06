---
name: outlook
description: Use when the user wants to read, send, search, or manage Outlook emails, folders, attachments, or inbox rules via Microsoft Graph API.
---

# Outlook

> **Personal mailbox only.** This skill and `outlook-auth login` reach Wei's **personal** mailbox. Never use them for work (IDEXX) email — that goes through the claude.ai Microsoft 365 connector (`mcp__claude_ai_Microsoft_365__*`: `outlook_email_search`, `outlook_calendar_search`, `sharepoint_search`, `teams_*`). `outlook-auth login` needs a browser and hangs inside a subagent. In subagent prompts about work email, name the M365 connector explicitly and forbid this skill. (2026-09-25: a subagent tried `outlook-auth` for an IDEXX policy search.)

## Overview

Microsoft Graph API-based Outlook integration for reading, sending, searching, and managing mail, folders, attachments, and inbox rules. Operates on the authenticated user's mailbox via the `outlook-auth` CLI wrapper.

## Quick Start

Use `outlook-auth api` to call Microsoft Graph API — handles token, base URL, and headers automatically:

```bash
outlook-auth api <METHOD> <path> [-d <json-body>]
outlook-auth attach <message-id> <file-path> [--name <name>]
```

All paths are relative to `https://graph.microsoft.com/v1.0/me`.

## When to Use

- Reading, sending, searching, replying to, or forwarding emails in Outlook
- Managing folders, inbox rules, or email attachments via Microsoft Graph API
- Downloading attachments or flagging/moving messages programmatically

## When NOT to Use

- Calendar, contacts, or OneDrive operations (not supported)
- If user hasn't run `outlook-auth login` yet — guide them through setup first

## Reference Files

Load the appropriate reference file (via Read tool) based on user intent:

| Intent | Reference File |
|--------|---------------|
| Email (read, send, scheduled send, search, reply, forward, draft, delete, move, flag) | `references/outlook-email.md` |
| Folders (list, create, rename, stats) | `references/outlook-folders.md` |
| Attachments (list, download, add, scan) | `references/outlook-attachments.md` |
| Inbox rules (list, create, delete) | `references/outlook-rules.md` |

## Error Handling

`outlook-auth api` exits code 1 on errors, printing the error body.

| Status | Action |
|--------|--------|
| 401 | Run `outlook-auth login` to re-authenticate |
| 403 | User needs to check Azure App API permissions |
| 404 | Bad message/folder ID — inform user |
| 429 | Rate limited — wait a few seconds, retry |
| 5xx | Transient error — retry once after 2s |

## Pagination

If response contains `@odata.nextLink`, follow it for more results:

```bash
outlook-auth api GET '<nextLink-path-after-/me>'
```

## High-Stakes Actions (confirm with user first)

- Sending emails (send, reply, reply all, forward)
- Scheduling a send (goes out unattended; see `references/outlook-email.md` §17)
- Deleting emails or rules
- Creating inbox rules

## Common Query Patterns

| Pattern | Example |
|---------|---------|
| Limit | `$top=10` |
| Select fields | `$select=id,subject,from,receivedDateTime` |
| Sort | `$orderby=receivedDateTime desc` |
| Filter | `$filter=isRead eq false` |
| Date filter | `$filter=receivedDateTime ge 2024-01-01T00:00:00Z` |
| Search (no sort) | `$search="keyword"` (cannot combine with `$orderby`) |

URL-encode spaces as `%20` in query parameters.

## Timezone

Graph API returns all timestamps in UTC. **Convert to NZ local time for display** with `zoneinfo` (`Pacific/Auckland`): NZDT UTC+13 from the last Sunday of September, NZST UTC+12 from the first Sunday of April. Never hard-code the offset.

## Reading Emails — Behavioral Rules

- **Always check attachments:** After reading an email, check `hasAttachments` field. If `true`, list attachments and read relevant ones (PDFs, docs). Key information (addresses, instructions, deadlines) is often in attachments, not the body.
- For action-oriented emails (government letters, contracts, booking confirmations, delivery notices): always read attachments before reporting conclusions.
