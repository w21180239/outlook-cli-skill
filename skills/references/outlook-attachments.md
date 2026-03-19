# Outlook Attachment Operations

4 operations for managing email attachments. All commands use `outlook-auth api`.

---

## 1. List Attachments

```bash
outlook-auth api GET '/messages/{messageId}/attachments?$select=id,name,contentType,size'
```

Key fields: `value[]` with `id`, `name`, `contentType`, `size`

---

## 2. Download Attachment

```bash
outlook-auth api GET '/messages/{messageId}/attachments/{attachmentId}'
```

Response includes `contentBytes` (base64). To save the file:

```bash
outlook-auth api GET '/messages/{messageId}/attachments/{attachmentId}' | jq -r '.contentBytes' | base64 -d > filename.pdf
```

---

## 3. Add Attachment (to draft)

**Preferred — use `attach` command** (handles base64 automatically):

```bash
outlook-auth attach {messageId} /path/to/document.pdf
outlook-auth attach {messageId} /path/to/file.txt --name "Custom Name.txt"
```

Max file size: 3 MB. Returns created attachment JSON.

**Alternative — via `api` with file input:**

```bash
# Prepare JSON payload in a file, then:
outlook-auth api POST '/messages/{messageId}/attachments' -d @/tmp/attachment.json

# Or via stdin:
cat attachment.json | outlook-auth api POST '/messages/{messageId}/attachments' --stdin
```

> **Warning:** Do NOT pass large base64 content inline with `-d '{...}'` — it will exceed shell argument limits. Use `-d @file`, `--stdin`, or the `attach` command instead.

---

## 4. Scan Attachments

Skill-level pattern — find emails with attachments, then list them:

```bash
# Step 1: Find emails with attachments
outlook-auth api GET '/messages?$filter=hasAttachments%20eq%20true&$top=10&$select=id,subject,from'

# Step 2: For each message ID, list its attachments
outlook-auth api GET '/messages/{id}/attachments?$select=name,size,contentType'
```

---

## Caveats

- `attach` command supports files up to 3 MB (Graph API simple upload limit).
- Base64 encoding adds ~33% size overhead, so a 2.25 MB file produces ~3 MB of JSON payload.
- For larger files, the Graph API upload session endpoint (`/createUploadSession`) is needed (not yet supported by the CLI).
