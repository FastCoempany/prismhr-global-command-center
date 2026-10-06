"use client";

// The receipt (slice 18a of the Chute brains refactor plan; the face the
// founder approved with a ship order on 2026-10-06). One component at both
// doors: the Chute's ledger and the Drop's TODAY register paint every
// receipt through it, so the two cannot drift.
//
// One line per filing, in the mono voice: ✓, the account as a plain link,
// each count that is not zero, the day and the routing rung in plain words.
// That is what a settled row keeps (D12): the account, the counts, the day
// and the rung, never an address or body text. The door and the reader never
// show. A second line, amber-ticked, speaks only when something needs saying:
// every window that cut the read (D4), the duplicate check that failed open
// (D7), the reader that was down, a backup that failed, the refused export's
// decreed line on the Drop. The line opens in place, one click, to what the
// filing wrote (the click-depth law), read on request by the filing's id and
// never stored. Hover ↺ takes the whole filing back; hover ✕ clears the
// receipt; a read-only session sees the receipt and no ↺ (D29). The Spring's
// controls: minimal, hover-revealed, tooltip-titled.

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { shortName } from "@/lib/ingest/short-name";
import { filingSentences } from "@/lib/ingest/windows";
import type { FilingWrote } from "@/lib/ingest/wrote";
import type { LedgerRow } from "../chute-ledger";
import { filingWrote } from "../filing-actions";
import styles from "../room.module.css";

/** The receipt's sentence for a filing the reader could not read. */
export const READER_DOWN = "The reader was down. Only the text filed.";

/** The routing rung in plain words: how the filing found its account. The
 *  rung stands in for the router's why, which can carry an address (D12). */
export function rungWord(rung?: string): string {
  switch (rung) {
    case "email":
      return "address";
    case "domain":
      return "domain";
    case "person":
      return "person";
    case "name":
    case "head":
    case "initials":
      return "name";
    case "pick":
    case "batch":
      return "picked";
    default:
      return "";
  }
}

const many = (n: number, one: string, more: string): string =>
  `${n} ${n === 1 ? one : more}`;

/** Each count a filing's line carries, in the face's order, zeros left out. */
export function receiptCounts(
  r: Pick<LedgerRow, "filed" | "opened" | "promises" | "asks" | "learned">,
): string[] {
  return [
    r.filed ? `${r.filed} filed` : "",
    r.opened ? many(r.opened, "to-do", "to-dos") : "",
    r.promises ? many(r.promises, "their promise", "their promises") : "",
    r.asks ? many(r.asks, "ask", "asks") : "",
    r.learned ? `${r.learned} to the playbook` : "",
  ].filter(Boolean);
}

/** The second line's sentences, one for each thing that needs saying, and
 *  none when nothing does. */
export function receiptCaveats(r: LedgerRow): string[] {
  const filed = r.state === "filed";
  return [
    ...(filed ? filingSentences(r) : []),
    filed && r.degraded ? READER_DOWN : "",
    // A failed backup under a filing says why; a backup that was the whole
    // filing says it on its own line instead.
    filed && r.vault?.bad ? r.vault.text : "",
    r.note ?? "",
  ].filter(Boolean);
}

/** What follows the account on a filing's line: the counts, the day, the
 *  rung. */
export function receiptTail(r: LedgerRow): string {
  return [...receiptCounts(r), r.day ?? "", rungWord(r.rung)].filter(Boolean).join(" · ");
}

type Wrote = FilingWrote | "reading" | "none";

