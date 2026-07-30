// Composers — the "composed thing" every file carries (spec F3). Controls
// doctrine (plan §3.5): a control opens the composed thing, hands over exact
// words addressed to a named person, or files a bring-back. These builders
// make the words; nothing here sends anything. Every string passes redactMoney
// and stays inside the §3 voice: names introduce themselves, dates carry their
// meaning, no trade shorthand.

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

const firstName = (full: string): string => (full ?? "").trim().split(/\s+/)[0] || full;

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
  const who = contactName || "your contact there";
  const countries = countryNames(intel);
  const where = countries.length ? countries.join(", ") : "the countries on the table";

  switch (ruleId) {
    case "decision-window": {
      const when = intel?.timing?.value.dateIso
        ? ` before ${monthDay(intel.timing.value.dateIso)}`
        : "";
      return {
        kind: "send-draft",
        label: `Copy the draft — to ${firstName(who)}`,
        to: who,
        payload: redactMoney(
          `To: ${who}\nSubject: The answer you're waiting on\n\n${firstName(who)} — ahead of your decision${when}: here is the piece you asked for, in plain terms. On ${where}: we can carry the setup end to end, and the compliance exposure ends the day the switch happens. Name the slot and we'll walk your leadership through exactly how the handoff works.`,
        ),
      };
    }
    case "reply-owed":
      return {
        kind: "reply-frame",
        label: `Copy the reply frame — to ${firstName(who)}`,
        to: who,
        payload: redactMoney(
          `To: ${who}\n\n${firstName(who)} — thanks for this. Answering your note point by point below, and one question back so we keep moving: what would you need in hand from us to take the next step on your side?`,
        ),
      };
    case "meeting-prep":
      return {
        kind: "prep",
        label: "Copy the prep sheet",
        to: "yourself, before the meeting",
        payload: redactMoney(
          `Prep — ${account.name}\n· Who's in the room and what each cares about\n· The one open question on the record: ${intel?.direction?.line ?? "confirm the current state in their words"}\n· Countries in play: ${where}\n· The one thing to leave with: a dated next step`,
        ),
      };
    case "intent-warm":
      return {
        kind: "relay-note",
        label: `Copy the note — to ${firstName(account.csm)}`,
        to: account.csm,
        payload: redactMoney(
          `To: ${account.csm}\n\n${firstName(account.csm)} — ${account.name} lit up on LinkedIn this week: their people have been reading our Global material${intent?.activities ? ` (${intent.activities} separate engagements)` : ""}. Can they take the top slot in your next update? The question to relay, word for word: "${relayLine("fp-where")}"`,
        ),
      };
    case "riding-lane":
      return {
        kind: "ride-ask",
        label: "Copy the ask — to the colleague named on the deal",
        to: "the colleague named on the Salesforce opportunity",
        payload: redactMoney(
          `To: [the colleague named on the opportunity — open it in Salesforce; the owner's name is printed on it]\n\nQuick one on ${account.name}. I see your conversation there dated ${laneDate ? monthDay(laneDate) : "this month"}. ${intent ? "Their people have been reading our Global material this week. " : ""}Would you carry one Global sentence into that conversation, or would you rather I join? Either way it stays your room.`,
        ),
      };
    case "roundup-slot":
      return {
        kind: "relay-note",
        label: `Copy the note — to ${firstName(account.csm)}`,
        to: account.csm,
        payload: redactMoney(
          `To: ${account.csm}\n\n${firstName(account.csm)} — your update is due and ${account.name} is the roster's best fit for Global right now. The question to relay, word for word: "${relayLine("fp-where")}" If anything comes back, I'll take it from there with you in the loop.`,
        ),
      };
    case "stale-above-gate":
      return {
        kind: "recipe",
        label: "Copy the refresh recipe",
        to: "your research session",
        payload: `Research refresh — ${account.name}\nAccount page: Account IQ (how they make money) · company + department headcount growth · Spotlight: job opportunities BY GEOGRAPHY (jobs posted into other countries are the strongest demand signal there is) · recent company posts.\nBring back: anything that changes the demand read. It files to the research trail.`,
      };
    case "stakeholder-gap":
      return {
        kind: "recipe",
        label: "Copy the people recipe",
        to: "your research session",
        payload: `Sales Navigator · Relationship explorer on ${account.name} — Persona: Recommended buyer persona · Function: HR, Operations, Finance · Seniority: Director, VP, CXO → harvest every "! Update CRM" card and any "Follows your company" mark → bring back 3–5 names with titles. They file as candidates; you confirm before anything sticks.`,
      };
    case "never-touched-incumbent":
      return {
        kind: "relay-note",
        label: `Copy the note — to ${firstName(account.csm)}`,
        to: account.csm,
        payload: redactMoney(
          `To: ${account.csm}\n\n${firstName(account.csm)} — ${account.name} already runs on our platform and has never been introduced to Global; for them it's a tab to turn on, not a project. Worth a line in your next touch? The question to relay, word for word: "${relayLine("fp-where")}"`,
        ),
      };
  }
}
