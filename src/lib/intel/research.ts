// The research loop — the app runs no LLM. Intelligence enters by hand:
// build a precise prompt from what the corpus already knows, copy it, run it
// in claude.ai, paste what comes back into a note. Money never rides along.

import { redactMoney } from "./lexicon";

export type ResearchKind = "country" | "incumbent" | "licensing" | "custom";

const FOCUS: Record<ResearchKind, string> = {
  country:
    "Focus on employment law, employer costs, notice periods, and anything that affects EOR vs contractor-of-record in the countries named.",
  incumbent:
    "Focus on the incumbent provider named: current market position, known gaps, integration track record, and where a switch typically bites.",
  licensing:
    "Focus on what operating payroll in-country requires: registrations, licensing, data residency, and what a licensee must hold vs what the platform provides.",
  custom: "",
};

export function researchPrompt(
  kind: ResearchKind,
  ctx: { account: string; countries: string[]; known: string[]; question: string },
): string {
  const lines = [
    "You are researching for a PrismHR Global deal.",
    "",
    `Account: ${ctx.account}`,
    ctx.countries.length ? `Countries in play: ${ctx.countries.join(", ")}` : "",
    ctx.known.length
      ? `What we already know:\n${ctx.known.map((k) => `- ${redactMoney(k)}`).join("\n")}`
      : "",
    "",
    `Question: ${redactMoney(ctx.question)}`,
    FOCUS[kind],
    "",
    "Return bullet facts with sources; flag anything that changes the pitch.",
  ];
  return lines.filter((l) => l !== "").join("\n");
}

export const CLAUDE_NEW_URL = "https://claude.ai/new";
