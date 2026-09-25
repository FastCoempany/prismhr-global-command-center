// The wayfinder's route table — pure data, importable anywhere (the tsx that
// renders it pulls client modules and CSS, so the table lives apart from it).
// The one place the app's rows live: a surface that leaves the app leaves
// this table, and the suite checks every live row against the pages on disk
// (ruled 2026-09-25, P1).

type WayfinderRoute = {
  label: string;
  href: string;
  /** The `current` names that light this row. */
  pages: readonly string[];
  /** An archived surface stays reachable and stays quiet — no colour, no
   *  weight, no competition for the eye. */
  archived: boolean;
};

// The three demo rooms live under one nav entry — any of them lights "Demos".
const DEMO_PAGES: readonly string[] = [
  "Demos",
  "Demo Sidekick",
  "v3 Sidekick",
  "Payroll Demo Sidekick",
];

// Today, the board and Pipeline were the app's first three rooms; the Room is
// all three now, and the three pages retired 2026-09-25 (dead-code ledger,
// section C). Capture keeps the bookmarklets and the intake form, which need
// a page to be dragged from but aren't daily work; it is a plain door.
export const WAYFINDER_ROUTES: readonly WayfinderRoute[] = [
  { label: "HomeRoom", href: "/room", pages: ["HomeRoom"], archived: false },
  { label: "Accounts", href: "/accounts", pages: ["Accounts"], archived: false },
  { label: "Groundwork", href: "/groundwork", pages: ["Groundwork"], archived: false },
  { label: "Playbook", href: "/playbook", pages: ["Playbook"], archived: false },
  { label: "Intranet", href: "/intranet", pages: ["Intranet"], archived: false },
  { label: "Pricing", href: "/pricing", pages: ["Pricing"], archived: false },
  { label: "Demos", href: "/demos", pages: DEMO_PAGES, archived: false },
  { label: "Capture", href: "/intake", pages: ["Capture"], archived: false },
];

/** Where a route's page lives on disk, relative to the repo root. */
export function pageFileFor(href: string): string {
  const dir = href === "/" ? "" : href.replace(/^\//, "") + "/";
  return `src/app/${dir}page.tsx`;
}
