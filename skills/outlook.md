---
name: outlook
description: Outlook email operations via Microsoft Graph API. Handles email, folders, attachments, and rules.
---

## Prerequisites

- `outlook-auth` CLI installed and authenticated
- Get token: `TOKEN=$(outlook-auth token)`
- All curl calls require: `-H "Authorization: Bearer $TOKEN"`
- Base URL: `https://graph.microsoft.com/v1.0/me`

## Loading Reference Files

The detailed curl templates are in reference files alongside this skill.
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

Check HTTP status codes in curl responses:

| Status | Action |
|--------|--------|
| 401 | Token expired. Re-run `TOKEN=$(outlook-auth token)` and retry. |
| 403 | Insufficient permissions. Ask user to check Azure App API permissions. |
| 404 | Resource not found (bad ID). Inform user. |
| 429 | Rate limited. Wait the number of seconds in the `Retry-After` header, then retry. |
| 5xx | Transient server error. Retry once after 2 seconds. |

## Pagination

If a response contains `@odata.nextLink`, there are more results. Follow that URL (with the same Authorization header) to get the next page.

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
- Always URL-encode filter values in curl
