# Outlook Email Operations

15 operations for managing emails. All commands use `outlook-auth api` which handles token, base URL (`/me`), and headers automatically.

---

## 1. List Emails

```bash
outlook-auth api GET '/mailFolders/inbox/messages?$top=10&$orderby=receivedDateTime%20desc&$select=id,subject,from,receivedDateTime,isRead,bodyPreview'
```

- Change folder: `inbox`, `drafts`, `sentitems`, `deleteditems`, `archive`
- Filter unread: append `&$filter=isRead%20eq%20false`

---

## 2. Search Emails

```bash
outlook-auth api GET '/messages?$search="keyword"&$top=10&$select=id,subject,from,receivedDateTime,bodyPreview'
```

- Searches across all folders
- Combine: `$search="from:alice subject:budget"`

---

## 3. Get Email Detail

```bash
outlook-auth api GET '/messages/{id}?$select=id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,hasAttachments'
```

---

## 4. Send Email

```bash
outlook-auth api POST /sendMail -d '{
  "message": {
    "subject": "Subject here",
    "body": {"contentType": "HTML", "content": "<p>Body here</p>"},
    "toRecipients": [{"emailAddress": {"address": "to@example.com"}}],
    "ccRecipients": [],
    "bccRecipients": []
  }
}'
```

Returns HTTP 202 (no body).

---

## 5. Reply

```bash
outlook-auth api POST '/messages/{id}/reply' -d '{"comment": "Reply text here"}'
```

---

## 6. Reply All

```bash
outlook-auth api POST '/messages/{id}/replyAll' -d '{"comment": "Reply text here"}'
```

---

## 7. Forward

```bash
outlook-auth api POST '/messages/{id}/forward' -d '{
  "comment": "FYI",
  "toRecipients": [{"emailAddress": {"address": "to@example.com"}}]
}'
```

---

## 8. Create Draft

```bash
outlook-auth api POST /messages -d '{
  "subject": "Draft subject",
  "body": {"contentType": "HTML", "content": "<p>Draft body</p>"},
  "toRecipients": [{"emailAddress": {"address": "to@example.com"}}]
}'
```

Reply draft: `outlook-auth api POST '/messages/{id}/createReply' -d '{}'`

---

## 9. Delete Email

```bash
outlook-auth api DELETE '/messages/{id}'
```

Returns HTTP 204. Moves to Deleted Items.

---

## 10. Move Email

```bash
outlook-auth api POST '/messages/{id}/move' -d '{"destinationId": "archive"}'
```

Well-known folders: `inbox`, `drafts`, `sentitems`, `deleteditems`, `archive`

---

## 11. Mark as Read / Unread

```bash
outlook-auth api PATCH '/messages/{id}' -d '{"isRead": true}'
outlook-auth api PATCH '/messages/{id}' -d '{"isRead": false}'
```

---

## 12. Flag Email

```bash
outlook-auth api PATCH '/messages/{id}' -d '{"flag": {"flagStatus": "flagged"}}'
```

Values: `notFlagged`, `flagged`, `complete`

---

## 13. Categorize Email

```bash
outlook-auth api PATCH '/messages/{id}' -d '{"categories": ["Blue Category", "Red Category"]}'
```

Empty array `[]` clears all categories.

---

## 14. Archive Email

```bash
outlook-auth api POST '/messages/{id}/move' -d '{"destinationId": "archive"}'
```

---

## 15. Batch Process

Loop over message IDs. Example — mark multiple as read:

```bash
for id in ID1 ID2 ID3; do
  outlook-auth api PATCH "/messages/$id" -d '{"isRead": true}'
done
```
