"use client";

// The THEIRS line — the HomeRoom's decreed winner (Concept I, 2026-08-20).
// One mono line at the head of the row's register panel, in the warm ochre
// the room once reserved for the other side's court. Click it and the
// verified gems unfold inside the panel, the email meat one more click down
// (the meat law), served by the evidence route. The move keeps its seat and
// its weight, unconditionally; COMPARABLE and every register keep theirs.

import { useState } from "react";
import styles from "./room.module.css";

export type TheirsGem = {
  term: string;
  act: string;
  reason: string;
  whenDay: string;
  cites: { k: string; day: string; who: string; subject: string }[];
};

const mmdd = (day: string) => (day ? day.slice(5).replace("-", "/") : "");

export default function TheirsLine({
  accountId,
  label,
  gems,
}: {
  accountId: string;
  label: string;
  gems: TheirsGem[];
}) {
  const [open, setOpen] = useState(false);
  const [excerpts, setExcerpts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  if (gems.length === 0) return null;

  const loadExcerpt = async (k: string) => {
    if (excerpts[k] !== undefined) {
      const next = { ...excerpts };
      delete next[k];
      setExcerpts(next);
      return;
    }
    setBusy(k);
    try {
      const r = await fetch(
        `/activity/evidence?acct=${encodeURIComponent(accountId)}&k=${encodeURIComponent(k)}`,
        { cache: "no-store" },
      );
      const j = (await r.json()) as {
        ok: boolean;
        row?: { excerpt: string };
        reason?: string;
      };
      setExcerpts({
        ...excerpts,
        [k]: j.ok
          ? j.row?.excerpt ||
            "The row carries no comment body — the subject is the whole entry."
          : (j.reason ?? "The row isn't in the staged slice."),
      });
    } catch {
      setExcerpts({ ...excerpts, [k]: "The evidence store didn't answer. Try again." });
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div className={styles.theirs}>
        THEIRS ·{" "}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          title="The second record's verified read on this account — opens the gems, the meat one click deeper"
        >
          {label}
        </button>
      </div>
      {open && (
        <div className={styles.theirsFold}>
          {gems.map((g) => (
            <div key={`${g.term}|${g.whenDay}`} className={styles.theirsGem}>
              <span className={styles.theirsTerm}>◆ {g.term} · CONFIRMED</span>
              <div className={styles.theirsAct}>{g.act}</div>
              <div className={styles.theirsWhy}>{g.reason}</div>
              {g.cites.map((c) => (
                <div key={c.k}>
                  <button
                    type="button"
                    className={styles.theirsCite}
                    onClick={() => loadExcerpt(c.k)}
                  >
                    {mmdd(c.day)} · {c.who} · {c.subject}{" "}
                    <b>
                      {busy === c.k
                        ? "…"
                        : excerpts[c.k] !== undefined
                          ? "▾"
                          : "▸ read it"}
                    </b>
                  </button>
                  {excerpts[c.k] !== undefined && (
                    <div className={styles.theirsExcerpt}>{excerpts[c.k]}</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
