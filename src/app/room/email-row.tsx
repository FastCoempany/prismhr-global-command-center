"use client";

// The email in the HomeRoom row (ship order 2026-10-20; CLAUDE.md, The email
// in the row; docs/mockups/homeroom-email-row-2026-10-20.html, Concept A).
// The left column carries the newest email whole under the meter, and never
// makes the row taller than the right panel: past that height the email
// fades, with one door to the rest. EARLIER's lines read who, when and the
// subject, and each opens in place to what the account record history holds
// for it. The data is the page's (src/lib/room/email-row.ts); this draws it.

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { LatestEmail, OwedLine, RecordLine } from "@/lib/room/email-row";
import type { WholeMissing } from "@/lib/notes/email-text";
import styles from "./room.module.css";

export type RowLatestEmail = LatestEmail & {
  whole?: string | null;
  missing?: WholeMissing | "";
};

const MISSING: Record<WholeMissing, string> = {
  before: "This one was filed before whole emails were kept.",
  capture: "This filing didn't include the whole email.",
  record: "This send was logged from the app.",
  // The store could not be read: the line claims nothing.
  unread: "",
};

/** Who owes an Owed line: CLOSED once kept, YOU OWE for ours, the owner's
 *  first name when the read named a person, the owner as the read wrote it
 *  when it named a group ("THEIR LEGAL TEAM OWES"), else OWED. */
function owedLabel(o: OwedLine): string {
  if (o.closed) return "CLOSED";
  if (o.mine) return "YOU OWE";
  const who = o.who.trim();
  const [first = ""] = who.split(/\s+/);
  if (
    /^\p{Lu}[\p{Ll}\p{M}]+$/u.test(first) &&
    !/^(?:The|Their|Our|His|Her|My|Your|Its)$/.test(first)
  )
    return `${first.toUpperCase()} OWES`;
  if (who && who.split(/\s+/).length <= 3) return `${who.toUpperCase()} OWES`;
  return "OWED";
}

/** Who wrote to whom, with the door to everyone else on it. */
function WhoLine({ from, to, others }: { from: string; to: string; others: string[] }) {
  const [open, setOpen] = useState(false);
  if (!from) return null;
  return (
    <>
      <b>{from}</b>
      {`${to ? ` → ${to}` : ""}${others.length > 0 ? " " : ""}`}
      {others.length > 0 && (
        <>
          <button
            type="button"
            className={styles.entPlus}
            aria-expanded={open}
            title="Everyone else on it"
            onClick={() => setOpen((v) => !v)}
          >
            {`+${others.length}`}
          </button>
          {open && <span className={styles.entOthers}>{others.join(", ")}</span>}
        </>
      )}
    </>
  );
}

/** The newest email, whole, under the meter. */
export function LatestEmailPane({ email }: { email: RowLatestEmail }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [cap, setCap] = useState<number | null>(null);
  const [whole, setWhole] = useState(false);
  const body = email.whole || email.kept;

  // The cap: the right panel's height, less what the column holds above the
  // email. Measured, never guessed, and only where the two columns sit side
  // by side; a column the browser has not laid out is never capped. The two
  // columns are found from the pane's own node: a child's layout effect runs
  // before its parent's refs attach.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const deal = wrap?.closest<HTMLElement>(`.${CSS.escape(styles.deal)}`);
    const rec = deal?.parentElement?.querySelector<HTMLElement>(
      `:scope > .${CSS.escape(styles.rec)}`,
    );
    if (!wrap || !deal || !rec || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    // Everything above the email moves its top, so each is watched: a drawer
    // that closes above it gives the email its room back at once. Children
    // that come and go are picked up as they arrive.
    const watch = () => {
      ro.observe(deal);
      ro.observe(rec);
      for (const el of Array.from(deal.children)) ro.observe(el);
    };
    const mo =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            watch();
            measure();
          });
    const measure = () => {
      const narrow = window.matchMedia?.("(max-width: 880px)").matches ?? false;
      if (narrow || rec.offsetHeight === 0) return setCap(null);
      // What the column holds above the email, read from where the email
      // starts: the grid stretches the column to the row, so its own height
      // is the row's, never its content's. Thirty pixels keep the door.
      const above = wrap.getBoundingClientRect().top - deal.getBoundingClientRect().top;
      // Never less than a few lines, and only an email taller than that
      // fades: one that fits shows whole with no door.
      const limit = Math.max(120, Math.round(rec.offsetHeight - above - 30));
      const next = wrap.scrollHeight > limit ? limit : null;
      setCap((c) =>
        c === next || (c !== null && next !== null && Math.abs(c - next) < 2) ? c : next,
      );
    };
    watch();
    mo?.observe(deal, { childList: true });
    measure();
    return () => {
      ro.disconnect();
      mo?.disconnect();
    };
  }, [email.id, body]);

  const capped = cap !== null && !whole;
  const when = [email.day, email.time].filter(Boolean).join(" · ");
  return (
    <div className={styles.mail}>
      <div className={styles.mailK}>
        <span className={styles.lbl}>LATEST EMAIL</span>
        <span className={styles.mailWho}>
          {when && `${when}${email.from ? " · " : ""}`}
          <WhoLine from={email.from} to={email.to} others={email.others} />
        </span>
      </div>
      <p className={styles.mailSubj}>{email.subject}</p>
      {!email.whole && (
        <p className={styles.mailGist}>
          <b>{email.read ? "WHAT THE READ KEPT" : "WHAT WAS FILED"}</b>{" "}
          {MISSING[email.missing || "before"]}
        </p>
      )}
      <div
        ref={wrapRef}
        className={capped ? styles.mailCapped : undefined}
        style={capped ? { maxHeight: cap } : undefined}
      >
        <p className={styles.mailBody}>{body || "Nothing beyond the subject."}</p>
      </div>
      {(capped || whole) && (
        <button
          type="button"
          className={styles.mailOpen}
          aria-expanded={whole}
          onClick={() => setWhole((v) => !v)}
        >
          {whole ? "Show less" : "Show the whole email"}
        </button>
      )}
    </div>
  );
}

