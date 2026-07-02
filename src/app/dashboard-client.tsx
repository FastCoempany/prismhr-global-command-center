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
  addCard,
  deleteCard,
  moveCard,
  paintNode,
  renameCard,
  saveLabels,
  saveNotes,
  toggleArchive,
} from "./dashboard/actions";
import styles from "./dashboard.module.css";

type Props = {
  cards: DashCardRow[];
  canWrite: boolean;
  dbUnavailable: boolean;
  labels: Record<string, string>;
};

const NEXT: Record<NodeState, NodeState> = {
  todo: "active",
  active: "done",
  done: "action",
  action: "todo",
};

const stateTextClass: Record<NodeState, string> = {
  done: styles.doneText,
  active: styles.activeText,
  action: styles.actionText,
  todo: styles.todoText,
};

function glyph(state: NodeState): string {
  if (state === "done") return "✓";
  if (state === "action") return "!";
  return "";
}

export function DashboardClient({ cards, canWrite, dbUnavailable, labels }: Props) {
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const label = (key: DashNodeKey) => labels[key] || DASH_NODES.find((n) => n.key === key)!.label;

  const active = cards.filter((c) => !c.archived);
  const archived = cards.filter((c) => c.archived);

  function Track({ card }: { card: DashCardRow }) {
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
          const glyphEl = <span className={styles.glyph}>{glyph(state)}</span>;
          return (
            <div key={n.key} className={styles.cell}>
              {i > 0 && (
                <span className={`${styles.line} ${styles.lineLeft} ${prevDone ? styles.lineOn : ""}`} />
              )}
              {i < LAST_NODE && (
                <span className={`${styles.line} ${styles.lineRight} ${selfDone ? styles.lineOn : ""}`} />
              )}
              {canWrite ? (
                <form action={paintNode} className={styles.nodeForm}>
                  <input type="hidden" name="cardId" value={card.id} />
                  <input type="hidden" name="node" value={n.key} />
                  <input type="hidden" name="state" value={NEXT[state]} />
                  <button
                    type="submit"
                    className={`${styles.node} ${styles[state]}`}
                    style={heat}
                    title={`${label(n.key)} — ${stateWord(state)} (click to advance)`}
                    aria-label={`${label(n.key)}: ${stateWord(state)}. Click to advance.`}
                  >
                    {glyphEl}
                  </button>
                </form>
              ) : (
                <span className={`${styles.node} ${styles[state]}`} style={heat} title={`${label(n.key)} — ${stateWord(state)}`}>
                  {glyphEl}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

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
                <input
                  key={n.key}
                  name={`label_${n.key}`}
                  defaultValue={label(n.key)}
                  aria-label={`${n.label} label`}
                />
              ))}
              <button type="submit" className={styles.miniSave}>
                Save labels
              </button>
            </form>
          )}
        </div>
      )}

      {/* Column headers */}
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
            ? "Run docs/dashboard-tables.sql in Supabase, then add your first account."
            : "No accounts yet — add one below, or send one over from the Account Room."}
        </div>
      )}

      {active.map((card) => {
        const isOpen = openCard === card.id;
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
                      <button type="submit" className={styles.miniSave}>
                        Save
                      </button>
                      <button type="button" className={styles.miniBtn} onClick={() => setRenaming(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.nameBtn}
                      onClick={() => setOpenCard(isOpen ? null : card.id)}
                      aria-expanded={isOpen}
                    >
                      {card.name}
                    </button>
                    {card.subtitle && <div className={styles.meta}>{card.subtitle}</div>}
                    {canWrite && (
                      <div className={styles.manage}>
                        <form action={moveCard} className={styles.inlineForm}>
                          <input type="hidden" name="id" value={card.id} />
                          <button name="dir" value="up" className={styles.miniBtn} aria-label="Move up">↑</button>
                          <button name="dir" value="down" className={styles.miniBtn} aria-label="Move down">↓</button>
                        </form>
                        <button type="button" className={styles.miniBtn} onClick={() => setRenaming(card.id)}>
                          Rename
                        </button>
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
              <Track card={card} />
            </div>

            {isOpen && (
              <form action={saveNotes} className={styles.cardPanel}>
                <input type="hidden" name="cardId" value={card.id} />
                <div className={styles.panelHint}>
                  Click a node above to advance its state. Notes below are what has to happen at each
                  stage.
                </div>
                {DASH_NODES.map((n) => (
                  <div key={n.key} className={styles.nodeNote}>
                    <div className={styles.nodeNoteHead}>
                      <span>{label(n.key)}</span>
                      <span className={`${styles.drillState} ${stateTextClass[card.states[n.key]]}`}>
                        {stateWord(card.states[n.key])}
                      </span>
                    </div>
                    <ul className={styles.checklist}>
                      {n.checklist.map((item, idx) => (
                        <li key={idx}>
                          <span className={styles.bullet} />
                          {item}
                        </li>
                      ))}
                    </ul>
                    {canWrite ? (
                      <textarea
                        name={`note_${n.key}`}
                        defaultValue={card.notes[n.key]}
                        placeholder="What has to happen here…"
                        className={styles.noteArea}
                      />
                    ) : (
                      card.notes[n.key] && <p className={styles.noteRead}>{card.notes[n.key]}</p>
                    )}
                  </div>
                ))}
                {canWrite && (
                  <div className={styles.saveRow}>
                    <button type="submit" className={styles.saveBtn}>
                      Save notes
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        );
      })}

      {canWrite && (
        <form action={addCard} className={styles.addForm}>
          <input name="name" placeholder="Account name" required aria-label="New account name" />
          <input name="subtitle" placeholder="Note / CSM (optional)" aria-label="New account note" />
          <button type="submit" className={styles.addBtn}>
            + Add account
          </button>
        </form>
      )}

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
