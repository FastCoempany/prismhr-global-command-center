"use client";

// The Send-it digest's lines, with every count a door (the click-depth law;
// pass 10). "Inside it I found 3 commitments people made and 2 open
// questions." opens each kind to the claims it counts, each claim a door on
// to its passage; "The index grew: Pricing picked up 6." opens each row in
// the index pane, as picking it on the rail does. A digest stored before
// the doors were kept reads as words.

import { Fragment, useState, type ReactNode } from "react";
import {
  kindWords,
  topicWords,
  type DigestDoors,
  type DigestKind,
  type DigestTopic,
} from "@/lib/intranet/ledger";
import styles from "../command-center.module.css";

export type DoorClaim = { id: string; text: string; speaker: string; saidAt: string };

/** Each item said the way a person lists things, with its separators. */
function listed<T>(items: T[], one: (t: T, i: number) => ReactNode) {
  return items.map((t, i) => (
    <Fragment key={i}>
      {i > 0 && (items.length === 2 ? " and " : i === items.length - 1 ? ", and " : ", ")}
      {one(t, i)}
    </Fragment>
  ));
}

export function DigestLines({
  lines,
  doors,
  loadClaims,
  onDrill,
  onTopic,
  initial,
}: {
  lines: string[];
  doors?: DigestDoors;
  loadClaims: (ids: string[]) => Promise<DoorClaim[]>;
  onDrill: (claimId: string) => void;
  onTopic: (topic: DigestTopic) => void;
  /** A kind open on first paint with its claims, for the suite. */
  initial?: { kind: string; claims: DoorClaim[] };
}) {
  const [open, setOpen] = useState<string>(initial?.kind ?? "");
  const [claims, setClaims] = useState<Record<string, DoorClaim[]>>(
    initial ? { [initial.kind]: initial.claims } : {},
  );

  const toggle = (k: DigestKind) => {
    if (open === k.kind) {
      setOpen("");
      return;
    }
    setOpen(k.kind);
    if (!claims[k.kind])
      void loadClaims(k.claimIds).then((cs) =>
        setClaims((m) => ({ ...m, [k.kind]: cs })),
      );
  };

  const shown = open ? doors?.found?.kinds.find((k) => k.kind === open) : undefined;

  return (
    <ul className={styles.itRunLines}>
      {lines.map((l, i) =>
        doors?.found && l === doors.found.line ? (
          <li key={i}>
            Inside it I found{" "}
            {listed(doors.found.kinds, (k) => (
              <button
                type="button"
                className={styles.itDoor}
                aria-expanded={open === k.kind}
                title={`Show the ${k.word}`}
                onClick={() => toggle(k)}
              >
                {kindWords(k)}
              </button>
            ))}
            .
            {shown && (
              <div className={styles.itFold}>
                {(claims[shown.kind] ?? []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={styles.itCite}
                    onClick={() => onDrill(c.id)}
                  >
                    <span className={styles.itCiteBody}>
                      {c.text}
                      <span className={styles.itCiteMeta}>
                        {c.speaker || "unknown"} · {(c.saidAt ?? "").slice(0, 10)}
                      </span>
                    </span>
                  </button>
                ))}
                {!claims[shown.kind] && <span>Opening…</span>}
              </div>
            )}
          </li>
        ) : doors?.grew && l === doors.grew.line ? (
          <li key={i}>
            The index grew:{" "}
            {listed(doors.grew.topics, (t) => (
              <button
                type="button"
                className={styles.itDoor}
                title={`Open ${t.label} in the index`}
                onClick={() => onTopic(t)}
              >
                {topicWords(t)}
              </button>
            ))}
            .
          </li>
        ) : (
          <li key={i}>{l}</li>
        ),
      )}
    </ul>
  );
}
