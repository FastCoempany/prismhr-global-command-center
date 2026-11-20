# Mail history to Groundwork: the one-time mailbox crawl

Built 2026-11-19 at the founder's request. The relays (Sent copy, Inbox copy,
Calendar copy) only act on mail as it arrives, and they started on 10/19 with
a gap from 11/14 to 11/18 while Postmark held copies. This flow reads the
mailbox's history back to 2026-06-15 and sends GEM the account mail in it.

## What the flow does

- It starts by hand (a button) and asks for three things: the first day, the
  day to stop before, and the folder (`inbox` or `sent`).
- It reads the folder 50 emails at a time, oldest first, through the Office 365
  Outlook connector's own "Send an HTTP request" step (Microsoft Graph, the
  operator's own mailbox, no premium connector and no IT).
- It keeps an email when one of the book's domains or addresses (list A) is on
  it, or when one of the colleagues (list B) is on it and it names a book
  account (list C), the same rule the three relays use. It skips the relays'
  own copies (anything to `gem.antaeus.app` or `postmarkapp.com`, or with a
  `[GW-` subject).
- Each kept email goes to `relay@gem.antaeus.app` as a `[GW-IN]` or
  `[GW-SENT]` copy, one at a time, three seconds apart, in the live relays'
  own format: bare addresses joined by semicolons, the received time, the
  HTML body. GEM files it at the email's own date through the inbound route,
  and the duplicate check refuses a copy already on file.
- Days are Chicago days, summer and winter: each boundary is that day's
  midnight in Chicago, converted to UTC.
- It ends with a Summary step: how many emails it read and how many it sent.
  Only a send that went through is counted.
- If a page of mail cannot be read, or a send to GEM fails after its retries,
  the crawl stops after that page and the run ends as Failed with a message
  naming the day to start again from. A rerun from that day files nothing
  twice. (Both found by the Codex review on PR 435.)

The builder is `tools/power-automate/mail-history.py`. It reads the three
lists from `docs/power-automate-account-filter-lists.md` and clones the Inbox
copy flow's exported package (not kept in the repository: it carries the
connection's identity), so a rebuild needs that export in `<work>/in/Inbox`.

## Known limits

- An inbox email files by its sender. When the sender is a colleague, it files
  by its recipients instead, the way a sent copy does (founder's ruling of
  2026-11-18, shipped 2026-11-20 after the test run showed Judi Owen's email to
  Marvel HR filing nothing).
- The relays' raw header format is not stored anywhere readable. The flow
  writes the format the Inbox copy step's own fields produce; if Outlook's
  trigger spells the recipients differently, up to about 62 emails the relays
  filed between 10/19 and 11/19 could file a second time. Each would show
  FILED TWICE on its row and can be taken back with ↺.
- Microsoft paces flows that run many steps in a day. A slowed flow keeps
  going; the loop allows up to seven days.

## Order of runs

1. Turn off "Sent copy to Groundwork" for the crawl (every copy the crawler
   sends lands in Sent Items and would start that flow for nothing).
2. Test: inbox, 2026-11-17 to 2026-11-18.
3. Inbox: 2026-06-15 to the day after today.
4. Sent: 2026-06-15 to the day after today.
5. Turn "Sent copy to Groundwork" back on, then run Sent once more for today
   to the day after, to catch what was sent while it was off.
