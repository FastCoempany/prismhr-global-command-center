/**
 * Shared glyph types for the icon system (spec 09).
 *
 * A glyph component is pure SVG: 24px viewBox, 2px keyline, flat
 * terminals, miter joins, currentColor stroke. Accent paths inside a
 * glyph reference var(--ds-icon-accent); the Icon wrapper (Icon.tsx)
 * owns setting that variable, per the rationed-tick discipline
 * (09 §1.2) — one accent stroke at the active point, role-colored,
 * never decorative.
 */

/** The three sizes (09 §4.1): inline 16 · default 20 · master 24. */
export type IconSize = 16 | 20 | 24;

/** The role colors an accent may carry (00 Part II §3). */
export type IconAccent = "orange" | "blue" | "green" | "amber" | "red";

export interface GlyphProps {
    readonly size: IconSize;
}
