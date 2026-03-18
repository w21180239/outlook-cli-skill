---
name: outlook-email
description: Outlook email operations - list, search, get, send, reply, reply all, forward, create draft, delete, move, mark read, flag, categorize, archive, batch process
---

## Setup

```bash
TOKEN=$(outlook-auth token)
BASE=https://graph.microsoft.com/v1.0/me
```

---

## 1. List Emails

List emails from a folder, newest first.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/mailFolders/inbox/messages?\$top=10&\$orderby=receivedDateTime%20desc&\$select=id,subject,from,receivedDateTime,isRead,bodyPreview"
```

- Change folder by replacing `inbox` with: `drafts`, `sentitems`, `deleteditems`, `archive`
- Filter unread only: append `&\$filter=isRead%20eq%20false`

Key response fields: `value[]` array with `id`, `subject`, `from.emailAddress`, `receivedDateTime`, `isRead`, `bodyPreview`

---

## 2. Search Emails

Search across all folders by keyword.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/messages?\$search=%22keyword%22&\$top=10&\$select=id,subject,from,receivedDateTime,bodyPreview"
```

- Replace `keyword` with the search term (URL-encoded)
- Combine conditions: `$search="from:alice subject:budget"` → `%22from%3Aalice%20subject%3Abudget%22`

Key response fields: `value[]` array with `id`, `subject`, `from.emailAddress`, `receivedDateTime`, `bodyPreview`

---

## 3. Get Email Detail

Fetch full details of a single email by ID.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/messages/{id}?\$select=id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,hasAttachments"
```

- Replace `{id}` with the message ID
- `body.content` contains the full message body; `body.contentType` is `HTML` or `Text`

Key response fields: `id`, `subject`, `from`, `toRecipients`, `ccRecipients`, `body.content`, `receivedDateTime`, `hasAttachments`

---

## 4. Send Email

Send an email immediately.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "subject": "Your subject here",
      "body": {
        "contentType": "HTML",
        "content": "<p>Your message body here</p>"
      },
      "toRecipients": [
        {"emailAddress": {"address": "recipient@example.com"}}
      ],
      "ccRecipients": [],
      "bccRecipients": []
    }
  }' \
  "$BASE/sendMail"
```

- Returns HTTP 202 Accepted on success (no response body)
- Use `"contentType": "Text"` for plain text

---

## 5. Reply

Reply to an email with a comment.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Your reply text here"}' \
  "$BASE/messages/{id}/reply"
```

- Replace `{id}` with the message ID to reply to
- Returns HTTP 202 Accepted on success

---

## 6. Reply All

Reply to all recipients of an email.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Your reply text here"}' \
  "$BASE/messages/{id}/replyAll"
```

- Replace `{id}` with the message ID
- Returns HTTP 202 Accepted on success

---

## 7. Forward

Forward an email to one or more recipients.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "FYI — forwarding this to you.",
    "toRecipients": [
      {"emailAddress": {"address": "recipient@example.com"}}
    ]
  }' \
  "$BASE/messages/{id}/forward"
```

- Replace `{id}` with the message ID
- Returns HTTP 202 Accepted on success

---

## 8. Create Draft

Create a new draft email (not sent).

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Draft subject",
    "body": {
      "contentType": "HTML",
      "content": "<p>Draft body</p>"
    },
    "toRecipients": [
      {"emailAddress": {"address": "recipient@example.com"}}
    ]
  }' \
  "$BASE/messages"
```

To create a reply draft (preserving thread context):

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$BASE/messages/{id}/createReply"
```

Key response fields: `id` (use this to later send or update the draft), `isDraft: true`

---

## 9. Delete Email

Move email to Deleted Items.

```bash
curl -s -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/messages/{id}"
```

- Returns HTTP 204 No Content on success
- To permanently delete: first move the message to `deleteditems` (see Move Email), then call DELETE again on the message in that folder

---

## 10. Move Email

Move an email to another folder.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"destinationId": "inbox"}' \
  "$BASE/messages/{id}/move"
```

- Replace `{id}` with the message ID
- `destinationId` accepts well-known names: `inbox`, `drafts`, `sentitems`, `deleteditems`, `archive`
- Or use a folder ID from the List Folders operation

Key response fields: `id` (new message ID in destination folder)

---

## 11. Mark as Read / Unread

Update the read status of an email.

Mark as read:

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isRead": true}' \
  "$BASE/messages/{id}"
```

Mark as unread:

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isRead": false}' \
  "$BASE/messages/{id}"
```

- Returns the updated message object on success

---

## 12. Flag Email

Set a follow-up flag on an email.

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"flag": {"flagStatus": "flagged"}}' \
  "$BASE/messages/{id}"
```

- `flagStatus` values: `notFlagged`, `flagged`, `complete`
- Returns the updated message object on success

---

## 13. Categorize Email

Assign color categories to an email.

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"categories": ["Blue Category", "Red Category"]}' \
  "$BASE/messages/{id}"
```

- Category names must match existing categories in the mailbox
- Pass an empty array `[]` to clear all categories
- Returns the updated message object on success

---

## 14. Archive Email

Move an email to the Archive folder.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"destinationId": "archive"}' \
  "$BASE/messages/{id}/move"
```

- Uses the well-known `archive` folder name
- Returns the updated message object with new `id` in the archive folder

---

## 15. Batch Process

Apply an operation to multiple messages. There is no single bulk API call — loop over message IDs.

Example: mark multiple messages as read:

```bash
MESSAGE_IDS=("id1" "id2" "id3")

for MSG_ID in "${MESSAGE_IDS[@]}"; do
  curl -s -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"isRead": true}' \
    "$BASE/messages/$MSG_ID"
done
```

Example: move multiple messages to a folder:

```bash
for MSG_ID in "${MESSAGE_IDS[@]}"; do
  curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"destinationId": "archive"}' \
    "$BASE/messages/$MSG_ID/move"
done
```

- Collect `id` values from List Emails or Search Emails first
- Add a short delay between requests if processing large batches to avoid rate limiting (HTTP 429)
