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
