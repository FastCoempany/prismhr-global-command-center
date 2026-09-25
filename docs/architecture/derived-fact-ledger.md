---
title: Derived-Fact Ledger
status: Audit pass 2, 2026-09-24
owner: Founder
related_docs:
  - docs/architecture/chute-architecture-map.md
  - docs/architecture/chute-ingest-defects.md
  - src/lib/today/overlay.ts
  - src/lib/intel/extract.ts
  - src/lib/intel/provenance.ts
  - src/lib/room/touch.ts
  - src/lib/sendbook/read.ts
  - src/lib/intel/meeting.ts
  - src/lib/intel/closer.ts
  - src/lib/intel/clock.ts
---

# Derived-Fact Ledger

Audit pass 2, taken on main at 79c4b6d on 2026-09-24, after the bug pass. Pass 1 mapped the ingest path and found the duplications at surface level: seven corpora, five spellings of whose move, two hide keys, two clocks. This pass goes one layer down for each derived fact the app renders: where it is computed, over which corpus and filters, from which note fields, and what it returns. The purpose is to design pass 1's refactor candidate 2, one account read per request with a declared home side and hide filter, and one whoseMove.

Method: three readers ran in parallel, one assembling the corpus at every call site, one classifying every direct AccountNote read as narrow or should-be-wide with its alias-fold consequence, one grepping every consumer of every note-grammar token. Every derivation module and page loader was also read by hand. Every cite below is against main at 79c4b6d unless marked [pass-1 cite], which means the line was taken from the map (as of 8fa2803) and not re-checked here; [sweep cite] means a reader's cite that was not re-opened by hand. Inference from code shape rather than a run is marked [inferred]. Line drift from the bug pass is not reported. Out of scope: src/generated, node_modules, .next, antaeus-brand-kit, lockfiles, CSS modules; tests only where one pins a derivation as a contract.

Three places pass 1 is wrong, corrected here: the "on purpose" homeSide omission belongs to roomGapsRefill's comment at src/app/room/actions.ts:1267-1271, not to Groundwork, whose page carries no such comment and also drops the actors column; "last outbound" has three spellings plus a head-line fallback, not two; and the sendbook's own comment at src/lib/sendbook/read.ts:85-88 claiming it uses "the same discriminators the touch clock and the intel corpus use" is false on all three counts shown in A2.

Sections A through D favor coverage over judgment. Section E favors judgment over coverage.

## A. The fact ledger

### A1. Reply owed, whose move

| Path | file:line | Corpus and filters | Note fields read | Returns |
|---|---|---|---|---|
| readDeal court | src/lib/room/engine.ts:193-272 | Inputs assembled at src/app/room/page.tsx:350-411: lastInbound from extract over allNotes (hide:note: filtered :159, both lanes, homeSide = csms ∪ homeSideFrom :134-135, touches outreach:+label :167-171, all todos :166); lastTouch from lastTouchRead over the same allNotes plus the one outreach: Touch :252-271 with isHomeSideName(csms) :267; lastMeeting from meetingRead :313-322; lastAccepted :382-397 | via extract and touch.ts below; acceptance reads the head's subject slot (closer.ts:119-125) and actors sender :386-389 | inboundNewest = lastInbound.at > lastTouch.at :200-203, then meetingNewest ≤5 days :211-219, then acceptedNewest :226-232, then lastTouch.awaitingReply :259 → court line |
| buildMorningBrief reply-waiting | src/lib/intel/brief.ts:104-126 | today/page.tsx:653-664: raw acctNotes, NO hide filter, homeSide ourSide :642, touches outreach:+acct:+label :657-663 (acct: keys are never written [pass-1 cite, critic]) | intel.lastInbound, intel.lastOutbound; person from docs.find(direction "in").people[0] :104,113 | fires when lastInbound > lastOutbound on a live card :108-112 |
| pipeline "they owe a reply" | src/lib/pipeline/build.ts:517-536 | collect.ts:87-89 hide:note: filtered; build.ts:353-368 re-sorted by effectiveAt, todos !done, NO touches, homeSide = csms ∪ input.homeSide :367 | intel.lastOutbound, intel.lastInbound; actors of the note on lastOutbound's day :524-530 | when no theirSide item and lastOutbound > lastInbound |
| Groundwork answered check | src/lib/groundwork/day.ts:378-392 | intel from groundwork/page.tsx:230-251: hide:note: filtered :195, salesnav*/wire dropped :231, actors/recipients/lane/source DROPPED :238-243, no homeSide; touches = outreach: Touch rows plus synthesized sendbook taps :330-337, :361 | intel.lastInbound, intel.lastOutbound, newest touch contactedAt, orgInboundKey(sr) | lastOutIso = max(touch, lastOutbound) :382-385; answeredMine = lastInbound > lastOutIso :390-391; answeredOrg from the second record :392 |
| Sendbook repliedAt | src/lib/sendbook/read.ts:258-266 | sendbook/page.tsx:81-91: hide:note: filtered, projection {body, source, createdAt, actors}, orgSignals :99-105; groundwork/page.tsx:208-212 same projection, NO orgSignals | inboundDates :137-149 and recordSends :89-107 | first inbound after each send annotates it; `s.at < inAt` strict :263 |
| ask brain waiting-on line | src/lib/ask/live.ts:159-188 | direct prisma take 25, no hide, no alias fold :88-100; one outreach: Touch :101-106; isHomeSideName(csms) :168 | lastTouchRead + isMeetingNote :173 | "waiting on X since" when touchRead.awaitingReply and no newer meeting :174-188 |
| owedToMe direct ask | src/lib/room/owed.ts:123-181 | room/page.tsx:286-301 over allNotes, 14-day window :27, dismissals, sheet bodies | actors sender via senderOf :48-61 (inbound = sender non-empty and not MINE_RE :60), body DIRECT_ASK_RE :24-25, OWED_LINE_RE :19-20 | a suggestion per ask, keyed owedKey :32-36 |

### A2. Last outbound, the operator's

| Path | file:line | Corpus and filters | Note fields read | Returns |
|---|---|---|---|---|
| extract direction "out" → intel.lastOutbound | src/lib/intel/extract.ts:136-183, :375-376 | whatever the caller passes (seven corpora, table A1 and pass 1 candidate 2) | glyph gate `/^[✉✔☎☰] /` :136; actors column or inferActors(body) :140; sender = actors.split("→")[0] :141; head line `/—\s*Antaeus/i` :179; at = effectiveAt(createdAt, body) :175; Touch.message docs are "out" :197-203 | ISO of the newest "out" doc |
| newestOutbound → lastTouchRead | src/lib/room/touch.ts:39-76, :113-140 | room/page.tsx:256-271 (allNotes, hide-filtered); ask/live.ts:159-170 (25 narrow) | actors column ONLY, no glyph gate, no inferActors :49-52; excludes selfAddressed :58, :104-111; excludes isMeetingNote :61; excludes future when now given :72; effectiveAt :65 | the note, then TouchRead {at, who via targetOf :86-99, awaitingReply true, source "record"} vs the touch log by latest :125 |
| recordSends | src/lib/sendbook/read.ts:89-107 | sendbook page, groundwork page (hide-filtered projections); groundwork/page.tsx:351 RAW notesMap for seat retirement; accounts/page.tsx:379 RAW chipNotes for "engaged"; activity/run.ts:499-524 and :1033-1043 direct prisma take 80/60 | glyph gate :94; actors or inferActors :95; MINE_RE sender :98; !isMeetingNote :99; raw createdAt :104, no effectiveAt; no self-addressed or future exclusion | {at, head, who} per send |
| Groundwork lastOutIso | src/lib/groundwork/day.ts:378-385 | intel (actors dropped) plus outreach: touches including synthesized taps | contactedAt; intel.lastOutbound | max of both |
| Groundwork carry clearance | src/lib/groundwork/day.ts:694-697 | intel only | intel.lastOutbound ≥ yesterday UTC ISO | worked-by-record |
| act-lane send (writer) | src/app/accounts/act-actions.ts:105-112 | n/a | writes actors `${OPERATOR_NAME} → ${to}`, source "act-lane", ✉ head [pass-1 cite for the head] | a row every reader above counts as a send |

