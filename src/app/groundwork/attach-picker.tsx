"use client";

// The files Send in Outlook carries (ship order 2026-10-22): one
// fold under the letter, closed on arrival, with a checkbox per file in
// three groups, the demos we cut, the one-pagers and the agreements' review
// copies. Ticking any file turns Send into an Outlook draft that carries
// them; ticking none leaves Send as it is. No orange here: Send stays the
// stage's one move.

import {
  ATTACHMENTS,
  ATTACH_GROUPS,
  MAIL_SOFT_CAP,
  encodedBytes,
  sizeLabel,
} from "@/lib/collateral/attachments";
import styles from "./groundwork.module.css";

export function AttachPicker({
  picked,
  onChange,
}: {
  picked: readonly string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const total = ATTACHMENTS.filter((a) => picked.includes(a.id)).reduce(
    (n, a) => n + encodedBytes(a.bytes),
    0,
  );
  return (
    <details className={styles.attach}>
      <summary>Attach files ▾{picked.length > 0 && <b> · {picked.length}</b>}</summary>
      <div className={styles.attachBody}>
        {ATTACH_GROUPS.map(({ group, kicker }) => (
          <fieldset key={group} className={styles.attachGroup}>
            <legend className={styles.attachKick}>{kicker}</legend>
            {ATTACHMENTS.filter((a) => a.group === group).map((a) => (
              <label key={a.id} className={styles.attachItem}>
                <input
                  type="checkbox"
                  checked={picked.includes(a.id)}
                  onChange={() => toggle(a.id)}
                />
                <span className={styles.attachName}>{a.label}</span>
                <span className={styles.attachSize}>
                  {[a.runs, sizeLabel(a.bytes)].filter(Boolean).join(" · ")}
                </span>
              </label>
            ))}
          </fieldset>
        ))}
        <p className={styles.attachTotal} role="status">
          {picked.length === 0
            ? "Nothing ticked. Send opens Outlook as it does now."
            : `About ${sizeLabel(total)} in the email. Send downloads the draft with them.`}
        </p>
        {total > MAIL_SOFT_CAP && (
          <p className={styles.attachOver}>Over 20 MB. Most mail stops there.</p>
        )}
      </div>
    </details>
  );
}
