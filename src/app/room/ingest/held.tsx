"use client";

// The held file (slice 18a of the Chute brains refactor plan; the face the
// founder approved with a ship order on 2026-10-06). One box at every door:
// the Chute's held row, the Drop's held question, and, through the Chute
// mounted on the Intranet page, a Send-it capture the guard disputed.
//
// State first. The top line is the amber HELD kicker and the file. The
// second is the rung's reason, nine words or fewer (D9 as amended
// 2026-10-05), and it opens in place, one click, to the grounds: each rung
// that spoke, in plain words, and what the row it was dropped on carries
// (the click-depth law). An address may show inside these open grounds,
// because the hold is live; a settled row never carries one (D12). The
// third line is the choices: the app's best guess as the solid ink button,
// the row it was dropped on as a text button, every other account behind
// one door (the candidates by rung, the batch sibling marked as the
// suggestion it is and never a rung, D6, then a search of the book), and a
// hover ✕ that files nothing. Every choice is final and files with force;
// the read runs again and nothing is re-judged (D5). Amber marks the hold;
// no orange here, because the row's move owns the page's one orange.

import { Fragment, useState } from "react";
import { shortName } from "@/lib/ingest/short-name";
import type { HeldVerdict } from "../chute-ledger";
import { chuteBook, type BookName } from "../route-actions";
import styles from "../room.module.css";

/** The ✕'s title where it backs the file up (the Chute's, the Drop's). */
export const HELD_X_TITLE = "Don't file it. It still backs up.";
/** The ✕'s title on a Send-it capture, which stays in the brain (P2). */
export const HELD_X_TITLE_BRAIN = "Don't file it. It stays in the brain.";
/** The sentence a held row with no verdict says. */
export const NO_SURE_MATCH = "No sure match. Pick the account.";
/** The sentence a held binary the reader cannot open says. */
export const VAULT_PICK = "A file the reader can't open. Pick its account for the vault.";

export type HeldAccount = { id: string; name: string };

/** How a choice was made: the claim's button, the row's own, a pick from
 *  the list, or the batch sibling's suggestion. */
export type HeldChoice = "claim" | "bound" | "pick" | "batch";

const sentence = (s: string): string => {
  const t = s.trim();
  if (!t) return "";
  const up = t[0]!.toUpperCase() + t.slice(1);
  return /[.!?]$/.test(up) ? up : `${up}.`;
};

/** A why the guard hands back (src/lib/intel/misfile.ts, route-capture.ts),
 *  said as a plain sentence for the grounds. */
