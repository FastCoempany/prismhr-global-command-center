// The ledger's icon language — every verb is a glyph with its own color; the
// word only survives as a tooltip. The action emblem is a comic POW burst
// (no text), drawn inline.

import styles from "../command-center.module.css";

export type GlyphKind =
  | "send"
  | "decide"
  | "close"
  | "owed"
  | "action"
  | "roundup"
  | "sent"
  | "done"
  | "delayed"
  | "note"
  | "check";

const GLYPHS: Record<GlyphKind, { char: string; cls: string; word: string }> = {
  send: { char: "✉", cls: "gSend", word: "send" },
  decide: { char: "⚖", cls: "gDecide", word: "decide" },
  close: { char: "◫", cls: "gClose", word: "close the step" },
  owed: { char: "⚑", cls: "gOwed", word: "owed — chase" },
  action: { char: "", cls: "gAct", word: "action" },
  roundup: { char: "⟳", cls: "gRound", word: "roundup" },
  sent: { char: "➤", cls: "gSent", word: "sent" },
  done: { char: "✓", cls: "gDone", word: "done" },
  delayed: { char: "⏲", cls: "gDelay", word: "delayed" },
  note: { char: "🗒", cls: "gNote", word: "note" },
  check: { char: "○", cls: "gCheck", word: "check-in" },
};

// The comic POW burst — irregular 22-point star, orange shell + gold core.
const POW_PTS =
  "23,12 17.8,13.7 20.4,17.4 15.6,16.2 16.7,22.5 12.8,17.9 10.6,21.9 9.6,17.3 4.8,20.3 6.8,15.4 2,15.1 6.4,12 1.4,9 6.9,8.8 5.4,4.5 9.7,7 10.2,0.6 12.8,6.1 16.1,2.9 15.7,7.6 21.2,6 17.7,10.2";

export function PowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${styles.pow} ${className ?? ""}`} aria-hidden>
      <polygon
        points={POW_PTS}
        fill="#e6701e"
        stroke="#a63d0a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <g transform="translate(12 12) scale(.58) translate(-12 -12)">
        <polygon
          points={POW_PTS}
          fill="#ffd34d"
          stroke="#e6701e"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function Glyph({ kind, hot }: { kind: GlyphKind; hot?: boolean }) {
  const g = GLYPHS[kind];
  return (
    <span
      className={`${styles.glyph} ${styles[g.cls]} ${hot ? styles.gHot : ""}`}
      title={g.word}
    >
      {kind === "action" ? <PowIcon /> : g.char}
    </span>
  );
}

// The one-line key pinned to the top of the ledger card.
export function LedgerLegend() {
  const order: GlyphKind[] = [
    "send",
    "decide",
    "close",
    "owed",
    "action",
    "roundup",
    "sent",
    "done",
    "delayed",
  ];
  return (
    <div className={styles.lgLegend}>
      {order.map((k) => (
        <span className={styles.lgLegendItem} key={k}>
          <Glyph kind={k} />
          {GLYPHS[k].word.split(" ")[0]}
        </span>
      ))}
    </div>
  );
}
