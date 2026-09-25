"use client";

// The Playbook, two registers.
//
// The face is The Sheet (product first, founder-decreed 2026-09-15): what are
// we talking about, the product read the way its flyer reads, what partners
// say about it, and the country beside it. It arrives first and it is the
// whole instrument.
//
// The Call Sheet is retired (founder-decreed 2026-09-15). Its bank still
// exists as a library — the 113 discovery questions feed the battlecard
// harvest, the ask room's citations and the intranet — but it has no browsable
// surface any more, and nothing links at one.
//
// What is left beside the face: what the whole book has taught. The lessons
// deals leave behind, the market facts that outlive the account that produced
// them, and the questions real buyers asked that the bank does not cover.

import { useState } from "react";
import type { CountryRow } from "@/lib/playbook/countries";
import { ProductSheet } from "./product-sheet";
import styles from "./playbook.module.css";

type Knowledge = { id: string; text: string; from: string; at: string; who?: string };

/** A battlecard question proposed from what real buyers asked (C7, IV.5). The
 *  brain groups the asks; the Playbook is where a human decides. */
type ProspectProposal = {
  question: string;
  read: string;
  asked: number;
  rooms: string;
};

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
  lessons,
  market,
  prospectAsks,
  oursNotTheirs,
  countries,
  countryTally,
}: {
  lessons: Knowledge[];
  market: Knowledge[];
  prospectAsks: ProspectProposal[];
  oursNotTheirs: string[];
  countries: CountryRow[];
  countryTally: { priced: number; written: number };
}) {
  const [tab, setTab] = useState<"products" | "learned">("products");

  return (
    <div className={styles.board}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === "products" ? styles.tabOn : ""}`}
          onClick={() => setTab("products")}
        >
          The products
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "learned" ? styles.tabOn : ""}`}
          onClick={() => setTab("learned")}
        >
          What we&apos;ve learned
          <span className={styles.chipN}>
            {lessons.length + market.length + prospectAsks.length}
          </span>
        </button>
      </div>

      {tab === "products" ? (
        <ProductSheet index={countries} tally={countryTally} />
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
