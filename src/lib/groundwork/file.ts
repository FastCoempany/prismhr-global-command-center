// The working file — everything the app knows about one account, composed per
// request from the stores' own lines (spec F1–F7). Nothing here is authored:
// the kicker's sources line lists only stores that actually contributed a
// fact, the history is the stores' own dated entries, and the Russ paragraph
// comes from the same builder as the full readout.

import type { Peo } from "@/lib/book";
import type { DealIntel } from "@/lib/intel/types";
import { getDemand, researchGeneratedAt } from "@/lib/book/research";
import { redactMoney } from "@/lib/intel/lexicon";
import { clockShort, userDayKey } from "@/lib/tz";
import type { IntentSignal } from "./signals";
import type { QueueItem } from "./day";
import { composeFor, WIDENING_LINE, type Composed } from "./compose";
import { paragraphFor } from "./readout";
import { WIRE_NS, type WireItem } from "./wire";

export type FilePerson = { name: string; title: string; flag: "csm" | "contact" | "" };
export type FileHistoryLine = { atIso: string; line: string };

export type FileModel = {
  accountId: string;
  /** The collision guard's quiet flag — informs, never blocks. "" = clear. */
  collisionLine: string;
  name: string;
  csm: string;
  sourcesLine: string; // computed provenance — only stores that contributed
  title: string;
  story: string;
  composed: Composed;
  people: FilePerson[];
  singleThread: boolean;
  threadCount: number; // known people carrying the conversation (MULTI ladder)
  contactEmail: string; // the relationship's email, for a truly addressed mailto
  russ: string; // the To-Russ pull tab paragraph (shared builder)
  history: FileHistoryLine[]; // oldest → newest, capped
};

type NoteLike = { body: string; source: string; createdAt: string };
type TouchLike = { subjectKey: string; label: string; contactedAt: string };
type ContactLike = { name: string; title?: string };

const HISTORY_CAP = 8;

const shortDate = (iso: string) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: "America/Chicago",
  });
};

// The file's title IS the queue row's pair: the action, then the trigger.
// One writing, two surfaces — the rail and the file never disagree.
function titleFor(item: QueueItem): string {
  return `${item.action} ${item.reason}`;
}

