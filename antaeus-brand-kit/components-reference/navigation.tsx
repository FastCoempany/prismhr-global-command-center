import type { ComponentChildren, JSX } from "preact";
import { signal } from "@preact/signals";
import { t } from "@/lib/voice/t";
import { openPalette } from "@/lib/palette/Palette";
import { BrandLockup } from "./brand";
import { Heading } from "./display";

/**
 * Navigation primitives (03 Part III). The rail is dead; the
 * Wayfinder bar is the locked un-nav primitive (Approach A): the mark
 * as the home affordance, the room crumb, and the summoned Ctrl+K —
 * never a hallway of doors. SegmentedControl is in-room lenses onto
 * one object, never a door between rooms.
 */

/**
 * One crumb in the Trail cell — a prior surface the operator passed
 * through, read from the continuity params the HandoffStrips write.
 */
export interface WayfinderCrumb {
    readonly label: string;
    readonly href: string;
}

/**
 * The Pulling cell's content (03 §3.2): what the system sees next —
 * one move as a serif verb + a plain-sentence object, with an orange
 * gauge down the cell's left edge (the only orange on the bar) and a
 * `Why` that grows the bar's reasoning inline. `why` is the reasoning
 * body (Signal · Reason · Move grammar); absent = no Why affordance.
 * Skipping sends nothing — the agency line (spec 04 §1.2).
 */
export interface WayfinderPull {
    /** The serif verb — "Send", "Recover", "Cast". */
    readonly verb: string;
    /** The plain-sentence object the verb acts on. */
    readonly object: string;
    /** Taking the move (or jumping to its object). */
    readonly href: string;
    /** The inline reasoning, shown when the operator clicks Why. */
    readonly why?: ComponentChildren;
}

/**
 * The Wayfinder bar (03 §3.2) — the locked un-nav. One thin strip
 * across the top of every surface, in three cells plus a Ctrl+K key:
 *
 *   Trail   — where you were (the breadcrumb of continuity params)
 *   Here    — where you are (the room + its one-line state)
 *   Pulling — what the system sees next (one move, orange gauge, Why)
 *
 * The bar travels with the operator across rooms. The Pulling cell is
 * the ADR-011 Birdseye Float promoted to the bar — there is no corner
 * icon. `Why` grows the reasoning downward in place, never a popover,
 * never a route change; Skip closes it and sends nothing.
 */
/** Wayfinder Why-disclosure open state (one bar per page; module-level
 * signal matching the palette pattern — no hooks in this leaf). */
const wayfinderWhyOpen = signal(false);

export function WayfinderBar(props: {
    /** The current room, as the mono crumb — e.g. "DASHBOARD". */
    readonly room: string;
    /** Optional contextual tail after the room name (the one-line state). */
    readonly tail?: string;
    readonly homeHref?: string;
    /** The Trail cell — surfaces the operator passed through to get here. */
    readonly trail?: ReadonlyArray<WayfinderCrumb>;
    /** The Pulling cell — the system's one next move. */
    readonly pulling?: WayfinderPull;
}): JSX.Element {
    const whyOpen = wayfinderWhyOpen.value;
    const pull = props.pulling;

    return (
        <div class="ds-wayfinder-shell">
            <nav class="ds-wayfinder" aria-label={t("Wayfinder")}>
                <a
                    class="ds-wayfinder__mark"
                    href={props.homeHref ?? "/dashboard/"}
                    aria-label={t("Home")}
                >
                    <BrandLockup size={20} />
                </a>
                {props.trail && props.trail.length > 0 ? (
                    <span class="ds-wayfinder__trail" aria-label={t("Trail")}>
                        {props.trail.map((c) => (
                            <a key={c.href} class="ds-wayfinder__trail-crumb" href={c.href}>
                                {c.label}
                            </a>
                        ))}
                    </span>
                ) : null}
                <span class="ds-wayfinder__crumb">
                    {props.room}
                    {props.tail ? ` · ${props.tail}` : ""}
                </span>
                <span class="ds-wayfinder__spacer" />
                {pull ? (
                    <a class="ds-wayfinder__pulling" href={pull.href}>
                        <span class="ds-wayfinder__pulling-gauge" aria-hidden="true" />
                        <span class="ds-wayfinder__pulling-verb">{pull.verb}</span>
                        <span class="ds-wayfinder__pulling-object">{pull.object}</span>
                    </a>
                ) : null}
                {pull?.why ? (
                    <button
                        type="button"
                        class="ds-wayfinder__why"
                        aria-expanded={whyOpen}
                        onClick={() => { wayfinderWhyOpen.value = !wayfinderWhyOpen.value; }}
                    >
                        {t("Why")} {whyOpen ? "▴" : "▾"}
                    </button>
                ) : null}
                <button
                    type="button"
                    class="ds-wayfinder__k"
                    onClick={() => openPalette()}
                    title={t("Go anywhere — rooms and skills", { class: "body" })}
                >
                    ⌘K
                </button>
            </nav>
            {pull?.why && whyOpen ? (
                <div class="ds-wayfinder__why-panel">
                    {pull.why}
                    <div class="ds-wayfinder__why-commit">
                        <a class="ds-btn ds-btn--accent" href={pull.href}>
                            {pull.verb} · {pull.object}
                        </a>
                        <button
                            type="button"
                            class="ds-btn ds-btn--ghost"
                            onClick={() => { wayfinderWhyOpen.value = false; }}
                        >
                            {t("Skip — stay here")}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function SegmentedControl<T extends string>(props: {
    readonly options: ReadonlyArray<{ readonly key: T; readonly label: string }>;
    readonly active: T;
    readonly onChange: (next: T) => void;
    readonly label: string;
}): JSX.Element {
    return (
        <div class="ds-seg" role="group" aria-label={props.label}>
            {props.options.map((o) => (
                <button
                    key={o.key}
                    type="button"
                    class="ds-seg__btn"
                    aria-pressed={o.key === props.active}
                    onClick={() => props.onChange(o.key)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/**
 * HandoffStrip — routing onward (03 §3.4). At the bottom of a room, it
 * carries the verb-shape cross-room routes the room flows out to
 * (canon §6): one primary (orange), the rest secondary. Each route's
 * href threads the continuity params (the caller builds them); the
 * strip just renders them. This is the loop-transformation doctrine
 * (canon Part III §7) rendered as a component — a room ends without
 * ending the work.
 */
export interface HandoffRoute {
    readonly label: string;
    readonly href: string;
    /** Exactly one route should be primary (orange). */
    readonly primary?: boolean;
    /** Continuity-param breadcrumb hook for the destination banner. */
    readonly dataHandoff?: string;
}

export function HandoffStrip(props: {
    readonly kicker: string;
    readonly title: string;
    readonly sub?: string;
    readonly routes: ReadonlyArray<HandoffRoute>;
    readonly label: string;
}): JSX.Element {
    return (
        <section class="ds-handoff" aria-label={props.label}>
            <header class="ds-handoff__head">
                <p class="ds-kicker">{props.kicker}</p>
                <Heading level="title">{props.title}</Heading>
                {props.sub ? <p class="ds-handoff__sub">{props.sub}</p> : null}
            </header>
            <nav class="ds-handoff__routes" aria-label={props.label}>
                {props.routes.map((r) => (
                    <a
                        key={r.href + r.label}
                        class={`ds-btn ds-btn--${r.primary ? "accent" : "secondary"}`}
                        href={r.href}
                        data-handoff={r.dataHandoff}
                    >
                        {r.label}
                    </a>
                ))}
            </nav>
        </section>
    );
}
