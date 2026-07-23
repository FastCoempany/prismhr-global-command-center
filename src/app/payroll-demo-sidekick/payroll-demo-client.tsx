"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  payrollDemoScreenshotPath,
  type PayrollDemoMeta,
  type PayrollDemoQuestion,
  type PayrollDemoStep,
} from "@/lib/payroll-demo-sidekick";
import styles from "./payroll-demo.module.css";

type Lens = "flow" | "questions";

const STATUS_LABELS: Record<PayrollDemoQuestion["status"], string> = {
  answered: "Answered on the call",
  deferred: "Deferred on the call",
  "follow-up": "Taken as follow-up",
};

// Rendered with key={id} so a step change remounts it and resets `ok`.
function Shot({ id }: { id: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div className={styles.shot}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={payrollDemoScreenshotPath(id)} alt="" onError={() => setOk(false)} />
    </div>
  );
}

function QuestionCard({ q }: { q: PayrollDemoQuestion }) {
  return (
    <div className={styles.question}>
      <div className={styles.questionHead}>
        <span className={styles.questionAsker}>{q.asker}</span>
        <span className={styles.questionAt}>{q.atTimestamp}</span>
        <span
          className={`${styles.questionStatus} ${
            q.status === "answered" ? styles.statusAnswered : styles.statusOpen
          }`}
        >
          {STATUS_LABELS[q.status]}
        </span>
      </div>
      <p className={styles.questionText}>{q.question}</p>
      <p className={styles.questionShowing}>
        <span className={styles.inlineLabel}>On screen when asked</span>
        {q.askedWhileShowing}
      </p>
      <p className={styles.questionAnswer}>
        <span className={styles.inlineLabel}>Answer given</span>
        {q.answer}
      </p>
      {q.answerQuote && (
        <blockquote className={styles.questionQuote}>“{q.answerQuote}”</blockquote>
      )}
    </div>
  );
}

type Props = {
  meta: PayrollDemoMeta;
  steps: PayrollDemoStep[];
  questions: PayrollDemoQuestion[];
  initialStepId?: string;
  initialLens: Lens;
};