export function ReceiptLine({
  row,
  canWrite,
  onTakeBack,
  onClear,
  defaultOpen = false,
  wrote: given,
}: {
  row: LedgerRow;
  canWrite: boolean;
  /** The whole filing's take-back; absent when there is nothing to take. */
  onTakeBack?: () => void;
  /** Clears this receipt from the ledger; the record keeps what filed. */
  onClear?: () => void;
  /** Opens the line on first paint, for the suite. */
  defaultOpen?: boolean;
  /** What the filing wrote, when the caller already holds it. */
  wrote?: FilingWrote;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [wrote, setWrote] = useState<Wrote | null>(given ?? null);
  const acct = row.account;

  const ctl = (
    <span className={styles.rcptCtl}>
      {canWrite && onTakeBack && row.state === "filed" && (
        <button
          type="button"
          title="Take back everything this filing wrote"
          aria-label="Take back everything this filing wrote"
          onClick={onTakeBack}
        >
          ↺
        </button>
      )}
      {onClear && (
        <button
          type="button"
          title="Clear this receipt"
          aria-label="Clear this receipt"
          onClick={onClear}
        >
          ✕
        </button>
      )}
    </span>
  );
  const caveats = receiptCaveats(row);
  const caveat = caveats.length > 0 && (
    <p className={styles.rcptCaveat}>{caveats.join(" ")}</p>
  );

  if (row.state === "filed" && acct) {
    const toggle = () => {
      const next = !open;
      setOpen(next);
      // Read once, on the first open: the lines live on the rows, never on
      // the ledger (D12).
      if (next && wrote === null) {
        if (!row.filingId) {
          setWrote("none");
          return;
        }
        setWrote("reading");
        void filingWrote(acct.id, row.filingId).then((w) => setWrote(w ?? "none"));
      }
    };
    const landed = row.vault && !row.vault.bad && !row.vault.going ? row.vault : null;
    return (
      <>
        <div className={styles.rcptRow}>
          <span className={styles.rcptLine}>
            <span className={styles.rcptOk}>✓</span>
            <Link
              href={`/accounts?focus=${acct.id}`}
              className={styles.rcptAcct}
              title={shortName(acct.name) === acct.name ? undefined : acct.name}
            >
              {shortName(acct.name)}
            </Link>{" "}
            {/* The separator's leading space sits outside the button: a
                button's first whitespace collapses, which ran the account
                name into its dot. */}
            <button
              type="button"
              className={styles.rcptOpen}
              aria-expanded={open}
              title={open ? "Hide what this filing wrote" : "Show what this filing wrote"}
              onClick={toggle}
            >
              {"· "}
              {receiptTail(row)}
            </button>
          </span>
          {ctl}
        </div>
        {caveat}
        {row.vault?.going && <p className={styles.rcptQuiet}>⇪ {row.vault.text}</p>}
        {open && (
          <div className={styles.rcptWrote}>
            {row.filename && (
              <>
                <div className={styles.rcptWroteK}>File</div>
                <ul className={styles.rcptWroteList}>
                  <li>
                    {row.filename}
                    {landed && (
                      <>
                        {" · Backed up"}
                        {landed.url && (
                          <>
                            {" · "}
                            <a href={landed.url} target="_blank" rel="noreferrer">
                              open
                            </a>
                          </>
                        )}
                      </>
                    )}
                  </li>
                </ul>
              </>
            )}
            {wrote === "reading" && <p className={styles.rcptQuiet}>Reading…</p>}
            {wrote === "none" && (
              <p className={styles.rcptQuiet}>Nothing on file for this filing.</p>
            )}
            {wrote && typeof wrote === "object" && <WroteLists wrote={wrote} />}
          </div>
        )}
      </>
    );
  }

  // Every other settled row is one quiet line with its ✕, and the in-flight
  // rows say what is happening and carry no control.
  const day = row.day ? ` · ${row.day}` : "";
  const name = row.filename;
  let line: ReactNode;
  let tone = styles.rcptLine;
  let settled = true;
  switch (row.state) {
    case "vaulted":
      line = (
        <>
          {row.note ? `⇪ ${name}${day}` : `⇪ Backed up · ${name}${day}`}
          {!row.note && row.vault?.url && (
            <>
              {" · "}
              <a href={row.vault.url} target="_blank" rel="noreferrer">
                open
              </a>
            </>
          )}
        </>
      );
      break;
    case "unfiled":
      line = `⇪ Not filed. Backed up. · ${name}${day}`;
      break;
    case "kept":
      line = `Not filed. Kept in the brain. · ${name}${day}`;
      break;
    case "undone":
      line = `↺ ${row.reason ?? ""}`;
      tone = styles.rcptQuiet;
      break;
    case "dupe":
      line = `${name} · ${row.reason ?? ""}`;
      tone = styles.rcptQuiet;
      break;
    case "error":
      line = `${name} · ${row.reason ?? ""}`;
      tone = styles.rcptErr;
      break;
    case "interrupted":
      line = `${name} · ${row.reason ?? ""}`;
      tone = styles.rcptWarn;
      break;
    default:
      settled = false;
      line = row.vault?.going
        ? `${name} · ⇪ ${row.vault.text}`
        : row.state === "filing" && acct
          ? `${name} · Filing to ${shortName(acct.name)}…`
          : `${name} · Reading…`;
  }
  return (
    <>
      <div className={styles.rcptRow}>
        <span
          className={tone}
          title={
            row.state === "vaulted" && acct
              ? `Backed up under ${shortName(acct.name)}.`
              : undefined
          }
        >
          {line}
        </span>
        {settled && ctl}
      </div>
      {settled && caveat}
    </>
  );
}

/** What the filing wrote, under its kickers: the entries, the to-dos, their
 *  promises. */
function WroteLists({ wrote }: { wrote: FilingWrote }) {
  const sections: [string, string[]][] = [
    ["Filed", wrote.filed],
    [wrote.todos.length === 1 ? "To-do" : "To-dos", wrote.todos],
    [wrote.promises.length === 1 ? "Their promise" : "Their promises", wrote.promises],
  ];
  const shown = sections.filter(([, xs]) => xs.length > 0);
  if (shown.length === 0)
    return <p className={styles.rcptQuiet}>Nothing on file for this filing.</p>;
  return (
    <>
      {shown.map(([k, xs]) => (
        <div key={k}>
          <div className={styles.rcptWroteK}>{k}</div>
          <ul className={styles.rcptWroteList}>
            {xs.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
