"use client";

// The Second Record's dock — the intranet page's door for the weekly
// Salesforce activity export. Drop the .csv; the browser reads it in place
// (blasts tally client-side and never upload), the batches post verified,
// and the distillation narrates through the bench gadget above. The receipt
// waits here either way.

import { useEffect, useRef, useState } from "react";
import { activityReceipt, activityRun, activityStage, activityTakeBack } from "./actions";
import { probeActivityReport, uploadActivityReport } from "@/lib/activity/upload";
import styles from "./dock.module.css";

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
      if (r.remaining > 0 && r.phase === "running")
        setLine(
          `A run was interrupted — ${r.remaining} accounts still wait. Drop again or press ⟳.`,
        );
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
            : (r.reason ?? "The run stopped — see the receipt."),
        );
        return;
      }
      setLine(
        `Distilling — ${r.remaining} account${r.remaining === 1 ? "" : "s"} to go. Watch the gadget.`,
      );
    }
  };

  const swallow = async (f: File) => {
    if (busy) return;
    if (!/\.csv$/i.test(f.name)) {
      setLine(`${f.name} isn't a .csv — the dock takes the activity export only.`);
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
        "The activity report. Reading it here — blasts tally in the browser and never upload.",
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
        setLine("Nothing changed — the record already holds this drop.");
        setPhase("done");
        return;
      }
      setLine(
        `${res.rowCount} rows · ${res.accounts} accounts · ${res.textRows} carrying email text. ${res.reply?.queued?.distill ?? 0} to distill, ${res.reply?.queued?.intentOnly ?? 0} tally-only.`,
      );
      await drive();
    } catch {
      setLine("The drop broke midway. Drop the file again — staging replaces wholesale.");
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
        <span className={styles.line}>
          {line ||
            (dropDay
              ? `Last drop ${dropDay} · ${phase === "done" ? "distilled" : phase}`
              : "Drop the weekly activity export here.")}
        </span>
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
                ? "Press again to clear it. Earlier drops are not kept — nothing is restored."
                : "Take back this drop. Clears every account's second-record read."
            }
            onClick={() => {
              if (!armed) {
                setArmed(true);
                setLine(
                  "Press ↩ again to clear the second record. Earlier drops are not kept, so nothing is restored.",
                );
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
            title="Continue the interrupted run."
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
