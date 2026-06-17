import type { JSX } from "preact";

/**
 * Input primitives (03 §4.1 Input).
 *
 * FormField composes label + control + microcopy; the microcopy is
 * the first thing the density gradient drops in Step back (02), so it
 * renders only in Show me how (the live density state by default). Inline
 * errors say what's needed in plain words and never lose the
 * operator's edits (03 §4.4 Error).
 */
import type { DensityState } from "./contract";
import { densityState, showsAnnotations } from "@/lib/density";

export function TextInput(props: {
    readonly value: string;
    readonly onInput: (next: string) => void;
    readonly placeholder?: string;
    readonly disabled?: boolean;
    readonly type?: "text" | "search" | "email" | "date";
    readonly id?: string;
}): JSX.Element {
    return (
        <input
            id={props.id}
            class="ds-input"
            type={props.type ?? "text"}
            value={props.value}
            placeholder={props.placeholder}
            disabled={props.disabled}
            onInput={(e) =>
                props.onInput((e.currentTarget as HTMLInputElement).value)
            }
        />
    );
}

export function Textarea(props: {
    readonly value: string;
    readonly onInput: (next: string) => void;
    readonly placeholder?: string;
    readonly rows?: number;
    readonly disabled?: boolean;
    readonly id?: string;
}): JSX.Element {
    return (
        <textarea
            id={props.id}
            class="ds-input ds-textarea"
            rows={props.rows ?? 3}
            value={props.value}
            placeholder={props.placeholder}
            disabled={props.disabled}
            onInput={(e) =>
                props.onInput((e.currentTarget as HTMLTextAreaElement).value)
            }
        />
    );
}

export function Select(props: {
    readonly value: string;
    readonly onChange: (next: string) => void;
    readonly options: ReadonlyArray<{
        readonly value: string;
        readonly label: string;
    }>;
    readonly disabled?: boolean;
    readonly id?: string;
}): JSX.Element {
    return (
        <select
            id={props.id}
            class="ds-input"
            value={props.value}
            disabled={props.disabled}
            onChange={(e) =>
                props.onChange((e.currentTarget as HTMLSelectElement).value)
            }
        >
            {props.options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}

export function FormField(props: {
    readonly label: string;
    readonly children: JSX.Element;
    /** Helper line under the control; dropped in Step back (02 §4.1). */
    readonly microcopy?: string;
    /** Inline error in plain words; renders in every density. */
    readonly error?: string;
    readonly density?: DensityState;
}): JSX.Element {
    const density = props.density ?? densityState.value;
    return (
        <label class={`ds-field${props.error ? " ds-field--error" : ""}`}>
            <span class="ds-field__label">{props.label}</span>
            {props.children}
            {props.error ? (
                <p class="ds-field__error" role="alert">
                    {props.error}
                </p>
            ) : props.microcopy && showsAnnotations(density) ? (
                <p class="ds-field__micro">{props.microcopy}</p>
            ) : null}
        </label>
    );
}
