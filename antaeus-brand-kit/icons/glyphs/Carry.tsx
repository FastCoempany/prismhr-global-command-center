/**
 * Carry — "carry" glyph. GENERATED — do not hand-edit; the
 * iconography mockup is the master and the generator propagates it
 * (tools/design-system/generate-icons.py). Spec 09 construction:
 * 24px grid, 2px keyline, flat terminals, miter joins — the
 * Grounded-A construction, confirmed by brand round 1 (2026-06-12).
 */
import type { GlyphProps } from "../glyph";

export function CarryGlyph({ size }: GlyphProps) {
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
            <path d="M3 12h13"/><path d="M12 7l6 5-6 5" stroke="var(--ds-icon-accent, currentColor)"/>
        </svg>
    );
}
