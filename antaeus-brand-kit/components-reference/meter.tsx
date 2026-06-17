import type { JSX } from "preact";
import type { AccentRole } from "./contract";

/**
 * Meter — the ONE data-viz primitive the language admits (03 §4.5).
 *
 * A single horizontal bar for one bounded ratio, ALWAYS paired with
 * the sentence that carries the read. The bar shows the magnitude;
 * the sentence is the value. Everything else — multi-series charts,
 * pies, sparklines, decorative gauges — is refused; a surface that
 * needs them is trying to be a BI dashboard, which is a hard reject.
 */
export function Meter(props: {
    /** 0..1 ratio of the bounded quantity. Clamped. */
    readonly ratio: number;
    /** The sentence that carries the read. Required — no bare bars. */
    readonly read: string;
    readonly tone?: AccentRole;
    readonly label?: string;
}): JSX.Element {
    const pct = Math.round(Math.min(1, Math.max(0, props.ratio)) * 100);
    return (
        <div class={`ds-meter${props.tone ? ` ds-meter--${props.tone}` : ""}`}>
            <div
                class="ds-meter__track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={props.label}
            >
                <div class="ds-meter__fill" style={{ width: `${pct}%` }} />
            </div>
            <p class="ds-meter__read">{props.read}</p>
        </div>
    );
}
