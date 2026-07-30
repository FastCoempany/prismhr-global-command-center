"use client";

// The Intranet's work surface: an ask bar, a written answer, citations that
// drill, and the index rail that decomposes on click.
//
// The rail is navigation AND a report — it says what the brain has a lot of and
// what it has just started to have. Selecting a topic scopes where a question
// STARTS; it never limits where the answer can look (C1).

import { useState, useTransition } from "react";
import Link from "next/link";
import { useDismiss } from "@/components/use-dismiss";
import { intranetAsk, intranetCapture, intranetPassage } from "./actions";
import { runBrain } from "./runners";
import type { AskReply, PassageReply } from "./actions";
import styles from "../command-center.module.css";

export type RailTopic = {
  id: string;
  label: string;
  summary: string;
  claims: number;
  fresh: boolean;
  children: RailTopic[];
};

type Stats = {
  docs: number;
  claims: number;
  topics: number;
  lastCaptureAt: string;
  prospectQuestions: number;
};

export function IntranetClient({
  rail,
  stats,
  staleness,
  queue,
  canWrite,
  canAnswer,
}: {
  rail: RailTopic[];
  stats: Stats;
  staleness: string;
  queue: { pending: number; unindexed: number };
  canWrite: boolean;
  canAnswer: boolean;
}) {
  const [q, setQ] = useState("");
  const [reply, setReply] = useState<AskReply | null>(null);
  const [foldOpen, setFoldOpen] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [scope, setScope] = useState<{ id: string; label: string } | null>(null);
  const [passage, setPassage] = useState<PassageReply | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [receipt, setReceipt] = useState("");
  const [busy, startAsk] = useTransition();
  const [capBusy, startCap] = useTransition();
  const [runBusy, startRun] = useTransition();
  const [runLines, setRunLines] = useState<string[]>([]);

  const drawerRef = useDismiss<HTMLDivElement>(passage !== null, () => setPassage(null));
  const addRef = useDismiss<HTMLDivElement>(addOpen, () => setAddOpen(false));

  const ask = (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setFoldOpen(false);
    startAsk(async () => {
      const r = await intranetAsk(
        scope ? `${question} (start with: ${scope.label})` : question,
      );
      setReply(r);
    });
  };

  const file = () => {
    if (!paste.trim() || capBusy) return;
    startCap(async () => {
      const r = await intranetCapture(paste);
      setReceipt(r.ok ? r.receipt : (r.reason ?? "That didn't land."));
      if (r.ok) setPaste("");
    });
  };

  // Bringing the brain up to date: mirror the app, take in the Playbook, read
  // what hasn't been read, settle the index, open what has grown, reconcile
  // what the record now disagrees with. Bounded — a big corpus is several
  // passes, and the report says what is left.
  const bringUpToDate = (deep: boolean) => {
    if (runBusy) return;
    startRun(async () => {
      const r = await runBrain({ deep });
      setRunLines(r.ok ? r.lines : [r.reason ?? "That didn't complete."]);
    });
  };

  const drill = (claimId: string) => {
    startAsk(async () => {
      const p = await intranetPassage(claimId);
      if (p.ok) setPassage(p);
    });
  };

  const renderTopic = (t: RailTopic, depth: number) => {
    const isOpen = open[t.id] === true;
    return (
      <div key={t.id}>
        <button
          type="button"
          className={`${styles.itTopic} ${isOpen ? styles.itTopicOn : ""}`}
          style={{ paddingLeft: `${11 + depth * 15}px` }}
          aria-expanded={isOpen}
          title={t.summary}
          onClick={() => {
            setOpen((o) => ({ ...o, [t.id]: !isOpen }));
            setScope(isOpen ? null : { id: t.id, label: t.label });
          }}
        >
          <span className={styles.itCar}>{t.children.length ? "▸" : "·"}</span>
          <span className={styles.itLabel}>{t.label}</span>
          <span className={`${styles.itN} ${t.fresh ? styles.itFresh : ""}`}>
            {t.claims}
          </span>
        </button>
        {isOpen && t.children.map((c) => renderTopic(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className={styles.itWrap}>
      <div className={styles.itMain}>
        <div className={styles.itAskRow}>
          <input
            className={styles.itAsk}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ask(q);
            }}
            placeholder="What do we tell people about implementation timelines — and has it held?"
            aria-label="Ask the brain"
          />
          <button
            type="button"
            className={styles.itGo}
            disabled={busy || !q.trim()}
            onClick={() => ask(q)}
          >
            {busy ? "Reading…" : "Ask"}
          </button>
        </div>

        {scope && (
          <p className={styles.itScope}>
            Starting in <b>{scope.label}</b> — the answer still reads everything.{" "}
            <button
              type="button"
              className={styles.itClear}
              onClick={() => setScope(null)}
            >
              clear
            </button>
          </p>
        )}

        {!canAnswer && (
          <p className={styles.itWarn}>
            No API key configured — the brain can hold material and show its index, but it
            can&apos;t compose an answer yet.
          </p>
        )}

        {reply && !reply.ok && <p className={styles.itWarn}>{reply.reason}</p>}

        {reply?.ok && (
          <section className={styles.itAnswer}>
            {reply.thin && <p className={styles.itThin}>{reply.thin}</p>}
            {reply.answer.confidence === "mixed" && (
              <p className={styles.itMixed}>The record disagrees with itself here.</p>
            )}
            <p className={styles.itProse}>{reply.answer.answer}</p>

            {reply.answer.gaps.length > 0 && (
              <p className={styles.itGaps}>
                What the record doesn&apos;t cover: {reply.answer.gaps.join(" · ")}
              </p>
            )}

            {reply.citations.length > 0 && (
              <div className={styles.itCites}>
                {reply.citations.map((c) => (
                  <button
                    key={c.n}
                    type="button"
                    className={styles.itCite}
                    onClick={() => drill(c.claimId)}
                  >
                    <span className={styles.itCiteN}>[{c.n}]</span>
                    <span className={styles.itCiteBody}>
                      {c.text}
                      <span className={styles.itCiteMeta}>
                        {c.speaker || "unknown"} · {c.docTitle || c.origin} ·{" "}
                        {c.saidAt.slice(0, 10)} · {c.kind}
                        {c.originGone ? " · removed from the app since" : ""}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className={styles.itFoldBtn}
              onClick={() => setFoldOpen((v) => !v)}
              aria-expanded={foldOpen}
            >
              {foldOpen ? "Hide the reasoning" : "Show the reasoning"}
            </button>

            {foldOpen && (
              <div className={styles.itFold}>
                {reply.answer.reasoning && <p>{reply.answer.reasoning}</p>}
                {reply.answer.setAside.length > 0 && (
                  <>
                    <p className={styles.itFoldHead}>Set aside</p>
                    <ul>
                      {reply.answer.setAside.map((s) => (
                        <li key={s.n}>
                          [{s.n}] {s.why}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {reply.coverage && (
                  <p className={styles.itCoverage}>
                    {reply.coverage.claims} claim
                    {reply.coverage.claims === 1 ? "" : "s"} across {reply.coverage.docs}{" "}
                    document{reply.coverage.docs === 1 ? "" : "s"}
                    {reply.coverage.from
                      ? `, ${reply.coverage.from.slice(0, 10)} → ${reply.coverage.to.slice(0, 10)}`
                      : ""}
                    {reply.coverage.origins.length
                      ? ` · from ${reply.coverage.origins.join(", ")}`
                      : ""}
                    .
                  </p>
                )}
                <p className={styles.itCoverage}>
                  Answered by {reply.model || "—"}
                  {reply.escalated ? ` — escalated on ${reply.escalated}` : ""}.
                  {reply.citations.length > 0 &&
                    ` Found by ${[...new Set(reply.citations.map((c) => c.road))].join(", ")}.`}
                </p>
              </div>
            )}
          </section>
        )}

        {!reply && (
          <div className={styles.itEmpty}>
            <p>
              {stats.docs > 0
                ? `${stats.claims} claims from ${stats.docs} documents, ${stats.topics} topics.`
                : "The brain is empty. Give it a Teams thread, a meeting transcript, or a demo."}
              {stats.prospectQuestions > 0
                ? ` ${stats.prospectQuestions} of them are questions prospects asked.`
                : ""}
            </p>
            <p className={styles.itStale}>{staleness}</p>
          </div>
        )}

        {canWrite && (
          <div className={styles.itRun}>
            <div className={styles.itRunRow}>
              <button
                type="button"
                className={styles.itRunBtn}
                disabled={runBusy}
                onClick={() => bringUpToDate(false)}
              >
                {runBusy ? "Working…" : "Bring the brain up to date"}
              </button>
              <button
                type="button"
                className={styles.itQuietBtn}
                disabled={runBusy}
                onClick={() => bringUpToDate(true)}
                title="A longer pass — more documents read, more of the index settled"
              >
                deep pass
              </button>
              {queue.pending > 0 && (
                <span className={styles.itQueue}>
                  {queue.pending} document{queue.pending === 1 ? "" : "s"} waiting to be
                  read
                </span>
              )}
            </div>
            {runLines.length > 0 && (
              <ul className={styles.itRunLines}>
                {runLines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <aside className={styles.itRail} aria-label="Index">
        <div className={styles.itRailHead}>
          <b>Index</b>
          <span>{rail.length}</span>
        </div>
        <div className={styles.itRailList}>
          {rail.length === 0 && (
            <p className={styles.itRailEmpty}>
              The index builds itself as documents arrive.
            </p>
          )}
          {rail.map((t) => renderTopic(t, 0))}
        </div>

        {canWrite && (
          <div className={styles.itAdd} ref={addRef}>
            <button
              type="button"
              className={styles.itAddBtn}
              onClick={() => setAddOpen((v) => !v)}
              aria-expanded={addOpen}
            >
              {addOpen ? "✕ close" : "＋ add to the brain"}
            </button>
            {addOpen && (
              <div className={styles.itAddPane}>
                <textarea
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder="Paste a Teams thread, a meeting transcript, a demo — anything worth keeping."
                  aria-label="Paste into the brain"
                />
                <div className={styles.itAddRow}>
                  <button
                    type="button"
                    className={styles.itGo}
                    disabled={capBusy || !paste.trim()}
                    onClick={file}
                  >
                    {capBusy ? "Reading…" : "Keep it"}
                  </button>
                  <Link href="/intake" className={styles.itQuiet}>
                    the grabs
                  </Link>
                </div>
                {receipt && <p className={styles.itReceipt}>{receipt}</p>}
              </div>
            )}
          </div>
        )}
      </aside>

      {passage && (
        <div className={styles.itDrawer} ref={drawerRef}>
          <div className={styles.itDrawerHead}>
            <span>
              <b>{passage.title || passage.space}</b>
              <span className={styles.itDrawerMeta}>
                {passage.space} · {passage.origin}
              </span>
            </span>
            <button
              type="button"
              className={styles.itQuiet}
              onClick={() => setPassage(null)}
            >
              ✕ close
            </button>
          </div>
          {passage.originGone && (
            <p className={styles.itGone}>
              From a note that has since been removed from the app. The brain keeps it.
            </p>
          )}
          <div className={styles.itPassage}>
            <span className={styles.itDim}>{passage.before}</span>
            <mark className={styles.itMark}>{passage.span}</mark>
            <span className={styles.itDim}>{passage.after}</span>
          </div>
          {passage.accountId && (
            <p className={styles.itDrawerFoot}>
              <Link href={`/accounts?peo=${passage.accountId}`}>
                Open {passage.accountName || "the account"} →
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