### A3. Last inbound, they wrote to us

| Path | file:line | Corpus and filters | Note fields read | Returns |
|---|---|---|---|---|
| extract direction "in" → intel.lastInbound, lastInboundWho, lastInboundPromise | src/lib/intel/extract.ts:149-186, :367-374 | per caller; homeSide undefined makes toUs true :158-160 | glyph gate; attributed = sender non-empty :149; !isMachinery({body, actors}) :165; !isCloser on body after the head, glyph notes only :166; toUs = isAddressedToUs(actors, homeSide, splitRecipients(recipients)) :158-160; THEIR_PROMISE_RE on the newest inbound :253-254, :373 | ISO, sender, promise flag |
| inboundDates and warmDates | src/lib/sendbook/read.ts:118-149 | sendbook page (with orgSignals), groundwork page (without), run.ts context pack | glyph gate; sender not empty, not MINE_RE, not a CSM by exact lowercased name :115-116, :128, :144; AUTO_RE on the head only :114; warmDates ALSO counts any isMeetingNote :121-124; no closer, no machinery beyond auto-reply, no recipients, no homeSide | dates; lane never-met vs gone-cold :208 |
| owed.ts isInbound | src/lib/room/owed.ts:48-61 | room/page.tsx allNotes | actors sender non-empty and not MINE_RE, nothing else | gates DIRECT_ASK_RE at :173 |
| pipeline theirTurnFrom and answeredSince | src/lib/pipeline/report.ts:257, :321-325, :381-388 | pipeline notes | senderOf actors :257; !isHome(who); source not transcript :325; answer = a later UTC day :381 with body > 40 chars :388 | their promise; promise answered |
| second record org inbound | src/lib/activity/read.ts:159-176 | rollup.lastOrgInbound from the SF export | export rows, not notes | orgInboundKey ISO-ish; holder = last human colleague not MINE_RE :168-176 |
| Groundwork live-motion | src/lib/groundwork/day.ts:81-91 | intel from the stripped corpus | intel.lastInbound within 21 days | account excluded |

### A4. Direction of a note

| Path | file:line | Corpus and filters | Note fields read | Returns |
|---|---|---|---|---|
| corpusFor | src/lib/intel/extract.ts:136-183 | per caller | glyph, actors or inferred, head `/—\s*Antaeus/i`, machinery, closer, recipients, homeSide | "out" / "in" / undefined; non-glyph notes always undefined :177-178 |
| recordSends / inboundDates / warmDates | src/lib/sendbook/read.ts:89-149 | per caller | glyph, actors or inferred, MINE_RE, CSM roster, AUTO_RE, isMeetingNote | send / inbound / warm |
| newestOutbound | src/lib/room/touch.ts:39-76 | per caller | actors only | send or not |
| owed.ts senderOf / isInbound | src/lib/room/owed.ts:48-61 | room allNotes | actors only | inbound or not |
| pipeline senderOf | src/lib/pipeline/report.ts:257 | pipeline notes | actors only, then isHome | theirs / ours |
| mirror speaker | src/lib/intranet/mirror.ts:99 | intranet runner take 400, no inference | actors column, else lane "mine" → OPERATOR | who spoke in the brain |
| Groundwork hasConversation | src/lib/groundwork/day.ts:314-315 | hide-filtered notes incl. salesnav/wire, plus outreach: touches and taps | glyph gate only, any direction | pitched or not |

### A5. Is a meeting

| Path | file:line | Corpus and filters | Note fields read | Returns |
|---|---|---|---|---|
| isMeetingNote | src/lib/intel/meeting.ts:31-51 | callers: touch.ts:61, sendbook/read.ts:99/121/141, day.ts:99 over UNFILTERED accountNotes (groundwork/page.tsx:325), ask/live.ts:173 (25 narrow), meetingRead :154 | source === "call" or "call-ai" :34; source "transcript" needs TRANSCRIPT_HEAD_RE in 40 lines or ≥2 speaker labels :35-47; else body.slice(0,200) against NOT_HELD_RE veto :49 then MEETING_RE or LOGGED_ACTIVITY_RE `/^\s*✔[^\n]*\b(meeting|call|demo|visit)\b/i` :11-14, :50 | boolean |
| meetingRead | src/lib/intel/meeting.ts:137-175 | room/page.tsx:313-322 allNotes; pipeline build [pass-1 cite] | first isMeetingNote in caller order; who from actors otherSide :111-117, sibling same UTC day :157-167, speakersIn :121-133 | {at: createdAt, who} |
| pipeline events | src/lib/pipeline/build.ts:395-402 | pipeline notes | `/transcript|call-ai|meeting/.test(n.source)`, kind by `/transcript|call-ai/` | Call/Meeting events; plain "call" source missed; any "transcript" source counted |
| pipeline lastTouch kind | src/lib/pipeline/build.ts:585 | same | `/transcript|call/` | Call vs Meeting label |
| pipeline outcomes source | src/lib/pipeline/build.ts:404 | same | source === "call-ai" | the call read |
| collect demoOnRecord | src/lib/pipeline/collect.ts:49, :107-110 | hide-filtered notes plus card.states.demo | DEMO_HELD_RE body regex | demo happened |
| evidence demo-delivered | src/lib/intel/evidence.ts:46-52, :94-117 | corpus docs, future-dated gate :40-43, :107 | `/demo (delivered|went|recap)|transcript filed|Accepted: Demo|…/i` on doc text | check suggestion, meter evidence |
| groundwork file isPaste | src/lib/groundwork/file.ts:107 [sweep cite] | file card | `/^(sf|outlook|teams|transcript|room)/` on source; call and call-ai fall to other notes | provenance label |
| MEETING_SOURCE | src/lib/intel/meeting.ts:9 | none | exported, no importer in src | nothing |

### A6. Is the operator, is our side

