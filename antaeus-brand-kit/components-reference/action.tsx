import type { ComponentChildren, JSX } from "preact";
import { Icon, type IconName } from "@/icons";

/**
 * Action primitives (03 §4.1 Action).
 *
 * Variant discipline: `accent` is the ONE dominant move per surface
 * (orange is rationed — once, where the meaning is); `primary` is
 * navy for a surface's strong-but-not-dominant move; `secondary` is
 * outlined; `ghost` recedes. Six interaction states per 03 §4.8 are
 * carried by components.css; `disabledWhy` carries the reason a dead
 * control is dead, because a dead control with no explanation is a
 * dead end.
 */

export type ButtonVariant = "accent" | "primary" | "secondary" | "ghost";

export function Button(props: {
    readonly variant?: ButtonVariant;
    readonly children: ComponentChildren;
    readonly onClick?: () => void;
    readonly disabled?: boolean;
    /** Plain-words reason shown beside a disabled control (03 §4.8). */
    readonly disabledWhy?: string;
    readonly type?: "button" | "submit";
}): JSX.Element {
    const btn = (
        <button
            type={props.type ?? "button"}
            class={`ds-btn ds-btn--${props.variant ?? "secondary"}`}
            onClick={props.onClick}
            disabled={props.disabled}
        >
            {props.children}
        </button>
    );
    if (props.disabled && props.disabledWhy) {
        return (
            <span style="display:inline-flex;align-items:center;gap:10px">
                {btn}
                <span class="ds-btn__why">{props.disabledWhy}</span>
            </span>
        );
    }
    return btn;
}

export function IconButton(props: {
    readonly icon: IconName;
    /** Accessible name — required; an icon alone names nothing. */
    readonly label: string;
    readonly onClick?: () => void;
    readonly disabled?: boolean;
}): JSX.Element {
    return (
        <button
            type="button"
            class="ds-iconbtn"
            aria-label={props.label}
            title={props.label}
            onClick={props.onClick}
            disabled={props.disabled}
        >
            <Icon name={props.icon} size={16} />
        </button>
    );
}

/** Cross-room link — blue, the system-intelligence role. */
export function CrossRoomLink(props: {
    readonly href: string;
    readonly children: ComponentChildren;
}): JSX.Element {
    return (
        <a class="ds-link" href={props.href}>
            {props.children}
        </a>
    );
}

/**
 * Toggle — persists immediately, no Save (03 §4.1). The on-state is
 * the selected interaction state, carried by orange.
 */
export function Toggle(props: {
    readonly pressed: boolean;
    readonly onToggle: (next: boolean) => void;
    /** Accessible name for the switch. */
    readonly label: string;
    readonly disabled?: boolean;
}): JSX.Element {
    return (
        <button
            type="button"
            class="ds-toggle"
            role="switch"
            aria-checked={props.pressed}
            aria-pressed={props.pressed}
            aria-label={props.label}
            disabled={props.disabled}
            onClick={() => props.onToggle(!props.pressed)}
        />
    );
}
