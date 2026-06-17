/**
 * The component contract (03 §4.2).
 *
 * Every library component declares three things, one per sibling spec:
 * its composition Family (03), its voice posture (01 — strings arrive
 * already declared through t() by the caller; components never invent
 * operator copy), and its density behavior (02 — whether it responds
 * to the Show-me-how / Step-back gradient, and where its affordance
 * slice point sits).
 *
 * A component that cannot name its Family does not belong in the
 * library — it is decoration, and the "does this hold its place" test
 * removes it (canon Part IV §5).
 */

/** The four composition systems (03 Part II). */
export type CompositionFamily = "pulse" | "ribbon" | "grounded" | "offset";

/**
 * The density gradient's two states (02 §2.1). Re-exported from the
 * canonical density module so a component and the persistence layer
 * never disagree on the spelling (the DB stores the snake-case enum).
 */
export type { DensityState } from "@/lib/density/types";

/**
 * The five data conditions every surface treats explicitly
 * (03 §4.4, canon Part II §6).
 */
export type DataState = "empty" | "sparse" | "loading" | "error" | "ready";

/** Semantic accent roles — one meaning each (00 Part II §3). */
export type AccentRole = "orange" | "blue" | "green" | "amber" | "red";

/**
 * Where an action set slices in Step back (03 §4.7): how many actions
 * stay visible before the rest collapse behind a "More" affordance.
 * A property of the component's action set, not a global constant.
 */
export const DEFAULT_AFFORDANCE_SLICE_INDEX = 2;

export interface ComponentContract {
    readonly family: CompositionFamily;
    readonly densityResponsive: boolean;
    readonly affordanceSliceIndex?: number;
}
