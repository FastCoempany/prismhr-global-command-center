"use client";

// A second-record draft's door to its evidence (the meat law, pass 12): the
// draft counts cases on one support theme across accounts, and both counts
// open. One click lists each account's cases on the theme, from the evidence
// route (a GET, never a server action); a case opens its excerpt timeline.

import { useState } from "react";
import styles from "../command-center.module.css";

type CaseLine = {
  caseNo: string;
  rows: number;
  firstDay: string;
  lastDay: string;
  who: string;
  subject: string;
};
type TimelineRow = {
  k: string;
  day: string;
  who: string;
  subject: string;
  excerpt: string;
};

const mmdd = (day: string) => (day ? day.slice(5).replace("-", "/") : "");
const evidence = (acct: string, q: string) =>
  `/activity/evidence?acct=${encodeURIComponent(acct)}&${q}`;

export function DraftEvidence({
  theme,
  accounts,
}: {
  theme: string;
  accounts: { id: string; name: string; n: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<Record<string, CaseLine[]> | null>(null);
  const [timeline, setTimeline] = useState<{ key: string; rows: TimelineRow[] } | null>(
    null,
  );
  const total = accounts.reduce((s, a) => s + a.n, 0);

  const toggle = async () => {
    setOpen(!open);
    if (cases || open) return;
    const got: Record<string, CaseLine[]> = {};
    await Promise.all(
      accounts.map(async (a) => {
        try {
          const r = await fetch(evidence(a.id, `theme=${encodeURIComponent(theme)}`), {
            cache: "no-store",
          });
          const j = (await r.json()) as { ok: boolean; cases?: CaseLine[] };
          got[a.id] = j.cases ?? [];
        } catch {
          got[a.id] = [];
        }
      }),
    );
    setCases(got);
  };

  const openCase = async (acct: string, caseNo: string) => {
    const key = `${acct}|${caseNo}`;
    if (timeline?.key === key) return setTimeline(null);
    try {
      const r = await fetch(
        evidence(
          acct,
          `case=${encodeURIComponent(caseNo)}&theme=${encodeURIComponent(theme)}`,
        ),
        { cache: "no-store" },
      );
      const j = (await r.json()) as { ok: boolean; timeline?: TimelineRow[] };
      setTimeline({ key, rows: j.timeline ?? [] });
    } catch {
      setTimeline({ key, rows: [] });
    }
  };

  return (
    <div>
      <button
        type="button"
        className={styles.srCite}
        aria-expanded={open}
        onClick={toggle}
      >
        THE {total} CASES ACROSS {accounts.length} ACCOUNT
        {accounts.length === 1 ? "" : "S"} <b>{open ? "▾" : "▸"}</b>
      </button>
      {open && cases === null && <p className={styles.srVerdictLine}>Opening…</p>}
      {open &&
        cases &&
        accounts.map((a) => (
          <div key={a.id} className={styles.srCaseBlock}>
            <span className={styles.srStamp}>
              {a.name} · {a.n}
            </span>
            {(cases[a.id] ?? []).length === 0 && (
              <p className={styles.srVerdictLine}>
                The staged slice holds no case rows here.
              </p>
            )}
            {(cases[a.id] ?? []).map((c) => (
              <div key={c.caseNo}>
                <button
                  type="button"
                  className={styles.srCite}
                  onClick={() => openCase(a.id, c.caseNo)}
                >
                  {c.caseNo === "no-case" ? "uncased traffic" : c.caseNo} · ×{c.rows} ·{" "}
                  {mmdd(c.firstDay)}→{mmdd(c.lastDay)} · {c.who}{" "}
                  <b>{timeline?.key === `${a.id}|${c.caseNo}` ? "▾" : "▸"}</b>
                </button>
                {timeline?.key === `${a.id}|${c.caseNo}` &&
                  timeline.rows.map((r) => (
                    <div key={r.k} className={styles.srExcerpt}>
                      <span className={styles.srStamp}>
                        {mmdd(r.day)} · {r.who} · {r.subject}
                      </span>
                      {r.excerpt && <div>{r.excerpt}</div>}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
