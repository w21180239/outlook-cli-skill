---
name: outlook
description: Use when the user wants to read, send, search, or manage Outlook emails, folders, attachments, or inbox rules via Microsoft Graph API.
---

## Quick Start

Use `outlook-auth api` to call Microsoft Graph API — handles token, base URL, and headers automatically:

```bash
outlook-auth api <METHOD> <path> [-d <json-body>]
```

All paths are relative to `https://graph.microsoft.com/v1.0/me`.

## When NOT to Use

- Calendar, contacts, or OneDrive operations (not supported)
- If user hasn't run `outlook-auth login` yet — guide them through setup first

## Reference Files

Load the appropriate reference file (via Read tool) based on user intent:

| Intent | Reference File |
|--------|---------------|
| Email (read, send, search, reply, forward, draft, delete, move, flag) | `/Users/wliu1/tools/outlook-cli-skill/skills/references/outlook-email.md` |
| Folders (list, create, rename, stats) | `/Users/wliu1/tools/outlook-cli-skill/skills/references/outlook-folders.md` |
| Attachments (list, download, add, scan) | `/Users/wliu1/tools/outlook-cli-skill/skills/references/outlook-attachments.md` |
| Inbox rules (list, create, delete) | `/Users/wliu1/tools/outlook-cli-skill/skills/references/outlook-rules.md` |

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

URL-encode spaces as `%20` in query parameters.
