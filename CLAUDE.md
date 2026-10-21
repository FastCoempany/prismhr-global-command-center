# Command Center — session canon

## Design canon (binding, founder-decreed 2026-07-28)

### Mockups follow the Antaeus design system. No exceptions.

Every mockup, concept, or UI built in this repo uses the locked Antaeus brand
identity (`antaeus-brand-kit/spec/`, especially 00-charter, 03-component-library,
10-brand-identity):

- **Field:** bright `#F5F7FB`, one theme. The dark exception is retired.
- **Ink:** navy `#0A1C40` at the opacity ladder (solid / .66 / .42 / .22).
- **Accents by role, never by hue:** orange `#E6701E` is the ONE dominant move
  per surface and appears nowhere else; blue `#2563EB` system intelligence;
  green `#22C55E` real health; amber `#F59E0B` caution; red `#EF4444` real risk.
- **Type trio:** DM Serif Display (the authored read), Public Sans (the work),
  JetBrains Mono (kickers/timestamps, letterspaced uppercase, recessive).
- **Voice:** plain sentences a peer would say; state before explanation; object
  before controls; one dominant move per screen.
- The Grounded-A mark is navy or currentColor only, never an accent color.

### Forbidden mockup styles (the "typical Claude mockup" list)

The founder has permanently banned the default visual costumes produced on
2026-07-28 and anything in their family. Do not produce, in any mockup or
surface:

1. Pastel blue-grey "admin paper" chrome (`#f6f9ff` / `#cdddf5`-tinted panels,
   sky-800 buttons) presented as a design direction.
2. The dark navy "ops console" with amber/gold monospace accents (flight
   strips, comm logs, runway bars on `#0c1424`).
3. Warm greige/cream "editorial" panels with serif heroes and gold buttons.
4. Skeuomorphic stationery metaphors as identity: manila folders, rubber
   stamps, index cards, notebook ruling, Cornell margins, red margin rules,
   graph/blueprint drafting paper, drawn brackets/connectors.
5. Progress-wash "ribbon" rows (stage tint sweeping under content).
6. Ad-hoc per-mockup palettes of any kind. The palette is the brand's, always.

Distinctiveness between concepts must come from **structure and information
architecture**, not from costume changes.

## The writing canon (binding, founder-decreed 2026-08-10)

Operator-facing copy — queue lines, buttons, nudges, empty states, generated
prose the operator reads — obeys these rules everywhere in the app:

1. **Imperative mood.** The app tells the operator to do the thing. Verbs,
   never noun-forms: "Send the model," not "model delivery is pending."
2. **Actions are for the day.** An action line never carries a deadline —
   "call the CSM before Friday" is banned. The action is today's; the date
   lives in the reason line: "Call the CSM." / "Renewal meeting Monday."
3. **The reason is the trigger, not a description** — a deadline, a promise
   made, an unanswered message, a date, a deliverable owed. Recency alone is
   never a reason.
4. **No hedging, no framing:** cut "it may be worth," "you might want to,"
   "consider," "worth a line?", "this account appears to."
5. **No em-dash asides, no parentheticals,** no sentence needing a second read.
6. **Top-level action and reason lines: six words or fewer.** Depth lives in
   the drilldown, never on arrival.
7. **Yesterday carries.** A move surfaced yesterday and left unworked returns
   today saying so. The room never quietly forgets what it asked for.
8. **"X-shaped" is retired** (founder-decreed 2026-08-19). "Shaping up to be
   EOR" is fine; a thing is never "EOR-shaped."
