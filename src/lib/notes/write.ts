// The way to create an AccountNote — the contract every writer is to take
// (Provenance is columns, ruled 2026-09-25, P3/P4 — CLAUDE.md, The Ted
// doctrine :405). Stamps provenance (door/lane/actors/source/recipients) and
// degrades to the pre-migration column set if the DB hasn't gained the
// provenance columns yet — so deploys never race the SQL. A create outside
// this module is a bare row and a defect by the ruling; the one left is
// src/lib/activity/run.ts (the second record's namespaced notes), which the
// second record's own slice routes through here.
//
// The door is required: every row says which door it came through
// (src/lib/ingest/doors.ts), in its own column beside `source`, which names
// the dialect. The type refuses a call without one.
//
// Money never reaches the table through this door: the body is redacted here,
// whatever the caller did upstream (the Ted doctrine's E3, ruled 2026-09-25).
// A JSON body says so with `structured`, and the redaction then runs over its
// string values and never over its numeric fields — a count of 1,234 inside
// an array is not a figure, and the body stays JSON. The one carve-out is the
// Scratchpaper, whose pact keeps figures because the pad routes nowhere by
// construction — it says so with `keepFigures`.
//
// The Todo has one writer too, `createTodoRow`, which carries the sheet's tag
// codec (⚑ tags, src/lib/today/route-notes.ts) and the composer's urgency
// ladder, so no caller assembles a Todo body by hand.

import { getPrisma } from "@/lib/db";
import type { Door } from "@/lib/ingest/doors";
import { redactMoney } from "@/lib/intel/lexicon";
import type { Lane } from "@/lib/intel/provenance";
import { urgencyForDue } from "@/lib/room/deliverables";
import { NO_TAGS, withTags, type NoteTags } from "@/lib/today/route-notes";

type NewAccountNote = {
  accountId: string;
  partner?: string;
  kind: "mine" | "partner" | "account";
  body: string;
  /** The door the row came through — required, by P3. */
  door: Door;
  lane?: Lane;
  actors?: string;
  source?: string;
  /** Every recipient the capture kept, comma-joined, our own side included.
   *  `actors` names the account's person by design and cannot answer "did this
   *  reach us"; this can (src/lib/intel/provenance.ts). */
  recipients?: string;
  // The ACTIVITY's own moment (a pasted email's send time), not the filing
  // moment — so the record and the intel clock keep true chronology. Omitted
  // (or invalid) → the DB stamps now(), as before.
  at?: Date;
  /** The Scratchpaper's carve-out (CLAUDE.md, The Scratchpaper, amended
   *  2026-08-21): scratch lines are NOT money-redacted. Nothing else sets it. */
  keepFigures?: boolean;
  /** The body is JSON: redaction runs over its string values, never its
   *  numeric fields, and the body stays JSON (P4; §7 item 8 of the plan). */
  structured?: true;
};

/** The columns a note row is written with, oldest tier first. */
export type AccountNoteData = {
  accountId: string;
  partner: string;
  kind: string;
  body: string;
  createdAt?: Date;
  lane?: string;
  actors?: string;
  source?: string;
  door?: string;
  recipients?: string;
};

/** The slice of the Prisma client the writer needs — a test hands in a stub. */
type NoteClient = {
  accountNote: {
    create(args: { data: AccountNoteData }): Promise<{ id: string }>;
  };
};

/** Money redaction for a JSON body: every string value, at any depth, is
 *  redacted; numbers, booleans and nulls are never touched; the result is the
 *  same JSON, compact. A body that does not parse is redacted whole, as plain
 *  text is — never stored with a figure in it. */
export function redactStructured(body: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return redactMoney(body);
  }
  return JSON.stringify(redactValues(parsed));
}

function redactValues(v: unknown): unknown {
  if (typeof v === "string") return redactMoney(v);
  if (Array.isArray(v)) return v.map(redactValues);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = redactValues(x);
    return out;
  }
  return v;
}

