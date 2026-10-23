// Groundwork — the prospecting room, outbound only. Locked design: the
// winged stage (CLAUDE.md, decided 2026-08-10). One account center stage with
// an action line and a reason line; the day's worked stamps in the left wing;
// the waiting queue heat-mapped in the right wing with each trigger whispered
// beneath its name; the instrument capsule up top; the lower deck below (the
// wire · the institutions · State of play). Everything is derived per request
// from stores the rest of the app writes — this room authors nothing.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { hasDatabaseEnv } from "@/lib/db";
import { getPeo, peos } from "@/lib/book";
import { contactsFor } from "@/lib/book/contacts";
import { relationshipFor } from "@/lib/intel/relationship";
import { latestResearchAt } from "@/lib/intel/deep-research";
import { clockShort, userDayKey } from "@/lib/tz";
import { sfAccountUrl, sfNewContactUrl } from "@/lib/salesforce";
import { personKey } from "@/lib/book/contacts";
import { composeFor } from "@/lib/groundwork/compose";
import {
  KIND_GROUP,
  buildSpine,
  spineWorked,
  newestPerRule,
  splitPayload,
  type SpineDraft,
} from "@/lib/groundwork/spine";
import { SPINE_GONE, SPINE_MUTE, SPINE_WORKED } from "@/lib/groundwork/spine-store";
import { SpineColumn, type SpineCard } from "./spine";
import { ledgerExclusions, moveKey, sweepAtFor } from "@/lib/groundwork/day";
import { channelOpens, wingStamp } from "@/lib/groundwork/stamp";
import {
  collisionFor,
  dropAgeDays,
  engagedNeverIntroduced,
  fetchStageRows,
  intentWarm,
  outreachGem,
  DROP_STALE_DAYS,
} from "@/lib/activity/read";
import EvidenceChips from "./evidence-chips";
import {
  chipGems,
  collisionCite,
  csmPrepRows,
  spikeCites,
  supportCites,
} from "@/lib/groundwork/chips";
import { liveMoves, todaysSends, todaysStamps } from "@/lib/groundwork/worked";
import { READOUT_READ_KEY, buildFile } from "@/lib/groundwork/file";
import { proximityMark } from "@/lib/groundwork/proximity";
import {
  intentReadDue,
  observedIso,
  peopleSignalsFor,
  ridingLaneDate,
  type PersonSignal,
} from "@/lib/groundwork/signals";
import { institutionCard } from "@/lib/groundwork/institutions";
import { orderWire, sweepDue, wireAvailable, type WireItem } from "@/lib/groundwork/wire";
import {
  buildReadout,
  lint,
  readoutText,
  secondRecordStats,
} from "@/lib/groundwork/readout";
import { whoChipNames } from "@/lib/sendbook/read";
import { SEAT_NS, parseSeatBody } from "@/lib/act/lane";
import { markWorked, runResearchNow } from "./actions";
import { CopyStamp } from "./copy-stamp";
import {
  CsmPrep,
  GroundworkFace,
  MultiBadge,
  WorkedControl,
  type DoneStamp,
} from "./face";
import styles from "./groundwork.module.css";

import { loadGroundworkDay } from "@/lib/groundwork/load";
import { recipientFor } from "@/lib/groundwork/draft-run";
import { currentBand } from "@/lib/groundwork/bands";
import {
  STAGE_DRAFT_NS,
  WAITING_ON_COPY,
  collisionInstruction,
  draftForMove,
  draftedLine,
  isEmailRule,
  stageAction,
  waitsToday,
  whyLines,
} from "@/lib/groundwork/stage-draft";
import { StageLetter, type RunPip } from "./letter";

export const dynamic = "force-dynamic";

// A date in prose — month name spelled out, per the §3 bar. Day-only ISO reads
// in UTC noon; full timestamps read in Chicago.
const monthDay = (iso: string): string => {
  const dayOnly = iso.length === 10;
  const t = Date.parse(dayOnly ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: dayOnly ? "UTC" : "America/Chicago",
  });
};

