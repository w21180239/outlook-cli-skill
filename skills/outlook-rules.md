---
name: outlook-rules
description: Outlook inbox rule operations - list, create, delete
---

## Setup

```bash
TOKEN=$(outlook-auth token)
BASE=https://graph.microsoft.com/v1.0/me
```

---

## 1. List Rules

List all inbox rules.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/mailFolders/inbox/messageRules"
```

Key response fields: `value[]` array with `id`, `displayName`, `isEnabled`, `sequence`, `conditions`, `actions`

---

## 2. Create Rule

Create a new inbox rule. Rules are applied in `sequence` order (lower number = higher priority).

Example: move emails from a specific sender to a folder.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Move from Alice to Projects",
    "conditions": {
      "senderContains": ["alice@example.com"]
    },
    "actions": {
      "moveToFolder": "{folderId}"
    },
    "isEnabled": true
  }' \
  "$BASE/mailFolders/inbox/messageRules"
```

- Replace `{folderId}` with the destination folder ID (from List Folders in outlook-folders.md)
- `senderContains` matches partial strings against the sender address
- Returns the created rule object including its `id`

Common `conditions` fields:
- `senderContains`: array of strings to match against the sender
- `subjectContains`: array of strings to match in the subject line
- `bodyContains`: array of strings to match in the message body
- `recipientContains`: array of strings to match against recipients

Common `actions` fields:
- `moveToFolder`: folder ID to move matching messages to
- `copyToFolder`: folder ID to copy matching messages to
- `markAsRead`: `true` to mark matching messages as read
- `delete`: `true` to delete matching messages
- `forwardTo`: array of recipient objects to forward matching messages to

Key response fields: `id`, `displayName`, `sequence`, `isEnabled`, `conditions`, `actions`

---

## 3. Delete Rule

Permanently delete an inbox rule by ID.

```bash
curl -s -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/mailFolders/inbox/messageRules/{id}"
```

- Replace `{id}` with the rule ID (from List Rules)
- Returns HTTP 204 No Content on success
- This action cannot be undone — confirm with the user before deleting
