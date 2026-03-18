# Outlook Inbox Rule Operations

3 operations for managing inbox rules. All commands use `outlook-auth api`.

---

## 1. List Rules

```bash
outlook-auth api GET /mailFolders/inbox/messageRules
```

Key fields: `value[]` with `id`, `displayName`, `conditions`, `actions`, `isEnabled`

---

## 2. Create Rule

```bash
outlook-auth api POST /mailFolders/inbox/messageRules -d '{
  "displayName": "Move from Alice to Projects",
  "conditions": {
    "senderContains": ["alice@example.com"]
  },
  "actions": {
    "moveToFolder": "{folderId}"
  },
  "isEnabled": true
}'
```

Common conditions: `senderContains`, `subjectContains`, `bodyContains`, `importance`
Common actions: `moveToFolder`, `delete`, `markAsRead`, `forwardTo`

---

## 3. Delete Rule

```bash
outlook-auth api DELETE '/mailFolders/inbox/messageRules/{id}'
```

Returns HTTP 204 on success.