| Path | file:line | Corpus and filters | Fields read | Returns |
|---|---|---|---|---|
| MINE_RE | src/lib/intel/provenance.ts:15 `/\bantaeus\b|antaeus\.coe@|acoe@prismhr/i` | readers: touch.ts:52,96,110; extract.ts:179,185; sendbook/read.ts:98,128,144; owed.ts:60,108,165; pipeline/build.ts:391,534; room/actions.ts:1148; activity/read.ts:172,192; book/live-contacts.ts:52; provenance.ts:28,157,170 | actors sender, names, text | is me |
| OPERATOR_NAME | src/lib/intel/provenance.ts:12 "Antaeus Coe" | normPerson :180 (You/Me → operator at write); act-actions.ts:110 (write) | first-person tokens | canonical name |
| private literals | src/lib/intranet/mirror.ts:35 OPERATOR = "Antaeus Coe"; src/app/room/page.tsx:817 me: "Antaeus Coe"; src/lib/intel/people.ts:35 SKIP_RE `/antaeus|^you$|^me$|…/i`; src/lib/intel/extract.ts:179 `/—\s*Antaeus/i`, :364 `/antaeus/i` | n/a | n/a | five spellings beside MINE_RE |
| env owner | src/lib/auth.ts:55-57 APP_ACCESS_USER_EMAIL | access only | never reaches the record | app access |
| isHomeSideName | src/lib/intel/provenance.ts:25-37 | callers pass csms only: room/page.tsx:267,315,345,393; ask/live.ts:168; pipeline/build.ts:340 | MINE_RE, @prismhr.com, exact normalized roster match | our side |
| isOurs | src/lib/intel/provenance.ts:153-159 | inside isAddressedToUs | plus a bare first-name match against the roster | keeps an inbound |
| homeSideFrom | src/lib/pipeline/build.ts:271-289 | whole notesById, namespaced ids skipped :277 | actors names on ≥3 accounts, two-word lowercase :284 | the union rosters at room/page.tsx:134-135, today/page.tsx:642, app/page.tsx:47 |
| pipeline isHome | src/lib/pipeline/build.ts:314-342 | active accounts' notes plus input.homeSide | OURS ≥3 :329-332, CSM_FIRST first names :335-341 | home side for the report |
| sendbook CSM voice | src/lib/sendbook/read.ts:115-116 | csms from the book | exact lowercased name equality | never warms |
| second record colleagues | src/lib/activity/rollup.ts:146 `inp.colleagues` | from the run's input [pass-1 cite; source of the set not re-read] | export Assigned names | kind "colleague" |

### A7. Hidden

| Path | file:line | What it writes or reads | Consumers that honor it | Consumers that do not |
|---|---|---|---|---|
| roomRecordDelete | src/app/room/actions.ts:1481-1490 [sweep cite :1486] | writes `hide:note:<id>` status parked | room/page.tsx:159; groundwork/page.tsx:195; sendbook/page.tsx:84; pipeline/collect.ts:87-89; today/build.ts:698 latestLineByAccount | today/page.tsx:653-664 corpus and :1313 relationship; app/page.tsx:95; intake/actions.ts:78; accounts/page.tsx (no hide: read at all); partners/page.tsx:129; book/actions.ts:97; groundwork/page.tsx:351 seats and :542 relationship (raw notesMap); ask/live.ts:88; room/actions.ts:1252 and :1135; activity/run.ts:499, :1033; intranet/runners.ts:146-150; accounts/actions.ts:176; draft-actions.ts:136 |
| hideKeyFor | src/lib/today/ledger.ts:74-77; written by today/actions.ts:1029 | `hide:<store>:<id>` with store acct, partner, todo, touchLog | today/page.tsx:778 collects every `hide:` key; reads hide:acct: :1094, hide:partner: :1108, hide:todo: :787, hide:send: :1134, hide:touchLog: :1149, hide:move: :1163 [sweep cite for the last three] | every hide:note: reader above ignores hide:acct: |
| sheet hide | src/lib/room/sheet-view.ts:155 `${HIDE}todo:` | todo rows | buildAccountSheet | n/a |
| nofile: | src/app/today/actions.ts:253 [sweep cite] | skip-file marker | today/page.tsx:783-786 | n/a |
| base loader | src/lib/today/overlay.ts:123-126 | no filter | n/a | every consumer must filter itself |

### A8. Today, which clock

| Path | file:line | Clock | Consumers |
|---|---|---|---|
| dayStamp → morningDoneKey | src/lib/today/build.ts:447-450, :465-467 | UTC calendar day | room/page.tsx:611 outstanding gate done key [pass-1 cite for the line]; today/page.tsx:1001 [sweep cite] |
| moveDoneKey | src/lib/room/bind.ts:22-24 via chicagoDay at src/lib/intranet/ledger.ts:99-102 | Chicago en-CA | room/page.tsx:638 workedToday [pass-1 cite]; room/actions.ts:711 [sweep cite] |
| sameLocalDayIso → sameUserDay | src/lib/today/ledger.ts:42-44; src/lib/tz.ts:23-32 | Chicago | today/page.tsx:1093,1107 ledger; sheet-view.ts:164,194-196 HELD and doneToday |
| userDayKey | src/lib/tz.ts:23-27 | Chicago | groundwork/page.tsx:377,387,501,506; groundwork/file.ts:242-246; day.ts:683-684 yesterday; act-actions.ts:155,217 |
| chiDay | src/lib/sendbook/read.ts:163-167, :238-242, :279-303 | Chicago | tap fold, week head |
| brief dayKey | src/lib/intel/brief.ts:89-95 | Chicago | brief-done keys |
| room theirBall day | src/app/room/page.tsx:336-345 | Chicago | owed line day-matched to the meeting |
| second record chiDay | src/lib/activity/run.ts:75 [sweep cite], :513, :1049 | Chicago | context pack, acted sweep |
| daysBetween | src/lib/room/engine.ts:89-93 | UTC millisecond floor, clamped at 0 | court chips, health |
| businessDaysBetween | src/lib/groundwork/signals.ts:70 [sweep cite]; brief.ts [pass-1 cite] | UTC weekday | read-due, contract-chase, stale-deal |
| meetingRead sibling day | src/lib/intel/meeting.ts:157-164 | UTC slice(0,10) | who was met |
| pipeline dayOf | src/lib/pipeline/build.ts:398, :525, :556; report.ts:352, :381 | UTC slice(0,10) | events, reply owed, quietDays, promise answered |
| Chute ledger day | src/app/room/chute.tsx:81 | Chicago | receipt reload |
| Date.now() default | src/lib/today/build.ts:369 at today/page.tsx:967 | instant, not the page's now | cardNextStep age |

### A9. Last touch

| Path | file:line | Corpus and filters | Fields read | Returns |
|---|---|---|---|---|
| lastTouchRead | src/lib/room/touch.ts:113-140 | room/page.tsx:256-271; ask/live.ts:159-170 | newestOutbound vs the outreach: Touch by latest, effectiveAt on the record side, raw contactedAt on the log side | {at, who, awaitingReply, source} |
| Groundwork drumbeat clock | src/lib/groundwork/day.ts:378-385 | outreach: touches plus synthesized taps, intel.lastOutbound | latest of the two | lastOutIso |
| Accounts LAST HUMAN TOUCH | src/app/accounts/page.tsx:345-352 → src/lib/activity/rollup.ts:123-158 | the SF export slice only, isHumanMotion :124 | export rows | {day, how, who, kind} |
| Accounts live recency | src/app/accounts/page.tsx:229-232 | chipNotes RAW, any lane, hidden included, namespace-free key | newest note createdAt | deskScore lastActivityIso |
| Accounts partner roster last touch | src/app/accounts/page.tsx:198-214 | partner notes plus Touch rows matched by label | createdAt, contactedAt | per-partner last |
| pipeline quiet | src/lib/pipeline/build.ts:556 | newest note of ANY direction, effectiveAt | createdAt | quietDays ≥21 risk |
| ask brain | src/lib/ask/live.ts:159-188 | 25 narrow | same as lastTouchRead | the waiting line |
| engine quietDays | src/lib/room/engine.ts:194 | lastTouch.at | daysBetween | court chip, health |

