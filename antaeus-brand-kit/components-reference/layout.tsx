import type { ComponentChildren, JSX } from "preact";
import { t } from "@/lib/voice/t";

/**
 * Layout & grid primitives (spec 05).
 *
 * One frame — a full-bleed Wayfinder bar over a centered, capped,
 * guttered column. One twelve-column grid the work aligns to without
 * packing into. One reading measure prose never crosses. Three
 * archetypes the seven families compose from, and no fourth (05
 * Part III). Geometry is orthogonal to density (05 §2.3): density
 * changes how much a surface ships, never the geometry it ships into.
 *
 * The WayfinderBar (navigation.tsx) is full-bleed and sits above the
 * frame; PageFrame owns the centered content column beneath it and the
 * sub-1024 desktop notice (05 §2.1).
 */

/**
 * PageFrame — the centered content column (max 1200px, 40px min
 * gutter) that every surface's work sits in. Place a full-bleed
 * WayfinderBar above it. Below 1024px the product is unsupported (05
 * §2.1): the frame renders a calm Trust-Annex-register notice instead
 * of a half-reflowed room.
 */
export function PageFrame(props: {
    readonly children: ComponentChildren;
    /** Override the below-1024 notice copy (already t()-declared). */
    readonly unsupportedNotice?: string;
}): JSX.Element {
    return (
        <div class="ds-frame">
            <p class="ds-frame__unsupported">
                {props.unsupportedNotice ??
                    t(
                        "Antaeus is built for a desktop window. Open this on a wider screen and the workspace is waiting.",
                        { class: "body" }
                    )}
            </p>
            <div class="ds-frame__column">{props.children}</div>
        </div>
    );
}

/**
 * Grid — the twelve-column alignment grid with 24px gutters (05 §1.2).
 * For alignment, not packing: most surfaces use a subset and leave the
 * rest open, because empty columns are how a dense product breathes.
 * Children set their span via GridCell.
 */
export function Grid(props: { readonly children: ComponentChildren }): JSX.Element {
    return <div class="ds-grid">{props.children}</div>;
}

export function GridCell(props: {
    /** Columns this region occupies, 1–12. */
    readonly span: number;
    readonly children: ComponentChildren;
}): JSX.Element {
    return (
        <div
            class="ds-grid__cell"
            style={{ gridColumn: `span ${Math.max(1, Math.min(12, props.span))}` }}
        >
            {props.children}
        </div>
    );
}

/**
 * Measure — the reading-measure container. Running prose never exceeds
 * 66ch (05 §1.3); this caps it regardless of how many columns are
 * available. Labels, kickers, tables, and the gauge are not prose and
 * do not belong in a Measure.
 */
export function Measure(props: { readonly children: ComponentChildren }): JSX.Element {
    return <div class="ds-measure">{props.children}</div>;
}

/**
 * BandStack — the vertical band stack (05 §2.2): a surface's regions in
 * canonical top-to-bottom order, on a consistent rhythm. Empty regions
 * collapse and the rhythm closes over them (no placeholder padding):
 * pass `null`/`false` for an absent band and it leaves no gap.
 */
export function BandStack(props: {
    readonly children: ComponentChildren;
    /**
     * First-load staging (spec 08 §3.1): the bands arrive in stack order
     * on the 40ms stagger, once, on first compose. Opt-in — a surface's
     * top-level region stack stages; nested stacks usually do not.
     */
    readonly stage?: boolean;
}): JSX.Element {
    const bands = (Array.isArray(props.children) ? props.children : [props.children]).filter(
        (c) => c !== null && c !== undefined && c !== false
    );
    return (
        <div class={`ds-bandstack${props.stage ? " ds-stage" : ""}`}>{bands}</div>
    );
}

// ─── The three multi-pane archetypes (05 Part III) ─────────────────

/** Single column — the calmest archetype and the default (05 §3.1). */
export function SingleColumn(props: {
    readonly children: ComponentChildren;
}): JSX.Element {
    return <div class="ds-arch-single">{props.children}</div>;
}

/**
 * Focal + rail — the 8/4 split (05 §3.2): one object at full depth in
 * the focal pane, the quiet remainder as a ranked list in the rail.
 * Collapses to single column below 1024 (focal stacks above rail).
 */
export function FocalRail(props: {
    readonly focal: ComponentChildren;
    readonly rail: ComponentChildren;
    /** Accessible label for the rail region. */
    readonly railLabel: string;
}): JSX.Element {
    return (
        <div class="ds-arch-focalrail">
            <div class="ds-arch-focalrail__focal">{props.focal}</div>
            <aside class="ds-arch-focalrail__rail" aria-label={props.railLabel}>
                {props.rail}
            </aside>
        </div>
    );
}

/**
 * Object + controls — the Decision Bench archetype (05 §3.3): the
 * shaped object visually dominant, the builder controls subordinate.
 * The made thing must out-weigh the making (canon rule 2). Collapses
 * to object-above-controls below 1024.
 */
export function ObjectControls(props: {
    readonly object: ComponentChildren;
    readonly controls: ComponentChildren;
    /** Accessible label for the controls region. */
    readonly controlsLabel: string;
}): JSX.Element {
    return (
        <div class="ds-arch-objectcontrols">
            <div class="ds-arch-objectcontrols__object">{props.object}</div>
            <aside
                class="ds-arch-objectcontrols__controls"
                aria-label={props.controlsLabel}
            >
                {props.controls}
            </aside>
        </div>
    );
}
