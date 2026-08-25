"use client";

// The Act Lane — Version C, the decreed winner of the Act Flow triptych
// (2026-08-21). A standing workbench beside the sheet: evidence up top, the
// editable draft mid, Send / File / fork at the foot. The lane holds while
// the sheet scrolls; clicking another chip reloads it — after saving any
// touched draft, because the pad never eats your words. Citations drill to
// cleaned excerpts by the meat law, served by the evidence route.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../command-center.module.css";
import {
  fileActSend,
  forkAct,
  markActActed,
  saveActDraft,
  undoForkAct,
} from "./act-actions";

export type LaneAct = {
  accountId: string;
  accountName: string;
  term: string;
  act: string;
  reason: string;
  whenDay: string;
  cites: { k: string; day: string; who: string; subject: string }[];
  to: string;
  toEmail: string;
  subject: string;
  body: string;
  onBoard: boolean;
};

const mmdd = (day: string) => (day ? day.slice(5).replace("-", "/") : "");

export default function ActLane({
  act,
  canWrite,
  onClose,
}: {
  act: LaneAct;
  canWrite: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [to, setTo] = useState(act.to);
  const [subject, setSubject] = useState(act.subject);
  const [body, setBody] = useState(act.body);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState("");
  const [excerpts, setExcerpts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [receipt, setReceipt] = useState<{
    text: string;
    undo: { kind: "todo" | "seat"; id: string } | null;
  } | null>(null);

  // The pad never eats your words: a touched draft saves on unmount too.
  const latest = useRef({ to, subject, body, dirty });
  useEffect(() => {
    latest.current = { to, subject, body, dirty };
  }, [to, subject, body, dirty]);
  useEffect(() => {
    const snapshot = latest;
    const acct = act.accountId;
    const term = act.term;
    return () => {
      const s = snapshot.current;
      if (s.dirty)
        void saveActDraft({
          accountId: acct,
          term,
          to: s.to,
          subject: s.subject,
          body: s.body,
        });
    };
  }, [act.accountId, act.term]);

  const touch =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setDirty(true);
      setSaved("");
    };

  const doSave = async () => {
    setBusy("save");
    const r = await saveActDraft({
      accountId: act.accountId,
      term: act.term,
      to,
      subject,
      body,
    });
    setBusy("");
    if (r.ok) {
      setDirty(false);
      setSaved("Draft saved.");
    } else setSaved("That didn't save. Try again.");
  };

  const doSend = async () => {
    setBusy("send");
    const r = await fileActSend({ accountId: act.accountId, to, subject });
    setBusy("");
    if (!r.ok) {
      setSaved("The send didn't file. Try again.");
      return;
    }
    const mail = `mailto:${encodeURIComponent(act.toEmail && to === act.to ? act.toEmail : "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mail, "_blank");
    router.refresh();
    onClose();
  };

  const doDone = async () => {
    setBusy("done");
    const r = await markActActed({ accountId: act.accountId, term: act.term });
    setBusy("");
    if (r.ok) {
      router.refresh();
      onClose();
    } else setSaved("That didn't stamp. Try again.");
  };

  const doFork = async (flip: boolean) => {
    const toHome = flip ? !act.onBoard : act.onBoard;
    setBusy("fork");
    const r = await forkAct({
      accountId: act.accountId,
      act: act.act,
      term: act.term,
      toHome,
    });
    setBusy("");
    if (r.ok) {
      setReceipt({
        text: toHome
          ? "✓ FILED · THE HOMEROOM'S TODAY REGISTER"
          : "✓ FILED · GROUNDWORK'S WING · TODAY",
        undo: r.undo ?? null,
      });
      router.refresh();
    } else setSaved("The filing failed. Try again.");
  };

  const doUnfork = async () => {
    if (!receipt?.undo) return;
    setBusy("unfork");
    const r = await undoForkAct(receipt.undo);
    setBusy("");
    if (r.ok) {
      setReceipt(null);
      router.refresh();
    }
  };

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
        `/activity/evidence?acct=${encodeURIComponent(act.accountId)}&k=${encodeURIComponent(k)}`,
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
    <aside className={styles.actLane} aria-label="The act workbench">
      <div className={styles.actLaneKick}>
        <span>
          THE ACT · ◆ {act.term || "—"}
          {act.whenDay ? ` · ${mmdd(act.whenDay)}` : ""} · REFUTER-VERIFIED
        </span>
        <button
          type="button"
          className={styles.actLaneX}
          onClick={onClose}
          aria-label="Close the lane"
        >
          ✕
        </button>
      </div>
      <div className={styles.actLaneName}>{act.accountName}</div>
      <div className={styles.actLaneAct}>{act.act}</div>
      {act.reason && <div className={styles.actLaneWhy}>{act.reason}</div>}
      {act.cites.map((c) => (
        <div key={c.k}>
          <button
            type="button"
            className={styles.srCite}
            onClick={() => loadExcerpt(c.k)}
          >
            {mmdd(c.day)} · {c.who} · {c.subject}{" "}
            <b>{busy === c.k ? "…" : excerpts[c.k] !== undefined ? "▾" : "▸ read it"}</b>
          </button>
          {excerpts[c.k] !== undefined && (
            <div className={styles.srExcerpt}>{excerpts[c.k]}</div>
          )}
        </div>
      ))}

      <div className={styles.actLaneField}>
        <label>TO</label>
        <input
          value={to}
          onChange={(e) => touch(setTo)(e.target.value)}
          aria-label="To"
        />
      </div>
      <div className={styles.actLaneField}>
        <label>SUBJECT</label>
        <input
          value={subject}
          onChange={(e) => touch(setSubject)(e.target.value)}
          aria-label="Subject"
        />
      </div>
      <textarea
        className={styles.actLaneBody}
        value={body}
        onChange={(e) => touch(setBody)(e.target.value)}
        placeholder="Write the note. It saves; it never routes on its own."
        aria-label="Draft body"
      />

      {canWrite && (
        <div className={styles.actLaneBtns}>
          <button
            type="button"
            className={`${styles.addMini} ${styles.actLaneGo}`}
            onClick={doSend}
            disabled={busy === "send"}
          >
            {busy === "send" ? "…" : "Send it → mail"}
          </button>
          <button
            type="button"
            className={styles.addMini}
            onClick={doDone}
            disabled={busy === "done"}
          >
            ✓ File as done
          </button>
          <button
            type="button"
            className={styles.addMini}
            onClick={doSave}
            disabled={!dirty || busy === "save"}
          >
            {busy === "save" ? "…" : "Save the draft"}
          </button>
        </div>
      )}
      {saved && <div className={styles.actLaneSaved}>{saved}</div>}

      {canWrite && (
        <div className={styles.actLaneFork}>
          {receipt ? (
            <div className={styles.actLaneReceipt}>
              {receipt.text}
              {receipt.undo && (
                <>
                  {" · "}
                  <button type="button" className={styles.actLaneTb} onClick={doUnfork}>
                    ↺ take it back
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <span className={styles.actLaneForkWhy}>
                Or file the follow-up where it belongs —{" "}
                <b>{act.onBoard ? "⌂ HOMEROOM" : "⚑ GROUNDWORK"}</b>{" "}
                {act.onBoard ? "· the deal is live" : "· nobody's working it"}
              </span>
              <button
                type="button"
                className={styles.actLaneForkBtn}
                onClick={() => doFork(false)}
                disabled={busy === "fork"}
              >
                FILE IT · TODAY
              </button>
              <button
                type="button"
                className={styles.actLaneForkAlt}
                onClick={() => doFork(true)}
                disabled={busy === "fork"}
              >
                the other room instead
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