### A10. Stage, deal position

| Path | file:line | Store | Fields read | Returns |
|---|---|---|---|---|
| cardNextStep | src/lib/today/build.ts:366-388 | DashCard | states, checks, notes.__outcome via readOutcome :372 | first unchecked item on the first active node |
| readOutcome | src/lib/dashboard/outcome.ts:37-52 | DashCard.notes JSON key OUTCOME_KEY | status won/lost | terminal stamp |
| allGatesDone | src/app/room/page.tsx:244-250 | DashCard | every check on every node | finished, unstamped |
| meterRead | src/lib/room/engine.ts:128-185 | board plus suggestChecks evidence :154-158 | step, evidence node index | frac = max(board, evidence+0.15) :177-184 |
| suggestChecks | src/lib/intel/evidence.ts:45-123 | corpus docs, future-dated gate except countries-known | six body regexes on doc.text | check suggestions, meter evidence |
| Groundwork late-stage exclusion | src/app/groundwork/page.tsx:293-311 | DashCard | states demo/exec_summary/proposal/contract active or done; outcome read before the archived skip :300-307 | excludedIds |
| Accounts boardById | src/app/accounts/page.tsx:134-151, :366-385 | DashCard | outcome, live = !archived and no outcome | disposition precedence: outcome > motion/parked > live > engaged |
| pipeline collect | src/lib/pipeline/collect.ts:77-97 | DashCard | archived skip, outcome drop, step.nodeLabel | stageLabel |
| boardLift | src/lib/command-center/types.ts:64-72; applied at src/lib/command-center/data.ts:61 and accounts/draft-actions.ts:62 | PeoState | NOT_TOUCHED → CSM_BRIEFED, NEEDS_CSM → CHANNEL_OK when a card exists | lifted stage/approach; accounts/page.tsx:411-412 reads the lifted rows from loadCommand (corrected in pass 3: the earlier "reads PeoState raw" was wrong) |
| sfStageForStates | src/lib/dashboard/stages.ts:120-142 | DashCard states | furthest active or done node | SF picklist value |

### A11. Countries, products, headcount, timing

| Path | file:line | Corpus and filters | Fields read | Returns |
|---|---|---|---|---|
| extractDealIntel | src/lib/intel/extract.ts:256-432 | docs from any of the seven corpora; digest seed :258-270, fallback after :397-402 | countries via countriesIn per non-tape doc :283-287, tape only when nothing else :383-386; headcounts via HEADCOUNT + countryNear per non-tape doc :307-316, tape fallback :387-395; products via PRODUCT_TERMS on EVERY doc, tape included :317-322; chair first hit newest-first :323-329; incumbent first hit :330-334; timing = first URGENCY hit newest-first with dateNear in the same sentence :335-361 | DealIntel |
| dealIntelFor | src/lib/intel/extract.ts:435-442 | groundwork/page.tsx:237 (stripped corpus, no todos); intake/actions.ts:77 | same | same |
| roomGapsRefill intel | src/app/room/actions.ts:1252-1281 | 40 newest notes, no todos, no touches, no homeSide, no hide, no alias fold | same | countries, products, timing.phrase for mintAsks :1284-1290 |
| countries-known check | src/lib/intel/evidence.ts:82-91, :104-109 | ANY doc, tape included, no future gate | `/countr(y|ies)|we're in [A-Z]|workers? in [A-Z]/` plus countriesIn(d.text).length > 0 | meter evidence at needs_analysis |
| pipeline opportunities | src/lib/pipeline/build.ts:406-436 with productByCountry and countriesInPlay | notes whose source is not transcript :195, :207 [sweep cite]; demandNear sentence test src/lib/intel/lexicon.ts:200-218 | intel.countries filtered by inPlay :424-425, headcount by country :408-411, product by country :418 | country × product rows |
| room meta country | src/app/room/page.tsx:185-187 | intel.countries[0] | COUNTRY_NAME | strip label |
| accountIntel countries | src/lib/today/build.ts:93-119 | research.json via getDemand, extractCountries(dem) :115 | seed only | Today and Groundwork scoring; Groundwork demand gate at day.ts:448-453 |
| intake prefill | src/app/intake/actions.ts:77-115 | dealIntelFor, no homeSide | countries, headcounts, incumbent, tlm/wallet, chair | form prefill |

### A12. Facts derived in more than one place that the brief did not list

| Fact | Paths |
|---|---|
| who the relationship is | relationshipFor src/lib/intel/relationship.ts:17-31 over five corpora: room/page.tsx:212 (hide-filtered), today/page.tsx:1313 (raw, every peo), accounts/page.tsx:237 (raw), groundwork/page.tsx:541-545 (raw notesMap), ask/live.ts:130 (25 narrow), partners/page.tsx:129 (raw), book/actions.ts:96 (raw); plus rollup.lastHuman :143 and meetingRead who and targetOf |
| machinery | isMachinery src/lib/intel/closer.ts:199-206 (extract only); sendbook AUTO_RE read.ts:114 (head only); rollup isMachineryName src/lib/activity/classify.ts:25-27 and RECEIPT_RE :66-67; people.ts SKIP_RE :35 |
| their promise, their ball | extract THEIR_PROMISE_RE :253-254 on the newest inbound; owed.ts owedByThem :88-121 within 14 days; pipeline theirTurnFrom report.ts:321-325 and answeredSince :381-388; room theirBall day-matched to the meeting page.tsx:334-348 |
| acceptance, booked | closer.ts isAcceptance :119-125 → room lastAccepted page.tsx:382-397 and settledByRecord src/lib/room/settled.ts:34-53; sendbook counts the same head as inbound (no MEETING_RESPONSE test) |
| engaged, pitched | Accounts engagedIds accounts/page.tsx:155-161 plus recordSends :379; Groundwork hasConversation day.ts:314-315 |
| intent | Sales Navigator notes signals.ts:24-41 vs second-record intentWarm activity/read.ts:128-144 |
| research age | accounts/page.tsx:245-315 field merge vs day.ts:224-234 and :516-552 [pass-1 cite] |

## B. Divergence, concretely

Each row names a note on which two paths disagree. "Chosen" means a comment or decree in the code says so; "accidental" means no comment claims the difference.

