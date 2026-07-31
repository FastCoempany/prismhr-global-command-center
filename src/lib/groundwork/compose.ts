// Composers — the "composed thing" every file carries (spec F3). Controls
// doctrine (plan §3.5): a control opens the composed thing, hands over exact
// words addressed to a named person, or files a bring-back. These builders
// make the words; nothing here sends anything. Every string passes redactMoney
// and stays inside the §3 voice: names introduce themselves, dates carry their
// meaning, no trade shorthand — and when the book has no name to address, the
// text says so plainly instead of garbling.

import type { Peo } from "@/lib/book";
import type { DealIntel } from "@/lib/intel/types";
import { COUNTRY_NAME, redactMoney } from "@/lib/intel/lexicon";
import { DISCOVERY } from "@/lib/intel/discovery";
import type { IntentSignal } from "./signals";
import type { QueueRuleId } from "./day";

export type Composed = {
  kind: "send-draft" | "relay-note" | "ride-ask" | "recipe" | "reply-frame" | "prep";
  label: string; // the button text — names the recipient where one exists
  to: string; // who the words are addressed to, plainly
  payload: string; // the exact text the copy control puts on the clipboard
};

const monthDay = (iso: string) => {
  const t = Date.parse(`${iso}T12:00:00Z`);
  return new Date(t).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

const countryNames = (intel: DealIntel | undefined): string[] =>
  (intel?.countries ?? []).map((c) => COUNTRY_NAME[c.value] ?? c.value).slice(0, 3);

const relayLine = (id: string): string =>
  DISCOVERY.find((q) => q.id === id)?.relayLine ??
  "Which countries do your clients have people in today?";

// A real first name, or "" when the book has none — callers must handle "".
const firstName = (full: string): string => {
  const name = (full ?? "").trim();
  if (!name || name === "Unassigned") return "";
  return name.split(/\s+/)[0];
};

// The partner manager, named — or the plain fallback when the book has no
// assignment (§3.5: addressed to a named person, or say who plainly).
const pmName = (csm: string): string => {
  const name = (csm ?? "").trim();
  return name && name !== "Unassigned" ? name : "";
};

// One composer per queue rule — the rule that put the account in front decides
// what the file hands you.
export function composeFor(args: {
  ruleId: QueueRuleId;
  account: Peo;
  intel?: DealIntel;
  intent: IntentSignal | null;
  contactName: string; // book primary, may be ""
  laneDate?: string | null; // riding-lane CRM date, ISO day
}): Composed {
  const { ruleId, account, intel, intent, contactName, laneDate } = args;
  const first = firstName(contactName);
  const toContact = first ? contactName : "the client contact (add before sending)";
  const greet = first ? `${first} —` : "Hi —";
  const labelTo = first ? ` — to ${first}` : "";
  const pm = pmName(account.csm);
  const pmFirst = pm ? pm.split(/\s+/)[0] : "";
  const toPm =
    pm || "their partner manager (unassigned in the book — route it with Aleks)";
  const pmGreet = pm ? `${pmFirst} —` : "Quick one —";
  const pmLabel = pm ? ` — to ${pmFirst}` : "";
  const countries = countryNames(intel);
  const where = countries.length ? countries.join(", ") : "the countries on the table";

  switch (ruleId) {
    case "decision-window": {
      const when = intel?.timing?.value.dateIso
        ? ` before ${monthDay(intel.timing.value.dateIso)}`
        : "";
      return {
        kind: "send-draft",
        label: `Copy the draft${labelTo}`,
        to: toContact,
        payload: redactMoney(
          `To: ${toContact}\nSubject: The answer you're waiting on\n\n${greet} ahead of your decision${when}: here is the piece you asked for, in plain terms. On ${where}: we can carry the setup end to end, and the compliance exposure ends the day the switch happens. Name the slot and we'll walk your leadership through exactly how the handoff works.`,
        ),
      };
    }
    case "reply-owed":
      return {
        kind: "reply-frame",
        label: `Copy the reply frame${labelTo}`,
        to: toContact,
        payload: redactMoney(
          `To: ${toContact}\n\n${greet} thanks for this. Answering your note point by point below, and one question back so we keep moving: what would you need in hand from us to move forward on your side?`,
        ),
      };
    case "meeting-prep":
      return {
        kind: "prep",
        label: "Copy the prep sheet",
        to: "yourself, before the meeting",
        payload: redactMoney(
          `Prep — ${account.name}\n· Who's in the room and what each cares about\n· The one open question on the record: ${intel?.direction?.line ?? "confirm the current state in their words"}\n· Countries in play: ${where}\n· The one thing to leave with: a dated commitment`,
        ),
      };
    case "intent-warm":
      return {
        kind: "relay-note",
        label: `Copy the note${pmLabel || " — for the account's partner manager"}`,
        to: toPm,
        payload: redactMoney(
          `To: ${toPm}\n\n${pmGreet} ${account.name} lit up on LinkedIn this week: their people have been reading our Global material${intent?.activities ? ` (${intent.activities} separate engagements)` : ""}. Can they take the top slot in your next update? The question to relay, word for word: "${relayLine("fp-where")}"`,
        ),
      };
    case "riding-lane":
      return {
        kind: "ride-ask",
        label: "Copy the ask — to the coworker named on the opportunity",
        to: "the coworker named on the Salesforce opportunity (their name is printed on it — the link below opens it)",
        payload: redactMoney(
          `To: [the coworker named on the opportunity — open the account in Salesforce; the owner's name is printed on it]\n\nQuick one on ${account.name}. I see your opportunity there closing ${laneDate ? monthDay(laneDate) : "this month"}. ${intent ? "Their people have been reading our Global material this week. " : ""}Would you carry one Global sentence into that conversation, or would you rather I join? Either way it stays your room.`,
        ),
      };
    case "roundup-slot":
      return {
        kind: "relay-note",
        label: `Copy the note${pmLabel || " — for the account's partner manager"}`,
        to: toPm,
        payload: redactMoney(
          `To: ${toPm}\n\n${pmGreet} your update is due and ${account.name} is the strongest Global fit on your list right now. The question to relay, word for word: "${relayLine("fp-where")}" If anything comes back, I'll take it from there with you in the loop.`,
        ),
      };
    case "stale-above-gate":
      return {
        kind: "recipe",
        label: "Copy the refresh recipe",
        to: "your research session",
        payload: redactMoney(
          `Research refresh — ${account.name}\nAccount page: Account IQ (how they make money) · company + department headcount growth · Spotlight: job opportunities BY GEOGRAPHY (jobs posted into other countries are the strongest demand signal there is) · recent company posts.\nBring back: anything that changes the demand read. It files to the research trail.`,
        ),
      };
    case "stakeholder-gap":
      return {
        kind: "recipe",
        label: "Copy the people recipe",
        to: "your research session",
        payload: redactMoney(
          `Sales Navigator · Relationship explorer on ${account.name} — Persona: Recommended buyer persona · Function: HR, Operations, Finance · Seniority: Director, VP, CXO → harvest every "! Update CRM" card and any "Follows your company" mark → bring back 3–5 names with titles. They file as candidates; you confirm before anything sticks.`,
        ),
      };
    case "never-touched-incumbent":
      return {
        kind: "relay-note",
        label: `Copy the note${pmLabel || " — for the account's partner manager"}`,
        to: toPm,
        payload: redactMoney(
          `To: ${toPm}\n\n${pmGreet} ${account.name} already runs on our platform and has never been introduced to Global; for them it's a tab to turn on, not a project. Worth a line in your next touch? The question to relay, word for word: "${relayLine("fp-where")}"`,
        ),
      };
  }
}

// The widening question — appended by the file when a conversation rides on
// one person, so the claim "it's part of the composed text" is always true.
export const WIDENING_LINE =
  'And the widening question, when it fits: "Who else on your side — leadership or operations — should be in this conversation?"';
