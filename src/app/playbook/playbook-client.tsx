"use client";

// The Call Sheet — the Playbook's face, triptych winner (founder-decreed
// 2026-08-24). Three panes: the bank on the left in the spoken voice, YOUR
// sheet in the middle (built before the call with +), and the live card on
// the right. During the call, click what you heard — the line stamps itself
// and the branch map pulls in the question that answer leads to. By the end,
// the plan has become the record of the conversation.
//
// The relay/copy chip is retired from this surface (the CSM-relay era's
// copy-a-sentence tool); relay lines still feed Groundwork's composers.
// "Why this question" arrives expanded and folds — never the reverse.

import { useEffect, useMemo, useRef, useState } from "react";
import { DASH_NODES } from "@/lib/dashboard/stages";
import { selectQuestions, NO_FILTERS, type Scenario } from "@/lib/intel/bank";
import { branchNext } from "@/lib/intel/branches";
import type { DiscoveryQ } from "@/lib/intel/discovery";
import styles from "./playbook.module.css";

type Q = DiscoveryQ;
type Knowledge = { id: string; text: string; from: string; at: string; who?: string };

/** A battlecard question proposed from what real buyers asked (C7, IV.5). The
 *  brain groups the asks; the Playbook is where a human decides. */
export type ProspectProposal = {
  question: string;
  read: string;
  asked: number;
  rooms: string;
};

const PHASE_LABEL = new Map(DASH_NODES.map((n) => [n.key as string, n.label]));
const CAT_LABEL: Record<string, string> = {
  footprint: "Where they hire",
  classification: "Employee or contractor",
  risk: "What could go wrong",
  incumbent: "Current provider",
  money: "Money",
  timing: "Timing",
  commercial: "Deal shape",
  platform: "Their systems",
};
const AUD_LABEL: Record<string, string> = {
  exec: "Executives",
  ops: "Operations",
  partner: "The partner",
};

// The sheet survives a reload for the Chicago day it was built on — the pad
// never eats your words. Per-viewer convenience only; nothing files.
const STASH_KEY = "playbook:callsheet:v1";
function chicagoDay(): string {
  try {
    return new Date().toLocaleDateString("en-US", { timeZone: "America/Chicago" });
  } catch {
    return new Date().toDateString();
  }
}

function shortDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

