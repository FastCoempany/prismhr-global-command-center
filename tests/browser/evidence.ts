// The evidence route as the browser suite answers it (src/app/activity/
// evidence/route.ts, a GET): one row's cleaned excerpt by key, the case list,
// a case's timeline, and the campaign table. Every answer carries words a
// test can find on the page once the door it asked through opens.

export const EXCERPT: Record<string, string> = {
  r1: "Can we talk Mexico next week? We have two hires there.",
  s1: "Payroll for the Ontario client failed again this morning.",
  c1: "Looping in Lesha on the renewal timing.",
};

export const EVIDENCE = {
  "/activity/evidence": (u: URL) => {
    const k = u.searchParams.get("k");
    if (k) return EXCERPT[k] ? { ok: true, row: { excerpt: EXCERPT[k] } } : { ok: false, reason: "No such row." };
    if (u.searchParams.has("theme"))
      return {
        ok: true,
        cases: [
          { caseNo: "00123456", rows: 3, firstDay: "2026-09-01", lastDay: "2026-09-12", who: "Dana Ruiz", subject: "Ontario payroll" },
        ],
      };
    if (u.searchParams.get("case"))
      return {
        ok: true,
        timeline: [
          { k: "t1", day: "2026-09-01", who: "Dana Ruiz", subject: "Ontario payroll", excerpt: "The Ontario run is stuck on a tax table." },
        ],
      };
    if (u.searchParams.get("camps"))
      return { ok: true, windows: { top: [{ campaign: "Global payroll webinar", o: 4, c: 1, last: "2026-09-28" }] } };
    if (u.searchParams.has("rows"))
      return { ok: true, rows: [{ k: "r1", day: "2026-09-30", who: "Pat Lee", subject: "Mexico" }] };
    return { ok: false, reason: "Unknown ask." };
  },
};