| Fact | Path 1 | Path 2 | The note that splits them | Chosen or accidental | Which surfaces show each answer |
|---|---|---|---|---|---|
| reply owed | engine court via touch.ts:58 selfAddressed | brief.ts:108-112 via extract.ts:179 | `✔ SF Sep 20 — Follow up with TrendHR · Antaeus Coe → Antaeus Coe`, source sf, after an inbound `✉ OL Sep 18 — Re: pricing · Adam Meyer → Antaeus Coe` | accidental: the self-task fix landed in touch.ts:53-58 only; extract's "out" test at :179 has no self-addressed exclusion | /room: YOUR MOVE · ADAM WROTE; /today brief: silent (lastOutbound Sep 20 > lastInbound Sep 18); pipeline: "they owe a reply" build.ts:517-521; Groundwork: excluded anyway by the 21-day inbound |
| reply owed | extract "in" :181 (no colleague test) | sendbook inboundDates :144 (CSM excluded) | `✉ OL Sep 22 — Re: Regis intro · Lesha Cyphers → Antaeus Coe`, recipients "Antaeus Coe", Lesha in csms | chosen for the Sendbook (read.ts:109-113 "a CSM's voice never warms"); accidental for the court, nothing in extract.ts says a colleague's mail is "they wrote" | /room: YOUR MOVE · LESHA WROTE; /today: Reply to Lesha; pipeline: no "they owe"; Sendbook: the Sep 21 send stays unreplied, lane unchanged; Groundwork: account leaves the queue for 21 days on a colleague's mail (day.ts:88-90) |
| reply owed, warmth | extract via isMachinery → isMeetingResponse closer.ts:204 | sendbook warmDates :125-130 and inboundDates :140-146 | `✉ OL Sep 23 — Accepted: Intro to PrismHR Global · Joseph Lyon → Antaeus Coe` | chosen (closer.ts:147-149: suppresses the obligation, "stays real for Sendbook warmth") | /room: BOOKED · JOSEPH ACCEPTED (engine.ts:256-258); Sendbook: repliedAt set, lane GONE COLD; Groundwork drumbeat: not answered (intel.lastInbound unchanged) so silence-bump can fire on a booked meeting, which nobody chose |
| reply owed, warmth | extract closer :166 | sendbook (no closer test) | `✉ OL Sep 23 — Re: pricing · Adam Meyer → Antaeus Coe` with body `Thanks!` | chosen (CLAUDE.md closer rule: transparent for reply-owed, real for warmth) | /room: court unchanged; Sendbook: ↩ REPLIED |
| reply owed, same day | engine via effectiveAt (touch.ts:65, extract.ts:175) | sendbook raw createdAt :104, :146 and strict `s.at < inAt` :263 | `✉ OL Sep 2 9:44 AM — Trend · Antaeus Coe → Adam Meyer` and `✉ OL Sep 2 10:39 AM — Re: Trend · Adam Meyer → Antaeus Coe`, both at the noon anchor | accidental (clock.ts exists for exactly this case; sendbook never imports it) | /room: YOUR MOVE · ADAM WROTE TODAY; Sendbook: the send shows no reply, and the tap-fold at :238-242 still works because it compares days |
| last outbound | extract.ts:179 head fallback | touch.ts:49-52 and read.ts:96-98 sender only | `✉ OL Sep 22 — Re: Antaeus's proposal · Tom Harrison → Javier Ramirez +3` | accidental (extract.ts:137-139 calls the head test the old bug, :179 keeps it as an "out" fallback) | /today and pipeline: lastOutbound Sep 22, "they owe"; Groundwork: carry cleared, drumbeat reset; /room court: touch clock ignores it; Sendbook: no send |
| last outbound | extract on /room (actors column) | extract on Groundwork (actors dropped, groundwork/page.tsx:238-243 → inferActors, SF_HEAD_RE accepts SF/OL/TM only, provenance.ts:200) | `☎ CT Sep 20 — Intro call · Antaeus Coe → Chassie Smith`, source call-ai, actors column set | accidental (no comment; and the drop also blanks every ☎ CT and ✉ SN entry) | /room intel.lastOutbound = Sep 20; Groundwork intel.lastOutbound = the previous OL/SF send, so its drumbeat and carry read a different clock; the same note is a meeting to touch.ts:61 so the court's clock ignores it too |
| last inbound | extract with homeSide (/room :165, /today :655, / :96, pipeline :367) | extract without homeSide (groundwork/page.tsx:237-251, intake/actions.ts:77, room/actions.ts:1266) | `✉ OL Sep 15 — Re: payroll · Tom Harrison → Javier Ramirez`, recipients "Javier Ramirez", both account people | chosen only for roomGapsRefill (actions.ts:1267-1271 comment); accidental for Groundwork and intake, no comment | /room: not inbound, court unchanged; Groundwork: lastInbound Sep 15, account excluded 21 days, drumbeat "answered"; intake: same as Groundwork |
| direction, inbound for asks | owed.ts isInbound :60 (sender not MINE_RE, nothing else) | extract "in" (machinery excluded) | `✉ OL Sep 21 — 📣 New campaign response lead · Marketing → Antaeus Coe` with body `Can you please review the lead` | accidental | /room UNKNOWN/owed: "Marketing asks: review the lead" suggestion (owed.ts:173); court: unchanged, machinery |
| is a meeting | isMeetingNote :50 LOGGED_ACTIVITY_RE | pipeline/build.ts:396 source regex | `✔ SF Sep 19 — Demo with Chassie · Antaeus Coe → Chassie Smith`, source sf-ai | accidental | /room: recap owed (meetingRead), Groundwork: excluded 14 days, touch clock skips it; pipeline: no Call/Meeting event, and the same note counts as the operator's last outbound in extract |
| is a meeting | isMeetingNote :35-47 (transcript source needs a call shape) | pipeline/build.ts:396 | `☰ transcript — filed from the room` + `checked in with Chassie by text`, source transcript (the zero-entry fallback at actions.ts:405-411) | accidental | pipeline: a Call event; /room, Groundwork, Sendbook: not a meeting |
| is a meeting | isMeetingNote :34 source "call" | pipeline/build.ts:396 `/transcript|call-ai|meeting/` | any rules-read CT entry, source "call" without "-ai" | accidental | pipeline events miss it; :585 label catches it |
| is our side | corpus toUs with csms ∪ homeSideFrom (room/page.tsx:134-135) | touch targetOf with csms only (room/page.tsx:267) | `✉ OL Sep 20 — Re: intro · Antaeus Coe → Shane Jacobs +2`, Shane on ≥3 accounts, not a CSM | accidental (the union is built at :134 and passed to the corpus at :165 but not to the touch clock at :267) | /room court: THEIR MOVE · SHANE; pipeline: Shane excluded as home (build.ts:340); the corpus would call a reply from Shane "ours" |
| hidden | hide:note: readers | hide:acct: reader | a note the operator ✕'d on the Today ledger (`hide:acct:<id>`) | accidental (two key grammars for one row) | /today ledger: gone; /room court, Groundwork queue, Sendbook, pipeline: still driven by it |
| hidden | hide:note: readers | the unfiltered consumers in A7 | a note the operator ✕'d on /room (`hide:note:<id>`) | accidental | /room, Groundwork intel, Sendbook, pipeline, roundup rider: gone; /today brief and ledger, Accounts relationship and recency and engaged, Groundwork seat retirement (page.tsx:351), ask brain, research and ask-mint corpora, intranet mirror: still read it |
| today | dayStamp UTC (build.ts:447-450) | chicagoDay (bind.ts:22-24) | a move marked done at 19:30 Chicago on Sep 24 (= 00:30Z Sep 25) | accidental | morning gate key says 2026-09-25, worked-today key says 2026-09-24; the same row reads done on one and unworked on the other until midnight Chicago |
| last touch | lastTouchRead (record + log) | Accounts LAST HUMAN TOUCH (rollup.ts:123-158, export only) | an `.eml` filed Sep 22 `✉ OL — · Antaeus Coe → Kevin Miller` when the newest export row is Sep 10 | chosen by the 2026-08-20 decree (CLAUDE.md, Accounts face), and it contradicts the Ted doctrine's widest-merge clause as pass 1 noted | /room: wrote Sep 22; Accounts column: Sep 10 |
| last touch | Groundwork drumbeat lastOutIso includes synthesized taps (page.tsx:330-337, :361; day.ts:378-385) | carryover workedByRecord reads intel.lastOutbound (day.ts:694-697), taps never enter the corpus (page.tsx:244-250) | a LINKEDIN tap today, no record send | accidental | wing: drumbeat reset, pre-answer rule satisfied; carry: still carried tomorrow |
| engaged, pitched | Groundwork hasConversation (any glyph) | Accounts engaged (touch, tap, or recordSends) | one inbound `✉ OL — · Kevin Miller → Antaeus Coe`, no send, no touch | accidental | Groundwork: pitched, engaged-never-introduced silenced; Accounts: no disposition |
| countries | extract (tape ranked behind :281-287, :383-386) | evidence countries-known (any doc, :104-109) and pipeline countriesInPlay (transcript excluded, build.ts:195) | Brazil named only in the ☰ archive of a demo, Mexico named in a read | three answers, each locally chosen (extract.ts:272-280 comment; evidence.ts:86-89 comment; lexicon.ts:185-199 comment), never reconciled | /room meta: MEXICO; meter: "countries named" cites the tape's Brazil if it sorts first; pipeline: Mexico only |
| products | extract (tape counted, :317-322 has no tape gate) | pipeline productByCountry (transcript excluded, build.ts:207) | "employer of record" spoken only on the tape, no read mentions it | accidental (the tape gate exists for countries and headcounts, not products) | /room shape: EOR; pipeline row: product Unknown |
| timing | extract over the full corpus incl. touch docs and digest | roomGapsRefill over 40 notes: digest passed (:1280) but todos and touches absent | an urgency phrase that lives only in a Touch.message | accidental | /room wall: set; minted asks: no stage phrase |
| relationship | relationshipFor over the folded, hide-filtered allNotes (/room) | relationshipFor over 25 narrow, unfolded, unfiltered notes (ask/live.ts:88-100) | the ten messages filed under the shell id 0013k00002dGqODAA0 (merge.ts:5-10) | accidental | /room: the CEO thread names the relationship; the ask brain: the book seed |
| stage | Groundwork late exclusion (page.tsx:293-311) | Accounts live (page.tsx:145-148) | a card at first_meeting, active | consistent | both treat it as in motion |
| stage | Groundwork archived skip after the outcome read (page.tsx:300-307) | Accounts live | a card archived at demo done, no outcome stamp | accidental [inferred from the branch order] | Groundwork: re-enters prospecting; Accounts: not live, falls to engaged or nothing |

