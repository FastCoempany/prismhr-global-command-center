"use client";

// The Pipeline drawer — opened from the HomeRoom's right-margin rail, beside
// Roundups and the eye (founder-decreed 2026-09-08, the Ledger face). Every
// active account, one fixed label/value block each, in an order identical for
// all of them so one can be read aloud with nothing prepared.
//
// It joins the rail the room already keeps. The first cut built its OWN fixed
// rail in a different stylesheet, and the two stacks collided on the same
// margin — the Pipeline tab landing on top of Roundups. The room owns that
// edge; anything that wants a seat there asks the room for one.
//
// Three things it does that no other surface does:
//   · every line is editable in place, and Copy hands back exactly what is on
//     screen — the report is a draft he sends, not a display he reads past;
//   · every line can be struck out, and struck lines leave the copy. Nothing
//     dies: a foot chip restores them, in the Scratchpaper's habit;
//   · the plain text is built from the record and his overlay, never from the
//     rendered DOM, so what he copies is a fact in one place.

import { useEffect, useMemo, useState } from "react";
import type { PipelineRecord } from "@/lib/pipeline/build";
import { closeText, lineKey, recordToText, reportToText } from "@/lib/pipeline/plain";
import { clipValue, joinEntries } from "@/lib/pipeline/density";
import { reportDocument, reportFileName } from "@/lib/pipeline/docx";
import { freshPipeline, savePipelineEdits } from "./pipeline-actions";
import styles from "./room.module.css";

