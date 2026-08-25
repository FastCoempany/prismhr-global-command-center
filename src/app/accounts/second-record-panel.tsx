"use client";

// The Accounts fold — the decreed winner's in-row expansion (Concept I,
// 2026-08-20). Opens beneath a row from THE SIGNAL cell and drills by the
// meat law: gem → citation → email excerpt; support → case list → per-case
// timeline. Served by the evidence route (a GET, never a server action).

import { useState } from "react";
import styles from "../command-center.module.css";

export type RowSecond = {
  touch: { who: string; day: string; kind: string } | null;
  gems: {
    term: string;
    act: string;
    reason: string;
    whenDay: string;
    cites: { k: string; day: string; who: string; subject: string }[];
  }[];
  act: string | null;
  verdict: string;
  supportTotal: number;
  spikeDay: string;
};

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

export default function SecondRecordPanel({
  accountId,
  second,
}: {
  accountId: string;
  second: RowSecond;
}) {
  const [excerpts, setExcerpts] = useState<Record<string, string>>({});
  const [cases, setCases] = useState<CaseLine[] | null>(null);
  const [casesOpen, setCasesOpen] = useState(false);
  const [timeline, setTimeline] = useState<{
    caseNo: string;
    rows: TimelineRow[];
  } | null>(null);
  const [busy, setBusy] = useState("");

  const loadExcerpt = async (k: string) => {
    if (excerpts[k] !== undefined) {
      const next = { ...excerpts };
      delete next[k];
      setExcerpts(next);
      return;
    }
    setBusy(k);
    try {
      const r = await fetch(
        `/activity/evidence?acct=${encodeURIComponent(accountId)}&k=${encodeURIComponent(k)}`,
        { cache: "no-store" },
      );
      const j = (await r.json()) as {
        ok: boolean;
        row?: { excerpt: string };
        reason?: string;
      };
      setExcerpts({
        ...excerpts,
        [k]: j.ok
          ? j.row?.excerpt ||
            "The row carries no comment body — the subject is the whole entry."
          : (j.reason ?? "The row isn't in the staged slice."),
      });
    } catch {
      setExcerpts({ ...excerpts, [k]: "The evidence store didn't answer. Try again." });
    } finally {
      setBusy("");
    }
  };

  const loadCases = async () => {
    setCasesOpen(!casesOpen);
    setTimeline(null);
    if (cases || casesOpen) return;
    setBusy("cases");
    try {
      const r = await fetch(
        `/activity/evidence?acct=${encodeURIComponent(accountId)}&theme=`,
        { cache: "no-store" },
      );
      const j = (await r.json()) as { ok: boolean; cases?: CaseLine[] };
      setCases(j.cases ?? []);
    } catch {
      setCases([]);
    } finally {
      setBusy("");
    }
  };

  const loadTimeline = async (caseNo: string) => {
    if (timeline?.caseNo === caseNo) {
      setTimeline(null);
      return;
    }
    setBusy(caseNo);
    try {
      const r = await fetch(
        `/activity/evidence?acct=${encodeURIComponent(accountId)}&case=${encodeURIComponent(caseNo)}`,
        { cache: "no-store" },
      );
      const j = (await r.json()) as { ok: boolean; timeline?: TimelineRow[] };
      setTimeline({ caseNo, rows: j.timeline ?? [] });
    } catch {
      setTimeline({ caseNo, rows: [] });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className={styles.srPanel}>
      {second.gems.map((g) => (
        <div key={`${g.term}|${g.whenDay}`} className={styles.srGem}>
          <div className={styles.srGemHead}>
            <span className={styles.srGemTerm}>◆ {g.term}</span>
            <span className={styles.srGemStamp}>
              CONFIRMED · {mmdd(g.whenDay)} · REFUTER-VERIFIED
            </span>
          </div>
          <div className={styles.srGemAct}>{g.act}</div>
          <div className={styles.srGemWhy}>{g.reason}</div>
          <div className={styles.srCites}>
            {g.cites.map((c) => (
              <div key={c.k}>
                <button
                  type="button"
                  className={styles.srCite}
                  onClick={() => loadExcerpt(c.k)}
                >
                  {mmdd(c.day)} · {c.who} · {c.subject}{" "}
                  <b>
                    {busy === c.k ? "…" : excerpts[c.k] !== undefined ? "▾" : "▸ read it"}
                  </b>
                </button>
                {excerpts[c.k] !== undefined && (
                  <div className={styles.srExcerpt}>{excerpts[c.k]}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {second.gems.length === 0 && second.verdict && (
        <p className={styles.srVerdictLine}>{second.verdict}</p>
      )}

      {second.supportTotal > 0 && (
        <div className={styles.srSupport}>
          <button type="button" className={styles.srCite} onClick={loadCases}>
            ▮ {second.supportTotal} SUPPORT CASES IN WINDOW
            {second.spikeDay ? ` · SPIKE ${mmdd(second.spikeDay)}` : ""}{" "}
            <b>{busy === "cases" ? "…" : casesOpen ? "▾" : "▸ the case list"}</b>
          </button>
          {casesOpen &&
            (cases ?? []).slice(0, 14).map((c) => (
              <div key={c.caseNo} className={styles.srCaseBlock}>
                <button
                  type="button"
                  className={styles.srCite}
                  onClick={() => loadTimeline(c.caseNo)}
                >
                  {c.caseNo === "no-case" ? "uncased traffic" : c.caseNo} · ×{c.rows} ·{" "}
                  {mmdd(c.firstDay)}→{mmdd(c.lastDay)} · {c.who}{" "}
                  <b>
                    {busy === c.caseNo ? "…" : timeline?.caseNo === c.caseNo ? "▾" : "▸"}
                  </b>
                </button>
                {timeline?.caseNo === c.caseNo &&
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
          {casesOpen && cases?.length === 0 && busy !== "cases" && (
            <p className={styles.srVerdictLine}>
              The staged slice holds no case rows — the drop&rsquo;s cap kept newer
              traffic.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
