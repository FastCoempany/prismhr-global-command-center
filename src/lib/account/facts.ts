// One derivation of an account's standing, read by the accounts sheet AND by
// the brain (founder-decreed 2026-09-10).
//
// The fault it answers: the accounts drilldown rendered "CSM ANIKA STEENSTRA"
// while Ask the app answered "the record doesn't name a CSM on Infiniti HR
// directly" and then reasoned its way to her name from roundup sheet
// FILENAMES. The field was three lines from the code that denied it.
//
// The cause was not a missing field. src/lib/ask/live.ts was built to the
// 2026-08-18 decree — "the widest live source, never a private narrow one" —
// but that decree named three examples (the waiting state, the open sheet, the
// fresh record) and the implementation treated the examples as the list. The
// page kept growing columns; the brain's copy of the list did not; nothing
// failed, because nothing compared them.
//
// So the fix is not a longer list. A list is a copy and copies drift. This
// module is the single derivation: the sheet's meta line and the brain's
// claim lines are both rendered FROM IT, so a fact added here reaches both,
// and a fact the sheet shows cannot be one the brain lacks. The parity is
// pinned by test in tests/account-facts.test.ts.
//
// Everything here is pure and cheap — the seed row plus the static research
// file. No query belongs in this module; the callers bring what they loaded.

import type { Peo } from "@/lib/book";
import { analyzePlay, getDemand } from "@/lib/book/research";
import { deskScore } from "@/lib/book/scoring";

export type AccountFacts = {
  id: string;
  name: string;
  /** The colleague who owns the relationship. The whole reason this exists. */
  csm: string;
  industry: string;
  /** The platform they run on, or the honest negative. */
  platform: string;
  city: string;
  state: string;
  play: "greenfield" | "displacement" | null;
  competitors: string[];
  /** Set by the caller from the room's own board read. */
  onDashboard: boolean;
};

export function accountFacts(
  p: Peo,
  live?: { lastActivityIso?: string; now?: Date; onDashboard?: boolean },
): AccountFacts {
  const d = deskScore(p, { lastActivityIso: live?.lastActivityIso, now: live?.now });
  const dem = getDemand(p.id);
  const basePlay = analyzePlay(dem);
  // The sheet re-gates play on a researched demand score; below the gate the
  // research file's own call stands. Kept identical here so the two agree.
  const demand = dem?.researched ? dem.demandScore : null;
  const play =
    demand != null && demand >= 30
      ? basePlay.competitors.length
        ? "displacement"
        : "greenfield"
      : demand == null
        ? basePlay.play
        : null;
  return {
    id: p.id,
    name: p.name,
    csm: (p.csm ?? "").trim(),
    industry: (p.industry ?? "").trim(),
    platform: d.incumbent ? p.cloud : "not a platform customer",
    city: (p.city ?? "").trim(),
    state: (p.state ?? "").trim(),
    play: play as AccountFacts["play"],
    competitors: basePlay.competitors,
    onDashboard: !!live?.onDashboard,
  };
}

/** The drilldown's meta line, exactly as the sheet renders it. */
export function metaLine(f: AccountFacts): string {
  const bits = [
    "MODEL",
    f.industry || "—",
    "PRISMHR",
    f.platform,
    ...(f.city
      ? [`${f.city.toUpperCase()}${f.state ? `, ${f.state.toUpperCase()}` : ""}`]
      : []),
    ...(f.csm ? [`CSM ${f.csm.toUpperCase()}`] : []),
    ...(f.play === "greenfield" ? ["PLAY", "GREENFIELD"] : []),
    ...(f.play === "displacement"
      ? [
          "PLAY",
          `DISPLACE${f.competitors.length ? ` (${f.competitors.join(" / ").toUpperCase()})` : ""}`,
        ]
      : []),
  ];
  return bits.join(" · ");
}

/** The same facts as claim-sized sentences, for the brain to answer from and
 *  cite. One fact per line: the synthesizer weighs lines, not paragraphs. */
export function factLines(f: AccountFacts): string[] {
  const out: string[] = [];
  if (f.csm)
    out.push(
      `${f.csm} is the CSM on ${f.name} — the colleague who owns the account relationship (the book).`,
    );
  const where = f.city ? `${f.city}${f.state ? `, ${f.state}` : ""}` : "";
  if (f.industry || where)
    out.push(
      `${f.name} is ${f.industry ? `a ${f.industry} account` : "an account"}${where ? ` in ${where}` : ""}.`,
    );
  out.push(
    f.platform === "not a platform customer"
      ? `${f.name} is not a PrismHR platform customer.`
      : `${f.name} runs on PrismHR ${f.platform}.`,
  );
  if (f.play === "displacement")
    out.push(
      `The play on ${f.name} is displacement${f.competitors.length ? ` — ${f.competitors.join(", ")} holds the work` : ""}.`,
    );
  if (f.play === "greenfield") out.push(`The play on ${f.name} is greenfield.`);
  if (f.onDashboard)
    out.push(`${f.name} is on the dashboard and was cleared with the CSM.`);
  return out;
}
