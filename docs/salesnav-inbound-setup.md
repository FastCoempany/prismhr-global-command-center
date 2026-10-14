# Sales Navigator alert emails: where they flow, and how to connect them

## Where they land

Every Sales Navigator alert email ends up in the same place, whichever door it comes through:

1. **It splits into one row per alert.** Each row is "Allie Menz shared a post", "Jordan Ellis started a new position at Nextep", or "My HR Pros is now expressing High buyer intent".
2. **Each row files on the book account it names.** The match is by account name, or by a known contact's name. It lands as a background note on that account's record, under a SALESNAV ALERTS or SALESNAV INTENT head. A row that names no book account files nothing, and the receipt counts it.
3. **Groundwork reads the notes on its next load:**
   - A post from a lead becomes **"Message {name}."** (send band, five days fresh).
   - Someone starting at a book account becomes **"Meet {name}."** (people band, 21 days fresh).
   - Someone leaving a book account becomes **"Ask who replaces {name}."** on the account they left (people band, 21 days fresh).
   - An intent alert becomes a fresh intent reading. The account ranks warm, or rises, on the intent rule.
   
   An account the HomeRoom is already working (a real inbound inside 21 days, or a meeting inside 14) gets none of these. That's the live-motion exclusion.

## The doors

- **By hand, no setup.** Drag the alert email out of Outlook onto the Chute, or run the Outlook grab on the open email and paste it into the Chute or any account's ⚡ box. The Chute reads it as alerts, not as a thread, and the receipt shows the accounts it filed to. This works on the alert email itself, whose From line is LinkedIn's. Forward it to yourself and it reads as an ordinary thread. The same goes for any thread that only mentions Sales Navigator: it files as the thread it is.
- **Automatic.** A mail rule forwards Sales Navigator's alert emails to an inbound service. The service posts each one to `https://<the app>/inbound/salesnav`, where the inbound route reads it and files it through the same split.

## Connecting the automatic door

1. **Ask PrismHR IT first.** Forwarding work mail to an outside service, or connecting a flow to your mailbox, is usually covered by policy. The safest route to ask about is a Power Automate flow inside Microsoft 365: when an email arrives from LinkedIn with "Sales Navigator" in it, it sends an HTTP POST. The mail never leaves 365 except as that one post to the app. Note that the HTTP action is a premium Power Automate connector.
2. **Set the secret in Vercel.** Add `SALESNAV_INBOUND_SECRET` with a long random value (32+ characters) under the project's environment variables, then redeploy. With it unset, or shorter than 16 characters, the route refuses everything.
3. **Point the sender at the route:**
   - URL: `https://<the app>/inbound/salesnav`
   - Header: `Authorization: Bearer <the secret>`. A service that can only call a bare URL can use `?key=<the secret>` instead.
   - Body: any of these shapes:
     - JSON with `from`, `subject`, `date`, and `text` or `html` (what a Power Automate flow sends)
     - Postmark's inbound JSON
     - SendGrid's or Mailgun's form post
     - the raw email as text
4. **Test it with one real alert email.** The route answers with counts only: how many accounts it filed to, how many rows were already on file, and how many named no account. Check that the Groundwork move shows up on the right account.

## Forward or redirect

An Outlook rule can redirect an alert, which keeps LinkedIn as the sender, or forward it, which puts you on the From line with LinkedIn's inside. The inbound route takes both, because only your own rule can reach it past the secret. A Power Automate flow reads the original email, so LinkedIn stays the sender there too.

## What it never does

It never reads any email that isn't a Sales Navigator alert. Those file nothing, and the route says so. It never sends anything, never touches LinkedIn, and never renders the email anywhere. The secret is the only key.
