import type { ComponentChildren, JSX } from "preact";
import { t } from "@/lib/voice/t";
import type { IconName } from "@/icons";
import { Button } from "./action";
import { Card } from "./card";
import { Kicker } from "./display";

/**
 * System cards (03 §4.1 System) — compositions of the core that carry
 * a specific cross-room shape.
 *
 * PatternCard is the Briefing's read: an authored claim, its
 * evidence, and how sure the system is — stated plainly, never
 * hedged into mush (01 §2.4). ProposalCard is the Phase F surface:
 * what the system noticed, what would change, and the operator's
 * three moves (accept / snooze / dismiss) — bounded self-modification
 * stays bounded by acceptance. ReadinessReadout is a plain-sentence
 * state — never a score bar, never a container noun.
 */

export function PatternCard(props: {
    /** The authored read — one to three sentences. */
    readonly claim: string;
    readonly evidence: ReadonlyArray<string>;
    /** How sure the system is, as a plain phrase. */
    readonly howSure: string;
    readonly kicker?: string;
    readonly moves?: ComponentChildren;
}): JSX.Element {
    return (
        <Card kicker={props.kicker ?? t("THE SYSTEM'S READ")} tone="blue">
            <p class="ds-card__copy ds-pattern__claim">{props.claim}</p>
            <ul class="ds-pattern__evidence">
                {props.evidence.map((e) => (
                    <li key={e}>{e}</li>
                ))}
            </ul>
            <p class="ds-pattern__sure">{props.howSure}</p>
            {props.moves ? (
                <footer class="ds-card__foot">{props.moves}</footer>
            ) : null}
        </Card>
    );
}

export function ProposalCard(props: {
    /** What the system noticed, as a peer would say it. */
    readonly noticed: string;
    /** What would change if the operator says yes. */
    readonly change: string;
    readonly onAccept: () => void;
    readonly onSnooze: () => void;
    readonly onDismiss: () => void;
    readonly busy?: boolean;
}): JSX.Element {
    return (
        <Card kicker={t("THE SYSTEM HAS A SUGGESTION")} tone="orange">
            <p class="ds-card__copy">{props.noticed}</p>
            <p class="ds-card__copy ds-proposal__change">{props.change}</p>
            <footer class="ds-card__foot">
                <Button
                    variant="accent"
                    onClick={props.onAccept}
                    disabled={props.busy}
                >
                    {t("Yes, make that change")}
                </Button>
                <Button variant="ghost" onClick={props.onSnooze} disabled={props.busy}>
                    {t("Ask me again in a month")}
                </Button>
                <Button variant="ghost" onClick={props.onDismiss} disabled={props.busy}>
                    {t("Not now")}
                </Button>
            </footer>
        </Card>
    );
}

/**
 * ReadinessReadout — the state as one plain sentence the operator can
 * act on. The state name leads; the sentence carries the value.
 */
export function ReadinessReadout(props: {
    /** The gate-based state name, e.g. "Inheritable with guardrails". */
    readonly state: string;
    /** The one-sentence read under it. */
    readonly read: string;
}): JSX.Element {
    return (
        <div class="ds-readiness">
            <Kicker>{t("READINESS")}</Kicker>
            <p class="ds-readiness__state">{props.state}</p>
            <p class="ds-readiness__read">{props.read}</p>
        </div>
    );
}

/**
 * RiskCard — a Grounded card at recovery scale (03 §4.1 System). The
 * Dashboard's risk slice and the Deal Workspace recovery queue render
 * one of these per decaying object: the account, the cause, a risk
 * score, and the act-or-inspect moves. Sarah's hand-reach intent on a
 * risk card is to OPEN the object at the gate that's broken, so the
 * primary action is the operator's verb, not a label.
 */
export function RiskCard(props: {
    /** The object under pressure — usually an account or deal name. */
    readonly title: string;
    /** The cause, in plain words ("Champion quiet for twelve days"). */
    readonly cause: string;
    /** Risk score, shown as a serif numeral. */
    readonly score: number;
    readonly kicker?: string;
    /** The object's glyph; defaults to the at-risk mark. */
    readonly icon?: IconName;
    /**
     * The corrective route (Diagnosis Table law — the next move is
     * obvious). Rendered as the move line under the cause.
     */
    readonly move?: string;
    /** red = real risk / intervention; amber = at-risk caution. Default red. */
    readonly tone?: "red" | "amber";
    /** The dominant move (orange) + any secondary moves. */
    readonly actions: ComponentChildren;
}): JSX.Element {
    return (
        <Card
            kicker={props.kicker ?? t("AT RISK")}
            icon={props.icon ?? "at-risk"}
            title={props.title}
            tone={props.tone ?? "red"}
            footer={props.actions}
        >
            <div class="ds-card__head">
                <p class="ds-riskcard__cause">{props.cause}</p>
                <span class="ds-riskcard__score">{Math.round(props.score)}</span>
            </div>
            {props.move ? <p class="ds-riskcard__move">{props.move}</p> : null}
        </Card>
    );
}
