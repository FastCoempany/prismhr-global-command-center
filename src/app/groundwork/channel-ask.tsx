"use client";

// The Channel Ask (the Sendbook's shared instrument, decreed 2026-08-19).
// Worked-it no longer files blind: pressing it springs a chip row in place —
// one tap names the channel, an optional second names the person when the
// book knows more than one. Two taps, never a form. The pre-answer rule
// lives server-side: when the record already holds today's send, the page
// renders the plain stamp button instead of this component. The steps are
// askStep's (src/lib/sendbook/ask.ts); this holds the state and files.

import { useState, useTransition } from "react";
import {
  ASK_IDLE,
  ASK_MORE,
  ASK_PRIMARY,
  askStep,
  type AskEvent,
  type AskState,
} from "@/lib/sendbook/ask";
import { workedChannel } from "./actions";
import styles from "./groundwork.module.css";

export function ChannelAsk({
  mk,
  accountId,
  contacts,
  clause,
  accent,
}: {
  mk: string;
  accountId: string;
  contacts: string[]; // known names, widest first — empty is fine
  clause: string; // the move being worked, for the register line
  accent: boolean;
}) {
  const [state, setState] = useState<AskState>(ASK_IDLE);
  const [pending, startTransition] = useTransition();

  const send = (e: AskEvent) => {
    const r = askStep(state, e, contacts);
    setState(r.state);
    const tap = r.file;
    if (tap)
      startTransition(async () => {
        await workedChannel(mk, accountId, tap.channel, tap.who, clause);
      });
  };

  return (
    <AskRow
      state={state}
      contacts={contacts}
      pending={pending}
      accent={accent}
      send={send}
    />
  );
}

/** The Channel Ask as it paints in each state: the Worked-it button, the
 *  channel row (with ··· for the rest), or the who row. Both rows carry ✕,
 *  which closes the row and files nothing. */
export function AskRow({
  state,
  contacts,
  pending,
  accent,
  send,
}: {
  state: AskState;
  contacts: readonly string[];
  pending: boolean;
  accent: boolean;
  send: (e: AskEvent) => void;
}) {
  const close = (
    <button
      type="button"
      className={`${styles.chChip} ${styles.chChipMore}`}
      title="Never mind. Nothing files."
      onClick={() => send({ kind: "close" })}
    >
      ✕
    </button>
  );

  if (state.stage === "idle")
    return (
      <button
        type="button"
        className={accent ? styles.btnAccent : styles.btn2nd}
        onClick={() => send({ kind: "open" })}
      >
        Worked it
      </button>
    );

  if (state.stage === "contact")
    return (
      <span className={styles.chipRow} aria-label="Who was reached">
        {contacts.slice(0, 6).map((c) => (
          <button
            key={c}
            type="button"
            className={styles.chChip}
            disabled={pending}
            onClick={() => send({ kind: "who", name: c })}
          >
            {c.split(/\s+/)[0]}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.chChip} ${styles.chChipMore}`}
          disabled={pending}
          onClick={() => send({ kind: "skip" })}
        >
          skip
        </button>
        {close}
      </span>
    );

  return (
    <span className={styles.chipRow} aria-label="How was it worked">
      {[...ASK_PRIMARY, ...(state.more ? ASK_MORE : [])].map((ch) => (
        <button
          key={ch}
          type="button"
          className={styles.chChip}
          disabled={pending}
          onClick={() => send({ kind: "pick", channel: ch })}
        >
          {ch}
        </button>
      ))}
      {!state.more && (
        <button
          type="button"
          className={`${styles.chChip} ${styles.chChipMore}`}
          onClick={() => send({ kind: "more" })}
        >
          ···
        </button>
      )}
      {close}
    </span>
  );
}
