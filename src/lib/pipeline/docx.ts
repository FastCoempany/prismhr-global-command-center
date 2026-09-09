// The Pipeline report as a Word document (founder-decreed 2026-09-08: "a
// button that opens the full record into a docx I can share with a teammate").
//
// Built in the browser and downloaded — no cloud, no credentials. The operator
// is already signed in, opens the file, and sends it on however he likes.
//
// This is the one Pipeline surface a stranger reads. The tab and the clipboard
// go to people who already know the accounts; a document goes to a teammate
// who may never have heard of them, so it carries the labels in full, the
// provenance beside each value, and the depth the drawer folds away. Nothing
// is compressed here, because there is nothing to click.

import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type FileChild,
} from "docx";
import type { PipelineRecord } from "./build";
import { closeText, lineKey, type Overlay } from "./plain";

// US Letter in DXA (1440 = one inch). The library defaults to A4, which prints
// short on every printer in the building.
const PAGE = { width: 12240, height: 15840 };
const MARGIN = 1080; // 0.75"
const CONTENT = PAGE.width - MARGIN * 2;
// Both halves of a label/value row need an explicit DXA width, and the columns
// must sum to the table's own — percentages break in Word and in Google Docs.
const LABEL_W = 2200;
const VALUE_W = CONTENT - LABEL_W;

const INK = "0A1C40";
const QUIET = "6B7A99";
const ORANGE = "E6701E";
const AMBER = "B45309";

