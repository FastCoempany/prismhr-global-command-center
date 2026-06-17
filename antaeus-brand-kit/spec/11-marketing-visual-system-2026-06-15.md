# Antaeus Design System — Marketing Visual System

**Sibling:** 11 of the design system (00 charter; see README).
**Status:** DRAFT for founder review.
**Date:** 2026-06-15.
**Author:** Claude, working session with the founder (mrcoe7@gmail.com).
**Branch:** `claude/fervent-lamport-xb17cj`.
**Scope:** This is the eleventh sibling document under the design system charter (`00-charter-2026-06-02.md`). It closes the back half of brand identity (`10` §6): how the mark and the face extend to the surfaces a prospect sees *before* they are an operator — the landing page, the positioning page, the auth boundary, the legal pages, the social share cards, and the docs. Spec `10` locked the mark; specs `01`–`09` built the operator face. This spec is the **visitor face** — the same brand, a different job. It is the design language the public-face refresh will consume; it does not build the live pages, and the build itself stays deferred until there is a reason to launch (canon: we are building, not launching). What this document does is make brand identity complete *as a system*, so when the public face is built it is composed, not improvised.

---

## 0. Why this exists

The operator face is finished — eleven months of doctrine and ten sibling specs say exactly how Antaeus looks to Sarah Chen once she is inside it. None of that says how Antaeus looks to the person deciding whether to become Sarah. That person is a different reader with a different job in front of them, and the surfaces they touch — the landing, the category page, the auth screen, the legal pages, a link preview in a Slack DM — are not rooms. A room is a console; a landing page is a threshold. The component library is built for the console; nothing is built for the threshold.

Left unspecified, the visitor face drifts the way every landing page drifts: toward the generic SaaS template, the gradient blob, the "AI-powered" hero, the three-CTA cluster, the stock-photo founder pointing at a laptop. That drift is fatal here specifically, because the one thing the product is selling against is *being mistaken for another sales tool* — and the generic template is what every other sales tool looks like. The visitor closes the tab on a hero that reads like the six tools he already rejected this year. So the visitor face needs its own discipline, drawn from the same brand, and this spec is it.

The resolution is one rule with two halves: **the visitor face shares the operator face's DNA and earns the right to do more with it.** Same bright field, same navy ink, same orange rationed to a single move, same type trio, same Grounded-A mark — so a visitor who becomes an operator walks through one door, not two. But where the operator face is dense and severe because the operator is working, the visitor face has room to breathe and room to argue, because the visitor is reading. More whitespace, more serif, a slower scan, a real claim made in plain words. The threshold is allowed to be a threshold. It is never allowed to be a brochure.

---

## Part I — The visitor, and the one DNA

### 1.1 Who the reader is

The visitor face is measured against **Marcus Reed**, not Sarah Chen (`deliverables/audit/visitor-persona-2026-05.md`). Marcus is a founder-CEO who built the first few million in revenue himself and just signed his first AE; he lands from an investor's one-line DM with ninety seconds and a tab he is happy to close. He has evaluated six sales tools this year — every one a prettier CRM or an AI gimmick — and he clicks away from "powered by AI" faster than from a 404. He is not a CRM buyer, not an enablement buyer, not an AI-copilot buyer. The landing has to read like none of those, in plain language, in the first paragraph.

The visitor face is tested against Marcus's three cold-landing walks (persona doc §"The three calibrated cold-landing walks") and the two visitor-specific rubric tests:

- **Test 4 — the category test.** Marcus must be able to place Antaeus on his mental map inside the first paragraph: not "another sales tool," but "the operating system the founder's motion becomes before a hire inherits it." That distinction lands in plain words or it does not land.
- **Test 5 — the trust test.** Trust is carried by plain language, specific situations, and the absence of hype — no superlatives, no "AI-powered" filler, no unattributed quotes, no "trusted by" logo strip, no stock photography.

