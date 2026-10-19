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
   3. Under the trigger click **+** → **Add an action** → search `Condition` → **Condition** (Control). Left box: click it, choose the lightning icon, pick **Subject**. Middle: **does not start with**. Right box: `[GW-`. Every relay's own copy lands in Sent Items too, and this keeps the flow from relaying it again.
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

## The inbox copy (second flow)

The same relay, for mail you receive. An email from an account's people files on that account, so a reply owed, ↩ REPLIED and the move from Groundwork to the HomeRoom all read it with no drag to the Chute.

It routes by the sender alone, by their exact address or their company's domain. Mail from our own side (prismhr.com, vensure.com), a personal address, or a role or bulk sender (noreply, newsletter, marketing, info and the like) files nothing. A company's blast is never their voice.

1. Left rail **+ Create** → **Automated cloud flow**. Name it `Inbox copy to Groundwork`. Trigger: search `When a new email arrives (V3)`, pick the **Office 365 Outlook** one, then **Create**. Leave **Folder** as **Inbox**.
2. Under the trigger click **+** → **Add an action** → **Send an email (V2)** (Office 365 Outlook). No condition is needed here.
   - **To:** the same inbound address as the sent-copy flow.
   - **Subject:** type `[GW-IN] `, then the lightning icon → **Subject**.
   - **Body:** the same six lines as the sent-copy flow:
     ```
     From: {From}
     Sent: {Received Time}
     To: {To}
     Cc: {CC}
     Subject: {Subject}
     {Body}
     ```
3. **Save**.
4. **Test it.** Have someone at a book account reply to you, or wait for the next real reply. The run shows green checks, and the account's record shows the reply as theirs.

## The calendar copy (third flow)

Each evening, the day's meetings with an account's people file on that account as meetings held. A meeting on file moves the account from Groundwork to the HomeRoom for two weeks, and the HomeRoom asks for the recap. An event that has not started yet, a cancelled or declined one, or one with only our own side or people outside the book files nothing.

1. Left rail **+ Create** → **Scheduled cloud flow**. Name it `Calendar copy to Groundwork`. Set **Repeat every** to `1` **Day**, then **Create**.
2. Click the **Recurrence** card. Under **Advanced parameters** add **Time zone** = `(UTC-06:00) Central Time (US & Canada)`, **At these hours** = `17`, **At these minutes** = `45`.
3. Under the trigger: **+** → **Add an action** → **Get calendar view of events (V3)** (Office 365 Outlook).
   - **Calendar Id:** Calendar.
   - **Start Time:** click the box → **fx** → type `addHours(utcNow(), -12)` → **Add**.
   - **End Time:** **fx** → `utcNow()` → **Add**.
4. Under it: **+** → **Add an action** → **Send an email (V2)** (Office 365 Outlook). When you insert the first field from the calendar view, Power Automate wraps the email in a **For each** loop on its own; that is expected, one email per event.
   - **To:** the inbound address.
   - **Subject:** `[GW-CAL] ` then the calendar view's **Subject**.
   - **Body**, one line each, every `{…}` a field from **Get calendar view of events (V3)**:
     ```
     From: {Organizer}
     Sent: {Start time}
     To: {Required attendees}
     Cc: {Optional attendees}
     Subject: {Subject}
     ```
5. **Save**. To test it now, click **Test** → **Manually** → **Test**: it runs at once on the last twelve hours. The field names above are the connector's usual ones; if one reads differently in your list, pick the closest match and tell Claude what it was called.
