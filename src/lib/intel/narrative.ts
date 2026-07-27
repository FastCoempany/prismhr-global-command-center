// The weekly brief — the Narrative drawer stops being a static band and
// starts writing the update itself. Pure builder over the trailing 7 days;
// output is plain-text friendly (one Copy brief button, Teams-paste ready).

import { DASH_NODES, type DashNodeKey } from "@/lib/dashboard/stages";
import { redactMoney } from "./lexicon";

export type BriefSection = { title: string; bullets: string[] };

export type WeeklyInput = {
  now: Date;
  cards: {
    name: string;
    states: Partial<Record<DashNodeKey, string>>;
    activated: Partial<Record<DashNodeKey, string>>; // ISO stamps
  }[];
  labels?: Record<string, string>; // node-key → custom label
  partnerNotes: { partner: string; body: string; createdAt: string }[];
  filed: { account: string; at: string }[]; // touches + filed SF activities
  openAsks: { text: string; sinceIso: string }[]; // capture asks/gaps still open
  staleBriefRows: string[]; // morning-brief rows uncleared ≥3 business days
  deadlines: { account: string; phrase: string; dateIso: string }[];
  upcoming: { label: string; at: string }[]; // scheduled follow-ups etc.
};

const DAY = 86_400_000;
const inWindow = (iso: string, now: Date, days: number) => {
  const t = Date.parse(iso);
  return !Number.isNaN(t) && t <= now.getTime() && now.getTime() - t <= days * DAY;
};
const short = (iso: string) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

export function weeklyBrief(inp: WeeklyInput): { sections: BriefSection[] } {
  const label = (key: DashNodeKey) =>
    inp.labels?.[key] || DASH_NODES.find((n) => n.key === key)?.label || key;

  // Moved — stages that went active in the trailing week.
  const moved: string[] = [];
  for (const card of inp.cards) {
    for (const n of DASH_NODES) {
      const at = card.activated[n.key];
      if (at && inWindow(at, inp.now, 7))
        moved.push(`${card.name} → ${label(n.key)} (${short(at)})`);
    }
  }

  // Heard — partner quotes, redacted and clipped.
  const heard = inp.partnerNotes
    .filter((n) => inWindow(n.createdAt, inp.now, 7))
    .slice(0, 6)
    .map(
      (n) =>
        `${n.partner}: “${redactMoney(n.body.replace(/\s+/g, " ").trim()).slice(0, 120)}”`,
    );

  // Sent / Filed — activity volume per account.
  const counts = new Map<string, number>();
  for (const f of inp.filed)
    if (inWindow(f.at, inp.now, 7))
      counts.set(f.account, (counts.get(f.account) ?? 0) + 1);
  const sent = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([acct, n]) => `${acct} — ${n} touch${n === 1 ? "" : "es"}/activities filed`);

  // Blocked / Owed — open asks + brief rows that didn't clear.
  const blocked = [
    ...inp.openAsks.map(
      (a) =>
        `${redactMoney(a.text.replace(/\s+/g, " ").trim()).slice(0, 120)} (open since ${short(a.sinceIso)})`,
    ),
    ...inp.staleBriefRows.map((t) => redactMoney(t).slice(0, 120)),
  ];

  // Next week — dated deadlines inside 14 days + scheduled work.
  const next = [
    ...inp.deadlines
      .filter((d) => {
        const t = Date.parse(`${d.dateIso}T12:00:00Z`);
        return (
          !Number.isNaN(t) &&
          t >= inp.now.getTime() - DAY &&
          t - inp.now.getTime() <= 14 * DAY
        );
      })
      .map((d) => `${d.account}: ${d.phrase} — ${short(d.dateIso)}`),
    ...inp.upcoming
      .filter((u) => {
        const t = Date.parse(u.at);
        return (
          !Number.isNaN(t) && t >= inp.now.getTime() && t - inp.now.getTime() <= 14 * DAY
        );
      })
      .slice(0, 6)
      .map((u) => `${u.label} — ${short(u.at)}`),
  ];

  const sections: BriefSection[] = [
    { title: "Moved", bullets: moved },
    { title: "Heard", bullets: heard },
    { title: "Sent / Filed", bullets: sent },
    { title: "Blocked / Owed", bullets: blocked },
    { title: "Next week", bullets: next },
  ].filter((s) => s.bullets.length > 0);

  return { sections };
}

// Plain text — no markdown syntax; pastes cleanly into Teams/email.
export function briefText(sections: BriefSection[]): string {
  return sections
    .map((s) => [`${s.title}:`, ...s.bullets.map((b) => `• ${b}`)].join("\n"))
    .join("\n\n");
}
