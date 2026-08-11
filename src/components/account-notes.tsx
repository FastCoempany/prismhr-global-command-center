"use client";

import { useState } from "react";
import type { PersonRow } from "@/lib/intel/people";
import styles from "./account-notes.module.css";

// A read-only note as surfaced on the Account Room / Dashboard (edited on Today).
export type LinkedNote = { id: string; body: string; done: boolean; remindAt: string };

function fmtWhen(iso: string): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// A dated, time-stamped note on the account — chip-written, filed from Intake,
// or dropped by a completed move. Carries its provenance lane.
export type ChipNote = {
  id: string;
  partner: string;
  kind: "mine" | "partner" | "account";
  body: string;
  actors: string;
  createdAt: string; // ISO
};

function NoteRow({ n }: { n: ChipNote }) {
  return (
    <div className={styles.note}>
      <span className={styles.body}>
        {n.kind !== "account" && (
          <>
            <b>
              {n.kind === "partner"
                ? `${n.partner.split(" ")[0] || "Partner"} said:`
                : "You:"}
            </b>{" "}
          </>
        )}
        {n.body.trim()}
      </span>
      <span className={styles.when}>🕐 {fmtWhen(n.createdAt)}</span>
    </div>
  );
}

// The account's working record: your notes, what partners said, and the ✓
// actions completed from Today. This is the default register — background
// intel lives in its own fold below.
export function AccountChipNotes({ notes }: { notes: ChipNote[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.tag}>Record &amp; history</span>
        <span className={styles.count}>{notes.length}</span>
        <span className={styles.hint}>notes, sends, and the work you closed, dated</span>
      </div>
      {notes.map((n) => (
        <NoteRow key={n.id} n={n} />
      ))}
    </div>
  );
}

// The background register — ingested account intelligence (case traffic,
// support threads, cross-department chatter). Present and searchable, but
// behind a click: it informs, it doesn't shout.
export function BackgroundIntel({ notes }: { notes: ChipNote[] }) {
  const [open, setOpen] = useState(false);
  if (!notes || notes.length === 0) return null;
  return (
    <div className={styles.bgWrap}>
      <button
        type="button"
        className={styles.bgToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "▾" : "▸"} Background intel
        <span className={styles.count}>{notes.length}</span>
        <span className={styles.hint}>
          case and support traffic around this account. Same stakeholders, other
          conversations
        </span>
      </button>
      {open && notes.map((n) => <NoteRow key={n.id} n={n} />)}
    </div>
  );
}

// The People index: everyone who appears in the account's repository — your
// threads AND the background traffic — one row each, joined against the
// contact roster for title/email.
export function PeopleIndex({ people }: { people: PersonRow[] }) {
  if (!people || people.length === 0) return null;
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.tag}>People</span>
        <span className={styles.count}>{people.length}</span>
        <span className={styles.hint}>
          everyone in this account&apos;s traffic, your threads and the background
        </span>
      </div>
      {people.map((p) => (
        <div key={p.name} className={styles.person}>
          <span className={styles.personWho}>
            <b>{p.name}</b>
            {p.title && <span className={styles.personTitle}> — {p.title}</span>}
          </span>
          <span className={styles.personMeta}>
            {p.inMine && <span className={styles.laneMine}>your threads</span>}
            {p.inBackground && <span className={styles.laneBg}>case traffic</span>}×
            {p.count}
            {p.lastSeen && <> · last {fmtWhen(p.lastSeen)}</>}
            {p.lastContext && (
              <span className={styles.personCtx} title={p.lastContext}>
                {" "}
                · {p.lastContext}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// Surfaces the notetaker notes linked to an account, read-only. Renders nothing
// when there are none.
export function AccountNotes({ notes }: { notes: LinkedNote[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.tag}>Notes</span>
        <span className={styles.count}>{notes.length}</span>
        <span className={styles.hint}>from your notetaker · edit on Today</span>
      </div>
      {notes.map((n) => (
        <div key={n.id} className={`${styles.note} ${n.done ? styles.done : ""}`}>
          <span className={styles.body}>{n.body.trim() || "(empty note)"}</span>
          {n.remindAt ? (
            <span className={styles.when}>📅 {fmtWhen(n.remindAt)}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
