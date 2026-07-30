// The working file — everything the app knows about one account, composed per
// request from the stores' own lines (spec F1–F7). Nothing here is authored:
// the kicker's sources line lists only stores that actually contributed a
// fact, the history is the stores' own dated entries, and the Russ paragraph
// comes from the same builder as the full readout.

import type { Peo } from "@/lib/book";
import type { DealIntel } from "@/lib/intel/types";
import { getDemand, researchGeneratedAt } from "@/lib/book/research";
import { clockShort, userDayKey } from "@/lib/tz";
import type { IntentSignal } from "./signals";
import type { QueueItem } from "./day";
import { composeFor, type Composed } from "./compose";
import { paragraphFor } from "./readout";
import { WIRE_NS, type WireItem } from "./wire";

export type FilePerson = { name: string; title: string; flag: "csm" | "contact" | "" };
export type FileHistoryLine = { atIso: string; line: string };

export type FileModel = {
  accountId: string;
  name: string;
  csm: string;
  sourcesLine: string; // computed provenance — only stores that contributed
  title: string;
  story: string;
  composed: Composed;
  people: FilePerson[];
  singleThread: boolean;
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

function titleFor(item: QueueItem, p: Peo): string {
  switch (item.ruleId) {
    case "decision-window":
      return "Their decision is days away. What you owe them is composed.";
    case "reply-owed":
      return "Their message is the newest thing between you. Answer first.";
    case "meeting-prep":
      return "A dated follow-up lands inside 48 hours. Walk in prepared.";
    case "intent-warm":
      return "Their people are reading us. Warm rooms cool.";
    case "riding-lane":
      return "A colleague is already in the building. Ride, never knock.";
    case "roundup-slot":
      return `${p.csm.split(" ")[0]}'s update is due — this account goes first.`;
    case "stale-above-gate":
      return "Real demand on file, research gone quiet. Refresh before anyone calls.";
    case "stakeholder-gap":
      return "The book barely knows anyone here. Twenty minutes fixes that.";
    case "never-touched-incumbent":
      return "Already on our platform, never introduced. The cheapest conversation in the book.";
  }
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
    now: Date;
  },
): FileModel {
  const { queueItem, intel, intent, notes, touches, wire, contacts, laneDate } = deps;

  // Sources line — provenance, computed (spec F1).
  const sources: string[] = [];
  const newestNote = notes[0];
  const pasteNotes = notes.filter((n) => !n.source.startsWith("salesnav"));
  if (pasteNotes.length > 0)
    sources.push(`HomeRoom pastes ${shortDate(pasteNotes[0].createdAt)}`);
  if (getDemand(p.id)?.researched && researchGeneratedAt)
    sources.push(`research ${shortDate(`${researchGeneratedAt}T12:00:00Z`)}`);
  if (intent) sources.push(`Sales Nav read ${shortDate(intent.at)}`);
  const wireMatches = wire.filter((w) => w.accountIds.includes(p.id));
  if (wireMatches.length > 0) sources.push(`the wire ${shortDate(wireMatches[0].at)}`);
  if (sources.length === 0 && newestNote)
    sources.push(`notes ${shortDate(newestNote.createdAt)}`);

  // Story — identity + the situation + what the research adds (§3 voice).
  const demand = getDemand(p.id);
  const storyBits: string[] = [];
  storyBits.push(
    `${queueItem.situation.charAt(0).toUpperCase()}${queueItem.situation.slice(1)}.`,
  );
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

  // People — roster head + the partner manager, single-thread flag from intel.
  const people: FilePerson[] = [];
  if (p.contactName)
    people.push({ name: p.contactName, title: "book primary", flag: "contact" });
  for (const c of contacts.slice(0, 3)) {
    if (c.name && c.name !== p.contactName)
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

  return {
    accountId: p.id,
    name: p.name,
    csm: p.csm,
    sourcesLine: sources.join(" · "),
    title: titleFor(queueItem, p),
    story: storyBits.join(" "),
    composed: composeFor({
      ruleId: queueItem.ruleId,
      account: p,
      intel,
      intent,
      contactName: p.contactName,
      laneDate,
    }),
    people,
    singleThread: (intel?.threads.people.length ?? 0) === 1,
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

export { WIRE_NS };
