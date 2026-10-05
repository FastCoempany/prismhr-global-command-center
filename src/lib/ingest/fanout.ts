// The fan-out (the Chute brains refactor plan, §2.5 and slice 6): everything
// the read produced that ISN'T a record entry. Kept apart from the filing
// loop so a failure here can never lose the record — each limb swallows its
// own errors and reports what it managed, and every row and todo it writes
// carries the filing's id (§2.1) so one undo by id reaches the whole filing.
//
// Five limbs. Commitments the operator owes open as work, one row each.
// Commitments on THEIR side file as loops on their side with the promised
// day and the hearer (ruled 2026-09-25, D10 — CLAUDE.md, The Chute): a Todo
// row tagged `o:them`, never the operator's action, read by owedByThem alone
// until the face decides where a loop sits. The asks file to the account's
// gap namespace and the knowledge to the playbook, each namespace owning its
// own dedupe (src/lib/room/gaps.ts, src/lib/playbook/store.ts). The outcome
// files a marker only; the operator's click is what closes the card.
//
// The completion line lives here too: the ✓ the operator's close files to
// the record, keyed by the todo it closed, so the undo that takes a loop back
// can take its completion with it (the defects doc's open item, closed here).

import { csms } from "@/lib/book";
import { getPrisma } from "@/lib/db";
import type { Door } from "@/lib/ingest/doors";
import type { AiCleanResult } from "@/lib/intel/ai-clean";
import { MINE_RE, isHomeSideName, normPerson } from "@/lib/intel/provenance";
import {
  createAccountNoteRow,
  createTodoRow,
  type AccountNoteData,
  type TodoData,
} from "@/lib/notes/write";
import { filePlaybook, knowledgeKey } from "@/lib/playbook/store";
import { actionBody, splitFallback } from "@/lib/room/deliverables";
import { fileGaps } from "@/lib/room/gaps";
import { outcomeMarkBody } from "@/lib/room/loss";
import { theirLoopOf } from "@/lib/room/owed";
import { visibleText } from "@/lib/today/route-notes";

// ── their commitments, as the read states them ─────────────────────────────

/** One commitment on their side, before it is a row: what they owe, the day
 *  they named (yyyy-mm-dd or ""), who heard it and who owes it ("" when the
 *  record cannot say). */
export type TheirCommitment = {
  text: string;
  day: string;
  hearer: string;
  by: string;
};

/** The one loop a commitment is: the same normalized what and the same day,
 *  across the read's two sources or across entries, is one loop (D10). */
export function loopKey(text: string, day: string): string {
  return `${knowledgeKey(text)}|${day}`;
}

const ourSide = (name: string): boolean =>
  MINE_RE.test(name) || isHomeSideName(name, csms);

/** The one name in a list, when the list names exactly one person — what
 *  "the record can say" when nothing names the hearer or the promiser
 *  outright. "" when it names none or several. */
function theOne(names: readonly string[]): string {
  const seen = new Map<string, string>();
  for (const raw of names) {
    const n = normPerson(raw ?? "").trim();
    if (!n) continue;
    const key = n.toLowerCase();
    if (!seen.has(key)) seen.set(key, n);
  }
  return seen.size === 1 ? [...seen.values()][0] : "";
}

/** The commitments the read attributes to their side, one per loop. Two
 *  sources: the read's actions with owner "them", and every entry's promises
 *  with by "them" (slice 4). The hearer is the person it was promised to —
 *  the promise's own hearer when the read gives one, else the entry's
 *  recipient on our side, else the one person on our side the whole read
 *  names; when no hearer can be named the loop carries none and reads as a
 *  plain wall, never PROMISED (D28). Who owes it is the entry's sender when
 *  the sender is theirs, else the one person on their side the read names. */
