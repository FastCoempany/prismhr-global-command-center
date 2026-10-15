# Decision: Sales Navigator people signals on Groundwork

## Decision Summary

- Decision: Groundwork reads who is new in seat and who posted at a book account, and the change in buyer intent, from three operator-fired Sales Navigator grabs. Two new queue rules, post-trigger and new-in-seat, plus a rise trigger on intent-warm.
- Date: 2026-10-14
- Owner: Antaeus
- Approver: Antaeus
- Status: Draft. Merging the PR is the ship order.
- Related plan: docs/plans/groundwork-room-plan.md §8 (D1, D8, D9, D11), docs/research/sales-navigator-anatomy.md §5
- Related files: src/lib/groundwork/signals.ts, src/lib/groundwork/day.ts, src/lib/groundwork/compose.ts, src/lib/groundwork/stamp.ts, src/app/intake/grabs.ts, src/app/intake/capture-shelf.tsx, tests/salesnav-signals.test.ts

## Tags

- `[Canon]` for the doctrine it keeps: no scraping, no automation against LinkedIn, every grab fired by the operator's click on the operator's own page.
- `[Unverified]` for two readings, named below.

## What changed

1. **The intent-warm draft stops overstating the evidence.** It used to tell the prospect "a few people on your side have been reading our Global material this week (11 separate engagements)". Sales Navigator's buyer intent counts engagement with PrismHR's LinkedIn presence as a whole, not Global material, and quoting someone's engagement back to them tells them they were watched. The reading now decides who gets a note today and never rides inside it. The readout and the riding-lane ask say "engaging with PrismHR on LinkedIn", which is what the reading measures.
2. **The intent cell is read as a cell.** A real row carries the level on its own line and the count beneath it ("High" / "11 activities"). The old phrase read only caught High rows through the lead badge "Account has high buyer intent", and never caught Moderate. Neutral and Low now read as no intent.
3. **A rise is a trigger.** Moderate to High, none to Moderate, or three or more new activities since the newest grab on an earlier day (inside 14 days) fires intent-warm at 85 with the rise as its reason: "Intent rose to High October 14." or "Sales Nav activity rose to 11."
4. **The "Recently hired" lead badge is read.** The accounts list's lead recommendation carries it on the lead it recommends (Armhr's Deborah Dhuy in the July screenshots). That fires new-in-seat.
5. **Two new grabs, both on-screen only.** "▤ Grab Sales Nav alerts" copies the Home tab's alerts already on screen; "▤ Grab Sales Nav people" copies one account's Relationship explorer cards already on screen. Neither scrolls, pages or clicks. Both paste through the existing grab split, under SALESNAV ALERTS and SALESNAV PEOPLE heads, and the intent read never takes either.
6. **Two new queue rules.**
   - post-trigger (87, send band, burns): "Message {name}." / "Posted {day}." Fresh for five days. The draft is a LinkedIn message quoting at most twelve of the post's opening words.
   - new-in-seat (86, people band, burns): "Meet {name}." / "New in seat {day}." from a job alert, or "New in seat, seen {day}." from the badge, dated by the FIRST grab in the unbroken run that showed it, since a badge carries no hire date. Fresh for 21 days from that moment; the newest accounts read must also be inside the seven-day intent decay.
   Both name the person as given and never shorten a name, compose a note addressed to that person, drop the relationship's email from the file (it is the wrong address), and stamp "WROTE TO {NAME} ABOUT THE POST" / "WROTE TO {NAME} · NEW IN SEAT". Once stamped worked, a people move stays off the queue while the same signal holds. A job alert naming a company other than the account it filed on fires nothing there. The live-motion exclusion holds: an account the HomeRoom is working stages neither.
7. **The shelf.** The three Sales Nav grabs share one card, what each takes and refuses one click down, so the shelf arrives at its 88-piece budget. This changes a face that predates the ship-order rule.
8. **The stakeholder-gap recipe** no longer promises a confirm flow that does not exist; it points at the people grab and says nobody joins the roster until the operator adds them.

## Unknowns And Validation

- **Job-change alert wording is unverified.** The alerts reader matches "started a new position", "has a new position", "has a new role", "changed jobs", "was recently hired" and "is in a new role". No saved-lead job alert appears in the July screenshots. One that does not match files as an ordinary alert and fires nothing. Validate against the first real one.
- **"Recently hired" is read as the lead's own badge.** It sits among the lead's spotlight badges in the screenshot. If it turns out to describe the account, new-in-seat from the accounts list is wrong and should be cut.
- **Not built:** Sales Navigator alert emails into the app. Forwarding work mail or connecting Outlook needs PrismHR IT's answer first, and an email sample to read against. The alerts grab carries the same alerts in the meantime.
- **Not built:** a contact-left signal (your contact leaves a book account). It needs a real job-change alert to know what the old and new companies look like in the text.
- **Not built:** connection paths and TeamLink as a ranking input.

## Addendum: alert emails and job moves (second PR, 2026-10-14)

