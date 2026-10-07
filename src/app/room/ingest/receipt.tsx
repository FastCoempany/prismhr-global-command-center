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
// filing wrote (the click-depth law), every count it shows, asks and
// playbook lines included (ruled 2026-10-07, pass 8 call 9), read on request
// by the filing's id and never stored. The other settled lines open too
// (pass 8, C2 and C5): a duplicate to the earlier filing, a take-back to
// what it took, a backup to the file in git. Hover ↺ takes the whole filing
// back; hover ✕ clears the receipt; a read-only session sees the receipt and
// no ↺ (D29). The Spring's controls: minimal, hover-revealed, tooltip-titled.

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { GRAB_LABEL, grabCounts, type GrabSummary } from "@/lib/ingest/grab";
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
    // Plain words (pass 8, C6): "1 their promise" is not how anyone counts.
    r.promises ? many(r.promises, "promise from them", "promises from them") : "",
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
    // A failed backup under a filing says why, and so does one under a
    // filing that failed (pass 8 call 8); a backup that was the whole filing
    // says it on its own line instead.
    (filed || r.state === "error") && r.vault?.bad ? r.vault.text : "",
    r.note ?? "",
  ].filter(Boolean);
}

/** The backup's door: "open" to the file in git, when the vault gave a link. */
function OpenLink({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <>
      {" · "}
      <a href={url} target="_blank" rel="noreferrer">
        open
      </a>
    </>
  );
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

  // Open one filing's lines, read once on the first open: the lines live on
  // the rows, never on the ledger (D12). The filed line reads its own
  // filing; the duplicate reads the earlier one (pass 8, C2).
  const toggleFiling = (filingId: string | undefined) => () => {
    const next = !open;
    setOpen(next);
    if (next && wrote === null) {
      if (!acct || !filingId) {
        setWrote("none");
        return;
      }
      setWrote("reading");
      void filingWrote(acct.id, filingId).then((w) => setWrote(w ?? "none"));
    }
  };
  const wroteBody = (
    <>
      {wrote === "reading" && <p className={styles.rcptQuiet}>Reading…</p>}
      {wrote === "none" && (
        <p className={styles.rcptQuiet}>Nothing on file for this filing.</p>
      )}
      {wrote && typeof wrote === "object" && <WroteLists wrote={wrote} />}
    </>
  );
  const accountLink = acct && (
    <Link
      href={`/accounts?focus=${acct.id}`}
      className={styles.rcptAcct}
      title={shortName(acct.name) === acct.name ? undefined : acct.name}
    >
      {shortName(acct.name)}
    </Link>
  );

  // A Sales Nav grab files on many accounts and on none of them alone (seam
  // S-25): the line names the grab in the account's seat, then its counts
  // and the day. It opens to every count: the accounts it filed to, each a
  // plain link; the rows that matched no account while the tab holds them;
  // the accounts it was already on file under. ↺ takes back every
  // account's share.
  if (row.state === "filed" && row.grab) {
    const g = row.grab;
    const landed = row.vault && !row.vault.bad && !row.vault.going ? row.vault : null;
    return (
      <>
        <div className={styles.rcptRow}>
          <span className={styles.rcptLine}>
            <span className={styles.rcptOk}>✓</span>
            {GRAB_LABEL}{" "}
            <button
              type="button"
              className={styles.rcptOpen}
              aria-expanded={open}
              title={open ? "Hide what this grab filed" : "Show what this grab filed"}
              onClick={() => setOpen((v) => !v)}
            >
              {"· "}
              {[...grabCounts(g), row.day ?? ""].filter(Boolean).join(" · ")}
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
                        <OpenLink url={landed.url} />
                      </>
                    )}
                  </li>
                </ul>
              </>
            )}
            <GrabLists grab={g} />
          </div>
        )}
      </>
    );
  }

  if (row.state === "filed" && acct) {
    const landed = row.vault && !row.vault.bad && !row.vault.going ? row.vault : null;
    return (
      <>
        <div className={styles.rcptRow}>
          <span className={styles.rcptLine}>
            <span className={styles.rcptOk}>✓</span>
            {accountLink}{" "}
            {/* The separator's leading space sits outside the button: a
                button's first whitespace collapses, which ran the account
                name into its dot. */}
            <button
              type="button"
              className={styles.rcptOpen}
              aria-expanded={open}
              title={open ? "Hide what this filing wrote" : "Show what this filing wrote"}
              onClick={toggleFiling(row.filingId)}
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
                        <OpenLink url={landed.url} />
                      </>
                    )}
                  </li>
                </ul>
              </>
            )}
            {wroteBody}
          </div>
        )}
      </>
    );
  }

  // A duplicate opens one click to the earlier filing (pass 8, C2): the
  // decree's line verbatim, then the account it is on file under and the day
  // it filed, which opens to what that filing wrote.
  if (row.state === "dupe") {
    const prior = row.prior;
    return (
      <>
        <div className={styles.rcptRow}>
          <span className={styles.rcptQuiet}>
            {row.filename} · {row.reason ?? ""}
            {accountLink && (
              <>
                {" · "}
                {accountLink}
              </>
            )}
            {prior?.day && " · "}
            {prior?.day &&
              (acct && prior.filingId ? (
                <button
                  type="button"
                  className={styles.rcptOpen}
                  aria-expanded={open}
                  title={
                    open
                      ? "Hide what the earlier filing wrote"
                      : "Show what the earlier filing wrote"
                  }
                  onClick={toggleFiling(prior.filingId)}
                >
                  Filed {prior.day}
                </button>
              ) : (
                `Filed ${prior.day}`
              ))}
          </span>
          {ctl}
        </div>
        {open && <div className={styles.rcptWrote}>{wroteBody}</div>}
      </>
    );
  }

  // A take-back opens to what it took (pass 8, C5): the lines while the tab
  // holds them, and after a reload the counts the receipt kept, because the
  // record no longer holds the rows and the ledger never keeps text (D12).
  if (row.state === "undone") {
    const counts = receiptCounts(row);
    const canOpen = !!row.took || counts.length > 0;
    return (
      <>
        <div className={styles.rcptRow}>
          <span className={styles.rcptQuiet}>
            {"↺ "}
            {canOpen ? (
              <button
                type="button"
                className={styles.rcptOpen}
                aria-expanded={open}
                title={open ? "Hide what was taken back" : "Show what was taken back"}
                onClick={() => setOpen((v) => !v)}
              >
                {row.reason ?? ""}
              </button>
            ) : (
              (row.reason ?? "")
            )}
          </span>
          {ctl}
        </div>
        {caveat}
        {open && canOpen && (
          <div className={styles.rcptWrote}>
            {row.took ? (
              <WroteLists wrote={row.took} />
            ) : (
              <p className={styles.rcptQuiet}>{counts.join(" · ")}</p>
            )}
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
      // The backup's door rides every backup line, the refused export's
      // included (pass 8, C5).
      line = (
        <>
          {row.note ? `⇪ ${name}${day}` : `⇪ Backed up · ${name}${day}`}
          <OpenLink url={row.vault?.url} />
        </>
      );
      break;
    case "unfiled":
      line = `⇪ Not filed. Backed up. · ${name}${day}`;
      break;
    case "kept":
      line = `Not filed. Kept in the brain. · ${name}${day}`;
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
  // A filing that failed still backs its file up (pass 8 call 8), and the
  // receipt says so under the failure: in flight, landed with its door, or
  // the backup's own failure on the amber line.
  const failedBackup =
    row.state === "error" && row.vault && !row.vault.bad ? row.vault : null;
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
      {failedBackup && (
        <p className={styles.rcptQuiet}>
          {failedBackup.going ? (
            `⇪ ${failedBackup.text}`
          ) : (
            <>
              {"⇪ Not filed. Backed up."}
              <OpenLink url={failedBackup.url} />
            </>
          )}
        </p>
      )}
      {settled && caveat}
    </>
  );
}

/** What a grab filed, under its kickers, in the line's order: the accounts
 *  its rows filed to, the rows that matched no account, the accounts it was
 *  already on file under, the ones whose filing broke. A reloaded receipt
 *  keeps no row text (D12), so the unmatched rows then show as their count. */
function GrabLists({ grab }: { grab: GrabSummary }) {
  const names = (xs: { id: string; name: string }[]) =>
    xs.map((a) => (
      <li key={a.id}>
        <Link
          href={`/accounts?focus=${a.id}`}
          className={styles.rcptAcct}
          title={shortName(a.name) === a.name ? undefined : a.name}
        >
          {shortName(a.name)}
        </Link>
      </li>
    ));
  const missed = grab.missed ?? [];
  return (
    <>
      {grab.accounts.length > 0 && (
        <div>
          <div className={styles.rcptWroteK}>Filed</div>
          <ul className={styles.rcptWroteList}>{names(grab.accounts)}</ul>
        </div>
      )}
      {grab.unmatched > 0 && (
        <div>
          <div className={styles.rcptWroteK}>Matched no account</div>
          {missed.length > 0 ? (
            <ul className={styles.rcptWroteList}>
              {missed.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.rcptQuiet}>
              {grab.unmatched} {grab.unmatched === 1 ? "row" : "rows"}. Nothing filed.
            </p>
          )}
        </div>
      )}
      {grab.duplicates.length > 0 && (
        <div>
          <div className={styles.rcptWroteK}>Already on file</div>
          <ul className={styles.rcptWroteList}>{names(grab.duplicates)}</ul>
        </div>
      )}
      {grab.failed.length > 0 && (
        <div>
          <div className={styles.rcptWroteK}>Didn&apos;t file</div>
          <ul className={styles.rcptWroteList}>{names(grab.failed)}</ul>
        </div>
      )}
    </>
  );
}

/** What the filing wrote, under its kickers, in the line's order: the
 *  entries, the to-dos, their promises, the asks, the playbook lines. Every
 *  count the line shows has its list (pass 8 call 9). */
function WroteLists({ wrote }: { wrote: FilingWrote }) {
  const asks = wrote.asks ?? [];
  const learned = wrote.learned ?? [];
  const sections: [string, string[]][] = [
    ["Filed", wrote.filed],
    [wrote.todos.length === 1 ? "To-do" : "To-dos", wrote.todos],
    [wrote.promises.length === 1 ? "Their promise" : "Their promises", wrote.promises],
    [asks.length === 1 ? "Ask" : "Asks", asks],
    ["To the playbook", learned],
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