export function whySentence(why: string, name: string): string {
  const w = (why ?? "").trim();
  let m: RegExpExecArray | null;
  if ((m = /^the read names (.+)$/i.exec(w))) return `The read names ${m[1]}.`;
  if ((m = /^(.+?) is (.+)'s contact$/i.exec(w)))
    return `${m[1]} is the book's contact for ${m[2]}.`;
  if ((m = /^(\S+) address in the text$/i.exec(w)))
    return `A ${m[1]} address is in the text.`;
  if (/^named in the text$/i.test(w)) return `${name} is named in the text.`;
  if ((m = /^“(.+)” appears in the text$/.exec(w)))
    return `“${m[1]}” appears in the text.`;
  if ((m = /^“(.+)” matches the initials$/.exec(w)))
    return `“${m[1]}” matches ${name}'s initials.`;
  return sentence(w);
}

/** The grounds a verdict opens to, each rung that spoke under its plain
 *  name, then what the row it was dropped on carries. */
export function groundsOf(
  v: HeldVerdict,
  claim: string,
  bound: string,
): { k: string; v: string; web?: boolean }[] {
  const rows: { k: string; v: string; web?: boolean }[] = [];
  const why = whySentence(v.why ?? "", claim);
  if (v.rung === "read") {
    if (why) rows.push({ k: "From the read", v: why });
    if (v.reasonBy === "model" && v.reason)
      rows.push({ k: "Web check", v: v.reason, web: true });
  } else if (why) rows.push({ k: "In the text", v: why });
  const row = shortName(bound);
  if (row)
    rows.push({
      k: `For ${row}`,
      v: v.boundWhy?.trim()
        ? whySentence(v.boundWhy, bound)
        : `Nothing in the text names ${row} or its people.`,
    });
  return rows;
}

/** The book's full name, for a tooltip, when the line says it shorter. */
const fullName = (name: string): string | undefined =>
  shortName(name) === name ? undefined : name;

const RUNG_LABEL: Record<string, string> = {
  email: "Address",
  domain: "Domain",
  person: "Person",
  name: "Name",
  head: "Name",
  initials: "Name",
};

/** The accounts behind "Another account", in order: the router's candidates
 *  by rung, the row it was dropped on, the batch sibling as a suggestion. */
export function otherAccounts(inp: {
  candidates?: readonly { id: string; name: string; rung: string }[];
  bound?: HeldAccount | null;
  suggestion?: HeldAccount | null;
}): { account: HeldAccount; label: string; how: HeldChoice; title?: string }[] {
  const out: { account: HeldAccount; label: string; how: HeldChoice; title?: string }[] =
    [];
  const seen = new Set<string>();
  const add = (a: HeldAccount, label: string, how: HeldChoice, title?: string) => {
    if (seen.has(a.id)) return;
    seen.add(a.id);
    out.push({ account: { id: a.id, name: a.name }, label, how, title });
  };
  const held = new Set([inp.bound?.id, inp.suggestion?.id].filter(Boolean));
  for (const c of inp.candidates ?? [])
    if (!held.has(c.id)) add(c, RUNG_LABEL[c.rung] ?? "", "pick");
  if (inp.bound) add(inp.bound, "Dropped here", "bound");
  if (inp.suggestion)
    add(
      inp.suggestion,
      "Same batch",
      "batch",
      "A suggestion. The rest of this drop filed there.",
    );
  return out;
}

export function HeldBox({
  file,
  verdict,
  say,
  claim = "",
  bound,
  candidates,
  suggestion,
  canWrite = true,
  busy = false,
  dismissTitle = HELD_X_TITLE,
  status,
  onPick,
  onDismiss,
  defaultOpen,
}: {
  file: string;
  /** The rung's verdict; absent on a row with no sure match. */
  verdict?: HeldVerdict | null;
  /** What a row with no verdict says. */
  say?: string;
  /** What the capture reads like. */
  claim?: string;
  /** The row it was dropped on, or the account the route chose. */
  bound?: HeldAccount | null;
  candidates?: readonly { id: string; name: string; rung: string }[];
  /** The batch sibling: where the rest of this drop filed. */
  suggestion?: HeldAccount | null;
  canWrite?: boolean;
  busy?: boolean;
  dismissTitle?: string;
  /** What the box is doing while a choice runs: a backup's progress. */
  status?: string;
  onPick: (account: HeldAccount, how: HeldChoice) => void;
  onDismiss: () => void;
  /** Opens the grounds or the account list on first paint, for the suite. */
  defaultOpen?: "grounds" | "others";
}) {
  const [grounds, setGrounds] = useState(defaultOpen === "grounds");
  const [others, setOthers] = useState(defaultOpen === "others");
  const [book, setBook] = useState<BookName[] | null>(null);
  const [q, setQ] = useState("");

  const claimAccount: HeldAccount | null =
    verdict?.claimId && claim ? { id: verdict.claimId, name: claim } : null;
  // The solid button is the app's best guess: the account the capture reads
  // like when the book holds it; on a row with no verdict, the suggestion,
  // then the router's strongest candidate.
  // The router's candidates ride the verdict; a door may hand its own.
  const pool = candidates ?? verdict?.candidates ?? [];
  const top = pool[0];
  const guess: { account: HeldAccount; how: HeldChoice; title?: string } | null =
    claimAccount
      ? { account: claimAccount, how: "claim" }
      : !verdict && suggestion
        ? {
            account: suggestion,
            how: "batch",
            title: "A suggestion. The rest of this drop filed there.",
          }
        : !verdict && top
          ? { account: { id: top.id, name: top.name }, how: "pick" }
          : null;
  const list = otherAccounts({ candidates: pool, bound, suggestion });
  const listed = new Set(list.map((o) => o.account.id));
  const needle = q.trim().toLowerCase();
  const found =
    needle && book
      ? book
          .filter((b) => !listed.has(b.id) && b.name.toLowerCase().includes(needle))
          .slice(0, 8)
      : [];
  const hasGrounds = !!verdict && !!(verdict.why || verdict.boundWhy || verdict.reasonBy);
  // The book's names arrive once, the first time the list opens or the
  // search takes focus; names only, the routing signals stay on the server
  // (D12).
  const loadBook = () => {
    if (book !== null) return;
    setBook([]);
    void chuteBook().then((b) => setBook(b));
  };

  return (
    <div className={styles.held}>
      <div className={styles.heldTop}>
        <span className={styles.heldPill}>Held</span>
        {file && <span className={styles.heldFile}>{file}</span>}
      </div>
      {verdict?.reason && hasGrounds ? (
        <button
          type="button"
          className={styles.heldReason}
          aria-expanded={grounds}
          title={grounds ? "Hide the evidence" : "Show the evidence"}
          onClick={() => setGrounds((v) => !v)}
        >
          {verdict.reason}
          <span className={styles.heldWhy}>WHY {grounds ? "▴" : "▾"}</span>
        </button>
      ) : (
        <p className={styles.heldSay}>{verdict?.reason || say || NO_SURE_MATCH}</p>
      )}
      {grounds && verdict && hasGrounds && (
        <dl className={styles.heldGrounds}>
          {groundsOf(verdict, claim, bound?.name ?? "").map((g) => (
            <Fragment key={g.k}>
              <dt className={g.web ? `${styles.heldK} ${styles.heldKWeb}` : styles.heldK}>
                {g.k}
              </dt>
              <dd className={styles.heldV}>{g.v}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      {canWrite && (
        <div className={styles.heldChoices}>
          {guess && (
            <button
              type="button"
              className={styles.heldSolid}
              disabled={busy}
              title={guess.title}
              onClick={() => onPick(guess.account, guess.how)}
            >
              File to {shortName(guess.account.name)}
            </button>
          )}
          {bound && (
            <button
              type="button"
              className={styles.heldText}
              disabled={busy}
              onClick={() => onPick(bound, "bound")}
            >
              Keep on {shortName(bound.name)}
            </button>
          )}
          <button
            type="button"
            className={styles.heldText}
            disabled={busy}
            aria-expanded={others}
            onClick={() => {
              setOthers((v) => !v);
              loadBook();
            }}
          >
            {guess || bound ? "Another account" : "Pick the account"} {others ? "▴" : "▾"}
          </button>
          <button
            type="button"
            className={styles.heldX}
            disabled={busy}
            title={dismissTitle}
            aria-label={dismissTitle}
            onClick={onDismiss}
          >
            ✕
          </button>
        </div>
      )}
      {status && <p className={styles.rcptQuiet}>{status}</p>}
      {canWrite && others && (
        <ul className={styles.heldOthers}>
          {list.map((o) => (
            <li key={o.account.id}>
              <button
                type="button"
                className={styles.heldOther}
                disabled={busy}
                title={o.title ?? fullName(o.account.name)}
                onClick={() => onPick(o.account, o.how)}
              >
                <span>{shortName(o.account.name)}</span>
                {o.label && <span className={styles.heldOtherRung}>{o.label}</span>}
              </button>
            </li>
          ))}
          <li>
            <input
              type="search"
              className={styles.heldSearch}
              placeholder="Search the book…"
              aria-label="Search the book"
              value={q}
              onFocus={loadBook}
              onChange={(e) => setQ(e.target.value)}
            />
          </li>
          {found.map((b) => (
            <li key={`b${b.id}`}>
              <button
                type="button"
                className={styles.heldOther}
                disabled={busy}
                title={fullName(b.name)}
                onClick={() => onPick({ id: b.id, name: b.name }, "pick")}
              >
                <span>{shortName(b.name)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
