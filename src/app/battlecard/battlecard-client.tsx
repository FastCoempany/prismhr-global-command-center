"use client";

// Battlecard body — filter chips over the question bank; every card carries
// question / why / listen-for / follow-up / drum line with copy buttons.

import { useMemo, useState } from "react";
import { DASH_NODES } from "@/lib/dashboard/stages";
import { askNextDone } from "../today/actions";
import styles from "./battlecard.module.css";

type Q = {
  id: string;
  category: string;
  phase: string;
  audience: string;
  question: string;
  why: string;
  listenFor: string[];
  followUp: string;
  drumLine: string;
};

const CATEGORIES = [
  "footprint",
  "classification",
  "risk",
  "incumbent",
  "money",
  "timing",
  "commercial",
  "platform",
];
const AUDIENCES = ["exec", "ops", "partner"];
const PHASE_LABEL = new Map(DASH_NODES.map((n) => [n.key, n.label]));

function CopyBtn({ payload, label }: { payload: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copyBtn}
      title={payload}
      onClick={() => {
        void navigator.clipboard.writeText(payload);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
    >
      {copied ? "✓ copied" : label}
    </button>
  );
}

function ChipRow({
  label,
  values,
  active,
  onPick,
  render,
}: {
  label: string;
  values: string[];
  active: string;
  onPick: (v: string) => void;
  render?: (v: string) => string;
}) {
  return (
    <div className={styles.chipRow}>
      <span className={styles.chipLabel}>{label}</span>
      <button
        type="button"
        className={`${styles.chip} ${active === "" ? styles.chipOn : ""}`}
        onClick={() => onPick("")}
      >
        all
      </button>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          className={`${styles.chip} ${active === v ? styles.chipOn : ""}`}
          onClick={() => onPick(active === v ? "" : v)}
        >
          {render ? render(v) : v}
        </button>
      ))}
    </div>
  );
}

export function BattlecardClient({
  questions,
  accountId,
}: {
  questions: Q[];
  accountId: string;
}) {
  const [category, setCategory] = useState("");
  const [phase, setPhase] = useState("");
  const [audience, setAudience] = useState("");

  const shown = useMemo(
    () =>
      questions.filter(
        (q) =>
          (!category || q.category === category) &&
          (!phase || q.phase === phase) &&
          (!audience || q.audience === audience),
      ),
    [questions, category, phase, audience],
  );

  return (
    <div className={styles.board}>
      <div className={styles.filters}>
        <ChipRow
          label="Category"
          values={CATEGORIES}
          active={category}
          onPick={setCategory}
        />
        <ChipRow
          label="Phase"
          values={DASH_NODES.map((n) => n.key)}
          active={phase}
          onPick={setPhase}
          render={(v) => PHASE_LABEL.get(v as never) ?? v}
        />
        <ChipRow
          label="Audience"
          values={AUDIENCES}
          active={audience}
          onPick={setAudience}
        />
      </div>

      <div className={styles.count}>
        {shown.length} of {questions.length} questions
      </div>

      <div className={styles.grid}>
        {shown.map((q) => (
          <div key={q.id} className={styles.card}>
            <div className={styles.tags}>
              <span className={styles.tag}>{q.category}</span>
              <span className={styles.tag}>
                {PHASE_LABEL.get(q.phase as never) ?? q.phase}
              </span>
              <span className={styles.tag}>{q.audience}</span>
            </div>
            <div className={styles.q}>
              {q.question} <CopyBtn payload={q.question} label="📋" />
            </div>
            <div className={styles.why}>{q.why}</div>
            <div className={styles.listen}>
              <b>Listen for:</b> {q.listenFor.join(" · ")}
            </div>
            <div className={styles.follow}>
              <b>Follow-up:</b> {q.followUp}
            </div>
            <div className={styles.drum}>
              <b>Drum:</b> <i>{q.drumLine}</i>{" "}
              <CopyBtn payload={q.drumLine} label="📋 drum" />
              {accountId && (
                <form action={askNextDone} className={styles.inline}>
                  <input type="hidden" name="accountId" value={accountId} />
                  <input type="hidden" name="questionId" value={q.id} />
                  <input type="hidden" name="returnTo" value="/battlecard" />
                  <button
                    className={styles.copyBtn}
                    title="Asked — retire for this account"
                  >
                    ✓ asked
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
