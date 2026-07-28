"use client";

// The Operating Room's client half — Half-Light material: the deal side sits
// matte on the air, the record side is glass. Every composer is pre-bound to
// its row's account; entries appear in place the moment they file.

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChiClock } from "../today-client";
import { roomClose, roomLog, roomPaste } from "./actions";
import styles from "./room.module.css";

export type RoomRow = {
  accountId: string;
  cardId: string;
  name: string;
  meta: string;
  shape: string;
  multiTone: "g" | "y" | "r";
  people: { name: string; line: string }[];
  briefed: boolean;
  climb: {
    frac: number;
    capTone: "risk" | "warn" | "ok";
    label: string;
    metaLine: string;
  };
  move: string;
  thin: boolean;
  court: { line: string; tone: "you" | "them" | "quiet" | "none" };
  outstanding: {
    item: string;
    node: string;
    index: number;
    doneKey: string;
    closedCount: number;
  } | null;
  record: { id: string; t: string; text: string; struck: boolean }[];
  health: "red" | "amber" | "green" | "quiet";
  rank: number;
  canWrite: boolean;
};

function BriefedMark({ on }: { on: boolean }) {
  return (
    <span
      className={styles.briefed}
      title={
        on
          ? "Partner briefed — the stage record's partner-brief item is closed."
          : "Partner not yet briefed — no partner-brief item closed in the stage record. Turns green when one lands."
      }
    >
      <svg
        viewBox="0 0 20 20"
        width="13"
        height="13"
        fill="none"
        stroke={on ? "#1E5B46" : "rgba(10,28,64,.25)"}
        strokeWidth="2.4"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      >
        <path d="M5 11 l4 4 7-8" />
        <path d="M2 18 h16" />
      </svg>
    </span>
  );
}