export function theirCommitmentsOf(read: AiCleanResult): TheirCommitment[] {
  const entries = read.entries ?? [];
  const ours: string[] = [];
  const theirs: string[] = [];
  for (const e of entries) {
    for (const n of [e.to, ...(e.recipients ?? [])]) if (n && ourSide(n)) ours.push(n);
    if (e.from && !ourSide(e.from)) theirs.push(e.from);
  }
  const oneOfOurs = theOne(ours);
  const oneOfTheirs = theOne(theirs);

  const out = new Map<string, TheirCommitment>();
  const add = (c: TheirCommitment) => {
    const text = (c.text ?? "").replace(/\s+/g, " ").trim();
    if (text.length < 6) return;
    const key = loopKey(text, c.day);
    if (!key.startsWith("|")) {
      const prior = out.get(key);
      if (prior) {
        // The same loop said twice: keep the first, let the second fill
        // what the first left blank.
        prior.hearer ||= c.hearer;
        prior.by ||= c.by;
        return;
      }
      out.set(key, { ...c, text });
    }
  };

  // The entries' promises first: they carry the hearer and the sender, which
  // the read's action list does not.
  for (const e of entries) {
    const by = e.from && !ourSide(e.from) ? normPerson(e.from) : oneOfTheirs;
    // The person the entry is addressed to outranks the copied list: `to`
    // names the one the message was for, and a promise is made to them.
    const heardBy =
      e.to && ourSide(e.to)
        ? normPerson(e.to)
        : theOne((e.recipients ?? []).filter((n) => n && ourSide(n)));
    for (const p of e.promises ?? []) {
      if (p.by !== "them") continue;
      add({
        text: p.what,
        day: p.day,
        hearer: normPerson(p.hearer ?? "") || heardBy || oneOfOurs,
        by,
      });
    }
  }
  for (const a of read.actions ?? []) {
    if (a.owner !== "them") continue;
    add({ text: a.text, day: a.due, hearer: oneOfOurs, by: oneOfTheirs });
  }
  return [...out.values()];
}

// ── the open loops already on the account ──────────────────────────────────

/** The slice of the Prisma client the fan-out's loops need — a test hands in
 *  a stub. */
export type LoopClient = {
  todo: {
    findMany(args: {
      where: { accountId: string; done: false };
      select: { body: true };
    }): Promise<{ body: string }[]>;
    findFirst(args: {
      orderBy: { position: "desc" };
      select: { position: true };
    }): Promise<{ position: number } | null>;
    create(args: { data: TodoData }): Promise<{ id: string }>;
  };
};

/** Compare commitment to commitment. The STORED body carries the fallback
 *  and the "· from M/D paste" provenance, so hashing it raw never matches
 *  the model's bare text and every re-paste opens the same work again. */
export function commitmentKey(body: string): string {
  return knowledgeKey(
    splitFallback(visibleText(body)).text.replace(/\s+·\s+from\s.*$/i, ""),
  );
}

/** What the account already has open, keyed the way each side dedupes: the
 *  operator's commitments by their text, their loops by text and day. */
export async function openLoopKeys(
  accountId: string,
  client: LoopClient = getPrisma(),
): Promise<{ mine: Set<string>; theirs: Set<string> }> {
  const mine = new Set<string>();
  const theirs = new Set<string>();
  const open = await client.todo
    .findMany({ where: { accountId, done: false }, select: { body: true } })
    .catch(() => [] as { body: string }[]);
  for (const t of open) {
    const loop = theirLoopOf(t.body);
    if (loop) theirs.add(loopKey(loop.text, loop.day));
    else mine.add(commitmentKey(t.body));
  }
  return { mine, theirs };
}

/** File their commitments as loops on their side (D10): a Todo row each,
 *  tagged `o:them` with the promised day, the hearer and who owes it, linked
 *  to the filing. Never an action (no `k:a`) and never a reminder, so the
 *  sheet, the ledger and the mirror leave it alone; owedByThem reads it.
 *  `known` is what the account already holds open; a loop it names is not
 *  written twice. Returns what it wrote. */
export async function fileTheirLoops(
  opts: {
    commitments: readonly TheirCommitment[];
    accountId: string;
    known: Set<string>;
    /** The sheet position the first loop takes; each loop takes the next. */
    position: number;
    filingId?: string;
  },
  client: LoopClient = getPrisma(),
): Promise<{ id: string; text: string }[]> {
  const loops: { id: string; text: string }[] = [];
  let position = opts.position;
  for (const c of opts.commitments) {
    const key = loopKey(c.text, c.day);
    if (opts.known.has(key)) continue;
    opts.known.add(key);
    try {
      const t = await createTodoRow(
        {
          body: c.text,
          tags: { owner: "them", date: c.day, hearer: c.hearer, by: c.by },
          position: position++,
          accountId: opts.accountId,
          filingId: opts.filingId,
        },
        client,
      );
      loops.push({ id: t.id, text: c.text });
    } catch {
      // One loop that won't file never costs the others.
    }
  }
  return loops;
}

