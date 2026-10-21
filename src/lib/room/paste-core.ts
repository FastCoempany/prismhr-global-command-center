// The paste pipeline's core: the duplicate guard, the misfile guard's rungs,
// the read and the rows, moved here from the room's actions (2026-10-19) so
// a door with no session can file through the same pipeline. The room's
// roomPaste is this behind the session check; the sent-copy route
// (src/app/inbound/sent/route.ts) is this behind its shared secret. Not a
// server action module: nothing here is callable from a browser.

import { after } from "next/server";
import { actedSweep } from "@/lib/activity/run";
import { rulesRead } from "@/lib/intel/rules-read";
import { claudeDownReason } from "@/lib/claude/health";
import { getPrisma } from "@/lib/db";
import { peos } from "@/lib/book";
import { joinedRoster } from "@/lib/ingest/route";
import { guardPlan, type GuardVerdict } from "@/lib/ingest/guard";
import { EXCERPT_CAP, readRungVerdict } from "@/lib/ingest/verdict-reason";
import { HEADS, SOURCE_OF, sniffHead } from "@/lib/ingest/dialect";
import { grabsFrom } from "@/lib/ingest/salesnav-email";
import { fileGrabTexts, stampPasteMark } from "@/lib/ingest/grab-server";
import { type GrabSummary } from "@/lib/ingest/grab";
import {
  claimCapture,
  fileFiling,
  findFiling,
  pasteKeyOf,
  releaseCapture,
  type DupeCheck,
  type FilingHow,
} from "@/lib/ingest/filing";
import { ALREADY_FILING, ALREADY_ON_FILE, monthDay } from "@/lib/ingest/wrote";
import { absorbRead } from "@/lib/ingest/fanout";
import {
  ENTRY_CAP,
  READ_WINDOW,
  READ_WINDOW_TAPE,
  TEXT_FLOOR,
  cut,
  type Window,
} from "@/lib/ingest/windows";
import {
  aiCleanAvailable,
  aiCleanTimeline,
  describeReadError,
  dropNoiseEntries,
  FILING_BUDGET_MS,
  READ_BUDGET_MS,
} from "@/lib/intel/ai-clean";
import type { Door } from "@/lib/ingest/doors";
import type { RouteRung } from "@/lib/route-capture";
import { actorsLine, joinRecipients, laneFor } from "@/lib/intel/provenance";
import { cleanSfPaste, parseSfTimeline, scrubSecrets } from "@/lib/sf-timeline";
import { pasteFingerprint, transcriptRecordedDay } from "@/lib/paste-files";
import { redactMoney } from "@/lib/intel/lexicon";
import { bindAccountId } from "@/lib/room/bind";
import { createAccountNoteRow } from "@/lib/notes/write";
import { keepEmailTexts, type NewEmailText } from "@/lib/notes/email-text";
import { wholeEmails } from "@/lib/intel/email-whole";

export type PasteResult = Awaited<ReturnType<typeof pasteCapture>>;

// ⚡ paste → the read. One call to Claude returns dated entries AND judgment:
// the commitments in the text, the questions the record still can't answer, the
// market facts worth keeping past this deal, the lessons, and whether the paste
// says the deal closed. Entries file as the record; commitments OPEN as work,
// each undoable on its own; knowledge files to the playbook where every other
// account can reach it. Two-tier autonomy: an explicit commitment the operator
// owes is opened without asking, and everything that changes the deal's
// standing is only ever PROPOSED.

// The Sales Navigator grab, split (pass 8 call 12 and D30; seam S-25). The
// grab is a list of about a hundred accounts, never one account's capture:
// each row routes by the router's rungs over the joined roster (C2, read
// here on the server, D13) and files as its own note under the grab's head
// on the account it surely matches, through the pipeline's own writers —
// the duplicate guard's claim and marker per account, a Filing row per
// account, the one note writer with the door the capture came through. A
// row with no sure match files nothing and is counted on the receipt
// (src/lib/ingest/grab.ts). No model reads the list.
export async function fileGrabCapture(
  rawText: string,
  door: Door,
  windows: Window[],
): Promise<PasteResult> {
  // A Sales Navigator alert email files as its alerts and its intent
  // readings (src/lib/ingest/salesnav-email.ts); a grab files as itself.
  const texts = grabsFrom(rawText);
  try {
    return await fileGrabTexts(texts.length ? texts : [rawText], door, windows);
  } catch {
    return {
      ok: false,
      filed: 0,
      how: "rules",
      reason: "Filing failed partway. Check the account page.",
    };
  }
}

