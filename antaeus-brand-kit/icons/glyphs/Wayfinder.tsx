/**
 * Wayfinder — "Wayfinder" glyph. GENERATED — do not hand-edit; the
 * iconography mockup is the master and the generator propagates it
 * (tools/design-system/generate-icons.py). Spec 09 construction:
 * 24px grid, 2px keyline, flat terminals, miter joins — the
 * Grounded-A construction, confirmed by brand round 1 (2026-06-12).
 */
import type { GlyphProps } from "../glyph";

export function WayfinderGlyph({ size }: GlyphProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="butt"
            stroke-linejoin="miter"
        >
            <circle cx="5" cy="12" r="1.6"/><path d="M7 12h4"/><circle cx="12.6" cy="12" r="1.6"/><path d="M14.4 12h2.6"/><path d="M19 8v8" stroke="var(--ds-icon-accent, currentColor)"/>
        </svg>
    );
}
