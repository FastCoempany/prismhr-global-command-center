// Rows → docs: the one place a record row becomes a doc the readers can
// consume (the Chute brains refactor plan, §2.2; slice 10). Every doc carries
// the facts the seven corpora used to re-derive for themselves — direction,
// the sender and whose side they are on, the two flags, the tape, the
// effective moment — read from the columns and the dialect module's own
// predicates, never from a regex of this module's own (pass 2 E, field 1).
//
// Two things the old corpus did are NOT done here. Nothing is dropped: a
// hidden row is a doc with `hidden: true`, a machinery row is a doc with
// `machinery: true`, a sign-off is a doc with `closer: true` — flags, never
// exclusions, so the Sendbook can keep its warmth from the same doc the court
// reads through (the closer rule; pass 2 E, the two-flag rule). And nothing
// is inferred twice: the wide loader already infers actors and lane for rows
// filed before the columns (D23), so a row arrives here with them.

import type { CorpusDoc } from "@/lib/intel/extract";
import { GLYPH_RE, TAPE_HEAD_IN_BODY_RE } from "@/lib/ingest/dialect";
import { isCloser, isMachinery } from "@/lib/intel/closer";
import { effectiveAt } from "@/lib/intel/clock";
import type { DigestEntry } from "@/lib/intel/digest";
import {
  MINE_RE,
  inferActors,
  isAddressedToUs,
  isHomeSideName,
  splitRecipients,
  type Lane,
} from "@/lib/intel/provenance";

/** A record row as the wide loader hands it (src/lib/today/overlay.ts). */
export type RecordRow = {
  id: string;
  body: string;
  createdAt: string; // ISO
  kind: string;
  lane?: Lane | string;
  actors?: string;
  source?: string;
  /** Every recipient the capture kept, comma-joined; "" before the column. */
  recipients?: string | null;
};

export type TouchRow = {
  subjectKey: string;
  label: string;
  contactedAt: string;
  message?: string;
  log: readonly { at: string; body: string }[];
};

/** One doc of the account's record. A CorpusDoc, so extractDealIntel and the
 *  evidence rules read it unchanged, carrying the columns and the flags the
 *  narrow corpora threw away (pass 2 E, field 1). */
export type RecordDoc = CorpusDoc & {
  /** Who wrote it, as the actors column names them — the operator included.
   *  "" when the row attributes nobody (a transcript, a bare activity), and
   *  an unattributed doc is never inbound (the Ted doctrine). */
  sender: string;
  /** The sender is ours: the operator, a @prismhr.com address, or a name on
   *  the declared roster — the CSM column unioned with everyone the record
   *  shows working across several accounts (E9). The Sendbook's "a CSM's
   *  voice never warms" is this flag, not a separate reader. */
  senderIsHome: boolean;
  /** Arrived without a person deciding to write it (src/lib/intel/closer.ts).
   *  A flag: the obligation is suppressed, the arrival is still a fact. */
  machinery: boolean;
  /** A courtesy sign-off after the head — transparent for whose move it is,
   *  real for warmth (the closer rule). */
  closer: boolean;
  /** The raw tape: every voice in the room at once. */
  tape: boolean;
  /** The row's moment: the stored stamp refined by the OL head's own clock
   *  (src/lib/intel/clock.ts). Every clock in the read is this one. */
  at: string;
  /** The AccountNote id; "" on a sheet, touch or digest doc. */
  noteId: string;
  source: string;
  lane: Lane | "";
  actors: string;
  recipients: string[];
  /** ✕-parked by the operator (`hide:note:<id>`). Kept, flagged, so a reader
   *  that wants the row anyway can say so. */
  hidden: boolean;
};

const short = (iso: string): string => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

// The actors column is the authority: "Sender → Target +n", possibly with
// semicolon/comma lists. The head line is the fallback for the rows filed
// before actors were stamped.
function peopleFromActors(actors: string): string[] {
  return actors
    .split(/→|;|,/)
    .map((s) => s.replace(/\+\d+\s*$/, "").trim())
    .filter((s) => s.length > 1);
}

function peopleIn(text: string): string[] {
  const out: string[] = [];
  const head = text.split("\n")[0] ?? "";
  const m =
    /·\s*([A-Z][\w.'-]+(?: [A-Z][\w.'-]+)+)\s*→\s*([A-Z][\w.'-]+(?: [A-Z][\w.'-]+)+)/.exec(
      head,
    );
  if (m) out.push(m[1], m[2]);
  return out;
}

/** A doc that is not a record row — a sheet line, a touch, a digest fact.
 *  The record fields read empty and the flags false; `src` says which. */
