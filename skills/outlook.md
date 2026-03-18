---
name: outlook
description: Outlook email operations via Microsoft Graph API. Handles email, folders, attachments, and rules.
---

## How to Use

Use `outlook-auth api` to call Microsoft Graph API. It handles token, base URL, and headers automatically:

```bash
outlook-auth api <METHOD> <path> [-d <json-body>]
```

Examples:
```bash
outlook-auth api GET '/mailFolders/inbox/messages?$top=5'
outlook-auth api POST /sendMail -d '{"message":{...}}'
outlook-auth api PATCH '/messages/{id}' -d '{"isRead":true}'
outlook-auth api DELETE '/messages/{id}'
```

All paths are relative to `https://graph.microsoft.com/v1.0/me`.

## Loading Reference Files

The detailed API templates are in reference files alongside this skill.
To find them, resolve this skill file's symlink to locate the source directory:

```bash
SKILL_SOURCE=$(readlink -f <path-to-this-skill-file>)
REF_DIR=$(dirname "$SKILL_SOURCE")/references
```

Then use the Read tool to load the appropriate reference file based on user intent:

| Intent | Reference File |
|--------|---------------|
| Read/write/search/send/reply/forward emails | `$REF_DIR/outlook-email.md` |
| Folder operations (list, create, rename) | `$REF_DIR/outlook-folders.md` |
| Attachment operations (list, download, upload) | `$REF_DIR/outlook-attachments.md` |
| Inbox rules (list, create, delete) | `$REF_DIR/outlook-rules.md` |

## Error Handling

`outlook-auth api` exits with code 1 on HTTP errors and prints the error body. Common status codes:

| Status | Action |
|--------|--------|
| 401 | Token expired — the CLI auto-refreshes, but if it persists, run `outlook-auth login` |
| 403 | Insufficient permissions. Ask user to check Azure App API permissions. |
| 404 | Resource not found (bad ID). Inform user. |
| 429 | Rate limited. Wait a few seconds and retry. |
| 5xx | Transient server error. Retry once after 2 seconds. |

## Pagination

If a response contains `@odata.nextLink`, there are more results. Use the full nextLink URL:

```bash
outlook-auth api GET '<full-nextLink-path-after-/me>'
```

## High-Stakes Actions (confirm with user first)

- Sending emails (send, reply, reply all, forward)
- Deleting emails or rules
- Creating inbox rules (affects future mail routing)

## Common Query Patterns

- Limit results: `$top=10`
- Select fields: `$select=id,subject,from,receivedDateTime`
- Sort: `$orderby=receivedDateTime desc`
- Filter: `$filter=isRead eq false`
- Date filter: `$filter=receivedDateTime ge 2024-01-01T00:00:00Z`
- URL-encode spaces as `%20` in query parameters
