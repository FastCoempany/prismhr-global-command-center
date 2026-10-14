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
import type { IntentSignal, PersonSignal } from "./signals";
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

// A post's opening words for a quote: at most twelve words, cut at a word,
// with an ellipsis when the post goes on.
const openingWords = (snippet: string): string => {
  const words = (snippet ?? "")
    .replace(/(?:…|\.\.\.)$/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "";
  return words.length > 12 ? `${words.slice(0, 12).join(" ")}…` : words.join(" ");
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
  /** post-trigger and new-in-seat: the person Sales Navigator named. */
  person?: PersonSignal | null;
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
    person,
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
      // gem's act is the move, its reason the grounding. The lane's saved
      // draft (actdraft:) stays the lane's; the stage reads the seat alone
      // and composes this from the gem.
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
    case "post-trigger": {
      // The lead posted; the note is a direct message about the post, to the
      // person who wrote it, by name. It quotes only the post's opening
      // words, cut at a word, and claims nothing else about it.
      const who = person?.name ?? "";
      const pFirst = firstName(who);
      const snippet = openingWords(person?.snippet ?? "");
      return {
        kind: "send-draft",
        label: pFirst ? `Copy the message — to ${pFirst}` : "Copy the message",
        to: who
          ? `${who}${person?.title ? `, ${person.title}` : ""}. A LinkedIn message.`
          : "the person who posted. A LinkedIn message.",
        payload: redactMoney(
          `To: ${who || "the person who posted"}\n\n${pFirst ? `Hi ${pFirst} —` : "Hi —"} saw your post${snippet ? ` about "${snippet}"` : ""}. I work on the Global side at PrismHR, so we employ and pay people outside the US for PEO clients. Honestly, if any of your clients have people abroad or ask about it, I'd be glad to compare notes sometime.`,
        ),
      };
    }
    case "new-in-seat": {
      // Someone new in seat at the account, by Sales Navigator's own badge
      // or job alert. The note welcomes them by name and offers the short
      // version; it never says how we know.
      const who = person?.name ?? "";
      const pFirst = firstName(who);
      const title = (person?.title ?? "").trim();
      return {
        kind: "send-draft",
        label: pFirst ? `Copy the note — to ${pFirst}` : "Copy the note",
        to: who
          ? `${who}${title ? `, ${title}` : ""}. A LinkedIn message.`
          : "the new person in seat. Add the name before sending.",
        payload: redactMoney(
          `To: ${who || "the new person in seat"}\nSubject: Congrats on the new role\n\n${pFirst ? `Hi ${pFirst} —` : "Hi —"} congrats on the new role${title ? ` as ${title}` : ""} at ${account.name}. I work on PrismHR Global, which employs and pays people outside the US for PEO clients. Once you've settled in, I'd be glad to walk you through it, kind of a fifteen-minute version. If any of your clients have people abroad today, I can start there.`,
        ),
      };
    }
    case "contact-left": {
      // Someone at the account took a job elsewhere. The note goes to them,
      // on LinkedIn (their old address is dead): congratulations, and who
      // picks up their work at the account. It leaves them holding nothing
      // they owe us, and keeps the door open where they landed.
      const who = person?.name ?? "";
      const pFirst = firstName(who);
      const where = (person?.company ?? "").trim();
      return {
        kind: "send-draft",
        label: pFirst ? `Copy the message — to ${pFirst}` : "Copy the message",
        to: who
          ? `${who}, now${where ? ` at ${where}` : " elsewhere"}. A LinkedIn message; their old address is gone.`
          : "the person who left. A LinkedIn message.",
        payload: redactMoney(
          `To: ${who || "the person who left"}\n\n${pFirst ? `Hi ${pFirst} —` : "Hi —"} congrats on the move${where ? ` to ${where}` : ""}. Quick one: who's picking up your work at ${account.name}? I'd like to keep them in the loop on the Global side. And once you've settled in, I'd be glad to walk you through it there too, if it's useful.`,
        ),
      };
    }
    case "intent-warm":
      // Direct doctrine: the note goes to the account's own person, not
      // through the partner manager. The intent reading decides WHO gets a
      // note today; it never rides inside the note. Sales Nav's buyer intent
      // counts engagement with PrismHR's LinkedIn presence as a whole, so a
      // claim about "our Global material" overstates the evidence, and
      // quoting someone's engagement back to them tells them they were
      // watched (evidence or nothing; 2026-10-14).
      return {
        kind: "send-draft",
        label: `Copy the note${labelTo}`,
        to: toContact,
        payload: redactMoney(
          `To: ${toContact}\nSubject: One question about your clients\n\n${greet} I work on PrismHR Global, which employs and pays people outside the US for your clients. One question to see whether it's worth a conversation: ${relayLine("fp-where").toLowerCase()} If a walkthrough is faster than email, name a slot and I'll bring answers.`,
        ),
      };
    case "riding-lane":
      return {
        kind: "ride-ask",
        label: "Copy the ask — to the coworker named on the opportunity",
        to: "the coworker named on the Salesforce opportunity. The name is printed on it. The link below opens it.",
        payload: redactMoney(
          `To: [the coworker named on the opportunity. Open the account in Salesforce. The owner's name is printed on it.]\n\nQuick one on ${account.name}. I see your opportunity there closing ${laneDate ? monthDay(laneDate) : "this month"}. ${intent ? "Their people have been engaging with PrismHR on LinkedIn this week. " : ""}Would you carry one Global sentence into that conversation, or would you rather I join? Either way it stays your room.`,
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
          `Sales Navigator · Relationship explorer on ${account.name} — Persona: Recommended buyer persona · Function: HR, Operations, Finance · Seniority: Director, VP, CXO → click ▤ Grab Sales Nav people and paste it into the account's ⚡ box. The cards file on the account's record with their titles, "! Update CRM" flags and "Follows your company" marks. Nobody joins the contact roster until you add them.`,
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