9. **The two-tier law.** Every account is a PEO, and a PEO's clients ARE its
   book — so "their client" can never be contrasted with "their own book."
   A need is either **internal** (the PEO's own) or **a client's**. Say
   "internal"; never "their own book."
10. **No property-talk about history.** "Their book is domestic-only" is
    retired; say it as plain history: "they've only done business
    domestically up to this point."

## The plain-speech law (founder-decreed 2026-08-25)

Authored speech everywhere — playbook asks and glosses, fact lines, operator
guidance, generated prose, composed drafts — bans rhetorical engineering.
Three voices exist in this app, and the law reads differently per voice: the
app speaking to the operator (the writing canon above governs — imperative,
terse, no hedging), the seller speaking to a prospect (this law in full, plus
the conversational register), and the prospect's simulated speech in answer
rows (realism governs — hedged, incomplete, human; the writing canon's
no-hedging rule does NOT apply there, because real people hedge). An
imperative instruction ("Send the model") is the app doing its job; the
banned maxim is generalized wisdom performed as a truth ("controlled beats
discovered"). Seller-side narration — pipeline talk in anything a prospect
will read or hear, drafts included — is banned under this law app-wide. Out
of scope: this file itself, code, comments, and commit messages are
engineering documentation, not operator copy. The seven devices, named and
dead:

1. **Antithesis** — "not X, but Y" ("a person, not a queue").
2. **Paradox** — two states that shouldn't coexist ("a call that ends hasn't
   ended").
3. **Maxim** — imperative wisdom, no hedging ("controlled beats discovered").
4. **Definitional flip** — redefining a familiar word ("questions now are
   free — later they're change orders").
5. **Consequence closer** — statement, dash, implication ("— the close
   arrives earned").
6. **Escalating triad** — three beats arranged so the third lands ("their
   pay, our employment, our answer").
7. **Chiasmus** — ABBA inversion ("inside the machine, not beside it").

A line balanced on a device gets rewritten as a flat declarative carrying the
same fact. A line with no content once the device is stripped was decoration
and dies. Banned under the same law: invented slang ("read-back," "when it's
home"), constructed non-conversational phrasing ("on the first pass," "which
shape is your client," "unlocks the full shape"), and performative
reassurance flourishes ("and they shouldn't have to," "no judgment"). The
register target is "totally fine" — words a person would actually say.
Genuine content survives: tape quotes verbatim, real lists of three actual
things, real two-case explanations, and precision repetition an ask itself
needs ("not an office, not a bank account, a registered company"). Three
boundaries, so the law cuts the right things: a dash as ordinary speech
punctuation is fine — the device is the dash as a hinge delivering an
implication as a beat. A comparison of two real options or quantities is
content ("one demo instead of three"); the device is two halves restating one
idea for rhythm. Reassurance that states a fact is fine ("most partners can't
answer these off the top of their head"); the flourish that performs empathy
("no judgment," "they shouldn't have to") is not. The test, line by line:
read it flat — does it still do work, and would a person say it without
feeling like they're delivering a line?

## The playbook authoring canon (founder-decreed 2026-08-25)

Binding on every playbook surface — concept files now, production when the
freeze lifts. The playbook is a universal tool: no account or person names on
any surface, ever, unless explicitly directed.

1. **The consult register.** Thirty minutes of consultation every call, all
   scenarios. Every question carries its own why in the same breath or on its
   tail — and the spoken why is the prospect's why, what answering gets THEM.
   Seller-side narration is banned from spoken lines ("we've got a live deal
   to work" is pipeline talk); tactical framing lives only in operator-facing
   leads the prospect never hears. The why explains the world, never the
   interview: it talks about the thing (what clients mean, what countries
   do, what breaks) — never about the craft of asking ("I ask for the
   words," "I press on this one," "the reason I start there") — and it never
   echoes the question's own phrasing back ("in their words? I ask for the
   words…"). "I ask because" is one attachment among many, not a template;
   when every ask carries the same connective, the formula itself becomes a
   device. Often the strongest form is no connective at all: the question,
   then the reason as its own plain sentence. Thirty minutes is the depth of
   the design,
   not a stopwatch: no path exits before the give-back and the close, and
   nothing pads to fill a clock. When the prospect ends the call early, the
   close ritual still runs.
2. **One thought, one question.** A question carries exactly one thought;
   jumbled asks are banned. The line of questioning works one client at a
   time — it never switches mid-chain into a survey of the whole client base.
3. **Only questions that must be asked.** The asked-for-what-arrives species
   is banned: a question whose answer arrives on its own — implied by a
   bigger fork already taken, or surfacing naturally at logistics (support
   routing, client counts) — is never asked. The app never asks what it can
   read, and the seller never asks what the conversation will hand over
   anyway.
4. **Teach on every don't-know.** A don't-know is never a dead end: hand them
   the exact list to gather, send it today, and book time to go through the
   answers together. Every don't-know routes to a teach or files a question
   to the client list. Loaded questions name their kinds ("promised anything
   — a start date, a salary, benefits, a title?").
5. **The secondhand law.** A PEO holds its client's facts secondhand at best.
   Asks about a client's hiring stage, pay, or registrations speak in relayed
   knowledge ("did the client say…"), answer rows reflect what a PEO would
   actually know, and a don't-know option always exists on client-fact asks.
   Facts the PEO holds firsthand — their own operation, their own referrals —
   are asked directly, and a firsthand line the tape itself holds stands.
6. **The give-back law.** Before any next-step ask, play back what their
   answers add up to — a read-out per arc, bulleted, ending on a check
   question. The teach paths' give-back is the list itself. Gathering facts
   for a whole call and then asking for a next step is banned.
7. **The sweep law.** A path arriving at the close with a next step already
   set and dated skips the ritual ask (never re-ask a settled thing) and runs
   the room sweep instead — which explicitly steps past the client on deck
   before fishing for the next one. A surfaced client loops back into the
   consult on the same call.
8. **The close ritual.** Every path ends with a next step on the calendar.
   The ritual ask is the taped verbatim; the locks (demo booked with the room
   named, numbers with a review call booked, the internal-meeting re-convene
   with the one-pager out, the digest menu with a Friday time theirs to
   cancel) close every call.
9. **Discovery progresses naturally and anticipates nuance.** Each question
   grows out of the answer before it — no checklists. Answer rows carry the
   nuance a real PEO brings: mixed setups, "it depends on the client," the
   wrong person on the call (files internal homework and moves on), "we
   haven't thought about what we'd charge." The PEO's own operation (systems,
   service front, billing, the go-to person) gets discovery, not just the
   client's deal — the record shows prospects volunteering exactly this when
   unasked. On a live-client path the client's deal comes first and the
   operation's discovery rides after the read-out; when no client exists,
   the operation IS the call. An answer's branch is the next thing the
   seller says, never a jump to a new topic the answer didn't open.
10. **Coverage.** Every ask's answer rows cover the responses the record
    shows plus the realistic don't-know — a reply or voiced question the
    tape or the filed record holds must have a row or a floor chip; a
    missing realistic response is a bug, not a simplification.
11. **Every exchange lands.** A floor question runs to an intelligent end:
    the answer, the ask-back, the replies they'd actually give, and each
    reply's response through to a landing. No exchange ends mid-air, and no
    ask is left with nothing to say after they answer.
12. **The conversational register.** The plain-speech law above applies in
    full: the seven rhetorical devices, invented slang, constructed phrasing,
    and reassurance flourishes are all banned here. Beyond it, the test is how
    people converse, not how they write. No mid-sentence noun catalogs ("— the
    cost, the timeline, and the contract"); deliverables get said as spoken
    clauses ("what it would cost, how long it would take, and what everyone
    signs"). Abstract claims name a couple of concrete examples ("required
    employer costs — pension and social contributions, in some places a
    mandated extra month's pay"), never figures. Enumerations render as
    bullets with a plain subtext line explaining each. Answer rows ("if they
    say") are realistic speech — hedged, incomplete, human ("Honestly, I'd
    have to ask them") — never engineered paraphrases nobody would say, and
    never carrying stage directions inside the quotes. A term of art spoken
    to a prospect carries its gloss in the same breath, on the same card.
13. **The armer doctrine.** This is a channel sale — the same partner across
    the table for years. Offers of help keep us on their side of the table; a
    probe that makes them account for themselves moves us across it. The test,
    per exchange: does the prospect leave holding something — a fact they
    needed, a document, a next step — or holding a debt, an account of
    themselves they owed us? Every ask and follow-up passes it.
14. **Evidence or nothing.** Every lead and cite reads a rung of the
    evidence ladder, strongest first: transcripts → filed threads → call
    notes → lessons, gems, and the gap ledger → research and team intel.
    Only nothing on any rung makes a thing unproven — and unproven ground is
    marked (∅), never faked. Nothing is invented: no origin stories, no
    facts the record doesn't hold. Cite labels name their rung — ON TAPE /
    FILED THREAD / CALL NOTES / ❖ LESSON / RESEARCH / TEAM INTEL, compounds
    allowed when a thing stands on two rungs — and are evidence, never
    coined doctrine slogans.
15. **The ship audit.** A playbook surface is delivered only after its
    audits run clean, every time it changes: the graph audit (every node
    reachable, every path ends in a close, every don't-know routed to a
    teach or a list), the scans (account and person names, money, speech),
    and an adversarial read against every law above. The passes are part of
    authoring, not a favor to ask for.

## The direct doctrine (Russ Jones, SVP of Sales — SKO, Kansas City, 2026-08-03/06)

The CSM gate is down. Sellers are greenlit to market, sell, and reach out
directly to the PEOs. Be careful, but do what it takes. In this app that means:

- Direct outreach to account people is the default move; routing through the
  CSM is a tool chosen when it is genuinely the fastest door, never a toll.
- "Ride it, never around it" copy is retired. A colleague's lane is one door
  of two.
- When a send crosses a hot, live CSM thread, the composed thing carries a
  quiet flag so the operator knows. It informs; it never blocks.

**The Approach is a fact, never a gate (ruled 2026-09-25, C19):** NEEDS_CSM, CHANNEL_OK and DIRECT_OK record whether the CSM was briefed and whether client outreach is cleared, and nothing is withheld by them. The stage's direct play is the default seed at every stage; the CSM play is the alternative and carries the quiet flag when a live CSM thread exists. The dashboard still advances the recorded fact (boardLift).

## Groundwork face (decided 2026-08-10)

The Stage won the triptych, and the **winged stage** won the variations
(2026-08-10): one account center stage with an action line and a reason line;
a left wing holding the day's worked stamps; a right wing holding the waiting
queue heat-mapped (solid amber burns today, half amber dated this week, quiet
ink keeps), each name with its trigger whispered beneath. The instrument is
**the Klaxon** (triptych winner, 2026-08-11): the band's command and countdown
run the masthead — serif verb left, orange count right, a full-width burn bar
draining as the window empties, red and throbbing inside the last five
minutes; the capsule facts (Chicago clock · date · weather) ride the sub-row.
The room keeps the lower deck (the wire · the institutions · State of play). Groundwork is outbound only — activities the
operator initiates today to build pipeline; reactive account motion (replies
owed, decision windows, meeting prep) belongs to the HomeRoom. The accounts
page's stores and the deep-research notes (`research:<account>`) are backbone
inputs to the queue brain. The queue reads the board (2026-08-13): an account
whose deal sits at demo or later, or carries a Closed Won/Lost stamp, leaves
the queue entirely — Groundwork prospects the book it is NOT actively closing.
One rule holds at most two leading slots (its overflow sinks below other
rules), and the book-wide research stamp going stale is ONE move ("Run the
research pass.") carried by the strongest above-gate account, never a wall of
per-account clones. The record's live motion excludes too (2026-08-14): a
real inbound within 21 days, or a meeting/call/transcript filed within 14,
means the deal is being worked — the HomeRoom's job, whatever the lagging
board says. The operator's own outbound never excludes; the drumbeat rules
need it.

**The exclusion reads both records (ruled 2026-09-25, C6; amended 2026-10-05):** an account person's inbound that landed in a colleague's inbox is a real inbound and leaves the queue. It produces no move for the operator anywhere: the coordination move ("Ask Anika what they said.") is retired, on Groundwork and on the HomeRoom alike.

**The HomeRoom takes what Groundwork hands it (ruled 2026-10-07, pass 8 call 1, the founder's delegation):** an off-board account excluded for live motion in the operator's own record gets a HomeRoom row, read by the same engine, until the exclusion lifts, and a seat on it reads there as its action (C8). An exclusion that rests only on a colleague's inbox adds no row (C6).

**Ruled 2026-09-25 (C7, C9, D22, D26, D27):** the two-slot cap governs rules; seats are the operator's own forks and keep their own cap of three. The research bearer is the strongest above-gate account with no candidate of its own, the vehicle rule's letter, and a vehicle never collides: when every eligible account has its own move the slot drops for the day, and the bearer is chosen after the seats are placed. One band table lives in day.ts and the queue, the Klaxon and the test all read it: sends 9:00 to 11:00, people 11:00 to 14:00, research and filing from 14:00, Chicago; before 9:00 the send band is next, not now. No rule stamps with an empty label.

**The stamp words (ship order 2026-10-06):** when no channel line speaks, the rule's own stamp says what the operator did, in the past tense, then its specific: "WORKED THE MOVE FROM THE SHEET · SEATED 10/6", "ACTED ON ADAM’S PHR STALL" (the THEIRS line's own label), "OPENED THE FIRST CONVERSATION · 14 SUPPORT CASES". SEATED, THEIRS and ENGAGED · NEVER MET retire as stamps. A filed touch's channel line (`EMAIL · STEP 1 · CRISTINA B.`, the Sendbook) still leads the stamp when there is one.

**The Sales Nav spine (Concept C, ship order 2026-10-15; docs/mockups/groundwork-salesnav-column-2026-10-14.html):** a fourth column inside the instrument, right of the waiting wing, holds every Sales Navigator alert on a book account in the last three months, newest first under TODAY / YESTERDAY / THIS WEEK, each older month folded beneath by name (amended 2026-10-15), a glyph per kind down the spine; under 1,180px it drops below the wings at full width. It reads only the Sales Nav notes the grabs and the alert emails file, plus the daily grab's intent rise and "Recently hired" badge. The alerts lead: the newest reads large with its buttons showing, the rest show theirs on hover or focus. A post, a job move or an intent change carries its queue rule (post-trigger, new-in-seat, contact-left, intent-warm); its note opens as a pop-out beside the column, never in it, with Copy, an Outlook draft only when the person's email is on file, Open InMail when the alert carried one, and Worked it, which stamps that rule's move and files the touch through the Channel Ask's own path, so the move leaves the queue. Employee and leadership activity, company posts and growth carry no draft and no Worked it, because nothing happened to write about; they get their links, ✕, and a mute. Links open only Sales Navigator pages unwrapped from the alert email (urldefense and LinkedIn's tracking stripped), a Sales Navigator search by name when the alert carried none, or Salesforce (the record, and New Contact filled in for a person the book does not hold). ✕ hides one alert and the fold below brings it back. Blue is the column's color; orange stays the stage's one move. The ledger's exclusions hold (not mine, parked, snoozed); live motion does not hide an alert.

**The draft on the stage (ship order 2026-10-19; docs/mockups/groundwork-draft-stage-2026-10-19.html):** Concept A, the letter, won, with Concept B's run as the send-band mode. An email move's stage holds its note: the action line names the person and the channel ("Email Cristina."), the reason keeps the trigger, the draft sits beneath, edited in place, and Send in Outlook is the one orange move. Each email move is drafted before the send band by the drafts job (Vercel cron, weekdays 11:00 UTC, on the Opus roster) and again on Redraft, kept as a stagedraft:<account> note; with no draft the rule's composed note stands in. An edit saves as the operator's own hand, and a draft is never filed. The waiting wing marks each drafted move. The evidence chips fold under "Why this note", each said plainly with whether the draft uses it, their doors beneath; the collision flag reads as an instruction. During the send band the stage runs the drafts as a stack (S sends, E edits, N moves on), with a pip bar of the day's run. Send opens the draft in Outlook, stamps the move and leaves a sendwait: marker, and the wing says SENT · WAITING ON THE COPY until the sent copy comes back: a Power Automate flow on Sent Items posts each sent email to /inbound/sent, which routes it by its recipients' address or domain alone and files it through the paste pipeline. An email move whose account the record shows sent to today is worked, from the stage or straight from Outlook; that stamp is the record's and carries no ↺.

**The burn bar too (ruled 2026-10-07, pass 8 call 11, the founder's delegation):** inside the last five minutes the burn bar turns red and pulses with the count; reduced motion keeps the red and drops the pulse.

## The Chute (decided 2026-08-11)

The HomeRoom carries ONE intake at the top: the Chute. Files (.eml/.msg/.pdf/
.vtt call transcripts/text) thrown at it are read on the spot — VTT is the
richest capture and parses free in the browser to speaker-labeled lines headed
CALL TRANSCRIPT — routed to their account by the book's
own signals (known contact email > company domain > account name — pure rules,
no API needed), and filed through the same pipeline a paste takes, so the
intelligence in each file fans out app-wide: record entries, opened
commitments, gaps, playbook intel, outcomes, and every tab re-derives. Nothing
files blind: no sure match or a disputed read waits for the operator's pick.
The per-row Drop stays; the Chute is the throw-it-all-here door. The receipt
ledger survives a reload (per Chicago day; mid-flight reads come back as
"interrupted — drop it again"), and the paste pipeline refuses duplicates
app-wide: the same capture filed to the same account twice returns "Already on
file. Nothing filed twice." (pastehash markers; an undo clears its marker).

**The roster reads the record too (ruled 2026-09-25, C2):** beside the book's contacts and domains, the router's email and people rungs read every actor and recipient the record holds for the account. The rungs stay pure rules, the guard still judges the result, and an undo withdraws whatever the undone filing taught.

**A waiting pick survives a reload (ruled 2026-09-25, C20):** a read that finished and waits on the operator's pick is not mid-flight; the ledger keeps its text and the wait comes back. A binary file the ledger cannot keep says so and asks for the re-drop.

**Ruled 2026-09-25 (D1, D2, D3, D4, P2):** the Chute is one component with one roster and routes the same way wherever it mounts. The weekly export enters by the Chute or the Intranet dock, both into the one activity pipeline; the Drop refuses a .csv, vaults it under the row's account, files nothing there, and the receipt says it was dropped in the wrong place, is backed up, and belongs in the Chute (amended 2026-10-05). The transcriber emits CALL TRANSCRIPT when a PDF or image reads as a call, with the recorded day when it carries one, and the tape's cap and archive follow. The vault keeps the file whole and the note keeps the text whole at any size; only the model's read is windowed, and every window that cut something is on the receipt. Every reader is covered (ruled 2026-10-07, pass 8 call 3, the founder's delegation): the .docx, spreadsheet and transcription readers hand on the text whole, and only what goes to a model is windowed. The Intranet's capture is a door too: what names an account files through this pipeline, routed, guarded and picked; what names none stays an Intranet doc and is never inbound.

**Ruled 2026-09-25 (D5, D6, D7, D9, D11, D12, D13, D14):** the pick is final and files without a re-judge; a batch sibling is a suggestion, never a rung. Vaulting is filing: an unreadable file vaults to the account its filename names by the rungs or waits for the pick, with a receipt. Backups are permanent (founder, 2026-10-06): a backup line has no take-back. The duplicate check fails open and says so on the receipt; a ✕-parked filing is still on file and a re-drop is refused. A filing may be disputed twice (amended 2026-10-05): the text rung warns before the read and the read's rung warns after it, each with a reason of nine words or fewer that says why the file looks like a different company than the one it was dropped on; the read rung's reason is the model's, read from the account's page data and the web, and when the model finds the same company the warning withdraws. One pick answers, and the pick's read runs again. The Chute reads three files at once; the rest wait in drop order and say so. Receipts dismiss per row and all at once; the fold shows every waiting row plus the two newest settled; a settled row keeps the account, the counts, the day and the rung, never an address or body text. Routing runs on the server: the roster never ships to the browser. A typed note is a paste.

**Ruled 2026-09-25 (D10, D15, D16):** their commitments file as loops on their side with the promised day; the court reads them and a blown one carries as PROMISED like ours. The read's signals file on the note, a repeated commitment is one loop, and an outcome files a marker that only the operator's click closes. There is no revalidation list: every page derives on request. D15 reaches every action (ruled 2026-10-07, pass 8 call 2, the founder's delegation): an action may refresh the page it was called from, and no action revalidates another surface. The same capture is the same normalized body, head line skipped, so a rename, a twin format and a re-copy with a fresh date all dedupe.

**The vault is canon (ruled 2026-09-25, D8):** every dropped file archives whole to GitHub under accounts/<Account>/<file> through a server-side upload, so no token reaches the browser. Files of every size travel this way: one above the server's request cap arrives in pieces the server assembles before it lands, and git is the home for every dropped file (amended 2026-10-05). The vault is evidence outside the money boundary because nothing renders from it. A duplicate drop vaults nothing new; every vault line is a receipt. A readable file whose filing fails still vaults, to its routed account or under accounts/\_unfiled/, and the receipt says the filing failed and the file is backed up (ruled 2026-10-07, pass 8 call 8, the founder's delegation). Backups are permanent (founder, 2026-10-06): nothing takes a file back out of git, and a backup line carries no ↺.

**The relays (2026-10-19; docs/power-automate-sent-copy.md):** with no Premium connector and no IT, the operator's mail reaches the app by relay: a standard Power Automate flow mails a tagged copy to the inbound address the Sales Nav alerts use, and /inbound/salesnav hands a tagged message to the sent copy ([GW-SENT], routed by its recipients) or the inbox copy ([GW-IN], routed by its sender) before it reads anything for alerts. Both route by an exact address or a company domain alone and file through the paste pipeline as the inbound door. Our own side (prismhr.com, vensure.com) routes nothing, even when the book holds one of ours as a contact, and an inbox copy from a role or bulk sender is machinery and routes nothing. A third relay, the calendar copy ([GW-CAL], routed by its attendees), runs at the day's end on the events that started that day: each with an account's people files as one logged meeting held (✔ … Meeting held), so the live-motion exclusion and the recap read it; an event not started, cancelled or declined files nothing, and the duplicate guard files a re-relayed event once.

**Ruled 2026-09-25 (D29, D30):** a read-only session sees the Chute bar and its receipts and cannot drop; the bar says "Read-only session" where the ⇪ button was. The intranet mirror's query excludes every namespaced row by construction. The SalesNav grab pastes into the Chute or a Drop like any capture and files as a note with its own head. Its paste target is the pipeline (ruled 2026-10-07, pass 8 call 12, the founder's delegation): the bookmarklet's paste lands in the Chute's pipeline under the SALESNAV ACCOUNTS head, never in the Intranet dock. The grab splits per account: each row the router surely matches files as its own note on its account, and a row with no sure match files nothing and is counted on the receipt. A grab records what was seen on the day it was taken, so its per-account fingerprint carries that day: a re-copy the same day dedupes, and a grab on a new day files fresh (ruled 2026-10-07, pass 9, the founder's delegation).

**The held file and the receipt (ship order 2026-10-06; docs/mockups/chute-faces-2026-10-06.html):** one box holds a disputed or unsure file at every door: an amber HELD kicker, the reason, which opens to its grounds, then "File to {claim}" in solid ink, "Keep on {bound}", "Another account" and a hover ✕, "Don't file it." The ✕ files nothing and backs the file up under accounts/\_unfiled/; on the Intranet it keeps the capture in the brain. A receipt is one line: the account, its counts, the day and the rung, with an amber second line only for a cut read, a skipped duplicate check or a reader that was down. The line opens to what the filing wrote; ↺ takes it back, ✕ clears it. It opens every count it shows, asks and playbook lines included (ruled 2026-10-07, pass 8 call 9, the founder's delegation). The held box's fallback reason reads "The read names {claim}."; "Reads as {label}." reports the reader's classification and is not a hedge (ruled 2026-10-07, pass 8 call 13, the founder's delegation). Send-it hands its dispute to the Chute: "Held in the Chute above."

**The typed note and the picker (ship order 2026-10-06):** a rich note typed in the Drop's ▢ composer, one that takes the full read, files under the TYPED NOTE head with the typed source, and its chip says "Reads as a typed note." before Enter; a jot stays an instant note (2026-08-13), and a thread pasted there keeps its own dialect. The ⚡ pane stamps nothing, because it cannot tell typing from pasting. Neither door's file picker filters by type: the vault takes every file, and a misplaced .csv gets its refusal.

## The Scratchpaper (decided 2026-08-12)

The stash floater is retired — component, actions, and lib deleted. In its
seat on every page: the Scratchpaper, the Float (triptych winner). A ✎ button
bottom-right opens one running pad: write, Enter, the line lands date-and-time
stamped (Chicago), newest first under TODAY/YESTERDAY/dated kickers. One
durable store (`scratch:pad` namespaced notes — outside every account view and
the intranet mirror by construction). The pact: it stays there and only there;
nothing routes, nothing files, nothing becomes an action. The paper keeps
figures (amended 2026-08-21): because the pad routes nowhere by construction,
the money doctrine's boundary holds at the pad's edge — scratch lines are NOT
money-redacted; the ask door still redacts, because asks leave the paper.
Lines are editable in place (✎ on hover, decreed 2026-08-21): Enter keeps,
Escape puts it back, the timestamp and seat never move. ✕ is per line and
deliberate — and it archives,
never destroys (2026-08-19): the line moves to `scratch:gone`, readable under
the pad's STRUCK fold, restorable by ↺. Nothing on the paper ever dies.

**The ask door is not the paper (ruled 2026-09-25, D24):** a line leaves the pad only by the operator's own act of asking, and the pact holds for every line not asked. Click-away keeps an edit; the pad never eats your words.

## The Sendbook (triptych winner, decided 2026-08-19)

The outreach register lives at `/sendbook`, doored from Groundwork's page-foot
Tallyfoot line (`THIS WEEK · N WORKED · …`) — never in the top wayfinder. One
merged view (Ted doctrine), two doors in: the record's own outbound entries
(a Chute-dropped .eml IS the touch), and the **Channel Ask** — Groundwork's
Worked-it springs a chip row (EMAIL · CALL · VOICEMAIL · TEXT · LINKEDIN ·
INMAIL · ··· ENGAGED/CONNECT/VIDEO/EVENT/MAILER/INTRO/CSM RELAY) filing a
`sendbook:<account>` note; a second chip row asks who only when the book knows
more than one name. The **pre-answer rule**: an outbound the record already
holds today answers the ask before it opens — the app never asks what it can
read. Steps are counted, never asked: per run, reset by a 45-day quiet or by
the account speaking. Tapped touches are synthesized into the queue's drumbeat
clocks at read time, never written to the touch log. The wing's done-today
stamps carry subtext (`EMAIL · STEP 1 · CRISTINA B.`). Lanes by decree:
**NEVER MET means they have never replied and no meeting was ever held** —
the operator's own outbound never warms an account, and a CSM intro doesn't
either; prior warmth marks the line GONE COLD. Replies annotate from the
record only (↩ REPLIED); outcomes are never asked. The register tells what
happened; what is due next stays Groundwork's. The take-back: every stamp
carries a hover ↺ that returns the move to the queue and withdraws its tap —
the record's own entries are never unwritten; the chip rows carry ✕ to close
without filing. The wing never stamps mutely: no channel line means the
rule's own label speaks.

**Ruled 2026-09-25 (C4, C5, C18):** ↩ REPLIED needs a substantive inbound — a closer warms the lane and sets no annotation. Machinery never warms and never replies: a calendar acceptance, a bounce and a campaign alert are machinery whatever inbox caught them. The who chip row offers the record's people merged with the book's contacts, and asks only when the merged set holds more than one name.

**BOOKED (ship order 2026-10-06):** a send their calendar accepted carries BOOKED with the day, green, beside ↩ REPLIED when both apply. The acceptance stays machinery: BOOKED never warms the lane, never resets the drum and never counts as a reply, and our own side accepting books nothing.

## The Spring (triptych winner, decided 2026-08-13)

The HomeRoom row's right panel runs on springs. Each register — UNKNOWN,
COMPARABLE (only when peers exist), TODAY — rests as ONE summary line: mono
kicker, live count, top entry trailing off, ⊕. Pressing ⊕ springs the register
out in place; ⊖ or a sibling's ⊕ folds it back — one register out at a time
per row. Filing or composing anything springs TODAY open so receipts never
land behind a fold. Attendant decrees, permanent:

- The court line is retired — the move already says who and when. Retired in
  full (ruled 2026-09-25, D25): the engine no longer computes it, and the test
  pins the move line's who-and-when.
- The per-row icon keybar is retired; ONE legend lives at the page foot.
- Minimalist controls: "not this deal" is a hover-revealed ✕; "ask the brain"
  is ⌕; "mint sharper asks" is ⟳; "find the answer" is →; all tooltip-titled,
  never spelled out on the surface.
- The research control is a dated mono chip (`RESEARCH 7/2 ⟳`) reading the
  LATEST of both stores — the on-demand deep pass (research: notes) AND the
  book-wide sweep. "NEVER" only when neither has touched the account.
- Sheet lines are editable in place (✎ on hover): the visible text changes,
  tags and routing markers survive verbatim (roomTodoEdit).
- Concepts never ship; winners do. Triptychs are judged as downloadable
  documents (interactive when mechanics matter) — production only ever
  receives the decreed winner, and (founder-decreed 2026-08-19) mockup
  work NEVER ships without an explicit ship order — naming a winner or
  amending a face is judging, not shipping. Ask first, every time.

## The email in the row (ship order 2026-10-20)

Concept A of docs/mockups/homeroom-email-row-2026-10-20.html won and shipped
on the founder's order ("we're going with A", then "yup ship it"). The
HomeRoom row's left column carries the newest email on the record whole,
under the meter: either direction, read past sign-offs, calendar acceptances
and machinery by the doc read's own flags, past a line whose direction the doc
read cannot name (a colleague's coordination mail, an unattributed entry),
past a send of ours that reached only our own side (a colleague named by
first name alone included, unless someone on the account's side shares that
first name), past their mail that
never reached the operator (another lane, the operator on no line of it), and
past a chat or call line.
It never makes the row taller than the right panel: past that height it fades,
with one door, "Show the whole email", and a few lines always show. Its
kicker, LATEST EMAIL, names the column and carries no orange; the one move
stays Mark it done.

- **The founder's order amends the click-depth law for this one surface:** the
  latest email arrives whole, and the HomeRoom row's arrival budget rose to
  hold it (tests/browser/budgets.json, 39 to 49, measured on the most a row
  arrives with: the email's own seven pieces, the read's two-piece line when
  the email has no whole text, and the door). Everything else on the row stays
  one click down.
- **The whole email is kept at filing.** The read files each email as a
  synopsis; the filing now also keeps the email's own words, read from the
  whole capture and never the read's window (D4). Only a capture that leads
  with its own header is split (the relay's copies, a dropped .eml or .msg):
  a reading-pane grab or a hand-pasted reply carries the newest message with
  no header, and its blocks are only what it quotes. Each email entry is
  matched to its message by sender and subject: the same address is the
  same sender, accents fold, a bare address reads as the name the thread
  pairs it with anywhere in the capture ("Reyes, Dana" included), a short
  form ("Dana") pairs only when the address spells the read's name, an
  address spells a name only when the capture names it nowhere, and never
  across sides;
  a day and a clock both sides name must agree, and a tie left standing keeps
  nothing. When the read files one email, the capture's own message pairs on
  its sender alone, never on the subject alone, which every message of a
  thread shares. Headers read in English and in the languages the book's
  partners write in. The message is cleaned of banners, external-sender
  notices and first-contact tips, mail-app taglines, the quoted trail (a
  header block, an attribution in any of those languages, Apple's quoted
  one and Zoho's dashed one included, a forward marker, a closing block of
  quoted lines, a footer below the quote, and a quoted header that carries
  an address, a subject or a dated clock; an attribution carries a date
  with its year and a clock, so a person quoting someone "on Monday at
  10:30", or naming an address in their own sentence, keeps their words),
  a banner only in banner words (what not to click or open, or that it
  originated outside) and never a line that asks or speaks for the person,
  a signature card (only when a name sits straight under the sign-off and
  every line after it reads as a card with a phone, link or address) and a legal notice that opens its own
  line below the first paragraph, or the first line of a one-paragraph
  email, with nothing of the person's own after it (no sign-off, question
  or promise); paragraphs, inline answers (a line of their own between quoted
  lines or straight under one), a P.S. and a sentence that only looks like a
  trail are kept (cleanEmailWhole, src/lib/activity/excerpt.ts).
  It lands in the EmailText table keyed by the note, redacted on the way in
  and out by the strict rule an email's own words take (redactMoneyStrict,
  src/lib/intel/lexicon.ts; src/lib/notes/email-text.ts). An email talks
  prices in more ways than a list of price forms can name, so the rule names
  what is not money and takes every other figure: a date, a time, a year
  said as one, a phone number, an ordinal, a numbered label or form, a share
  that prices nothing, and a count, stay. Each keeps only its own shape: a
  time is an hour of 1 to 12 with its minutes, meridiem or zone, a range or
  an alternative of them ("2-3pm", "10:30 or 11"), or a bare hour in a
  sentence about meeting, never in price talk ("49 pm" is per month); a
  date or a clock may be the partners' ("15 de enero de 2027", "14h", "a las
  10"); a phone is dashed, dotted, in parentheses or with its country code,
  or joined by spaces only alone on its line or after a phone word, so a
  price grid is no phone; a label is capitalized with a short number ("Day
  1", "Tier 2", "Ticket 4471"); a form number is a form only said as one
  ("Form 940", "1099 contractors"). A year is said as one after a word
  that only ever sets a year ("in 2009", "since 2019", "Q3 2026", "the fall
  of 2026"), beside a month, as a run of consecutive years ("2025-2026",
  "2026/27"), or before a word a year leads ("the 2026 renewal"), and never
  in a sentence that talks price; a round figure in a price's place ("a fee
  of 2000", "2000 net", "1950-2050") is a figure like any other. A
  count is a figure followed on its own line by a word from the list of
  what a figure can count, in prose's lowercase ("45 employees", "3 open
  roles", the partners' "35 empleados"), with no slash or price word after
  it ("499 partner cost", "599 employee/month"); a singular count word keeps
  a figure only for one of it or when it describes the word after it ("a 50
  person company"). Time counts in the plural, one of it, or describing
  what follows ("3 months", "1 month", "12-month", "a 90 day notice
  period"), and a headcount or a team of so many counts with
  nothing after the figure and no price in its sentence. A range or an
  alternative of two figures gets one verdict ("45-50", "2 or 3 hires"),
  "50+" counts as 50 does, a held form or a dotted abbreviation describes
  what follows ("45 W-2 employees", "12 U.S. employees"), and the book's own
  words count ("120 companies", "3 PEOs"). A number word, a determiner or a quantifier
  between a figure and what follows ends the count ("599 six months ago",
  "3500 these days", "tous les mois"). A word the list does not name never
  keeps a figure, and a pace of hiring goes like a price. A share prices
  something when a price word, singular or plural, stands before it in its
  sentence (a decimal point or an abbreviation ends no sentence), just
  after it ("a 12% markup", "a 20% rev share"), or when it is a share "of
  gross", payroll, salary or revenue. A figure with a currency on either
  side, a currency or a unit glued to it ("P25,000", "RM5000", "9000zł",
  "599ea"), spelled out as an amount ("sixty thousand", "1 lakh") or set as
  a rate always goes; a name with a digit in it ("Q3", "B2B", "SOC2")
  stays. What decides reads words, never
  digits, so running it twice changes nothing. An entry with no sure message keeps an empty
  row, so the row can say the filing looked. The undo takes it back after the
  notes. An email without its words shows the read's synopsis and says why,
  each reason true: "This one was filed before whole emails were kept." (no
  row), "This filing didn't include the whole email." (an empty row), "This
  send was logged from the app." (an Act Lane send, read off the note, which
  gives way to the relay's filed copy of the same email, to the same
  person, sent in its minute or within half an hour after), or
  nothing when the store could not be read.
- **EARLIER is rebuilt.** Each line reads the day and the clock from the note
  itself, who wrote to whom ("you" for the operator), and the subject with the
  format code, the frozen "Today", the reply prefixes, the external tags and
  the pipeline's placeholders gone. The stored head keeps its grammar, because
  the clock, the meeting read and the promote regex parse it; a call's and a
  task's entry head reads as clean as an email's, the partners' forward and
  reply prefixes ("RV:", "TR:", "ENC:", "RES:") included, and every line and
  every opened body takes the strict money rule an email takes. ✎ on a filed activity
  edits the subject in its slot and starts from what is stored, never the
  display's copy, with the figures the line hides hidden in the box too; a
  sign-off line carries no ✎. The lines run in
  the order the record happened, an entry at its head's clock in any dialect
  read as Chicago's. A moment is claimed only as far as the record holds it:
  a day with no clock sits at that day's Chicago noon and answers nothing on
  its own day. An entry filed with no day shows none, and its stamp, which is
  when it was filed, never places it: it sits just below its filing's oldest
  dated entry (an entry whose day the record holds, never a marker or an
  archive the filing wrote), or below every dated entry when its filing
  dated none, keeps its filing's capture order, and takes the latest email
  only when no dated email can. A clock with no day is no moment, so two
  undated copies are the same email only with the same words. +N opens everyone else the recipients column names,
  never the operator or a name the line already shows in another form, and
  shows only when it can.
- **Each line opens in place, one at a time**, to what the account record
  history holds for it: WHAT THE READ KEPT (WHAT WAS FILED when the rules
  filed it) and its Owed lines, YOU OWE, a person by first name when every
  word of the owner is capitalized ("JOSÉ OWES", "MARY-KATE OWES"), a group
  as the read wrote it ("THEIR LEGAL TEAM OWES"), or OWED when the line
  names nobody. Each "Owed:" marker opens its own segments, and a plain
  sentence after the last owner goes back to what the read kept. An Owed line closes by its own promise, the one to-do
  or loop that tracks it among those the fan-out's own key ties to it: the
  row the note's own filing opened, else the one opened nearest at or after
  the note, an earlier one only when none is newer and only one still open
  when the promise was made, so a later promise in the same words never
  reopens a kept one and a delivery before the promise never closes it. It reads CLOSED "Done M/D." once
  that row is done, on the day its own done tag holds, and "Released." once
  their side released it (the closer rule: delivery or release closes a promise, a
  later message never does); a colleague's promise is tracked by nothing here
  and stays as written. CLOSED "Answered M/D." marks an inbound a later send
  of ours to the account answered; a sign-off, machinery or a note to a
  colleague answers nothing. A sign-off says A SIGN-OFF and that it doesn't
  change the latest email. The same email filed twice (one sender, recipient,
  subject and moment, on separate filings, either lane) says FILED TWICE: when
  both copies show, the second says it; a copy whose twin is out of view says
  it alone. Any other line opens to its note's own body, and every line,
  opened, shows its whole text where it rested trailing off.

## The Ted doctrine (founder-decreed 2026-08-14)

Named for the day the room told the operator to chase Ted — a man the record
had never seen — because a July export seeded him as primary contact. The
rule, binding on every surface: **the record outranks every seed.** A static
store (book.json contacts, contacts.json roster, research.json sweep, digest
prose, the touch log, hand-written bullets, board-state maps) only ever
STANDS IN until the live record — filed communications, their actors, their
dates, dispositions, outcome stamps — speaks; the moment it speaks, the
surface reads the record first and the seed becomes the fallback. Derived
facts (who the relationship is, when we last touched, whether a reply is
owed, whether a deal is over, who said a thing) must read the WIDEST live
source the app holds, never a private narrow one; a fact's two stores merge
by latest, never by whichever the surface happened to import. An
unattributed document is never inbound; an auto-reply is machinery, never
the client writing. New surfaces are audited against this doctrine before
they ship.

**The touch log is not a stand-in (ruled 2026-09-25, C3):** it is the operator's own hand, and for when we last touched it merges with the record by latest like any two stores of one fact.

**One roster for the relationship (ruled 2026-10-07, pass 8 call 7, the founder's delegation):** the account read hands its declared home side to the relationship and people reads, so a colleague is never the relationship.

**Provenance is columns (ruled 2026-09-25, P3, P4):** every note carries its door (chute, drop, act-lane, intranet, activity, seed, hand, and since 2026-10-14 inbound, the Sales Navigator alert emails a mail rule forwards) in its own column beside source, which names the dialect, and its lane, actors and recipients. A second-record row carries them like a first-record row; a bare row is a defect.

## The closer rule (founder-decreed 2026-08-22)

A courtesy sign-off — "No problem!", "thanks!", "sounds good", a thumbs-up,
emoji-only — is conversational punctuation, the human sibling of the Ted
doctrine's auto-reply clause. Closers are TRANSPARENT: the ledger reads
through them to the last substantive message, which alone sets state. A
closer never opens a loop (no reply-owed off a sign-off) and never closes
one (a "No problem!" after the operator's promise ratifies it — expectation
set — never settles it). Closers don't count as inbound for reply-owed or
Groundwork's live-motion exclusion; they stay real for Sendbook warmth
(their voice is still their voice). A promise closes only by delivery or
explicit release; "no rush, next month" is a reschedule. Due clocks:
"today" is live on the stage at filing; a blown promise carries as
PROMISED with its date — stronger than a plain wall, because a person
heard the day and the day ended. All days are Chicago days, theirs or ours.
The classifier lives in src/lib/intel/closer.ts, deliberately conservative:
short, no question, no digits, no names — content always wins.

**PROMISED needs a hearer (ruled 2026-09-25, D28):** a paste-provenance date has one by construction; a typed date reads PROMISED only when the line names the person it was promised to, and otherwise it is a wall.

**Their promise rides the move line (ship order 2026-10-06):** a promise owed by the account's side shows on the HomeRoom move line only, never in TODAY or on THEIRS. "Wait on Adam. Promised Friday." while it stands and nothing is owed from this side; "Wait on Adam. Due today." on the day; "Chase Adam. PROMISED 10/9." once a heard day passes; "Chase Adam. The 10/9 wall passed." when no one heard it. The line opens to every open promise and " +N" counts the rest. The drawer's readout may list their side one click down, from the read's own list of open promises and never from a count of its own (ruled 2026-10-07, pass 8 call 6, the founder's delegation).

## The click-depth law (founder-decreed 2026-08-20)

Every compression opens. A two-word term, a count, a theme, an abbreviation —
every shortened thing on every surface is a door to its evidence, exactly one
click deep. Nothing compressed is ever a dead end, and nothing deep ever
surfaces uninvited. Arrival budgets are hard limits; when budget and
intelligence conflict, the budget wins and the intelligence moves a click
down.

## The second record (founder-decreed 2026-08-20)

The weekly Salesforce activity export is a second record beside the
operator's own. It inherits every law of the first: the record outranks every
seed, machinery is never a person, money never renders, derived facts read
the widest merge of both records by latest. Blast receipts are intent, never
touches. A colleague's motion produces nothing for the operator to do (the
coordination move retired 2026-10-05); an account person's motion produces
outreach moves. Every gem cites the rows it stands
on or does not exist. The backbone lives in `src/lib/activity/` (SECOND-
RECORD-PLAN §3, blessed 2026-08-20): the browser tallies the blast 81% and
never uploads it, slices post in checksummed batches, an incomplete upload
refuses to run, and every run carries its three adversarial passes — coverage
(100% or the run marks itself failed), refutation (mechanical canon lint,
then an independent refuter that defaults to refute), and staleness/acted
(the first record kills the nag). Verdicts and every rendered count are
arithmetic from the rollup builder, never model text.

The faces were judged and shipped 2026-08-20 (winners decreed by the founder,
ship order "ship the picks for those 3 rooms and the second ring as well"):
**Groundwork — the Evidence Chips** (a mono chip row beneath the stage's
reason, each chip a door); **Accounts — three columns** (MODEL and PRISMHR
retire into the drilldown, + Dashboard is a hover glyph at the name, LAST
HUMAN TOUCH · THE SIGNAL · ACT take the width, the gem folds open beneath
the row); **HomeRoom — the THEIRS line** (one ochre mono line atop the
register panel; the move keeps its seat unconditionally). The second ring
shipped with them: the draft desk's one cited line, the Sendbook's org-wide
warmth (their voice warms whoever's inbox caught it; the operator's outbound
and CSM intros still never warm), the roundup brief's folded CSM prep, the
readout's arithmetic sentence, the Playbook's draft queue (approve by hand,
nothing auto-publishes), and the intranet digest (rollup + gems only —
staged bodies never enter the brain, guarded by test).

**The meat law (founder-decreed 2026-08-20, amends the click-depth law):**
every citation, theme, count, and case on every surface drills to row-level
meat — citation → cleaned email excerpt; support theme → case list → per-case
excerpt timeline — as many layers as the evidence holds. Excerpts are cleaned
of banners, quoted trails, signatures, and disclaimers (src/lib/activity/
excerpt.ts), money-redacted, and served only by the evidence route (a GET,
never a server action) — the one place staged bodies leave the store. Arrival
budgets never grow; the operator never goes back to Salesforce for detail the
export already carried.

**The vehicle rule (2026-08-20):** a queue rule that rides an account as a
vehicle for someone else's cadence (roundup-slot, the book-wide research
stamp) must prefer an account with no candidate of its own — a briefing slot
never swallows an account's own move.

**LAST HUMAN TOUCH reads both records (ruled 2026-09-25, C1):** the column shows the later of the first record's last human touch and the export's, and whispers which record it came from. No face reads the export alone for a fact the first record also holds.

**THEIRS is the account's people (ruled 2026-09-25, C16):** the line leads only with gems about an account person and takes the palette's blue, the court's old color for their turn. A colleague's gem never leads it and, since 2026-10-05, has no seat on the line or the row. "Their voice", everywhere in this file, means the PEO's own people, never a colleague's log.

**Retired text (ruled 2026-09-25, C15):** the hover glyph at the name went with the Act Lane on 2026-08-21; the dashboard door is plain words in the drilldown.

**Ruled 2026-09-25 (D17, D18, D19, D20, D21):** staging verifies before any slice replaces its predecessor, and a refused upload leaves the prior drop untouched. The operator's acted stamp is the first record: it survives the take-back and re-attaches by gem key. A colleague is a person the book names as internal or whose address is on our domain; the two-accounts count is the fallback only for a row with no address. An account-level Last Email Received with no attributed row is a datetime, shown as Salesforce's, never their voice: warmth, ↩ REPLIED and the exclusion need a row with an attributed inbound body that passes the machinery and closer reads. The record has moved on a gem when a first-record row after the gem's day carries the gem's person as an actor or recipient, by address or normalized name. Per-day counts and campaign titles are arithmetic and may upload; bodies and recipients never do. Gem lines are operator copy: the lint carries the seven devices, and a non-date digit kills the gem.

**Ruled 2026-10-07 (pass 8 calls 4, 5, 10 and 14, the founder's delegation):** the bare datetime never quiets the drumbeat; only an attributed inbound row does, as with warmth and the exclusion. The acted sweep reads every first-record row after the gem's day that carries the gem's person, not only the operator's sends, each at its own moment. Two counts stand on purpose: the export's Assigned owner on two accounts is D19's fallback, and the first record's actors keep three, because a message's actor is often theirs; both run only after the book's internal names and our domain. Campaign titles are money-redacted before they are counted.

## The Act Lane (Version C winner, decreed 2026-08-21)

The Accounts sheet works the act right there. The ACT column is the Move
Chip (Concept I): the gem's act as a fixed-edge chip, orange left tick,
source line whispered beneath, hover ✓ stamps acted (the gems store's own
actedDay — the acted sweep can re-stamp from the record any time it truly
speaks; every stamp carries ↺). Clicking the chip opens the Act Lane — a
sticky workbench beside the sheet: evidence up top (citations drill to
cleaned excerpts by the meat law), the editable draft mid (TO/SUBJECT/BODY
seeded from the relationship contact and the act), Send/File/fork at the
foot. Drafts SAVE (actdraft:<id> notes, one per account, money-redacted;
a touched draft saves on close or chip-hop — the pad never eats your
words; Send consumes it). Send files a real ✉ outbound to the record and
opens mail — the record then clears the nag itself. The fork files the
follow-up where it belongs, both meaning TODAY: a board account's move
lands as a HomeRoom action todo; an off-board account's as a seat:<id>
note Groundwork reads FIRST — rank 95, at most three seats lead
(SEAT_SLOT_CAP), a seat counts as the account's own move so no vehicle
rule swallows it, and it rides until worked, taken back, or the record
shows the outbound after it. Retired from the sheet the same day: the
Stage, Next-action, and Play columns (Play reads in the drilldown's meta
line), the filter rail (the Filter Door — one mono FILTERS ▾ at the
sheet's top-right shoulder, lit and named while a filter is live), the
Sort dropdown (column titles are the only sort), the header subtext, the
hot-signal bar, and the hover ⊞ (the dashboard door is plain words in the
drilldown). The count rides the Account column title; ⧉/⇩ ride the page
title; the search bar carries depth. The board lift holds app-wide: an
account on the dashboard is cleared with the CSM and touched — stored
state only ever advances the derived one (boardLift, loadCommand).

**A seat follows its account (ruled 2026-09-25, C8):** when the account is excluded from the queue, the seat leaves Groundwork and reads on the HomeRoom as the account's own action until worked or taken back; it returns to the wing if the exclusion lifts first. An exclusion that rests only on a colleague's inbox gives the HomeRoom no row (C6, pass 8 call 1), so that seat stays on the wing (ruled 2026-10-07, pass 9, the founder's delegation).

**Shipped by order (2026-10-08):** the founder's ship order covers the Act Lane as it went live in #260, whose own record left the ship word pending. **Every acted gem keeps its ↺ (ship order 2026-10-08, A8.5):** the ACT cell shows one gem, so THE SIGNAL's fold lists every acted gem about an account person at its foot, newest acted first, each with its act, term, acted day and ↺. With nothing live to lead, THE SIGNAL reads "✓ N ACTED" and opens the same fold.

## The Playbook face — The Sheet (triptych winner, ship order 2026-09-15)

The products are the entry point, not the scenarios. Three panels, all in
view: the country on the left, the product in the middle, what partners say
about it on the right. This is the whole instrument — full steam ahead on it,
founder-decreed 2026-09-15.

- **The doors.** Five products — employer of record, global payroll,
  contractor management, contractor of record, talent. Two contractor doors,
  by decree. Arrival asks one thing ("What are we talking about?") and shows
  the five with a line each; picking one drops them to a tab row with the
  open door ticked orange, the surface's one dominant move.
- **The middle reads like the flyer**, in the flyer's order: what it solves
  (the five issues: compliance, who employs them, how fast, what it costs,
  one place), how it runs, we do and they keep, the flyer's own tiers, time
  and price, ask them. Every block cites its rung.
- **The right panel is their words.** What partners actually say about that
  product, from the tapes; opening one gives how we respond, the asks it
  pulls from the product's own list, where it lands instead when it does, and
  its cites. Opening a cue pins the countries it names into the wing.
- **The between-us foot is fixed** under the right panel: the questions asked
  on every call whatever the product. On arrival it takes the whole panel.
- **The country wing never travels.** The sheet is ~360KB and stays on the
  server; the page arrives with the index (name, alias, how many of the
  sixteen are on file) and a country's card comes down from `/playbook/country`
  — a GET, never a server action. Lead lines first, the sixteen behind one
  line, long values behind "the rest". Puerto Rico and every other country
  live here. A country we price but have not written up says so (∅); one we
  do not cover says so too.
- **The Call Sheet is retired** (founder-decreed 2026-09-15). The three panes,
  their stylesheet and the `?open=` deep link are gone. Its bank survives as a
  library — the 113 discovery questions still feed the battlecard harvest, the
  ask room's citations and the intranet — but it has no browsable surface, and
  nothing links at one: a playbook citation in the brain's answer now offers no
  door, because a link at a page that cannot show the question is the dead end
  the click-depth law bans. What is left beside the face is the learned
  register (lessons, market facts, prospect asks) and the second record's
  draft queue, both untouched.
- **No redactions on the country wing** (founder-decreed 2026-09-15, answering
  the open question of 2026-09-14). Statutory country facts — wage floors, VAT,
  social contributions, severance — render exactly as authored. 97 of 1,520
  values carry a figure and every one of them stands. The money doctrine is
  unchanged where it was aimed: OUR money — pricing, deal figures, what a
  client pays — still never renders, and the suite fails the build if a figure
  reaches the product copy.
- The ship audit runs in the suite, not by hand: `tests/playbook-sheet.test.ts`
  holds the graph audit, the name scan, the money scan and the wing's index
  against the sheet it stands on.

**Ruled 2026-09-25 (C12, C13):** the learned register keeps its names; a lesson's account and a market fact's speaker are its cite on the evidence ladder, and the universal-tool rule governs the authored surfaces only. A playbook citation in the brain's answer opens in place, one click, to the cited question and its gloss from the bank, with no page and no link; the Call Sheet stays retired and the click-depth law holds.

## Other standing decrees

- **IT is never asked** (founder-decreed 2026-10-19): no plan, setup or
  automation may depend on asking PrismHR or Vensure IT for anything: no
  license, no app registration, no admin consent, no policy exception. A
  path that needs IT is not a path. Build on what the operator's own
  accounts already allow: Power Automate's standard connectors, the inbound
  relay, the app's own routes.
- The word "steps" never appears in operator-facing copy.
- Account names are plain links — no ↗ arrows or affordance glyphs.
- Threading badge reads exactly `MULTI`, colored by the semantic ladder
  (red 1 thread / amber 2 / green 3+).
- Edge tabs (Roundups · Check-ins) are thin AND inconspicuous — quiet ink,
  color on hover only. Names stay "Roundups" and "Check-ins"; never "Cadence".
- Money figures never appear in anything stored, rendered, or mocked
  (`redactMoney` doctrine).
- Three carve-outs stand. Two were ruled 2026-09-25 (C10, C11): the
  Scratchpaper's lines, because the pad routes nowhere, and the country wing's
  statutory facts. The third is the Pricing page, where our money is authored,
  and the price desk that answers from it (founder-decreed 2026-08-21, written
  here 2026-10-09): a pricing question is quoted by arithmetic from the page's
  source at read time, shown live wherever an ask is answered (the Intranet,
  the Asks page, the Scratchpaper's ask door), and the ask ledger banks only
  its money-redacted twin. Our money, everywhere else, still never renders.
- Ship pattern: a `claude/` branch → PR → Vercel CI green → squash merge =
  live production (amended 2026-10-09; the line once named one branch, and
  every PR since pass 7 has shipped from its own). Verify chain uses `&&`:
  prettier → tsc → eslint (0 warnings) → tsx tests → next build. Migrations
  run at deploy (ruled 2026-10-05): every migration is additive, lands under
  prisma/migrations with the slice that needs it, and is listed in
  src/lib/db/migrate.ts, which the server applies on its own connection when
  it starts (src/instrumentation.ts). The build never runs them: Vercel's
  build cannot reach the database (P1001 on both URLs, probed 2026-10-05).
- An archived surface (ruled 2026-09-25, P1) leaves every tab list and every
  revalidation list, and no live surface imports its actions.
- **Opus or better, always** (founder-decreed 2026-07-31, canonized
  2026-09-25): every model call in the app runs on Opus or a stronger model.
  One model roster lives in src/lib/intranet/doctrine.ts and every caller
  reads its slot from it; no caller names a model.
- **Every page signs in** (ruled 2026-09-25): the demo pages take the access
  check every other page takes, and there is no public mode.
- **The surfaces** (ruled 2026-09-25): the Board, Today and Pipeline pages are
  retired once their actions move to the live surfaces. /intake stays as the
  bookmarklet shelf's door with a plain nav row; /partners, /archive and
  /asks stay, doored from live surfaces, with no nav row.
- **The Pipeline pull tab** (the Ledger face, #309; ship order 2026-10-08):
  a slim tab on the HomeRoom's right edge flies out every active account's
  record in one fixed order, built from the room's own stores, every line
  editable and strikable, the copy built from the record and the overlay.
  It is the HomeRoom's, not the retired Pipeline page. A deal marked low
  signal is not active and drops out of it (founder, 2026-10-16).
- **Low signal** (founder's order, 2026-10-16, #412): a HomeRoom deal row
  that isn't in the Salesforce pipeline moves by its hover ⇣ to the LOW
  SIGNAL section above the closed ledger, and back by ↺. The mark is the
  operator's own hand, a namespaced disposition (`lowsig:`) that no queue
  reads; a stamped outcome outranks it. The closed ledger hides and shows
  whole, remembered per browser, and hidden rows stay mounted.
