import type { ComponentChildren, JSX } from "preact";
import type { AccentRole } from "./contract";

/**
 * Display primitives (03 §4.1 Display).
 *
 * Family: these are leaves — they inherit the family of the surface
 * that composes them. Voice: every string arrives already declared
 * through t() by the caller; display components never invent operator
 * copy. The compression rule (00): one serif step carries the argument
 * per surface; sans carries the work; mono recedes.
 */

export function Kicker(props: {
    readonly children: ComponentChildren;
}): JSX.Element {
    return <p class="ds-kicker">{props.children}</p>;
}

export type HeadingLevel = "display" | "title" | "control";

export function Heading(props: {
    readonly level: HeadingLevel;
    readonly children: ComponentChildren;
    /** The rendered tag — defaults follow the type ramp. */
    readonly as?: "h1" | "h2" | "h3" | "h4";
}): JSX.Element {
    const Tag =
        props.as ??
        (props.level === "display" ? "h1" : props.level === "title" ? "h2" : "h3");
    return <Tag class={`ds-heading--${props.level}`}>{props.children}</Tag>;
}

/** Serif numeral + mono label. The stat is a fact, not a chart. */
export function Stat(props: {
    readonly value: string | number;
    readonly label: string;
}): JSX.Element {
    return (
        <div class="ds-stat">
            <span class="ds-stat__value">{props.value}</span>
            <span class="ds-stat__label">{props.label}</span>
        </div>
    );
}

/**
 * StatusChip — carries the canon Part III §10 state vocabulary.
 * The tone is semantic (00 Part II §3): green = real health only,
 * amber = caution, red = real risk. No tone = neutral ink.
 */
export function StatusChip(props: {
    readonly label: string;
    readonly tone?: AccentRole;
}): JSX.Element {
    return (
        <span class={`ds-chip${props.tone ? ` ds-chip--${props.tone}` : ""}`}>
            {props.label}
        </span>
    );
}

/**
 * The gauge — the card's left state-rule. Carries state as color;
 * it is the one place a card wears its condition (03 §2.3). No tone
 * renders the quiet ink rule.
 */
export function Gauge(props: { readonly tone?: AccentRole }): JSX.Element {
    return (
        <span
            class={`ds-gauge${props.tone ? ` ds-gauge--${props.tone}` : ""}`}
            aria-hidden="true"
        />
    );
}

/**
 * Stamp — a judgment, hairline-bracketed (03 §4.1). For settled
 * reads ("CORRECTED", "LEFT ALONE"), not status churn.
 */
export function Stamp(props: {
    readonly children: ComponentChildren;
    readonly tone?: AccentRole;
}): JSX.Element {
    return (
        <span class={`ds-stamp${props.tone ? ` ds-stamp--${props.tone}` : ""}`}>
            {props.children}
        </span>
    );
}

/**
 * Avatar — initials, never photos (03 §4.1). Orange marks the
 * decider, blue the advisor; everyone else is ink.
 */
export function Avatar(props: {
    readonly name: string;
    readonly role?: "decider" | "advisor";
}): JSX.Element {
    const initials = props.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
    const tone =
        props.role === "decider"
            ? " ds-avatar--orange"
            : props.role === "advisor"
              ? " ds-avatar--blue"
              : "";
    return (
        <span class={`ds-avatar${tone}`} title={props.name} aria-label={props.name}>
            {initials}
        </span>
    );
}
