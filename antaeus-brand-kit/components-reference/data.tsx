import type { ComponentChildren, JSX } from "preact";

/**
 * Data & structure primitives (03 §4.1).
 *
 * Table is the intervention board's shape: many rows without becoming
 * a spreadsheet — generous row height, hairline rules only, and at
 * most ONE row breaking rank per the Offset rule. Progress is a
 * ladder of real milestones plus a readiness count — never a vanity
 * percent.
 */

export interface TableColumn {
    readonly key: string;
    readonly label: string;
    /** Right-align numerals. */
    readonly numeric?: boolean;
}

export interface TableRow {
    readonly id: string;
    readonly cells: Readonly<Record<string, ComponentChildren>>;
    /** The one row allowed to break rank (03 §2.4). */
    readonly offset?: boolean;
    readonly onSelect?: () => void;
    readonly selected?: boolean;
}

export function Table(props: {
    readonly columns: ReadonlyArray<TableColumn>;
    readonly rows: ReadonlyArray<TableRow>;
    readonly label: string;
}): JSX.Element {
    return (
        <table class="ds-table" aria-label={props.label}>
            <thead>
                <tr>
                    {props.columns.map((c) => (
                        <th
                            key={c.key}
                            class={c.numeric ? "ds-table__num" : undefined}
                        >
                            {c.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {props.rows.map((r) => (
                    <tr
                        key={r.id}
                        class={`${r.offset ? "ds-table__row--offset" : ""}${
                            r.selected ? " ds-table__row--selected" : ""
                        }`}
                        onClick={r.onSelect}
                        tabIndex={r.onSelect ? 0 : undefined}
                    >
                        {props.columns.map((c) => (
                            <td
                                key={c.key}
                                class={c.numeric ? "ds-table__num" : undefined}
                            >
                                {r.cells[c.key]}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export interface Milestone {
    readonly label: string;
    readonly done: boolean;
}

/**
 * Progress — a ladder of real milestones + the count ("4 of 7
 * ready"). The count names real things, never a percent.
 */
export function Progress(props: {
    readonly milestones: ReadonlyArray<Milestone>;
    /** The count sentence, supplied by the caller via t(). */
    readonly count: string;
    readonly label: string;
}): JSX.Element {
    return (
        <div class="ds-progress" aria-label={props.label}>
            <p class="ds-progress__count">{props.count}</p>
            <ol class="ds-progress__ladder">
                {props.milestones.map((m) => (
                    <li
                        key={m.label}
                        class={`ds-progress__step${
                            m.done ? " is-done" : ""
                        }`}
                    >
                        <span class="ds-progress__mark" aria-hidden="true">
                            {m.done ? "✓" : ""}
                        </span>
                        {m.label}
                    </li>
                ))}
            </ol>
        </div>
    );
}