Pairs that cannot be split, so they are safe merges: touch.ts newestOutbound and sendbook recordSends agree on every note whose actors sender is the operator, is not self-addressed, is not a meeting and is not future-dated; extract and brief agree by construction since brief reads extract's intel; the three Chicago day keys (userDayKey, chiDay, chicagoDay in ledger.ts, brief.ts:89) are the same computation and can be one function.

## C. The narrow reads

The sweep finds 47 direct AccountNote reads and 40 direct writes on main, against pass 1's count of 42 reads. The alias fold (overlay.ts:153 → merge.ts:65-74) folds both a raw id and the tail of a namespaced key, so the recurring consequence is a page-versus-action mismatch: the page renders a shell-keyed row under the canonical account, the action keyed on the canonical id cannot find it. Every writer stores the id it was handed verbatim (write.ts:31), and bindAccountId only ever yields the canonical id because peos drops aliased ids (index.ts:70-72), so shell-keyed rows are legacy rows plus anything a client-supplied raw id writes.

| file:line | What it reads | Narrow / should be wide | Alias-fold consequence |
|---|---|---|---|
| src/app/room/actions.ts:573 | gaps:<canonical>, bodies, for absorbRead's known-set | should be wide | asks under gaps:<shell> are unknown to the dedupe, so a paste re-files asks the room already shows folded (room/page.tsx:487) |
| :594 | playbook:market and playbook:lessons bodies | narrow OK | fixed namespace |
| :861 | note by id AND accountId canonical, for roomUnlog | should be wide | a capture whose rows sit under the shell id is refused as another account's |
| :922 | playbook lines by id, tail compared to canonical | narrow OK | a legacy line tailed with the shell id survives an undo |
| :1125 | research:<canonical>, take 1 | should be wide | a research:<shell> pass is invisible; previous=null, countries dropped, while the room chip shows it as latest (room/page.tsx:472) |
| :1135 | 60 newest notes on canonical, body and actors | should be wide | the shell's ten messages contribute no people to the research prompt |
| :1183 | gaps:<canonical> | should be wide | research asks duplicate the shell-keyed gaps |
| :1219 | gaps:<canonical> | should be wide | mintAsks told "asked" without the shell's asks; fileGaps re-files them |
| :1222 | research:<canonical>, take 1 | should be wide | a shell-keyed pass is not fed to the minter |
| :1230, :1238 | playbook lessons and market, take 8 | narrow OK | fixed namespace |
| :1252 | 40 newest notes on canonical, no hide filter, no inference | should be wide | asks minted blind to the CEO thread; also blind to hidden rows |
| :1320 | gap by id AND gaps:<canonical> | should be wide | an ask rendered from gaps:<shell> cannot be waved off |
| :1439 | note by id AND canonical, for roomRecordEdit | should be wide | ✎ on a shell-keyed register row is refused |
| :1481 | note by id AND canonical, for roomRecordDelete | should be wide | ✕ on a shell-keyed row is refused, so it cannot be parked |
| :1518, :1537 | note ownership for roomNoteToAction | should be wide | ✸ on a shell-keyed row is refused |
| :1618, :1700 | marker ownership for roomTodoSet and roomTodoEdit | should be wide | done/undo/edit refused when the marker points at shell-keyed notes |
| src/app/activity/evidence/route.ts:34, :80, :99 | activity:stage:, intent:, activity: by raw URL acct | should be wide, paired with read.ts:54 | legacy slices under the shell id are unreachable; must fold together with fetchSecondRecords or drills return empty |
| src/app/groundwork/actions.ts:122 | sendbook:<raw client id>, today's window, take 3 | narrow OK | writer and reader share the id and the day |
| :184, :206 | wire: prefix and wire:<hash> | narrow OK | fixed namespace |
| src/app/intranet/runners.ts:146 | newest 400 notes, no where, no hide, no inference | should be wide | shell-keyed rows mirror under accountId 0013k… with name "" since peos has no such id, a phantom account in the brain |
| :263, :276 | activity: and gems: prefixes, raw tails | should be wide | a shell-keyed rollup or gems joins only a shell-keyed digest |
| :395 | by originRef id | narrow OK | by id |
| :475 | playbook namespaces | narrow OK | fixed namespace |
| src/app/accounts/actions.ts:176 | 400 newest on raw caller id, no hide, no inference | should be wide | contacts discovered from the shell's messages never join the roster |
| src/app/accounts/draft-actions.ts:136 | 8 newest on canonical | should be wide | grounding lines omit the shell's rows |
| :218 | template:mail | narrow OK | fixed namespace |
| src/app/accounts/act-actions.ts:131 | gems:<raw client id>, newest | should be wide, paired with read.ts:54 | consistent today because both are narrow; folding one without the other un-stamps gems silently |
| src/app/scratch/actions.ts:42, :340 | scratch:pad, scratch:gone | narrow OK | fixed namespace |
| src/lib/activity/run.ts:164, :177 | activity:manifest | narrow OK | fixed |
| :199, :219, :378, :813, :923, :936 | activity namespaces by manifest id or prefix | narrow OK | new drops key canonical because the ingest book is peos; legacy shell rows linger unseen |
| :499 | 80 newest on canonical, no hide, no inference | should be wide | the distiller and refuter judge gems without the shell's messages, so an answered gem can survive |
| :1025, :1033 | gems: prefix, then 60 newest notes on the raw gems tail | should be wide | a send filed under the shell id never stamps actedDay; the nag outlives the record |
| src/lib/activity/read.ts:54 | activity:, gems:, support:, intent: prefixes, first per raw tail | should be wide | every page does secondById.get(canonical), so a shell-keyed second record is invisible everywhere |
| :94 | activity:stage:<canonical>, take 1 | should be wide | a legacy slice yields no evidence chips |
| src/lib/ask/live.ts:88 | 25 newest on canonical, no hide, no inference | should be wide | the relationship and last-inbound the ask brain derives omit the CEO thread |

