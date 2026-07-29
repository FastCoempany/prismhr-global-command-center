"use client";

// The Playbook body. Three things live here: the scenario picker that shapes the
// card, the card itself, and the cross-account knowledge the paste reads have
// been collecting.
//
// The filter repair is the point of this rewrite. Chips carry their own counts
// computed against the OTHER active filters, a chip that would return nothing is
// inert rather than clickable, and an empty result says which filter to drop.
// The old card had three phase chips with no questions behind them at all and
// ANDed everything silently — two clicks and it read "0 of 25".

import { useMemo, useState } from "react";
import Link from "next/link";
import { DASH_NODES } from "@/lib/dashboard/stages";
import {
  NO_FILTERS,
  PRODUCT_LABEL,
  SOPH_LABEL,
  emptyBecause,
  facetCounts,
  selectQuestions,
  type Filters,
  type QProduct,
  type QSoph,
  type Scenario,
} from "@/lib/intel/bank";
import type { DiscoveryQ, QAudience, QCategory, QPhase } from "@/lib/intel/discovery";
import { askNextDone } from "../today/actions";
import { setScenario } from "./actions";
import styles from "./playbook.module.css";

type Q = DiscoveryQ;
type Knowledge = { id: string; text: string; from: string; at: string; who?: string };

const CATEGORIES: QCategory[] = [
  "footprint",
  "classification",
  "risk",
  "incumbent",
  "money",
  "timing",
  "commercial",
  "platform",
];
const AUDIENCES: QAudience[] = ["exec", "ops", "partner"];
const PRODUCTS: QProduct[] = ["eor", "contractor", "payroll"];
const SOPHS: QSoph[] = ["naive", "inhouse", "displacement"];
const PHASE_LABEL = new Map(DASH_NODES.map((n) => [n.key as string, n.label]));

function shortDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

