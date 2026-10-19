# The sent copy: connecting your Sent Items to Groundwork

Groundwork drafts each email move before the send band. **Send in Outlook** opens the draft in Outlook, and the move moves to the left wing as **SENT · WAITING ON THE COPY**. When the sent email comes back to the app, it files on the account's record and the stamp turns into its channel line (`EMAIL · STEP 1 · CRISTINA B.`). The same thing happens when you send to an account's people straight from Outlook, with no click in the app at all.

The sent email comes back through a Power Automate flow on your Sent Items folder.

## What the app does with it

1. **It reads the recipients only.** The account is the one whose known contact address or company domain is on the To or Cc line. A send to our own side, to a personal address, or to two accounts at once files nothing.
2. **It files through the same pipeline a paste takes**: the duplicate check, the misfile guard and the read. Commitments you made in the email open as loops, like any filed thread. The same email posted twice files once.
3. **Groundwork stamps the move.** An email move whose account the record shows sent to today leaves the queue.

The route answers with counts and the routing rung only. It never sends anything and never renders the email anywhere.

## Setting it up

1. **Set the secrets in Vercel** under the project's environment variables, then redeploy:
   - `SENT_INBOUND_SECRET`: a long random value (32+ characters). With it unset or shorter than 16 characters, the route refuses everything.
   - `CRON_SECRET`: the same kind of value. Vercel sends it to the drafts job, which runs at 11:00 UTC on weekdays (6:00 in Chicago during daylight time, 5:00 in winter).
2. **Build the flow** in Power Automate (make.powerautomate.com → Create → Automated cloud flow):
   - **Trigger:** Office 365 Outlook, **When a new email arrives (V3)**, with **Folder** set to **Sent Items**. Leave the other filters empty.
   - **Action:** **HTTP** (a premium connector):
     - Method: `POST`
     - URI: `https://<the app>/inbound/sent`
     - Headers: `Authorization` = `Bearer <SENT_INBOUND_SECRET>`, `Content-Type` = `application/json`
     - Body: the trigger's whole output. Click in Body, choose the expression (fx) tab, type `triggerBody()` and press Add. The route reads Outlook's own field names (`from`, `toRecipients`, `ccRecipients`, `subject`, `body`, `receivedDateTime`), so nothing needs mapping.
3. **Without the premium HTTP action**, use the flow's **Forward an email (V2)** action instead, sending to an inbound mail service address (the same kind of service the Sales Nav alerts use, see `docs/salesnav-inbound-setup.md`) whose webhook points at `https://<the app>/inbound/sent?key=<SENT_INBOUND_SECRET>`. The route finds the original's From, To and Subject inside the forward.
4. **Test it.** Send one email to a contact at a book account. The flow's run history shows the route's answer: `filed` 1 and `rung` `email` or `domain`. Groundwork's left wing shows the stamp with its channel line.

Ask PrismHR IT before connecting a flow to your mailbox; it is usually covered by policy. With the HTTP action, the mail never leaves Microsoft 365 except as that one post to the app.

## When the copy never comes back

The wing keeps saying **SENT · WAITING ON THE COPY** for that move. Its ↺ takes the send back, and the move returns to the queue. A sent copy that the misfile guard holds files nothing; the route's answer says `held`, and Worked it still stamps the move by hand.
