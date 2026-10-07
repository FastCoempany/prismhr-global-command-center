"use client";

// The Accounts fold — the decreed winner's in-row expansion (Concept I,
// 2026-08-20). Opens beneath a row from THE SIGNAL cell and drills by the
// meat law: gem → citation → email excerpt; support → case list → per-case
// timeline; a verdict → the staged rows it counted → each row's excerpt.
// Served by the evidence route (a GET, never a server action). The touch
// fold beside it opens LAST HUMAN TOUCH the same way (pass 8 A5).

import { useState } from "react";
import styles from "../command-center.module.css";
import type { TouchCite } from "./rules";

export type RowSecond = {
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
type RowHead = { k: string; day: string; who: string; subject: string };

const mmdd = (day: string) => (day ? day.slice(5).replace("-", "/") : "");

const evidenceUrl = (accountId: string, q = "") =>
  `/activity/evidence?acct=${encodeURIComponent(accountId)}${q}`;

/** One row's cleaned excerpt, as the evidence route serves it. */
async function fetchExcerpt(accountId: string, k: string): Promise<string> {
  try {
    const r = await fetch(evidenceUrl(accountId, `&k=${encodeURIComponent(k)}`), {
      cache: "no-store",
    });
    const j = (await r.json()) as {
      ok: boolean;
      row?: { excerpt: string };
      reason?: string;
    };
    return j.ok
      ? j.row?.excerpt ||
          "The row carries no comment body. The subject is the whole entry."
      : (j.reason ?? "The row isn't in the staged slice.");
  } catch {
    return "The evidence store didn't answer. Try again.";
  }
}

/** The staged rows, newest first, heads only: the route's generic list. */
async function fetchRowHeads(accountId: string): Promise<RowHead[]> {
  try {
    const r = await fetch(evidenceUrl(accountId), { cache: "no-store" });
    const j = (await r.json()) as { ok: boolean; rows?: RowHead[] };
    return j.rows ?? [];
  } catch {
    return [];
  }
}

const squash = (s: string) => (s ?? "").replace(/\s+/g, "").toLowerCase();

/** LAST HUMAN TOUCH, one click down (the click-depth law, pass 8 A5). The
 *  first record's touch shows the entry it read; the export's touch shows
 *  its row as the rollup holds it, and "read it" opens that row's excerpt
 *  by the meat law, found among the staged rows by its day and subject. */
export function TouchEvidence({
  accountId,
  cite,
}: {
  accountId: string;
  cite: TouchCite;
}) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (cite.from === "record")
    return (
      <div className={styles.srPanel}>
        <span className={styles.srStamp}>
          {mmdd(cite.day)} · {cite.who || "—"} · {cite.how}
        </span>
        {cite.text ? (
          <div className={styles.srExcerpt}>{cite.text}</div>
        ) : cite.how === "LOGGED TOUCH" ? (
          <p className={styles.srVerdictLine}>The touch log holds no message for it.</p>
        ) : null}
      </div>
    );

  const readRow = async () => {
    if (text !== null) {
      setText(null);
      return;
    }
    setBusy(true);
    const heads = await fetchRowHeads(accountId);
    const want = squash(cite.subject);
    const row = heads.find(
      (h) => h.day === cite.day && squash(h.subject).startsWith(want),
    );
    setText(
      row
        ? await fetchExcerpt(accountId, row.k)
        : "The newest staged rows don't hold this one.",
    );
    setBusy(false);
  };

  return (
    <div className={styles.srPanel}>
      <button type="button" className={styles.srCite} onClick={readRow}>
        {mmdd(cite.day)} · {cite.who || "—"} · {cite.how || "ROW"}
        {cite.subject ? ` · ${cite.subject}` : ""}{" "}
        <b>{busy ? "…" : text !== null ? "▾" : "▸ read it"}</b>
      </button>
      {text !== null && <div className={styles.srExcerpt}>{text}</div>}
    </div>
  );
}

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
  // The verdict's rows (pass 8 A5): the staged rows its arithmetic counted.
  const [rows, setRows] = useState<RowHead[] | null>(null);
  const [rowsOpen, setRowsOpen] = useState(false);

  const loadExcerpt = async (k: string) => {
    if (excerpts[k] !== undefined) {
      const next = { ...excerpts };
      delete next[k];
      setExcerpts(next);
      return;
    }
    setBusy(k);
    const excerpt = await fetchExcerpt(accountId, k);
    setExcerpts((prev) => ({ ...prev, [k]: excerpt }));
    setBusy("");
  };

  const loadRows = async () => {
    setRowsOpen(!rowsOpen);
    if (rows || rowsOpen) return;
    setBusy("rows");
    setRows(await fetchRowHeads(accountId));
    setBusy("");
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
        <div>
          <p className={styles.srVerdictLine}>{second.verdict}</p>
          <button type="button" className={styles.srCite} onClick={loadRows}>
            THE STAGED ROWS, NEWEST FIRST{" "}
            <b>{busy === "rows" ? "…" : rowsOpen ? "▾" : "▸ the rows"}</b>
          </button>
          {rowsOpen &&
            (rows ?? []).map((r) => (
              <div key={r.k}>
                <button
                  type="button"
                  className={styles.srCite}
                  onClick={() => loadExcerpt(r.k)}
                >
                  {mmdd(r.day)} · {r.who || "—"} · {r.subject}{" "}
                  <b>
                    {busy === r.k ? "…" : excerpts[r.k] !== undefined ? "▾" : "▸ read it"}
                  </b>
                </button>
                {excerpts[r.k] !== undefined && (
                  <div className={styles.srExcerpt}>{excerpts[r.k]}</div>
                )}
              </div>
            ))}
          {rowsOpen && rows?.length === 0 && busy !== "rows" && (
            <p className={styles.srVerdictLine}>The staged slice holds no rows.</p>
          )}
        </div>
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