export function buildFile(
  p: Peo,
  deps: {
    queueItem: QueueItem;
    intel?: DealIntel;
    intent: IntentSignal | null;
    notes: NoteLike[]; // newest first
    touches: TouchLike[]; // this account's outreach touches
    wire: WireItem[]; // full wire; matched items join the history
    contacts: ContactLike[]; // roster (may be huge; we take the head)
    laneDate?: string | null;
    research?: { at: string; line: string } | null; // newest deep-research note
    // The relationship read, when the caller derived one from the record —
    // it outranks the book primary in the people head and the compose.
    relationship?: { name: string; email: string; source: "record" | "book" } | null;
    /** The second record's fuel for the composer and the collision gate. */
    second?: {
      supportCases?: number;
      gem?: { act: string; reason: string; term: string; who: string[] } | null;
      collision?: {
        mktgSends7: number;
        colleague: { who: string; day: string } | null;
      } | null;
    } | null;
    now: Date;
  },
): FileModel {
  const { queueItem, intel, intent, notes, touches, wire, contacts, laneDate, research } =
    deps;
  const rel =
    deps.relationship && deps.relationship.name
      ? deps.relationship
      : {
          name: p.contactName ?? "",
          email: p.contactEmail ?? "",
          source: "book" as const,
        };

  // Sources line — provenance, computed (spec F1): it lists only stores that
  // actually contributed, labeled as what they are.
  const sources: string[] = [];
  const isPaste = (src: string) => /^(sf|outlook|teams|transcript|room)/.test(src);
  const pasteNotes = notes.filter((n) => isPaste(n.source));
  const filedWire = notes.filter((n) => n.source === "wire");
  const otherNotes = notes.filter(
    (n) => !isPaste(n.source) && n.source !== "wire" && !n.source.startsWith("salesnav"),
  );
  if (pasteNotes.length > 0)
    sources.push(`HomeRoom pastes ${shortDate(pasteNotes[0].createdAt)}`);
  const demandRec = getDemand(p.id);
  if (research) sources.push(`deep research ${shortDate(research.at)}`);
  if (demandRec?.summary && researchGeneratedAt)
    sources.push(`research ${shortDate(`${researchGeneratedAt}T12:00:00Z`)}`);
  if (intent) sources.push(`Sales Nav read ${shortDate(intent.at)}`);
  const wireMatches = wire.filter((w) => w.accountIds.includes(p.id));
  if (wireMatches.length > 0 || filedWire.length > 0)
    sources.push(
      `the wire ${shortDate(wireMatches[0]?.at ?? filedWire[0]?.createdAt ?? "")}`,
    );
  if (touches.length > 0) sources.push(`touch log ${shortDate(touches[0].contactedAt)}`);
  if (sources.length === 0 && otherNotes.length > 0)
    sources.push(`notes ${shortDate(otherNotes[0].createdAt)}`);

  // Story — the carryover fact first when there is one, then what the
  // research adds (§3 voice). The action and its trigger live in the title;
  // the story never repeats them.
  const demand = demandRec;
  const storyBits: string[] = [];
  if (queueItem.carried) {
    storyBits.push("Surfaced yesterday. Left unworked.");
  }
  if (research?.line) {
    storyBits.push(research.line.endsWith(".") ? research.line : `${research.line}.`);
  }
  if (demand?.summary) {
    const s = demand.summary.split(/(?<=\.)\s+/)[0];
    if (s) storyBits.push(s.endsWith(".") ? s : `${s}.`);
  }
  if (intel?.countries.length) {
    storyBits.push(
      `Countries already on the record: ${intel.countries
        .slice(0, 3)
        .map((c) => c.value.toUpperCase())
        .join(", ")}.`,
    );
  }

  // People — the relationship first, then the roster head + partner manager.
  const people: FilePerson[] = [];
  if (rel.name)
    people.push({
      name: rel.name,
      title: rel.source === "record" ? "the relationship" : "book primary",
      flag: "contact",
    });
  for (const c of contacts.slice(0, 3)) {
    if (c.name && c.name !== rel.name)
      people.push({ name: c.name, title: c.title ?? "", flag: "" });
  }
  if (p.csm && p.csm !== "Unassigned")
    people.push({ name: p.csm, title: "partner manager", flag: "csm" });

  // History — the stores' own dated lines, oldest → newest, capped (spec F7).
  const hist: FileHistoryLine[] = [];
  for (const n of notes.slice(0, 12)) {
    const first = n.body.split("\n")[0].slice(0, 90);
    hist.push({ atIso: n.createdAt, line: first });
  }
  for (const t of touches.slice(0, 6)) {
    hist.push({ atIso: t.contactedAt, line: `→ ${t.label || "outreach sent"}` });
  }
  for (const w of wireMatches.slice(0, 2)) {
    hist.push({ atIso: w.at, line: `⚡ wire: ${w.headline}` });
  }
  hist.sort((a, b) => a.atIso.localeCompare(b.atIso));

  const composed = composeFor({
    ruleId: queueItem.ruleId,
    account: p,
    intel,
    intent,
    contactName: rel.name,
    laneDate,
    wireHeadline: wireMatches[0]?.headline ?? null,
    supportCases: deps.second?.supportCases,
    gem: deps.second?.gem ?? null,
  });
  // The collision guard speaks on the stage first (the chips) and rides the
  // composed thing here — the same quiet-flag pattern the CSM-thread flag
  // set. It informs; it never blocks (the direct doctrine).
  const col = deps.second?.collision;
  const collisionLine = col
    ? col.mktgSends7 > 0
      ? `MKTG CADENCE LIVE · ${col.mktgSends7} SEND${col.mktgSends7 === 1 ? "" : "S"} THIS WEEK`
      : `${(col.colleague?.who ?? "A COLLEAGUE").toUpperCase()}'S THREAD · ${(col.colleague?.day ?? "").slice(5).replace("-", "/")}`
    : "";
  const threadCount = intel?.threads.people.length ?? 0;
  const singleThread = threadCount === 1;
  // The widening question travels INSIDE the composed text when one person
  // carries the conversation — so the file's claim about it is always true.
  if (
    singleThread &&
    (composed.kind === "send-draft" || composed.kind === "relay-note")
  ) {
    composed.payload = `${composed.payload}\n\n${WIDENING_LINE}`;
  }

  return {
    accountId: p.id,
    collisionLine,
    name: p.name,
    csm: p.csm,
    sourcesLine: sources.join(" · "),
    title: titleFor(queueItem),
    story: redactMoney(storyBits.join(" ")),
    composed,
    people,
    singleThread,
    threadCount,
    // The relationship's email or NOTHING — the book's seed must never ride
    // under a letter greeting the record's person (Ted doctrine). No address
    // beats the wrong address; the draft button simply doesn't render.
    contactEmail:
      rel.source === "record" ? rel.email : rel.email || (p.contactEmail ?? ""),
    russ: paragraphFor(p, { intel, intent, queueItem }),
    history: hist.slice(-HISTORY_CAP),
  };
}

// The worked stamp for a queue row: the done key + its rendered label.
export function workedStamp(
  doneTimes: Map<string, string>,
  dayKey: string,
  moveKey: string,
): string | null {
  const at = doneTimes.get(`groundwork:${dayKey}:${moveKey}`);
  return at ? `✓ ${clockShort(at)}` : null;
}

export function groundworkDoneKey(now: Date, mk: string): string {
  return `groundwork:${userDayKey(now)}:${mk}`;
}

// The durable readout-read stamp key — Russ's pull tab records its last copy
// against this, doneAt moving forward on each read (never day-scoped).
export const READOUT_READ_KEY = "groundwork:readout-read";

export { WIRE_NS };