const md = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso ?? "")
    ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`
    : "";

/** Apply the operator's overlay: an edit replaces the line, a strike removes
 *  it. The document is what he decided the report says, not what the app first
 *  derived. */
function live(overlay: Overlay, key: string, text: string): string | null {
  if (!(key in overlay)) return text;
  const v = overlay[key];
  return v === null ? null : v;
}

const quiet = (text: string) =>
  new TextRun({ text, color: QUIET, size: 16, font: "Consolas" });

/** One label/value row. `src` rides beneath the value in the provenance grey,
 *  because a document read by someone who was not on the call has to say where
 *  each fact came from. */
function row(label: string, lines: string[], src?: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: LABEL_W, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 0, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: label.toUpperCase(),
                bold: true,
                size: 15,
                color: QUIET,
                font: "Consolas",
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: VALUE_W, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 0, right: 0 },
        children: [
          ...lines.map(
            (t, i) =>
              new Paragraph({
                spacing: { after: i === lines.length - 1 ? 0 : 40 },
                ...(lines.length > 1 ? { bullet: { level: 0 } } : {}),
                children: [new TextRun({ text: t, size: 20, color: INK })],
              }),
          ),
          ...(src
            ? [new Paragraph({ spacing: { before: 40 }, children: [quiet(src)] })]
            : []),
        ],
      }),
    ],
  });
}

const UNKNOWN = "Unknown";

/** One account, as the rows a reader who has never heard of it needs. */
function recordRows(r: PipelineRecord, overlay: Overlay): TableRow[] {
  const k = (f: string, i = 0) => lineKey(r.id, f, i);
  const keep = (field: string, items: readonly string[]) =>
    items
      .map((t, i) => live(overlay, k(field, i), t))
      .filter((t): t is string => t !== null && !!t.trim());
  const one = (field: string, text: string) => {
    const v = live(overlay, k(field), text);
    return v && v.trim() ? [v] : [];
  };
  const out: TableRow[] = [];
  const add = (label: string, lines: string[], src?: string, fallback = UNKNOWN) => {
    if (lines.length) out.push(row(label, lines, src));
    else if (fallback) out.push(row(label, [fallback]));
  };

  add("Products", one("products", r.products.join(", ")), "deal intel");
  add(
    "Countries",
    keep(
      "opp",
      r.opportunities.map(
        (o) =>
          `${o.country} · ${o.product || "product Unknown"}${o.headcount ? ` · ${o.headcount}` : ""}`,
      ),
    ),
    r.opportunities[0]?.src,
  );
  add(
    "Contacts",
    one(
      "contact",
      r.contacts.map((c) => c.name + (c.title ? ` (${c.title})` : "")).join(", "),
    ),
    "record",
  );
  add("Model", r.model ? one("model", r.model.v) : [], r.model?.src);
  add("Competitor", r.incumbent ? one("incumbent", r.incumbent.v) : [], r.incumbent?.src);
  add("Stage", r.stage ? one("stage", r.stage.v) : [], r.stage?.src);
  add(
    "Close date",
    r.closeDate
      ? one("close", closeText(r.closeDate) + (r.closeDate.passed ? " — passed" : ""))
      : [],
    r.closeDate
      ? r.closeDate.derived
        ? `derived · ${r.closeDate.src}`
        : r.closeDate.src
      : undefined,
  );
  add(
    "Last meeting",
    r.lastTouch
      ? // A date, and nothing else — who was there is on the contacts line.
        one("meeting", md(r.lastTouch.date))
      : [],
  );
  add("Outcomes", keep("outcome", r.outcomes), r.outcomesSrc, "None recorded");
  if (r.theirWords.length)
    add(
      "Their words",
      keep(
        "quote",
        r.theirWords.map((q) => `“${q}”`),
      ),
      r.outcomesSrc,
      "",
    );

  const theirs = keep(
    "theirs",
    r.theirSide.map((t) => `${t.who} owes ${t.text}`),
  );
  // Their turn runs first when the same conversation set both sides. A reader
  // who sees his sends listed as today's work will ask why they have not gone.
  if (r.gated) add("Their move first", theirs, r.theirSide[0]?.src, "");

  const mine = keep(
    "next",
    r.ourNext.map((n) => n.text),
  );
  if (mine.length) add(r.gated ? "Next from me — after" : "Next step", mine, "", "");
  else out.push(row("Next step", ["None set — that is the finding"]));

  if (!r.gated) add("Waiting on", theirs, r.theirSide[0]?.src);
  add("Unknowns", keep("unknown", r.unknowns), "gap ledger", "None open");
  add(
    "Risk",
    keep(
      "risk",
      r.risks.map((x) => x.text),
    ),
    r.risks[0]?.src,
    "",
  );
  add("FYI · other teams", keep("handoff", r.handoffs), "register", "");
  const elsewhere = [r.fyi, r.fyiWho ? `${r.fyiWho}.` : ""].filter(Boolean).join(" ");
  add("FYI · elsewhere", elsewhere ? one("fyi", elsewhere) : [], "second record", "");
  return out;
}

/** The section body: a title, then one heading + table per account. */
export function reportSection(
  rows: readonly PipelineRecord[],
  overlay: Overlay,
  dayLabel: string,
): FileChild[] {
  const children: FileChild[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: "Pipeline Status", size: 40, color: INK, font: "Georgia" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      border: { bottom: { style: "single", size: 6, color: "D6DCE8", space: 8 } },
      children: [
        quiet(
          `${dayLabel} · ${rows.length} active ${rows.length === 1 ? "account" : "accounts"} · every value traces to a row in the record`,
        ),
      ],
    }),
  ];

  for (const r of rows) {
    const name = live(overlay, lineKey(r.id, "account"), r.account) ?? r.account;
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 20 },
        children: [
          new TextRun({ text: name, size: 26, color: INK, font: "Georgia", bold: false }),
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          quiet(
            [
              r.csm ? `CSM ${r.csm}` : "CSM unassigned",
              r.lastTouch
                ? `${r.lastTouch.kind} ${md(r.lastTouch.date)}`
                : "no meeting on record",
              r.quietDays === null ? "" : `quiet ${r.quietDays} days`,
            ]
              .filter(Boolean)
              .join("   ·   ")
              .toUpperCase(),
          ),
        ],
      }),
    );
    if (r.ourNext.some((n) => n.urgent))
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "PROMISED, AND THE DAY PASSED",
              size: 15,
              bold: true,
              color: AMBER,
              font: "Consolas",
            }),
          ],
        }),
      );
    children.push(
      new Table({
        width: { size: CONTENT, type: WidthType.DXA },
        columnWidths: [LABEL_W, VALUE_W],
        borders: {
          top: { style: "none", size: 0, color: "FFFFFF" },
          bottom: { style: "none", size: 0, color: "FFFFFF" },
          left: { style: "none", size: 0, color: "FFFFFF" },
          right: { style: "none", size: 0, color: "FFFFFF" },
          insideHorizontal: { style: "single", size: 2, color: "EDF1F7" },
          insideVertical: { style: "none", size: 0, color: "FFFFFF" },
        },
        rows: recordRows(r, overlay),
      }),
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.LEFT,
      children: [
        quiet(
          "Values marked derived were inferred by the app; every other value names the row it was read from. Unknown is a value, never a blank.",
        ),
      ],
    }),
  );
  return children;
}

/** The whole document. Bullets come from a numbering config — a literal "•"
 *  is a character Word cannot indent, wrap or renumber. */
export function reportDocument(
  rows: readonly PipelineRecord[],
  overlay: Overlay,
  dayLabel: string,
): Document {
  return new Document({
    creator: "GEM — Global Employee Management",
    title: `Pipeline Status — ${dayLabel}`,
    description: "Every active account, as the record holds it.",
    numbering: {
      config: [
        {
          reference: "pipeline-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 260, hanging: 180 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: "Aptos", size: 20, color: INK } },
        heading1: { run: { font: "Georgia", size: 26, color: INK, bold: false } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE.width,
              height: PAGE.height,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
          },
        },
        children: reportSection(rows, overlay, dayLabel),
      },
    ],
  });
}

/** The file name a teammate will see in their downloads. */
export function reportFileName(dayLabel: string): string {
  const slug = dayLabel.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `Pipeline-Status-${slug || "today"}.docx`;
}

/** Orange is the one dominant move on the Pipeline surface and it belongs to
 *  Copy; the document keeps it for nothing, so the token is here only to say
 *  so out loud rather than leaving a reader to wonder. */
export const DOC_ACCENT_UNUSED = ORANGE;
