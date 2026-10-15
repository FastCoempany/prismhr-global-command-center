// The Sales Nav spine's kinds, with no dependencies, so the column's client
// component reads them without pulling the builder's server-side modules
// (the book's roster never ships to the browser).

import type { QueueRuleId } from "./day";

export type SpineKind =
  | "posted"
  | "new-in-seat"
  | "left"
  | "intent"
  | "active"
  | "company-post"
  | "growth";

/** The filter a kind sits under on the spine's segmented control. */
export const KIND_GROUP: Readonly<Record<SpineKind, "people" | "intent" | "activity">> = {
  posted: "people",
  "new-in-seat": "people",
  left: "people",
  intent: "intent",
  active: "activity",
  "company-post": "activity",
  growth: "activity",
};

/** The queue rule an alert feeds, when it feeds one. */
export const KIND_RULE: Readonly<Partial<Record<SpineKind, QueueRuleId>>> = {
  posted: "post-trigger",
  "new-in-seat": "new-in-seat",
  left: "contact-left",
  intent: "intent-warm",
};
