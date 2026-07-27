"use client";

// "This morning" — the brief's rows, rendered through THE ledger row. Cap 8
// on screen; the overflow line expands in place. ✓ parks a row for today
// (day-scoped disposition), ✕ mutes the rule+subject permanently.

import { useState } from "react";
import Link from "next/link";
import { BRIEF_CAP, type BriefRow } from "@/lib/intel/brief";
import { briefRowDone, briefRowMute } from "./actions";
import { LedgerRow } from "./led-row";
import styles from "../command-center.module.css";

function Control({ row }: { row: BriefRow }) {
  const c = row.control;
  if (c.kind === "copy" && c.payload) {
    const payload = c.payload;
    return (
      <button
        type="button"
        className={styles.atcBtn}
        onClick={() => void navigator.clipboard.writeText(payload)}
        title={payload}
      >
        📋 Copy
      </button>
    );
  }
  if (c.kind === "mailto" && c.href)
    return (
      <a href={c.href} className={`${styles.atcBtn} ${styles.atcHot}`}>
        ✍ Draft
      </a>
    );
  if (c.kind === "sflog" && c.href)
    return (
      <a href={c.href} target="_blank" rel="noreferrer" className={styles.atcBtn}>
        Log in SF ↗
      </a>
    );
  if (c.kind === "confirmCheck" || c.kind === "link")
    return (
      <Link href={c.href ?? "/"} className={styles.atcBtn}>
        Open board ▸
      </Link>
    );
  return null;
}

export function MorningBrief({
  rows,
  canWrite,
  dayKey,
}: {
  rows: BriefRow[];
  canWrite: boolean;
  dayKey: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;
  const shown = expanded ? rows : rows.slice(0, BRIEF_CAP);
  const overflow = rows.length - BRIEF_CAP;
  return (
    <>
      <div className={styles.cockCap}>
        <span>This morning</span>
      </div>
      <div className={styles.atcRail}>
        {shown.map((r) => (
          <LedgerRow
            key={`${r.ruleId}:${r.subjectId}`}
            tone="open"
            icon={r.icon}
            text={r.text}
            textTitle={r.text}
            meta={r.why}
            primary={
              <>
                <Control row={r} />
                {canWrite && (
                  <form action={briefRowDone} className={styles.valInline}>
                    <input type="hidden" name="ruleId" value={r.ruleId} />
                    <input type="hidden" name="subjectId" value={r.subjectId} />
                    <input type="hidden" name="dayKey" value={dayKey} />
                    <button className={styles.atcBtn} title="Done for today">
                      ✓
                    </button>
                  </form>
                )}
              </>
            }
            controls={
              canWrite ? (
                <form action={briefRowMute} className={styles.valInline}>
                  <input type="hidden" name="ruleId" value={r.ruleId} />
                  <input type="hidden" name="subjectId" value={r.subjectId} />
                  <button
                    className={styles.lgChev}
                    title="Mute — never show this row again"
                    aria-label="Mute this brief row"
                  >
                    ✕
                  </button>
                </form>
              ) : undefined
            }
          />
        ))}
        {!expanded && overflow > 0 && (
          <button
            type="button"
            className={styles.atcBtn}
            onClick={() => setExpanded(true)}
          >
            +{overflow} more in the full brief ▸
          </button>
        )}
      </div>
    </>
  );
}