/** What an EARLIER line opens to: the record history's content for it. */
function Opened({ line }: { line: RecordLine }) {
  const e = line.email;
  if (!e)
    return line.body ? (
      <div className={styles.kept}>
        <p className={styles.keptB}>{line.body}</p>
      </div>
    ) : null;
  if (e.closer)
    return (
      <div className={styles.kept}>
        <div className={styles.keptK}>A SIGN-OFF</div>
        <p className={styles.keptB}>It doesn&apos;t change the latest email.</p>
      </div>
    );
  return (
    <div className={styles.kept}>
      <div className={styles.keptK}>
        {e.read ? "WHAT THE READ KEPT" : "WHAT WAS FILED"}
      </div>
      <p className={styles.keptB}>{e.kept || "Nothing beyond the subject."}</p>
      {e.owed.map((o, i) => (
        <div key={i} className={styles.keptOwed}>
          <b>{owedLabel(o)}</b>{" "}
          {`${o.text}${/[.?!]$/.test(o.text) ? "" : "."}${o.closed ? ` ${o.closed}` : ""}`}
        </div>
      ))}
      {e.answered && (
        <div className={styles.keptOwed}>
          <b>CLOSED</b> Answered {e.answered}.
        </div>
      )}
    </div>
  );
}

/** One EARLIER line: when and who in mono, the subject in the work, and the
 *  hover rail the room already had. `shown` is the line as the operator
 *  last edited it. Every line opens: an email to what the read kept, a note
 *  to its body, and any line to its whole text, which rests on one line and
 *  trails off (the click-depth law: nothing compressed is a dead end). */
export function EarlierLine({
  line,
  shown,
  open,
  onToggle,
  done,
  note,
  rail,
}: {
  line: RecordLine;
  shown: string;
  open: boolean;
  onToggle: () => void;
  done: boolean;
  note?: ReactNode;
  rail?: ReactNode;
}) {
  const e = line.email;
  const tone = e
    ? e.closer
      ? styles.entIcQuiet
      : e.dir === "in"
        ? styles.entIcIn
        : ""
    : line.glyph === "✓" || line.glyph === "✔"
      ? styles.gDone
      : line.glyph === "☎"
        ? styles.gDly
        : styles.gNote;
  const subject = e?.closer ? `“${e.kept || shown}”` : shown;
  // An entry filed with no day shows no day, and no separator for it.
  const when = [line.day, line.time].filter(Boolean).join(" · ");
  return (
    <div
      className={`${styles.ent} ${open ? styles.entOpen : ""} ${done ? styles.entDid : ""} ${e?.closer ? styles.entQuiet : ""}`}
    >
      <div className={styles.entHead}>
        <span className={`${styles.entIc} ${tone}`}>{line.glyph}</span>
        <span className={styles.entMain}>
          <span className={styles.entK}>
            {[when, e ? "" : line.who].filter(Boolean).join(" · ")}
            {e?.from && when ? " · " : ""}
            {e && <WhoLine from={e.from} to={e.to} others={e.others} />}
            {e?.closer && (
              <>
                {" "}
                <span className={styles.entTag}>SIGN-OFF</span>
              </>
            )}
            {e?.twice && !e.closer && (
              <>
                {" "}
                <span className={styles.entTag}>FILED TWICE</span>
              </>
            )}
          </span>
          <button
            type="button"
            className={styles.entSubj}
            aria-expanded={open}
            onClick={onToggle}
            title={open ? "Fold it back" : "Open it"}
          >
            {subject}
            {note}
          </button>
        </span>
        <button
          type="button"
          className={styles.entCar}
          aria-hidden="true"
          tabIndex={-1}
          onClick={onToggle}
        >
          {open ? "▾" : "▸"}
        </button>
        {rail}
      </div>
      {open && <Opened line={line} />}
    </div>
  );
}
