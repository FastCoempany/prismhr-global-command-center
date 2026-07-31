// Stage + signal → the next motion, with the relay line attached.
// A Motion is what to DO and what to SAY — the say lines follow the roundup
// voice: direct questions, no preamble, never a directive with a period.

import type { DashNodeKey } from "@/lib/dashboard/stages";
import type { DealIntel } from "./types";

export type SignalKey =
  | "contractsOut"
  | "demoDone"
  | "deadlineNear"
  | "singleThread"
  | "chairUndecided"
  | "staleInbound"
  | "mpexTrack"
  | "countriesUnknown";

export type Motion = {
  id: string;
  when: { stage?: DashNodeKey; signal: SignalKey };
  do: string;
  say: string;
};

export const MOTIONS: Motion[] = [
  {
    id: "chase-signature",
    when: { stage: "contract", signal: "contractsOut" },
    do: "Chase signature state — contracts age fastest in silence.",
    say: "Is anything blocking signature on your side I can clear today?",
  },
  {
    id: "recap-demo",
    when: { stage: "demo", signal: "demoDone" },
    do: "Send the recap with the promised follow-ups while the demo is fresh.",
    say: "What from the demo does your team want to see again in more depth?",
  },
  {
    id: "real-deadline",
    when: { signal: "deadlineNear" },
    do: "Confirm the real event behind the date and what they need in hand for it.",
    say: "What do you need from us in hand for that day — a decision, a price, or a demo?",
  },
  {
    id: "open-second-thread",
    when: { signal: "singleThread" },
    do: "Open a second thread — one-contact deals stall when that person goes quiet.",
    say: "Who else on your side — executive or operations — should be in this conversation?",
  },
  {
    id: "settle-chair",
    when: { stage: "needs_analysis", signal: "chairUndecided" },
    do: "Settle the commercial chair before proposal — it changes contracts, security, and pricing.",
    say: "Would you rather hold the client contract yourselves or have us contract directly and pay a referral fee?",
  },
  {
    id: "settle-chair-late",
    when: { stage: "proposal", signal: "chairUndecided" },
    do: "The chair is still open at proposal — resolve it NOW or the paper bounces.",
    say: "Before we paper this — are you contracting the client, or are we?",
  },
  {
    id: "revive-thread",
    when: { signal: "staleInbound" },
    do: "Re-open a quiet thread with a question, not a check-in.",
    say: "Has anything changed on the international side since we last spoke?",
  },
  {
    id: "mpex-scope",
    when: { signal: "mpexTrack" },
    do: "Licensing deals need scope before pricing — entities, volumes, growth rate.",
    say: "How many client companies would you expect to onboard in year one?",
  },
  {
    id: "map-countries",
    when: { signal: "countriesUnknown" },
    do: "No countries on file — the deal can't be scoped or priced without them.",
    say: "Which countries do you have workers in today, and roughly how many in each?",
  },
  {
    id: "arm-champion",
    when: { stage: "exec_summary", signal: "deadlineNear" },
    do: "Arm the internal champion — they carry the story into the meeting you're not in.",
    say: "What one-pager would make that leadership meeting easy for you?",
  },
  {
    id: "pre-demo-tailor",
    when: { stage: "demo", signal: "countriesUnknown" },
    do: "A demo without their countries loaded reads generic — get the list first.",
    say: "Which countries should the demo be set up with so it looks like your world?",
  },
  {
    id: "post-proposal-criteria",
    when: { stage: "proposal", signal: "staleInbound" },
    do: "Quiet after a proposal means an unanswered objection — surface it.",
    say: "What in the proposal would your team change if they could?",
  },
];

export function motionsFor(intel: DealIntel, stage: DashNodeKey): Motion[] {
  const signals = new Set<SignalKey>();
  if (intel.countries.length === 0) signals.add("countriesUnknown");
  if (intel.chair === "undecided") signals.add("chairUndecided");
  if (intel.threads.people.length < 2) signals.add("singleThread");
  if (intel.products.some((p) => p.value === "mpex")) signals.add("mpexTrack");
  if (intel.timing?.value.dateIso) {
    const days = (Date.parse(intel.timing.value.dateIso) - Date.now()) / 86_400_000;
    if (days >= -1 && days <= 7) signals.add("deadlineNear");
  }
  if (intel.lastInbound && Date.now() - Date.parse(intel.lastInbound) > 5 * 86_400_000)
    signals.add("staleInbound");

  return MOTIONS.filter(
    (m) => signals.has(m.when.signal) && (!m.when.stage || m.when.stage === stage),
  );
}