export function PayrollDemoClient({
  meta,
  steps,
  questions,
  initialStepId,
  initialLens,
}: Props) {
  const byId = useMemo(() => new Map(steps.map((s) => [s.id, s])), [steps]);
  const questionsByStep = useMemo(() => {
    const m = new Map<string, PayrollDemoQuestion[]>();
    for (const q of questions) {
      const list = m.get(q.stepId);
      if (list) list.push(q);
      else m.set(q.stepId, [q]);
    }
    return m;
  }, [questions]);

  const [lens, setLens] = useState<Lens>(initialLens);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(
    initialStepId && byId.has(initialStepId) ? initialStepId : (steps[0]?.id ?? ""),
  );

  const selected = byId.get(selectedId);
  const selectedIdx = steps.findIndex((s) => s.id === selectedId);

  const q = query.trim().toLowerCase();
  const filteredSteps = useMemo(() => {
    if (!q) return steps;
    return steps.filter((s) =>
      [
        s.title,
        s.navContext,
        s.visualSummary,
        s.say,
        s.demoPurpose,
        ...s.onScreen,
        ...(questionsByStep.get(s.id) ?? []).map((x) => `${x.question} ${x.answer}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [q, steps, questionsByStep]);

  const filteredQuestions = useMemo(() => {
    if (!q) return questions;
    return questions.filter((x) =>
      [x.question, x.answer, x.asker, x.askedWhileShowing]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [q, questions]);

  const go = useCallback(
    (delta: number) => {
      const next = steps[selectedIdx + delta];
      if (next) setSelectedId(next.id);
    },
    [steps, selectedIdx],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (lens !== "flow") return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, lens]);

  const answeredCount = questions.filter((x) => x.status === "answered").length;

  return (
    <div className={styles.app}>
      <aside className={styles.side}>
        <div className={styles.sideHead}>
          <div className={styles.sideTitle}>Payroll Demo Sidekick</div>
          <p className={styles.sideNote}>
            Recorded walkthrough, {steps.length} screens · {meta.source.durationTimestamp}
            . Country-neutral: works for [any country].
          </p>
        </div>
        <div className={styles.lensRow} role="tablist" aria-label="Lens">
          <button
            className={lens === "flow" ? styles.lensOn : styles.lensOff}
            onClick={() => setLens("flow")}
            role="tab"
            aria-selected={lens === "flow"}
          >
            Flow
          </button>
          <button
            className={lens === "questions" ? styles.lensOn : styles.lensOff}
            onClick={() => setLens("questions")}
            role="tab"
            aria-selected={lens === "questions"}
          >
            Questions ({questions.length})
          </button>
        </div>
        <div className={styles.searchBox}>
          <input
            placeholder="Search steps and questions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
        </div>
        <nav className={styles.stepList} aria-label="Demo steps">
          {filteredSteps.map((s) => {
            const idx = steps.indexOf(s);
            const qCount = questionsByStep.get(s.id)?.length ?? 0;
            return (
              <button
                key={s.id}
                className={
                  s.id === selectedId && lens === "flow"
                    ? styles.stepItemOn
                    : styles.stepItem
                }
                onClick={() => {
                  setLens("flow");
                  setSelectedId(s.id);
                }}
              >
                <span className={styles.stepIndex}>{idx + 1}</span>
                <span className={styles.stepLabel}>
                  <span className={styles.stepName}>{s.title}</span>
                  <span className={styles.stepTime}>{s.timestampStart}</span>
                </span>
                {qCount > 0 && <span className={styles.stepQCount}>{qCount}q</span>}
              </button>
            );
          })}
          {filteredSteps.length === 0 && (
            <p className={styles.emptyNote}>No steps match “{query}”.</p>
          )}
        </nav>
        <div className={styles.sideFoot}>
          Every question from the recording is spoken for: {answeredCount} answered on the
          call, {questions.length - answeredCount} flagged as deferred/follow-up.
        </div>
      </aside>

      <main className={styles.main}>
        {lens === "flow" && selected && (
          <article className={styles.card} aria-live="polite">
            <header className={styles.cardHead}>
              <span className={styles.cardIndex}>{selectedIdx + 1}</span>
              <div className={styles.cardHeadText}>
                <h1 className={styles.cardTitle}>{selected.title}</h1>
                <div className={styles.cardMeta}>
                  <span className={styles.metaChip}>
                    {selected.timestampStart} → {selected.timestampEnd}
                  </span>
                  {selected.navContext && (
                    <span className={styles.metaChip}>{selected.navContext}</span>
                  )}
                </div>
              </div>
              <div className={styles.pager}>
                <button onClick={() => go(-1)} disabled={selectedIdx <= 0}>
                  ← Prev
                </button>
                <button onClick={() => go(1)} disabled={selectedIdx >= steps.length - 1}>
                  Next →
                </button>
              </div>
            </header>

            <p className={styles.purpose}>{selected.demoPurpose}</p>

            <Shot key={selected.id} id={selected.id} />

            <section className={styles.block}>
              <h2 className={styles.blockLabel}>On screen</h2>
              <p className={styles.blockText}>{selected.visualSummary}</p>
              {selected.onScreen.length > 0 && (
                <ul className={styles.blockList}>
                  {selected.onScreen.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.block}>
              <h2 className={styles.blockLabel}>Say</h2>
              <p className={styles.blockText}>{selected.say}</p>
            </section>

            <section className={styles.block}>
              <h2 className={styles.blockLabel}>
                Asked at this step
                {(questionsByStep.get(selected.id)?.length ?? 0) === 0 &&
                  " — nothing came up here"}
              </h2>
              {(questionsByStep.get(selected.id) ?? []).map((x) => (
                <QuestionCard key={x.id} q={x} />
              ))}
            </section>
          </article>
        )}

        {lens === "questions" && (
          <div className={styles.ledger}>
            <header className={styles.ledgerHead}>
              <h1>Question ledger</h1>
              <p>
                Every question asked on the recording, in order, mapped to the screen that
                was up when it was asked — with the answer that was given. {answeredCount}{" "}
                of {questions.length} were answered live; the rest are marked deferred or
                follow-up.
              </p>
            </header>
            {steps.map((s) => {
              const list = (questionsByStep.get(s.id) ?? []).filter((x) =>
                filteredQuestions.includes(x),
              );
              if (list.length === 0) return null;
              const idx = steps.indexOf(s);
              return (
                <section key={s.id} className={styles.ledgerGroup}>
                  <button
                    className={styles.ledgerStepLink}
                    onClick={() => {
                      setLens("flow");
                      setSelectedId(s.id);
                    }}
                  >
                    <span className={styles.stepIndex}>{idx + 1}</span>
                    {s.title}
                    <span className={styles.stepTime}>{s.timestampStart}</span>
                  </button>
                  {list.map((x) => (
                    <QuestionCard key={x.id} q={x} />
                  ))}
                </section>
              );
            })}
            {filteredQuestions.length === 0 && (
              <p className={styles.emptyNote}>No questions match “{query}”.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
