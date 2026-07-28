"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { DashCardRow } from "@/lib/dashboard/data";
import {
  DASH_NODES,
  LAST_NODE,
  nodeBriefs,
  stateWord,
  type DashNodeKey,
  type NodeState,
} from "@/lib/dashboard/stages";
import {
  addStakeholder,
  advanceNode,
  deleteCard,
  dismissSuggestion,
  removeStakeholder,
  renameCard,
  reorderCards,
  saveCheckNote,
  saveDealSize,
  saveLabels,
  saveNote,
  toggleArchive,
  toggleCheck,
} from "./dashboard/actions";
import { AccountChipNotes, type ChipNote } from "@/components/account-notes";
import { CountryFlag } from "@/lib/flags";
import type { DealIntel } from "@/lib/intel/types";
import type { CheckSuggestion } from "@/lib/intel/evidence";
import type { LiveContextLine } from "@/lib/intel/live-context";
import { AskNext, type AskNextQ } from "./today/ask-next";
import styles from "./dashboard.module.css";

type Props = {
  cards: DashCardRow[];
  canWrite: boolean;
  dbUnavailable: boolean;
  labels: Record<string, string>;
  notesByName?: Record<string, ChipNote[]>; // chip-written worked notes, by card name
  acctIdByName?: Record<string, string>; // account-page deep link target per card name
  countryByName?: Record<string, string>; // deal-country flag per card name (iso2)
  intelByName?: Record<string, DealIntel>; // derived deal intel per card name
  suggByName?: Record<string, CheckSuggestion[]>; // evidence → checkbox suggestions
  ctxByName?: Record<string, LiveContextLine[]>; // live context lines per card name
  askByName?: Record<
    string,
    { accountId: string; questions: AskNextQ[]; research: string }
  >; // ≤3 discovery questions per card name
};

const glyph = (state: NodeState) => (state === "done" ? "✓" : "");

const PRODUCT_LABEL: Record<string, string> = {
  eor: "EOR",
  contractor: "Contractor",
  contractor_plus: "Contractor+",
  payroll: "Payroll",
  mpex: "MPEX",
  wallet: "Wallet",
  tlm: "TLM",
};

const shortDay = (iso: string) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

// The always-on intel strip under a card's name: what the corpus says this
// deal IS. Every chip carries its source in the tooltip.
function IntelStrip({ intel }: { intel: DealIntel }) {
  const hasAny =
    intel.countries.length ||
    intel.headcounts.length ||
    intel.products.length ||
    intel.direction ||
    intel.timing ||
    intel.incumbent ||
    intel.threads.people.length;
  if (!hasAny) return null;
  return (
    <div className={styles.dintStrip}>
      {intel.countries.length > 0 && (
        <span
          className={styles.dintChip}
          title={intel.countries.map((c) => `${c.value} · ${c.src}`).join("\n")}
        >
          {intel.countries.slice(0, 7).map((c) => (
            <CountryFlag key={c.value} code={c.value} className={styles.dintFlag} />
          ))}
          {intel.countries.length > 7 && <i>+{intel.countries.length - 7}</i>}
        </span>
      )}
      {intel.headcounts.slice(0, 2).map((h, i) => (
        <span key={i} className={styles.dintChip} title={h.src}>
          ~{h.value.n}
          {h.value.country ? ` ${h.value.country.toUpperCase()}` : ""}
        </span>
      ))}
      {intel.products.map((p) => (
        <span key={p.value} className={styles.dintChip} title={p.src}>
          {PRODUCT_LABEL[p.value] ?? p.value}
        </span>
      ))}
      {intel.direction && (
        <span
          className={`${styles.dintChip} ${styles.dintDir}`}
          title={`confidence: ${intel.direction.confidence}`}
        >
          {intel.direction.line}
        </span>
      )}
      {intel.timing && (
        <span
          className={`${styles.dintChip} ${styles.dintTiming}`}
          title={intel.timing.src}
        >
          ⏱ {intel.timing.value.phrase}
          {intel.timing.value.dateIso ? ` → ${shortDay(intel.timing.value.dateIso)}` : ""}
        </span>
      )}
      {intel.incumbent && (
        <span className={styles.dintChip} title={intel.incumbent.src}>
          vs {intel.incumbent.value}
        </span>
      )}
      {intel.threads.people.length > 0 && (
        <span
          className={`${styles.dintChip} ${intel.threads.people.length < 2 ? styles.dintWarn : ""}`}
          title={intel.threads.people.join(", ")}
        >
          {intel.threads.people.length < 2
            ? "single-threaded"
            : `${intel.threads.people.length} in thread`}
        </span>
      )}
    </div>
  );
}

