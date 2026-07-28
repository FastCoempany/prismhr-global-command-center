"use client";

// The Operating Room, consolidated: Half-Light rows carrying the old board's
// stage nodes and the old day sheet's mechanics per account; the roundups +
// check-ins engine in the right-margin drawer; the eye drawer holding what
// used to be "then, if there's time". Every composer is bound to its row.

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChiClock } from "../today-client";
import {
  addFollowUp,
  archiveThread,
  delayFollowUp,
  dismissTriage,
  logTouch,
  markReplied,
  markResponded,
  muteRoundupPartner,
  snoozeSignal,
  unmuteRoundupPartner,
} from "../today/actions";
import { dismissSuggestion, saveNote, toggleCheck } from "../dashboard/actions";
import { roomClose, roomCompose, roomPaste, roomTodoSet } from "./actions";
import type { StageView } from "@/lib/room/stages-view";
import styles from "./room.module.css";

export type RoomRow = {
  accountId: string;
  cardId: string;
  name: string;
  meta: string;
  shape: string;
  multiTone: "g" | "y" | "r";
  people: { name: string; line: string }[];
  briefed: boolean;
  climb: { frac: number; capTone: "risk" | "warn" | "ok"; label: string };
  stages: StageView[];
  suggestions: { node: string; index: number; item: string; why: string }[];
  move: string;
  thin: boolean;
  court: { line: string; tone: "you" | "them" | "quiet" | "none" };
  outstanding: {
    item: string;
    node: string;
    index: number;
    doneKey: string;
    closedCount: number;
  } | null;
  sheetOpen: { id: string; body: string }[];
  sheetDelayed: { id: string; body: string; when: string }[];
  sheetDoneToday: { id: string; body: string }[];
  record: { id: string; t: string; text: string; struck: boolean }[];
  health: "red" | "amber" | "green" | "quiet";
  rank: number;
  canWrite: boolean;
};

export type CadenceRow = {
  partner: string;
  subjectKey: string;
  status: string; // none | awaiting | replied | responded | archived | open
  lastSent: string;
  daysAgo: number | null;
  due: boolean;
  muted: boolean;
  opener: string;
  closer: string;
  sections: { id: string; name: string; bullet: string; on: boolean }[];
  total: number;
};
export type CheckinRow = {
  subjectKey: string;
  label: string;
  ask: string;
  quietDays: number | null;
  kind: string;
};
export type WarmRow = { id: string; name: string; why: string; seedNote: string };
export type LaterRow = { id: string; body: string };

function Briefed({ on }: { on: boolean }) {
  return (
    <span
      className={styles.briefed}
      title={
        on
          ? "Partner briefed — the stage record's partner-brief item is closed."
          : "Partner not yet briefed — turns green when a partner-brief item closes in the stage record."
      }
    >
      <svg
        viewBox="0 0 20 20"
        width="13"
        height="13"
        fill="none"
        stroke={on ? "#1E5B46" : "rgba(10,28,64,.25)"}
        strokeWidth="2.4"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      >
        <path d="M5 11 l4 4 7-8" />
        <path d="M2 18 h16" />
      </svg>
    </span>
  );
}

