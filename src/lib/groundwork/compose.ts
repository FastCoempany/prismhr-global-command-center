// Composers — the "composed thing" every file carries. Controls doctrine
// (plan §3.5): a control opens the composed thing, hands over exact words
// addressed to a named person, or files a bring-back. These builders make the
// words; nothing here sends anything. Every string passes redactMoney and
// stays inside the §3 voice: names introduce themselves, dates carry their
// meaning, no trade shorthand — and when the book has no name to address, the
// text says so plainly instead of garbling. Direct doctrine: sends go to the
// account's own people by default; the partner manager is a door you choose.

import type { Peo } from "@/lib/book";
import type { DealIntel } from "@/lib/intel/types";
import { COUNTRY_NAME, redactMoney } from "@/lib/intel/lexicon";
import { DISCOVERY } from "@/lib/intel/discovery";
import type { IntentSignal } from "./signals";
import type { QueueRuleId } from "./day";

export type Composed = {
  kind: "send-draft" | "relay-note" | "ride-ask" | "recipe";
  label: string; // the button text — names the recipient where one exists
  to: string; // who the words are addressed to, plainly
  payload: string; // the exact text the copy control puts on the clipboard
};

const monthDay = (iso: string) => {
  const t = Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(t)) return "";
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
  wireHeadline?: string | null; // wire-trigger: the matched item's headline
  supportCases?: number; // engaged-never-introduced: the pulse as ammunition
  gem?: { act: string; reason: string; term: string; who: string[] } | null;
}): Composed {
  const {
    ruleId,
    account,
    intel,
    intent,
    contactName,
    laneDate,
    wireHeadline,
    supportCases,
    gem,
  } = args;
  const first = firstName(contactName);
  const toContact = first
    ? contactName
    : "the client contact. Add the name before sending.";
  const greet = first ? `${first} —` : "Hi —";
  const labelTo = first ? ` — to ${first}` : "";
  const pm = pmName(account.csm);
  const pmFirst = pm ? pm.split(/\s+/)[0] : "";
  const toPm =
    pm || "their partner manager. Unassigned in the book. Route it with Aleks.";
  const pmGreet = pm ? `${pmFirst} —` : "Quick one —";
  const pmLabel = pm ? ` — to ${pmFirst}` : "";
  const countries = countryNames(intel);
  const where = countries.length ? countries.join(", ") : "the countries on the table";

  switch (ruleId) {
    case "seated":
      // The operator seated this from the accounts sheet's Act Lane — the
      // gem's act is the move, its reason the grounding, and any saved lane
      // draft outranks this composed fallback at the stage.
      return {
        kind: "send-draft",
        label: `Copy the note${labelTo}`,
        to: toContact,
        payload: redactMoney(
          `To: ${toContact}\nSubject: Picking up the thread\n\n${greet} ${gem?.reason ? `${gem.reason} ` : ""}${gem?.act ?? "The seated move goes here."} ${relayLine("fp-where")} If a walkthrough is faster than email, name a slot and I'll bring answers.`,
        ),
      };
    case "wire-trigger":
      return {
        kind: "send-draft",
        label: `Copy the note${labelTo}`,
        to: toContact,
        payload: redactMoney(
          `To: ${toContact}\nSubject: Saw the news\n\n${greet} saw the news${wireHeadline ? `: ${wireHeadline}` : ` about ${account.name}`}. A move like that usually puts people and payroll questions on the table across borders, and that is the seam Global exists for. One question while plans are still forming: ${relayLine("fp-where").toLowerCase()} If a walkthrough is faster than email, name a slot and I'll bring answers. On ${where}: the setup is a capability you switch on, not a project you buy.`,
        ),
      };
    case "intent-warm":
      // Direct doctrine: the reading-us note goes to the account's own
      // person, not through the partner manager.
      return {
        kind: "send-draft",
        label: `Copy the note${labelTo}`,
        to: toContact,
        payload: redactMoney(
          `To: ${toContact}\nSubject: The question forming on your side\n\n${greet} a few people on your side have been reading our Global material this week${intent?.activities ? ` (${intent.activities} separate engagements)` : ""}, so a question is already taking shape. Here it is, asked straight: ${relayLine("fp-where").toLowerCase()} If a walkthrough is faster than email, name a slot and I'll bring answers.`,
        ),
      };
    case "riding-lane":
      return {
        kind: "ride-ask",
        label: "Copy the ask — to the coworker named on the opportunity",
        to: "the coworker named on the Salesforce opportunity. The name is printed on it. The link below opens it.",
        payload: redactMoney(
          `To: [the coworker named on the opportunity. Open the account in Salesforce. The owner's name is printed on it.]\n\nQuick one on ${account.name}. I see your opportunity there closing ${laneDate ? monthDay(laneDate) : "this month"}. ${intent ? "Their people have been reading our Global material this week. " : ""}Would you carry one Global sentence into that conversation, or would you rather I join? Either way it stays your room.`,
        ),
      };
    case "silence-bump":
      return {
        kind: "send-draft",
        label: `Copy the second touch${labelTo}`,
        to: toContact,
        payload: redactMoney(
          `To: ${toContact}\nSubject: One question, then I'll leave it with you\n\n${greet} following my last note with the one question that decides whether this is worth your time: ${relayLine("fp-where").toLowerCase()} If the answer is none, tell me and I'll close the file. If it is anything else, fifteen minutes shows you what turning Global on looks like on the platform you already run.`,
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
          `Research refresh — ${account.name}\nAccount page: Account IQ for how they make money · company and department headcount growth · Spotlight: job opportunities by geography · recent company posts. Jobs posted into other countries are the strongest demand signal there is.\nBring back: anything that changes the demand read. It files to the research trail.`,
        ),
      };
    case "cold-revival":
      return {
        kind: "send-draft",
        label: `Copy the re-open${labelTo}`,
        to: toContact,
        payload: redactMoney(
          `To: ${toContact}\nSubject: Picking this back up, with something new\n\n${greet} picking this back up with something new rather than a nudge: the global side of the PEO world has moved since we last talked, and the question that decides whether it is worth reopening is the same one as before: ${relayLine("fp-where").toLowerCase()} If the answer is still none, say so and I'll leave it closed.`,
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
    case "engaged-never-introduced":
      // The support pulse is the door-opener: their teams already live on the
      // platform every day — the global conversation just never happened.
      return {
        kind: "send-draft",
        label: `Copy the first touch${labelTo}`,
        to: toContact,
        payload: redactMoney(
          `To: ${toContact}\nSubject: Your team already runs on us — one thing you may not know\n\n${greet} your team works with our platform every week${supportCases ? ` — ${supportCases} support threads this quarter alone` : ""} — and in all that traffic, one conversation has never happened: Global. It is a capability you switch on, not a project you buy. If any of your clients have people outside the US, or ask about it, fifteen minutes shows you what switching it on looks like. ${relayLine("fp-where")}`,
        ),
      };
    case "second-record-gem":
      // The gem's act IS the move; the file hands you the note that acts on
      // it, grounded in the cited motion. Evidence rides the card, not the
      // payload — the recipient never sees the machinery.
      return {
        kind: "send-draft",
        label: `Copy the note${labelTo}`,
        to: toContact,
        payload: redactMoney(
          `To: ${toContact}\nSubject: Picking up the live thread\n\n${greet} ${gem?.reason ? `${gem.reason} ` : ""}That is exactly the kind of motion the Global conversation belongs inside. ${relayLine("fp-where")} If a walkthrough is faster than email, name a slot and I'll bring answers.`,
        ),
      };
    case "never-touched-incumbent":
      // Direct doctrine: the first conversation opens with the account
      // itself. The partner manager is a door you may still choose, never
      // the toll.
      return {
        kind: "send-draft",
        label: `Copy the first touch${labelTo}`,
        to: toContact,
        payload: redactMoney(
          `To: ${toContact}\nSubject: Global, on the platform you already run\n\n${greet} ${account.name} runs on PrismHR today, which makes this the shortest version of this conversation anyone gets: Global is a capability you switch on, not a project you buy. If your clients have people outside the US, or ask about it, I'd like fifteen minutes to show you what switching it on looks like. ${relayLine("fp-where")}`,
        ),
      };
  }
}

// The widening question — appended by the file when a conversation rides on
// one person, so the claim "it's part of the composed text" is always true.
export const WIDENING_LINE =
  "And one more question: who else on your side, leadership or operations, should be in this conversation?";
