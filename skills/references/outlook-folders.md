# Outlook Folder Operations

4 operations for managing email folders. All commands use `outlook-auth api`.

---

## 1. List Folders

```bash
outlook-auth api GET '/mailFolders?$top=100'
```

Include hidden folders: append `&includeHiddenFolders=true`

List child folders of a specific folder:

```bash
outlook-auth api GET '/mailFolders/{parentId}/childFolders'
```

Key fields: `id`, `displayName`, `totalItemCount`, `unreadItemCount`

---

## 2. Create Folder

Top-level:

```bash
outlook-auth api POST /mailFolders -d '{"displayName": "My New Folder"}'
```

Subfolder:

```bash
outlook-auth api POST '/mailFolders/{parentId}/childFolders' -d '{"displayName": "Sub Folder"}'
```

---

## 3. Rename Folder

```bash
outlook-auth api PATCH '/mailFolders/{id}' -d '{"displayName": "New Name"}'
```

---

## 4. Get Folder Stats

```bash
outlook-auth api GET '/mailFolders/{id}'
```

Key fields: `totalItemCount`, `unreadItemCount`, `displayName`

For well-known folders use name instead of ID: `inbox`, `drafts`, `sentitems`, `deleteditems`, `archive`
