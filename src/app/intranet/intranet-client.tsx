"use client";

// The Intranet's work surface — THE LEDGER, refounded (Part V).
//
// The room is a running record over a seeded index. Everything the brain does
// becomes one dated stream: a question answered, a paste read and briefed.
//
//   · the index rail sits on the LEFT: the bank's subject parents (V.3), no
//     counts on parents (V.4), counts on subtopics only. Sections expand
//     DOWNWARD, never covering each other.
//   · anything clicked shows what's filed inside it — the reading pane. Multi-
//     select with colored dots; a search box that reads only within what's
//     selected.
//   · one flow (no standing backlog message): the room catches itself up when
//     it opens, "Send it" reads the paste AND drains whatever else waits, and
//     ⟳ by the title re-runs the whole sweep.
//   · a paste renders as the brief Claude wrote about it (V.8). Failure is one
//     word with the whole truth behind a fold (V.6).

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDismiss } from "@/components/use-dismiss";
import {
  intranetAsk,
  intranetCapture,
  intranetContents,
  intranetLedgerDay,
  intranetPassage,
} from "./actions";
import { readCapture, runBrain } from "./runners";
import type { AskReply, PassageReply, ShelfReply, ShelfScope } from "./actions";
import type { ArchiveMonth, CountryRow, LedgerEntry } from "@/lib/intranet/ledger";
import {
  archiveDayMeta,
  chicagoDay,
  dayLabel,
  flagSrc,
  flagSrc2x,
  sentFrom,
} from "@/lib/intranet/ledger";
import styles from "../command-center.module.css";

export type RailTopic = {
  id: string;
  label: string;
  summary: string;
  claims: number;
  fresh: boolean;
  children: RailTopic[];
};

/** A live entry made this session — richer than a stored one (it can carry a
 *  world answer, account links, warnings), rendered with the full treatment. */
type LiveEntry = { kind: "live"; id: string; at: string; reply: AskReply };
type FeedEntry = LedgerEntry | LiveEntry;

/** One selected drawer — a rail topic, a country, or a country's subject row. */
type Sel = { key: string; label: string; scope: ShelfScope };

/** Selection dots cycle through the brand's own accents — never a new hue. */
const DOTS = ["#2563EB", "#E6701E", "#22C55E", "#F59E0B", "#0A1C40"];

