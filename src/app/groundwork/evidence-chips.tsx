"use client";

// The Evidence Chips — Groundwork's decreed winner (2026-08-20). One row of
// mono chips beneath the stage's reason, each a door, amended by the meat
// law: the drill goes as many layers as the evidence holds — chip → themes →
// case list → per-case excerpt timeline — served by the evidence route (a
// GET, never a server action). The stage's arrival never grows: everything
// below the chip row renders only on click.

import { useState } from "react";
import styles from "./groundwork.module.css";

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
type Camp = { campaign: string; o: number; c: number; last: string };

export type ChipsProps = {
  accountId: string;
  support: { total: number; spikeDay: string; spikeN: number } | null;
  intent: { opens30: number; clicks30: number; lastOpen: string; sends7: number } | null;
  collision: {
    mktgSends7: number;
    colleague: { who: string; day: string } | null;
  } | null;
  gems: {
    term: string;
    act: string;
    reason: string;
    whenDay: string;
    cites: { k: string; day: string; who: string; subject: string }[];
  }[];
};

const mmdd = (day: string) => (day ? day.slice(5).replace("-", "/") : "");

export default function EvidenceChips({
  accountId,
  support,
  intent,
  collision,
  gems,
}: ChipsProps) {
  const [open, setOpen] = useState<"" | "support" | "intent" | "collision" | "gems">("");
  const [cases, setCases] = useState<CaseLine[] | null>(null);
  const [timeline, setTimeline] = useState<{
    caseNo: string;
    rows: TimelineRow[];
  } | null>(null);
  const [camps, setCamps] = useState<Camp[] | null>(null);
  const [excerpts, setExcerpts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  if (!support && !intent && !collision && gems.length === 0) return null;

  const toggle = (k: typeof open) => {
    setOpen(open === k ? "" : k);
    setTimeline(null);
  };

  const loadCases = async () => {
    toggle("support");
    if (cases || open === "support") return;
    setBusy("support");
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

  const loadCamps = async () => {
    toggle("intent");
    if (camps || open === "intent") return;
    setBusy("intent");
    try {
      const r = await fetch(
        `/activity/evidence?acct=${encodeURIComponent(accountId)}&camps=1`,
        { cache: "no-store" },
      );
      const j = (await r.json()) as {
        ok: boolean;
        windows?: { top: Camp[] } | null;
      };
      setCamps(j.windows?.top ?? []);
    } catch {
      setCamps([]);
    } finally {
      setBusy("");
    }
  };

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

  return (
    <div className={styles.evWrap}>
      <div className={styles.evChips}>
        {gems.length > 0 && (
          <button
            type="button"
            className={`${styles.evChip} ${styles.evChipGem}`}
            onClick={() => toggle("gems")}
            title="Verified gems from the second record — every citation opens to the email meat"
          >
            ◆ {gems.length === 1 ? gems[0].term : `${gems.length} GEMS`}
          </button>
        )}
        {support && support.total > 0 && (
          <button
            type="button"
            className={`${styles.evChip} ${styles.evChipAmber}`}
            onClick={loadCases}
            title="Support cases in the 90-day window — opens the case list, each case opens its timeline"
          >
            ▮ SUPPORT {support.total}
            {support.spikeDay ? ` · SPIKE ${mmdd(support.spikeDay)}` : ""}
          </button>
        )}
        {intent && (intent.opens30 > 0 || intent.clicks30 > 0) && (
          <button
            type="button"
            className={`${styles.evChip} ${styles.evChipBlue}`}
            onClick={loadCamps}
            title="Marketing opens and clicks, 30 days — opens the campaign table"
          >
            INTENT · O {intent.opens30}
            {intent.clicks30 > 0 ? ` · C ${intent.clicks30}` : ""} · 30D
          </button>
        )}
        {collision && (
          <button
            type="button"
            className={`${styles.evChip} ${styles.evChipAmber}`}
            onClick={() => toggle("collision")}
            title="Your note would land beside live motion. It informs; it never blocks."
          >
            ⚠{" "}
            {collision.mktgSends7 > 0
              ? `MKTG CADENCE LIVE · ${collision.mktgSends7} THIS WEEK`
              : `${(collision.colleague?.who ?? "A COLLEAGUE").split(" ")[0].toUpperCase()}’S THREAD · ${mmdd(collision.colleague?.day ?? "")}`}
          </button>
        )}
      </div>

      {open === "gems" && (
        <div className={styles.evFold}>
          {gems.map((g) => (
            <div key={g.term} className={styles.evGem}>
              <span className={styles.evGemTerm}>◆ {g.term} · CONFIRMED</span>
              <div className={styles.evGemAct}>{g.act}</div>
              <div className={styles.evGemWhy}>{g.reason}</div>
              {g.cites.map((c) => (
                <div key={c.k}>
                  <button
                    type="button"
                    className={styles.evCite}
                    onClick={() => loadExcerpt(c.k)}
                  >
                    {mmdd(c.day)} · {c.who} · {c.subject}{" "}
                    <b>
                      {busy === c.k
                        ? "…"
                        : excerpts[c.k] !== undefined
                          ? "▾"
                          : "▸ read it"}
                    </b>
                  </button>
                  {excerpts[c.k] !== undefined && (
                    <div className={styles.evExcerpt}>{excerpts[c.k]}</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {open === "support" && (
        <div className={styles.evFold}>
          {busy === "support" && (
            <span className={styles.evQuiet}>reading the cases…</span>
          )}
          {cases?.length === 0 && busy !== "support" && (
            <span className={styles.evQuiet}>
              The staged slice holds no case rows — the drop&rsquo;s cap kept newer
              traffic.
            </span>
          )}
          {(cases ?? []).slice(0, 14).map((c) => (
            <div key={c.caseNo}>
              <button
                type="button"
                className={styles.evCite}
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
                  <div key={r.k} className={styles.evExcerpt}>
                    <span className={styles.evStamp}>
                      {mmdd(r.day)} · {r.who} · {r.subject}
                    </span>
                    {r.excerpt && <div>{r.excerpt}</div>}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {open === "intent" && (
        <div className={styles.evFold}>
          {busy === "intent" && (
            <span className={styles.evQuiet}>reading the tallies…</span>
          )}
          {camps?.length === 0 && busy !== "intent" && (
            <span className={styles.evQuiet}>
              No campaign drew an open in the window.
            </span>
          )}
          {(camps ?? []).map((c) => (
            <div key={c.campaign} className={styles.evStamp}>
              o {c.o} · c {c.c} · last {mmdd(c.last) || "—"} · {c.campaign}
            </div>
          ))}
        </div>
      )}

      {open === "collision" && collision && (
        <div className={styles.evFold}>
          <span className={styles.evQuiet}>
            {collision.mktgSends7 > 0
              ? `Marketing sent ${collision.mktgSends7} blast${collision.mktgSends7 === 1 ? "" : "s"} to this account inside seven days — your note lands beside them.`
              : `${collision.colleague?.who ?? "A colleague"} was in this account's traffic on ${mmdd(collision.colleague?.day ?? "")} — your note lands beside that thread.`}{" "}
            It informs; it never blocks. The composed file carries the same flag.
          </span>
        </div>
      )}
    </div>
  );
}