// A disputed verdict as the receipt roomPaste hands back: nothing filed,
// nothing opened, the dispute carried for the doors with its rung and its
// reason (D9 as amended 2026-10-05). Null when there is no verdict, so a
// rung that cleared reads as nothing to return.
function refusal(verdict: GuardVerdict | null, how: string) {
  if (!verdict) return null;
  return {
    ok: false as const,
    filed: 0 as const,
    how,
    mismatch: {
      claim: verdict.claim,
      bound: verdict.bound,
      why: verdict.why,
      boundWhy: verdict.boundWhy,
      rung: verdict.rung,
      reason: verdict.reason,
      // What the held box needs beyond the evidence (slice 18a): the claimed
      // account when the book holds it, whether the reason is the model's,
      // and the router's candidates by name and rung. A candidate's why stays
      // here: it can carry an address, and the box names each by its rung.
      ...(verdict.claimId ? { claimId: verdict.claimId } : {}),
      ...(verdict.reasonBy ? { reasonBy: verdict.reasonBy } : {}),
      candidates: (verdict.candidates ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        rung: c.rung,
      })),
    },
    reason: verdict.reason,
  };
}

// The record spoke, so the acted sweep runs (pass 9's tail, A4.14 and
// A8.4): "the acted sweep can re-stamp from the record any time it truly
// speaks" (CLAUDE.md, The Act Lane), and a filing that wrote rows on an
// account is the record speaking. The run's sweep reaches every account once
// per weekly export; this one reads the filed account alone, so a send
// dropped in the Chute clears its gem's nag now, not at the next drop. It
// runs after the response, so it never slows the filing, and it fails open
// twice over: the sweep swallows its own errors, and a call outside a
// request, where nothing can be scheduled, leaves the filing as it is and
// the run catches the gem next week.
function sweptAfter<R extends { ok: boolean; filed: number }>(
  accountId: string,
  r: R,
): R {
  if (r.ok && r.filed > 0) {
    try {
      after(async () => {
        try {
          await actedSweep(getPrisma(), { accountId });
        } catch {
          // the run's own sweep catches it at the next drop
        }
      });
    } catch {
      // nothing scheduled; the filing stands
    }
  }
  return r;
}

