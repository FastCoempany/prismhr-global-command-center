// The Sales Nav spine's own two stores (2026-10-15): the alerts the operator
// hid with ✕, and the kinds muted outright. Namespaced notes, so every
// account view and the intranet mirror skip them by construction
// (isNamespacedAccountId). One note per hidden key or muted group; ↺ deletes
// the note and the alert comes back. Nothing else reads them.

export const SPINE_GONE = "snav:gone";
export const SPINE_MUTE = "snav:mute";

/** A spine key is the builder's own hash (src/lib/groundwork/spine.ts). */
export const isSpineKey = (k: unknown): k is string =>
  typeof k === "string" && /^[0-9a-f]{1,16}$/.test(k);

/** The groups a mute can name: the read-only kinds only. A post, a job move
 *  or an intent change is never muted: each is a move the queue reads. */
export const MUTABLE = ["activity"] as const;
export const isMutable = (g: unknown): g is (typeof MUTABLE)[number] =>
  typeof g === "string" && (MUTABLE as readonly string[]).includes(g);
