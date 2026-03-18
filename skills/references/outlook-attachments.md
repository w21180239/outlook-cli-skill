---
name: outlook-attachments
description: Outlook email attachment operations - list, download, add, scan
---

## Setup

```bash
TOKEN=$(outlook-auth token)
BASE=https://graph.microsoft.com/v1.0/me
```

---

## 1. List Attachments

List all attachments on a specific email.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/messages/{messageId}/attachments?\$select=id,name,contentType,size"
```

- Replace `{messageId}` with the email message ID
- Use `hasAttachments eq true` when listing emails to pre-filter (see Scan Attachments below)

Key response fields: `value[]` array with `id`, `name`, `contentType`, `size` (bytes)

---

## 2. Download Attachment

Fetch a single attachment by ID. The response includes the file content as a base64-encoded string.

```bash
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/messages/{messageId}/attachments/{attachmentId}")

# Extract base64 content and decode to file
CONTENT_BYTES=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['contentBytes'])")
echo "$CONTENT_BYTES" | base64 -d > filename.pdf
```

Minimal fetch (no decode):

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/messages/{messageId}/attachments/{attachmentId}"
```

- Replace `{messageId}` and `{attachmentId}` with the respective IDs
- Use the `name` field from List Attachments as the output filename
- `contentType` indicates the MIME type (e.g. `application/pdf`, `image/png`)

Key response fields: `id`, `name`, `contentType`, `size`, `contentBytes` (base64-encoded file data)

---

## 3. Add Attachment (to Draft)

Upload a file attachment to an existing draft message.

First, base64-encode the file:

```bash
ENCODED=$(base64 -i /path/to/file.pdf)
```

Then attach it to the draft:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"@odata.type\": \"#microsoft.graph.fileAttachment\",
    \"name\": \"file.pdf\",
    \"contentBytes\": \"$ENCODED\"
  }" \
  "$BASE/messages/{messageId}/attachments"
```

- Replace `{messageId}` with the draft message ID
- `name` sets the display filename for the recipient
- `contentType` is optional; Graph will infer it from the content if omitted
- For large files (> 3 MB), use the upload session API instead
- Returns the created attachment object including its `id`

Key response fields: `id`, `name`, `contentType`, `size`

---

## 4. Scan Attachments

Find all emails with attachments and report attachment metadata. This is a skill-level pattern combining multiple API calls.

Step 1 — list emails that have attachments:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/mailFolders/inbox/messages?\$filter=hasAttachments%20eq%20true&\$top=25&\$select=id,subject,from,receivedDateTime,hasAttachments"
```

Step 2 — for each message ID returned, list its attachments:

```bash
for MSG_ID in "${MESSAGE_IDS[@]}"; do
  echo "--- Attachments for $MSG_ID ---"
  curl -s -H "Authorization: Bearer $TOKEN" \
    "$BASE/messages/$MSG_ID/attachments?\$select=id,name,contentType,size"
done
```

- Combine the output to build a report: sender, subject, attachment name, size, contentType
- Change `inbox` to another folder name or omit the folder path to search all folders
- Follow `@odata.nextLink` in the step 1 response if there are more pages of results