export default async function GroundworkPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; file?: string; wire?: string; run?: string }>;
}) {
  const access = await getAppAccess();
  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Groundwork" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }
  const canWrite = access.canWrite && hasDatabaseEnv();
  const now = new Date();

  const {
    notesMap,
    touches,
    doneTimes,
    dispositions,
    snoozes,
    accountNotes,
    institutions,
    intelById,
    intentById,
    readById,
    researchByAccount,
    secondById,
    secondFolded,
    sendTapsById,
    sendWeek,
    sendbook,
    touchesByAccount,
    wireItems,
    rankedAll,
  } = await loadGroundworkDay(now);

  const dayKey = userDayKey(now);

  // Worked moves leave the queue for the left wing; the rest stay live. The
  // wing reads the stamps themselves, so a stamp survives even if its rule
  // stops firing later in the day.
  // The stamp's subtext reads the Sendbook: the newest touch filed today for
  // that account says what was done — channel, step, who.
  // The same read answers the pre-answer rule below (todaysSends).
  const { newest: sendToday, recordSent: recordSendToday } = todaysSends(
    sendbook.lines,
    dayKey,
  );
  // When no channel line exists (a copy-stamp, a pre-register stamp), the
  // subtext carries the move's own specifics — the headline, the thread
  // subject, the quiet date, the CSM's name — never a bare label
  // (founder-decreed 2026-08-19: the subtext answers what it means). The
  // words per rule live in src/lib/groundwork/stamp.ts; this builds the facts.
  const threadSubjectOf = (id: string): string => {
    const l = sendbook.lines.find(
      (x) => x.accountId === id && x.from === "record" && x.clause,
    );
    return l ? l.clause : "";
  };
  const lastSendDateOf = (id: string): string => {
    const l = sendbook.lines.find((x) => x.accountId === id);
    return l ? monthDay(l.at) : "";
  };
  const wireHeadFor = (id: string): string => {
    let best: WireItem | null = null;
    for (const w of wireItems)
      if (w.accountIds.includes(id) && (!best || w.at > best.at)) best = w;
    return best?.headline ?? "";
  };
  const seatDayOf = (id: string): string => {
    const n = notesMap.get(`${SEAT_NS}${id}`)?.[0];
    return n ? (parseSeatBody(n.body)?.day ?? "") : "";
  };
  // The gem a stamp names: the one the record answered today, once the
  // operator's send has reached it, else the one still leading. The folded
  // second record, so a drop keyed by a shell id stamps under its account.
  const stampGem = (id: string) => {
    const sr = secondFolded.get(id);
    return (
      (sr?.gems ?? []).find(
        (g) => g.actedDay === dayKey && g.whoKind !== "colleague" && !!g.act,
      ) ?? outreachGem(sr)
    );
  };
  const ruleFacts = (id: string) => {
    const r = researchByAccount.get(id);
    // The age the move spoke: the newer of the account's own pass and the
    // sweep, as the queue reads it (G7). No own pass means the book-wide one.
    const researchAt = r ? (latestResearchAt(r.at, sweepAtFor(id)) ?? r.at) : "";
    const lane = ridingLaneDate(accountNotes.get(id), now);
    const gem = stampGem(id);
    return {
      wireHeadline: wireHeadFor(id),
      intentActivities: intentById.get(id)?.activities ?? null,
      ridingLaneCloses: lane ? monthDay(lane) : "",
      threadSubject: threadSubjectOf(id),
      lastSendDate: lastSendDateOf(id),
      csm: getPeo(id)?.csm ?? "",
      researchAgeDays: researchAt
        ? Math.floor((now.getTime() - Date.parse(researchAt)) / 86_400_000)
        : null,
      seatDay: seatDayOf(id),
      gemTerm: gem?.term ?? "",
      gemWho: gem?.who[0] ?? "",
      supportCases: engagedNeverIntroduced(secondFolded.get(id), now)?.cases ?? null,
    };
  };

  // The grab note the intent reading came from, as the stamp opens it.
  const grabLines = (id: string): string[] => {
    const at = intentById.get(id)?.at ?? "";
    // The reading's moment is its capture moment (observedIso), which is
    // the filing moment only when the head carries none.
    const note = (accountNotes.get(id) ?? []).find((n) => observedIso(n) === at);
    return (note?.body ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 4)
      .map((l) => l.slice(0, 160));
  };
  // The person a people rule named (post-trigger, new-in-seat), read the way
  // the queue read them, so the stamp names who the move named.
  const personFor = (id: string, ruleKey: string) => {
    const kind =
      ruleKey === "post-trigger"
        ? "posted"
        : ruleKey === "new-in-seat"
          ? "new-in-seat"
          : ruleKey === "contact-left"
            ? "left"
            : "";
    return kind
      ? (peopleSignalsFor(accountNotes.get(id), now, getPeo(id)?.name ?? "").find(
          (s) => s.kind === kind,
        ) ?? null)
      : null;
  };
  const doneToday: DoneStamp[] = [];
  // Send's markers today: a move Send stamped waits on its sent copy, and
  // its line says so until the record holds today's send (the draft on the
  // stage, ship order 2026-10-19).
  const sendWaits = waitsToday(notesMap, dayKey);
  // The day's stamps, oldest first (todaysStamps): yesterday's never reach
  // today's wing.
  for (const st of todaysStamps(doneTimes, dayKey)) {
    const name = getPeo(st.accountId)?.name;
    if (!name) continue;
    const touch = sendToday.get(st.accountId);
    const person = personFor(st.accountId, st.ruleKey);
    const facts = { ...ruleFacts(st.accountId), personName: person?.name ?? "" };
    doneToday.push({
      name,
      at: clockShort(st.at),
      // The channel line leads when a touch is filed, else the rule's
      // words (D27, ship order 2026-10-06): one choice, pinned (wingStamp).
      sub:
        sendWaits.get(st.accountId)?.has(st.mk) && !recordSendToday.has(st.accountId)
          ? WAITING_ON_COPY
          : wingStamp(touch, st.ruleKey, facts),
      mk: st.mk,
      accountId: st.accountId,
      // Every compression opens (the click-depth law): when the rule's words
      // speak, "{N} SUPPORT CASES" opens to its rows and "{N} SALES NAV
      // READS" to the grab line it was read from.
      // The channel line shortens a name, so it opens too: the name whole and
      // the touch's own words (pass 11).
      opens: touch
        ? { lines: channelOpens(touch) ?? [] }
        : st.ruleKey === "engaged-never-introduced" && facts.supportCases
          ? {
              cites: supportCites(await fetchStageRows(st.accountId).catch(() => [])),
              empty:
                "The staged slice holds no case rows. The drop's cap kept newer traffic.",
            }
          : st.ruleKey === "intent-warm" && facts.intentActivities
            ? { lines: grabLines(st.accountId) }
            : person
              ? {
                  // The name the stamp carries opens to Sales Navigator's
                  // own reading of them (the click-depth law).
                  lines: [
                    [person.name, person.title].filter(Boolean).join(", "),
                    person.company,
                    person.snippet ? `“${person.snippet}”` : "",
                  ].filter(Boolean),
                }
              : null,
    });
  }

  // The pre-answer rule (decreed 2026-08-19): an outbound the record already
  // holds today answers the Channel Ask before it opens — the chip row never
  // shows for an account whose send is on file (recordSendToday, above).

  // The sent copy closes the loop (the draft on the stage): an email move
  // whose account the record shows sent to today is worked, whether it went
  // from the stage or straight from Outlook. The stamp is the record's, so
  // it carries no take-back: a filed email is a fact, not a stamp.
  // An account already on the wing by a stamp keeps that one line: the
  // record's send closes its move without painting a second.
  const stamped = new Set(doneToday.map((d) => d.accountId));
  const live = liveMoves(rankedAll, doneTimes, dayKey).filter((q) => {
    if (!isEmailRule(q.ruleId) || !recordSendToday.has(q.accountId)) return true;
    const touch = sendToday.get(q.accountId);
    const name = getPeo(q.accountId)?.name;
    if (name && touch && !stamped.has(q.accountId))
      doneToday.push({
        name,
        at: clockShort(touch.at),
        sub: wingStamp(touch, q.ruleId, { ...ruleFacts(q.accountId), personName: "" }),
        mk: "",
        accountId: q.accountId,
        opens: { lines: channelOpens(touch) ?? [] },
      });
    return false;
  });
  const QUEUE_SHOW = 6;
  const liveTop = live.slice(0, QUEUE_SHOW);
  // The rest past the wing's six, opened by "And N more" (the click-depth law).
  const rest = live.slice(QUEUE_SHOW);

  const { focus, file: fileParam, wire: wireParam, run: runParam } = await searchParams;
  const wireAll = wireParam === "all";
  const stageItem =
    (focus && liveTop.find((q) => q.accountId === focus)) || liveTop[0] || null;
  const stageAccount = stageItem ? getPeo(stageItem.accountId) : undefined;
  const waiting = liveTop.filter((q) => q !== stageItem);
  const nextItem = stageItem
    ? liveTop[(liveTop.indexOf(stageItem) + 1) % liveTop.length]
    : null;
  const fileOpen = fileParam === "1";

  // The rows the stage's doors open to (the meat law; pass 8 G5): the support
  // spike's day, the colleague's thread behind the collision flag, and the
  // roundup brief's prep. The staged slice is read for this one account,
  // only when a door needs it; the doors carry row keys, and every excerpt
  // comes down from the evidence route on click.
  const stageSr = stageItem ? secondById.get(stageItem.accountId) : undefined;
  // The quiet flag reads both records (S-18; the direct doctrine): the
  // export's colleague row and a colleague's live thread in the operator's
  // own record, by latest, through the read's docs and declared roster.
  const stageCollision = stageItem
    ? collisionFor(stageSr, now, readById.get(stageItem.accountId))
    : null;
  const stageRows =
    stageItem &&
    stageSr &&
    ((stageItem.ruleId === "roundup-slot" && !!stageAccount?.csm) ||
      (!!stageCollision?.colleague && !stageCollision.colleague.noteId) ||
      !!stageSr.support?.spike)
      ? await fetchStageRows(stageItem.accountId).catch(() => [])
      : [];

  const file =
    stageItem && stageAccount
      ? buildFile(stageAccount, {
          queueItem: stageItem,
          intel: intelById.get(stageItem.accountId),
          intent: intentById.get(stageItem.accountId) ?? null,
          notes: accountNotes.get(stageItem.accountId) ?? [],
          touches: (touchesByAccount.get(stageItem.accountId) ?? []).map((t) => ({
            subjectKey: t.subjectKey,
            label: t.label,
            contactedAt: t.contactedAt,
          })),
          wire: wireItems,
          contacts: contactsFor(stageItem.accountId).map((c) => ({
            name: [c.first, c.last].filter(Boolean).join(" "),
            title: c.title,
          })),
          laneDate: ridingLaneDate(accountNotes.get(stageItem.accountId), now),
          research: researchByAccount.get(stageItem.accountId) ?? null,
          // The read's relationship — the record's most-seen person over the
          // book's seed; an account with no record reads the seed.
          relationship:
            readById.get(stageItem.accountId)?.relationship ??
            relationshipFor([], contactsFor(stageItem.accountId), {
              name: stageAccount.contactName,
              email: stageAccount.contactEmail,
            }),
          // The record's filed people, for the MULTI count (the widest
          // source, as the HomeRoom row counts it).
          filedPeople: readById.get(stageItem.accountId)?.people ?? [],
          lastOutbound: readById.get(stageItem.accountId)?.lastOutbound?.at ?? "",
          second: (() => {
            const sr = stageSr;
            // With no export, the composed thing still carries the record's
            // quiet flag (S-18).
            if (!sr) return stageCollision ? { collision: stageCollision } : null;
            const gem = outreachGem(sr);
            // The roundup brief's prep (5.3): the CSM's own last five rows on
            // this account, each a door to its excerpt, from the staged slice
            // read above only when the slot is on stage.
            const csmPrep =
              stageItem.ruleId === "roundup-slot"
                ? csmPrepRows(stageRows, stageAccount.csm, dayKey)
                : [];
            return {
              supportCases: engagedNeverIntroduced(sr, now)?.cases ?? sr.support?.total,
              gem: gem
                ? { act: gem.act, reason: gem.reason, term: gem.term, who: gem.who }
                : null,
              collision: stageCollision,
              csmPrep,
            };
          })(),
          now,
        })
      : null;

  const idToName = (id: string) => getPeo(id)?.name ?? id;

  // The readout — one builder for the drawer AND every file's pull tab. It
  // reads the UNCAPPED ranked list, so a file's paragraph always has its
  // right-hand side in the full readout. "Open conversation" means a live
  // thread — an archived one is closed, not open.
  const outreachAccountIds = new Set<string>();
  for (const t of touches) {
    const m = /^outreach:(.+)$/.exec(t.subjectKey);
    if (m && t.status !== "archived") outreachAccountIds.add(m[1]);
  }
  // The record's threads count too (Ted doctrine): a filed conversation is
  // as open as a logged one — the number spoken to Russ must not undercount.
  // Our side of it is the read's own last send (field 2), so a self-assigned
  // task opens no conversation (G3).
  for (const id of intelById.keys()) {
    const r = readById.get(id);
    if (r?.lastInbound || r?.lastOutbound) outreachAccountIds.add(id);
  }
  // And the Sendbook's tapped touches — a LinkedIn message is an open door.
  for (const id of sendTapsById.keys()) outreachAccountIds.add(id);
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const partnerTouches = touches.filter(
    (t) =>
      t.subjectKey.startsWith("partner-outreach:") &&
      Date.parse(t.contactedAt) >= weekAgo,
  );
  // The dated week ahead — follow-ups on live threads plus decisions the
  // record carries, inside 7 days, phrased plainly.
  const withinWeek = (iso: string | null | undefined): boolean => {
    if (!iso) return false;
    const t = Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
    if (Number.isNaN(t)) return false;
    const days = (t - now.getTime()) / 86_400_000;
    return days >= -0.5 && days <= 7;
  };
  const nextSevenDays: string[] = [];
  for (const t of touches) {
    const m = /^outreach:(.+)$/.exec(t.subjectKey);
    if (!m || t.status === "archived" || !withinWeek(t.followUpAt)) continue;
    nextSevenDays.push(`${idToName(m[1])} — dated follow-up ${monthDay(t.followUpAt)}`);
  }
  for (const [id, intel] of intelById) {
    const d = intel.timing?.value.dateIso;
    if (d && withinWeek(d))
      nextSevenDays.push(`${idToName(id)} — their decision is dated ${monthDay(d)}`);
  }
  // The second record's arithmetic for the readout — counts, never model
  // text; cold is cold on both records (secondRecordStats).
  const srStats = secondRecordStats(
    peos.map((p) => p.id),
    secondById,
    readById,
    now,
  );

  const readout = buildReadout({
    secondRecord: srStats,
    accounts: peos,
    queue: rankedAll,
    intelById,
    readById,
    intentById,
    outreachAccountIds,
    partnerUpdatesSent: partnerTouches.length,
    partnerUpdatesReplied: partnerTouches.filter(
      (t) => t.status === "replied" || t.status === "responded",
    ).length,
    partnerUpdatesWho: partnerTouches.map((t) => ({
      name: t.label || t.subjectKey.replace(/^partner-outreach:/, ""),
      replied: t.status === "replied" || t.status === "responded",
    })),
    nextSevenDays: nextSevenDays.slice(0, 6),
    now,
  });
  const readoutPayload = readoutText(readout);
  const lintIssues = lint(readoutPayload);
  const readoutReadAt = doneTimes.get(READOUT_READ_KEY);

  const nudge = intentReadDue(accountNotes, now);
  const wireOrdered = orderWire(wireItems);
  const wireIsDue = sweepDue(wireItems, now);
  const inst = institutionCard(institutions, now);
  // A wire timestamp: today's items carry the clock, older ones their date.
  const wireWhen = (at: string): string => {
    const t = Date.parse(at);
    if (Number.isNaN(t)) return "";
    const d = new Date(t);
    return userDayKey(d) === dayKey
      ? clockShort(at)
      : d.toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          timeZone: "America/Chicago",
        });
  };
  const stageHref = (q: { accountId: string }, open?: boolean) =>
    `/groundwork?focus=${encodeURIComponent(q.accountId)}${open ? "&file=1" : ""}${
      runParam === "1" || runParam === "0" ? `&run=${runParam}` : ""
    }`;

  // ── The Sales Nav spine (Concept C, ship order 2026-10-15) ──────────────
  // Every Sales Navigator alert on a book account in the last three months, read from
  // the notes the grabs and the alert emails filed. The ledger's exclusions
  // hold here too (not mine, parked, snoozed); live motion does not hide an
  // alert, because an alert is a fact about the account, not a move.
  const spineOff = ledgerExclusions(dispositions, snoozes.keys());
  const spineGone = new Set((notesMap.get(SPINE_GONE) ?? []).map((n) => n.body.trim()));
  const spineMuted = new Set((notesMap.get(SPINE_MUTE) ?? []).map((n) => n.body.trim()));
  const spineAll = buildSpine(
    peos.filter((p) => !spineOff.has(p.id)).map((p) => ({ id: p.id, name: p.name })),
    accountNotes,
    now,
  );
  const stampKeys = [...doneTimes.keys()];
  const spineMarked = new Set(
    (notesMap.get(SPINE_WORKED) ?? []).map((n) => n.body.trim()),
  );
  // Marks set today: an older alert's ↺ returns the move its own Worked it
  // stamped today (spineWorked).
  const spineMarkedToday = new Set(
    (notesMap.get(SPINE_WORKED) ?? [])
      .filter((n) => userDayKey(n.createdAt) === dayKey)
      .map((n) => n.body.trim()),
  );
  const spineNewest = newestPerRule(spineAll);
  const spineCards: SpineCard[] = [];
  const spineHidden: { key: string; label: string }[] = [];
  for (const it of spineAll) {
    if (spineMuted.has(KIND_GROUP[it.kind])) continue;
    if (spineGone.has(it.key)) {
      spineHidden.push({ key: it.key, label: `${it.who || it.account} · ${it.label}` });
      continue;
    }
    const p = getPeo(it.accountId);
    if (!p) continue;
    const read = readById.get(it.accountId);
    // The read's relationship, the seed only when the account has no read
    // (the same reading the stage's file takes).
    const rel =
      read?.relationship ??
      relationshipFor([], contactsFor(it.accountId), {
        name: p.contactName,
        email: p.contactEmail,
      });
    // A person the record or the book already knows, by name: their email
    // for an Outlook draft, and whether Salesforce has them.
    const known = it.who
      ? [
          ...(read?.people ?? []).map((x) => ({ name: x.name, email: x.email })),
          ...contactsFor(it.accountId).map((c) => ({
            name: [c.first, c.last].filter(Boolean).join(" "),
            email: c.email ?? "",
          })),
        ].filter((x) => personKey(x.name) && personKey(x.name) === personKey(it.who))
      : [];
    const personEmail = known.find((x) => x.email)?.email ?? "";
    let draft: SpineDraft | null = null;
    if (it.rule) {
      const person: PersonSignal | null = it.who
        ? {
            kind:
              it.kind === "posted"
                ? "posted"
                : it.kind === "left"
                  ? "left"
                  : "new-in-seat",
            name: it.who,
            title: it.title,
            company: it.company,
            snippet: it.quote,
            at: it.at,
          }
        : null;
      const composed = composeFor({
        ruleId: it.rule,
        account: p,
        intel: intelById.get(it.accountId),
        intent: intentById.get(it.accountId) ?? null,
        contactName: rel.name,
        person,
      });
      const parts = splitPayload(composed.payload);
      const relEmail =
        rel.source === "record" ? rel.email : rel.email || (p.contactEmail ?? "");
      const email =
        it.kind === "intent" ? relEmail : it.kind === "left" ? "" : personEmail;
      draft = {
        // With no name for the relationship the note is addressed by the
        // account, never by the composer's placeholder.
        to: it.kind === "intent" ? rel.name : it.who,
        email,
        subject: parts.subject,
        body: parts.body,
        via:
          it.kind === "left"
            ? "LinkedIn message · their old address is gone"
            : email
              ? "Email · on file"
              : "LinkedIn message",
      };
    }
    const newest = spineNewest.has(it.key);
    const stamped = spineWorked(it, stampKeys, now, {
      newest,
      marked: spineMarked.has(it.key),
      markedToday: spineMarkedToday.has(it.key),
    });
    const [first, ...restName] = it.who.split(/\s+/);
    spineCards.push({
      ...it,
      draft,
      sf: sfAccountUrl(it.accountId),
      // A person Salesforce may not have: New Contact, pre-filled. Never for
      // someone who left, and never for a name the book already holds.
      sfNew:
        it.who && it.kind !== "left" && known.length === 0
          ? sfNewContactUrl(it.accountId, {
              firstName: first ?? "",
              lastName: restName.join(" "),
              title: it.title,
            })
          : null,
      worked: stamped.worked,
      workedToday: stamped.today,
      newest,
      stampedToday: stamped.stampedToday,
    });
  }

  // ── The draft on the stage (ship order 2026-10-19) ────────────────────
  // An email move's stage is its letter: the draft written before the send
  // band (or the rule's composed note until one lands), Send in Outlook as
  // the one orange move, the chips folded under "Why this note" with their
  // doors. During the send band the stage runs the drafts as a stack.
  const chips =
    stageItem && stageAccount
      ? (() => {
          const sr = stageSr;
          const col = stageCollision;
          // A colleague's thread in the operator's own record raises
          // the flag with no export behind it (S-18), so the chip row
          // can stand on the collision alone.
          if (!sr && !col) return null;
          const warm = sr ? intentWarm(sr, now) : null;
          return (
            <EvidenceChips
              accountId={stageItem.accountId}
              support={
                sr?.support && sr.support.total > 0
                  ? {
                      total: sr.support.total,
                      spikeDay: sr.support.spike?.day ?? "",
                      spikeN: sr.support.spike?.n ?? 0,
                      spikeCites: spikeCites(stageRows, sr.support.spike?.day ?? ""),
                    }
                  : null
              }
              intent={
                sr?.intent
                  ? {
                      opens30: sr.intent.windows.w30.o,
                      clicks30: sr.intent.windows.w30.c,
                      lastOpen: sr.intent.windows.lastOpen,
                      sends7: sr.intent.windows.w7?.s ?? 0,
                    }
                  : warm
                    ? {
                        opens30: warm.opens30,
                        clicks30: warm.clicks30,
                        lastOpen: warm.lastOpen,
                        sends7: 0,
                      }
                    : null
              }
              collision={
                col
                  ? {
                      mktgSends7: col.mktgSends7,
                      // The record's entry opens to its own words; the
                      // export's row opens from the staged slice.
                      colleague: col.colleague
                        ? {
                            ...col.colleague,
                            cite: col.colleague.noteId
                              ? null
                              : collisionCite(stageRows, col.colleague),
                          }
                        : null,
                    }
                  : null
              }
              // A colleague's gem produces nothing for the operator
              // anywhere (C6 as amended; pass 8 G1).
              gems={sr ? chipGems(sr.gems) : []}
            />
          );
        })()
      : null;
  const stageMk = stageItem ? moveKey(stageItem) : "";
  const isLetter = !!stageItem && !!stageAccount && isEmailRule(stageItem.ruleId);
  const stageTo =
    isLetter && stageAccount ? recipientFor({ readById }, stageAccount) : null;
  const stageDraft = isLetter
    ? draftForMove(
        notesMap.get(`${STAGE_DRAFT_NS}${stageItem!.accountId}`)?.map((n) => ({
          body: n.body,
          createdAt: n.createdAt,
        })),
        stageMk,
        now,
      )
    : null;
  const runOn = runParam === "1" || (currentBand(now) === "now" && runParam !== "0");
  const draftedIds = new Set(
    liveTop
      .filter(
        (q) =>
          isEmailRule(q.ruleId) &&
          draftForMove(
            notesMap.get(`${STAGE_DRAFT_NS}${q.accountId}`)?.map((n) => ({
              body: n.body,
              createdAt: n.createdAt,
            })),
            moveKey(q),
            now,
          ),
      )
      .map((q) => q.accountId),
  );
  const letter =
    isLetter && stageItem && stageAccount && stageTo && file
      ? (() => {
          const template = splitPayload(file.composed.payload);
          const subject = stageDraft?.subject || template.subject;
          const body = stageDraft?.body || template.body;
          const sr = stageSr;
          const warm = sr ? intentWarm(sr, now) : null;
          const gem = sr ? outreachGem(sr) : null;
          const lines = whyLines(
            {
              gem: gem ? { term: gem.term, reason: gem.reason } : null,
              support:
                sr?.support && sr.support.total > 0
                  ? {
                      total: sr.support.total,
                      spikeDay: sr.support.spike?.day ?? "",
                      spikeN: sr.support.spike?.n ?? 0,
                    }
                  : null,
              intent: sr?.intent
                ? { opens30: sr.intent.windows.w30.o, clicks30: sr.intent.windows.w30.c }
                : warm
                  ? { opens30: warm.opens30, clicks30: warm.clicks30 }
                  : null,
              collision: stageCollision,
            },
            stageDraft?.uses ?? [],
          );
          const pips: RunPip[] = [
            ...doneToday.map(
              (d) => (d.sub === WAITING_ON_COPY ? "sent" : "seen") as RunPip,
            ),
            ...liveTop.map((q) => (q === stageItem ? "now" : "left") as RunPip),
          ];
          return (
            <StageLetter
              key={`${stageMk}:${stageDraft?.at ?? "template"}`}
              accountId={stageItem.accountId}
              mk={stageMk}
              to={{
                name: stageDraft?.to || stageTo.name,
                title: stageTo.title,
                email: stageDraft?.email || stageTo.email,
              }}
              subject={subject}
              body={body}
              drafted={draftedLine(
                stageDraft,
                stageDraft ? clockShort(stageDraft.at) : "",
              )}
              instruction={collisionInstruction(stageCollision)}
              canWrite={canWrite}
              nextHref={nextItem && nextItem !== stageItem ? stageHref(nextItem) : null}
              run={{
                on: runOn,
                pips,
                sent: doneToday.length,
                toggleHref: `/groundwork?focus=${encodeURIComponent(stageItem.accountId)}&run=${runOn ? "0" : "1"}`,
              }}
              why={
                lines.length > 0 || chips ? (
                  <details className={styles.whyFold}>
                    <summary>Why this note ▾</summary>
                    {lines.length > 0 && (
                      <div className={styles.whyList}>
                        {lines.map((l, i) => (
                          <div key={i} className={styles.whyLine}>
                            <span className={styles.whyLabel}>{l.label}</span>
                            <span className={styles.whyMeaning}>
                              {l.meaning}
                              {l.used !== null && (
                                <span
                                  className={`${styles.whyUse} ${l.used ? "" : styles.whyUseOut}`}
                                >
                                  {l.used ? "In the note" : "Left out"}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {chips && <div className={styles.whyDoors}>{chips}</div>}
                  </details>
                ) : null
              }
              other={
                canWrite ? (
                  <WorkedControl
                    preAnswered={recordSendToday.has(stageItem.accountId)}
                    mk={stageMk}
                    accountId={stageItem.accountId}
                    contacts={whoChipNames(
                      readById.get(stageItem.accountId)?.people ?? [],
                      contactsFor(stageItem.accountId),
                    )}
                    clause={stageItem.action}
                    accent={false}
                  />
                ) : null
              }
            />
          );
        })()
      : null;

  return (
    <>
      <AppWayfinder current="Groundwork" trail="Homeroom" />
      <GroundworkFace
        spine={
          <SpineColumn
            cards={spineCards}
            hidden={spineHidden}
            muted={[...spineMuted]}
            canWrite={canWrite}
            nowMonth={userDayKey(now).slice(0, 7)}
          />
        }
        nudge={!!nudge}
        done={doneToday}
        canWrite={canWrite}
        stage={
          stageItem && stageAccount
            ? {
                item: stageTo
                  ? {
                      ...stageItem,
                      action: stageAction(stageItem, stageDraft?.to || stageTo.name),
                    }
                  : stageItem,
                prox: proximityMark(stageAccount) ?? "",
                body: (
                  <>
                    {letter ?? chips}
                    {!letter && (
                      <div className={styles.stgActs}>
                        {canWrite && stageItem.ruleId === "stale-above-gate" && (
                          <form
                            action={runResearchNow.bind(
                              null,
                              moveKey(stageItem),
                              stageItem.accountId,
                            )}
                          >
                            <button
                              className={styles.btnAccent}
                              type="submit"
                              title="Runs the deep pass on this account and stamps the move worked. Takes a minute."
                            >
                              Run it now
                            </button>
                          </form>
                        )}
                        {canWrite && (
                          <WorkedControl
                            preAnswered={recordSendToday.has(stageItem.accountId)}
                            mk={moveKey(stageItem)}
                            accountId={stageItem.accountId}
                            // The record's people merged with the book's contacts;
                            // the row asks only when the merged set holds more
                            // than one name (ruled 2026-09-25, C18).
                            contacts={whoChipNames(
                              readById.get(stageItem.accountId)?.people ?? [],
                              contactsFor(stageItem.accountId),
                            )}
                            clause={stageItem.action}
                            accent={stageItem.ruleId !== "stale-above-gate"}
                          />
                        )}
                        {canWrite && stageItem.ruleId !== "stale-above-gate" && (
                          <form
                            action={runResearchNow.bind(null, null, stageItem.accountId)}
                          >
                            <button
                              className={styles.btn2nd}
                              type="submit"
                              title="Runs the deep pass on this account. The move stays open. Takes a minute."
                            >
                              Run fresh research
                            </button>
                          </form>
                        )}
                        <Link
                          className={styles.btn2nd}
                          href={stageHref(stageItem, !fileOpen)}
                        >
                          {fileOpen ? "Close the file" : "Open the file ▾"}
                        </Link>
                        {nextItem && nextItem !== stageItem && (
                          <Link className={styles.btnQuiet} href={stageHref(nextItem)}>
                            Not now
                          </Link>
                        )}
                      </div>
                    )}
                    {letter && (
                      <div className={styles.stgActs}>
                        {canWrite && (
                          <form
                            action={runResearchNow.bind(null, null, stageItem.accountId)}
                          >
                            <button
                              className={styles.btnQuiet}
                              type="submit"
                              title="Runs the deep pass on this account. The move stays open. Takes a minute."
                            >
                              Run fresh research
                            </button>
                          </form>
                        )}
                        <Link
                          className={styles.btnQuiet}
                          href={stageHref(stageItem, !fileOpen)}
                        >
                          {fileOpen ? "Close the file" : "Open the file ▾"}
                        </Link>
                      </div>
                    )}

                    {fileOpen && file && (
                      <div className={styles.stgFile}>
                        <span className={styles.kick}>
                          The working file
                          {file.csm && file.csm !== "Unassigned"
                            ? ` · ${file.csm} is the partner manager`
                            : ""}
                          {file.sourcesLine ? ` · sources: ${file.sourcesLine}` : ""}
                        </span>
                        {file.story && <p className={styles.fileStory}>{file.story}</p>}
                        <div className={styles.draft}>
                          <span
                            className={styles.kick}
                            style={{ display: "block", marginBottom: 6 }}
                          >
                            The composed thing · to {file.composed.to}
                          </span>
                          {file.collisionLine && (
                            <span
                              className={styles.collideFlag}
                              title="Your note lands beside live motion. Nothing is held back."
                            >
                              ⚠ {file.collisionLine}
                            </span>
                          )}
                          {file.composed.payload}
                          <CsmPrep accountId={file.accountId} rows={file.csmPrep} />
                        </div>
                        <div className={styles.people}>
                          <MultiBadge count={file.threadCount} />
                          {file.people.map((person) => (
                            <span
                              key={person.name}
                              className={`${styles.chip} ${person.flag === "csm" ? styles.chipCsm : ""}`}
                            >
                              {person.name}
                              {person.title ? ` · ${person.title}` : ""}
                            </span>
                          ))}
                        </div>
                        {file.singleThread && (
                          <p className={styles.actNote}>
                            One person carries this conversation. The widening question is
                            inside the composed text.
                          </p>
                        )}
                        <div className={styles.acts}>
                          <CopyStamp
                            payload={file.composed.payload}
                            label={file.composed.label}
                            accent
                            action={
                              canWrite
                                ? markWorked.bind(null, moveKey(stageItem))
                                : undefined
                            }
                          />
                          {file.composed.kind === "send-draft" && file.contactEmail && (
                            <a
                              className={styles.btn2nd}
                              href={`mailto:${encodeURIComponent(file.contactEmail)}?subject=${encodeURIComponent(
                                `${file.name} — from Groundwork`,
                              )}&body=${encodeURIComponent(file.composed.payload)}`}
                            >
                              Draft in your mail app
                            </a>
                          )}
                          {file.composed.kind === "ride-ask" &&
                            sfAccountUrl(file.accountId) && (
                              <a
                                className={styles.btn2nd}
                                href={sfAccountUrl(file.accountId) ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open the account in Salesforce. The owner&rsquo;s name is
                                on it.
                              </a>
                            )}
                          <Link
                            className={`${styles.btn2nd} ${styles.btnSmall}`}
                            href={`/accounts?focus=${encodeURIComponent(file.accountId)}`}
                          >
                            Open in Accounts
                          </Link>
                        </div>
                        <p className={styles.actNote}>
                          Copy puts the exact text on your clipboard and stamps the move.
                        </p>
                        <details className={styles.russ}>
                          <summary>
                            <span className={styles.russKick}>To Russ ▾</span>
                            <span>the paragraph he&rsquo;d hear about this account</span>
                            <span className={styles.russNote}>
                              recomposes as you work
                            </span>
                          </summary>
                          <div className={styles.russBody}>{file.russ}</div>
                        </details>
                        <div className={styles.hist}>
                          <span
                            className={styles.kick}
                            style={{ display: "block", marginBottom: 4 }}
                          >
                            The file&rsquo;s history
                          </span>
                          {file.history.length === 0 ? (
                            <p className={styles.histLine}>
                              Nothing on file yet. The first paste starts the record.
                            </p>
                          ) : (
                            file.history.map((h, i) => (
                              <div key={i} className={styles.histLine}>
                                <span className={styles.histAt}>
                                  {h.atIso.slice(5, 10).replace("-", "/")}
                                </span>
                                <span>{h.line}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ),
              }
            : null
        }
        waiting={waiting}
        drafted={draftedIds}
        rest={rest}
        hrefOf={stageHref}
        deck={{
          canWrite,
          wire: wireOrdered,
          wireCount: wireItems.length,
          wireAll,
          // The wire's count is its door: every item, or back to three; the
          // stage keeps its place.
          wireHref: `/groundwork?${new URLSearchParams({
            ...(focus ? { focus } : {}),
            ...(fileOpen ? { file: "1" } : {}),
            ...(wireAll ? {} : { wire: "all" }),
          }).toString()}`,
          wireAvailable: wireAvailable(),
          wireIsDue,
          inst,
          readout,
          readoutPayload,
          lintIssues,
          readoutReadAt,
          idToName,
          wireWhen,
          monthDay,
        }}
        foot={{
          week: sendWeek,
          staleDropDays: (() => {
            const age = dropAgeDays(secondById, now);
            return age != null && age > DROP_STALE_DAYS ? age : null;
          })(),
        }}
      />
    </>
  );
}
