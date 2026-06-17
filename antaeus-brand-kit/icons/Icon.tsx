/**
 * <Icon> — the icon system's primary API (spec 09; decision #2,
 * confirmed 2026-06-08).
 *
 *   <Icon name="signal" />                      // 20px, blue tick (manifest default)
 *   <Icon name="send" size={16} />              // inline, orange tick
 *   <Icon name="account" label="Account" />     // icon-alone: accessible name required
 *
 * The wrapper resolves the glyph from the manifest, sets the rationed-
 * tick accent variable (the glyph's manifest default unless overridden),
 * and enforces the accessibility posture (03 §4.9 / 09 Part II): icons
 * are aria-hidden beside text; an icon standing alone carries `label`,
 * rendered as the accessible name. Color defaults to currentColor —
 * navy in normal ink contexts — so the icon inherits its surroundings.
 */
import type { JSX } from "preact";
import { DEFAULT_ACCENTS, GLYPHS, type IconName } from "./manifest";
import type { IconAccent, IconSize } from "./glyph";

export interface IconProps {
    readonly name: IconName;
    /** 16 inline · 20 default · 24 master (09 §4.1). */
    readonly size?: IconSize;
    /** Override the manifest's default rationed-tick color. Use rarely. */
    readonly accent?: IconAccent;
    /**
     * Accessible name, REQUIRED when the icon stands alone (no visible
     * text beside it). Omit when the icon sits next to its label.
     */
    readonly label?: string;
    readonly class?: string;
}

export function Icon({
    name,
    size = 20,
    accent,
    label,
    class: className,
}: IconProps): JSX.Element {
    const Glyph = GLYPHS[name];
    const resolvedAccent = accent ?? DEFAULT_ACCENTS[name];
    const style = resolvedAccent
        ? { "--ds-icon-accent": `var(--ds-${resolvedAccent})` }
        : undefined;
    return (
        <span
            class={className ? `ds-icon ${className}` : "ds-icon"}
            style={{ display: "inline-flex", ...style }}
            role={label ? "img" : undefined}
            aria-label={label}
        >
            <Glyph size={size} />
        </span>
    );
}