function Track({
  card,
  canWrite,
  label,
  openKey,
  onToggle,
  sugg,
}: {
  card: DashCardRow;
  canWrite: boolean;
  label: (key: DashNodeKey) => string;
  openKey: DashNodeKey | null;
  onToggle: (key: DashNodeKey) => void;
  sugg: CheckSuggestion[];
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
                <span
                  className={`${styles.line} ${styles.lineLeft} ${prevDone ? styles.lineOn : ""}`}
                />
              )}
              {i < LAST_NODE && (
                <span
                  className={`${styles.line} ${styles.lineRight} ${selfDone ? styles.lineOn : ""}`}
                />
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
            {state === "active" && (
              <button
                type="button"
                className={styles.nodeDots}
                onClick={() => onToggle(n.key)}
                aria-label={`${label(n.key)}: ${done}/${total} — open checklist`}
                title={`${done}/${total} done`}
              >
                {card.checks[n.key].map((c, idx) => (
                  <i
                    key={idx}
                    className={`${styles.dot} ${c ? styles.dotOn : ""} ${
                      !c && sugg.some((s) => s.node === n.key && s.itemIdx === idx)
                        ? styles.dotSugg
                        : ""
                    }`}
                  />
                ))}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DashboardClient({
  cards,
  canWrite,
  dbUnavailable,
  labels,
  notesByName = {},
  acctIdByName = {},
  countryByName = {},
  intelByName = {},
  suggByName = {},
  ctxByName = {},
  askByName = {},
}: Props) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [openNode, setOpenNode] = useState<{ card: string; node: DashNodeKey } | null>(
    null,
  );
  const [openNote, setOpenNote] = useState<{
    card: string;
    node: DashNodeKey;
    index: number;
  } | null>(null);

  // Drag-reorder: optimistic local order, persisted via reorderCards.
  const [order, setOrder] = useState<string[] | null>(null);
  const dragId = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  const label = (key: DashNodeKey) =>
    labels[key] || DASH_NODES.find((n) => n.key === key)!.label;

  const active = useMemo(() => {
    const base = cards.filter((c) => !c.archived);
    if (!order) return base;
    const idx = new Map(order.map((id, i) => [id, i]));
    return [...base].sort(
      (a, b) => (idx.get(a.id) ?? base.length) - (idx.get(b.id) ?? base.length),
    );
  }, [cards, order]);
  const archived = cards.filter((c) => c.archived);

  const dropOn = (targetId: string) => {
    const src = dragId.current;
    dragId.current = null;
    if (!src || src === targetId) return;
    const ids = active.map((c) => c.id);
    const from = ids.indexOf(src);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    setOrder(ids);
    startTransition(() => {
      void reorderCards(ids);
    });
  };

  const toggleNode = (card: string, node: DashNodeKey) =>
    setOpenNode((o) => (o && o.card === card && o.node === node ? null : { card, node }));

  return (
    <div className={styles.board}>
      {canWrite && (
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.miniBtn}
            onClick={() => setShowRename((v) => !v)}
          >
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
        const intel = intelByName[card.name];
        const sugg = suggByName[card.name] ?? [];
        const ctx = ctxByName[card.name] ?? [];
        return (
          <div
            key={card.id}
            className={styles.block}
            onDragOver={(e) => {
              if (dragId.current) e.preventDefault();
            }}
            onDrop={() => dropOn(card.id)}
          >
            <div className={styles.row}>
              <div className={styles.nameCol}>
                {renaming === card.id ? (
                  <form action={renameCard} className={styles.renameForm}>
                    <input type="hidden" name="id" value={card.id} />
                    <input
                      name="name"
                      defaultValue={card.name}
                      required
                      aria-label="Account name"
                    />
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
                    <div className={styles.name}>
                      {card.name}
                      {countryByName[card.name] && (
                        <CountryFlag
                          code={countryByName[card.name]}
                          className={styles.cardFlag}
                        />
                      )}
                      {acctIdByName[card.name] && (
                        <a
                          href={`/accounts?focus=${acctIdByName[card.name]}`}
                          className={styles.cardAcctLink}
                          title="Open this account in the Account Room"
                        >
                          ↗
                        </a>
                      )}
                    </div>
                    {card.subtitle && <div className={styles.meta}>{card.subtitle}</div>}
                    {intel && <IntelStrip intel={intel} />}
                    {askByName[card.name] && (
                      <AskNext
                        accountId={askByName[card.name].accountId}
                        questions={askByName[card.name].questions}
                        canWrite={canWrite}
                        returnTo="/"
                        research={askByName[card.name].research}
                      />
                    )}
                    {canWrite && (
                      <div className={styles.manage}>
                        <span
                          className={styles.dragHandle}
                          draggable
                          onDragStart={(e) => {
                            dragId.current = card.id;
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            dragId.current = null;
                          }}
                          role="button"
                          title="Drag to reorder"
                          aria-label="Drag to reorder"
                        >
                          ⠿
                        </span>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => setRenaming(card.id)}
                          aria-label="Rename"
                          title="Rename"
                        >
                          ✎
                        </button>
                        <form action={toggleArchive} className={styles.inlineForm}>
                          <input type="hidden" name="id" value={card.id} />
                          <button
                            className={styles.iconBtn}
                            aria-label="Archive"
                            title="Archive"
                          >
                            ⬒
                          </button>
                        </form>
                        <form action={deleteCard} className={styles.inlineForm}>
                          <input type="hidden" name="id" value={card.id} />
                          <button
                            className={`${styles.iconBtn} ${styles.iconDel}`}
                            aria-label="Delete account"
                            title="Delete"
                          >
                            ✕
                          </button>
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
                sugg={sugg}
              />
            </div>

            {openN && (
              <div className={styles.checklistPanel}>
                <div className={styles.panelHead}>
                  <strong>{label(openN.key)}</strong>
                  <button
                    type="button"
                    className={styles.drillClose}
                    onClick={() => setOpenNode(null)}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                {ctx.length > 0 && (
                  <ul className={styles.ctxList}>
                    {(() => {
                      const activatedAt = Date.parse(card.activated[openN.key] || "");
                      return ctx.map((l, i) => (
                        <li key={i} className={styles.ctxLine} title={l.src}>
                          <span
                            className={`${styles.ctxAt} ${
                              !Number.isNaN(activatedAt) && Date.parse(l.at) > activatedAt
                                ? styles.ctxNew
                                : ""
                            }`}
                          >
                            {shortDay(l.at)}
                          </span>{" "}
                          {l.text}
                        </li>
                      ));
                    })()}
                  </ul>
                )}

                {(canWrite || card.notes[openN.key]) && (
                  <form action={saveNote} className={styles.generalNote}>
                    <input type="hidden" name="cardId" value={card.id} />
                    <input type="hidden" name="node" value={openN.key} />
                    {canWrite ? (
                      <input
                        name="note"
                        defaultValue={card.notes[openN.key]}
                        placeholder="Your judgment — why this stage is where it is"
                        aria-label={`${label(openN.key)} judgment`}
                        className={styles.judgment}
                      />
                    ) : (
                      <p className={styles.noteRead}>{card.notes[openN.key]}</p>
                    )}
                    {canWrite && (
                      <button type="submit" className={styles.miniSave}>
                        Save
                      </button>
                    )}
                  </form>
                )}

                <ul className={styles.checkList}>
                  {openN.checklist.map((item, i) => {
                    const checked = card.checks[openN.key][i];
                    const noteOpen =
                      openNote?.card === card.id &&
                      openNote.node === openN.key &&
                      openNote.index === i;
                    const existing = card.checkNotes[openN.key][i] ?? "";
                    const brief = nodeBriefs(openN.key)[i] ?? item;
                    const suggestion = checked
                      ? undefined
                      : sugg.find((s) => s.node === openN.key && s.itemIdx === i);
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
                            <span
                              className={`${styles.checkbox} ${checked ? styles.checkOn : ""}`}
                            >
                              {checked ? "✓" : ""}
                            </span>
                          )}
                          <span
                            className={`${styles.checkLabel} ${checked ? styles.checkLabelDone : ""}`}
                            title={item}
                          >
                            {brief}
                          </span>
                          <button
                            type="button"
                            className={`${styles.noteToggle} ${existing ? styles.noteToggleFull : ""}`}
                            onClick={() =>
                              setOpenNote((o) =>
                                o &&
                                o.card === card.id &&
                                o.node === openN.key &&
                                o.index === i
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
                        {suggestion && (
                          <div className={styles.sugRow}>
                            <span
                              className={styles.sugChip}
                              title={`evidence dated ${shortDay(suggestion.srcAt)}`}
                            >
                              suggested ✓ — {suggestion.reason}
                            </span>
                            {canWrite && (
                              <>
                                <form action={toggleCheck} className={styles.inlineForm}>
                                  <input type="hidden" name="cardId" value={card.id} />
                                  <input type="hidden" name="node" value={openN.key} />
                                  <input type="hidden" name="index" value={i} />
                                  <button type="submit" className={styles.sugConfirm}>
                                    Confirm
                                  </button>
                                </form>
                                <form
                                  action={dismissSuggestion}
                                  className={styles.inlineForm}
                                >
                                  <input type="hidden" name="cardId" value={card.id} />
                                  <input type="hidden" name="node" value={openN.key} />
                                  <input type="hidden" name="index" value={i} />
                                  <button
                                    type="submit"
                                    className={styles.sugDismiss}
                                    aria-label="Dismiss suggestion"
                                    title="Dismiss — won't suggest again"
                                  >
                                    ✕
                                  </button>
                                </form>
                              </>
                            )}
                          </div>
                        )}
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
                            <button type="submit" className={styles.miniSave}>
                              Save
                            </button>
                          </form>
                        ) : (
                          existing && (
                            <div className={styles.checkNoteRead}>{existing}</div>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <details className={styles.dealDetails}>
              <summary className={styles.dealSummary}>
                Deal details
                {card.dealSize ? ` · ${card.dealSize}` : ""}
                {card.stakeholders.length
                  ? ` · ${card.stakeholders.length} stakeholder${card.stakeholders.length === 1 ? "" : "s"}`
                  : ""}
                {(notesByName[card.name] ?? []).length
                  ? ` · ${(notesByName[card.name] ?? []).length} note${(notesByName[card.name] ?? []).length === 1 ? "" : "s"}`
                  : ""}
              </summary>
              <div className={styles.dealBody}>
                <AccountChipNotes notes={notesByName[card.name] ?? []} />
                <div className={styles.dealField}>
                  <span className={styles.dealLabel}>Deal size</span>
                  {canWrite ? (
                    <form action={saveDealSize} className={styles.dealSizeForm}>
                      <input type="hidden" name="id" value={card.id} />
                      <input
                        name="dealSize"
                        defaultValue={card.dealSize}
                        placeholder={`e.g. "$120k ARR" or "300 EEs / 4 countries"`}
                        aria-label="Deal size"
                      />
                      <button type="submit" className={styles.miniSave}>
                        Save
                      </button>
                    </form>
                  ) : (
                    <span className={styles.dealValue}>{card.dealSize || "—"}</span>
                  )}
                </div>

                <div className={styles.stakeSection}>
                  <span className={styles.dealLabel}>Stakeholders</span>
                  {card.stakeholders.length > 0 && (
                    <div className={styles.stakeGrid}>
                      {card.stakeholders.map((s, i) => (
                        <div key={i} className={styles.stakeBox}>
                          {canWrite && (
                            <form
                              action={removeStakeholder}
                              className={styles.stakeRemove}
                            >
                              <input type="hidden" name="id" value={card.id} />
                              <input type="hidden" name="index" value={i} />
                              <button type="submit" aria-label={`Remove ${s.name}`}>
                                ✕
                              </button>
                            </form>
                          )}
                          <div className={styles.stakeName}>{s.name}</div>
                          {s.role && <div className={styles.stakeRole}>{s.role}</div>}
                          {s.note && <div className={styles.stakeNote}>{s.note}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {canWrite && (
                    <form action={addStakeholder} className={styles.stakeAdd}>
                      <input type="hidden" name="id" value={card.id} />
                      <input
                        name="name"
                        placeholder="Name"
                        required
                        aria-label="Stakeholder name"
                      />
                      <input
                        name="role"
                        placeholder="Role / title"
                        aria-label="Stakeholder role"
                      />
                      <input
                        name="note"
                        placeholder="Note (optional)"
                        aria-label="Stakeholder note"
                      />
                      <button type="submit" className={styles.miniSave}>
                        Add
                      </button>
                    </form>
                  )}
                  {card.stakeholders.length === 0 && !canWrite && (
                    <span className={styles.dealValue}>—</span>
                  )}
                </div>
              </div>
            </details>
          </div>
        );
      })}

      {archived.length > 0 && (
        <div className={styles.archivedWrap}>
          <button
            type="button"
            className={styles.miniBtn}
            onClick={() => setShowArchived((v) => !v)}
          >
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
