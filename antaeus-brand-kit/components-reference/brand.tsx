import type { JSX } from "preact";

/**
 * The brand mark — the Grounded A (sibling spec 10).
 *
 * Locked geometry (rounds 1–2, 2026-06-12): a drafted capital A
 * standing on a ground line that extends past its feet, in the icon
 * set's construction — flat terminals, mitered joins, crossbar low
 * like a gauge reading. viewBox 48: legs M14 38 L24 10 L34 38,
 * crossbar y=28 x 18.2–29.8, ground y=38 x 2–46 (the P2 long
 * overhang). Stroke weight steps up as the mark gets smaller (W2
 * ratio at display): 3.2 display · 3.6 @32 · 4 @24 · 4.4 @20 ·
 * 6 @16 with the crossbar dropped (three strokes don't survive a
 * 16-pixel box; the ground line is the signature, not the bar).
 */

function strokeFor(size: number): number {
    if (size <= 16) return 6;
    if (size <= 20) return 4.4;
    if (size <= 24) return 4;
    if (size <= 32) return 3.6;
    return 3.2;
}

export function BrandMark(props: {
    readonly size?: number;
    /** currentColor by default; pass a color for fixed contexts. */
    readonly color?: string;
}): JSX.Element {
    const size = props.size ?? 20;
    const sw = strokeFor(size);
    const dropBar = size <= 16;
    return (
        <svg
            viewBox="0 0 48 48"
            width={size}
            height={size}
            aria-hidden="true"
            fill="none"
            stroke={props.color ?? "currentColor"}
            stroke-width={sw}
            stroke-linecap="butt"
            stroke-linejoin="miter"
        >
            <path d="M14 38L24 10l10 28" />
            {dropBar ? null : <path d="M18.2 28h11.6" />}
            <path d="M2 38h44" />
        </svg>
    );
}

/**
 * The L2 lockup — mark + letterspaced caps, for product chrome
 * (round 2 pick: L1 serif for landing + docs, L2 caps for chrome).
 */
export function BrandLockup(props: { readonly size?: number }): JSX.Element {
    return (
        <span class="ds-lockup">
            <BrandMark size={props.size ?? 20} />
            <span class="ds-lockup__name">ANTAEUS</span>
        </span>
    );
}

/**
 * The L1 lockup — mark + "Antaeus" in DM Serif Display, for the landing
 * page + docs (spec 10 §3). The mark and the headline voice are the
 * same voice. `reversed` is the white-on-navy variant, for legal/footer
 * contexts only (the product field is bright; that's the one exception).
 */
export function BrandLockupSerif(props: {
    readonly size?: number;
    readonly reversed?: boolean;
}): JSX.Element {
    return (
        <span
            class={`ds-lockup ds-lockup--serif${
                props.reversed ? " ds-lockup--reversed" : ""
            }`}
        >
            <BrandMark size={props.size ?? 28} />
            <span class="ds-lockup__name-serif">Antaeus</span>
        </span>
    );
}