export function PlaybookClient({
  questions,
  scenarios,
  lessons,
  market,
  prospectAsks,
  oursNotTheirs,
  initialOpen = "",
}: {
  questions: Q[];
  scenarios: Scenario[];
  lessons: Knowledge[];
  market: Knowledge[];
  prospectAsks: ProspectProposal[];
  oursNotTheirs: string[];
  initialOpen?: string;
}) {
  const [tab, setTab] = useState<"sheet" | "learned">("sheet");
  const [scenarioId, setScenarioId] = useState("");
  const [lineup, setLineup] = useState<string[]>([]);
  const [heard, setHeard] = useState<Record<string, string>>({});
  const [liveIdx, setLiveIdx] = useState(0);
  const restored = useRef(false);

  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const scenario = useMemo(
    () => scenarios.find((s) => s.id === scenarioId) ?? null,
    [scenarios, scenarioId],
  );

  // The bank in the engine's order for the chosen situation.
  const bank = useMemo(() => {
    const f = {
      ...NO_FILTERS,
      product: scenario && scenario.product !== "any" ? scenario.product : ("" as const),
      soph:
        scenario && scenario.sophistication !== "any"
          ? scenario.sophistication
          : ("" as const),
    };
    return selectQuestions(questions, f, scenario);
  }, [questions, scenario]);

  // Restore today's sheet; a deep link (?open=) joins the lineup and goes live.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    let next: { lineup: string[]; heard: Record<string, string>; liveIdx: number } = {
      lineup: [],
      heard: {},
      liveIdx: 0,
    };
    try {
      const raw = window.localStorage.getItem(STASH_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as typeof next & { day?: string };
        if (saved.day === chicagoDay() && Array.isArray(saved.lineup)) {
          next = {
            lineup: saved.lineup.filter((id) => byId.has(id)),
            heard: saved.heard ?? {},
            liveIdx: saved.liveIdx ?? 0,
          };
        }
      }
    } catch {
      // a stash that can't be read is an empty sheet, never an error
    }
    if (initialOpen && byId.has(initialOpen) && !next.lineup.includes(initialOpen)) {
      next.lineup = [...next.lineup, initialOpen];
      next.liveIdx = next.lineup.length - 1;
    }
    setLineup(next.lineup);
    setHeard(next.heard);
    setLiveIdx(next.liveIdx);
  }, [initialOpen, byId]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(
        STASH_KEY,
        JSON.stringify({ day: chicagoDay(), lineup, heard, liveIdx }),
      );
    } catch {
      // storage refused — the sheet still works for the session
    }
  }, [lineup, heard, liveIdx]);

  const live =
    lineup.length > 0
      ? (byId.get(lineup[Math.min(liveIdx, lineup.length - 1)]) ?? null)
      : null;
  const inLineup = useMemo(() => new Set(lineup), [lineup]);

  const add = (id: string) => {
    if (!inLineup.has(id)) setLineup((l) => [...l, id]);
  };
  const remove = (i: number) => {
    setLineup((l) => l.filter((_, x) => x !== i));
    setLiveIdx((v) => (i < v ? v - 1 : Math.min(v, Math.max(0, lineup.length - 2))));
  };
  // What they said: stamp the sheet, follow the branch if one is wired,
  // otherwise advance down the lineup.
  const heardBranch = (q: Q, i: number) => {
    setHeard((h) => ({ ...h, [q.id]: q.listenFor[i] }));
    const next = branchNext(q.id, i);
    const at = lineup.indexOf(q.id);
    if (next && byId.has(next) && !lineup.includes(next)) {
      const nl = [...lineup];
      nl.splice(at + 1, 0, next);
      setLineup(nl);
      setLiveIdx(at + 1);
    } else if (next && lineup.includes(next)) {
      setLiveIdx(lineup.indexOf(next));
    } else if (at < lineup.length - 1) {
      setLiveIdx(at + 1);
    }
  };

  return (
    <div className={styles.board}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === "sheet" ? styles.tabOn : ""}`}
          onClick={() => setTab("sheet")}
        >
          The call sheet
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "learned" ? styles.tabOn : ""}`}
          onClick={() => setTab("learned")}
        >
          What the book learned
          <span className={styles.chipN}>
            {lessons.length + market.length + prospectAsks.length}
          </span>
        </button>
      </div>

      {tab === "sheet" ? (
        <div className={styles.sheetGrid}>
          {/* ── Pane 1 · the bank ─────────────────────────────────────── */}
          <div className={styles.paneBank}>
            <div className={styles.paneHead}>The bank</div>
            <select
              className={styles.scenSelect}
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
            >
              <option value="">No scenario — the engine&apos;s own order</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {scenario && <p className={styles.scenBlurb}>{scenario.blurb}</p>}
            {scenario && (
              <details className={styles.scenFold}>
                <summary>Watch for · {scenario.traps.length}</summary>
                <ul className={styles.scenList}>
                  {scenario.traps.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </details>
            )}
            {scenario && scenario.objections.length > 0 && (
              <details className={styles.scenFold}>
                <summary>They&apos;ll say · {scenario.objections.length}</summary>
                <ul className={styles.scenList}>
                  {scenario.objections.map((o) => (
                    <li key={o.objection}>
                      <b>&ldquo;{o.objection}&rdquo;</b> {o.counter}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className={styles.bankList}>
              {bank.map((q) => (
                <div key={q.id} className={styles.bankRow}>
                  <span className={styles.bankQ}>{q.question}</span>
                  <button
                    type="button"
                    className={`${styles.addBtn} ${inLineup.has(q.id) ? styles.addDone : ""}`}
                    title={inLineup.has(q.id) ? "on the sheet" : "add to the sheet"}
                    onClick={() => add(q.id)}
                  >
                    {inLineup.has(q.id) ? "✓" : "+"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Pane 2 · your sheet ───────────────────────────────────── */}
          <div className={styles.paneSheet}>
            <div className={styles.paneHead}>
              Your call sheet
              <span className={styles.chipN}>{lineup.length}</span>
            </div>
            {lineup.length === 0 ? (
              <p className={styles.empty}>
                Empty. Pull questions in with + and run the call from here.
              </p>
            ) : (
              lineup.map((id, i) => {
                const q = byId.get(id);
                if (!q) return null;
                const h = heard[id];
                return (
                  <div
                    key={id}
                    className={`${styles.sheetRow} ${live?.id === id ? styles.sheetLive : ""}`}
                    onClick={() => setLiveIdx(i)}
                  >
                    <span className={styles.sheetQ}>
                      {i + 1}. {q.question}
                    </span>
                    {h && (
                      <span className={styles.heardStamp}>heard · &ldquo;{h}&rdquo;</span>
                    )}
                    <button
                      type="button"
                      className={styles.rowX}
                      title="off the sheet"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(i);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
            {lineup.length > 0 && (
              <button
                type="button"
                className={styles.startOver}
                onClick={() => {
                  setLineup([]);
                  setHeard({});
                  setLiveIdx(0);
                }}
              >
                Start over
              </button>
            )}
          </div>

          {/* ── Pane 3 · live ─────────────────────────────────────────── */}
          <div className={styles.paneLive}>
            <div className={styles.paneHead}>Live</div>
            {live ? (
              <div className={styles.liveCard}>
                <div className={styles.liveMeta}>
                  {CAT_LABEL[live.category] ?? live.category} ·{" "}
                  {PHASE_LABEL.get(live.phase) ?? live.phase} ·{" "}
                  {AUD_LABEL[live.audience] ?? live.audience}
                </div>
                <div className={styles.liveQ}>{live.question}</div>
                <details className={styles.whyFold} open>
                  <summary>Why this question</summary>
                  <p>{live.why}</p>
                </details>
                <div className={styles.liveK}>If they say — click what you heard</div>
                {live.listenFor.map((l, i) => (
                  <button
                    key={l}
                    type="button"
                    className={`${styles.branchBtn} ${heard[live.id] === l ? styles.branchOn : ""}`}
                    onClick={() => heardBranch(live, i)}
                  >
                    &ldquo;{l}&rdquo;
                  </button>
                ))}
                <div className={styles.liveK}>Then</div>
                <p className={styles.thenLine}>{live.followUp}</p>
              </div>
            ) : (
              <p className={styles.empty}>
                Build the sheet first — this pane carries one question at a time once
                you&apos;re on the call.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.learned}>
          <div className={styles.kBlock}>
            <h2 className={styles.kHead}>
              What prospects ask{" "}
              <span className={styles.chipN}>{prospectAsks.length}</span>
            </h2>
            <p className={styles.kHint}>
              Questions real buyers asked in more than one room. Each is a battlecard
              candidate the bank doesn&apos;t cover yet. The brain proposes; you decide.
            </p>
            {prospectAsks.length === 0 ? (
              <p className={styles.empty}>
                Nothing yet. These arrive once the same question surfaces in two separate
                demos or calls.
              </p>
            ) : (
              prospectAsks.map((p) => (
                <div key={p.question} className={styles.kRow}>
                  <span className={styles.kText}>
                    {p.question}
                    <CopyBtn payload={p.question} label="copy" />
                  </span>
                  <span className={styles.kFrom}>
                    asked in {p.asked} room{p.asked === 1 ? "" : "s"}
                    {p.rooms ? ` (${p.rooms})` : ""} · {p.read}
                  </span>
                </div>
              ))
            )}
            {oursNotTheirs.length > 0 && (
              <p className={styles.kHint}>
                Ours, not theirs. Bank questions no buyer has ever needed answered:{" "}
                {oursNotTheirs.slice(0, 4).join(" · ")}
              </p>
            )}
          </div>
          <div className={styles.kBlock}>
            <h2 className={styles.kHead}>
              Lessons <span className={styles.chipN}>{lessons.length}</span>
            </h2>
            <p className={styles.kHint}>
              What a deal taught. Filed once, readable from every account.
            </p>
            {lessons.length === 0 ? (
              <p className={styles.empty}>
                Nothing yet. Lessons arrive on their own as pastes get read.
              </p>
            ) : (
              lessons.map((l) => (
                <div key={l.id} className={styles.kRow}>
                  <span className={styles.kText}>{l.text}</span>
                  <span className={styles.kFrom}>
                    {l.from || "—"} · {shortDate(l.at)}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className={styles.kBlock}>
            <h2 className={styles.kHead}>
              Market &amp; competitor facts{" "}
              <span className={styles.chipN}>{market.length}</span>
            </h2>
            <p className={styles.kHint}>
              True beyond the account that produced it. Each one keeps who said it.
            </p>
            {market.length === 0 ? (
              <p className={styles.empty}>
                Nothing yet. These accumulate from what the record actually says.
              </p>
            ) : (
              market.map((m) => (
                <div key={m.id} className={styles.kRow}>
                  <span className={styles.kText}>{m.text}</span>
                  <span className={styles.kFrom}>
                    {m.who ? `${m.who} · ` : ""}
                    {m.from || "—"} · {shortDate(m.at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
