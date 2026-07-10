"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { moduleLabel, resolveChild, type ModuleEntry, type Screen } from "@/lib/catalog";
import {
  addToPlaybook,
  createDemoAccount,
  createPlaybook,
  deletePlaybook,
  movePlaybookItem,
  removePlaybookItem,
  resetScreenScript,
  saveNote,
  saveScreenScript,
  togglePin,
} from "./actions";
import type { DemoAccountSummary, PlaybookData } from "./data";
import styles from "./sidekick.module.css";

type Audience = "both" | "sp" | "de";

const audienceFromDefault = (d: DemoAccountSummary["defaultAudience"]): Audience =>
  d === "SERVICE_PROVIDER" ? "sp" : d === "DIRECT_EMPLOYER" ? "de" : "both";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function md(s: string) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function Shot({ id }: { id: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div className={styles.shot}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/demo-screens/${id}.png`} alt="" onError={() => setOk(false)} />
    </div>
  );
}

type Props = {
  modules: ModuleEntry[];
  screens: Screen[];
  accounts: DemoAccountSummary[];
  activeAccount: DemoAccountSummary | null;
  notes: Record<string, string>;
  pinnedScreenIds: string[];
  playbooks: PlaybookData[];
  editedIds: string[];
  canWrite: boolean;
  dbUnavailable: boolean;
  initialScreenId?: string;
  initialPlaybookId?: string;
  justSaved: boolean;
};

export function SidekickClient(props: Props) {
  const { modules, screens, accounts, activeAccount, notes, pinnedScreenIds, playbooks } =
    props;
  const router = useRouter();

  const first = screens[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(
    props.initialScreenId && screens.some((s) => s.id === props.initialScreenId)
      ? props.initialScreenId
      : first,
  );
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience>(
    audienceFromDefault(activeAccount?.defaultAudience ?? "BOTH"),
  );
  const [presenter, setPresenter] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showNewPlaybook, setShowNewPlaybook] = useState(false);
  const [editing, setEditing] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [activePlaybookId, setActivePlaybookId] = useState<string | null>(
    props.initialPlaybookId ?? null,
  );

  const searchRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => new Map(screens.map((s) => [s.id, s])), [screens]);
  const selected = byId.get(selectedId);
  const pinnedSet = useMemo(() => new Set(pinnedScreenIds), [pinnedScreenIds]);
  const editedSet = useMemo(() => new Set(props.editedIds), [props.editedIds]);
  const acctId = activeAccount?.id ?? "";
  const canEdit = props.canWrite && Boolean(activeAccount);

  const activePlaybook = playbooks.find((p) => p.id === activePlaybookId) ?? null;
  const pbScreens = useMemo(
    () =>
      activePlaybook
        ? activePlaybook.items
            .map((it) => byId.get(it.screenId))
            .filter((s): s is Screen => Boolean(s))
        : [],
    [activePlaybook, byId],
  );

  const matches = useCallback(
    (s: Screen) => {
      if (!query) return true;
      const hay = `${s.title} ${s.module} ${s.tags.join(" ")}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    },
    [query],
  );

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: Screen[] }[] = [];
    for (const [key, label] of modules) {
      const items = screens
        .filter((s) => s.module === key && matches(s))
        .sort((a, b) => a.id.localeCompare(b.id));
      if (items.length) groups.push({ key, label, items });
    }
    return groups;
  }, [modules, screens, matches]);

  const pinnedScreens = useMemo(
    () =>
      pinnedScreenIds.map((id) => byId.get(id)).filter((s): s is Screen => Boolean(s)),
    [pinnedScreenIds, byId],
  );

  const flatOrder = useMemo(() => {
    const ids = [...pinnedScreens.map((s) => s.id)];
    for (const g of grouped) for (const s of g.items) ids.push(s.id);
    return ids;
  }, [pinnedScreens, grouped]);

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      setChecked(new Set());
      setEditing(false);
      const params = new URLSearchParams();
      if (activeAccount) params.set("account", activeAccount.id);
      params.set("screen", id);
      if (activePlaybookId) params.set("pb", activePlaybookId);
      window.history.replaceState(null, "", `/sidekick?${params.toString()}`);
    },
    [activeAccount, activePlaybookId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setPresenter(false);
        return;
      }
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === "p") {
        setPresenter((v) => !v);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const i = flatOrder.indexOf(selectedId);
        const next =
          e.key === "ArrowDown"
            ? flatOrder[Math.min(flatOrder.length - 1, i + 1)]
            : flatOrder[Math.max(0, i - 1)];
        if (next) select(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flatOrder, selectedId, select]);

  const switchAccount = (id: string) => {
    if (id === "__new__") {
      setShowNewAccount(true);
      return;
    }
    router.push(`/sidekick?account=${id}`);
  };

  const onPlaybookSelect = (id: string) => {
    if (id === "__new__") {
      setShowNewPlaybook(true);
      return;
    }
    setActivePlaybookId(id || null);
  };

  const audValue = (s: Screen) => {
    const out: { who: string; de?: boolean; items: string[] }[] = [];
    if (audience === "both" || audience === "sp")
      out.push({ who: "For the PEO partner (channel)", items: s.sp });
    if (audience === "both" || audience === "de")
      out.push({ who: "For the SMB client (via their PEO)", de: true, items: s.de });
    return out.filter((b) => b.items.length);
  };

  const tierChip = (t: Screen["tier"]) =>
    t === "high" ? styles.tierHigh : t === "medium" ? styles.tierMedium : styles.tierLow;

  const hidden = (screenId: string) => (
    <>
      <input type="hidden" name="accountId" value={acctId} />
      <input type="hidden" name="screenId" value={screenId} />
    </>
  );

  const pbStepIndex = selected ? pbScreens.findIndex((s) => s.id === selected.id) : -1;

  return (
    <div className={styles.app}>
      {/* Sidebar */}
      <aside className={styles.side}>
        <div className={styles.accountBar}>
          <select
            value={activeAccount?.id ?? ""}
            onChange={(e) => switchAccount(e.target.value)}
            aria-label="Demo account"
          >
            {accounts.length === 0 && <option value="">No accounts yet</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.company ? ` — ${a.company}` : ""}
              </option>
            ))}
            {props.canWrite && <option value="__new__">+ New account…</option>}
          </select>

          {showNewAccount && props.canWrite && (
            <form action={createDemoAccount} className={styles.newAcct}>
              <input name="name" placeholder="Account / prospect name" required />
              <input name="company" placeholder="Company (optional)" />
              <input name="personaLabel" placeholder="Persona (e.g. PEO Owner)" />
              <select
                name="defaultAudience"
                defaultValue="BOTH"
                aria-label="Default audience"
              >
                <option value="BOTH">Both audiences</option>
                <option value="SERVICE_PROVIDER">PEO Partner</option>
                <option value="DIRECT_EMPLOYER">SMB Client</option>
              </select>
              <button type="submit" className={styles.saveBtn}>
                Create account
              </button>
            </form>
          )}
        </div>

        {/* Playbooks */}
        {activeAccount && (
          <div className={styles.pbBar}>
            <select
              value={activePlaybookId ?? ""}
              onChange={(e) => onPlaybookSelect(e.target.value)}
              aria-label="Playbook"
            >
              <option value="">— No playbook —</option>
              {playbooks.map((p) => (
                <option key={p.id} value={p.id}>
                  ▶ {p.name} ({p.items.length})
                </option>
              ))}
              {props.canWrite && <option value="__new__">+ New playbook…</option>}
            </select>
            {showNewPlaybook && props.canWrite && (
              <form action={createPlaybook} className={styles.inlineForm}>
                {hidden(selectedId)}
                <input name="name" placeholder="Playbook name" required />
                <button type="submit" className={styles.saveBtn}>
                  Add
                </button>
              </form>
            )}
            {activePlaybook && props.canWrite && (
              <div className={styles.inlineForm}>
                <form action={addToPlaybook} style={{ flex: 1 }}>
                  {hidden(selectedId)}
                  <input type="hidden" name="playbookId" value={activePlaybook.id} />
                  <button type="submit" className={styles.stepper}>
                    ＋ Add current screen
                  </button>
                </form>
                <form action={deletePlaybook}>
                  {hidden(selectedId)}
                  <input type="hidden" name="playbookId" value={activePlaybook.id} />
                  <button
                    type="submit"
                    className={styles.pbControls}
                    title="Delete playbook"
                  >
                    🗑
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        <div className={styles.search}>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search screens…  ( / )"
          />
        </div>

        <div className={styles.nav}>
          {activePlaybook && pbScreens.length > 0 && (
            <div>
              <div className={styles.grpTitle}>▶ {activePlaybook.name}</div>
              {activePlaybook.items.map((it, idx) => {
                const s = byId.get(it.screenId);
                if (!s) return null;
                return (
                  <div key={it.id} className={styles.pbItem}>
                    <button
                      className={`${styles.item} ${s.id === selectedId ? styles.itemActive : ""}`}
                      onClick={() => select(s.id)}
                    >
                      <span className={`${styles.dot} ${styles[s.tier]}`} />
                      {idx + 1}. {s.title}
                    </button>
                    {props.canWrite && (
                      <div className={styles.pbControls}>
                        <form action={movePlaybookItem}>
                          {hidden(selectedId)}
                          <input
                            type="hidden"
                            name="playbookId"
                            value={activePlaybook.id}
                          />
                          <input type="hidden" name="itemId" value={it.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button type="submit" title="Move up">
                            ↑
                          </button>
                        </form>
                        <form action={movePlaybookItem}>
                          {hidden(selectedId)}
                          <input
                            type="hidden"
                            name="playbookId"
                            value={activePlaybook.id}
                          />
                          <input type="hidden" name="itemId" value={it.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button type="submit" title="Move down">
                            ↓
                          </button>
                        </form>
                        <form action={removePlaybookItem}>
                          {hidden(selectedId)}
                          <input
                            type="hidden"
                            name="playbookId"
                            value={activePlaybook.id}
                          />
                          <input type="hidden" name="itemId" value={it.id} />
                          <button type="submit" title="Remove">
                            ✕
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {pinnedScreens.length > 0 && (
            <div>
              <div className={styles.grpTitle}>★ Pinned</div>
              {pinnedScreens.map((s) => (
                <button
                  key={`pin-${s.id}`}
                  className={`${styles.item} ${s.id === selectedId ? styles.itemActive : ""}`}
                  onClick={() => select(s.id)}
                >
                  <span className={`${styles.dot} ${styles[s.tier]}`} />
                  {s.title}
                </button>
              ))}
            </div>
          )}

          {grouped.map((g) => (
            <div key={g.key}>
              <div className={styles.grpTitle}>
                {g.label} · {g.items.length}
              </div>
              {g.items.map((s) => (
                <button
                  key={s.id}
                  className={`${styles.item} ${s.id === selectedId ? styles.itemActive : ""}`}
                  onClick={() => select(s.id)}
                >
                  <span className={`${styles.dot} ${styles[s.tier]}`} />
                  {s.title}
                  {pinnedSet.has(s.id) && <span className={styles.pinFlag}>★</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.top}>
          <span className={styles.crumb}>{selected?.navPath.join("  ›  ")}</span>
          <span className={styles.spacer} />
          {activePlaybook && pbScreens.length > 0 && (
            <div className={styles.stepper}>
              <button
                onClick={() => pbStepIndex > 0 && select(pbScreens[pbStepIndex - 1].id)}
                disabled={pbStepIndex <= 0}
              >
                ◀
              </button>
              <span>
                {pbStepIndex >= 0 ? pbStepIndex + 1 : "–"} / {pbScreens.length}
              </span>
              <button
                onClick={() =>
                  pbStepIndex < pbScreens.length - 1 &&
                  select(pbScreens[pbStepIndex + 1].id)
                }
                disabled={pbStepIndex >= pbScreens.length - 1}
              >
                ▶
              </button>
            </div>
          )}
          <div className={styles.toggle}>
            {(["both", "sp", "de"] as Audience[]).map((a) => (
              <button
                key={a}
                className={audience === a ? styles.toggleOn : ""}
                onClick={() => setAudience(a)}
              >
                {a === "both" ? "Both" : a === "sp" ? "PEO Partner" : "SMB Client"}
              </button>
            ))}
          </div>
          <button className={styles.ghostBtn} onClick={() => setPresenter(true)}>
            ▶ Presenter
          </button>
        </div>

        {selected && (
          <div className={styles.wrap}>
            <h1 className={styles.h1}>{selected.title}</h1>
            <div className={styles.chips}>
              <span className={styles.chip}>{moduleLabel(selected.module)}</span>
              <span className={`${styles.chip} ${tierChip(selected.tier)}`}>
                {selected.tier} value
              </span>
              {editedSet.has(selected.id) && (
                <span className={`${styles.chip} ${styles.editedChip}`}>edited</span>
              )}
              {canEdit && (
                <>
                  <button
                    className={styles.ghostBtn}
                    onClick={() => setEditing((v) => !v)}
                  >
                    {editing ? "Close editor" : "✎ Edit script"}
                  </button>
                  <form action={togglePin}>
                    {hidden(selected.id)}
                    <button type="submit" className={styles.ghostBtn}>
                      {pinnedSet.has(selected.id) ? "★ Unpin" : "☆ Pin"}
                    </button>
                  </form>
                </>
              )}
            </div>

            <Shot key={selected.id} id={selected.id} />

            {editing && canEdit ? (
              <form action={saveScreenScript} className={styles.editForm}>
                {hidden(selected.id)}
                <label>Say this (talk track)</label>
                <textarea name="say" rows={3} defaultValue={selected.say} />
                <label>Capabilities (one per line)</label>
                <textarea
                  name="capabilities"
                  rows={5}
                  defaultValue={selected.capabilities.join("\n")}
                />
                <label>Value — PEO partner / channel (one per line)</label>
                <textarea name="sp" rows={4} defaultValue={selected.sp.join("\n")} />
                <label>Value — SMB client via PEO (one per line)</label>
                <textarea name="de" rows={4} defaultValue={selected.de.join("\n")} />
                <label>Branching (one per line)</label>
                <textarea
                  name="branching"
                  rows={4}
                  defaultValue={selected.branching.join("\n")}
                />
                <label>What this screen is</label>
                <textarea name="what" rows={2} defaultValue={selected.what} />
                <div className={styles.editRow}>
                  <button type="submit" className={styles.saveBtn}>
                    Save script
                  </button>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                  {editedSet.has(selected.id) && (
                    <button
                      type="submit"
                      className={styles.ghostBtn}
                      formAction={resetScreenScript}
                    >
                      ↺ Reset to catalog
                    </button>
                  )}
                  <span className={styles.muted}>Edits apply to every account.</span>
                </div>
              </form>
            ) : (
              <>
                {selected.say && (
                  <div className={styles.say}>
                    <span className={styles.accent} />
                    <div className={styles.lab}>▶ Say this</div>
                    <p dangerouslySetInnerHTML={{ __html: md(selected.say) }} />
                  </div>
                )}

                <div className={styles.sec}>
                  <h3>
                    Your notes{activeAccount ? ` · ${activeAccount.name}` : ""}
                    {props.justSaved && (
                      <span className={styles.savedFlag}> · saved ✓</span>
                    )}
                  </h3>
                  {canEdit ? (
                    <form action={saveNote} className={styles.noteBox}>
                      {hidden(selected.id)}
                      <textarea
                        key={`${acctId}:${selected.id}`}
                        name="body"
                        defaultValue={notes[selected.id] ?? ""}
                        placeholder="Notes for this account on this screen — saved to the server, per account."
                      />
                      <div className={styles.noteRow}>
                        <button type="submit" className={styles.saveBtn}>
                          Save note
                        </button>
                        <span className={styles.muted}>
                          Persists per account across devices.
                        </span>
                      </div>
                    </form>
                  ) : (
                    <p className={styles.muted}>
                      {props.dbUnavailable
                        ? "Notes are unavailable — database not configured."
                        : accounts.length === 0
                          ? "Create an account (top-left) to start saving per-account notes."
                          : "Read-only access."}
                    </p>
                  )}
                </div>

                {selected.capabilities.length > 0 && (
                  <div className={styles.sec}>
                    <h3>Capabilities shown</h3>
                    <div className={styles.cardBox}>
                      <ul className={styles.clean}>
                        {selected.capabilities.map((c, i) => (
                          <li key={i} dangerouslySetInnerHTML={{ __html: md(c) }} />
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className={styles.sec}>
                  <h3>Value narrative</h3>
                  <div className={styles.cardBox}>
                    {audValue(selected).length === 0 && (
                      <span className={styles.what}>No value narrative yet.</span>
                    )}
                    {audValue(selected).map((b, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div className={`${styles.who} ${b.de ? styles.whoDe : ""}`}>
                          {b.who}
                        </div>
                        <ul className={styles.clean}>
                          {b.items.map((it, j) => (
                            <li key={j} dangerouslySetInnerHTML={{ __html: md(it) }} />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.branching.length > 0 && (
                  <div className={styles.sec}>
                    <h3>Branching</h3>
                    <div className={styles.cardBox}>
                      {selected.branching.map((b, i) => (
                        <div key={i} className={styles.branch}>
                          <span className={styles.ico}>▸</span>
                          <span dangerouslySetInnerHTML={{ __html: md(b) }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.elements.length > 0 && (
                  <div className={styles.sec}>
                    <h3>What to click here</h3>
                    <div className={styles.cardBox}>
                      {selected.elements.map((el, i) => {
                        const key = `${selected.id}:${i}`;
                        return (
                          <label key={key} className={styles.checkRow}>
                            <input
                              type="checkbox"
                              checked={checked.has(key)}
                              onChange={(e) =>
                                setChecked((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(key);
                                  else next.delete(key);
                                  return next;
                                })
                              }
                            />
                            <span>
                              <strong>{el.name}</strong>
                              {el.actions.length > 0 && (
                                <span className={styles.checkActions}>
                                  {" "}
                                  — {el.actions.join(", ")}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selected.what && (
                  <div className={styles.sec}>
                    <h3>What this screen is</h3>
                    <div
                      className={styles.what}
                      dangerouslySetInnerHTML={{ __html: md(selected.what) }}
                    />
                  </div>
                )}

                {selected.children.length > 0 && (
                  <div className={styles.sec}>
                    <h3>Where you can go from here</h3>
                    <div className={styles.jump}>
                      {selected.children.map((c, i) => {
                        const dest = resolveChild(c);
                        return (
                          <button
                            key={i}
                            disabled={!dest}
                            onClick={() => dest && select(dest.id)}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {presenter && selected && (
        <div className={styles.presenter}>
          <button className={styles.exit} onClick={() => setPresenter(false)}>
            Exit (Esc)
          </button>
          <div className={styles.pTitle}>{selected.title}</div>
          <div className={styles.pSay}>{selected.say || selected.what}</div>
          <ul>
            {(audience === "de" ? selected.de : selected.sp).slice(0, 3).map((it, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: md(it) }} />
            ))}
          </ul>
        </div>
      )}

      {paletteOpen && (
        <CommandPalette
          screens={screens}
          onClose={() => setPaletteOpen(false)}
          onPick={(id) => {
            select(id);
            setPaletteOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CommandPalette({
  screens,
  onPick,
  onClose,
}: {
  screens: Screen[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const ql = q.toLowerCase();
    return screens
      .filter((s) =>
        !ql
          ? true
          : `${s.title} ${s.module} ${s.tags.join(" ")}`.toLowerCase().includes(ql),
      )
      .slice(0, 40);
  }, [q, screens]);

  return (
    <div className={styles.paletteOverlay} onClick={onClose}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setI(0);
          }}
          placeholder="Jump to a screen…"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setI((v) => Math.min(results.length - 1, v + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setI((v) => Math.max(0, v - 1));
            } else if (e.key === "Enter" && results[i]) {
              onPick(results[i].id);
            }
          }}
        />
        <div className={styles.paletteList}>
          {results.map((s, idx) => (
            <button
              key={s.id}
              className={`${styles.paletteItem} ${idx === i ? styles.paletteItemActive : ""}`}
              onMouseEnter={() => setI(idx)}
              onClick={() => onPick(s.id)}
            >
              <span className={`${styles.dot} ${styles[s.tier]}`} />
              {s.title}
              <span className={styles.pMod}>{moduleLabel(s.module)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
