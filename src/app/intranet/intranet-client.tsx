"use client";

// The Intranet's work surface, corrected to the operator's read (Part IV):
//
//   · the index rail sits on the LEFT — the page reads index → work
//   · the paste well is the room's second surface, always open, in the main
//     column — pasting is how the room grows and the layout says so
//   · one control brings the brain up to date, running passes back-to-back
//     until the backlog is gone or the operator stops it
//   · "Send it" reads the paste immediately and the operator watches the
//     consequence: receipt → reading → the index growing
//   · pipeline vocabulary never reaches the surface; failures always do

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDismiss } from "@/components/use-dismiss";
import { intranetAsk, intranetCapture, intranetPassage } from "./actions";
import { readCapture, runBrain } from "./runners";
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

export function IntranetClient({
  rail,
  initialQ,
  empty,
  staleness,
  queue,
  canWrite,
  canAnswer,
}: {
  rail: RailTopic[];
  initialQ: string;
  empty: boolean;
  staleness: string;
  queue: { pending: number; unindexed: number };
  canWrite: boolean;
  canAnswer: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [reply, setReply] = useState<AskReply | null>(null);
  const [foldOpen, setFoldOpen] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [scope, setScope] = useState<{ id: string; label: string } | null>(null);
  const [passage, setPassage] = useState<PassageReply | null>(null);
  const [paste, setPaste] = useState("");
  const [receipt, setReceipt] = useState("");
  const [ingestLines, setIngestLines] = useState<string[]>([]);
  const [busy, startAsk] = useTransition();
  const [capBusy, startCap] = useTransition();
  const [runBusy, startRun] = useTransition();
  const [runLines, setRunLines] = useState<string[]>([]);
  const [pendingNow, setPendingNow] = useState(queue.pending);
  const [copied, setCopied] = useState("");
  const stopRef = useRef(false);

  const drawerRef = useDismiss<HTMLDivElement>(passage !== null, () => setPassage(null));

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

  // IV.3 · the paste is never fire-and-forget. Send it, then read it on the
  // spot — and the operator watches the index grow as the consequence.
  const file = () => {
    if (!paste.trim() || capBusy) return;
    startCap(async () => {
      const r = await intranetCapture(paste);
      setReceipt(r.ok ? r.receipt : (r.reason ?? "That didn't land."));
      if (!r.ok) return;
      setPaste("");
      setIngestLines(["Reading what you pasted…"]);
      const g = await readCapture(r.captureId);
      setIngestLines(g.ok ? g.lines : [g.reason ?? "The reading failed."]);
      if (typeof g.pending === "number") setPendingNow(g.pending);
      router.refresh();
    });
  };

  // One control (IV.3). Passes run back-to-back until the backlog is gone or
  // the operator stops it; every pass reports, and the rail refreshes live.
  const catchUp = () => {
    if (runBusy) return;
    stopRef.current = false;
    startRun(async () => {
      const all: string[] = [];
      for (let pass = 0; pass < 12 && !stopRef.current; pass += 1) {
        const r = await runBrain();
        for (const l of r.lines) if (all[all.length - 1] !== l) all.push(l);
        setRunLines([...all]);
        if (typeof r.pending === "number") setPendingNow(r.pending);
        router.refresh();
        if (!r.ok) {
          if (r.reason) setRunLines([...all, r.reason]);
          break;
        }
        if (!r.pending) break;
      }
    });
  };

  // Promotion travels by hand: the line is composed with its provenance and
  // handed to the clipboard. The room writes nothing into the Playbook.
  const promote = (line: string, id: string) => {
    void navigator.clipboard?.writeText(line).then(
      () => setCopied(id),
      () => setCopied(""),
    );
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
      <aside className={styles.itRail} aria-label="Index">
        <div className={styles.itRailHead}>
          <b>Index</b>
          <span>{rail.length}</span>
        </div>
        <div className={styles.itRailList}>
          {rail.length === 0 && (
            <p className={styles.itRailEmpty}>
              The index builds itself as you feed the brain.
            </p>
          )}
          {rail.map((t) => renderTopic(t, 0))}
        </div>
      </aside>

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
            No API key configured — the brain can hold what you give it and show its
            index, but it can&apos;t compose an answer yet.
          </p>
        )}

        {reply && !reply.ok && <p className={styles.itWarn}>{reply.reason}</p>}

        {reply?.ok && (
          <section className={styles.itAnswer}>
            {reply.degraded && <p className={styles.itBreach}>{reply.degraded}</p>}
            {reply.thin && !reply.world && <p className={styles.itThin}>{reply.thin}</p>}
            {reply.answer.confidence === "mixed" && !reply.degraded && (
              <p className={styles.itMixed}>The record disagrees with itself here.</p>
            )}
            {reply.answer.answer && (
              <p className={styles.itProse}>{reply.answer.answer}</p>
            )}

            {reply.world && (
              <div className={styles.itWorld}>
                <p className={styles.itWorldTag}>
                  From the world, not the record — general knowledge, nothing internal.
                </p>
                <p className={styles.itProse}>{reply.world}</p>
              </div>
            )}

            {reply.answer.gaps.length > 0 && (
              <p className={styles.itGaps}>
                What the record doesn&apos;t cover: {reply.answer.gaps.join(" · ")}
              </p>
            )}

            {reply.citations.length > 0 && (
              <div className={styles.itCites}>
                {reply.citations.map((c) => (
                  <div key={c.n} className={styles.itCiteWrap}>
                    <button
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
                    {canWrite && (
                      <button
                        type="button"
                        className={styles.itPromote}
                        title={`Copy this, with where it came from, ready to keep in the Playbook's ${c.promoteNs}`}
                        onClick={() => promote(c.promoteLine, c.claimId)}
                      >
                        {copied === c.claimId
                          ? "copied — paste it in the Playbook"
                          : `keep in the Playbook (${c.promoteNs})`}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {reply.accounts.length > 0 && (
              <p className={styles.itGaps}>
                On the board:{" "}
                {reply.accounts.map((a, i) => (
                  <span key={a.id}>
                    {i > 0 ? " · " : ""}
                    <Link href={`/accounts?peo=${a.id}`}>{a.name}</Link>
                  </span>
                ))}
              </p>
            )}

            {(reply.answer.reasoning || reply.citations.length > 0) && (
              <button
                type="button"
                className={styles.itFoldBtn}
                onClick={() => setFoldOpen((v) => !v)}
                aria-expanded={foldOpen}
              >
                {foldOpen ? "Hide the reasoning" : "Show the reasoning"}
              </button>
            )}

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
                    Drawn from {reply.coverage.claims} line
                    {reply.coverage.claims === 1 ? "" : "s"} across {reply.coverage.docs}{" "}
                    source{reply.coverage.docs === 1 ? "" : "s"}
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
            {empty ? (
              <p>The brain is empty. Paste something worth keeping.</p>
            ) : (
              <p className={styles.itStale}>{staleness}</p>
            )}
          </div>
        )}

        {canWrite && (
          <div className={styles.itWell}>
            <p className={styles.itWellHead}>Add to the brain</p>
            <textarea
              className={styles.itWellPaste}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder="Paste a Teams thread, a meeting transcript, a demo — anything worth keeping. It gets read the moment you send it."
              aria-label="Paste into the brain"
            />
            <div className={styles.itAddRow}>
              <button
                type="button"
                className={styles.itKeep}
                disabled={capBusy || !paste.trim()}
                onClick={file}
              >
                {capBusy ? "Sending…" : "Send it"}
              </button>
              {receipt && <span className={styles.itReceipt}>{receipt}</span>}
            </div>
            {ingestLines.length > 0 && (
              <ul className={styles.itRunLines}>
                {ingestLines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {canWrite && (pendingNow > 0 || runLines.length > 0) && (
          <div className={styles.itRun}>
            <div className={styles.itRunRow}>
              <button
                type="button"
                className={styles.itRunBtn}
                disabled={runBusy}
                onClick={catchUp}
              >
                {runBusy ? "Working…" : "Bring the brain up to date"}
              </button>
              {runBusy && (
                <button
                  type="button"
                  className={styles.itQuietBtn}
                  onClick={() => {
                    stopRef.current = true;
                  }}
                >
                  stop after this pass
                </button>
              )}
              {pendingNow > 0 && (
                <span className={styles.itQueue}>
                  {pendingNow} entr{pendingNow === 1 ? "y" : "ies"} it hasn&apos;t read
                  yet
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
