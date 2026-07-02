"use client";

import { useState } from "react";
import type { DashCardRow } from "@/lib/dashboard/data";
import {
  DASH_NODES,
  LAST_NODE,
  NODE_STATES,
  stateWord,
  type DashNodeKey,
  type NodeState,
} from "@/lib/dashboard/stages";
import { addCard, deleteCard, moveCard, renameCard, setNode } from "./dashboard/actions";
import styles from "./dashboard.module.css";

type Props = {
  cards: DashCardRow[];
  canWrite: boolean;
  dbUnavailable: boolean;
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

export function DashboardClient({ cards, canWrite, dbUnavailable }: Props) {
  const [open, setOpen] = useState<{ card: string; node: DashNodeKey } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <div className={styles.board}>
      {/* Column headers, aligned above every row's nodes */}
      <div className={styles.headRow}>
        <div className={styles.nameCol} />
        <div className={styles.track}>
          {DASH_NODES.map((n) => (
            <div key={n.key} className={styles.headCell}>
              {n.label}
            </div>
          ))}
        </div>
      </div>

      {cards.length === 0 && (
        <div className={styles.empty}>
          {dbUnavailable
            ? "Run docs/dashboard-tables.sql in Supabase, then add your first account."
            : "No accounts yet — add your first one below."}
        </div>
      )}

      {cards.map((card) => {
        const isOpen = open?.card === card.id;
        const openKey = isOpen ? open.node : null;
        const openNode = openKey ? DASH_NODES.find((n) => n.key === openKey) : null;
        const openState = openKey ? card.states[openKey] : null;

        return (
          <div key={card.id} className={styles.block}>
            <div className={styles.row}>
              <div className={styles.nameCol}>
                {renaming === card.id ? (
                  <form action={renameCard} className={styles.renameForm}>
                    <input type="hidden" name="id" value={card.id} />
                    <input name="name" defaultValue={card.name} required aria-label="Account name" />
                    <input
                      name="subtitle"
                      defaultValue={card.subtitle ?? ""}
                      placeholder="Note / CSM"
                      aria-label="Subtitle"
                    />
                    <div className={styles.renameRow}>
                      <button type="submit" className={styles.miniSave}>
                        Save
                      </button>
                      <button
                        type="button"
                        className={styles.miniBtn}
                        onClick={() => setRenaming(null)}
                      >
                        Cancel
                      </button>
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
                          <button name="dir" value="up" className={styles.miniBtn} aria-label="Move up">
                            ↑
                          </button>
                          <button
                            name="dir"
                            value="down"
                            className={styles.miniBtn}
                            aria-label="Move down"
                          >
                            ↓
                          </button>
                        </form>
                        <button
                          type="button"
                          className={styles.miniBtn}
                          onClick={() => setRenaming(card.id)}
                        >
                          Rename
                        </button>
                        <form action={deleteCard} className={styles.inlineForm}>
                          <input type="hidden" name="id" value={card.id} />
                          <button className={styles.miniDel} aria-label="Delete account">
                            Delete
                          </button>
                        </form>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className={styles.track}>
                {DASH_NODES.map((n, i) => {
                  const state = card.states[n.key];
                  const prevDone = i > 0 && card.states[DASH_NODES[i - 1].key] === "done";
                  const selfDone = state === "done";
                  const selected = isOpen && open.node === n.key;
                  return (
                    <div key={n.key} className={styles.cell}>
                      {i > 0 && (
                        <span
                          className={`${styles.line} ${styles.lineLeft} ${prevDone ? styles.lineOn : ""}`}
                        />
                      )}
                      {i < LAST_NODE && (
                        <span
                          className={`${styles.line} ${styles.lineRight} ${selfDone ? styles.lineOn : ""}`}
                        />
                      )}
                      <button
                        type="button"
                        className={`${styles.node} ${styles[state]} ${selected ? styles.selected : ""}`}
                        style={
                          state === "done" || state === "active"
                            ? ({ "--heat": n.heat } as React.CSSProperties)
                            : undefined
                        }
                        title={`${n.label} — ${stateWord(state)}`}
                        aria-label={`${n.label}: ${stateWord(state)}`}
                        aria-expanded={selected}
                        onClick={() =>
                          setOpen(selected ? null : { card: card.id, node: n.key })
                        }
                      >
                        <span className={styles.glyph}>{glyph(state)}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {isOpen && openNode && openState && (
              <form action={setNode} key={`${card.id}-${openNode.key}`} className={styles.drill}>
                <input type="hidden" name="cardId" value={card.id} />
                <input type="hidden" name="node" value={openNode.key} />
                <div className={styles.drillHead}>
                  <span className={styles.drillTitle}>
                    {card.name} · {openNode.label}
                  </span>
                  <span className={`${styles.drillState} ${stateTextClass[openState]}`}>
                    {stateWord(openState)}
                  </span>
                  <button
                    type="button"
                    className={styles.drillClose}
                    onClick={() => setOpen(null)}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                {canWrite && (
                  <div className={styles.statePick}>
                    {NODE_STATES.map((s) => (
                      <label key={s.key} className={styles.stateOpt}>
                        <input
                          type="radio"
                          name="state"
                          value={s.key}
                          defaultChecked={openState === s.key}
                        />
                        <span>{s.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                <ul className={styles.checklist}>
                  {openNode.checklist.map((item, idx) => (
                    <li key={idx} className={styles.checkTodo}>
                      <span className={styles.bullet} />
                      {item}
                    </li>
                  ))}
                </ul>

                {canWrite ? (
                  <>
                    <textarea
                      name="note"
                      defaultValue={card.notes[openNode.key]}
                      placeholder="What has to happen here for this account…"
                      className={styles.noteArea}
                    />
                    <div className={styles.saveRow}>
                      <button type="submit" className={styles.saveBtn}>
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  card.notes[openNode.key] && (
                    <p className={styles.noteRead}>{card.notes[openNode.key]}</p>
                  )
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
    </div>
  );
}