export function IntranetClient({
  rail,
  initialQ,
  empty,
  staleness,
  queue,
  ledger,
  archive,
  countries,
  nowIso,
  canWrite,
  canAnswer,
}: {
  rail: RailTopic[];
  initialQ: string;
  empty: boolean;
  staleness: string;
  queue: { pending: number; unindexed: number };
  ledger: LedgerEntry[];
  archive: ArchiveMonth[];
  countries: CountryRow[];
  nowIso: string;
  canWrite: boolean;
  canAnswer: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [live, setLive] = useState<FeedEntry[]>([]);
  const [foldOpen, setFoldOpen] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<Sel[]>([]);
  const [within, setWithin] = useState("");
  const [pane, setPane] = useState<ShelfReply | null>(null);
  const [passage, setPassage] = useState<PassageReply | null>(null);
  const [paste, setPaste] = useState("");
  const [receipt, setReceipt] = useState("");
  const [busy, startAsk] = useTransition();
  const [capBusy, startCap] = useTransition();
  const [runBusy, startRun] = useTransition();
  const [dayBusy, startDay] = useTransition();
  const [paneBusy, startPane] = useTransition();
  const [runLines, setRunLines] = useState<string[]>([]);
  const [runDetail, setRunDetail] = useState<string[]>([]);
  const [pendingNow, setPendingNow] = useState(queue.pending);
  const [copied, setCopied] = useState("");
  const [railTab, setRailTab] = useState<"index" | "country" | "archive">("index");
  const [openCountry, setOpenCountry] = useState<string>("");
  const [archiveDay, setArchiveDay] = useState<{
    key: string;
    entries: LedgerEntry[];
  } | null>(null);
  // Collapse state — keyed by entry id. Default: today's entries open, older
  // days folded to their stamps. Nothing disappears (C6).
  const [minned, setMinned] = useState<Record<string, boolean>>({});
  const stopRef = useRef(false);
  const wokeRef = useRef(false);

  const drawerRef = useDismiss<HTMLDivElement>(passage !== null, () => setPassage(null));
  const today = chicagoDay(nowIso);
  const isMin = (e: FeedEntry) => minned[e.id] ?? chicagoDay(e.at) !== today;

  // ── selection (the reading pane's scope) ──────────────────────────────────
  const selIdx = (key: string) => sel.findIndex((s) => s.key === key);
  const toggleSel = (item: Sel) => {
    const next = sel.some((s) => s.key === item.key)
      ? sel.filter((s) => s.key !== item.key)
      : [...sel, item];
    setSel(next);
    if (next.length === 0) {
      setPane(null);
      setWithin("");
    }
  };

  // What's filed inside whatever is selected — refreshed when the selection or
  // the search-within text changes. The search reads ONLY the selected drawers.
  useEffect(() => {
    if (sel.length === 0) return;
    const t = setTimeout(() => {
      startPane(async () => {
        const r = await intranetContents(
          sel.map((s) => s.scope),
          within,
        );
        setPane(r);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [sel, within]);

  const ask = (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    startAsk(async () => {
      const r = await intranetAsk(
        sel.length
          ? `${question} (start with: ${sel.map((s) => s.label).join(", ")})`
          : question,
      );
      setLive((l) => [
        {
          kind: "live",
          id: `live-${Date.now()}`,
          at: new Date().toISOString(),
          reply: r,
        },
        ...l,
      ]);
      setQ("");
    });
  };

  // One flow (IV.3, refounded): the paste is read on the spot, and if anything
  // ELSE is waiting the room keeps going on its own — "Send it" knows.
  const file = () => {
    if (!paste.trim() || capBusy) return;
    startCap(async () => {
      const r = await intranetCapture(paste);
      if (!r.ok) {
        setReceipt(r.reason ?? "That didn't land.");
        return;
      }
      setReceipt("");
      setPaste("");
      const id = `fed-${Date.now()}`;
      const at = new Date().toISOString();
      setLive((l) => [
        {
          kind: "fed",
          id,
          at,
          space: r.space,
          title: "",
          origin: r.origin,
          lines: [r.receipt, "Reading what you sent…"],
          briefs: [],
          detail: [],
        },
        ...l,
      ]);
      const g = await readCapture(r.captureId);
      // the progress line is transient — replaced by the result (IV.8)
      setLive((l) =>
        l.map((e) =>
          e.id === id && e.kind === "fed"
            ? {
                ...e,
                lines: [
                  r.receipt,
                  ...(g.ok ? g.lines : [g.reason ?? "The reading failed."]),
                ],
                briefs: g.briefs ?? [],
                detail: g.detail ?? [],
              }
            : e,
        ),
      );
      if (typeof g.pending === "number") setPendingNow(g.pending);
      router.refresh();
      // whatever else waits gets read in the same breath — no second button
      if ((g.pending ?? 0) > 0) catchUp(false);
    });
  };

  // The catch-up loop. Passes run back-to-back until the backlog is gone or
  // the operator stops it; every pass reports, and the rail refreshes live.
  const catchUp = (sweep: boolean) => {
    if (runBusy) return;
    stopRef.current = false;
    startRun(async () => {
      const all: string[] = [];
      const allDetail: string[] = [];
      const seenLine = new Set<string>();
      for (let pass = 0; pass < 60 && !stopRef.current; pass += 1) {
        // A sweep pass looks around the app and the Playbook first; catch-up
        // passes give their whole clock to reading.
        const r = await runBrain(pass === 0 && sweep ? undefined : { sweep: false });
        for (const l of r.lines) {
          if (/^(Read |The index grew)/.test(l) || !seenLine.has(l)) {
            all.push(l);
            seenLine.add(l);
          }
        }
        if (r.detail) allDetail.push(...r.detail);
        setRunLines([...all]);
        setRunDetail([...allDetail]);
        if (typeof r.pending === "number") setPendingNow(r.pending);
        router.refresh();
        if (!r.ok) {
          if (r.reason) setRunLines([...all, r.reason]);
          break;
        }
        if (!r.pending) break;
      }
    });
  };

  // The room catches itself up the moment it opens (V — the standing backlog
  // message must never exist). Once per visit, and only when there is a brain
  // to read with.
  useEffect(() => {
    if (wokeRef.current) return;
    wokeRef.current = true;
    if (canWrite && canAnswer && queue.pending > 0) catchUp(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Promotion travels by hand: the line is composed with its provenance and
  // handed to the clipboard. The room writes nothing into the Playbook.
  const promote = (line: string, id: string) => {
    void navigator.clipboard?.writeText(line).then(
      () => setCopied(id),
      () => setCopied(""),
    );
  };

  const copyDetail = (text: string, id: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => setCopied(id),
      () => setCopied(""),
    );
  };

  const drill = (claimId: string) => {
    startAsk(async () => {
      const p = await intranetPassage(claimId);
      if (p.ok) setPassage(p);
    });
  };

  const openArchiveDay = (key: string) => {
    if (dayBusy) return;
    startDay(async () => {
      const entries = await intranetLedgerDay(key);
      setArchiveDay({ key, entries });
    });
  };

  // ── the rail ──────────────────────────────────────────────────────────────
  // Parents are subject-matter heads: no counts (V.4). Counts sit on the
  // subtopics. A selected row carries its colored dot.
  const dotFor = (key: string) => {
    const i = selIdx(key);
    return i < 0 ? null : DOTS[i % DOTS.length];
  };

  const renderTopic = (t: RailTopic, depth: number) => {
    const isOpen = open[t.id] === true;
    const key = `t:${t.id}`;
    const dot = dotFor(key);
    return (
      <div key={t.id}>
        <button
          type="button"
          className={`${styles.itTopic} ${dot ? styles.itTopicOn : ""}`}
          style={{ paddingLeft: `${11 + depth * 15}px` }}
          aria-expanded={isOpen}
          aria-pressed={dot !== null}
          title={t.summary}
          onClick={() => {
            const selected = dot !== null;
            toggleSel({
              key,
              label: t.label,
              scope: { type: "topic", id: t.id, label: t.label },
            });
            if (t.children.length) setOpen((o) => ({ ...o, [t.id]: !selected }));
          }}
        >
          {dot ? (
            <span className={styles.itDot} style={{ background: dot }} />
          ) : (
            <span className={styles.itCar}>{t.children.length ? "▸" : "·"}</span>
          )}
          <span className={styles.itLabel}>{t.label}</span>
          {depth > 0 && (
            <span className={`${styles.itN} ${t.fresh ? styles.itFresh : ""}`}>
              {t.claims}
            </span>
          )}
        </button>
        {isOpen && t.children.map((c) => renderTopic(c, depth + 1))}
      </div>
    );
  };

  const railBody =
    railTab === "index" ? (
      <>
        {rail.length === 0 && (
          <p className={styles.itRailEmpty}>
            The index builds itself as you feed the brain.
          </p>
        )}
        {rail.map((t) => renderTopic(t, 0))}
      </>
    ) : railTab === "country" ? (
      <>
        {countries.length === 0 && (
          <p className={styles.itRailEmpty}>
            Countries appear here as the record starts naming them.
          </p>
        )}
        {countries.map((c) => {
          const cKey = `c:${c.code}`;
          const cDot = dotFor(cKey);
          return (
            <div key={c.code}>
              <button
                type="button"
                className={`${styles.itTopic} ${cDot ? styles.itTopicOn : ""}`}
                aria-expanded={openCountry === c.code}
                aria-pressed={cDot !== null}
                onClick={() => {
                  const selected = cDot !== null;
                  toggleSel({
                    key: cKey,
                    label: c.name,
                    scope: { type: "country", code: c.code, label: c.name },
                  });
                  setOpenCountry(selected ? "" : c.code);
                }}
              >
                {/* real flags, never emoji — Windows renders none (IV.9) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.itFlag}
                  src={flagSrc(c.code)}
                  srcSet={`${flagSrc2x(c.code)} 2x`}
                  width={20}
                  height={15}
                  alt=""
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.visibility = "hidden";
                  }}
                />
                {cDot && <span className={styles.itDot} style={{ background: cDot }} />}
                <span className={styles.itLabel}>{c.name}</span>
                <span className={styles.itN}>{c.total}</span>
              </button>
              {openCountry === c.code &&
                c.lenses.map((l) => {
                  const lKey = `cs:${c.code}:${l.topicId}`;
                  const lDot = dotFor(lKey);
                  return (
                    <button
                      key={l.topicId}
                      type="button"
                      className={`${styles.itTopic} ${lDot ? styles.itTopicOn : ""}`}
                      style={{ paddingLeft: "39px" }}
                      aria-pressed={lDot !== null}
                      onClick={() =>
                        toggleSel({
                          key: lKey,
                          label: `${c.name} — ${l.label}`,
                          scope: {
                            type: "country",
                            code: c.code,
                            label: c.name,
                            topicId: l.topicId,
                          },
                        })
                      }
                    >
                      {lDot ? (
                        <span className={styles.itDot} style={{ background: lDot }} />
                      ) : (
                        <span className={styles.itCar}>·</span>
                      )}
                      <span className={styles.itLabel}>{l.label}</span>
                      <span className={styles.itN}>{l.n}</span>
                    </button>
                  );
                })}
            </div>
          );
        })}
        {countries.length > 0 && (
          <p className={styles.itLensNote}>
            A country is a lens, not a copy — the same record, read through one place. One
            brain, nothing duplicated.
          </p>
        )}
      </>
    ) : (
      <>
        {archive.length === 0 && (
          <p className={styles.itRailEmpty}>The archive fills as days pass.</p>
        )}
        {archive.map((m) => (
          <div key={m.month}>
            <p className={styles.itMonth}>{m.month}</p>
            {m.days.map((d) => (
              <button
                key={d.key}
                type="button"
                className={`${styles.itDay} ${archiveDay?.key === d.key ? styles.itTopicOn : ""}`}
                onClick={() => openArchiveDay(d.key)}
              >
                <span>{d.label}</span>
                <span className={styles.itDayMeta}>{archiveDayMeta(d)}</span>
              </button>
            ))}
          </div>
        ))}
        <p className={styles.itHushLinks}>
          <Link href="/intranet/pastes">every paste, verbatim</Link>
          {" · "}
          <Link href="/intranet/health">how the room is doing</Link>
        </p>
      </>
    );

  // ── the record ────────────────────────────────────────────────────────────
  const feed: FeedEntry[] = archiveDay
    ? archiveDay.entries
    : [...live, ...ledger.filter((e) => !live.some((l) => l.id === e.id))];

  const days: { key: string; label: string; entries: FeedEntry[] }[] = [];
  for (const e of [...feed].sort((a, b) => b.at.localeCompare(a.at))) {
    const key = chicagoDay(e.at);
    const last = days[days.length - 1];
    if (last && last.key === key) last.entries.push(e);
    else days.push({ key, label: dayLabel(key, nowIso), entries: [e] });
  }

  const foldDay = (key: string) => {
    const target = days.find((d) => d.key === key);
    if (!target) return;
    const anyOpenNow = target.entries.some((e) => !isMin(e));
    setMinned((m) => {
      const next = { ...m };
      for (const e of target.entries) next[e.id] = anyOpenNow;
      return next;
    });
  };

  const stampOf = (
    e: FeedEntry,
  ): { cls: string; edge: string; text: string; peek: string } => {
    const when = new Date(Date.parse(e.at)).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
    });
    if (e.kind === "fed")
      return {
        cls: styles.itKFed,
        edge: styles.itLFed,
        // provenance on the stamp (V): where the paste came from, always
        text: `sent · ${when} · ${sentFrom(e.space, e.origin)}`,
        peek: e.briefs[0] ?? e.lines[0] ?? e.title ?? e.space,
      };
    if (e.kind === "live") {
      const world = e.reply.ok && e.reply.world && e.reply.citations.length === 0;
      return {
        cls: world ? styles.itKWorld : styles.itKAsk,
        edge: world ? styles.itLWorld : styles.itLAsked,
        text: `${world ? "from the world" : "asked"} · ${when}`,
        peek: e.reply.question,
      };
    }
    return {
      cls: styles.itKAsk,
      edge: styles.itLAsked,
      text: `asked · ${when}`,
      peek: e.question,
    };
  };

  /** V.6 — one word in the open; the whole truth, copyable, behind the fold. */
  const renderDetailFold = (id: string, detail: string[]) => {
    if (detail.length === 0) return null;
    const foldKey = `detail-${id}`;
    const text = detail.join("\n");
    return (
      <>
        <button
          type="button"
          className={styles.itFoldBtn}
          onClick={() => setFoldOpen((f) => ({ ...f, [foldKey]: !f[foldKey] }))}
          aria-expanded={foldOpen[foldKey] === true}
        >
          {foldOpen[foldKey] ? "hide the detail" : "detail"}
        </button>
        {foldOpen[foldKey] && (
          <div className={styles.itFold}>
            <pre className={styles.itDetailPre}>{text}</pre>
            <button
              type="button"
              className={styles.itQuietBtn}
              onClick={() => copyDetail(text, foldKey)}
            >
              {copied === foldKey ? "copied" : "copy it, to share with the assistant"}
            </button>
          </div>
        )}
      </>
    );
  };

  const renderStored = (e: LedgerEntry) => {
    if (e.kind === "fed")
      return (
        <>
          {/* V.8 — the brief IS the product: what was received, what was done */}
          {e.briefs.map((b, i) => (
            <p key={`b${i}`} className={styles.itProse}>
              {b}
            </p>
          ))}
          <ul className={styles.itRunLines}>
            {(e.lines.length ? e.lines : ["Sent to the brain."]).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          {renderDetailFold(e.id, e.detail)}
        </>
      );
    return (
      <>
        <p className={styles.itLQ}>{e.question}</p>
        {e.answer && <p className={styles.itProse}>{e.answer}</p>}
        {e.citations.length > 0 && (
          <div className={styles.itCites}>
            {e.citations.map((c) => (
              <button
                key={c.n}
                type="button"
                className={styles.itCite}
                onClick={() => drill(c.claimId)}
              >
                <span className={styles.itCiteN}>[{c.n}]</span>
                <span className={styles.itCiteBody}>
                  {c.text}
                  <span className={styles.itCiteMeta}>
                    {c.speaker || "unknown"} · {c.docTitle || c.origin} ·{" "}
                    {(c.saidAt ?? "").slice(0, 10)} · {c.kind}
                    {c.originGone ? " · removed from the app since" : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        {e.reasoning && (
          <>
            <button
              type="button"
              className={styles.itFoldBtn}
              onClick={() => setFoldOpen((f) => ({ ...f, [e.id]: !f[e.id] }))}
              aria-expanded={foldOpen[e.id] === true}
            >
              {foldOpen[e.id] ? "Hide the reasoning" : "Show the reasoning"}
            </button>
            {foldOpen[e.id] && (
              <div className={styles.itFold}>
                <p>{e.reasoning}</p>
                <p className={styles.itCoverage}>Answered by {e.model || "—"}.</p>
              </div>
            )}
          </>
        )}
      </>
    );
  };

  const renderLive = (e: LiveEntry) => {
    const reply = e.reply;
    if (!reply.ok) return <p className={styles.itWarn}>{reply.reason}</p>;
    return (
      <>
        <p className={styles.itLQ}>{reply.question}</p>
        {reply.degraded && <p className={styles.itBreach}>{reply.degraded}</p>}
        {reply.thin && !reply.world && <p className={styles.itThin}>{reply.thin}</p>}
        {reply.answer.confidence === "mixed" && !reply.degraded && (
          <p className={styles.itMixed}>The record disagrees with itself here.</p>
        )}
        {reply.answer.answer && <p className={styles.itProse}>{reply.answer.answer}</p>}

        {reply.world && (
          <div className={styles.itWorld}>
            <p className={styles.itWorldTag}>
              From the world, not the record — general knowledge, nothing internal.
            </p>
            <p className={styles.itProse}>{reply.world}</p>
          </div>
        )}

        {reply.answer.gaps.length > 0 && (
          <p className={styles.itGaps}>
            What the record doesn&apos;t cover: {reply.answer.gaps.join(" · ")}
          </p>
        )}

        {reply.citations.length > 0 && (
          <div className={styles.itCites}>
            {reply.citations.map((c) => (
              <div key={c.n} className={styles.itCiteWrap}>
                <button
                  type="button"
                  className={styles.itCite}
                  onClick={() => drill(c.claimId)}
                >
                  <span className={styles.itCiteN}>[{c.n}]</span>
                  <span className={styles.itCiteBody}>
                    {c.text}
                    <span className={styles.itCiteMeta}>
                      {c.speaker || "unknown"} · {c.docTitle || c.origin} ·{" "}
                      {c.saidAt.slice(0, 10)} · {c.kind}
                      {c.originGone ? " · removed from the app since" : ""}
                    </span>
                  </span>
                </button>
                {canWrite && (
                  <button
                    type="button"
                    className={styles.itPromote}
                    title={`Copy this, with where it came from, ready to keep in the Playbook's ${c.promoteNs}`}
                    onClick={() => promote(c.promoteLine, c.claimId)}
                  >
                    {copied === c.claimId
                      ? "copied — paste it in the Playbook"
                      : `keep in the Playbook (${c.promoteNs})`}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {reply.accounts.length > 0 && (
          <p className={styles.itGaps}>
            On the board:{" "}
            {reply.accounts.map((a, i) => (
              <span key={a.id}>
                {i > 0 ? " · " : ""}
                <Link href={`/accounts?peo=${a.id}`}>{a.name}</Link>
              </span>
            ))}
          </p>
        )}

        {(reply.answer.reasoning || reply.citations.length > 0) && (
          <>
            <button
              type="button"
              className={styles.itFoldBtn}
              onClick={() => setFoldOpen((f) => ({ ...f, [e.id]: !f[e.id] }))}
              aria-expanded={foldOpen[e.id] === true}
            >
              {foldOpen[e.id] ? "Hide the reasoning" : "Show the reasoning"}
            </button>
            {foldOpen[e.id] && (
              <div className={styles.itFold}>
                {reply.answer.reasoning && <p>{reply.answer.reasoning}</p>}
                {reply.answer.setAside.length > 0 && (
                  <>
                    <p className={styles.itFoldHead}>Set aside</p>
                    <ul>
                      {reply.answer.setAside.map((s) => (
                        <li key={s.n}>
                          [{s.n}] {s.why}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {reply.coverage && (
                  <p className={styles.itCoverage}>
                    Drawn from {reply.coverage.claims} line
                    {reply.coverage.claims === 1 ? "" : "s"} across {reply.coverage.docs}{" "}
                    source{reply.coverage.docs === 1 ? "" : "s"}
                    {reply.coverage.from
                      ? `, ${reply.coverage.from.slice(0, 10)} → ${reply.coverage.to.slice(0, 10)}`
                      : ""}
                    .
                  </p>
                )}
                <p className={styles.itCoverage}>
                  Answered by {reply.model || "—"}
                  {reply.escalated ? ` — escalated on ${reply.escalated}` : ""}.
                </p>
              </div>
            )}
          </>
        )}
      </>
    );
  };

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.h1}>
          Intranet
          {canWrite && (
            <button
              type="button"
              className={`${styles.itRefresh} ${runBusy ? styles.itRefreshOn : ""}`}
              title="Look around the whole app and read anything new"
              aria-label="Refresh the room"
              disabled={runBusy}
              onClick={() => catchUp(true)}
            >
              ⟳
            </button>
          )}
        </h1>
      </div>
      <div className={`${styles.itWrap} ${canWrite ? styles.itDockPad : ""}`}>
        <aside className={styles.itRail} aria-label="Index">
          <div className={styles.itRailHead}>
            <b>
              {railTab === "index"
                ? "Index"
                : railTab === "country"
                  ? "By country"
                  : "The archive"}
            </b>
          </div>
          <div className={styles.itRailList}>{railBody}</div>
          <div className={styles.itRailTabs}>
            <button
              type="button"
              className={`${styles.itRailTab} ${railTab === "country" ? styles.itRailTabOn : ""}`}
              onClick={() => setRailTab(railTab === "country" ? "index" : "country")}
            >
              <span>By country</span>
              <span>{countries.length || ""}</span>
            </button>
            <button
              type="button"
              className={`${styles.itRailTab} ${railTab === "archive" ? styles.itRailTabOn : ""}`}
              onClick={() => {
                setRailTab(railTab === "archive" ? "index" : "archive");
                if (railTab === "archive") setArchiveDay(null);
              }}
            >
              <span>The archive</span>
            </button>
          </div>
        </aside>

        <div className={styles.itMain}>
          <div className={styles.itAskRow}>
            <input
              className={styles.itAsk}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask(q);
              }}
              placeholder="What do we tell people about implementation timelines — and has it held?"
              aria-label="Ask the brain"
            />
            <button
              type="button"
              className={styles.itGo}
              disabled={busy || !q.trim()}
              onClick={() => ask(q)}
            >
              {busy ? "Reading…" : "Ask"}
            </button>
          </div>

          {/* the selection, as chips with their dots — this IS the scope line */}
          {sel.length > 0 && (
            <div className={styles.itChips}>
              <span className={styles.itChipsWord}>Reading</span>
              {sel.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  className={styles.itChip}
                  title="remove from the selection"
                  onClick={() => toggleSel(s)}
                >
                  <span
                    className={styles.itDot}
                    style={{ background: DOTS[i % DOTS.length] }}
                  />
                  {s.label}
                  <span className={styles.itChipX}>✕</span>
                </button>
              ))}
              <button
                type="button"
                className={styles.itClear}
                onClick={() => {
                  setSel([]);
                  setPane(null);
                  setWithin("");
                }}
              >
                clear all
              </button>
            </div>
          )}

          {/* the reading pane — what's filed inside whatever is selected */}
          {sel.length > 0 && (
            <section className={styles.itPane}>
              <div className={styles.itPaneHead}>
                <input
                  className={styles.itWithin}
                  value={within}
                  onChange={(e) => setWithin(e.target.value)}
                  placeholder={`Search within ${sel.map((s) => s.label).join(", ")}`}
                  aria-label="Search within the selection"
                />
                <span className={styles.itPaneCount}>
                  {paneBusy
                    ? "opening…"
                    : pane
                      ? `${pane.total} thing${pane.total === 1 ? "" : "s"} filed here`
                      : ""}
                </span>
              </div>
              {!paneBusy && pane && pane.items.length === 0 && (
                <p className={styles.itPaneEmpty}>
                  {within.trim()
                    ? "Nothing in the selection matches that."
                    : "Nothing filed here yet — it fills as the brain reads."}
                </p>
              )}
              <div className={styles.itPaneList}>
                {(pane?.items ?? []).map((it) => (
                  <button
                    key={it.claimId}
                    type="button"
                    className={styles.itPaneItem}
                    onClick={() => drill(it.claimId)}
                  >
                    <span className={styles.itPaneText}>{it.text}</span>
                    <span className={styles.itPaneMeta}>
                      {it.speaker || "unknown"} · {it.space || it.docTitle || it.origin} ·{" "}
                      {it.day}
                      {it.countries.length ? ` · ${it.countries.join(", ")}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {archiveDay && (
            <p className={styles.itScope}>
              Showing <b>{dayLabel(archiveDay.key, nowIso)}</b> from the archive.{" "}
              <button
                type="button"
                className={styles.itClear}
                onClick={() => setArchiveDay(null)}
              >
                back to today
              </button>
            </p>
          )}

          {!canAnswer && (
            <p className={styles.itWarn}>
              No API key configured — the brain can hold what you give it and show its
              index, but it can&apos;t compose an answer yet.
            </p>
          )}

          {/* the room working, quietly — never a standing backlog message */}
          {canWrite && (runBusy || runLines.length > 0) && (
            <div className={styles.itRun}>
              <div className={styles.itRunRow}>
                <span className={styles.itQueue}>
                  {runBusy
                    ? pendingNow > 0
                      ? `Catching up — ${pendingNow} to go…`
                      : "Catching up…"
                    : "Caught up."}
                </span>
                {runBusy ? (
                  <button
                    type="button"
                    className={styles.itQuietBtn}
                    onClick={() => {
                      stopRef.current = true;
                    }}
                  >
                    stop after this pass
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.itQuietBtn}
                    onClick={() => {
                      setRunLines([]);
                      setRunDetail([]);
                    }}
                  >
                    dismiss
                  </button>
                )}
              </div>
              {runLines.length > 0 && (
                <ul className={styles.itRunLines}>
                  {runLines.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              )}
              {renderDetailFold("run", runDetail)}
            </div>
          )}

          {feed.length === 0 && (
            <div className={styles.itEmpty}>
              {empty ? (
                <p>The brain is empty. Paste something worth keeping.</p>
              ) : (
                <p className={styles.itStale}>{staleness}</p>
              )}
            </div>
          )}

          {days.map((d) => (
            <div key={d.key}>
              <div className={styles.itLDivider}>
                {d.label}
                <button type="button" onClick={() => foldDay(d.key)}>
                  fold the day
                </button>
              </div>
              {d.entries.map((e) => {
                const s = stampOf(e);
                const min = isMin(e);
                return (
                  <section
                    key={e.id}
                    className={`${styles.itLEntry} ${s.edge} ${min ? styles.itLMin : ""}`}
                  >
                    <div className={styles.itLStamp}>
                      <span className={s.cls}>{s.text}</span>
                      {min && <span className={styles.itLPeek}>{s.peek}</span>}
                      <button
                        type="button"
                        className={styles.itLFoldBtn}
                        title={min ? "open this entry" : "fold this entry"}
                        onClick={() => setMinned((m) => ({ ...m, [e.id]: !min }))}
                      >
                        {min ? "＋" : "—"}
                      </button>
                    </div>
                    {!min && (
                      <div className={styles.itLBody}>
                        {e.kind === "live" ? renderLive(e) : renderStored(e)}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ))}
        </div>

        {passage && (
          <div className={styles.itDrawer} ref={drawerRef}>
            <div className={styles.itDrawerHead}>
              <span>
                <b>{passage.title || passage.space}</b>
                <span className={styles.itDrawerMeta}>
                  {passage.space} · {passage.origin}
                </span>
              </span>
              <button
                type="button"
                className={styles.itQuiet}
                onClick={() => setPassage(null)}
              >
                ✕ close
              </button>
            </div>
            {passage.originGone && (
              <p className={styles.itGone}>
                From a note that has since been removed from the app. The brain keeps it.
              </p>
            )}
            <div className={styles.itPassage}>
              <span className={styles.itDim}>{passage.before}</span>
              <mark className={styles.itMark}>{passage.span}</mark>
              <span className={styles.itDim}>{passage.after}</span>
            </div>
            {passage.accountId && (
              <p className={styles.itDrawerFoot}>
                <Link href={`/accounts?peo=${passage.accountId}`}>
                  Open {passage.accountName || "the account"} →
                </Link>
              </p>
            )}
          </div>
        )}

        {canWrite && (
          <div className={styles.itDock}>
            <div className={styles.itDockIn}>
              <textarea
                className={styles.itDockPaste}
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="Paste a Teams thread, a meeting transcript, a demo — anything worth keeping. It gets read the moment you send it."
                aria-label="Paste into the brain"
              />
              <button
                type="button"
                className={styles.itKeep}
                disabled={capBusy || !paste.trim()}
                onClick={file}
              >
                {capBusy ? "Sending…" : "Send it"}
              </button>
            </div>
            {receipt && <p className={styles.itDockErr}>{receipt}</p>}
          </div>
        )}
      </div>
    </>
  );
}
