"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./command-center.module.css";
import { USER_TZ } from "@/lib/tz";
import { CLOCK_FREEZE_MS } from "@/lib/presence";
import { presenceLastInput } from "@/components/presence/engine";

// The digital clock — Chicago time with ticking seconds, in a precise
// instrument capsule at the top of Today. Hydration-safe: renders em-dashes on
// the server, real time after mount. Presence-aware (founder-decreed
// 2026-08-18): five quiet minutes and the clock FREEZES at the last second it
// saw you, dimmed — the frozen face says when the room last sensed the desk.
// The first input wakes it and it snaps to true time.
export function ChiClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [frozen, setFrozen] = useState(false);
  useEffect(() => {
    const update = () => {
      const idle = Date.now() - presenceLastInput() > CLOCK_FREEZE_MS;
      setFrozen(idle);
      if (!idle) setNow(new Date());
    };
    const first = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const time = now
    ? now.toLocaleTimeString("en-US", {
        timeZone: USER_TZ,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—:——:——";
  const date = now
    ? now
        .toLocaleDateString("en-US", {
          timeZone: USER_TZ,
          weekday: "short",
          month: "short",
          day: "numeric",
        })
        .toUpperCase()
        .replace(/,/g, " ·")
    : "";
  return (
    <span
      className={styles.chiClock}
      aria-label="Current time in Chicago"
      style={frozen ? { opacity: 0.42 } : undefined}
      title={frozen ? "Stopped — five quiet minutes. Move to wake it." : undefined}
    >
      <span className={styles.chiClockDigits} suppressHydrationWarning>
        {time}
      </span>
      <span className={styles.chiClockSide}>
        <span className={styles.chiClockZone}>AMERICA/CHICAGO</span>
        <span className={styles.chiClockDate} suppressHydrationWarning>
          {date}
        </span>
      </span>
    </span>
  );
}

// A visible, editable message box: see exactly what you're sending, tweak it,
// then copy the edited text. Auto-grows to fit. Used for partner messages and
// week-openers so nothing is copied blind.
export function EditableMessage({
  text,
  copyLabel = "Copy message",
}: {
  text: string;
  copyLabel?: string;
}) {
  const [val, setVal] = useState(text);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [val]);

  return (
    <div className={styles.editMsg}>
      <textarea
        ref={ref}
        className={styles.editMsgArea}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        aria-label="Editable message"
        spellCheck
      />
      <div className={styles.editMsgRow}>
        <button
          type="button"
          className={styles.copyLine}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(val);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied ✓. Paste into Slack, Teams, or email." : copyLabel}
        </button>
        {val !== text && (
          <button
            type="button"
            className={styles.editMsgReset}
            onClick={() => setVal(text)}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

// A date + time stamp rendered in the viewer's own timezone. The server renders
// UTC, then the client corrects after mount — suppressHydrationWarning covers
// the expected mismatch.
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => fmtStamp(iso));
  useEffect(() => {
    // Deferred so the local-tz correction paints after hydration settles
    // (react-hooks/set-state-in-effect).
    const id = setTimeout(() => setText(fmtStamp(iso)), 0);
    return () => clearTimeout(id);
  }, [iso]);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}

function fmtStamp(iso: string, timeZone: string = USER_TZ): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const day = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  });
  return `${day} · ${time}`;
}

// One account row in the roundup composer: toggling it in or out rebuilds the
// message. "mark" flags why a row defaults to unchecked (already in motion, or
// parked) so the checkbox row explains itself.
export type RoundupSection = {
  id: string;
  name: string;
  bullet: string;
  on: boolean;
  mark: "" | "motion" | "parked";
};
