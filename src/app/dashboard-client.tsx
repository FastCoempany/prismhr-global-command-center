"use client";

import { useState } from "react";
import type { DashCardRow } from "@/lib/dashboard/data";
import {
  DASH_NODES,
  LAST_NODE,
  stateWord,
  type DashNodeKey,
  type NodeState,
} from "@/lib/dashboard/stages";
import {
  advanceNode,
  deleteCard,
  moveCard,
  renameCard,
  saveCheckNote,
  saveLabels,
  saveNote,
  toggleArchive,
  toggleCheck,
} from "./dashboard/actions";
import styles from "./dashboard.module.css";

type Props = {
  cards: DashCardRow[];
  canWrite: boolean;
  dbUnavailable: boolean;
  labels: Record<string, string>;
};

const glyph = (state: NodeState) => (state === "done" ? "✓" : "");

function Track({
  card,
  canWrite,
  label,
  openKey,
  onToggle,
}: {
  card: DashCardRow;
  canWrite: boolean;
  label: (key: DashNodeKey) => string;
  openKey: DashNodeKey | null;
  onToggle: (key: DashNodeKey) => void;
}) {
  return (
    <div className={styles.track}>
      {DASH_NODES.map((n, i) => {
        const state = card.states[n.key];
        const prevDone = i > 0 && card.states[DASH_NODES[i - 1].key] === "done";
        const selfDone = state === "done";
        const heat =
          state === "done" || state === "active"
            ? ({ "--heat": n.heat } as React.CSSProperties)
            : undefined;
        const done = card.checks[n.key].filter(Boolean).length;
        const total = n.checklist.length;
        return (
          <div key={n.key} className={styles.cell}>
            <div className={styles.nodeRow}>
              {i > 0 && (
                <span className={`${styles.line} ${styles.lineLeft} ${prevDone ? styles.lineOn : ""}`} />
              )}
              {i < LAST_NODE && (
                <span className={`${styles.line} ${styles.lineRight} ${selfDone ? styles.lineOn : ""}`} />
              )}
              {canWrite ? (
                <form action={advanceNode} className={styles.nodeForm}>
                  <input type="hidden" name="cardId" value={card.id} />
                  <input type="hidden" name="node" value={n.key} />
                  <button
                    type="submit"
                    className={`${styles.node} ${styles[state]}`}
                    style={heat}
                    title={`${label(n.key)} — ${stateWord(state)} (override: click to advance)`}
                    aria-label={`${label(n.key)}: ${stateWord(state)}. Override — click to advance.`}
                  >
                    <span className={styles.glyph}>{glyph(state)}</span>
                  </button>
                </form>
              ) : (
                <span
                  className={`${styles.node} ${styles[state]}`}
                  style={heat}
                  role="img"
                  aria-label={`${label(n.key)}: ${stateWord(state)}`}
                >
                  <span className={styles.glyph}>{glyph(state)}</span>
                </span>
              )}
            </div>
            <button
              type="button"
              className={`${styles.burger} ${openKey === n.key ? styles.burgerOn : ""}`}
              onClick={() => onToggle(n.key)}
              aria-expanded={openKey === n.key}
              aria-label={`${label(n.key)} checklist (${done}/${total})`}
              title={`${done}/${total} done`}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardClient({ cards, canWrite, dbUnavailable, labels }: Props) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [openNode, setOpenNode] = useState<{ card: string; node: DashNodeKey } | null>(null);
  const [openNote, setOpenNote] = useState<{ card: string; node: DashNodeKey; index: number } | null>(
    null,
  );

  const label = (key: DashNodeKey) => labels[key] || DASH_NODES.find((n) => n.key === key)!.label;

  const active = cards.filter((c) => !c.archived);
  const archived = cards.filter((c) => c.archived);

  const toggleNode = (card: string, node: DashNodeKey) =>
    setOpenNode((o) => (o && o.card === card && o.node === node ? null : { card, node }));

  return (
    <div className={styles.board}>
      {canWrite && (
        <div className={styles.toolbar}>
          <button type="button" className={styles.miniBtn} onClick={() => setShowRename((v) => !v)}>
            {showRename ? "Close" : "Rename stages"}
          </button>
          {showRename && (
            <form action={saveLabels} className={styles.renameStages}>
              {DASH_NODES.map((n) => (
                <input key={n.key} name={`label_${n.key}`} defaultValue={label(n.key)} aria-label={`${n.label} label`} />
              ))}
              <button type="submit" className={styles.miniSave}>
                Save labels
              </button>
            </form>
          )}
        </div>
      )}

      <div className={styles.headRow}>
        <div className={styles.nameCol} />
        <div className={styles.track}>
          {DASH_NODES.map((n) => (
            <div key={n.key} className={styles.headCell}>
              {label(n.key)}
            </div>
          ))}
        </div>
      </div>

      {active.length === 0 && (
        <div className={styles.empty}>
          {dbUnavailable
            ? "Run docs/dashboard-tables.sql in Supabase, then add accounts from the Account Room."
            : "No accounts yet — open the Account Room and use “+ Dashboard” to add them here."}
        </div>
      )}

      {active.map((card) => {
        const open = openNode?.card === card.id ? openNode.node : null;
        const openN = open ? DASH_NODES.find((n) => n.key === open)! : null;
        return (
          <div key={card.id} className={styles.block}>
            <div className={styles.row}>
              <div className={styles.nameCol}>
                {renaming === card.id ? (
                  <form action={renameCard} className={styles.renameForm}>
                    <input type="hidden" name="id" value={card.id} />
                    <input name="name" defaultValue={card.name} required aria-label="Account name" />
                    <input name="subtitle" defaultValue={card.subtitle ?? ""} placeholder="Note / CSM" aria-label="Subtitle" />
                    <div className={styles.renameRow}>
                      <button type="submit" className={styles.miniSave}>Save</button>
                      <button type="button" className={styles.miniBtn} onClick={() => setRenaming(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className={styles.name}>{card.name}</div>
                    {card.subtitle && <div className={styles.meta}>{card.subtitle}</div>}
                    {canWrite && (
                      <div className={styles.manage}>
                        <form action={moveCard} className={styles.inlineForm}>
                          <input type="hidden" name="id" value={card.id} />
                          <button name="dir" value="up" className={styles.miniBtn} aria-label="Move up">↑</button>
                          <button name="dir" value="down" className={styles.miniBtn} aria-label="Move down">↓</button>
                        </form>
                        <button type="button" className={styles.miniBtn} onClick={() => setRenaming(card.id)}>Rename</button>
                        <form action={toggleArchive} className={styles.inlineForm}>
                          <input type="hidden" name="id" value={card.id} />
                          <button className={styles.miniBtn} aria-label="Archive">Archive</button>
                        </form>
                        <form action={deleteCard} className={styles.inlineForm}>
                          <input type="hidden" name="id" value={card.id} />
                          <button className={styles.miniDel} aria-label="Delete account">Delete</button>
                        </form>
                      </div>
                    )}
                  </>
                )}
              </div>
              <Track
                card={card}
                canWrite={canWrite}
                label={label}
                openKey={open}
                onToggle={(k) => toggleNode(card.id, k)}
              />
            </div>

            {openN && (
              <div className={styles.checklistPanel}>
                <div className={styles.panelHead}>
                  <strong>{label(openN.key)}</strong>
                  <span className={styles.progress}>
                    {card.checks[openN.key].filter(Boolean).length}/{openN.checklist.length} done —
                    all checked lights the stage
                  </span>
                  <button
                    type="button"
                    className={styles.drillClose}
                    onClick={() => setOpenNode(null)}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                {(canWrite || card.notes[openN.key]) && (
                  <form action={saveNote} className={styles.generalNote}>
                    <input type="hidden" name="cardId" value={card.id} />
                    <input type="hidden" name="node" value={openN.key} />
                    {canWrite ? (
                      <textarea
                        name="note"
                        defaultValue={card.notes[openN.key]}
                        placeholder="Context for this stage (research, partner notes)…"
                        aria-label={`${label(openN.key)} context note`}
                        className={styles.noteArea}
                      />
                    ) : (
                      <p className={styles.noteRead}>{card.notes[openN.key]}</p>
                    )}
                    {canWrite && (
                      <button type="submit" className={styles.miniSave}>Save context</button>
                    )}
                  </form>
                )}

                <ul className={styles.checkList}>
                  {openN.checklist.map((item, i) => {
                    const checked = card.checks[openN.key][i];
                    const noteOpen =
                      openNote?.card === card.id && openNote.node === openN.key && openNote.index === i;
                    const existing = card.checkNotes[openN.key][i] ?? "";
                    return (
                      <li key={i} className={styles.checkItem}>
                        <div className={styles.checkRow}>
                          {canWrite ? (
                            <form action={toggleCheck} className={styles.inlineForm}>
                              <input type="hidden" name="cardId" value={card.id} />
                              <input type="hidden" name="node" value={openN.key} />
                              <input type="hidden" name="index" value={i} />
                              <button
                                type="submit"
                                className={`${styles.checkbox} ${checked ? styles.checkOn : ""}`}
                                aria-pressed={checked}
                                aria-label={checked ? "Uncheck" : "Check"}
                              >
                                {checked ? "✓" : ""}
                              </button>
                            </form>
                          ) : (
                            <span className={`${styles.checkbox} ${checked ? styles.checkOn : ""}`}>
                              {checked ? "✓" : ""}
                            </span>
                          )}
                          <span className={`${styles.checkLabel} ${checked ? styles.checkLabelDone : ""}`}>
                            {item}
                          </span>
                          <button
                            type="button"
                            className={`${styles.noteToggle} ${existing ? styles.noteToggleFull : ""}`}
                            onClick={() =>
                              setOpenNote((o) =>
                                o && o.card === card.id && o.node === openN.key && o.index === i
                                  ? null
                                  : { card: card.id, node: openN.key, index: i },
                              )
                            }
                            aria-label="Note"
                            title={existing ? "Edit note" : "Add note"}
                          >
                            ✎
                          </button>
                        </div>
                        {noteOpen && canWrite ? (
                          <form action={saveCheckNote} className={styles.checkNoteForm}>
                            <input type="hidden" name="cardId" value={card.id} />
                            <input type="hidden" name="node" value={openN.key} />
                            <input type="hidden" name="index" value={i} />
                            <textarea
                              name="note"
                              defaultValue={existing}
                              placeholder="Note for this item…"
                              aria-label="Item note"
                              className={styles.noteArea}
                            />
                            <button type="submit" className={styles.miniSave}>Save</button>
                          </form>
                        ) : (
                          existing && <div className={styles.checkNoteRead}>{existing}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      {archived.length > 0 && (
        <div className={styles.archivedWrap}>
          <button type="button" className={styles.miniBtn} onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Hide" : "Show"} archived ({archived.length})
          </button>
          {showArchived &&
            archived.map((card) => (
              <div key={card.id} className={styles.archivedRow}>
                <span className={styles.archivedName}>{card.name}</span>
                {card.subtitle && <span className={styles.meta}>{card.subtitle}</span>}
                {canWrite && (
                  <span className={styles.archivedActions}>
                    <form action={toggleArchive} className={styles.inlineForm}>
                      <input type="hidden" name="id" value={card.id} />
                      <button className={styles.miniBtn}>Restore</button>
                    </form>
                    <form action={deleteCard} className={styles.inlineForm}>
                      <input type="hidden" name="id" value={card.id} />
                      <button className={styles.miniDel}>Delete</button>
                    </form>
                  </span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