- **Alert emails file as grabs.** A Sales Navigator alert email (LinkedIn's, about Sales Navigator, with at least one alert line) files as a SALESNAV ALERTS grab and, for its intent alerts, a SALESNAV INTENT grab (src/lib/ingest/salesnav-email.ts). Each alert files on the account it names. The alerts date from the email's own sent time, not the day it was filed.
- **Three doors take one:**
  - the Chute (drop the .eml or .msg)
  - a Drop or the Chute's paste (the Outlook grab of the email)
  - the inbound route, /inbound/salesnav, behind the SALESNAV_INBOUND_SECRET shared secret, for a mail rule that forwards the alerts as they arrive
  
  The inbound route files under a new door, `inbound`.
- **SALESNAV INTENT** reads as an intent reading, like the daily grab. It never quiets the daily nudge, and it carries no lead badge or deal date.
- **A job move files on both companies.** The company they joined is routed on its own. The rest of the row, with that company taken out, routes by the person's name or the old company. The account they joined reads new-in-seat. The account they left reads a new person signal, `left`.
- **contact-left (83, people band, burns):** "Ask who replaces {name}." / "Left for {company} {day}." The draft goes to the person who left, on LinkedIn, since their old address is dead. It congratulates them and asks who picks up their work. The file drops every email address. Stamp: "ASKED {NAME} WHO TAKES OVER".
- **The grab filing moved** into src/lib/ingest/grab-server.ts, a plain module and not a "use server" file, so the inbound route can share it without exposing a callable action.
- **An email is an alert email only when its own From line is LinkedIn's.** It must also be an Outlook thread or headless text (never a call, a Teams thread or a grab), mention Sales Navigator, and carry an alert line that opens with a person's capitalized name. A reply that mentions Sales Navigator, or a colleague's forward, files as the thread it is. The one exception is the inbound route, which is secret-gated and fed only by the operator's own rule. There, a LinkedIn From line inside a forwarded block counts.
- **Alert rows route by their headline and company line only.** A post's quoted words never route it.
- **Dates are read in Chicago time.** Capture stamps and zoneless Sent lines both use Chicago's offset for that date (daylight or standard), whatever zone the server runs in. Intent readings order by when they were observed, not when they were filed, so a late-dropped intent email can't override a fresher grab.
- **The inbound body is capped at 2 MB** while it streams in, whether or not the post sends a Content-Length.
- **Still unverified:**
  - LinkedIn's alert email layout. The reader is a line reader held to alert sentences, tested on a synthetic email. The first real one should be dropped in the Chute and its receipt checked.
  - The job-move wording.
- **Not built:** the HomeRoom does not yet react when its relationship contact leaves; only Groundwork does, on off-board accounts. A board account's departed contact is the HomeRoom's next job.

## Checked against the operator's real Sales Navigator emails (2026-10-14)

- **The "shared a post" digest reads correctly.** It's from messages-noreply@linkedin.com and says "Sales Navigator". Five changes came out of reading it:
  - **Title before company:** the digest writes the line under a name as "Title · Company", the reverse of the feed. Whichever side opens with a job title is read as the title.
  - **Account alerts now recognized:** "New post from X", "Employees at X are active" and "Leadership at X has been active" are read as account alerts, and each files on its account.
  - **Notices end a block:** the "Your Account IQ summary for X is ready" notice and the footer line now end the alert before them, so they can't glue a second account onto it.
  - **Furniture stripped:** links, buttons and LinkedIn's coaching lines ("Engaging with their content…") are dropped.
  - **Sent time fixed:** a Sent line that closes on a zone comment, "+0000 (UTC)", now reads at its real offset. It was reading as Chicago time.
- **The "94 new lead suggestions" digest files nothing, by design.** It never says "Sales Navigator", and its people carry no company, so none of them could be placed on an account. Its "New executives hired at saved Accounts" section would have been a new-in-seat signal if it named the account.
- **Both emails go to the work mailbox and pass through Proofpoint URL Defense** (urldefense.com links).

## The Sales Nav spine (ship order 2026-10-15)

The founder picked Concept C, the day spine, from docs/mockups/groundwork-salesnav-column-2026-10-14.html: "the day spine is the one. build it and ship it."

- **Where it reads.** src/lib/groundwork/spine.ts builds the list from the Sales Nav notes only: alerts rows (person and account alerts), intent rows, and the daily grab's intent rise and "Recently hired" badge. Seven days, newest first, deduped per alert: a post is one person on one Chicago day, a job move is one person, an intent reading is one per day, and an account alert is one line per day.
- **Links.** The alert emails' buttons are kept now. src/lib/ingest/salesnav-links.ts unwraps Proofpoint URL Defense v3 and LinkedIn's sales-web-view and contract-chooser redirects, drops the tracking keys, and keeps only https://www.linkedin.com/sales/ pages. They file as `Link · <label> · <url>` lines in the alert's row, after the lines the router reads. It was checked against the operator's real digest: Post, InMail, Nextep's employee list and Engage PEO's leadership search all decode. An alert with no link gets a Sales Navigator keyword search. That search URL form is unverified; the employee-list links in the real email confirm the `query=(…)` syntax it uses.
- **Working an alert.** Worked it calls workedChannel with the alert's rule as the move key. That's the same stamp and Sendbook tap the Channel Ask files, so the queue drops the move and the wing stamps it. The channel is EMAIL after an Outlook draft, INMAIL after Open InMail, and otherwise LINKEDIN (EMAIL for an intent note with an email on file). The ↺ shows only on the day it was worked, because the take-back removes today's stamp.
- **✕ and mute.** These are snav:gone and snav:mute namespaced notes, which every account view and the intranet mirror skip. Only the activity group can be muted.
- **Not built:** a per-alert count on the wing, and a weekly roll-up for anyone. Nothing is rolled up to anyone unless the founder says so.
