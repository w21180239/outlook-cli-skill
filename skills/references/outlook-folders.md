---
name: outlook-folders
description: Outlook email folder operations - list, create, rename, get stats
---

## Setup

```bash
TOKEN=$(outlook-auth token)
BASE=https://graph.microsoft.com/v1.0/me
```

---

## 1. List Folders

List all top-level mail folders.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/mailFolders?\$top=100"
```

Include hidden folders:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/mailFolders?includeHiddenFolders=true&\$top=100"
```

List child folders inside a parent folder:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/mailFolders/{parentId}/childFolders?\$top=100"
```

Key response fields: `value[]` array with `id`, `displayName`, `totalItemCount`, `unreadItemCount`, `parentFolderId`

Well-known folder names (usable in place of an ID): `inbox`, `drafts`, `sentitems`, `deleteditems`, `archive`, `junkemail`, `outbox`

---

## 2. Create Folder

Create a new top-level mail folder.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "My New Folder"}' \
  "$BASE/mailFolders"
```

Create a subfolder inside an existing folder:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "My Subfolder"}' \
  "$BASE/mailFolders/{parentId}/childFolders"
```

- Replace `{parentId}` with the parent folder ID (from List Folders) or a well-known name
- Returns the created folder object including its new `id`

Key response fields: `id`, `displayName`, `parentFolderId`

---

## 3. Rename Folder

Update the display name of an existing folder.

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Updated Folder Name"}' \
  "$BASE/mailFolders/{id}"
```

- Replace `{id}` with the folder ID to rename
- Well-known system folders (inbox, drafts, etc.) cannot be renamed
- Returns the updated folder object on success

Key response fields: `id`, `displayName`

---

## 4. Get Folder Stats

Fetch details and item counts for a single folder.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/mailFolders/{id}"
```

- Replace `{id}` with the folder ID or a well-known name (e.g. `inbox`)

Key response fields: `id`, `displayName`, `totalItemCount`, `unreadItemCount`, `childFolderCount`, `parentFolderId`