function Row({ row }: { row: RoomRow }) {
  const [freshRecord, setFreshRecord] = useState<{ text: string }[]>([]);
  const [freshOpen, setFreshOpen] = useState<{ body: string }[]>([]);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [logText, setLogText] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [stageOpen, setStageOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submitCompose = () => {
    const text = logText.trim();
    if (!text || pending) return;
    start(async () => {
      const r = await roomCompose(row.accountId, text);
      if (r.ok) {
        if (r.kind === "note") setFreshRecord((f) => [{ text: `✎ ${text}` }, ...f]);
        else
          setFreshOpen((f) => [
            { body: text.replace(/^([▢⏲]|\[\s?\])\s*\S*\s*/, "") },
            ...f,
          ]);
        setLogText("");
        setNote(null);
      } else setNote(r.reason ?? "That didn't save.");
    });
  };
  const submitPaste = () => {
    const text = pasteText.trim();
    if (!text || pending) return;
    start(async () => {
      const r = await roomPaste(row.accountId, text);
      if (r.ok) {
        setFreshRecord((f) => [
          {
            text: `☰ Paste filed — ${r.filed} entr${r.filed === 1 ? "y" : "ies"}${r.how === "ai" ? ", AI-cleaned" : ""}.`,
          },
          ...f,
        ]);
        setPasteText("");
        setPasteOpen(false);
        setNote(null);
      } else setNote(r.reason ?? "The paste didn't file.");
    });
  };
  const submitClose = () => {
    if (!row.outstanding || pending || closed) return;
    const o = row.outstanding;
    start(async () => {
      const r = await roomClose({
        accountId: row.accountId,
        cardId: row.cardId,
        node: o.node,
        index: o.index,
        doneKey: o.doneKey,
        item: o.item,
        cardName: row.name,
      });
      if (r.ok) {
        setClosed(true);
        setFreshRecord((f) => [{ text: `✓ Closed: ${o.item}` }, ...f]);
      } else setNote(r.reason ?? "The close didn't save.");
    });
  };
  const todoOp = (id: string, op: "done" | "undo" | "tomorrow" | "now" | "drop") =>
    start(async () => {
      const r = await roomTodoSet(row.accountId, id, op);
      if (!r.ok) setNote(r.reason ?? "That didn't save.");
      else if (op === "done") setDoneIds((s) => new Set(s).add(id));
      else if (op === "undo")
        setDoneIds((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      else if (op === "drop" || op === "tomorrow" || op === "now")
        setGone((s) => new Set(s).add(id));
    });

  const openStage = row.stages.find((s) => s.key === stageOpen);
  const label = row.climb.label;
  const labelInside = row.climb.frac >= 0.45;

  return (
    <div className={styles.row}>
      <div className={styles.deal}>
        <div className={styles.nmline}>
          <span className={styles.nm}>
            <Briefed on={row.briefed} />
            <Link href={`/accounts?focus=${row.accountId}`} className={styles.nmLink}>
              {row.name}
            </Link>
          </span>
          <span className={styles.chips}>
            <span className={styles.chip}>{row.shape}</span>
            <span className={`${styles.multi} ${styles[`m_${row.multiTone}`]}`}>
              MULTI
              <span className={styles.hovercard}>
                <span className={styles.hk}>
                  WHO&apos;S IN THIS DEAL — FROM THE REPOSITORY
                </span>
                {row.people.length === 0 && (
                  <span className={styles.hp}>
                    No stakeholders on file yet — paste activity and they appear here.
                  </span>
                )}
                {row.people.map((p) => (
                  <span key={p.name} className={styles.hp}>
                    <b>{p.name}</b>
                    {p.line ? ` — ${p.line}` : ""}
                  </span>
                ))}
              </span>
            </span>
            {row.canWrite && (
              <button
                type="button"
                className={styles.zap}
                title={`Paste — files to ${row.name}`}
                onClick={() => setPasteOpen((v) => !v)}
              >
                ⚡
              </button>
            )}
          </span>
        </div>
        {row.meta && <span className={styles.meta}>{row.meta}</span>}

        <div className={styles.climb}>
          <div className={styles.track}>
            <div
              className={styles.gain}
              style={{ width: `${Math.round(Math.max(0.04, row.climb.frac) * 100)}%` }}
            />
          </div>
          <div
            className={`${styles.cap} ${row.climb.capTone === "risk" ? styles.capRisk : row.climb.capTone === "warn" ? styles.capWarn : styles.capOk}`}
            style={{ left: `${Math.round(Math.max(0.04, row.climb.frac) * 100)}%` }}
          />
          {row.stages.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`${styles.node} ${s.state === "done" ? styles.nodeDone : ""} ${s.state === "cur" ? styles.nodeCur : ""}`}
              style={{ left: `${2 + i * 14.3}%` }}
              title={`${s.label} — open its checklist`}
              onClick={() => setStageOpen((k) => (k === s.key ? null : s.key))}
            />
          ))}
          {labelInside ? (
            <span className={styles.clIn}>{label}</span>
          ) : (
            <span
              className={styles.clOut}
              style={{
                left: `calc(${Math.round(Math.max(0.04, row.climb.frac) * 100)}% + 18px)`,
              }}
            >
              {label}
            </span>
          )}
        </div>

        {openStage && (
          <div className={styles.stageDrawer}>
            <div className={styles.sdHead}>
              <b>{openStage.label}</b>
              <button
                type="button"
                className={styles.sdClose}
                onClick={() => setStageOpen(null)}
              >
                ✕
              </button>
            </div>
            <ul className={styles.sdList}>
              {openStage.items.map((it) => (
                <li key={it.index} className={it.checked ? styles.sdDone : undefined}>
                  {row.canWrite ? (
                    <form action={toggleCheck} className={styles.sdForm}>
                      <input type="hidden" name="cardId" value={row.cardId} />
                      <input type="hidden" name="node" value={openStage.key} />
                      <input type="hidden" name="index" value={it.index} />
                      <input type="hidden" name="returnTo" value="/room" />
                      <button
                        className={`${styles.sdRadio} ${it.checked ? styles.sdRadioOn : ""}`}
                        aria-label={it.checked ? "uncheck" : "check"}
                      />
                    </form>
                  ) : (
                    <span
                      className={`${styles.sdRadio} ${it.checked ? styles.sdRadioOn : ""}`}
                    />
                  )}
                  <span className={styles.sdItem}>{it.item}</span>
                  {it.note && (
                    <span className={styles.sdNote} title={it.note}>
                      ≡
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {row.suggestions
              .filter((sg) => sg.node === openStage.key)
              .slice(0, 2)
              .map((sg) => (
                <div key={`${sg.node}:${sg.index}`} className={styles.sdSugg}>
                  Evidence suggests <b>“{sg.item}” can be checked</b> — {sg.why}.
                  {row.canWrite && (
                    <span className={styles.sdSuggActs}>
                      <form action={toggleCheck} className={styles.inline}>
                        <input type="hidden" name="cardId" value={row.cardId} />
                        <input type="hidden" name="node" value={sg.node} />
                        <input type="hidden" name="index" value={sg.index} />
                        <input type="hidden" name="returnTo" value="/room" />
                        <button className={styles.sdTag}>accept ✓</button>
                      </form>
                      <form action={dismissSuggestion} className={styles.inline}>
                        <input type="hidden" name="cardId" value={row.cardId} />
                        <input type="hidden" name="node" value={sg.node} />
                        <input type="hidden" name="index" value={sg.index} />
                        <input type="hidden" name="returnTo" value="/room" />
                        <button className={styles.sdTag}>dismiss ✕</button>
                      </form>
                    </span>
                  )}
                </div>
              ))}
            {row.canWrite ? (
              <form action={saveNote} className={styles.sdJudg}>
                <input type="hidden" name="cardId" value={row.cardId} />
                <input type="hidden" name="node" value={openStage.key} />
                <input type="hidden" name="returnTo" value="/room" />
                <input
                  name="note"
                  defaultValue={openStage.judgment}
                  placeholder="Your judgment — why this stage sits where it does…"
                />
                <button className={styles.sdTag}>save</button>
              </form>
            ) : (
              openStage.judgment && (
                <p className={styles.sdJudgRead}>{openStage.judgment}</p>
              )
            )}
          </div>
        )}

        <div className={styles.movewrap}>
          <span className={styles.lbl}>NEXT MOVE</span>
          <p className={`${styles.move} ${row.thin ? styles.thin : ""}`}>{row.move}</p>
          {row.canWrite && row.outstanding && !closed && (
            <button
              type="button"
              className={row.rank === 0 ? styles.go : styles.ghost}
              disabled={pending}
              onClick={submitClose}
            >
              {pending ? "Saving…" : "Mark it done ✓"}
            </button>
          )}
        </div>
        {row.outstanding && (
          <div className={styles.outst}>
            <span className={styles.lbl}>STILL OPEN</span>
            <span className={closed ? styles.donenow : undefined}>
              {row.outstanding.item}
            </span>
            {row.outstanding.closedCount > 0 && (
              <span className={styles.closedct}>
                {" "}
                · {row.outstanding.closedCount + (closed ? 1 : 0)} closed behind it
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.rec}>
        <div className={`${styles.court} ${styles[`c_${row.court.tone}`]}`}>
          {row.court.line}
        </div>

        {(row.sheetOpen.length > 0 || freshOpen.length > 0) && (
          <>
            <span className={styles.zone}>OPEN — THIS ACCOUNT&apos;S WORK</span>
            {freshOpen.map((f, i) => (
              <div
                key={`fo${i}`}
                className={`${styles.it} ${styles.itOpen} ${styles.fresh}`}
              >
                <span className={styles.ic}>▢</span>
                <span className={styles.tx}>{f.body}</span>
              </div>
            ))}
            {row.sheetOpen
              .filter((t) => !gone.has(t.id))
              .map((t) => {
                const did = doneIds.has(t.id);
                return (
                  <div
                    key={t.id}
                    className={`${styles.it} ${did ? styles.itDid : styles.itOpen}`}
                  >
                    <span className={styles.ic}>{did ? "✓" : "▢"}</span>
                    <span className={styles.tx}>{t.body}</span>
                    {row.canWrite && (
                      <span className={styles.ctl}>
                        {did ? (
                          <button onClick={() => todoOp(t.id, "undo")} title="undo">
                            ↩
                          </button>
                        ) : (
                          <>
                            <button onClick={() => todoOp(t.id, "done")} title="done">
                              ✓
                            </button>
                            <button
                              onClick={() => todoOp(t.id, "tomorrow")}
                              title="tomorrow"
                            >
                              ⏲
                            </button>
                            <button onClick={() => todoOp(t.id, "drop")} title="drop">
                              ✕
                            </button>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
          </>
        )}

        {row.sheetDelayed.filter((t) => !gone.has(t.id)).length > 0 && (
          <>
            <span className={styles.zone}>SCHEDULED</span>
            {row.sheetDelayed
              .filter((t) => !gone.has(t.id))
              .map((t) => (
                <div key={t.id} className={`${styles.it} ${styles.itDelayed}`}>
                  <span className={styles.ic}>⏲</span>
                  <span className={styles.tx}>{t.body}</span>
                  <span className={styles.when}>→ {t.when}</span>
                  {row.canWrite && (
                    <span className={styles.ctl}>
                      <button
                        onClick={() => todoOp(t.id, "now")}
                        title="bring it back now"
                      >
                        ↩
                      </button>
                    </span>
                  )}
                </div>
              ))}
          </>
        )}

        {row.sheetDoneToday.length > 0 && (
          <>
            <span className={styles.zone}>COMPLETED TODAY</span>
            {row.sheetDoneToday.map((t) => (
              <div key={t.id} className={`${styles.it} ${styles.itDid}`}>
                <span className={styles.ic}>✓</span>
                <span className={styles.tx}>{t.body}</span>
                {row.canWrite && (
                  <span className={styles.ctl}>
                    <button onClick={() => todoOp(t.id, "undo")} title="undo">
                      ↩
                    </button>
                  </span>
                )}
              </div>
            ))}
          </>
        )}

        <span className={styles.zone}>THE RECORD</span>
        {freshRecord.map((f, i) => (
          <div key={`fr${i}`} className={`${styles.it} ${styles.fresh}`}>
            <span className={styles.ic}>·</span>
            <span className={styles.tx}>{f.text}</span>
          </div>
        ))}
        {row.record.map((e) => (
          <div key={e.id} className={`${styles.it} ${e.struck ? styles.itDid : ""}`}>
            <span className={styles.ic}>
              {e.text.startsWith("✉")
                ? "✉"
                : e.text.startsWith("✓")
                  ? "✓"
                  : e.text.startsWith("☰")
                    ? "☰"
                    : "✎"}
            </span>
            <span className={styles.tx}>
              <span className={styles.t}>{e.t}</span>
              {e.text.replace(/^[✉✓☰✎⚡▢]\s?/, "")}
            </span>
          </div>
        ))}
        {row.record.length === 0 && freshRecord.length === 0 && (
          <div className={`${styles.it} ${styles.itEmpty}`}>
            <span className={styles.ic}>·</span>
            <span className={styles.tx}>Nothing on file yet.</span>
          </div>
        )}

        {row.canWrite && (
          <div className={styles.logbox}>
            <span className={styles.lk}>
              LOG IT — FILES TO {row.name.toUpperCase()}, EVERYWHERE
            </span>
            <div className={styles.logline}>
              <button
                type="button"
                className={styles.zap}
                title={`Paste — files to ${row.name}`}
                onClick={() => setPasteOpen((v) => !v)}
              >
                ⚡
              </button>
              <input
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCompose();
                }}
                placeholder="Note ⏎ · start with ▢ for an action · ⏲ wed to schedule it…"
                aria-label={`Log to ${row.name}`}
              />
            </div>
            {pasteOpen && (
              <div className={styles.pastepane}>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Paste the Salesforce capture, an email, or meeting notes — it files to ${row.name}.`}
                />
                <div className={styles.pasteRow}>
                  <button
                    type="button"
                    className={styles.cancel}
                    onClick={() => setPasteOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.file}
                    disabled={pending}
                    onClick={submitPaste}
                  >
                    {pending ? "Filing…" : "✨ Clean & file"}
                  </button>
                </div>
              </div>
            )}
            {note && <p className={styles.err}>{note}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function PartnerCard({ c }: { c: CadenceRow }) {
  const [on, setOn] = useState<Set<string>>(
    () => new Set(c.sections.filter((s) => s.on).map((s) => s.id)),
  );
  const message = useMemo(() => {
    const lines = c.sections.filter((s) => on.has(s.id)).map((s) => `• ${s.bullet}`);
    return `${c.opener}\n\n${lines.join("\n")}\n\n${c.closer}`;
  }, [c, on]);
  const stateLine =
    c.status === "none" || c.status === "archived"
      ? c.due
        ? "DUE — NEVER SENT"
        : "FRESH"
      : c.status === "awaiting"
        ? `SENT${c.daysAgo != null ? ` ${c.daysAgo}D AGO` : ""} · AWAITING`
        : c.status.toUpperCase();
  return (
    <div className={styles.pcard}>
      <div className={styles.pcHead}>
        <b>{c.partner}</b>
        {c.due && <span className={styles.dueChip}>DUE</span>}
        <span className={styles.pcState}>{stateLine}</span>
        <form
          action={c.muted ? unmuteRoundupPartner : muteRoundupPartner}
          className={styles.inline}
        >
          <input type="hidden" name="partner" value={c.partner} />
          <input type="hidden" name="returnTo" value="/room" />
          <button
            className={styles.muteBtn}
            title={c.muted ? "unmute cadence" : "mute cadence"}
          >
            {c.muted ? "🔕" : "🔔"}
          </button>
        </form>
      </div>
      {(c.status === "none" || c.status === "archived") && (
        <>
          <div className={styles.pcAccts}>
            {c.sections.map((s) => (
              <label key={s.id}>
                <input
                  type="checkbox"
                  checked={on.has(s.id)}
                  onChange={() =>
                    setOn((prev) => {
                      const n = new Set(prev);
                      if (n.has(s.id)) n.delete(s.id);
                      else n.add(s.id);
                      return n;
                    })
                  }
                />
                {s.name}
              </label>
            ))}
          </div>
          <div className={styles.pcMsg}>{message}</div>
          <form
            action={logTouch}
            className={styles.pcActs}
            onSubmit={() => {
              void navigator.clipboard?.writeText(message).catch(() => null);
            }}
          >
            <input type="hidden" name="subjectKey" value={c.subjectKey} />
            <input type="hidden" name="kind" value="partner" />
            <input type="hidden" name="label" value={c.partner} />
            <input
              type="hidden"
              name="detail"
              value={`${on.size} of ${c.total} teed up`}
            />
            <input type="hidden" name="message" value={message} />
            <input type="hidden" name="when" value="tomorrow" />
            <input type="hidden" name="returnTo" value="/room" />
            <button className={styles.pcPrimary}>Copy &amp; mark sent</button>
          </form>
        </>
      )}
      {c.status === "awaiting" && (
        <div className={styles.pcActs}>
          <form action={markReplied} className={styles.inline}>
            <input type="hidden" name="subjectKey" value={c.subjectKey} />
            <input type="hidden" name="returnTo" value="/room" />
            <button className={styles.pcBtn}>They replied ▸</button>
          </form>
          <form action={archiveThread} className={styles.inline}>
            <input type="hidden" name="subjectKey" value={c.subjectKey} />
            <input type="hidden" name="returnTo" value="/room" />
            <button className={styles.pcBtn}>Archive</button>
          </form>
        </div>
      )}
      {(c.status === "replied" || c.status === "responded" || c.status === "open") && (
        <div className={styles.pcActs}>
          <form action={markResponded} className={styles.inline}>
            <input type="hidden" name="subjectKey" value={c.subjectKey} />
            <input type="hidden" name="returnTo" value="/room" />
            <button className={styles.pcPrimary}>I replied ▸</button>
          </form>
          <form action={archiveThread} className={styles.inline}>
            <input type="hidden" name="subjectKey" value={c.subjectKey} />
            <input type="hidden" name="returnTo" value="/room" />
            <button className={styles.pcBtn}>Archive</button>
          </form>
        </div>
      )}
    </div>
  );
}

function CadenceDrawer({
  cadence,
  checkins,
  onClose,
}: {
  cadence: CadenceRow[];
  checkins: CheckinRow[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"roundups" | "checkins">("roundups");
  const visible = cadence.filter((c) => !c.muted);
  const muted = cadence.filter((c) => c.muted);
  return (
    <div className={styles.drawerPane}>
      <div className={styles.dpHead}>
        <button
          type="button"
          className={`${styles.dpTab} ${tab === "roundups" ? styles.dpTabOn : ""}`}
          onClick={() => setTab("roundups")}
        >
          ROUNDUPS
        </button>
        <button
          type="button"
          className={`${styles.dpTab} ${tab === "checkins" ? styles.dpTabOn : ""}`}
          onClick={() => setTab("checkins")}
        >
          CHECK-INS
        </button>
        <button type="button" className={styles.dpClose} onClick={onClose}>
          ✕ close
        </button>
      </div>
      {tab === "roundups" && (
        <>
          {visible.map((c) => (
            <PartnerCard key={c.partner} c={c} />
          ))}
          {visible.length === 0 && (
            <p className={styles.dpEmpty}>
              Nothing to round up — every partner is either live or muted.
            </p>
          )}
          {muted.length > 0 && (
            <>
              <span className={styles.zone}>MUTED</span>
              {muted.map((c) => (
                <div key={c.partner} className={styles.pcMutedRow}>
                  {c.partner}
                  <form action={unmuteRoundupPartner} className={styles.inline}>
                    <input type="hidden" name="partner" value={c.partner} />
                    <input type="hidden" name="returnTo" value="/room" />
                    <button className={styles.sdTag}>restore</button>
                  </form>
                </div>
              ))}
            </>
          )}
        </>
      )}
      {tab === "checkins" && (
        <>
          {checkins.map((t) => (
            <div key={t.subjectKey} className={styles.chkRow}>
              <span className={styles.chkWho}>{t.label}</span>
              <span className={styles.chkAsk}>
                {t.ask ? `owes: ${t.ask}` : "quiet check — nothing owed"}
              </span>
              {t.quietDays != null && t.quietDays > 0 && (
                <span className={styles.chkOwed}>{t.quietDays}D</span>
              )}
              <span className={styles.chkCtl}>
                <form action={markReplied} className={styles.inline}>
                  <input type="hidden" name="subjectKey" value={t.subjectKey} />
                  <input type="hidden" name="returnTo" value="/room" />
                  <button title="they answered">✓</button>
                </form>
                <form action={delayFollowUp} className={styles.inline}>
                  <input type="hidden" name="subjectKey" value={t.subjectKey} />
                  <input type="hidden" name="when" value="tomorrow" />
                  <input type="hidden" name="returnTo" value="/room" />
                  <button title="push to tomorrow">⏲</button>
                </form>
                <form action={archiveThread} className={styles.inline}>
                  <input type="hidden" name="subjectKey" value={t.subjectKey} />
                  <input type="hidden" name="returnTo" value="/room" />
                  <button title="archive the thread">✕</button>
                </form>
              </span>
            </div>
          ))}
          {checkins.length === 0 && (
            <p className={styles.dpEmpty}>No check-ins due — the cadence is quiet.</p>
          )}
        </>
      )}
    </div>
  );
}

function EyeDrawer({
  warming,
  later,
  onClose,
}: {
  warming: WarmRow[];
  later: LaterRow[];
  onClose: () => void;
}) {
  return (
    <div className={styles.drawerPane}>
      <div className={styles.dpHead}>
        <span className={styles.eyeTitle}>
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="#1E5B46"
            strokeWidth="2"
          >
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Keep an eye out
        </span>
        <button type="button" className={styles.dpClose} onClick={onClose}>
          ✕ close
        </button>
      </div>
      <p className={styles.dpEsub}>
        Watched, not worked. Things leave here by being seeded, scheduled, or dismissed.
      </p>
      <span className={styles.zone}>WARMING — SIGNALS WORTH A LOOK</span>
      {warming.map((w) => (
        <div key={w.id} className={styles.pcard}>
          <div className={styles.pcHead}>
            <b>{w.name}</b>
          </div>
          <p className={styles.wWhy}>{w.why}</p>
          <div className={styles.pcActs}>
            <Link href={`/accounts?focus=${w.id}`} className={styles.pcPrimary}>
              Open &amp; seed ▸
            </Link>
            <form action={snoozeSignal} className={styles.inline}>
              <input type="hidden" name="accountId" value={w.id} />
              <input type="hidden" name="reason" value="parked from the eye" />
              <input type="hidden" name="days" value="14" />
              <input type="hidden" name="returnTo" value="/room" />
              <button className={styles.pcBtn}>Park 2w</button>
            </form>
            <form action={dismissTriage} className={styles.inline}>
              <input type="hidden" name="accountId" value={w.id} />
              <input type="hidden" name="name" value={w.name} />
              <input type="hidden" name="returnTo" value="/room" />
              <button className={styles.pcBtn}>Dismiss</button>
            </form>
          </div>
        </div>
      ))}
      {warming.length === 0 && (
        <p className={styles.dpEmpty}>Nothing warming right now.</p>
      )}
      <span className={styles.zone}>LATER — REAL, JUST NOT NOW</span>
      {later.map((t) => (
        <div key={t.id} className={styles.chkRow}>
          <span className={styles.chkAsk}>{t.body}</span>
        </div>
      ))}
      {later.length === 0 && <p className={styles.dpEmpty}>The later list is clear.</p>}
    </div>
  );
}

export function RoomClient({
  rows,
  cadence,
  checkins,
  warming,
  later,
  canWrite,
  dbUnavailable,
  boardNames,
}: {
  rows: RoomRow[];
  cadence: CadenceRow[];
  checkins: CheckinRow[];
  warming: WarmRow[];
  later: LaterRow[];
  canWrite: boolean;
  dbUnavailable: boolean;
  boardNames: { id: string; name: string }[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawer, setDrawer] = useState<"cadence" | "eye" | null>(null);
  const dueCount = cadence.filter((c) => c.due && !c.muted).length + checkins.length;
  const eyeCount = warming.length + later.length;

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <span className={styles.ident}>
          <svg
            viewBox="0 0 48 48"
            width="22"
            height="22"
            fill="none"
            stroke="#0A1C40"
            strokeWidth="4.4"
            strokeLinecap="butt"
            strokeLinejoin="miter"
          >
            <path d="M14 38 L24 10 L34 38" />
            <path d="M18.2 28 h11.6" />
            <path d="M2 38 h44" />
          </svg>
          <span className={styles.roomName}>OPERATING ROOM</span>
        </span>
        <span className={styles.addWrap}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ＋ add <span className={styles.car}>▾</span>
          </button>
          {menuOpen && (
            <div className={styles.menu}>
              <Link
                href="/accounts"
                className={styles.mi}
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.miIc}>＋</span>
                <span>
                  <b>Account to the board</b>
                  <span className={styles.miD}>
                    Pick from the book — the row appears with its intel attached.
                  </span>
                </span>
              </Link>
              <Link
                href="/intake"
                className={styles.mi}
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.miIc}>⚡</span>
                <span>
                  <b>File a paste</b>
                  <span className={styles.miD}>
                    SF capture, email, or notes — cleans and files to any account.
                  </span>
                </span>
              </Link>
              <Link
                href="/intake"
                className={styles.mi}
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.miIc}>✎</span>
                <span>
                  <b>Payroll intake form</b>
                  <span className={styles.miD}>
                    The MS-form mirror, prefilled from the deal&apos;s intel.
                  </span>
                </span>
              </Link>
              {canWrite && (
                <form action={addFollowUp} className={styles.miForm}>
                  <span className={styles.miIc}>⏲</span>
                  <span className={styles.miFormBody}>
                    <b>Follow-up</b>
                    <span className={styles.miRow}>
                      <input name="label" placeholder="Chase what, with whom…" />
                      <select name="when" defaultValue="tomorrow">
                        <option value="today">today</option>
                        <option value="tomorrow">tomorrow</option>
                      </select>
                      <input type="hidden" name="returnTo" value="/room" />
                      <button className={styles.sdTag}>arm</button>
                    </span>
                  </span>
                </form>
              )}
            </div>
          )}
        </span>
        <span className={styles.clock}>
          <ChiClock />
        </span>
      </div>

      {dbUnavailable && (
        <p className={styles.emptyBoard}>
          The database isn&apos;t reachable — the room shows nothing until it is.
        </p>
      )}
      {!dbUnavailable && rows.length === 0 && (
        <p className={styles.emptyBoard}>
          Nothing on the board yet — open the <Link href="/accounts">Account Room</Link>{" "}
          and add the deals you&apos;re working.
        </p>
      )}
      {rows.map((r) => (
        <Row key={r.cardId} row={r} />
      ))}
      {boardNames.length > 0 && null}

      {drawer === "cadence" && (
        <CadenceDrawer
          cadence={cadence}
          checkins={checkins}
          onClose={() => setDrawer(null)}
        />
      )}
      {drawer === "eye" && (
        <EyeDrawer warming={warming} later={later} onClose={() => setDrawer(null)} />
      )}

      <button
        type="button"
        className={styles.edge}
        style={{ top: "40%" }}
        onClick={() => setDrawer((d) => (d === "cadence" ? null : "cadence"))}
        title="Roundups and Check-ins"
      >
        <span>ROUNDUPS</span>
        <span className={styles.edgeDot}>·</span>
        <span>CHECK-INS</span>
        {dueCount > 0 && <span className={styles.edgeCount}>{dueCount}</span>}
      </button>
      <button
        type="button"
        className={styles.edge}
        style={{ top: "68%" }}
        onClick={() => setDrawer((d) => (d === "eye" ? null : "eye"))}
        title="Keep an eye out"
      >
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {eyeCount > 0 && <span className={styles.edgeCount}>{eyeCount}</span>}
      </button>
    </div>
  );
}
