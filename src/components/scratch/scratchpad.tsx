"use client";

// The Scratchpaper — the Float (triptych winner, 2026-08-12). A ✎ button
// pinned to every page where the stash floater used to sit. Click, write,
// Enter: the line lands date-and-time stamped and stays there and only there.
// Nothing routes, nothing files, nothing becomes an action.
//
// The ask door (founder-decreed 2026-08-18): a second register, ASK THE APP.
// Type a question, Enter, walk away — the brain answers from the whole record
// and the floater PULSES red until the register is opened. The solid burn
// still means lines sitting on the paper; the pulse outranks it. Answers live
// in the one ask ledger and the bank at /asks keeps the running record.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  padAsk,
  padAskFeed,
  padAskRead,
  scratchAdd,
  scratchDelete,
  scratchEdit,
  scratchList,
  scratchRestore,
  scratchStruckList,
  type PadAskEntry,
} from "@/app/scratch/actions";
import {
  dayLabelFor,
  editOutcome,
  timeLabelFor,
  type EditEvent,
  type ScratchCursor,
  type ScratchLine,
} from "@/lib/scratch";
import { cleanAskText } from "@/lib/ask/clean";
import styles from "./scratchpad.module.css";

const PENDING_KEY = "askpad:pending";
const PENDING_STALE_MS = 4 * 60 * 1000;

type Pending = { q: string; at: number };

function readPending(): Pending | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pending;
    return typeof p?.q === "string" && typeof p?.at === "number" ? p : null;
  } catch {
    return null;
  }
}
function writePending(p: Pending | null) {
  try {
    if (p) window.localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // storage refused; the live promise still resolves in this tab
  }
}

// The feed rides a plain GET (caught 2026-08-20): a server-action poll
// re-applies the current route and cancels tab clicks.
const readFeed = async (): Promise<Awaited<ReturnType<typeof padAskFeed>>> => {
  try {
    const r = await fetch("/scratch/feed", { cache: "no-store" });
    if (!r.ok) return { ok: false, entries: [], unread: false };
    return (await r.json()) as Awaited<ReturnType<typeof padAskFeed>>;
  } catch {
    return { ok: false, entries: [], unread: false };
  }
};

/** Where the next page starts: the last line of the page just read. */
const cursorOf = (page: ScratchLine[]): ScratchCursor | null => {
  const last = page[page.length - 1];
  return last ? { at: last.at, id: last.id } : null;
};

