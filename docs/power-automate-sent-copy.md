# The sent copy: connecting your Sent Items to Groundwork

Groundwork drafts each email move before the send band. **Send in Outlook** opens the draft in Outlook, and the move moves to the left wing as **SENT · WAITING ON THE COPY**. When the sent email comes back to the app, it files on the account's record and the stamp turns into its channel line (`EMAIL · STEP 1 · CRISTINA B.`). The same thing happens when you send to an account's people straight from Outlook, with no click in the app at all.

The sent email comes back through a Power Automate flow on your Sent Items folder.

## What the app does with it

1. **It reads the recipients only.** The account is the one whose known contact address or company domain is on the To or Cc line. A send to our own side, to a personal address, or to two accounts at once files nothing.
2. **It files through the same pipeline a paste takes**: the duplicate check, the misfile guard and the read. Commitments you made in the email open as loops, like any filed thread. The same email posted twice files once.
3. **Groundwork stamps the move.** An email move whose account the record shows sent to today leaves the queue.

The route answers with counts and the routing rung only. It never sends anything and never renders the email anywhere.

## Setting it up

Your Power Automate license has no Premium connectors, so the flow uses the relay. It mails a tagged copy of each sent email to the inbound address the Sales Nav alerts already use. The inbound service posts every message it receives to `/inbound/salesnav`, and that route hands a message tagged `[GW-SENT]` to the sent copy instead of reading it for alerts.

1. **Merge the PR.** `/inbound/salesnav` learns the tag in #414, so the flow does nothing useful until #414 is live.
2. **Find the inbound address.** Use the address your Sales Nav mail rule forwards to (Outlook → Settings → Mail → Rules → the Sales Nav rule → its "Forward to" address).
3. **Build the flow** at make.powerautomate.com:
   1. Left rail **+ Create** → **Automated cloud flow**. Name it `Sent copy to Groundwork`. In **Choose your flow's trigger**, search `When a new email arrives (V3)`, pick the **Office 365 Outlook** one, then **Create**.
   2. Click the trigger card. Under **Advanced parameters** choose **Folder**, then pick **Sent Items** with the folder icon.
   3. Under the trigger click **+** → **Add an action** → search `Condition` → **Condition** (Control). Left box: click it, choose the lightning icon, pick **Subject**. Middle: **does not start with**. Right box: `[GW-SENT]`. This keeps the relay's own copy from looping.
   4. In the **True** branch click **+** → **Add an action** → search `Send an email (V2)` → the **Office 365 Outlook** one:
      - **To:** the inbound address from step 2.
      - **Subject:** type `[GW-SENT] `, then the lightning icon → **Subject**.
      - **Body:** the box is a rich-text editor. Type each line below on its own line. Each `{…}` is the lightning icon → that field:
        ```
        From: {From}
        Sent: {Received Time}
        To: {To}
        Cc: {CC}
        Subject: {Subject}
        {Body}
        ```
   5. **Save** (disk icon, top bar).
4. **Test it.** Send one email to a contact at a book account. Open the flow, then **28-day run history** → the run → every step should show a green check. Within a minute, Groundwork's left wing shows the stamp with its channel line.

## When the copy never comes back

The wing keeps saying **SENT · WAITING ON THE COPY** for that move. Its ↺ takes the send back, and the move returns to the queue. A sent copy that the misfile guard holds files nothing; the route's answer says `held`, and Worked it still stamps the move by hand.
