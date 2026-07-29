// Closed Won / Closed Lost — the terminal states the board never had.
//
// The seven board nodes are the pre-terminal Salesforce stages; a closed deal
// isn't a further node, it's a different KIND of fact ("this is over, and here
// is the sentence that proves it"). So closure is stored beside the node states
// rather than as an eighth node: a reserved key inside the card's existing
// `notes` JSON. No column, no migration, no deploy that can outrun the SQL —
// the same doctrine the namespaced note and disposition keys already follow.
//
// The paste read PROPOSES a closure (it saw "we've gone with another provider");
// the operator confirms. Nothing here closes a deal on its own.

export const OUTCOME_KEY = "__outcome";

export type OutcomeStatus = "won" | "lost";

export type DealOutcome = {
  status: OutcomeStatus;
  phrase: string; // the evidence sentence, in the record's own words
  at: string; // ISO — when it was recorded
};

export const OUTCOME_LABEL: Record<OutcomeStatus, string> = {
  won: "Closed Won",
  lost: "Closed Lost",
};

// Terminal SF picklist values, so a closed card still answers "what stage is
// this in Salesforce?" honestly.
export const OUTCOME_SF_STAGE: Record<OutcomeStatus, string> = {
  won: "Closed Won",
  lost: "Closed Lost",
};

type RawRec = Record<string, unknown>;

export function readOutcome(notes: unknown): DealOutcome | null {
  if (!notes || typeof notes !== "object") return null;
  const raw = (notes as RawRec)[OUTCOME_KEY];
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const p = JSON.parse(raw) as Partial<DealOutcome>;
    if (p.status !== "won" && p.status !== "lost") return null;
    return {
      status: p.status,
      phrase: typeof p.phrase === "string" ? p.phrase.slice(0, 200) : "",
      at: typeof p.at === "string" ? p.at : "",
    };
  } catch {
    return null;
  }
}

// Returns a NEW notes object — callers persist it. Passing null reopens the
// deal (a closure recorded in error must be undoable, like everything else).
export function writeOutcome(
  notes: unknown,
  outcome: DealOutcome | null,
): Record<string, string> {
  // The column holds { nodeKey: string }; anything else in there was never
  // ours, and coercing keeps the write JSON-safe.
  const out: Record<string, string> = {};
  if (notes && typeof notes === "object")
    for (const [k, v] of Object.entries(notes as RawRec))
      if (typeof v === "string") out[k] = v;
  if (!outcome) delete out[OUTCOME_KEY];
  else
    out[OUTCOME_KEY] = JSON.stringify({
      status: outcome.status,
      phrase: outcome.phrase.slice(0, 200),
      at: outcome.at,
    });
  return out;
}

// A closed card's node notes shouldn't leak the reserved key into any per-stage
// note view.
export function stripOutcome(notes: Record<string, string>): Record<string, string> {
  const out = { ...notes };
  delete out[OUTCOME_KEY];
  return out;
}
