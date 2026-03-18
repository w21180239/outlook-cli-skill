---
name: outlook
description: Outlook email operations via Microsoft Graph API. Handles email, folders, attachments, and rules.
---

## Prerequisites

- `outlook-auth` CLI installed and authenticated
- Get token: `TOKEN=$(outlook-auth token)`
- All curl calls require: `-H "Authorization: Bearer $TOKEN"`
- Base URL: `https://graph.microsoft.com/v1.0/me`

## Routing

Based on user intent, use the Read tool to load the corresponding skill file from the same directory where this skill was loaded:

| Intent | Skill File |
|--------|-----------|
| Read/write/search/send/reply/forward emails | outlook-email.md |
| Folder operations (list, create, rename) | outlook-folders.md |
| Attachment operations (list, download, upload) | outlook-attachments.md |
| Inbox rules (list, create, delete) | outlook-rules.md |

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