function Row({ row }: { row: RoomRow }) {
  const [fresh, setFresh] = useState<{ text: string }[]>([]);
  const [logText, setLogText] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [pending, start] = useTransition();

  const submitLog = () => {
    const text = logText.trim();
    if (!text || pending) return;
    start(async () => {
      const r = await roomLog(row.accountId, text);
      if (r.ok) {
        setFresh((f) => [{ text: `✎ ${text}` }, ...f]);
        setLogText("");
        setNote(null);
      } else setNote(r.reason ?? "That didn't save.");
    });
  };

  const submitPaste = () => {
    const text = pasteText.trim();
    if (!text || pending) return;
    start(async () => {
      const r = await roomPaste(row.accountId, text);
      if (r.ok) {
        setFresh((f) => [
          {
            text: `☰ Paste filed — ${r.filed} entr${r.filed === 1 ? "y" : "ies"}${r.how === "ai" ? ", AI-cleaned" : ""}.`,
          },
          ...f,
        ]);
        setPasteText("");
        setPasteOpen(false);
        setNote(null);
      } else setNote(r.reason ?? "The paste didn't file.");
    });
  };

  const submitClose = () => {
    if (!row.outstanding || pending || closed) return;
    const o = row.outstanding;
    start(async () => {
      const r = await roomClose({
        accountId: row.accountId,
        cardId: row.cardId,
        node: o.node,
        index: o.index,
        doneKey: o.doneKey,
        item: o.item,
        cardName: row.name,
      });
      if (r.ok) {
        setClosed(true);
        setFresh((f) => [{ text: `✓ Closed: ${o.item}` }, ...f]);
        setNote(null);
      } else setNote(r.reason ?? "The close didn't save.");
    });
  };

  return (
    <div className={styles.row}>
      <div className={styles.deal}>
        <span className={styles.nm}>
          <BriefedMark on={row.briefed} />
          <Link href={`/accounts?focus=${row.accountId}`} className={styles.nmLink}>
            {row.name}
          </Link>
        </span>
        <span className={styles.chips}>
          <span className={styles.chip}>{row.shape}</span>
          <span className={`${styles.multi} ${styles[`m_${row.multiTone}`]}`}>
            MULTI
            <span className={styles.hovercard}>
              <span className={styles.hk}>
                WHO&apos;S IN THIS DEAL — FROM THE REPOSITORY
              </span>
              {row.people.length === 0 && (
                <span className={styles.hp}>
                  No stakeholders on file yet — paste activity and they appear here.
                </span>
              )}
              {row.people.map((p) => (
                <span key={p.name} className={styles.hp}>
                  <b>{p.name}</b>
                  {p.line ? ` — ${p.line}` : ""}
                </span>
              ))}
            </span>
          </span>
          {row.canWrite && (
            <button
              type="button"
              className={styles.zap}
              title={`Paste — files to ${row.name}`}
              onClick={() => setPasteOpen((v) => !v)}
            >
              ⚡
            </button>
          )}
        </span>
        {row.meta && <span className={styles.meta}>{row.meta}</span>}

        <div className={styles.climb}>
          <div
            className={styles.gain}
            style={{ width: `${Math.round(Math.max(0.1, row.climb.frac) * 100)}%` }}
          >
            <span>{row.climb.label}</span>
          </div>
          <div
            className={`${styles.cap} ${row.climb.capTone === "risk" ? styles.capRisk : row.climb.capTone === "warn" ? styles.capWarn : styles.capOk}`}
            style={{ left: `${Math.round(Math.max(0.1, row.climb.frac) * 100)}%` }}
          />
        </div>
        <div
          className={`${styles.climbMeta} ${row.health === "red" ? styles.tRed : row.health === "amber" ? styles.tAmber : ""}`}
        >
          {row.climb.metaLine}
        </div>

        <div className={`${styles.nextmove} ${row.thin ? styles.thin : ""}`}>
          <span className={styles.lbl}>NEXT MOVE — FROM THE INTELLIGENCE</span>
          {row.move}
        </div>
        {row.canWrite && row.outstanding && !closed && (
          <button
            type="button"
            className={row.rank === 0 ? styles.go : styles.ghost}
            disabled={pending}
            onClick={submitClose}
          >
            {pending ? "Saving…" : "Mark it done ✓"}
          </button>
        )}
        {row.outstanding && (
          <div className={styles.outst}>
            <span className={styles.k2}>STILL OPEN AT THIS STAGE</span>
            <span className={closed ? styles.donenow : undefined}>
              {row.outstanding.item}
            </span>
            {row.outstanding.closedCount > 0 && (
              <span className={styles.closedct}>
                {" "}
                · {row.outstanding.closedCount + (closed ? 1 : 0)} closed behind it
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.rec}>
        <div className={`${styles.court} ${styles[`c_${row.court.tone}`]}`}>
          {row.court.line}
        </div>
        <ul className={styles.lgr}>
          {fresh.map((f, i) => (
            <li key={`f${i}`} className={styles.freshLi}>
              <span className={styles.t}>now</span>
              {f.text}
            </li>
          ))}
          {row.record.map((e) => (
            <li key={e.id} className={e.struck ? styles.struck : undefined}>
              <span className={styles.t}>{e.t}</span>
              {e.text}
            </li>
          ))}
          {row.record.length === 0 && fresh.length === 0 && (
            <li className={styles.emptyLi}>Nothing on file yet.</li>
          )}
        </ul>
        {row.canWrite && (
          <div className={styles.logbox}>
            <span className={styles.lk}>
              LOG IT — FILES TO {row.name.toUpperCase()}, EVERYWHERE
            </span>
            <div className={styles.logline}>
              <button
                type="button"
                className={styles.zap}
                title={`Paste — files to ${row.name}`}
                onClick={() => setPasteOpen((v) => !v)}
              >
                ⚡
              </button>
              <input
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitLog();
                }}
                placeholder="Type the day's happenings and press Enter…"
                aria-label={`Log a note to ${row.name}`}
              />
            </div>
            {pasteOpen && (
              <div className={styles.pastepane}>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Paste the Salesforce capture, an email, or meeting notes — it files to ${row.name}.`}
                />
                <div className={styles.pasteRow}>
                  <button
                    type="button"
                    className={styles.cancel}
                    onClick={() => setPasteOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.file}
                    disabled={pending}
                    onClick={submitPaste}
                  >
                    {pending ? "Filing…" : "✨ Clean & file"}
                  </button>
                </div>
              </div>
            )}
            {note && <p className={styles.err}>{note}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export function RoomClient({
  rows,
  dbUnavailable,
}: {
  rows: RoomRow[];
  dbUnavailable: boolean;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <svg
          viewBox="0 0 48 48"
          width="22"
          height="22"
          fill="none"
          stroke="#0A1C40"
          strokeWidth="4.4"
          strokeLinecap="butt"
          strokeLinejoin="miter"
          aria-hidden
        >
          <path d="M14 38 L24 10 L34 38" />
          <path d="M18.2 28 h11.6" />
          <path d="M2 38 h44" />
        </svg>
        <span className={styles.roomName}>OPERATING ROOM</span>
        <span className={styles.clock}>
          <ChiClock />
        </span>
        <span className={styles.sp} />
        <Link href="/accounts" className={styles.addBtn}>
          + account
        </Link>
      </div>

      {dbUnavailable && (
        <p className={styles.emptyBoard}>
          The database isn&apos;t reachable — the room shows nothing until it is.
        </p>
      )}
      {!dbUnavailable && rows.length === 0 && (
        <p className={styles.emptyBoard}>
          Nothing on the board yet — open the <Link href="/accounts">Account Room</Link>{" "}
          and add the deals you&apos;re working.
        </p>
      )}

      {rows.map((r) => (
        <Row key={r.cardId} row={r} />
      ))}

      <p className={styles.warming}>
        <span className={styles.k2}>WARMING</span> Signals worth a look live on{" "}
        <Link href="/today">Today&apos;s triage</Link> — seed, park, or dismiss them
        there.
      </p>
    </div>
  );
}
