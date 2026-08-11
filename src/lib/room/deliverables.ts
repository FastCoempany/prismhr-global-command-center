// Commitments carry their own contingency. "Get the pre-recorded demo from
// Shane by 7/30 — if not, send the Advocate Pay one with the proprietary bits
// scrubbed" is ONE commitment with a fallback riding it, and the fallback is
// worthless unless it surfaces at the moment the wall blows. So the fallback
// travels inside the action's own body behind a marker: no schema change, and
// every existing sheet renderer keeps working (it just shows one line).

export const FALLBACK_GLYPH = "↯";
export const PROVENANCE_GLYPH = "·";

export type Commitment = {
  text: string;
  fallback: string;
};

// `text ↯ fallback · from 7/29 paste`
export function actionBody(text: string, fallback: string, provenance?: string): string {
  const core = (text ?? "").trim().replace(/\s+/g, " ");
  const alt = (fallback ?? "").trim().replace(/\s+/g, " ");
  const prov = (provenance ?? "").trim();
  return [
    core,
    alt ? `${FALLBACK_GLYPH} ${alt}` : "",
    prov ? `${PROVENANCE_GLYPH} ${prov}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function splitFallback(body: string): Commitment {
  const raw = (body ?? "").trim();
  const i = raw.indexOf(` ${FALLBACK_GLYPH} `);
  if (i < 0) return { text: raw, fallback: "" };
  return {
    text: raw.slice(0, i).trim(),
    fallback: raw
      .slice(i + FALLBACK_GLYPH.length + 2)
      .replace(new RegExp(`\\s${PROVENANCE_GLYPH}\\s.*$`), "")
      .trim(),
  };
}

export function hasFallback(body: string): boolean {
  return splitFallback(body).fallback.length > 0;
}

// The move when a dated commitment's date has passed and a fallback exists.
// Plain and imperative — the operator should not have to reconstruct the plan.
export function fallbackMove(body: string): string {
  const { text, fallback } = splitFallback(body);
  if (!fallback) return "";
  const what = text.replace(/\s+·\s+from\s.*$/i, "").trim();
  return `${what} didn't land. Go to the fallback: ${fallback}`;
}

// Urgency a dated commitment deserves. Anything due inside two days is high,
// this week is med, further out carries none — the composer's own ladder.
export function urgencyForDue(dueIso: string, now: Date): "" | "low" | "med" | "high" {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueIso ?? "")) return "";
  const due = Date.parse(`${dueIso}T12:00:00Z`);
  if (Number.isNaN(due)) return "";
  const days = Math.floor((due - now.getTime()) / 86_400_000);
  if (days <= 2) return "high";
  if (days <= 7) return "med";
  return "";
}
