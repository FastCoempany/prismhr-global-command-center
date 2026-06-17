import type { ComponentChildren, JSX } from "preact";
import { t } from "@/lib/voice/t";
import { Icon, type IconName } from "@/icons";
import type { AccentRole, DataState } from "./contract";
import { Gauge, Heading, Kicker } from "./display";

/**
 * Card — the Grounded primitive (03 §2.3): the card has gravity. It
 * carries weight through TWO devices — a **gauge** (the 3px left rule)
 * AND an **anchored edge** (the 3px bottom rule), both in the color of
 * the work's state. Color is rationed: a card at rest with no `tone`
 * carries a quiet neutral edge, and color is spent only where state is
 * real (the same discipline as the gauge).
 *
 * At most ONE card per zone breaks rank as `offset` (03 §2.4): its tag
 * sits *outside* the card at top-left, the card lifts with a heavier
 * shadow and an orange anchored edge, and its action extends *below*
 * the card's bottom border — the eye's single guaranteed landing place.
 *
 * The five data states (03 §4.4) are part of the component, not the
 * room: loading holds the silhouette; empty is directional (why it
 * matters + one move); error is honest and recoverable; unsaved work
 * carries the quiet amber marker so a save is never ambiguous.
 */

export interface CardProps {
    readonly kicker?: string;
    /**
     * The object's glyph (spec 09), rendered beside the kicker. Sacred
     * nouns carry their own mark — a deal card wears the deal glyph, a
     * signal the signal glyph. Aria-hidden: it sits next to the kicker
     * text, which names it.
     */
    readonly icon?: IconName;
    readonly title?: string;
    readonly tone?: AccentRole;
    readonly offset?: boolean;
    /** Offset only: the tag that sits outside the card, top-left. */
    readonly offsetTag?: string;
    /**
     * The ambient pulse (spec 08 §3.6): a single shimmer dot beside the
     * offset tag marking the most-pressured object. Exactly one per
     * surface — only the surface's top-ranked offset card sets it.
     */
    readonly pulse?: boolean;
    readonly state?: DataState;
    /** Empty state: why the surface matters, in a sentence. */
    readonly emptyWhy?: string;
    /** Empty state: the one move that fills it. */
    readonly emptyMove?: JSX.Element;
    /** Error state: what happened + how to recover, plain words. */
    readonly errorText?: string;
    readonly errorRetry?: JSX.Element;
    readonly unsaved?: boolean;
    readonly children?: ComponentChildren;
    readonly footer?: ComponentChildren;
}

export function Card(props: CardProps): JSX.Element {
    const state = props.state ?? "ready";

    if (state === "empty") {
        return (
            <section class="ds-empty">
                {props.kicker ? <Kicker>{props.kicker}</Kicker> : null}
                {props.emptyWhy ? (
                    <p class="ds-empty__why">{props.emptyWhy}</p>
                ) : null}
                {props.emptyMove ?? null}
            </section>
        );
    }

    if (state === "error") {
        return (
            <section class="ds-error" role="alert">
                <span>{props.errorText}</span>
                {props.errorRetry ?? null}
            </section>
        );
    }

    // The anchored edge (03 §2.3): a quiet neutral edge at rest, the
    // role color where state is real. Offset forces the orange edge.
    const edge = props.offset ? "orange" : props.tone;

    const card = (
        <article
            class={`ds-card${props.offset ? " ds-card--offset" : ""}${
                edge ? ` ds-card--edge-${edge}` : ""
            }${state === "loading" ? " ds-card--loading" : ""}`}
            aria-busy={state === "loading"}
        >
            <Gauge tone={props.tone} />
            <div class="ds-card__body">
                {props.icon || props.kicker ? (
                    <div class="ds-card__kicker-row">
                        {props.icon ? (
                            <span class="ds-card__icon">
                                <Icon name={props.icon} size={16} />
                            </span>
                        ) : null}
                        {props.kicker ? <Kicker>{props.kicker}</Kicker> : null}
                    </div>
                ) : null}
                {props.title ? (
                    <div class="ds-card__head">
                        <Heading level="title">{props.title}</Heading>
                        {props.unsaved ? (
                            <span class="ds-card__unsaved">
                                {t("Unsaved changes")}
                            </span>
                        ) : null}
                    </div>
                ) : null}
                {props.children}
                {props.footer ? (
                    <footer class="ds-card__foot">{props.footer}</footer>
                ) : null}
            </div>
        </article>
    );

    // Offset (03 §2.4): the tag sits OUTSIDE the card, top-left; the
    // action extends BELOW the bottom border (the foot's offset
    // treatment lives in components.css). The wrapper carries the tag.
    if (props.offset) {
        return (
            <div class="ds-offset">
                {props.offsetTag || props.pulse ? (
                    <span class="ds-offset__tag">
                        {props.pulse ? (
                            <span class="ds-pulse-dot" aria-hidden="true" />
                        ) : null}
                        {props.offsetTag}
                    </span>
                ) : null}
                {card}
            </div>
        );
    }

    return card;
}