// ── the fan-out ────────────────────────────────────────────────────────────

export async function absorbRead(
  read: AiCleanResult,
  acct: { id: string; name: string },
  now: Date,
  // The filing's door: every row the fan-out writes carries it (P3).
  door: Door,
  // The filing's row: every row and todo the fan-out writes links to it
  // (§2.1), so one undo by id reaches the whole filing. Undefined when the
  // table is not there yet.
  filingId?: string,
): Promise<{
  opened: { id: string; text: string }[];
  // Their loops (D10), by id: the undo's reach, never a receipt chip yet.
  loops: { id: string; text: string }[];
  asks: number;
  learned: number;
  outcome: { status: "lost" | "won"; phrase: string } | null;
  // Every note this fan-out wrote, so the paste's undo can reach it.
  noteIds: string[];
}> {
  const prisma = getPrisma();
  const noteIds: string[] = [];
  const stamp = now.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
  });

  // 1. Commitments, both sides. The operator's become real work, one row
  // each, so each one can be undone on its own; theirs file as loops on
  // their side (D10). Both dedupe against what the account already holds
  // open — a re-paste never opens the same work, or the same loop, twice.
  const opened: { id: string; text: string }[] = [];
  let loops: { id: string; text: string }[] = [];
  const mine = read.actions.filter((a) => a.owner === "me");
  const theirs = theirCommitmentsOf(read);
  if (mine.length || theirs.length) {
    const known = await openLoopKeys(acct.id);
    let top =
      (
        await prisma.todo
          .findFirst({ orderBy: { position: "desc" }, select: { position: true } })
          .catch(() => null)
      )?.position ?? -1;
    for (const a of mine) {
      const body = actionBody(a.text, a.fallback, `from ${stamp} paste`);
      const key = knowledgeKey(a.text);
      if (!key || known.mine.has(key)) continue;
      known.mine.add(key);
      try {
        // The wall rides as the date tag, sets the urgency, and places the
        // reminder — the writer carries the codec (src/lib/notes/write.ts).
        const t = await createTodoRow({
          body,
          tags: { kind: "action" },
          due: a.due,
          now,
          position: ++top,
          accountId: acct.id,
          filingId,
        });
        opened.push({ id: t.id, text: a.text });
      } catch {
        // One commitment that won't open never costs the others.
      }
    }
    loops = await fileTheirLoops({
      commitments: theirs,
      accountId: acct.id,
      known: known.theirs,
      position: top + 1,
      filingId,
    });
  }

  // 2. The asks — questions the record still can't answer for THIS deal.
  // The namespace owns its dedupe.
  let asks = 0;
  if (read.gaps.length) {
    const gapIds = await fileGaps({
      accountId: acct.id,
      questions: read.gaps,
      door,
      filingId,
    });
    asks = gapIds.length;
    noteIds.push(...gapIds);
  }

  // 3. The playbook — knowledge that outlives the deal it came from. This is
  // the cure for knowledge trapped per account: filed to a namespace, read by
  // every account. The namespace owns its dedupe.
  let learned = 0;
  const market = read.competitorIntel.map((c) => ({ text: c.fact, who: c.who }));
  const lessons = read.lessons.map((l) => ({ text: l, who: "" }));
  for (const [kind, items] of [
    ["market", market],
    ["lesson", lessons],
  ] as const) {
    if (!items.length) continue;
    const filedIds = await filePlaybook({
      kind,
      items,
      accountId: acct.id,
      accountName: acct.name,
      door,
      filingId,
    });
    learned += filedIds.length;
    noteIds.push(...filedIds);
  }

  // 4. The outcome. A closed deal is the biggest state change the app can
  // make, so the read only files the marker that makes the row say it — the
  // operator's click is what actually closes the card (D10).
  let outcome: { status: "lost" | "won"; phrase: string } | null = null;
  if (read.outcome.status === "lost" || read.outcome.status === "won") {
    outcome = { status: read.outcome.status, phrase: read.outcome.phrase };
    try {
      const mark = await createAccountNoteRow({
        accountId: acct.id,
        kind: "account",
        body: outcomeMarkBody(read.outcome.status, read.outcome.phrase),
        door,
        lane: "mine",
        source: "outcome",
        filingId,
      });
      noteIds.push(mark.id);
    } catch {
      outcome = null;
    }
  }

  return { opened, loops, asks, learned, outcome, noteIds };
}