Two things the sweep corrects in pass 1: the pastehash guard is an AccountDisposition read (actions.ts:209-213), not an AccountNote read; and src/lib/room/gaps.ts and src/lib/playbook/store.ts contain no direct reads, only writes through createAccountNoteRow. Every narrow read that carries `no inference` also gets "" actors and unset lane on rows filed before the provenance columns, which the wide loader repairs at overlay.ts:148-162.

## D. Note grammar dependencies

Written once, in roomPaste at src/app/room/actions.ts:419-451 (actors :419, recipients :421, glyph :423, head :425, at :428, body :432-435, lane :436, source :439-449), the archive notes at :368-374 and :405-411, and the outcome marker at :621. This is the contract a single read has to honor.

| Token | Written at | Read by (file:line, regex or comparison) |
|---|---|---|
| glyph head `✉ ✔ ☎` | actions.ts:423 from e.kind | extract.ts:136 `/^[✉✔☎☰] /` gates direction and the closer test; sendbook/read.ts:94,125,140 `/^[✉✔☎☰] /` gates sends, warmth, inbound; day.ts:315 same regex for hasConversation; meeting.ts:14 `/^\s*✔[^\n]*\b(meeting|call|demo|visit)\b/i`; clock.ts:15 `/^✉ OL /` gates the intra-day clock; provenance.ts:200,218,225 `^[✉✔☎] (?:SF|OL|TM)` for legacy actors, lane, subject; mirror.ts:52 strip; today/build.ts:702 and room/page.tsx:775 strip; room/actions.ts:1448-1454 edit keeps the glyph; room-client.tsx:2064-2110 icon class per glyph [sweep cite]; accounts/page.tsx:50 skips glyph lines |
| `☰` archive head | actions.ts:371 `☰ Call transcript — <label> …`, :407 `☰ transcript — filed from the room` | meeting.ts:28 `/^\s*(?:☰\s*)?call transcript\b/i` under source transcript; extract.ts:54 same regex marks tape; account-notes.tsx:39 `startsWith("☰") && includes("\n")` fold; room/actions.ts:1556 `/^transcript — filed from the room/`; NOT accepted by provenance.ts:200 so actors never infer for it |
| dialect token `SF OL TM CT SN` | actions.ts:425 liveDialect | provenance.ts:200,218,225 accept SF, OL, TM only; clock.ts:15 OL only; mirror.ts:52 strips SF, OL, TM only; room/actions.ts:1550 `/^(?:SF|OL|TM)\b[^—]*—\s*(.+?)\s*·[^·]*$/`; nobody reads CT or SN from the head, they are read from the source column |
| the em-dash slot `<when> — <subject> · <actors>` | actions.ts:425 | clock.ts:27 `head.split("—")[0]` for the clock; closer.ts:122,132 `line.indexOf("—")` then the subject for Accepted/Declined; sendbook/read.ts:154-160 clauseFromHead; mirror.ts:53 `/^[^\n]*—\s*/u` when under 90 chars; extract.ts:179 `/—\s*Antaeus/i` on the head as an "out" signal; provenance.ts:200,225 `[^—\n]*— .*? · (.+?)$` |
| actors column `A → B +N` | actions.ts:419 actorsLine (provenance.ts:188-194), stored :437 | extract.ts:140-141 sender = split("→")[0]; touch.ts:49-52 indexOf("→") then MINE_RE on the left, :86-99 targetOf on the right, :104-111 selfAddressed; sendbook/read.ts:96-103,127,143; owed.ts:48-61; meeting.ts:111-117 otherSide; pipeline/build.ts:279,317 split("→") for home side, :386 inRoom, :528, :534; report.ts:257; closer.ts:205 isMachineSender on the sender; room/page.tsx:386-389 lastAccepted who; room/actions.ts:1146 `split(/→|\+|,/)`; people.ts:37-48 `split(/→|;|,|\band\b/)` with the Last, First flip; provenance.ts:59-63 recipientOf, :141-144 the `+N` tail |
| actors fallback | none, inferred at read | overlay.ts:148 `r.actors || inferActors(r.body)`; extract.ts:140; sendbook/read.ts:95,126,142; touch.ts reads the column only; ask/live.ts:125, run.ts:504-509, room/actions.ts:1275, accounts/actions.ts:194 use `n.actors ?? ""` with no inference |
| recipients column | actions.ts:421 joinRecipients, stored :438 | provenance.ts:42-47 splitRecipients, :135-136 isAddressedToUs prefers it; extract.ts:160; carried only by loader-based corpora that pass full rows (room, today, app, intake, pipeline); dropped by groundwork/page.tsx:238-243 and every narrow read |
| lane column | actions.ts:436 laneFor(actors, subject+body) (provenance.ts:169-173: MINE_RE or GLOBAL_SCENT_RE → mine) | overlay.ts:160-163 stored or inferLane; room/page.tsx:160 `lane === "mine"` record register; app/page.tsx:61; accounts/page.tsx:391,401; people.ts:74 inMine → relationship.ts:24 preference; mirror.ts:99 speaker fallback; today/build.ts:698 roundup rider; ask/live.ts:127 and accounts/actions.ts:195 coerce |
| source literal | actions.ts:439-449 `outlook|teams|call|salesnav|sf` plus `-ai`; :373, :410 `transcript`; :621 `outcome` | meeting.ts:34-35 `=== "call"`, `=== "call-ai"`, `=== "transcript"`; pipeline/build.ts:396 `/transcript|call-ai|meeting/`, :399 `/transcript|call-ai/`, :404 `=== "call-ai"`, :585 `/transcript|call/`, :195, :207 `/transcript/`; report.ts:325,386 `/transcript/`; signals.ts:24 `startsWith("salesnav")`; groundwork/page.tsx:231 `startsWith("salesnav")`, `!== "wire"`, :270 `!== "wire"`; groundwork/file.ts:107 `/^(sf|outlook|teams|transcript|room)/`; loss.ts:65 reads the outcome marker by MARK_RE on the body, not by source [pass-1 cite] |
| createdAt at noon UTC of the entry's day | actions.ts:428, archive :341-344 | clock.ts:39-57 effectiveAt shifts only noon anchors with a `✉ OL` clock; touch.ts:65,73,120; extract.ts:175; settled.ts:40,48; pipeline/build.ts:357,398,525,556,602; raw createdAt at sendbook/read.ts:104,122,130,146,250,263; report.ts:352,381; meeting.ts:157-164; owed.ts:99,155; loss.ts:61; day.ts:88-96,382,693; signals.ts:49,62,104; people.ts:76; run.ts:513,1049; today/page.tsx:1093; accounts/page.tsx:205,230; room/page.tsx:399,769 |
| body regexes | body :432-435 after scrubSecrets and redactMoney | extract.ts:253-254 THEIR_PROMISE_RE, :286 countriesIn, :308 HEADCOUNT, :318 PRODUCT_TERMS, :325-326 COMMERCIAL_TERMS, :332 INCUMBENTS, :352 URGENCY; evidence.ts:45-92 six rules; meeting.ts:11,23 MEETING_RE, NOT_HELD_RE, :29, :76 speaker lines; owed.ts:19-25,83-86; loss.ts:20,30,35 [sweep cite]; settled.ts:27; closer.ts:73-93 isCloser, :112-117, :151-160; collect.ts:49 DEMO_HELD_RE; provenance.ts:165 GLOBAL_SCENT_RE also at room/page.tsx:769; signals.ts:30-36 |
| operator identity | actions.ts:419 via normPerson (You/Me → "Antaeus Coe") | MINE_RE at every site in A6; the five private literals in A6 |
| markers in AccountDisposition | actions.ts:1486 hide:note:; today/actions.ts:1029 hideKeyFor; bind.ts:22 move-done:; build.ts:465 morning: | A7 and A8 |