const md = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso ?? "")
    ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`
    : "";

type Overlay = Record<string, string | null>;

async function toClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // fall through to the textarea path
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    ta.remove();
  }
}

/** One editable, strikable line. The key is stable across re-renders, so an
 *  edit never lands on a neighbour.
 *
 *  A line longer than the column holds arrives clipped, and the clip is a
 *  door — one press and the whole line is back, editable in full. He never
 *  types into a truncated line: opening comes first, always. */
function Line({
  k,
  text,
  overlay,
  set,
  className,
  unknown,
  tail,
  whole,
}: {
  k: string;
  text: string;
  overlay: Overlay;
  set: (k: string, v: string | null) => void;
  className?: string;
  /** Nothing on record. It still renders as a line he can type into — a field
   *  the app could not fill is exactly the one he most wants to fill himself
   *  (founder-caught 2026-09-08). It reads quiet until he does. */
  unknown?: boolean;
  /** The source chip, riding the end of the line rather than a column of its
   *  own — as a third grid column it took 64px the value needed. */
  tail?: React.ReactNode;
  /** The record's own title. A name is not a value competing for a column, and
   *  a record you cannot read the name of is not a record. It wraps; it never
   *  clips. No account in the book reaches the budget today, so this is the
   *  rule holding rather than a fault being fixed. */
  whole?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (overlay[k] === null) return null;
  const edited = k in overlay;
  const shown = overlay[k] ?? (unknown ? "Unknown" : text);
  const clipped = clipValue(shown);
  if (clipped.cut && !open && !whole)
    return (
      <span className={`${styles.pipeLine} ${className ?? ""}`}>
        <span className={styles.pipeEd}>{clipped.text}</span>
        <button
          type="button"
          className={styles.pipeDoor}
          title="Show the whole line"
          onClick={() => setOpen(true)}
        >
          more
        </button>
        {tail}
      </span>
    );
  return (
    <span className={`${styles.pipeLine} ${className ?? ""}`}>
      <span
        contentEditable
        suppressContentEditableWarning
        className={`${styles.pipeEd} ${unknown && !edited ? styles.pipeUnknown : ""}`}
        onBlur={(e) => {
          const v = (e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim();
          if (v !== (unknown ? "Unknown" : text)) set(k, v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLElement).blur();
          }
        }}
      >
        {shown}
      </span>
      <button
        type="button"
        className={styles.pipeCut}
        title="Delete this line"
        aria-label="Delete this line"
        onClick={() => set(k, null)}
      >
        ✕
      </button>
      {tail}
    </span>
  );
}

/** A field's entries under the column's budget. Collapsed, it shows its top
 *  entry and a door counting the rest; open, every entry, each editable.
 *  Four unknowns at two lines each is eight lines under one label whatever
 *  the type size does — the list is where the height actually went. */
function Entries({
  ks,
  texts,
  overlay,
  set,
  tail,
}: {
  ks: string[];
  texts: string[];
  overlay: Overlay;
  set: (k: string, v: string | null) => void;
  tail?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const live = texts
    .map((t, i) => [ks[i], t] as const)
    .filter(([key]) => overlay[key] !== null);
  if (!live.length) return null;
  if (live.length === 1 || open)
    return live.length === 1 ? (
      <Line k={live[0][0]} text={live[0][1]} overlay={overlay} set={set} tail={tail} />
    ) : (
      <ul className={styles.pipeList}>
        {live.map(([key, t], i) => (
          <li key={key}>
            <Line
              k={key}
              text={t}
              overlay={overlay}
              set={set}
              tail={i === live.length - 1 ? tail : undefined}
            />
          </li>
        ))}
      </ul>
    );
  return (
    <Line
      k={live[0][0]}
      text={live[0][1]}
      overlay={overlay}
      set={set}
      tail={
        <>
          <button
            type="button"
            className={styles.pipeDoor}
            title="Show every entry"
            onClick={() => setOpen(true)}
          >
            +{live.length - 1} more
          </button>
          {tail}
        </>
      }
    />
  );
}

/** One row: the label, and the value starting on the label's own line. The
 *  source no longer takes a column of its own — it rides the end of the value
 *  (see Line's `tail`), because those 64px were the value's. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.pipeField}>
      <div className={styles.pipeKey}>{label}</div>
      <div className={styles.pipeVal}>{children}</div>
    </div>
  );
}

const srcChip = (src?: string) =>
  src ? <span className={styles.pipeSrc}>{src}</span> : undefined;

function Record({
  r,
  overlay,
  set,
  restore,
  openDepth,
}: {
  r: PipelineRecord;
  overlay: Overlay;
  set: (k: string, v: string | null) => void;
  restore: (id: string) => void;
  /** Full-page reading: every fold stands open. The peek keeps them shut, so
   *  the arrival budget still holds where the budget is the point. */
  openDepth: boolean;
}) {
  const k = (f: string, i = 0) => lineKey(r.id, f, i);
  const [copied, setCopied] = useState(false);
  const struck = Object.entries(overlay).filter(
    ([key, v]) => v === null && key.startsWith(`${r.id}:`),
  ).length;
  /** A field's lines. When the record holds none — or he has struck them all
   *  — one editable Unknown stands in its place, because a field the app could
   *  not fill is the one he most wants to fill himself. */
  const list = (
    field: string,
    items: readonly string[],
    empty?: React.ReactNode,
    src?: string,
  ) => {
    const alive = items.filter((_, i) => overlay[k(field, i)] !== null);
    if (!alive.length)
      return (
        empty ?? (
          <Line
            k={k(field, 0)}
            text=""
            unknown
            overlay={overlay}
            set={set}
            tail={srcChip(src)}
          />
        )
      );
    return (
      <Entries
        ks={items.map((_, i) => k(field, i))}
        texts={[...items]}
        overlay={overlay}
        set={set}
        tail={srcChip(src)}
      />
    );
  };

  return (
    <div className={styles.pipeRec}>
      <div className={styles.pipeHead}>
        <div>
          <Line k={k("account")} text={r.account} overlay={overlay} set={set} whole />
          <div className={styles.pipeMeta}>
            <span>{r.csm ? `CSM · ${r.csm}` : "CSM · unassigned"}</span>
            <span>
              {r.lastTouch
                ? `${r.lastTouch.kind} ${md(r.lastTouch.date)}`
                : "No meeting on record"}
            </span>
            {r.quietDays === null ? null : <span>Quiet {r.quietDays} days</span>}
            {r.ourNext.some((n) => n.urgent) ? (
              <span className={styles.pipePillHot}>Promised, passed</span>
            ) : null}
          </div>
        </div>
        <div className={styles.pipeHeadBtns}>
          {struck > 0 && (
            <button
              type="button"
              className={styles.pipeRestore}
              onClick={() => restore(r.id)}
            >
              {struck} removed ↺
            </button>
          )}
          <button
            type="button"
            className={`${styles.pipeCopy} ${copied ? styles.pipeCopyDid : ""}`}
            onClick={async () => {
              await toClipboard(recordToText(r, overlay));
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? "Copied" : "Copy record"}
          </button>
        </div>
      </div>

      <Field label="Products">
        <Line
          k={k("products")}
          text={r.products.join(", ")}
          unknown={!r.products.length}
          overlay={overlay}
          set={set}
          tail={srcChip("deal intel")}
        />
      </Field>

      {/* One run, not one bullet per country. The entries are short and read
          as a sentence; as a list they cost four lines under one label. */}
      <Field label="Countries">
        <Line
          k={k("opp")}
          text={joinEntries(
            r.opportunities.map(
              (o) =>
                `${o.country} · ${o.product || "product Unknown"}${o.headcount ? ` · ${o.headcount}` : ""}`,
            ),
          )}
          unknown={!r.opportunities.length}
          overlay={overlay}
          set={set}
        />
      </Field>

      <Field label="Contacts">
        <Line
          k={k("contact")}
          text={r.contacts
            .map((c) => c.name + (c.title ? ` (${c.title})` : ""))
            .join(", ")}
          unknown={!r.contacts.length}
          overlay={overlay}
          set={set}
          tail={srcChip("record")}
        />
      </Field>

      <Field label="Model">
        <Line
          k={k("model")}
          text={r.model?.v ?? ""}
          unknown={!r.model}
          overlay={overlay}
          set={set}
          tail={srcChip(r.model?.src)}
        />
      </Field>
      <Field label="Competitor">
        <Line
          k={k("incumbent")}
          text={r.incumbent?.v ?? ""}
          unknown={!r.incumbent}
          overlay={overlay}
          set={set}
          tail={srcChip(r.incumbent?.src)}
        />
      </Field>
      <Field label="Stage">
        <Line
          k={k("stage")}
          text={r.stage?.v ?? ""}
          unknown={!r.stage}
          overlay={overlay}
          set={set}
          tail={srcChip(r.stage?.src)}
        />
      </Field>
      <Field label="Close date">
        <Line
          k={k("close")}
          text={closeText(r.closeDate)}
          unknown={!r.closeDate}
          overlay={overlay}
          set={set}
          tail={
            <>
              {r.closeDate?.passed && <span className={styles.pipePillWarn}>Passed</span>}
              {srcChip(
                r.closeDate
                  ? r.closeDate.derived
                    ? `derived · ${r.closeDate.src}`
                    : r.closeDate.src
                  : undefined,
              )}
            </>
          }
        />
      </Field>

      {/* A date, and nothing else. Who was in the room is on the contacts
          line — carrying five names here that the contacts line never
          mentioned read as two different accounts. */}
      <Field label="Last meeting">
        <Line
          k={k("meeting")}
          text={r.lastTouch ? md(r.lastTouch.date) : ""}
          unknown={!r.lastTouch}
          overlay={overlay}
          set={set}
        />
      </Field>

      {/* Their turn runs first when the same conversation set both sides —
          his sends are not today's work, and listing them as though they are
          reads as work he can do when he cannot. */}
      {r.gated && (
        <Field label="Their move first">
          {list(
            "theirs",
            r.theirSide.map((t) => `${t.who} owes ${t.text}`),
          )}
        </Field>
      )}

      <Field label={r.gated ? "Next from me · after" : "Next step"}>
        {r.ourNext.length ? (
          <>
            {r.gated && (
              <div className={styles.pipeGate}>
                Waits on {r.theirSide[0]?.who ?? "them"}.
              </div>
            )}
            <Entries
              ks={r.ourNext.map((_, i) => k("next", i))}
              texts={r.ourNext.map((n) => n.text)}
              overlay={overlay}
              set={set}
              tail={
                <>
                  {r.ourNext[0]?.urgent && (
                    <span className={styles.pipePillHot}>Promised</span>
                  )}
                  {srcChip(`opened ${md(r.ourNext[0]?.opened ?? "")}`)}
                </>
              }
            />
          </>
        ) : (
          <span className={styles.pipeFlag}>
            None set <span className={styles.pipeUnknown}>— that is the finding</span>
          </span>
        )}
      </Field>

      {!r.gated && (
        <Field label="Waiting on">
          {list(
            "theirs",
            r.theirSide.map((t) => `${t.who} owes ${t.text}`),
          )}
        </Field>
      )}

      {/* Depth is one click down. His acceptance criterion is a record read
          aloud in under twenty seconds — about sixty words — and the full
          Simploy record is 277, all of it in Outcomes, Unknowns and the FYI
          lines. The click-depth law decides: the budget wins and the
          intelligence moves a click down. Copy still takes the whole record;
          the fold is for the eye, never for the deliverable. */}
      <details className={styles.pipeFold} open={openDepth}>
        <summary>Depth · outcomes, unknowns, risk, FYI</summary>
        <Field label="Outcomes">
          {list(
            "outcome",
            r.outcomes,
            <span className={styles.pipeUnknown}>None recorded</span>,
            r.outcomesSrc,
          )}
        </Field>

        {r.theirWords.length > 0 && (
          <Field label="Their words">
            {list(
              "quote",
              r.theirWords.map((q) => `“${q}”`),
              null,
              r.outcomesSrc,
            )}
          </Field>
        )}

        <Field label="Unknowns">
          {list(
            "unknown",
            r.unknowns,
            <span className={styles.pipeUnknown}>None open</span>,
            "gap ledger",
          )}
        </Field>

        {r.risks.length > 0 && (
          <Field label="Risk">
            {list(
              "risk",
              r.risks.map((x) => x.text),
              null,
            )}
          </Field>
        )}

        {r.handoffs.length > 0 && (
          <Field label="FYI · other teams">
            {list("handoff", r.handoffs, <></>, "register")}
          </Field>
        )}

        {(r.fyi || r.fyiWho) && (
          <Field label="FYI · elsewhere">
            <Line
              k={k("fyi")}
              text={[r.fyi, r.fyiWho ? `${r.fyiWho}.` : ""].filter(Boolean).join(" ")}
              overlay={overlay}
              set={set}
              tail={srcChip("second record")}
            />
          </Field>
        )}
      </details>
    </div>
  );
}

/** The drawer — the room's own pane, opened from the edge rail beside Roundups
 *  and the eye. It is NOT a second rail: the room already keeps one on that
 *  margin, and a tab that builds its own stack collides with the tabs already
 *  there (caught on screen, 2026-09-08). */
export function PipelineDrawer({
  rows: served,
  dayLabel: servedDay,
  staleNote: servedStale,
  onClose,
}: {
  rows: PipelineRecord[];
  dayLabel: string;
  /** "" when the second record is current; the honest line when it is not. */
  staleNote: string;
  onClose: () => void;
}) {
  // The room's render is as old as the page. Leave it open, drop a transcript
  // down the Chute, and the served records predate the drop — so the drawer
  // re-reads the moment it opens, and the button builds its file from that.
  // Until the read lands, the served rows show rather than an empty pane: a
  // slightly old report beats no report, and the line below says which it is.
  const [overlay, setOverlay] = useState<Overlay>({});
  const [fresh, setFresh] = useState<{
    rows: PipelineRecord[];
    dayLabel: string;
    staleNote: string;
    readAt: string;
    edits: Overlay;
  } | null>(null);
  const [reading, setReading] = useState(true);
  useEffect(() => {
    let live = true;
    void freshPipeline()
      .then((f) => {
        if (!live || !f) return;
        setFresh(f);
        // His saved corrections come back with the record. They seed the
        // overlay rather than replacing it, so anything typed while the read
        // was in flight survives.
        setOverlay((o) => ({ ...f.edits, ...o }));
      })
      .catch(() => {
        // The served rows stand, and the line says the read did not land.
      })
      .finally(() => {
        if (live) setReading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  const rows = fresh?.rows ?? served;
  const dayLabel = fresh?.dayLabel ?? servedDay;
  const staleNote = fresh?.staleNote ?? servedStale;
  const [copied, setCopied] = useState(false);
  // Two states, not two surfaces. The peek is the standing one — a narrow pane
  // beside the room, arrival budget intact. Expanded takes the page and opens
  // every fold, because reading the whole book at once is a different act from
  // glancing at one account (decreed 2026-09-08).
  const [wide, setWide] = useState(false);
  const [doc, setDoc] = useState<"" | "working" | "done">("");
  // A change is kept the moment it is made. The whole overlay for that account
  // is written at once — one row per account — so a strike persists as plainly
  // as a rewrite, and a reload finds the report exactly as he left it.
  const persist = (accountId: string, next: Overlay) => {
    const mine = Object.fromEntries(
      Object.entries(next).filter(([key]) => key.startsWith(`${accountId}:`)),
    );
    void savePipelineEdits({ accountId, edits: mine }).catch(() => {
      // The line stays on screen; the next change tries again.
    });
  };
  const set = (k: string, v: string | null) =>
    setOverlay((o) => {
      const next = { ...o, [k]: v };
      persist(k.slice(0, k.indexOf(":")), next);
      return next;
    });
  const restore = (id: string) =>
    setOverlay((o) => {
      const next = Object.fromEntries(
        Object.entries(o).filter(([k, v]) => !(v === null && k.startsWith(`${id}:`))),
      );
      persist(id, next);
      return next;
    });
  // A record with no next step and nobody's turn is the one that needs him.
  const stalled = useMemo(
    () => rows.filter((r) => !r.ourNext.length && !r.theirSide.length).length,
    [rows],
  );

  return (
    <div className={`${styles.drawerPane} ${wide ? styles.drawerPaneWide : ""}`}>
      <div className={styles.dpHead}>
        <span className={styles.dpTabOn}>PIPELINE · {rows.length}</span>
        <button
          type="button"
          className={styles.pipeCopy}
          onClick={() => setWide((v) => !v)}
          title={wide ? "Back to the peek" : "Open the whole report across the page"}
          aria-expanded={wide}
        >
          {wide ? "⇥ Peek" : "⇤ Expand"}
        </button>
        <button
          type="button"
          className={`${styles.pipeCopy} ${styles.pipeCopyPrimary} ${copied ? styles.pipeCopyDid : ""}`}
          disabled={reading}
          onClick={async () => {
            await toClipboard(reportToText(rows, overlay, dayLabel));
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? "Copied" : "Copy whole report"}
        </button>
        <button
          type="button"
          className={styles.pipeCopy}
          disabled={doc === "working" || reading}
          title={
            reading
              ? "Reading the record…"
              : "A Word file of the whole report, depth and all"
          }
          onClick={async () => {
            setDoc("working");
            try {
              // The library is ~1MB and only a press needs it — loading it on
              // arrival would make every room render pay for a button most
              // days go untouched.
              const { Packer } = await import("docx");
              const blob = await Packer.toBlob(reportDocument(rows, overlay, dayLabel));
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = reportFileName(dayLabel);
              document.body.appendChild(a);
              a.click();
              a.remove();
              // Revoke on the next tick — Edge cancels an in-flight download
              // if the object URL dies underneath it.
              setTimeout(() => URL.revokeObjectURL(url), 4000);
              setDoc("done");
              setTimeout(() => setDoc(""), 1600);
            } catch {
              setDoc("");
            }
          }}
        >
          {doc === "working" ? "Building…" : doc === "done" ? "Saved" : "⤓ Word file"}
        </button>
        <button type="button" className={styles.dpClose} onClick={onClose}>
          ✕ close
        </button>
      </div>
      <p className={styles.pipeHint}>
        {reading
          ? "reading the record…"
          : fresh
            ? `read ${fresh.readAt}`
            : "the room's own read"}{" "}
        · {dayLabel} · sorted by what needs you most
        {stalled ? ` · ${stalled} with no next step` : ""}
        {staleNote ? ` · ${staleNote}` : ""}
      </p>
      {rows.map((r) => (
        <Record
          key={`${r.id}:${wide}`}
          r={r}
          overlay={overlay}
          set={set}
          restore={restore}
          openDepth={wide}
        />
      ))}
    </div>
  );
}