function CopyBtn({ payload, label }: { payload: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copy}
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

// One facet's chip row. Every chip states what it would yield; a zero is shown
// and disabled rather than hidden, so the bank's shape stays legible.
function Facet<K extends keyof Filters>({
  label,
  facet,
  values,
  render,
  filters,
  counts,
  onPick,
}: {
  label: string;
  facet: K;
  values: readonly NonNullable<Filters[K]>[];
  render?: (v: string) => string;
  filters: Filters;
  counts: Map<string, number>;
  onPick: (facet: K, v: Filters[K]) => void;
}) {
  const active = filters[facet];
  return (
    <div className={styles.facet}>
      <span className={styles.facetLabel}>{label}</span>
      <button
        type="button"
        className={`${styles.chip} ${!active ? styles.chipOn : ""}`}
        onClick={() => onPick(facet, "" as Filters[K])}
      >
        all
      </button>
      {values.map((v) => {
        const n = counts.get(String(v)) ?? 0;
        const on = active === v;
        return (
          <button
            key={String(v)}
            type="button"
            className={`${styles.chip} ${on ? styles.chipOn : ""} ${n === 0 && !on ? styles.chipDead : ""}`}
            disabled={n === 0 && !on}
            title={
              n === 0 ? "no questions here with the current filters" : `${n} questions`
            }
            onClick={() => onPick(facet, (on ? "" : v) as Filters[K])}
          >
            {render ? render(String(v)) : String(v)}
            <span className={styles.chipN}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PlaybookClient({
  questions,
  scenarios,
  savedScenario,
  accountId,
  accounts,
  lessons,
  market,
  bankTotal,
}: {
  questions: Q[];
  scenarios: Scenario[];
  savedScenario: string;
  accountId: string;
  accounts: { id: string; name: string }[];
  lessons: Knowledge[];
  market: Knowledge[];
  bankTotal: number;
}) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [scenarioId, setScenarioId] = useState(savedScenario);
  const [tab, setTab] = useState<"card" | "learned">("card");

  const scenario = useMemo(
    () => scenarios.find((s) => s.id === scenarioId) ?? null,
    [scenarios, scenarioId],
  );

  // Choosing a scenario sets the product and sophistication it implies — the
  // operator can still override either chip afterwards.
  const pickScenario = (id: string) => {
    const next = scenarios.find((s) => s.id === id) ?? null;
    setScenarioId(next ? id : "");
    setFilters((f) => ({
      ...f,
      product: next && next.product !== "any" ? next.product : "",
      soph: next && next.sophistication !== "any" ? next.sophistication : "",
    }));
    if (accountId) void setScenario(accountId, next ? id : "");
  };

  const shown = useMemo(
    () => selectQuestions(questions, filters, scenario),
    [questions, filters, scenario],
  );
  const counts = useMemo(
    () => ({
      category: facetCounts(questions, filters, "category", CATEGORIES, scenario),
      phase: facetCounts(
        questions,
        filters,
        "phase",
        DASH_NODES.map((n) => n.key) as QPhase[],
        scenario,
      ),
      audience: facetCounts(questions, filters, "audience", AUDIENCES, scenario),
      product: facetCounts(questions, filters, "product", PRODUCTS, scenario),
      soph: facetCounts(questions, filters, "soph", SOPHS, scenario),
    }),
    [questions, filters, scenario],
  );

  const pick = <K extends keyof Filters>(facet: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [facet]: v }));

  return (
    <div className={styles.board}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === "card" ? styles.tabOn : ""}`}
          onClick={() => setTab("card")}
        >
          The card
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "learned" ? styles.tabOn : ""}`}
          onClick={() => setTab("learned")}
        >
          What the book learned
          <span className={styles.chipN}>{lessons.length + market.length}</span>
        </button>
        {accounts.length > 0 && (
          <span className={styles.bind}>
            {accountId ? (
              <>
                bound to this account ·{" "}
                <Link href="/playbook" className={styles.bindLink}>
                  unbind
                </Link>
              </>
            ) : (
              <>
                bind to an account for its countries and its scenario:{" "}
                {accounts.slice(0, 6).map((a) => (
                  <Link
                    key={a.id}
                    href={`/playbook?account=${a.id}`}
                    className={styles.bindLink}
                  >
                    {a.name}
                  </Link>
                ))}
              </>
            )}
          </span>
        )}
      </div>

      {tab === "card" ? (
        <>
          <div className={styles.scenWrap}>
            <span className={styles.facetLabel}>Scenario</span>
            <div className={styles.scenRow}>
              <button
                type="button"
                className={`${styles.scen} ${!scenarioId ? styles.scenOn : ""}`}
                onClick={() => pickScenario("")}
              >
                No scenario — the whole bank
              </button>
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.scen} ${scenarioId === s.id ? styles.scenOn : ""}`}
                  title={s.blurb}
                  onClick={() => pickScenario(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {scenario && (
              <div className={styles.scenBody}>
                <p className={styles.scenBlurb}>{scenario.blurb}</p>
                {scenario.traps.length > 0 && (
                  <div className={styles.scenBlock}>
                    <span className={styles.scenK}>Watch for</span>
                    <ul className={styles.scenList}>
                      {scenario.traps.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {scenario.objections.length > 0 && (
                  <div className={styles.scenBlock}>
                    <span className={styles.scenK}>They&apos;ll say</span>
                    <ul className={styles.scenList}>
                      {scenario.objections.map((o) => (
                        <li key={o.objection}>
                          <b>&ldquo;{o.objection}&rdquo;</b> {o.counter}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.filters}>
            <Facet
              label="Line"
              facet="product"
              values={PRODUCTS}
              render={(v) => PRODUCT_LABEL[v as QProduct]}
              filters={filters}
              counts={counts.product}
              onPick={pick}
            />
            <Facet
              label="Buyer"
              facet="soph"
              values={SOPHS}
              render={(v) => SOPH_LABEL[v as QSoph]}
              filters={filters}
              counts={counts.soph}
              onPick={pick}
            />
            <Facet
              label="Category"
              facet="category"
              values={CATEGORIES}
              filters={filters}
              counts={counts.category}
              onPick={pick}
            />
            <Facet
              label="Phase"
              facet="phase"
              values={DASH_NODES.map((n) => n.key) as QPhase[]}
              render={(v) => PHASE_LABEL.get(v) ?? v}
              filters={filters}
              counts={counts.phase}
              onPick={pick}
            />
            <Facet
              label="Audience"
              facet="audience"
              values={AUDIENCES}
              filters={filters}
              counts={counts.audience}
              onPick={pick}
            />
          </div>

          <div className={styles.count}>
            {shown.length} of {questions.length} showing
            {questions.length !== bankTotal && (
              <span className={styles.countNote}>
                {" "}
                · {bankTotal - questions.length} retired on this account
              </span>
            )}
          </div>

          {shown.length === 0 ? (
            <p className={styles.empty}>{emptyBecause(questions, filters, scenario)}</p>
          ) : (
            <div className={styles.grid}>
              {shown.map((q) => (
                <div key={q.id} className={styles.card}>
                  <div className={styles.tags}>
                    <span className={styles.tag}>{q.category}</span>
                    <span className={styles.tag}>
                      {PHASE_LABEL.get(q.phase) ?? q.phase}
                    </span>
                    <span className={styles.tag}>{q.audience}</span>
                    {q.product && q.product !== "any" && (
                      <span className={`${styles.tag} ${styles.tagLine}`}>
                        {PRODUCT_LABEL[q.product]}
                      </span>
                    )}
                    {q.soph && q.soph !== "any" && (
                      <span className={styles.tag}>{SOPH_LABEL[q.soph]}</span>
                    )}
                  </div>
                  <div className={styles.q}>
                    {q.question} <CopyBtn payload={q.question} label="copy" />
                  </div>
                  <div className={styles.why}>{q.why}</div>
                  <div className={styles.listen}>
                    <b>Listen for:</b> {q.listenFor.join(" · ")}
                  </div>
                  <div className={styles.follow}>
                    <b>Then:</b> {q.followUp}
                  </div>
                  <div className={styles.drum}>
                    <b>Relay:</b> <i>{q.drumLine}</i>{" "}
                    <CopyBtn payload={q.drumLine} label="copy relay" />
                    {accountId && (
                      <form action={askNextDone} className={styles.inline}>
                        <input type="hidden" name="accountId" value={accountId} />
                        <input type="hidden" name="questionId" value={q.id} />
                        <input type="hidden" name="returnTo" value="/playbook" />
                        <button className={styles.copy} title="asked — retire it here">
                          ✓ asked
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className={styles.learned}>
          <div className={styles.kBlock}>
            <h2 className={styles.kHead}>
              Lessons <span className={styles.chipN}>{lessons.length}</span>
            </h2>
            <p className={styles.kHint}>
              What a deal taught — filed once, readable from every account.
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
              True beyond the account that produced it — each one keeps who said it.
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