const plainDoc = (
  text: string,
  at: string,
  src: string,
  direction?: "in" | "out",
): RecordDoc => ({
  text,
  at,
  src,
  ...(direction ? { direction } : {}),
  sender: "",
  senderIsHome: false,
  machinery: false,
  closer: false,
  tape: false,
  noteId: "",
  source: "",
  lane: "",
  actors: "",
  recipients: [],
  hidden: false,
});

export type DocsInput = {
  notes: readonly RecordRow[];
  /** Pre-filtered to the account. */
  todos: readonly { id: string; body: string; createdAt: string }[];
  /** Pre-filtered to the account. */
  touches: readonly TouchRow[];
  /** The seed the record outranks; its facts ride as docs so they stay
   *  searchable, dated to the distillation. */
  digest?: DigestEntry | null;
  /** Everyone who counts as our side, declared — csms ∪ homeSideFrom. The
   *  caller SAYS who we are; the read never guesses (ruled 2026-09-25, E2). */
  homeSide: readonly string[];
  /** The note ids the operator ✕-parked. */
  hidden: ReadonlySet<string>;
};

/** One record row as a doc. */
export function docOf(
  n: RecordRow,
  homeSide: readonly string[],
  hidden: ReadonlySet<string>,
): RecordDoc {
  const isEntry = GLYPH_RE.test(n.body);
  const actors = n.actors || inferActors(n.body);
  const rawSender = actors.split("→")[0] ?? "";
  const sender = rawSender.trim();
  // A doc with no attributed sender is NOT inbound — a filed transcript or an
  // unattributed activity must never fire "the reply is owed" (the Ted
  // doctrine).
  const attributed = sender.length > 0;
  const mine = MINE_RE.test(rawSender);
  // ...and it has to have reached us. A thread between two of the account's
  // OWN people, which we were merely copied on, is not a reply addressed to
  // us (Infiniti HR, 2026-09-15); a message to a colleague still reached us.
  const toUs = isAddressedToUs(actors, homeSide, splitRecipients(n.recipients));
  // One predicate for everything that arrives without a person deciding to
  // write it; one for the sign-off after the head (src/lib/intel/closer.ts).
  const machinery = isMachinery({ body: n.body, actors });
  const closer = isEntry && isCloser(n.body.split("\n").slice(1).join("\n"));
  const direction: RecordDoc["direction"] = !isEntry
    ? undefined
    : mine || /—\s*Antaeus/i.test(n.body.split("\n")[0] ?? "")
      ? "out"
      : attributed && !machinery && !closer && toUs
        ? "in"
        : undefined;
  return {
    text: n.body,
    tape: TAPE_HEAD_IN_BODY_RE.test(n.body),
    at: effectiveAt(n.createdAt, n.body),
    src: `${isEntry ? "sf-activity" : "note"} ${short(n.createdAt)}`,
    ...(direction ? { direction } : {}),
    people: actors ? peopleFromActors(actors) : peopleIn(n.body),
    sender,
    senderIsHome: attributed && isHomeSideName(sender, homeSide),
    machinery,
    closer,
    noteId: n.id,
    source: n.source ?? "",
    lane: n.lane === "mine" || n.lane === "background" ? n.lane : "",
    actors,
    recipients: splitRecipients(n.recipients),
    hidden: hidden.has(n.id),
  };
}

/** Every store the app holds for one account, as docs, newest first. The
 *  order of assembly is the corpus's own — rows, sheet lines, touches, the
 *  digest — and the sort is stable, so a stamp two docs share keeps them in
 *  that order; the deal-facts extractor's "first hit, newest first" rules
 *  depend on it. */
export function buildDocs(i: DocsInput): RecordDoc[] {
  const docs: RecordDoc[] = [];
  for (const n of i.notes) docs.push(docOf(n, i.homeSide, i.hidden));
  for (const t of i.todos)
    docs.push(plainDoc(t.body, t.createdAt, `sheet ${short(t.createdAt)}`));
  for (const t of i.touches) {
    // A logged send with its message is the operator's own outbound.
    if (t.message)
      docs.push(
        plainDoc(t.message, t.contactedAt, `touch ${short(t.contactedAt)}`, "out"),
      );
    for (const e of t.log) docs.push(plainDoc(e.body, e.at, `touch-log ${short(e.at)}`));
  }
  if (i.digest)
    for (const f of i.digest.facts)
      docs.push(
        plainDoc(f, `${i.digest.asOf}T00:00:00Z`, `digest ${i.digest.asOf.slice(5)}`),
      );
  return docs.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
