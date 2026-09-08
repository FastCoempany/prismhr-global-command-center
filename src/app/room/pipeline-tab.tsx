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
import { reportDocument, reportFileName } from "@/lib/pipeline/docx";
import { freshPipeline } from "./pipeline-actions";
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
 *  edit never lands on a neighbour. */
function Line({
  k,
  text,
  overlay,
  set,
  className,
}: {
  k: string;
  text: string;
  overlay: Overlay;
  set: (k: string, v: string | null) => void;
  className?: string;
}) {
  if (overlay[k] === null) return null;
  const shown = overlay[k] ?? text;
  return (
    <span className={`${styles.pipeLine} ${className ?? ""}`}>
      <span
        contentEditable
        suppressContentEditableWarning
        className={styles.pipeEd}
        onBlur={(e) => {
          const v = (e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim();
          if (v !== text) set(k, v);
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
    </span>
  );
}

function Field({
  label,
  children,
  src,
}: {
  label: string;
  children: React.ReactNode;
  src?: string;
}) {
  return (
    <div className={styles.pipeField}>
      <div className={styles.pipeKey}>{label}</div>
      <div className={styles.pipeVal}>{children}</div>
      {src ? <div className={styles.pipeSrc}>{src}</div> : <div />}
    </div>
  );
}

const Unknown = () => <span className={styles.pipeUnknown}>Unknown</span>;

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
  const list = (
    field: string,
    items: readonly string[],
    empty: React.ReactNode = <Unknown />,
  ) => {
    const rows = items.map((t, i) => (
      <li key={i}>
        <Line k={k(field, i)} text={t} overlay={overlay} set={set} />
      </li>
    ));
    const alive = items.filter((_, i) => overlay[k(field, i)] !== null);
    return alive.length ? <ul className={styles.pipeList}>{rows}</ul> : empty;
  };

  return (
    <div className={styles.pipeRec}>
      <div className={styles.pipeHead}>
        <div>
          <Line k={k("account")} text={r.account} overlay={overlay} set={set} />
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

      <Field label="Products" src="deal intel">
        {r.products.length ? (
          <Line
            k={k("products")}
            text={r.products.join(", ")}
            overlay={overlay}
            set={set}
          />
        ) : (
          <Unknown />
        )}
      </Field>

      <Field label="Opportunities">
        {r.opportunities.length ? (
          <ul className={styles.pipeList}>
            {r.opportunities.map((o, i) => (
              <li key={i}>
                <Line
                  k={k("opp", i)}
                  text={`${o.country} · ${o.product || "product Unknown"}${o.headcount ? ` · ${o.headcount}` : ""}`}
                  overlay={overlay}
                  set={set}
                />
                <span className={styles.pipeSrcInline}>{o.src}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Unknown />
        )}
      </Field>

      <Field label="My contacts" src="record">
        {r.contacts.length ? (
          <Line
            k={k("contact")}
            text={r.contacts
              .map((c) => c.name + (c.title ? ` (${c.title})` : ""))
              .join(" · ")}
            overlay={overlay}
            set={set}
          />
        ) : (
          <Unknown />
        )}
      </Field>

      <Field label="Model" src={r.model?.src}>
        {r.model ? (
          <Line k={k("model")} text={r.model.v} overlay={overlay} set={set} />
        ) : (
          <Unknown />
        )}
      </Field>
      <Field label="Competitor" src={r.incumbent?.src}>
        {r.incumbent ? (
          <Line k={k("incumbent")} text={r.incumbent.v} overlay={overlay} set={set} />
        ) : (
          <Unknown />
        )}
      </Field>
      <Field label="Stage" src={r.stage?.src}>
        {r.stage ? (
          <Line k={k("stage")} text={r.stage.v} overlay={overlay} set={set} />
        ) : (
          <Unknown />
        )}
      </Field>
      <Field
        label="Close date"
        src={
          r.closeDate
            ? r.closeDate.derived
              ? `derived · ${r.closeDate.src}`
              : r.closeDate.src
            : undefined
        }
      >
        {r.closeDate ? (
          <>
            <Line
              k={k("close")}
              text={closeText(r.closeDate)}
              overlay={overlay}
              set={set}
            />
            {r.closeDate.passed && <span className={styles.pipePillWarn}>Passed</span>}
          </>
        ) : (
          <Unknown />
        )}
      </Field>

      <Field label="Last meeting">
        {r.lastTouch ? (
          <Line
            k={k("meeting")}
            text={
              `${r.lastTouch.kind} ${md(r.lastTouch.date)}` +
              (r.lastTouch.room.length
                ? ` · ${r.lastTouch.room.map((p) => p.name + (p.title ? ` (${p.title})` : "")).join(", ")}`
                : "")
            }
            overlay={overlay}
            set={set}
          />
        ) : (
          <Unknown />
        )}
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
            <ul className={styles.pipeList}>
              {r.ourNext.map((n, i) => (
                <li key={i}>
                  <Line k={k("next", i)} text={n.text} overlay={overlay} set={set} />
                  {n.urgent && <span className={styles.pipePillHot}>Promised</span>}
                  <span className={styles.pipeSrcInline}>opened {md(n.opened)}</span>
                </li>
              ))}
            </ul>
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
      <details className={styles.pipeFold}>
        <summary>Depth · outcomes, unknowns, risk, FYI</summary>
        <Field label="Outcomes" src={r.outcomesSrc}>
          {list(
            "outcome",
            r.outcomes,
            <span className={styles.pipeUnknown}>None recorded</span>,
          )}
        </Field>

        {r.theirWords.length > 0 && (
          <Field label="Their words" src={r.outcomesSrc}>
            {list(
              "quote",
              r.theirWords.map((q) => `“${q}”`),
              null,
            )}
          </Field>
        )}

        <Field label="Unknowns" src="gap ledger">
          {list(
            "unknown",
            r.unknowns,
            <span className={styles.pipeUnknown}>None open</span>,
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
          <Field label="FYI · other teams" src="register">
            {list("handoff", r.handoffs, null)}
          </Field>
        )}

        {(r.fyi || r.fyiWho) && (
          <Field label="FYI · elsewhere" src="second record">
            <Line
              k={k("fyi")}
              text={[r.fyi, r.fyiWho ? `${r.fyiWho}.` : ""].filter(Boolean).join(" ")}
              overlay={overlay}
              set={set}
            />
          </Field>
        )}
      </details>
      {r.overtaken.length > 0 && (
        <details className={styles.pipeFold} open={openDepth}>
          <summary>
            {r.overtaken.length} overtaken by the{" "}
            {r.lastTouch ? md(r.lastTouch.date) : "last"} call
          </summary>
          <ul className={styles.pipeList}>
            {r.overtaken.map((o, i) => (
              <li key={i} className={styles.pipeUnknown}>
                {o.text}{" "}
                <span className={styles.pipeSrcInline}>opened {md(o.opened)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
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
  const [fresh, setFresh] = useState<{
    rows: PipelineRecord[];
    dayLabel: string;
    staleNote: string;
    readAt: string;
  } | null>(null);
  const [reading, setReading] = useState(true);
  useEffect(() => {
    let live = true;
    void freshPipeline()
      .then((f) => {
        if (live && f) setFresh(f);
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
  const [overlay, setOverlay] = useState<Overlay>({});
  const [copied, setCopied] = useState(false);
  // Two states, not two surfaces. The peek is the standing one — a narrow pane
  // beside the room, arrival budget intact. Expanded takes the page and opens
  // every fold, because reading the whole book at once is a different act from
  // glancing at one account (decreed 2026-09-08).
  const [wide, setWide] = useState(false);
  const [doc, setDoc] = useState<"" | "working" | "done">("");
  const set = (k: string, v: string | null) => setOverlay((o) => ({ ...o, [k]: v }));
  const restore = (id: string) =>
    setOverlay((o) =>
      Object.fromEntries(
        Object.entries(o).filter(([k, v]) => !(v === null && k.startsWith(`${id}:`))),
      ),
    );
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
