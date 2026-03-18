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

```bash
outlook-auth api POST '/messages/{messageId}/attachments' -d '{
  "@odata.type": "#microsoft.graph.fileAttachment",
  "name": "document.pdf",
  "contentBytes": "<base64-encoded-content>"
}'
```

To encode a file: `base64 -i file.pdf`

---

## 4. Scan Attachments

Skill-level pattern — find emails with attachments, then list them:

```bash
# Step 1: Find emails with attachments
outlook-auth api GET '/messages?$filter=hasAttachments%20eq%20true&$top=10&$select=id,subject,from'

# Step 2: For each message ID, list its attachments
outlook-auth api GET '/messages/{id}/attachments?$select=name,size,contentType'
```
