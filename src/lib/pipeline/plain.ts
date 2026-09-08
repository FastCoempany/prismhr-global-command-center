// The record as plain text — what lands in a Teams message when Copy is
// pressed (founder-decreed 2026-09-08: "edit any line, press copy, paste into
// a Teams channel").
//
// Built from the record plus the operator's overlay, never by walking the
// rendered DOM. Two reasons that matters: the text is testable without a
// browser, and a line he edited or struck is one fact in one place instead of
// a span the serializer has to notice.
//
// Fixed label, value, newline. No prose paragraphs, and nothing silently
// blank: Unknown is a value.

import type { PipelineRecord } from "./build";

/** What the operator changed. A key maps to the new text, or to null when the
 *  line was struck out — struck lines leave the copy, and a field whose lines
 *  are all struck leaves with them rather than copying as an empty heading. */
export type Overlay = Readonly<Record<string, string | null>>;

/** Every editable line has a stable key: `<recordId>:<field>:<index>`. The
 *  index is the line's position in its own field, so an edit survives a
 *  re-render and never lands on a neighbour. */
export const lineKey = (id: string, field: string, i = 0) => `${id}:${field}:${i}`;

const md = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso ?? "")
    ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`
    : "";
/** A close date is a day when the record named one, and the phrase it was
 *  stated as when nobody did — never a phrase run through a date formatter,
 *  which is how "asap" once rendered as "0/0". */
export const closeText = (c: PipelineRecord["closeDate"]) => (!c ? "" : md(c.v) || c.v);

const UNKNOWN = "Unknown";

type Line = { key: string; text: string };

/** Apply the overlay to one line: an edit replaces it, a strike removes it. */
function live(overlay: Overlay, key: string, text: string): string | null {
  if (!(key in overlay)) return text;
  const v = overlay[key];
  return v === null ? null : v;
}

function field(
  out: string[],
  overlay: Overlay,
  label: string,
  lines: Line[],
  opts: { unknown?: string; bullets?: boolean; join?: string } = {},
): void {
  const kept = lines
    .map((l) => live(overlay, l.key, l.text))
    .filter((t): t is string => t !== null && t.trim().length > 0);
  if (!kept.length) {
    // Nothing on record renders as Unknown; everything struck by hand means
    // he took the field out, and it goes quietly.
    if (lines.length === 0 && opts.unknown !== undefined)
      out.push(`${label}: ${opts.unknown}`);
    return;
  }
  if (opts.bullets && kept.length > 1) {
    out.push(`${label}:`);
    for (const t of kept) out.push(`  - ${t}`);
  } else if (opts.bullets) {
    out.push(`${label}: ${kept[0]}`);
  } else {
    out.push(`${label}: ${kept.join(opts.join ?? " · ")}`);
  }
}

/** The fields that ARRIVE. The rest is a click down.
 *
 *  His acceptance criterion is "I can read one record aloud in under 20
 *  seconds" — about sixty words. The full Simploy record is 277, and the
 *  weight is all in the depth: four Unknowns run 61 words on their own. The
 *  click-depth law settles the conflict ("arrival budgets are hard limits;
 *  when budget and intelligence conflict, the budget wins and the intelligence
 *  moves a click down"), so the spine arrives and the depth folds.
 *
 *  Copy is not arrival. What he pastes into a channel is the whole record —
 *  the fold is for the eye, never for the deliverable. */
export const ARRIVAL = [
  "Products",
  "Countries",
  "Contacts",
  "Model",
  "Competitor",
  "Stage",
  "Close date",
  "Last meeting",
  "Their move first",
  "Next step",
  "Next from me (after)",
  "Waiting on",
] as const;

/** How many words a record puts on screen before anything is opened. The
 *  adversarial pass measures this, never the copy. */
export function arrivalWords(r: PipelineRecord, overlay: Overlay = {}): number {
  const keep = new Set<string>(ARRIVAL);
  return recordToText(r, overlay)
    .split("\n")
    .filter((l, i) => {
      if (i < 2) return true; // the name and its meta line
      const label = /^([^:]+):/.exec(l)?.[1];
      if (label) return keep.has(label.trim());
      // a bullet belongs to whatever label opened above it
      return false;
    })
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

/** One record, as the fixed label/value block he reads aloud. */
export function recordToText(r: PipelineRecord, overlay: Overlay = {}): string {
  const k = (f: string, i = 0) => lineKey(r.id, f, i);
  const out: string[] = [];
  const name = live(overlay, k("account"), r.account) ?? r.account;
  out.push(name.toUpperCase());
  out.push(
    [
      r.csm ? `CSM ${r.csm}` : "CSM unassigned",
      r.lastTouch
        ? `${r.lastTouch.kind} ${md(r.lastTouch.date)}`
        : "no meeting on record",
      r.quietDays === null ? "" : `quiet ${r.quietDays}d`,
    ]
      .filter(Boolean)
      .join(" · "),
  );
  out.push("");

  field(
    out,
    overlay,
    "Products",
    r.products.map((p, i) => ({ key: k("products", i), text: p })),
    {
      unknown: UNKNOWN,
    },
  );
  field(
    out,
    overlay,
    "Countries",
    r.opportunities.map((o, i) => ({
      key: k("opp", i),
      text: `${o.country} · ${o.product || "product Unknown"}${o.headcount ? ` · ${o.headcount}` : ""}`,
    })),
    { unknown: UNKNOWN, bullets: true },
  );
  // Everyone who was in the room, on one line, commas between them.
  field(
    out,
    overlay,
    "Contacts",
    r.contacts.map((c, i) => ({
      key: k("contact", i),
      text: c.name + (c.title ? ` (${c.title})` : ""),
    })),
    { unknown: UNKNOWN, join: ", " },
  );
  field(out, overlay, "Model", r.model ? [{ key: k("model"), text: r.model.v }] : [], {
    unknown: UNKNOWN,
  });
  field(
    out,
    overlay,
    "Competitor",
    r.incumbent ? [{ key: k("incumbent"), text: r.incumbent.v }] : [],
    { unknown: UNKNOWN },
  );
  field(out, overlay, "Stage", r.stage ? [{ key: k("stage"), text: r.stage.v }] : [], {
    unknown: UNKNOWN,
  });
  field(
    out,
    overlay,
    "Close date",
    r.closeDate
      ? [
          {
            key: k("close"),
            text: closeText(r.closeDate) + (r.closeDate.passed ? " (passed)" : ""),
          },
        ]
      : [],
    { unknown: UNKNOWN },
  );
  field(
    out,
    overlay,
    "Last meeting",
    r.lastTouch
      ? [
          {
            key: k("meeting"),
            // A date, and nothing else. Who was there is on the contacts line.
            text: md(r.lastTouch.date),
          },
        ]
      : [],
    { unknown: UNKNOWN },
  );
  field(
    out,
    overlay,
    "Outcomes",
    r.outcomes.map((o, i) => ({ key: k("outcome", i), text: o })),
    { unknown: "None recorded", bullets: true },
  );
  if (r.theirWords.length)
    field(
      out,
      overlay,
      "Their words",
      r.theirWords.map((q, i) => ({ key: k("quote", i), text: `“${q}”` })),
      { bullets: true },
    );

  // Their turn comes first when the same conversation set both sides: his
  // sends are not today's work, and a report that lists them as though they
  // are reads as work he can do when he cannot.
  const theirs = r.theirSide.map((t, i) => ({
    key: k("theirs", i),
    text: `${t.who} owes ${t.text}`,
  }));
  if (r.gated) field(out, overlay, "Their move first", theirs, { bullets: true });

  const mine = r.ourNext.map((n, i) => ({ key: k("next", i), text: n.text }));
  const keptMine = mine
    .map((l) => live(overlay, l.key, l.text))
    .filter((t) => t !== null && t.trim());
  if (keptMine.length)
    field(out, overlay, r.gated ? "Next from me (after)" : "Next step", mine, {
      bullets: true,
    });
  else if (!mine.length) out.push("Next step: None set — that is the finding");

  if (!r.gated)
    field(out, overlay, "Waiting on", theirs, { unknown: UNKNOWN, bullets: true });

  field(
    out,
    overlay,
    "Unknowns",
    r.unknowns.map((u, i) => ({ key: k("unknown", i), text: u })),
    { unknown: "None open", bullets: true },
  );
  field(
    out,
    overlay,
    "Risk",
    r.risks.map((x, i) => ({ key: k("risk", i), text: x.text })),
    { bullets: true },
  );
  field(
    out,
    overlay,
    "FYI · other teams",
    r.handoffs.map((h, i) => ({ key: k("handoff", i), text: h })),
    { bullets: true },
  );
  const elsewhere = [r.fyi, r.fyiWho ? `${r.fyiWho}.` : ""].filter(Boolean).join(" ");
  field(
    out,
    overlay,
    "FYI · elsewhere",
    elsewhere ? [{ key: k("fyi"), text: elsewhere }] : [],
  );

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The whole report, records separated by a rule, headed with the day it was
 *  read. */
export function reportToText(
  rows: readonly PipelineRecord[],
  overlay: Overlay = {},
  dayLabel = "",
): string {
  const head = `PIPELINE STATUS${dayLabel ? ` · ${dayLabel}` : ""}`;
  const body = rows
    .map((r) => recordToText(r, overlay))
    .filter(Boolean)
    .join("\n\n———\n\n");
  return `${head}\n\n${body}`.trim();
}