Auth is the seam where Marcus ends and Sarah begins: the login and reset screens speak to Sarah returning, not to Marcus deciding (persona doc §Supersession).

### 1.2 One DNA, two jobs

Everything the operator face is made of carries to the visitor face unchanged:

- the bright field (`--ds-field`, the soft cool neutral, canon Part II §1), navy ink for authority, restrained gradient air allowed;
- orange rationed to the single dominant move and nowhere else;
- the type trio — DM Serif Display for the argument, Public Sans for the reading and the controls, JetBrains Mono for the codes and labels;
- the Grounded-A mark and its lockups (`10` §3).

What changes is not the material; it is how much room the material gets. The operator face compresses because the operator is mid-task and every pixel is working. The visitor face expands because the visitor is reading an argument and the argument needs air. The visitor face is therefore the one place the product is allowed to be slow — a wide serif hero, a generous measure, whitespace that would be wasteful in a room. It is still severe, still calm, still authored, still unsentimental (canon Part I, emotional territory). It is never friendly-first, never hype, never AI-magic theater. The difference between the two faces is altitude and pace, not personality.

---

## Part II — The surfaces it governs

| Surface | File(s) today | Job | Register | The one move |
|---|---|---|---|---|
| **Landing** | `start.html` | Answer what/who/next in the first fold; survive Walk A | visitor | Create workspace |
| **Positioning** | `/why-antaeus/` | The category boundary for the visitor who wants more than the landing before signing up; Walk B at depth | visitor | Create workspace |
| **Auth boundary** | `login` / `signup` / `forgot-password` / `reset-password` / `auth/callback` | Get a returning operator back in, or a convinced visitor started, with no friction | Sarah returning (Trust Annex temperature), signup carries the visitor claim | Sign in / Create workspace |
| **Legal** | `privacy.html` / `terms.html` | Plain, trustworthy, substance preserved | Trust Annex | (none — these are read, not acted on) |
| **Social / share cards** | OG images (to build) | The link preview in a DM or a tweet is the real first impression; it must read as Antaeus, not as a generic unfurl | visitor | (the card is the hook; the click is the move) |
| **Docs** | (future) | The same system, calmer, L1 in the header | a docs temperature near Trust Annex | (in-context links) |

The landing and the positioning page carry the visitor register and the L1 mark. The auth screens are the boundary — they speak to Sarah returning, in the Trust Annex's calm utility register, and they are where the visitor face hands off to the operator face. The legal pages are pure Trust Annex: plain, no drama, substance verbatim, the reversed L1 permitted in the footer. The share cards are the surface most teams forget and the one that does the most uninvited work, because it is the first thing the recipient of a forwarded link actually sees.

---

## Part III — The system

### 3.1 The mark on public surfaces

The landing hero carries the **L1 lockup** — the Grounded-A mark beside "Antaeus" in DM Serif Display (`10` §3, `BrandLockupSerif`). The mark and the headline are the same serif voice, which is the point: the argument and the brand are spoken in one register. One mark per surface (`10` §5) — the hero carries L1, the footer may carry the reversed L1 for the legal contexts, and nothing else on the page needs the mark. The mark stays navy or `currentColor`, never an accent, never on a photo, never in a container shape. The favicon and the share-card mark follow the weight ladder (`10` §2): the bar drops below 16px; the ground line is the signature.

### 3.2 Type — the serif does more

On the visitor face, DM Serif Display carries the load it is too heavy to carry inside a room. The landing hero is a single serif statement at the top of the type ramp — larger than any operator headline, because the visitor reads it as the argument, not as a label. The five-step operator ramp (`03` §4.3) extends upward with one marketing-display tier for the hero, and the rest of the ramp is unchanged. Public Sans carries the supporting prose at the reading measure (`05` §1.3 — running prose never exceeds 66ch, and the marketing measure honors it). JetBrains Mono recedes to the kickers and the section codes exactly as it does in-product. One dominant serif statement per surface (canon Part II §2 — never two competing serifs); the hero is the argument, everything below it supports.