export async function createAccountNoteRow(
  n: NewAccountNote,
  client: NoteClient = getPrisma(),
): Promise<{ id: string }> {
  const at =
    n.at instanceof Date && !Number.isNaN(n.at.getTime()) ? { createdAt: n.at } : {};
  const body = n.keepFigures
    ? n.body
    : n.structured
      ? redactStructured(n.body ?? "")
      : redactMoney(n.body ?? "");
  const stable: AccountNoteData = {
    accountId: n.accountId,
    partner: n.partner ?? "",
    kind: n.kind,
    body,
    ...at,
  };
  // The door rides with lane, actors and source: one provenance tier. Its
  // column lands with the deploy that ships this code (the build script runs
  // `prisma migrate deploy` first), so on a deployed database this tier never
  // degrades for want of it; a database that never ran the migration falls
  // through to the stable tier as before.
  const provenance: AccountNoteData = {
    ...stable,
    lane: n.lane ?? "mine",
    actors: n.actors ?? "",
    source: n.source ?? "",
    door: n.door,
  };
  try {
    // Newest column first. It gets its own tier rather than joining the one
    // below: sharing a tier would mean an unmigrated database silently drops
    // lane, actors and source too, which is a much larger loss than the one
    // column actually missing.
    return await client.accountNote.create({
      data: { ...provenance, recipients: n.recipients ?? "" },
    });
  } catch {
    try {
      return await client.accountNote.create({ data: provenance });
    } catch {
      return await client.accountNote.create({ data: stable });
    }
  }
}

// ── The Todo's one writer ───────────────────────────────────────────────────

/** The columns a Todo row is written with. */
export type TodoData = {
  body: string;
  done: boolean;
  position: number;
  accountId?: string;
  remindAt?: Date;
};

/** The slice of the Prisma client the Todo writer needs — a test hands in a stub. */
type TodoClient = {
  todo: {
    create(args: { data: TodoData }): Promise<{ id: string }>;
    findFirst(args: {
      orderBy: { position: "desc" };
      select: { position: true };
    }): Promise<{ position: number } | null>;
  };
};

export type NewTodo = {
  /** The visible text. With `tags` or `due` the ⚑ line is folded on here;
   *  without either the body is written exactly as handed over (the sheet
   *  mirror's pre-routed row, the Act Lane's fork). */
  body: string;
  /** The sheet's tags (`kind: "action"`, an urgency chip, a country); the rest
   *  of the codec is filled with NO_TAGS, as every caller did by hand. */
  tags?: Partial<NoteTags>;
  /** A dated commitment's wall, yyyy-mm-dd or "". It rides as the date tag, sets
   *  the urgency on the composer's ladder (urgencyForDue), and, when no
   *  `remindAt` is given, puts the reminder at noon UTC that day — or at the
   *  filing moment when the wall is "". */
  due?: string;
  /** The clock the ladder reads; the filing moment when omitted. */
  now?: Date;
  accountId?: string;
  remindAt?: Date;
  /** The sheet position; omitted → one past the top. */
  position?: number;
};

export async function createTodoRow(
  t: NewTodo,
  client: TodoClient = getPrisma(),
): Promise<{ id: string }> {
  let body = t.body;
  let remindAt = t.remindAt;
  if (t.tags || t.due !== undefined) {
    const tags: NoteTags = { ...NO_TAGS, ...t.tags };
    if (t.due !== undefined) {
      // The wall itself — the sheet reads this to know the date passed.
      tags.date = t.due;
      tags.urgency = urgencyForDue(t.due, t.now ?? new Date());
      remindAt ??= t.due ? new Date(`${t.due}T12:00:00Z`) : new Date();
    }
    body = withTags(body, tags);
  }
  const position =
    t.position ??
    ((
      await client.todo.findFirst({
        orderBy: { position: "desc" },
        select: { position: true },
      })
    )?.position ?? -1) + 1;
  const data: TodoData = { body, done: false, position };
  if (t.accountId) data.accountId = t.accountId;
  if (remindAt) data.remindAt = remindAt;
  return client.todo.create({ data });
}
