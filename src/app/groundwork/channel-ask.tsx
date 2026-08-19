"use client";

// The Channel Ask (the Sendbook's shared instrument, decreed 2026-08-19).
// Worked-it no longer files blind: pressing it springs a chip row in place —
// one tap names the channel, an optional second names the person when the
// book knows more than one. Two taps, never a form. The pre-answer rule
// lives server-side: when the record already holds today's send, the page
// renders the plain stamp button instead of this component.

import { useState, useTransition } from "react";
import { workedChannel } from "./actions";
import styles from "./groundwork.module.css";

const PRIMARY = ["EMAIL", "CALL", "VOICEMAIL", "TEXT", "LINKEDIN", "INMAIL"] as const;
const MORE = [
  "ENGAGED",
  "CONNECT",
  "VIDEO",
  "EVENT",
  "MAILER",
  "INTRO",
  "CSM RELAY",
] as const;

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
  const [stage, setStage] = useState<"idle" | "channel" | "contact">("idle");
  const [more, setMore] = useState(false);
  const [channel, setChannel] = useState("");
  const [pending, startTransition] = useTransition();

  const file = (ch: string, who: string) => {
    startTransition(async () => {
      await workedChannel(mk, accountId, ch, who, clause);
    });
  };

  const pick = (ch: string) => {
    if (contacts.length > 1) {
      setChannel(ch);
      setStage("contact");
    } else {
      file(ch, contacts[0] ?? "");
    }
  };

  if (stage === "idle")
    return (
      <button
        type="button"
        className={accent ? styles.btnAccent : styles.btn2nd}
        onClick={() => setStage("channel")}
      >
        Worked it
      </button>
    );

  if (stage === "contact")
    return (
      <span className={styles.chipRow} aria-label="Who was reached">
        {contacts.slice(0, 6).map((c) => (
          <button
            key={c}
            type="button"
            className={styles.chChip}
            disabled={pending}
            onClick={() => file(channel, c)}
          >
            {c.split(/\s+/)[0]}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.chChip} ${styles.chChipMore}`}
          disabled={pending}
          onClick={() => file(channel, "")}
        >
          skip
        </button>
      </span>
    );

  return (
    <span className={styles.chipRow} aria-label="How was it worked">
      {PRIMARY.map((ch) => (
        <button
          key={ch}
          type="button"
          className={styles.chChip}
          disabled={pending}
          onClick={() => pick(ch)}
        >
          {ch}
        </button>
      ))}
      {more ? (
        MORE.map((ch) => (
          <button
            key={ch}
            type="button"
            className={styles.chChip}
            disabled={pending}
            onClick={() => pick(ch)}
          >
            {ch}
          </button>
        ))
      ) : (
        <button
          type="button"
          className={`${styles.chChip} ${styles.chChipMore}`}
          onClick={() => setMore(true)}
        >
          ···
        </button>
      )}
    </span>
  );
}