export async function pasteCapture(
  accountId: string,
  raw: string,
  // The door the capture came through stamps every row the filing writes
  // (P3): the Chute says "chute", a paste or file on the account's own row
  // says "drop", the Intranet's Send-it says "intranet". Required, so no
  // caller files under a door it did not name (pass 8 housekeeping).
  // `windows` carries what a reader cut before the text arrived, so the
  // Filing row and the receipt hold every window (D4).
  opts: { force?: boolean; door: Door; windows?: Window[] },
  // The session check the caller owns: the room's actions hand theirs in,
  // and the sent-copy route, behind its shared secret, hands in its own.
  gate: () => Promise<boolean>,
): Promise<{
  ok: boolean;
  filed: number;
  how: string;
  reason?: string;
  noteIds?: string[];
  // The Filing row every row and todo of this filing links to (§2.1).
  filingId?: string;
  // Every window that cut something (D4), for the receipt.
  windows?: Window[];
  // Whether the duplicate check ran, or failed open (D7).
  dupeCheck?: DupeCheck;
  // The actions the read opened, by id: the undo's other reach.
  todoIds?: string[];
  // What the read did beyond filing the record, whichever reader filed the
  // entries: `how` is the entries' provenance alone, and a model read that
  // found no dated entries hands the record to the rules and keeps its
  // judgment (decided 2026-09-24, audit pass 1 bug 5), so the counts below
  // are the model's whenever they are not zero.
  opened?: { id: string; text: string }[]; // auto-created actions (undo one by one)
  promises?: number; // their commitments filed as loops on their side (D10)
  asks?: number; // new STILL UNKNOWN questions queued
  learned?: number; // market facts + lessons filed to the playbook
  outcome?: { status: "lost" | "won"; phrase: string } | null;
  // The misfile guard: the capture reads like another account. `rung` says
  // which rung objected — the text's own evidence before the read, or the
  // read's claim after it — and `reason` is that rung's sentence, nine
  // words or fewer (D9 as amended 2026-10-05); the doors keep `why` and
  // `boundWhy` as the evidence behind it.
  mismatch?: {
    claim: string;
    bound: string;
    why?: string;
    boundWhy?: string;
    rung?: "text" | "read";
    reason?: string;
    // The held box's choices (slice 18a): the claimed account when the book
    // holds it, "model" when the reason is the web check's, and the
    // router's candidates by name and rung, never by why.
    claimId?: string;
    reasonBy?: "model";
    candidates?: { id: string; name: string; rung: RouteRung }[];
  };
  readFailed?: boolean; // the read errored; the rule parser filed the record
  // The duplicate guard: this exact capture already filed to this account,
  // or a twin of it is filing now.
  duplicate?: boolean;
  // The earlier filing a duplicate is refused for: its day and, when the
  // Filing table holds it, its id, so the receipt opens to it (pass 8, C2).
  prior?: { day?: string; filingId?: string };
  // A call transcript's full text was archived alongside the read's entries.
  archived?: boolean;
  // A Sales Nav grab's split (seam S-25): the accounts its rows filed to,
  // the ones already on file, and the rows that matched no account.
  grab?: GrabSummary;
}> {
  const acct = bindAccountId(accountId, peos);
  const door: Door = opts.door;
  const rawText = typeof raw === "string" ? raw.trim() : "";
  // The capture's true dialect travels into the head token and source column —
  // an Outlook thread must never masquerade as Salesforce activity. The head
  // found rides to the source column too: a spreadsheet, a document and a
  // typed note keep the SF token and say what they were in source.
  const { dialect, head: sniffedHead } = sniffHead(rawText);
  // Only the model's read is windowed (D4): head-keep suits newest-first
  // captures (SF, Outlook); a call transcript gets the tape's far higher
  // ceiling, because the decisions live at the END of the call (src/lib/
  // ingest/windows.ts). If a monster paste ever exceeds its window, tell the
  // model so instead of lying by omission — the note is model-facing. Every
  // window that cut something rides to the Filing row and the receipt, the
  // reader's own windows first.
  const readCut = cut(
    "the paste",
    rawText,
    dialect === "CT" ? READ_WINDOW_TAPE : READ_WINDOW,
  );
  const text = readCut.window
    ? `${readCut.text}\n[NOTE: paste truncated — ${rawText.length - readCut.window.read} more characters omitted]`
    : readCut.text;
  const windows: Window[] = [...(opts.windows ?? [])];
  if (readCut.window) windows.push(readCut.window);
  if (!acct)
    return {
      ok: false,
      filed: 0,
      how: "",
      reason: "That row isn't bound to a known account.",
    };
  if (text.length < TEXT_FLOOR)
    return { ok: false, filed: 0, how: "", reason: "Paste something first." };
  if (!(await gate()))
    return { ok: false, filed: 0, how: "", reason: "Read-only session." };

  // A Sales Nav grab is a list of accounts, never this row's capture (pass 8
  // call 12 and D30; seam S-25): it splits row by row, each row filed on the
  // account it surely matches with the duplicate guard per account, and the
  // row the paste landed on decides nothing. Whole, the list's read is not
  // windowed: no model reads it.
  if (dialect === "SN") return await fileGrabCapture(rawText, door, opts.windows ?? []);
  // A Sales Navigator alert email names a dozen accounts and is from
  // LinkedIn, never this row's capture: it files as the alerts grab it
  // carries, each alert on the account it names (2026-10-14).
  if (grabsFrom(rawText).length)
    return await fileGrabCapture(rawText, door, opts.windows ?? []);

  // The duplicate guard — app-wide, since every door (row paste, the Drop,
  // the Chute) files through here. The same capture filed to the same account
  // twice is refused BEFORE any read spends a cent. The check claims the
  // capture rather than reading for it, so two filings of one capture in
  // flight together cannot both pass (pass 8, the duplicate race;
  // claimCapture in src/lib/ingest/filing.ts); the claim becomes the filed
  // marker when the filing lands and is released below when it files
  // nothing. A guard that errors never blocks a filing — it fails open, and
  // the Filing row and the receipt say so (ruled 2026-09-25, D7).
  const fingerprint = pasteFingerprint(rawText);
  const pasteKey = pasteKeyOf(acct.id, fingerprint);
  const claim = await claimCapture(pasteKey, new Date());
  if (claim.kind === "inflight")
    return { ok: false, filed: 0, how: "", duplicate: true, reason: ALREADY_FILING };
  if (claim.kind === "filed") {
    // The decree's line verbatim (B48), and the earlier filing beside it:
    // the day the marker carries and the Filing row's id, the receipt's
    // door to what that filing wrote (pass 8, C2).
    const at = Date.parse(claim.reason.split("·")[0] ?? "");
    const earlier = await findFiling(acct.id, fingerprint);
    const day = !Number.isNaN(at)
      ? monthDay(new Date(at))
      : earlier
        ? monthDay(earlier.createdAt)
        : "";
    return {
      ok: false,
      filed: 0,
      how: "",
      duplicate: true,
      reason: ALREADY_ON_FILE,
      prior: {
        ...(day ? { day } : {}),
        ...(earlier ? { filingId: earlier.id } : {}),
      },
    };
  }
  const dupeCheck: DupeCheck = claim.kind === "skipped" ? "skipped" : "ran";

  try {
    return await fileClaimed({
      acct,
      rawText,
      text,
      dialect,
      sniffedHead,
      windows,
      door,
      opts,
      fingerprint,
      pasteKey,
      dupeCheck,
    }).then((r) => sweptAfter(acct.id, r));
  } finally {
    // A filing that filed nothing lets the capture go; one that landed has
    // already turned the claim into the filed marker, which this leaves.
    if (claim.kind === "claimed") await releaseCapture(pasteKey, claim.token);
  }
}