## E. What one read must serve

The seven corpora and five whose-move spellings are not seven opinions about one fact. They are one classifier, corpusFor plus extractDealIntel, fed seven different subsets, plus three independent outbound tests that never agreed on who wrote, whether a meeting counts, or what time it is. The distinctions that were actually chosen and must survive a single read are few: a closer and a machinery note are real for warmth and transparent for obligation (closer.ts:147-149, CLAUDE.md closer rule); a CSM's voice never warms the Sendbook (read.ts:109-113); the ask builder wants no inbound test because it never reads direction (actions.ts:1267-1271); the tape ranks behind the reads for countries and headcounts (extract.ts:272-280); and the Accounts column reads the second record by decree. Everything else in B is accidental: the head-line "out" fallback, the self-addressed send that only touch.ts excludes, the missing effectiveAt in the Sendbook, the actors column Groundwork throws away, the CT and SN dialects no legacy parser accepts, the two hide keys, the UTC morning key, and the csms-only roster at the touch clock beside the union at the corpus.

The widest spelling the cites support is: the wide loader's row (folded, actors and lane inferred) minus hide:note: AND hide:acct: rows; direction from the actors column with inferActors accepting every dialect the write block emits, sender MINE_RE, the head-line fallback retired; "in" gated by isMachinery, isCloser, isAddressedToUs with the csms ∪ homeSideFrom roster, and carrying two flags rather than dropping the note, `machinery` and `closer`, so the Sendbook can keep its warmth read from the same doc; time from effectiveAt everywhere; meeting from isMeetingNote everywhere with the pipeline's three source regexes retired; one Chicago day key. The Sendbook's CSM exclusion becomes a flag on the doc, `senderIsHome`, not a separate reader. What dies if the read picks one spelling and offers no flag: the Sendbook's ↩ REPLIED on an acceptance or a sign-off, and the ask builder's deliberate blindness to direction, which is harmless to keep since it never reads the field.

Ranked by how many consumers each retires:

1. `docs: CorpusDoc[]` with direction, sender, senderIsHome, machinery, closer, tape, at (effectiveAt), noteId, source, lane, actors, recipients, hidden. Retires the seven corpusFor call sites, the pipeline's own actors normalization, Groundwork's projection, and every narrow-read corpus (ask/live, roomGapsRefill, run.ts context pack).
2. `lastOutbound: {at, noteId, to}` from one rule: actors sender MINE_RE or a Touch.message doc, not self-addressed, not a meeting, not future, at effectiveAt. Retires extract:375-376, touch.ts:39-76, recordSends, day.ts:382-385 and the carry rule.
3. `lastInbound: {at, who, promise, noteId}` under the closer and machinery gates with the union roster. Retires extract:367-374, inboundDates, owed.ts isInbound, the pipeline senderOf.
4. `whoseMove: "you" | "them" | "booked" | "none"` with a `since` and `who`, computed from 2, 3, the last meeting, the last acceptance and the touch log. Retires engine.ts:199-272's input assembly, brief.ts:108-112, build.ts:517-536, day.ts:390-392, and the Sendbook's repliedAt loop.
5. `warmth: {lastWarmAt, lastReplyAt}` keeping closers and acceptances real and CSM voices out. Retires warmDates and the lane decision at read.ts:203-208.
6. `lastMeeting: {at, who, noteId}` from isMeetingNote and meetingRead over the same docs. Retires the pipeline events regex, :404, :585, groundwork/file.ts:107, ask/live.ts:173, and liveMotionIds' second loop.
7. `lastTouch: {at, who, awaitingReply, source}` merging 2 with the outreach: touch log and the synthesized taps by latest. Retires lastTouchRead's two callers, day.ts:378-385, and gives Accounts a first-record answer beside the second record's.
8. `hidden: Set<noteId>` from both hide grammars, applied inside the read. Retires eleven per-page filters and the eleven readers that forgot.
9. `homeSide: readonly string[]` built once, csms ∪ homeSideFrom, handed to every test including the touch clock. Retires room/page.tsx:267,315,345,393 and ask/live.ts:168 passing csms alone, and build.ts:329-342.
10. `today: {key, isToday(iso)}` in Chicago. Retires dayStamp for done keys, the five private chicagoDay copies, and the UTC day slices in meeting.ts and pipeline.
11. `intel: DealIntel` computed once from 1. Retires the per-surface extractDealIntel calls and the 40-note ask corpus.
12. `stage: {step, outcome, allGatesDone, late, live}` from the board. Retires the four card→account resolvers and the three exclusion spellings in A10.
13. `relationship` over the hidden-filtered, folded docs. Retires seven relationshipFor call sites and the ask brain's narrow one.
14. `theirPromise: {who, text, at}` merging THEIR_PROMISE_RE, owedByThem and theirTurnFrom. Retires three readers and answeredSince.
15. `lastAccepted: {at, who}`. Retires room/page.tsx:382-397 and the sendbook's accidental acceptance-as-reply.
16. `conversationExists: boolean` as "any doc with a direction or any touch". Retires hasConversation and Accounts' engaged read.
17. `secondRecord` folded by canonical id with the four namespaces merged by latest. Retires read.ts:54's raw-tail map for six pages and the paired narrow reads at evidence/route.ts and act-actions.ts:131.
18. `countries, products, headcounts` with the tape flag carried on each SourcedFact so evidence.ts and the pipeline can rank or exclude the tape without re-scanning. Retires the countries-known re-scan and countriesInPlay's source filter.
19. `people` from one splitActors over the docs. Retires peopleFor's five call sites and room/actions.ts:1146.
20. `lastRecordAt` at effectiveAt. Retires room/page.tsx:399, build.ts:556, and Accounts' raw newest-note clock.