### 3.3 Color — orange is still the one move

The visitor face spends orange exactly once, on the single primary call to action ("Create workspace"), and nowhere else. This is the operator face's rationing rule (canon Part II §3) carried to the threshold, and it is also what survives Walk C: a landing with one orange CTA and a recessive sign-in link reads as decisive; a landing with three equal-weight buttons reads as a tool that does not know what it wants the visitor to do. The bright field is the base, navy is the authority, blue is system-intelligence and links, and the warm/cool gradient air from canon Part II §1 is permitted as atmosphere — restrained, behind the field, never a foreground blob. Green, amber, and red keep their semantic roles and are mostly absent here, because the visitor face is not reporting state.

### 3.4 Layout — the threshold composition

The landing is composed, top to bottom, as a threshold (the Threshold family's laws, canon Part II §4.1, lifted to the public scale):

1. **One commanding statement** — the serif hero answering *what is this* in the operator's voice, with the L1 mark above it.
2. **Who it is for** — the buyer in one recognizable line (the founder-led B2B team, or the first GTM operator entering a founder-built motion; canon Part I buyer lock), so Marcus sees himself.
3. **The category boundary** — the IS / IS-NOT panels (canon Part I §1, already prototyped on `/why-antaeus/`): what Antaeus is, what it is explicitly not. This is the single most important block on the page, because the whole sale is *not being mistaken for the six tools Marcus already rejected*.
4. **Three anchors** — three distinct signals (Walk B: each carries a different operator outcome, never a feature, never a repeat of its neighbor), so Marcus can describe the product to his co-founder in one sentence that contains none of "CRM," "AI copilot," "sales enablement."
5. **One CTA cluster** — the single orange move, the recessive sign-in, no third option (Walk C).

The composition is generous — whitespace that a room would never spend, a reading measure on the prose, the work shown rather than described. No hero-plus-card-pile (canon hard reject); the structure is carried by composition and rhythm, not by a wall of bordered boxes.

### 3.5 Voice — the visitor register

The copy uses the **visitor register** (`01`; configured in `src/lib/voice/family-temperatures.ts`): the brand temperature, positioning-aware, allowed to name the category and the enemy and slightly longer sentences (up to 30 words), with the product claim (`01` §2.6) as the anchor and zero deck-speak. Same banned vocabulary as everywhere else — the gummy compounds, the single-noun abstractions, and the canon Part III §11 rules apply to marketing copy exactly as they apply to a room. The trust test (Test 5) is a voice test as much as a visual one: the failure signals are linguistic — superlatives, "AI-powered," generic outcome claims, unattributed quotes. Every public string passes the validator, the same gate the rooms pass.

### 3.6 Social and share cards

The share card (Open Graph / link preview) is a fixed composition: the **mark plus one serif line on the bright field**, navy ink, no photo, no gradient blob, no screenshot crammed into 1200×630. It reads as a quiet, authored card in a feed of loud ones — which is itself the differentiation. The line is a single claim in the visitor register; the mark anchors it. A forwarded link that unfurls to this card has already done Test 4 before the recipient clicks.

### 3.7 Imagery — what the visitor face shows

It shows the product or it shows nothing. No stock photography, no smiling teams, no abstract gradient art, no 3D blobs, no isometric illustration. If the visitor face shows anything beyond type and the mark, it is the product itself — a real room on the bright field, the actual ranked work — or the faint graph-paper undertexture from canon Part II §1. The product is the proof; a screenshot of a real Dashboard says more to Marcus than any illustration, because it is the one thing the six rejected tools could not show him.

---

## Part IV — Hard rejects

The visitor face fails if it does any of these, and Marcus closes the tab on each:

- **Category jargon in the hero** — "AI-powered revenue intelligence platform." The hero names what it is in plain words or it has failed Walk A.
- **A generic outcome claim** — "Drive 3× pipeline growth," "Grow faster," "Close more deals." Claims Marcus cannot connect to his own situation read as every other tool's claim.
- **"Powered by AI" anywhere as a selling point.** The product uses models; it does not sell them. AI as the pitch is the gimmick Marcus is fastest to reject.
- **Two or more competing CTAs** — "Start free trial" + "Book a demo" + "Watch the video." One orange move, one recessive sign-in, nothing else.
- **Trust-badge or logo soup** — "Trusted by" strips without context, unattributed testimonials, star ratings, press logos. Trust is carried by plain specifics, not by borrowed credibility.
- **Stock photography or gradient-blob art** — the generic SaaS template. The visitor face shows the product or shows type.
- **A hero-plus-card-pile** — structure carried by a wall of bordered boxes instead of composition (canon hard reject, lifted to the public scale).
- **Testimonial carousels, animated counters, parallax** — engagement theater. The visitor face is severe and still (the motion doctrine, `08`, applies: motion only shows a state change, and a landing page has almost none).
- **Anything that makes Antaeus read as a CRM, an enablement library, or an AI copilot.** That is the one sale, and every reject above is a way of losing it.

---

## Part V — Migration, citations, signals

### 5.1 Migration

The public face today (`start.html` landing, the auth screens, `privacy.html` / `terms.html`, `/why-antaeus/`) was re-skinned bright in Phase 5 of the 2026-05 navigation roadmap, so it already carries the bright direction (canon Part II §1) and the visitor persona's walks. What it does not yet carry is the brand mark — the chrome still renders the old wordmark, not the Grounded-A — and it does not carry L1 in the hero, the share-card system, or the visitor register wired through `t()`. The **public-face refresh** is the build that applies this spec: it drops L1 into the landing hero, builds the OG share cards, replaces the old wordmark with `BrandLockup` / `BrandLockupSerif`, and wires the visitor register so the validator gates marketing copy. That build is **deferred** — there is no audience yet, and the room radiation (the operator face reaching the other rooms) is the higher-value work in front of us. This spec exists so the refresh, when it happens, is composed against a locked design language instead of improvised.

### 5.2 Citations

Canon Part I (the positioning, the buyer lock, the emotional territory, the IS / IS-NOT boundary), Part II §1 (the bright direction), §2 (type), §3 (color rationing), §4.1 (the Threshold family), Part III §11 (the voice rule). Spec `10` (the mark, the lockups, the favicon ladder), `01` + `07` (the visitor register and the lexicon gate), `05` (the reading measure and the frame), `08` (the motion floor — a landing barely moves). The visitor persona and the visitor-face rubric (`deliverables/audit/visitor-persona-2026-05.md`, Tests 4–5, Walks A–C).

### 5.3 Signals the spec is doing its job

1. **Marcus passes all three walks.** The first fold answers what / who / next; the three anchors land three distinct signals; the CTA cluster makes signup the lowest-friction move.
2. **Test 4 holds.** A cold visitor places Antaeus correctly — not a sales tool, the system a founder's motion becomes before a hire inherits it — inside the first paragraph, in plain words.
3. **Test 5 holds.** No superlatives, no "AI-powered," no borrowed-credibility soup, no stock photography; trust is carried by plain specifics.
4. **One door.** A visitor who creates a workspace feels they walked through a single threshold into the product, not from one brand into a different one.
5. **No hard reject appears.** An audit of the public face finds none of Part IV.

---

## Closing

The operator face earns its severity by being a console for someone already at work. The visitor face has to earn the click first, from someone holding a tab he is happy to close, against a memory of six tools that all looked the same. It earns it the same way the product earns the operator's trust — by being plain, specific, and unwilling to perform. Same bright field, same navy ink, same single orange move, same Grounded-A mark, same banned vocabulary; more room to make the argument, and the discipline to make it in one serif sentence rather than a brochure. With this specified, brand identity is complete as a system: the mark, its kit, and the language for both faces. What remains is not design — it is the build, and the build waits for a reason to launch.
