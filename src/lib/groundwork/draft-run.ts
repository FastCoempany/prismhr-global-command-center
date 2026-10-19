// The drafts job (ship order 2026-10-19): before the send band, every email
// move the stage and the waiting wing will show gets its note written, read
// from the same day the page reads (loadGroundworkDay). Redraft on the stage
// runs the same builder for one move. A draft is a stagedraft:<account> note
// and never reaches the record.

import { getPeo, type Peo } from "@/lib/book";
import { contactsFor, personKey } from "@/lib/book/contacts";
import { relationshipFor } from "@/lib/intel/relationship";
import { redactMoney } from "@/lib/intel/lexicon";
import { createAccountNoteRow } from "@/lib/notes/write";
import { SOURCES } from "@/lib/ingest/dialect";
import { userDayKey } from "@/lib/tz";
import {
  collisionFor,
  engagedNeverIntroduced,
  intentWarm,
  outreachGem,
} from "@/lib/activity/read";
import { composeFor } from "./compose";
import { moveKey, type QueueItem } from "./day";
import { draftWithModel, type DraftPack } from "./drafter";
import { liveMoves } from "./worked";
import { splitPayload } from "./spine";
import type { GroundworkDay } from "./load";
import {
  STAGE_DRAFT_NS,
  collisionInstruction,
  draftForMove,
  draftedToday,
  isEmailRule,
  renderStageDraft,
  type EvidenceKey,
  type StageDraft,
} from "./stage-draft";

/** How many live moves the job drafts: the stage and the waiting wing. */
export const DRAFT_AHEAD = 6;

/** The address and name a move's note goes to: the record's relationship,
 *  the book's seed only when the account has no read (the Ted doctrine). */
export function recipientFor(
  day: Pick<GroundworkDay, "readById">,
  p: Peo,
): { name: string; email: string; title: string } {
  const rel =
    day.readById.get(p.id)?.relationship ??
    relationshipFor([], contactsFor(p.id), {
      name: p.contactName,
      email: p.contactEmail,
    });
  const key = personKey(rel.name);
  const book = key
    ? contactsFor(p.id).find((c) => personKey(`${c.first} ${c.last}`) === key)
    : undefined;
  return {
    name: rel.name,
    email: rel.email || (rel.source === "book" ? (p.contactEmail ?? "") : ""),
    title: book?.title ?? "",
  };
}

/** The pack the model drafts from, and the composer's note it falls back
 *  to, for one move. */
export function packFor(
  day: GroundworkDay,
  item: QueueItem,
  now: Date,
): {
  pack: DraftPack;
  template: { subject: string; body: string };
  to: { name: string; email: string };
} | null {
  const p = getPeo(item.accountId);
  if (!p) return null;
  const to = recipientFor(day, p);
  const sr = day.secondFolded.get(p.id);
  const gem = outreachGem(sr);
  const warm = sr ? intentWarm(sr, now) : null;
  const intent = sr?.intent
    ? { opens30: sr.intent.windows.w30.o, clicks30: sr.intent.windows.w30.c }
    : warm
      ? { opens30: warm.opens30, clicks30: warm.clicks30 }
      : null;
  const support = engagedNeverIntroduced(sr, now)?.cases ?? sr?.support?.total ?? null;
  let wire = "";
  let wireAt = "";
  for (const w of day.wireItems)
    if (w.accountIds.includes(p.id) && w.at > wireAt) {
      wire = w.headline;
      wireAt = w.at;
    }
  const composed = composeFor({
    ruleId: item.ruleId,
    account: p,
    intel: day.intelById.get(p.id),
    intent: day.intentById.get(p.id) ?? null,
    contactName: to.name,
    wireHeadline: wire || null,
    supportCases: support ?? undefined,
    gem: gem ? { act: gem.act, reason: gem.reason, term: gem.term, who: gem.who } : null,
    person: item.person ?? null,
  });
  const parts = splitPayload(composed.payload);
  const template = { subject: parts.subject, body: parts.body };
  const record = (day.accountNotes.get(p.id) ?? [])
    .slice(0, 8)
    .map(
      (n) =>
        `${n.createdAt.slice(0, 10)}: ${redactMoney((n.body.split("\n")[0] ?? "").slice(0, 180))}`,
    );
  return {
    to,
    template,
    pack: {
      account: p.name,
      action: item.action,
      reason: item.reason,
      to: { name: to.name, title: to.title },
      template,
      wire,
      research: day.researchByAccount.get(p.id)?.line ?? "",
      gem: gem ? { act: gem.act, reason: gem.reason } : null,
      intent,
      support,
      record,
      collision: collisionInstruction(collisionFor(sr, now, day.readById.get(p.id))),
    },
  };
}

/** The evidence a composer's note stands on, by its rule, for the fold. */
function templateUses(item: QueueItem): EvidenceKey[] {
  switch (item.ruleId) {
    case "wire-trigger":
      return ["wire"];
    case "second-record-gem":
    case "seated":
      return ["gem"];
    case "engaged-never-introduced":
      return ["support"];
    default:
      return [];
  }
}

/** Draft one move: the model's note, or the composer's when the model has
 *  no answer. Writes the stagedraft note and hands back what it wrote. */
export async function draftMove(
  day: GroundworkDay,
  item: QueueItem,
  now: Date,
  write: (accountId: string, body: string) => Promise<void> = writeDraftNote,
): Promise<StageDraft | null> {
  if (!isEmailRule(item.ruleId)) return null;
  const built = packFor(day, item, now);
  if (!built) return null;
  const model = await draftWithModel(built.pack);
  const draft: StageDraft = {
    day: userDayKey(now),
    mk: moveKey(item),
    by: model ? "model" : "template",
    to: built.to.name,
    email: built.to.email,
    subject: model?.subject || built.template.subject,
    uses: model ? model.uses : templateUses(item),
    body: model?.body || built.template.body,
  };
  await write(item.accountId, renderStageDraft(draft));
  return draft;
}

export async function writeDraftNote(accountId: string, body: string): Promise<void> {
  await createAccountNoteRow({
    accountId: `${STAGE_DRAFT_NS}${accountId}`,
    kind: "account",
    body,
    door: "hand",
    lane: "background",
    actors: "",
    source: SOURCES.stageDraft,
  });
}

/** The moves the job drafts today: the first live moves, email rules only,
 *  each without today's draft. */
export function movesToDraft(day: GroundworkDay, now: Date): QueueItem[] {
  const live = liveMoves(day.rankedAll, day.doneTimes, userDayKey(now)).slice(
    0,
    DRAFT_AHEAD,
  );
  return live.filter((q) => {
    if (!isEmailRule(q.ruleId)) return false;
    const d = draftForMove(
      day.notesMap.get(`${STAGE_DRAFT_NS}${q.accountId}`),
      moveKey(q),
      now,
    );
    return !draftedToday(d, now);
  });
}

/** Run the job: draft every move that needs one, three at a time. */
export async function runDrafts(
  day: GroundworkDay,
  now: Date,
): Promise<{ drafted: number; model: number; moves: number }> {
  const moves = movesToDraft(day, now);
  let drafted = 0;
  let model = 0;
  for (let i = 0; i < moves.length; i += 3) {
    const out = await Promise.all(
      moves.slice(i, i + 3).map((q) => draftMove(day, q, now).catch(() => null)),
    );
    for (const d of out)
      if (d) {
        drafted++;
        if (d.by === "model") model++;
      }
  }
  return { drafted, model, moves: moves.length };
}
