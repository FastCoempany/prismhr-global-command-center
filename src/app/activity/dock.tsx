"use client";

// The Second Record's dock — the intranet page's door for the weekly
// Salesforce activity export. Drop the .csv; the browser reads it in place
// (blasts tally client-side and never upload), the batches post verified,
// and the distillation narrates through the bench gadget above. The receipt
// waits here either way.
//
// Every line the dock says is a flat sentence (X4; the writing canon and the
// plain-speech law), and a status line the receipt explains opens it, one
// click (the click-depth law): the counts, the last drop's state and a
// stopped run all have their lines there.

import { useEffect, useRef, useState } from "react";
import { activityReceipt, activityRun, activityStage, activityTakeBack } from "./actions";
import { probeActivityReport, uploadActivityReport } from "@/lib/activity/upload";
import styles from "./dock.module.css";

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** The run's phase, said as what the drop did. */
const PHASE_WORDS: Record<string, string> = {
  done: "is distilled.",
  "failed-coverage": "finished below full coverage.",
  refused: "was refused. The drop before it still stands.",
  running: "stopped partway through distilling.",
  ready: "is waiting to distill.",
  staging: "is still uploading.",
  failed: "stopped.",
};

/** The resting line: the last drop and where it stands. */
export function idleLine(dropDay: string, phase: string): string {
  if (!dropDay) return "Drop the weekly activity export here.";
  const md = dropDay.slice(5).replace("-", "/");
  return `The ${md} drop ${PHASE_WORDS[phase] ?? `is ${phase}.`}`;
}

/** The line while the run distills. */
export function progressLine(remaining: number): string {
  return `Distilling. ${plural(remaining, "account")} left.`;
}

/** The line a stopped run leaves behind. */
export function stoppedLine(remaining: number): string {
  return `The last run stopped with ${plural(remaining, "account")} left. Press ⟳ to finish it.`;
}

/** The line once the upload verifies: what came in, then the work queued. */
export function countsLine(c: {
  rows: number;
  accounts: number;
  textRows: number;
  distill: number;
  intentOnly: number;
}): string {
  return `Read ${plural(c.rows, "row")} across ${plural(c.accounts, "account")}, ${c.textRows} with email text. ${plural(c.distill, "account")} to distill and ${c.intentOnly} with only a tally to refresh.`;
}

/** The take-back's warning, said once before the second press. */
export const TAKE_BACK_ARMED =
  "Press ↩ again to clear the second record. Earlier drops were not kept. Your acted stamps stay.";

/** The dock's status line. With a receipt behind it, the line is the door to
 *  that receipt; with none, it is plain text. */
export function DockLine({
  text,
  receipt,
  open,
  onToggle,
}: {
  text: string;
  receipt: number;
  open: boolean;
  onToggle: () => void;
}) {
  if (receipt === 0) return <span className={styles.line}>{text}</span>;
  return (
    <button
      type="button"
      className={`${styles.line} ${styles.lineDoor}`}
      title={open ? "Fold the receipt." : "Open the receipt."}
      aria-expanded={open}
      onClick={onToggle}
    >
      {text}
    </button>
  );
}

export function ActivityDock({
  book,
  canWrite,
}: {
  book: { id: string; name: string }[];
  canWrite: boolean;
}) {
  const [line, setLine] = useState("");
  const [receipt, setReceipt] = useState<string[]>([]);
  const [phase, setPhase] = useState("");
  const [dropDay, setDropDay] = useState("");
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState(false);
  const [busy, setBusy] = useState(false);
  // The take-back asks twice. One click arms it, the second does it — the
  // reach is every account's second-record read, so a stray click must not.
  const [armed, setArmed] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void activityReceipt().then((r) => {
      if (!r?.hasDrop) return;
      setPhase(r.phase);
      setDropDay(r.dropDay);
      setReceipt(r.receipt);
      if (r.remaining > 0 && r.phase === "running") setLine(stoppedLine(r.remaining));
    });
  }, []);

  const drive = async () => {
    for (;;) {
      const r = await activityRun();
      setReceipt(r.receipt);
      if (r.done || !r.ok) {
        setPhase(r.ok ? "done" : "failed");
        setLine(
          r.ok
            ? "The second record is distilled."
            : (r.reason ?? "The run stopped. Open the receipt."),
        );
        return;
      }
      setLine(progressLine(r.remaining));
    }
  };

  const swallow = async (f: File) => {
    if (busy) return;
    if (!/\.csv$/i.test(f.name)) {
      setLine(`${f.name} isn't a .csv. Drop the activity export here.`);
      return;
    }
    setBusy(true);
    try {
      if (!(await probeActivityReport(f))) {
        setLine(
          "This isn't the activity report — 18 Digit ID / Subject missing. Check the export's columns.",
        );
        return;
      }
      setLine(
        "Reading the activity report here. Blasts are counted in the browser and never upload.",
      );
      const res = await uploadActivityReport({
        file: f,
        book,
        post: activityStage,
        progress: setLine,
      });
      if (!res.ok) {
        setLine(res.reason ?? "The drop didn't take. Drop it again.");
        return;
      }
      if (res.reply?.unchanged) {
        setLine("Nothing changed. This drop is already on file.");
        setPhase("done");
        return;
      }
      setLine(
        countsLine({
          rows: res.rowCount,
          accounts: res.accounts,
          textRows: res.textRows,
          distill: res.reply?.queued?.distill ?? 0,
          intentOnly: res.reply?.queued?.intentOnly ?? 0,
        }),
      );
      await drive();
    } catch {
      setLine("The drop broke partway through. Drop the file again.");
    } finally {
      setBusy(false);
    }
  };

  if (!canWrite) return null;

  return (
    <section
      className={`${styles.dock} ${hot ? styles.hot : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setHot(true);
      }}
      onDragLeave={() => setHot(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHot(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void swallow(f);
      }}
    >
      <div className={styles.bar}>
        <span className={styles.k}>THE SECOND RECORD</span>
        <DockLine
          text={line || idleLine(dropDay, phase)}
          receipt={receipt.length}
          open={open}
          onToggle={() => setOpen((v) => !v)}
        />
        <button
          type="button"
          className={styles.btn}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          ⇪ File
        </button>
        {dropDay && !busy && (
          <button
            type="button"
            className={styles.btn}
            title={
              armed
                ? TAKE_BACK_ARMED
                : "Take back this drop and clear every account's second-record read."
            }
            onClick={() => {
              if (!armed) {
                setArmed(true);
                setLine(TAKE_BACK_ARMED);
                return;
              }
              setArmed(false);
              setBusy(true);
              void activityTakeBack()
                .then((r) => {
                  setReceipt(r.lines);
                  setLine(r.ok ? r.lines[0] : (r.reason ?? "The take-back failed."));
                  if (r.ok) {
                    setPhase("");
                    setDropDay("");
                  }
                })
                .finally(() => setBusy(false));
            }}
          >
            {armed ? "↩ sure?" : "↩"}
          </button>
        )}
        {phase === "running" && !busy && (
          <button
            type="button"
            className={styles.btn}
            title="Finish the stopped run."
            onClick={() => {
              setBusy(true);
              void drive().finally(() => setBusy(false));
            }}
          >
            ⟳
          </button>
        )}
        {receipt.length > 0 && (
          <button
            type="button"
            className={styles.fold}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Fold the receipt" : `Receipt · ${receipt.length}`}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void swallow(f);
            e.target.value = "";
          }}
        />
      </div>
      {open && (
        <ul className={styles.receipt}>
          {receipt.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
