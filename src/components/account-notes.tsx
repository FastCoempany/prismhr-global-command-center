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

// A dated, time-stamped note written from a partner-outreach chip on Today —
// your own ("mine") or what the partner said ("partner").
export type ChipNote = {
  id: string;
  partner: string;
  kind: "mine" | "partner" | "account";
  body: string;
  createdAt: string; // ISO
};

// Surfaces the chip-written account notes: who said it (you vs the partner),
// when (date + time), and the words. Distinct from the notetaker list — these
// live on the account itself, not on the Notes tab.
export function AccountChipNotes({ notes }: { notes: ChipNote[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.tag}>Worked notes</span>
        <span className={styles.count}>{notes.length}</span>
        <span className={styles.hint}>from the partner-outreach chips on Today</span>
      </div>
      {notes.map((n) => (
        <div key={n.id} className={styles.note}>
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