export function Scratchpad() {
  const [open, setOpen] = useState(false);
  const [reg, setReg] = useState<"paper" | "ask">("paper");
  const [lines, setLines] = useState<ScratchLine[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [asks, setAsks] = useState<PadAskEntry[]>([]);
  const [askNote, setAskNote] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [pulse, setPulse] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const askRef = useRef<HTMLInputElement | null>(null);
  const fetched = useRef(false);
  // Paging (pass 8 X8: nothing on the paper ever dies). The pad reads a page
  // at a time; EARLIER at the foot reads the next. The cursor is the last
  // line the server sent, kept apart from the list, so a line restored or
  // kept since never moves where the next page starts.
  const [paperNext, setPaperNext] = useState<ScratchCursor | null>(null);
  const [struckNext, setStruckNext] = useState<ScratchCursor | null>(null);
  const [paging, setPaging] = useState(false);
  // What the operator is looking at right now — async landings consult this:
  // an answer arriving while the register is open stamps itself read instead
  // of pulsing at someone already reading it.
  const viewRef = useRef({ open: false, reg: "paper" as "paper" | "ask" });
  useEffect(() => {
    viewRef.current = { open, reg };
  }, [open, reg]);
  const arrived = () => {
    if (viewRef.current.open && viewRef.current.reg === "ask") void padAskRead();
    else setPulse(true);
  };

  // The pad reads once per session, on mount — the button needs to know the
  // paper's state and whether an answer landed before anyone opens it.
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    void scratchList().then((r) => {
      if (r.ok) {
        setLines(r.lines);
        setPaperNext(r.more ? cursorOf(r.lines) : null);
      } else {
        setLines([]);
        setNote(r.reason ?? "The pad didn't load.");
      }
    });
    const p = readPending();
    void readFeed().then((r) => {
      if (!r.ok) return;
      setAsks(r.entries);
      setPulse(r.unread);
      if (p) {
        const landed = r.entries.some((e) => Date.parse(e.at) >= p.at);
        if (landed) {
          writePending(null);
        } else if (Date.now() - p.at > PENDING_STALE_MS) {
          writePending(null);
          setAskNote("The last ask was interrupted. Ask it again.");
        } else {
          setPending(p);
        }
      }
    });
  }, []);

  // While an ask is in flight from a PREVIOUS page load, poll until it lands.
  // An ask fired in this tab resolves its own promise; this is the reload net.
  useEffect(() => {
    if (!pending) return;
    const iv = window.setInterval(() => {
      void readFeed().then((r) => {
        if (!r.ok) return;
        const landed = r.entries.some((e) => Date.parse(e.at) >= pending.at);
        if (landed) {
          setAsks(r.entries);
          setPending(null);
          writePending(null);
          arrived();
        } else if (Date.now() - pending.at > PENDING_STALE_MS) {
          setPending(null);
          writePending(null);
          setAskNote("The ask was interrupted. Ask it again.");
        }
      });
    }, 15000);
    return () => window.clearInterval(iv);
  }, [pending]);

  useEffect(() => {
    if (!open) return;
    (reg === "ask" ? askRef : inputRef).current?.focus();
  }, [open, reg]);

  // Viewing the ask register reads it — the pulse goes out. Runs from the
  // click handlers, never an effect, so the stamp fires exactly once.
  const readAsks = () => {
    if (pulse) {
      setPulse(false);
      void padAskRead();
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const keep = async () => {
    const body = inputRef.current?.value.trim() ?? "";
    if (!body || busy) return;
    setBusy(true);
    setNote(null);
    const r = await scratchAdd(body);
    setBusy(false);
    if (r.ok && r.line) {
      setLines((xs) => [r.line!, ...(xs ?? [])]);
      if (inputRef.current) inputRef.current.value = "";
    } else setNote(r.reason ?? "The line didn't keep.");
  };

  // The struck history (decreed 2026-08-19): ✕ moves the line off the paper
  // into the archive — nothing dies. Fetched lazily on first unfold.
  const [struck, setStruck] = useState<ScratchLine[] | null>(null);
  const [struckOpen, setStruckOpen] = useState(false);

  const crossOut = async (id: string) => {
    const prev = lines;
    const gone = (lines ?? []).find((l) => l.id === id) ?? null;
    setLines((xs) => (xs ?? []).filter((l) => l.id !== id));
    if (gone) setStruck((xs) => (xs === null ? xs : [gone, ...xs]));
    const r = await scratchDelete(id);
    if (!r.ok) {
      setLines(prev);
      if (gone) setStruck((xs) => (xs === null ? xs : xs.filter((l) => l.id !== id)));
      setNote(r.reason ?? "The cross-out didn't take.");
    }
  };

  // Edit in place (founder-decreed 2026-08-21): ✎ on hover, the line becomes
  // its own input, Enter keeps, Escape puts it back, a click-away keeps (D24:
  // the pad never eats your words). The decision is editOutcome's; this only
  // writes what it says to keep. The timestamp and the seat never move — only
  // the words.
  const [editId, setEditId] = useState("");
  const editRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (editId) editRef.current?.focus();
  }, [editId]);

  const settleEdit = async (id: string, event: EditEvent) => {
    const cur = (lines ?? []).find((l) => l.id === id);
    if (!cur) return setEditId("");
    const out = editOutcome(event, editRef.current?.value ?? "", cur.body);
    if (out.action === "revert" || out.text === cur.body) return setEditId("");
    const body = out.text;
    const prev = cur.body;
    setLines((xs) => (xs ?? []).map((l) => (l.id === id ? { ...l, body } : l)));
    setEditId("");
    const r = await scratchEdit(id, body);
    if (r.ok && r.body) {
      const kept = r.body;
      setLines((xs) => (xs ?? []).map((l) => (l.id === id ? { ...l, body: kept } : l)));
    } else if (!r.ok) {
      setLines((xs) => (xs ?? []).map((l) => (l.id === id ? { ...l, body: prev } : l)));
      setNote(r.reason ?? "The edit didn't keep.");
    }
  };

  const toggleStruck = () => {
    const opening = !struckOpen;
    setStruckOpen(opening);
    if (opening && struck === null)
      void scratchStruckList().then((r) => {
        setStruck(r.ok ? r.lines : []);
        setStruckNext(r.ok && r.more ? cursorOf(r.lines) : null);
      });
  };

  // The next page under the paper or under the struck fold, appended once
  // each: a line the list already holds is not added twice.
  const readEarlier = async (which: "paper" | "struck") => {
    const before = which === "paper" ? paperNext : struckNext;
    if (!before || paging) return;
    setPaging(true);
    const r =
      which === "paper" ? await scratchList(before) : await scratchStruckList(before);
    setPaging(false);
    if (!r.ok) {
      setNote(r.reason ?? "The earlier lines didn't load.");
      return;
    }
    const add = (xs: ScratchLine[] | null) => {
      const have = new Set((xs ?? []).map((l) => l.id));
      return [...(xs ?? []), ...r.lines.filter((l) => !have.has(l.id))];
    };
    const next = r.more ? cursorOf(r.lines) : null;
    if (which === "paper") {
      setLines(add);
      setPaperNext(next);
    } else {
      setStruck(add);
      setStruckNext(next);
    }
  };

  const bringBack = async (id: string) => {
    const line = (struck ?? []).find((l) => l.id === id) ?? null;
    if (!line) return;
    setStruck((xs) => (xs ?? []).filter((l) => l.id !== id));
    setLines((xs) => [line, ...(xs ?? [])].sort((a, b) => b.at.localeCompare(a.at)));
    const r = await scratchRestore(id);
    if (!r.ok) {
      setLines((xs) => (xs ?? []).filter((l) => l.id !== id));
      setStruck((xs) => [line, ...(xs ?? [])]);
      setNote(r.reason ?? "The restore didn't take.");
    }
  };

  const ask = () => {
    const q = askRef.current?.value.trim() ?? "";
    if (!q || pending) return;
    setAskNote(null);
    const p: Pending = { q, at: Date.now() };
    setPending(p);
    writePending(p);
    if (askRef.current) askRef.current.value = "";
    void padAsk(q)
      .then((r) => {
        setPending(null);
        writePending(null);
        if (r.ok && r.entry) {
          setAsks((xs) => [r.entry!, ...xs].slice(0, 8));
          arrived();
        } else {
          setAskNote(r.reason ?? "The answer didn't come back. Ask again.");
        }
      })
      .catch(() => {
        setPending(null);
        writePending(null);
        setAskNote("The answer didn't come back. Ask again.");
      });
  };

  const now = new Date();
  // Day dividers derived up front — the first line of each Chicago day
  // carries its kicker.
  const rows: { l: ScratchLine; divider: string | null }[] = [];
  {
    let prev = "";
    for (const l of lines ?? []) {
      const day = dayLabelFor(l.at, now);
      rows.push({ l, divider: day && day !== prev ? day : null });
      if (day) prev = day;
    }
  }

  // The glow ladder: pulse (an answer landed, unopened) outranks the solid
  // burn (lines still on the paper); an open card shows neither.
  const lit = (lines?.length ?? 0) > 0;
  const fabClass = pulse
    ? `${styles.fab} ${styles.fabPulse}`
    : lit
      ? `${styles.fab} ${styles.fabLit}`
      : styles.fab;

  return (
    <>
      <button
        type="button"
        className={fabClass}
        title={
          pulse ? "An answer landed." : lit ? "Lines still on the pad." : "Scratchpaper"
        }
        aria-label={open ? "Close the scratchpaper" : "Open the scratchpaper"}
        onClick={() => {
          // A pulsing button opens straight onto the answer.
          if (!open && pulse) {
            setReg("ask");
            readAsks();
          }
          setOpen((v) => !v);
        }}
      >
        ✎
      </button>
      {open && (
        <div className={styles.card} role="dialog" aria-label="Scratchpaper">
          <div className={styles.head}>
            <button
              type="button"
              className={reg === "paper" ? styles.kickOn : styles.kick}
              onClick={() => setReg("paper")}
            >
              SCRATCHPAPER
            </button>
            <button
              type="button"
              className={reg === "ask" ? styles.kickOn : styles.kick}
              onClick={() => {
                setReg("ask");
                readAsks();
              }}
            >
              ASK THE APP{pulse ? " ●" : ""}
            </button>
            <button type="button" className={styles.x} onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
          {reg === "paper" ? (
            <>
              <div className={styles.in}>
                <input
                  ref={inputRef}
                  placeholder="Write it. Enter keeps it."
                  maxLength={500}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void keep();
                  }}
                />
              </div>
              {note && <div className={styles.note}>{note}</div>}
              <div className={styles.list}>
                {lines === null && <div className={styles.quiet}>Reading the pad…</div>}
                {lines?.length === 0 && !note && (
                  <div className={styles.quiet}>Blank paper. Write the first line.</div>
                )}
                {rows.map(({ l, divider }) => (
                  <div key={l.id}>
                    {divider && <div className={styles.day}>{divider}</div>}
                    <div className={styles.row}>
                      <span className={styles.tm}>{timeLabelFor(l.at)}</span>
                      {editId === l.id ? (
                        <input
                          ref={editRef}
                          className={styles.editIn}
                          defaultValue={l.body}
                          maxLength={500}
                          aria-label="Edit the line"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void settleEdit(l.id, "enter");
                            if (e.key === "Escape") {
                              e.stopPropagation();
                              void settleEdit(l.id, "escape");
                            }
                          }}
                          onBlur={() => void settleEdit(l.id, "blur")}
                        />
                      ) : (
                        <span className={styles.body}>{l.body}</span>
                      )}
                      {editId !== l.id && (
                        <button
                          type="button"
                          className={styles.edit}
                          title="Edit the line in place. Enter keeps it."
                          onClick={() => setEditId(l.id)}
                        >
                          ✎
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.del}
                        title="Cross it out. The history keeps it."
                        onClick={() => void crossOut(l.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {paperNext && (
                <button
                  type="button"
                  className={styles.struckKick}
                  disabled={paging}
                  onClick={() => void readEarlier("paper")}
                >
                  EARLIER ▾
                </button>
              )}
              <button type="button" className={styles.struckKick} onClick={toggleStruck}>
                STRUCK {struckOpen ? "▾" : "▸"}
              </button>
              {struckOpen && (
                <div className={styles.struckList}>
                  {struck === null && (
                    <div className={styles.quiet}>Reading the history…</div>
                  )}
                  {struck?.length === 0 && (
                    <div className={styles.quiet}>Nothing struck yet.</div>
                  )}
                  {(struck ?? []).map((l) => (
                    <div key={l.id} className={styles.row}>
                      <span className={styles.tm}>{timeLabelFor(l.at)}</span>
                      <span className={`${styles.body} ${styles.struckBody}`}>
                        {l.body}
                      </span>
                      <button
                        type="button"
                        className={styles.del}
                        title="Bring it back onto the paper."
                        onClick={() => void bringBack(l.id)}
                      >
                        ↺
                      </button>
                    </div>
                  ))}
                  {struckNext && (
                    <button
                      type="button"
                      className={styles.struckKick}
                      disabled={paging}
                      onClick={() => void readEarlier("struck")}
                    >
                      EARLIER ▾
                    </button>
                  )}
                </div>
              )}
              <div className={styles.hint}>
                Stays here and only here. Nothing files anywhere.
              </div>
            </>
          ) : (
            <>
              <div className={styles.in}>
                <input
                  ref={askRef}
                  placeholder="Ask the app. Enter sends it."
                  maxLength={300}
                  disabled={!!pending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") ask();
                  }}
                />
              </div>
              {pending && (
                <div className={styles.asking}>
                  Asking. Leave the page — the button pulses when it lands.
                </div>
              )}
              {askNote && <div className={styles.note}>{askNote}</div>}
              <div className={styles.list}>
                {asks.length === 0 && !pending && !askNote && (
                  <div className={styles.quiet}>
                    Ask anything the record might know. The whole app answers.
                  </div>
                )}
                {asks.map((a) => (
                  <div key={a.id} className={styles.askRow}>
                    <div className={styles.tm}>{timeLabelFor(a.at)}</div>
                    <div className={styles.askQ}>{a.question}</div>
                    {a.answer ? (
                      <div className={styles.askA}>{cleanAskText(a.answer)}</div>
                    ) : a.world ? (
                      <div className={styles.askA}>
                        {cleanAskText(a.world)}
                        <span className={styles.worldTag}>
                          {" "}
                          — general knowledge, not the record
                        </span>
                      </div>
                    ) : (
                      <div className={styles.quiet}>
                        {a.note || "The record held nothing on this."}
                      </div>
                    )}
                    {a.links.length > 0 && (
                      <div className={styles.askLinks}>
                        {a.links.map((k) => (
                          <Link key={k.href} href={k.href} onClick={() => setOpen(false)}>
                            {k.label}
                          </Link>
                        ))}
                      </div>
                    )}
                    {/* A playbook question the answer cites opens here, in
                        place: the bank's question and its gloss, no page and
                        no link (C13). An entry from before the field rides
                        without it. */}
                    {(a.folds ?? []).map((f) => (
                      <details key={f.id} className={styles.askFold}>
                        <summary>The playbook question it cites</summary>
                        <div className={styles.askFoldQ}>{f.question}</div>
                        {f.why && <div className={styles.askFoldWhy}>{f.why}</div>}
                      </details>
                    ))}
                  </div>
                ))}
              </div>
              <div className={styles.hint}>
                Every answer keeps. <Link href="/asks">The bank →</Link>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