// Everything after the duplicate guard's claim: the misfile guard's rungs,
// the read, the rows. Its own function so roomPaste can let the claim go
// whatever happens in here (the duplicate race, pass 8).
async function fileClaimed({
  acct,
  rawText,
  text,
  dialect,
  sniffedHead,
  windows,
  door,
  opts,
  fingerprint,
  pasteKey,
  dupeCheck,
}: {
  acct: { id: string; name: string };
  rawText: string;
  text: string;
  dialect: ReturnType<typeof sniffHead>["dialect"];
  sniffedHead: ReturnType<typeof sniffHead>["head"];
  windows: Window[];
  door: Door;
  opts: { force?: boolean };
  fingerprint: string;
  pasteKey: string;
  dupeCheck: DupeCheck;
}): Promise<PasteResult> {
  // One clock for the read and the verdict, so the writes always get their
  // last seconds inside the page's maxDuration (FILING_BUDGET_MS).
  const filingDeadline = Date.now() + FILING_BUDGET_MS;
  // The misfile guard's FIRST rung runs before the read spends a cent. The
  // evidence in the text — a known address, a company domain, a person the
  // book binds to one account — needs no model at all, so a capture dropped
  // on the wrong row is refused for free rather than after a full read
  // (decreed 2026-09-04). The read's own company claim is judged after,
  // below, once there is a claim to judge. A filing may be disputed twice,
  // each time with a reason of nine words or fewer (D9 as amended
  // 2026-10-05); this rung's reason is built from the rule's own why, so a
  // keyless session gets this rung alone, as before. Both rungs read the
  // joined roster — the book's signals and the record's actors and
  // recipients (C2) — read once here on the server (D13).
  const roster = await joinedRoster();
  if (!opts.force) {
    const refused = refusal(
      guardPlan({
        text: rawText,
        claim: "",
        bound: { id: acct.id, name: acct.name },
        roster,
      }).text,
      "",
    );
    if (refused) return refused;
  }

  const now = new Date();
  let read: Awaited<ReturnType<typeof aiCleanTimeline>> | null = null;
  let entries: Awaited<ReturnType<typeof aiCleanTimeline>>["entries"] = [];
  let how = "rules";
  // A read that fails degrades to the rule parser rather than losing the
  // operator's text — but it says so, because a paste filed WITHOUT the read is
  // a paste that opened no actions and asked no questions.
  // Either way the server log says why, so "the reader was down" on a
  // receipt can be traced to its cause: no key, a key latched dead, a
  // timeout, an overload, a refusal, a truncated answer.
  let readFailed = false;
  if (!aiCleanAvailable()) {
    readFailed = true;
    console.error(`[reader] skipped for ${acct.name}: ${claudeDownReason()}`);
  }
  if (aiCleanAvailable()) {
    const startedAt = Date.now();
    try {
      read = await aiCleanTimeline(text, now, {
        budgetMs: Math.min(READ_BUDGET_MS, filingDeadline - Date.now()),
      });
      entries = read.entries;
      how = "ai";
    } catch (e) {
      read = null;
      entries = [];
      readFailed = true;
      const secs = Math.round((Date.now() - startedAt) / 1000);
      console.error(
        `[reader] failed for ${acct.name} after ${secs}s on ${text.length} characters: ${describeReadError(e)}`,
      );
    }
  }
  if (entries.length === 0) {
    entries = dropNoiseEntries(parseSfTimeline(text));
    how = how === "ai" ? "rules" : how;
  }
  // The rules reader (founder-decreed 2026-08-21): when the deep read is
  // down and the SF parser finds nothing, a Teams chat or Outlook thread
  // still parses deterministically — real actors, real dates, real record
  // lines. The deep intelligence (commitments, asks, lessons) waits for the
  // reader; the receipt says so.
  let liveDialect = dialect;
  if (dialect !== "CT" && how !== "ai") {
    // The SF anchor grammar can fabricate one stamp-less garbage entry from
    // a chat line ("Talk to Chassie") — a stamped rules read outranks it
    // (refuted 2026-08-22). A TEAMS THREAD paste reads chat-first so a
    // quoted email inside it never swallows the conversation.
    const stampless =
      entries.length > 0 && entries.every((e) => !e.dayIso && !e.timeLabel);
    if (entries.length === 0 || (dialect === "SF" && stampless)) {
      const rr = rulesRead(text, now, dialect === "TM" ? "TM" : "");
      if (rr && (entries.length === 0 || rr.entries.length >= 2)) {
        entries = rr.entries;
        if (dialect === "SF") liveDialect = rr.dialect;
        how = "rules";
      }
    }
  }

  // The misfile guard's second rung, after the read: the company the read
  // names, judged when the row has nothing of its own to stand on. It exists
  // beside the first because a call transcript names no company at all, and
  // the old guard read the model's silence as consent (the Simploy call
  // filed to Regis, 2026-09-03). Cheap to obey, expensive to skip — a paste
  // filed to the wrong account poisons two deals at once. When this rung
  // disputes, the model reads both accounts' page data and the web and says
  // whether the two are the same company under another name: when they are,
  // the warning withdraws and the filing proceeds; when they are not, its
  // reason is the verdict's; when it has no answer, the rule's reason stands
  // (D9 as amended 2026-10-05; the founder's answer to §7 item 3). The call
  // runs only here, never on a filing the rule accepts. A dispute holds the
  // filing until the operator picks. With force no rung runs — the pick
  // never re-judges (D5) — and the read above ran again all the same, to be
  // sure (§7 item 4).
  const plan = guardPlan({
    force: Boolean(opts.force),
    text: rawText,
    claim: read?.accountName ?? "",
    bound: { id: acct.id, name: acct.name },
    roster,
  });
  const disputed = plan.read
    ? await readRungVerdict(
        plan.read,
        { head: rawText.split("\n")[0] ?? "", excerpt: rawText.slice(0, EXCERPT_CAP) },
        { id: acct.id, name: acct.name },
        { deadline: filingDeadline },
      )
    : null;
  const verdict = refusal(disputed, how) ?? ({ ok: true } as const);
  if (!verdict.ok) {
    return {
      ok: false,
      filed: 0,
      how,
      mismatch: verdict.mismatch,
      reason: verdict.reason,
    };
  }
  // The day the capture says it was recorded, at noon UTC so day-math is
  // stable across timezones — the same convention the email path uses for its
  // activity dates. Undefined when the capture carries no date, and then the
  // DB stamps the filing moment as before.
  const recordedAt = (): Date | undefined => {
    const day = transcriptRecordedDay(rawText);
    return day ? new Date(`${day}T12:00:00Z`) : undefined;
  };

  // The Filing row (§2.1): written once every refusal is behind us and
  // before the first row it links, so a refused capture leaves no row and a
  // filed one is reachable by one id. It carries the sanitized read (null on
  // a keyless filing), every window that cut something (D4), the duplicate
  // check's outcome (D7) and the capture's own day when its head names one.
  // A database without the table answers null and the rows file unlinked.
  let filingId: string | undefined;
  const writeFiling = async (filingHow: FilingHow) => {
    const f = await fileFiling({
      accountId: acct.id,
      fingerprint,
      door,
      dialect,
      how: filingHow,
      read,
      windows,
      dupeCheck,
      filedAt: recordedAt() ?? now,
    });
    filingId = f?.id;
  };

  // The transcript archive — a call's full conversation, kept whole behind
  // one head line. The registers show the head line only; the full text sits
  // under the fold, searchable and citable, never spelled out on arrival.
  // Whole at any size (D4): the read is windowed, the note never is.
  const archiveNote = async (): Promise<string> => {
    // The tape's own head line, "CALL TRANSCRIPT — <label>", names the archive.
    const tapeLabel = new RegExp(`^${HEADS.call}\\s*—\\s*(.+)$`, "m");
    const label =
      tapeLabel.exec(rawText.split("\n")[0] ?? "")?.[1] ?? "filed from the room";
    // A call is filed at the day it HAPPENED, never the day it was dropped.
    // The email path has always done this; the transcript path never did, so a
    // call dropped two days late told the room "you met today" — and the recap
    // rule reads that clock (2026-08-29).
    const at = recordedAt();
    const whole = redactMoney(cleanSfPaste(rawText));
    const voices = new Set(
      whole
        .split("\n")
        .map((l) => /^([^:]{2,30}):\s/.exec(l)?.[1])
        .filter(Boolean),
    ).size;
    const n = await createAccountNoteRow({
      accountId: acct.id,
      kind: "account",
      body: `☰ Call transcript — ${label}${voices > 1 ? ` · ${voices} voices` : ""} · full text under the fold\n${whole}`,
      door,
      lane: "mine",
      source: "transcript",
      at,
      filingId,
    });
    return n.id;
  };

  try {
    const noteIds: string[] = [];
    if (entries.length === 0) {
      if (dialect === "CT") {
        // A call with no read still keeps its whole conversation.
        await writeFiling("transcript");
        const id = await archiveNote();
        await stampPasteMark(pasteKey, id);
        return {
          ok: true,
          filed: 1,
          how: "transcript",
          noteIds: [id],
          archived: true,
          readFailed,
          filingId,
          windows,
          dupeCheck,
        };
      }
      // A capture with no entries files whole as one line (D4): the read was
      // windowed, the note is not, and the decisions at the end of an
      // oldest-first chat are kept with everything before them.
      const body = redactMoney(cleanSfPaste(rawText));
      if (!body)
        return { ok: false, filed: 0, how, reason: "Nothing recognizable to file." };
      await writeFiling("transcript");
      const n = await createAccountNoteRow({
        accountId: acct.id,
        kind: "account",
        body: `☰ transcript — filed from the room\n${body}`,
        door,
        lane: "mine",
        source: "transcript",
        at: recordedAt(),
        filingId,
      });
      await stampPasteMark(pasteKey, n.id);
      return {
        ok: true,
        filed: 1,
        how: "transcript",
        noteIds: [n.id],
        readFailed,
        filingId,
        windows,
        dupeCheck,
      };
    }
    await writeFiling(how === "ai" ? "ai" : "rules");
    let filed = 0;
    // The whole email beside each email entry (ship order 2026-10-20;
    // CLAUDE.md, The email in the row): the read keeps a synopsis on the
    // note, and the email's own words, read from the whole capture and never
    // the read's window (D4), ride to their own store keyed by the note. A
    // call or a chat holds no emails to keep. An email the capture could not
    // pair with its message keeps an empty row, so the row can say the
    // filing looked and found none, never that it predates the store.
    const filedEntries = entries.slice(0, ENTRY_CAP);
    const chat = liveDialect === "CT" || liveDialect === "TM";
    const wholes = chat
      ? filedEntries.map(() => null)
      : wholeEmails(rawText, filedEntries);
    const kept: NewEmailText[] = [];
    for (const [k, e] of filedEntries.entries()) {
      const actors = actorsLine(e.from ?? "", e.to ?? "", e.others ?? 0);
      // The whole receiving side, which `actors` deliberately does not carry.
      const recipients = joinRecipients(e.recipients);
      const when = [e.dayLabel, e.timeLabel].filter(Boolean).join(" ");
      const glyph = e.kind === "task" ? "✔" : e.kind === "call" ? "☎" : "✉";
      const who = actors || "(unattributed)";
      const head = `${glyph} ${liveDialect} ${when || "activity"} — ${e.subject || "(no subject)"} · ${who}`;
      // File at the ACTIVITY's own date (noon UTC — stable across timezones);
      // no dayIso → the DB stamps the filing moment as before.
      const at = e.dayIso ? new Date(`${e.dayIso}T12:00:00Z`) : undefined;
      const n = await createAccountNoteRow({
        accountId: acct.id,
        kind: "account",
        body: scrubSecrets(redactMoney(e.body ? `${head}\n${e.body}` : head)).slice(
          0,
          4000,
        ),
        door,
        lane: laneFor(actors, `${e.subject ?? ""}\n${e.body ?? ""}`),
        actors,
        recipients,
        source: SOURCE_OF(liveDialect, sniffedHead, how),
        at,
        filingId,
      });
      noteIds.push(n.id);
      filed++;
      if (glyph === "✉" && !chat)
        kept.push({ noteId: n.id, accountId: acct.id, filingId, text: wholes[k] ?? "" });
    }
    // Fails open: a store that is down loses the whole emails, never the
    // filing, and the row then shows the synopsis and says why.
    if (kept.length) await keepEmailTexts(kept);
    // A call transcript keeps its whole conversation alongside the read's
    // entries — the entries are the judgment, the archive is the evidence.
    let archived = false;
    if (dialect === "CT") {
      noteIds.push(await archiveNote());
      archived = true;
    }
    if (noteIds[0]) await stampPasteMark(pasteKey, noteIds[0]);
    const absorbed: Awaited<ReturnType<typeof absorbRead>> = read
      ? await absorbRead(read, { id: acct.id, name: acct.name }, now, door, filingId)
      : { opened: [], loops: [], asks: 0, learned: 0, outcome: null, noteIds: [] };
    // Everything the read fanned out rides in the receipt, so the undo can
    // take back the whole filing: the asks, playbook lines and outcome marker
    // by note id (in their own namespaces), the actions and their loops by
    // todo id. A loop is the undo's reach and nothing else's yet: the
    // receipt's opened chips are the operator's actions alone (D10; the
    // loop's seat is the face's, the plan's §5.4).
    const { noteIds: fanoutIds, loops, ...fanout } = absorbed;
    noteIds.push(...fanoutIds);
    return {
      ok: true,
      filed,
      how,
      noteIds,
      readFailed,
      archived,
      todoIds: [...fanout.opened.map((o) => o.id), ...loops.map((l) => l.id)],
      // The receipt counts their promises beside the to-dos (slice 18a).
      promises: loops.length,
      filingId,
      windows,
      dupeCheck,
      ...fanout,
    };
  } catch {
    return {
      ok: false,
      filed: 0,
      how,
      reason: "Filing failed partway. Check the account page.",
    };
  }
}
