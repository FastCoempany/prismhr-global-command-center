// The meat law's door — the ONE place staged slice bodies leave the store
// (the covenant's import guard: faces render counts and terms; this route
// serves the evidence beneath them). A plain GET, never a server action, so
// a drill click can never knock over a navigation.
//
// Modes, by query param:
//   ?acct=<id>&k=<rowKey>      → one row's cleaned excerpt
//   ?acct=<id>&case=<number>   → a case's timeline (rows + excerpts)
//   ?acct=<id>&theme=<label>   → the theme's case list (numbers · dates · actors)
//   ?acct=<id>&camps=1         → the intent store's campaign table
//   ?acct=<id>&who=<name>      → the draft desk's one line for a recipient

import { NextResponse } from "next/server";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import {
  STAGE_NS,
  INTENT_NS,
  ACTIVITY_NS,
  parseStageBody,
  parseIntentBody,
  parseRollupBody,
} from "@/lib/activity/stores";
import { caseNumberOf, cleanExcerpt, cleanSubject } from "@/lib/activity/excerpt";
import type { StagedRow } from "@/lib/activity/types";

export const dynamic = "force-dynamic";

const noStore = { headers: { "cache-control": "no-store" } };

async function stageRows(accountId: string): Promise<StagedRow[]> {
  const prisma = getPrisma();
  const rows = await prisma.accountNote.findMany({
    where: { accountId: `${STAGE_NS}${accountId}` },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  if (rows.length === 0) return [];
  return parseStageBody(rows[0].body)?.slice.rows ?? [];
}

/** The row as the drill renders it — subject cleaned, excerpt cleaned again
 *  defensively (slices staged before the ingest cleaner keep their meat). */
const rowOut = (r: StagedRow) => ({
  k: r.k,
  day: r.d,
  who: r.a,
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
    const prisma = getPrisma();
    const note = await prisma.accountNote.findFirst({
      where: { accountId: `${INTENT_NS}${acct}` },
      orderBy: { createdAt: "desc" },
    });
    const parsed = note ? parseIntentBody(note.body) : null;
    return NextResponse.json(
      { ok: true, windows: parsed?.windows ?? null, receipts: parsed?.receipts ?? 0 },
      noStore,
    );
  }

  if (who != null) {
    // The draft desk's per-person read (5.2): exact words from both records,
    // one line, cited or silent — no fuzzy maybes. Priority: a row naming the
    // person → the org's inbound → the measured silence. An unmatched
    // recipient with no rollup renders nothing at all.
    const prisma = getPrisma();
    const [rows, rollupNote] = await Promise.all([
      stageRows(acct),
      prisma.accountNote.findFirst({
        where: { accountId: `${ACTIVITY_NS}${acct}` },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const rollup = rollupNote ? parseRollupBody(rollupNote.body) : null;
    const needle = who.trim().toLowerCase();
    const nameBits = needle
      .split(/[@\s.]+/)
      .filter((x) => x.length >= 3)
      .slice(0, 2);
    const hit =
      needle.length >= 3
        ? rows.find((r) => {
            const hay = `${r.s} ${r.a} ${r.c ?? ""}`.toLowerCase();
            return (
              hay.includes(needle) ||
              (nameBits.length > 1 && nameBits.every((b) => hay.includes(b)))
            );
          })
        : undefined;
    const mmdd = (d: string) => (d ? d.slice(5).replace("-", "/") : "");
    if (hit) {
      const first = hit.a.split(" ")[0] || "Someone";
      return NextResponse.json(
        {
          ok: true,
          line: `${first} was in their traffic ${mmdd(hit.d)} — ${cleanSubject(hit.s).slice(0, 60)}.`,
          cite: rowOut(hit),
        },
        noStore,
      );
    }
    if (rollup?.lastOrgInbound) {
      const day = rollup.lastOrgInbound.slice(0, 10);
      return NextResponse.json(
        { ok: true, line: `They wrote org-side ${mmdd(day)}.`, cite: null },
        noStore,
      );
    }
    if (rollup?.lastHuman?.day) {
      const days = Math.max(
        0,
        Math.floor(
          (Date.now() - Date.parse(`${rollup.lastHuman.day}T12:00:00Z`)) / 86_400_000,
        ),
      );
      return NextResponse.json(
        { ok: true, line: `Nobody has touched them in ${days} days.`, cite: null },
        noStore,
      );
    }
    return NextResponse.json({ ok: true, line: "", cite: null }, noStore);
  }

  const rows = await stageRows(acct);

  if (k) {
    const row = rows.find((r) => r.k === k);
    return NextResponse.json(
      row
        ? { ok: true, row: rowOut(row) }
        : {
            ok: false,
            reason:
              "That row isn't in the staged slice — the slice cap keeps the newest 300, and older citations retire with their drop.",
          },
      noStore,
    );
  }

  if (caseNo) {
    const timeline = rows
      .filter((r) => caseNumberOf(r.s) === caseNo)
      .sort((a, b) => (a.d < b.d ? 1 : -1))
      .slice(0, 30)
      .map(rowOut);
    return NextResponse.json({ ok: true, caseNo, timeline }, noStore);
  }

  if (theme != null) {
    // The theme's cases: support rows whose cleaned subject folds to the
    // theme label (empty theme = every support case). One line per case
    // number — count, span, last actor — each a door to its timeline.
    const support = rows.filter((r) => r.lane === "support");
    const wanted = theme.trim().toLowerCase();
    const byCase = new Map<string, StagedRow[]>();
    for (const r of support) {
      if (wanted && !cleanSubject(r.s).toLowerCase().includes(wanted)) continue;
      const no = caseNumberOf(r.s) || "no-case";
      byCase.set(no, [...(byCase.get(no) ?? []), r]);
    }
    const cases = [...byCase.entries()]
      .map(([no, list]) => {
        const days = list.map((r) => r.d).sort();
        const newest = list.sort((a, b) => (a.d < b.d ? 1 : -1))[0];
        return {
          caseNo: no,
          rows: list.length,
          firstDay: days[0],
          lastDay: days[days.length - 1],
          who: newest.a,
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
