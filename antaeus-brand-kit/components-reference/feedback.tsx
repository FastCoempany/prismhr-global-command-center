import type { ComponentChildren, JSX } from "preact";
import { useEffect } from "preact/hooks";
import { t } from "@/lib/voice/t";
import { densityState, showsAnnotations } from "@/lib/density";
import type { DensityState } from "./contract";

/**
 * Feedback & overlay primitives (03 §4.1).
 *
 * Toast confirms a save and names what changed downstream (the caller
 * supplies that sentence — canon rule 5). Alert is one read + one
 * move, side-glow toned amber/blue/red by state. Drawer is depth over
 * the page, never a route change; Esc, scrim, and the close button
 * all close it. Modal is for destructive confirmations only.
 */

export function Toast(props: {
    readonly children: ComponentChildren;
}): JSX.Element {
    return (
        <div class="ds-toast" role="status" aria-live="polite">
            {props.children}
        </div>
    );
}

export type AlertTone = "amber" | "blue" | "red";

export function Alert(props: {
    readonly tone?: AlertTone;
    /** The one read — a sentence, not a paragraph stack. */
    readonly children: ComponentChildren;
    /** The one move. */
    readonly move?: JSX.Element;
}): JSX.Element {
    const tone = props.tone ?? "amber";
    return (
        <div
            class={`ds-alert${tone !== "amber" ? ` ds-alert--${tone}` : ""}`}
            role={tone === "red" ? "alert" : "status"}
        >
            <span>{props.children}</span>
            {props.move ? <span class="ds-alert__move">{props.move}</span> : null}
        </div>
    );
}

function useEscape(onClose: () => void): void {
    useEffect(() => {
        function onKey(e: KeyboardEvent): void {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);
}

export function Drawer(props: {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly label: string;
    readonly children: ComponentChildren;
}): JSX.Element | null {
    useEscape(props.onClose);
    if (!props.open) return null;
    return (
        <div class="ds-drawer" role="dialog" aria-modal="true" aria-label={props.label}>
            <div class="ds-scrim" onClick={props.onClose} aria-hidden="true" />
            <aside class="ds-drawer__panel">{props.children}</aside>
        </div>
    );
}

/** Destructive confirmations only (03 §4.1). */
export function Modal(props: {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly label: string;
    readonly children: ComponentChildren;
    /** The destructive move — caller supplies an accent/red Button. */
    readonly confirm: JSX.Element;
}): JSX.Element | null {
    useEscape(props.onClose);
    if (!props.open) return null;
    return (
        <div class="ds-modal" role="dialog" aria-modal="true" aria-label={props.label}>
            <div class="ds-scrim" onClick={props.onClose} aria-hidden="true" />
            <div class="ds-modal__panel">
                {props.children}
                <div class="ds-modal__actions">
                    <button
                        type="button"
                        class="ds-btn ds-btn--ghost"
                        onClick={props.onClose}
                    >
                        {t("Cancel")}
                    </button>
                    {props.confirm}
                </div>
            </div>
        </div>
    );
}

/**
 * Tooltip — hover help, present in Show me how and gone in Step back
 * (02). CSS-driven; the trigger stays keyboard-focusable.
 */
export function Tooltip(props: {
    readonly text: string;
    readonly children: ComponentChildren;
    readonly density?: DensityState;
}): JSX.Element {
    if (!showsAnnotations(props.density ?? densityState.value)) {
        return <>{props.children}</>;
    }
    return (
        <span class="ds-tooltip" tabIndex={0}>
            {props.children}
            <span class="ds-tooltip__bubble" role="tooltip">
                {props.text}
            </span>
        </span>
    );
}