// ── the completion line ────────────────────────────────────────────────────

/** The marker that says a todo's completion line is on the record. Its
 *  reason carries the note's id after the dot, so the undo that takes the
 *  todo back can take its line with it. */
export function completionKey(todoId: string): string {
  return `done-filed:${todoId}`.slice(0, 191);
}

const COMPLETION_REASON = "completion filed";

/** The slice of the Prisma client the completion line needs — a test hands
 *  in a stub. */
export type CompletionClient = {
  accountNote: {
    create(args: { data: AccountNoteData }): Promise<{ id: string }>;
    deleteMany(args: {
      where: { id: string; accountId: string };
    }): Promise<{ count: number }>;
  };
  accountDisposition: {
    findUnique(args: {
      where: { accountId: string };
      select: { reason: true };
    }): Promise<{ reason: string | null } | null>;
    upsert(args: {
      where: { accountId: string };
      create: { accountId: string; status: string; reason: string };
      update: { status: string; reason: string };
    }): Promise<unknown>;
    deleteMany(args: { where: { accountId: string } }): Promise<{ count: number }>;
  };
};

/** The completion line, filed to the account's own history exactly once.
 *  Keyed by todo id so done → undo → done can't stack duplicates on the
 *  record. The close still stands even if its history line doesn't land. */
export async function fileCompletion(
  accountId: string,
  todoId: string,
  body: string,
  client: CompletionClient = getPrisma(),
): Promise<void> {
  const key = completionKey(todoId);
  try {
    const already = await client.accountDisposition.findUnique({
      where: { accountId: key },
      select: { reason: true },
    });
    if (already) return;
    const text = splitFallback(visibleText(body)).text.slice(0, 300);
    if (!text) return;
    const day = new Date().toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      month: "numeric",
      day: "numeric",
    });
    const n = await createAccountNoteRow(
      {
        accountId,
        kind: "account",
        body: `✓ ${text} — done ${day}`,
        door: "hand",
        lane: "mine",
        source: "done",
      },
      client,
    );
    const reason = `${COMPLETION_REASON}·${n.id}`;
    await client.accountDisposition.upsert({
      where: { accountId: key },
      create: { accountId: key, status: "parked", reason },
      update: { status: "parked", reason },
    });
  } catch {
    // The close still stands even if its history line doesn't land.
  }
}

/** Take back the completion lines of the todos being taken back, on this
 *  account only, and clear their markers. The marker goes only with its
 *  line: a line on another account is never reached, and its marker stands;
 *  a marker written before the line carried its note's id names no line, so
 *  that line and its marker stay. Returns how many lines went. */
export async function undoCompletions(
  accountId: string,
  todoIds: readonly string[],
  client: CompletionClient = getPrisma(),
): Promise<number> {
  let removed = 0;
  for (const id of new Set(todoIds)) {
    const key = completionKey(id);
    try {
      const mark = await client.accountDisposition.findUnique({
        where: { accountId: key },
        select: { reason: true },
      });
      const noteId = (mark?.reason ?? "").split("·")[1]?.trim() ?? "";
      if (!noteId) continue;
      const r = await client.accountNote.deleteMany({
        where: { id: noteId, accountId },
      });
      if (r.count === 0) continue;
      removed += r.count;
      await client.accountDisposition.deleteMany({ where: { accountId: key } });
    } catch {
      // A marker that won't clear costs nothing the todo's own undo needs.
    }
  }
  return removed;
}
