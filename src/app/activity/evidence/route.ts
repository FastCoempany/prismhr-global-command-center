// The meat law's door — the ONE place staged slice bodies leave the store
// (the covenant's import guard: faces render counts and terms; this route
// serves the evidence beneath them). A plain GET, never a server action, so
// a drill click can never knock over a navigation.
//
// Modes, by query param:
//   ?acct=<id>&k=<rowKey>      → one row's cleaned excerpt
//   ?acct=<id>&case=<number>   → a case's timeline (rows + excerpts); the
//                                uncased key (no-case) opens the uncased
//                                support rows, with &theme= when it carries one
//   ?acct=<id>&theme=<label>   → the theme's case list (numbers · dates · actors)
//   ?acct=<id>&camps=1         → the intent store's campaign table
//   ?acct=<id>&who=<name>      → the draft desk's one cited line for a recipient

import { NextResponse } from "next/server";
import { getAppAccess } from "@/lib/auth";
import { hasDatabaseEnv } from "@/lib/db";
import { deskLineFor, fetchSecondRecordFor, fetchStageRows } from "@/lib/activity/read";
import {
  caseRows,
  cleanExcerpt,
  cleanSubject,
  themeCaseGroups,
} from "@/lib/activity/excerpt";
import { rowPerson } from "@/lib/activity/classify";
import type { StagedRow } from "@/lib/activity/types";

export const dynamic = "force-dynamic";

const noStore = { headers: { "cache-control": "no-store" } };

// The reads here are the second record's own (src/lib/activity/read.ts), so
// they fold by canonical id with every other face (E17): a slice staged under
// the account's shell id is this account's evidence, and the one-key reads
// this route used to spell for itself were pass 2 C's narrow-read defect.

/** Who the row shows as its person — one rule with the writer's actors
 *  column (src/lib/activity/classify.ts). The recipients ride separately in
 *  `people`. */
const personOf = (r: StagedRow): string => rowPerson(r);

/** The row as the drill renders it — subject cleaned, excerpt cleaned again
 *  defensively (slices staged before the ingest cleaner keep their meat). */
const rowOut = (r: StagedRow) => ({
  k: r.k,
  day: r.d,
  who: personOf(r),
  people: r.p ? r.p.split(";").filter(Boolean) : [],
  subject: cleanSubject(r.s),
  lane: r.lane,
  excerpt: r.c ? cleanExcerpt(r.c) : "",
});

export async function GET(req: Request) {
  const access = await getAppAccess();
  if (access.status !== "active" || !hasDatabaseEnv())
    return NextResponse.json({ ok: false }, { status: 401, ...noStore });

  const url = new URL(req.url);
  const acct = url.searchParams.get("acct") ?? "";
  if (!acct) return NextResponse.json({ ok: false }, { status: 400, ...noStore });

  const k = url.searchParams.get("k");
  const who = url.searchParams.get("who");
  const caseNo = url.searchParams.get("case");
  const theme = url.searchParams.get("theme");
  const camps = url.searchParams.get("camps");

  if (camps) {
    const parsed = (await fetchSecondRecordFor(acct))?.intent ?? null;
    return NextResponse.json(
      { ok: true, windows: parsed?.windows ?? null, receipts: parsed?.receipts ?? 0 },
      noStore,
    );
  }

  if (who != null) {
    // The draft desk's per-person read (5.2): exact words from both records,
    // one line, and every line cites the row it stands on or says nothing
    // (evidence or nothing). Salesforce's account-level Last Email Received
    // has no row behind it, so it never speaks here and never as their voice
    // (D19). The line is the read layer's (deskLineFor).
    const [rows, second] = await Promise.all([
      fetchStageRows(acct),
      fetchSecondRecordFor(acct),
    ]);
    const desk = deskLineFor(who, rows, second?.rollup ?? null);
    return NextResponse.json(
      { ok: true, line: desk.line, cite: desk.cite ? rowOut(desk.cite) : null },
      noStore,
    );
  }

  const rows = await fetchStageRows(acct);

  if (k) {
    const row = rows.find((r) => r.k === k);
    return NextResponse.json(
      row
        ? { ok: true, row: rowOut(row) }
        : {
            ok: false,
            reason:
              "That row isn't in the staged slice. The slice keeps the newest 300 rows, and older citations retire with their drop.",
          },
      noStore,
    );
  }

  if (caseNo) {
    // The list and the door read one grouping (excerpt.ts), so the uncased
    // line opens its rows instead of an empty timeline (pass 9 seam, S-13).
    const timeline = caseRows(rows, caseNo, theme ?? "")
      .slice()
      .sort((a, b) => (a.d < b.d ? 1 : -1))
      .slice(0, 30)
      .map(rowOut);
    return NextResponse.json({ ok: true, caseNo, timeline }, noStore);
  }

  if (theme != null) {
    // The theme's cases: support rows whose cleaned subject folds to the
    // theme label (empty theme = every support case). One line per case
    // number — count, span, last actor — each a door to its timeline.
    const byCase = themeCaseGroups(rows, theme);
    const cases = [...byCase.entries()]
      .map(([no, list]) => {
        const days = list.map((r) => r.d).sort();
        const newest = list.sort((a, b) => (a.d < b.d ? 1 : -1))[0];
        return {
          caseNo: no,
          rows: list.length,
          firstDay: days[0],
          lastDay: days[days.length - 1],
          who: personOf(newest),
          subject: cleanSubject(newest.s),
        };
      })
      .sort((a, b) => (a.lastDay < b.lastDay ? 1 : -1))
      .slice(0, 40);
    return NextResponse.json({ ok: true, cases }, noStore);
  }

  // No mode: the newest staged rows, heads only — the generic evidence list.
  return NextResponse.json(
    { ok: true, rows: rows.slice(0, 40).map((r) => ({ ...rowOut(r), excerpt: "" })) },
    noStore,
  );
}
