"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  v3ModuleLabel,
  v3ScreenshotPath,
  type V3Companion,
  type V3Flow,
  type V3Screen,
} from "@/lib/sidekick-v3";
import {
  addToPlaybook,
  createDemoAccount,
  createPlaybook,
  deletePlaybook,
  forkMasterFlow,
  movePlaybookItem,
  removePlaybookItem,
  resetScreenScript,
  saveNote,
  saveScreenScript,
} from "./actions";
import type { DemoAccountSummary, PlaybookData } from "./data";
import styles from "./sidekick-v3.module.css";

type Audience = "both" | "sp" | "de";
type CompanionKey = "discovery" | "objections" | "followups";
type View = { kind: "screen"; id: string } | { kind: "companion"; key: CompanionKey };

const audienceFromDefault = (d: DemoAccountSummary["defaultAudience"]): Audience =>
  d === "SERVICE_PROVIDER" ? "sp" : d === "DIRECT_EMPLOYER" ? "de" : "both";

const COMPANION_LABELS: Record<CompanionKey, string> = {
  discovery: "Discovery brief",
  objections: "Objection notes",
  followups: "Follow-up checklist",
};

// Rendered with key={id} so a screen change remounts it and resets `ok`.
function Shot({ id }: { id: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div className={styles.shot}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={v3ScreenshotPath(id)} alt="" onError={() => setOk(false)} />
    </div>
  );
}

type Props = {
  flow: V3Flow;
  screens: V3Screen[]; // master-flow order, overrides applied
  companion: V3Companion;
  accounts: DemoAccountSummary[];
  activeAccount: DemoAccountSummary | null;
  notes: Record<string, string>;
  playbooks: PlaybookData[];
  editedIds: string[];
  canWrite: boolean;
  dbUnavailable: boolean;
  initialScreenId?: string;
  initialPlaybookId?: string;
  justSaved: boolean;
};

export function SidekickV3Client(props: Props) {
  const { flow, screens, companion, accounts, activeAccount, notes, playbooks } = props;
  const router = useRouter();

  const byId = useMemo(() => new Map(screens.map((s) => [s.id, s])), [screens]);
  const stepOf = useMemo(
    () => new Map(screens.map((s, i) => [s.id, i + 1])),
    [screens],
  );

  const [view, setView] = useState<View>({
    kind: "screen",
    id:
      props.initialScreenId && byId.has(props.initialScreenId)
        ? props.initialScreenId
        : (screens[0]?.id ?? ""),
  });
  const [lens, setLens] = useState<"flow" | "modules">("flow");
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience>(
    audienceFromDefault(activeAccount?.defaultAudience ?? "BOTH"),
  );
  const [presenter, setPresenter] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showNewPlaybook, setShowNewPlaybook] = useState(false);
  const [activePlaybookId, setActivePlaybookId] = useState<string | undefined>(
    props.initialPlaybookId,
  );
  const searchRef = useRef<HTMLInputElement>(null);

  const activePlaybook = playbooks.find((p) => p.id === activePlaybookId);

  // The presentation order: the active playbook if one is selected, else the
  // master flow. Prev/next and presenter mode walk this order.
  const order: V3Screen[] = useMemo(() => {
    if (activePlaybook && activePlaybook.items.length > 0) {
      return activePlaybook.items
        .map((it) => byId.get(it.screenId))
        .filter((s): s is V3Screen => Boolean(s));
    }
    return screens;
  }, [activePlaybook, byId, screens]);

  const selected = view.kind === "screen" ? byId.get(view.id) : undefined;
  const orderIdx = selected ? order.findIndex((s) => s.id === selected.id) : -1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return screens;
    return screens.filter((s) =>
      [s.title, s.screenType, s.module, s.say, s.what, s.visualSummary]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [screens, query]);

  const moduleGroups = useMemo(() => {
    const groups = new Map<string, V3Screen[]>();
    for (const s of filtered) {
      const g = groups.get(s.module) ?? [];
      g.push(s);
      groups.set(s.module, g);
    }
    return [...groups.entries()];
  }, [filtered]);

  const selectScreen = useCallback((id: string) => {
    setView({ kind: "screen", id });
    setEditing(false);
  }, []);

  const step = useCallback(
    (delta: number) => {
      if (order.length === 0) return;
      const cur = orderIdx >= 0 ? orderIdx : 0;
      const next = Math.min(order.length - 1, Math.max(0, cur + delta));
      setView({ kind: "screen", id: order[next].id });
      setEditing(false);
    },
    [order, orderIdx],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "ArrowRight") {
        step(1);
      } else if (e.key === "ArrowLeft") {
        step(-1);
      } else if (e.key === "p" || e.key === "P") {
        setPresenter((v) => !v);
      } else if (e.key === "Escape") {
        setPresenter(false);
        setEditing(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const switchAccount = (id: string) => {
    if (id === "__new__") {
      setShowNewAccount(true);
      return;
    }
    router.push(`/sidekick-v3?account=${encodeURIComponent(id)}`);
  };

  const onPlaybookSelect = (v: string) => {
    if (v === "__new__") {
      setShowNewPlaybook(true);
      return;
    }
    setShowNewPlaybook(false);
    setActivePlaybookId(v || undefined);
  };

  const hidden = (screenId?: string) => (
    <>
      <input type="hidden" name="accountId" value={activeAccount?.id ?? ""} />
      <input type="hidden" name="screenId" value={screenId ?? ""} />
    </>
  );

  const audiencePoints = (s: V3Screen): { label: string; items: string[] }[] => {
    const out: { label: string; items: string[] }[] = [];
    if ((audience === "both" || audience === "sp") && s.sp.length)
      out.push({ label: "Strategic points", items: s.sp });
    if ((audience === "both" || audience === "de") && s.de.length)
      out.push({ label: "Discovery / executive notes", items: s.de });
    return out;
  };

  // Linkify "step 18" / "screen 18" references in branching text so they jump.
  const linkifySteps = (text: string) => {
    const parts = text.split(/((?:flow )?(?:step|screen) \d+)/gi);
    return parts.map((part, i) => {
      const m = part.match(/(?:step|screen) (\d+)/i);
      const n = m ? parseInt(m[1], 10) : NaN;
      const dest = Number.isFinite(n) && n >= 1 && n <= screens.length ? screens[n - 1] : null;
      if (!dest) return <Fragment key={i}>{part}</Fragment>;
      return (
        <button key={i} className={styles.stepLink} onClick={() => selectScreen(dest.id)}>
          {part}
        </button>
      );
    });
  };

  const isEdited = selected ? props.editedIds.includes(selected.id) : false;

  return (
    <div className={styles.app}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
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
            <form action={createDemoAccount} className={styles.stackForm}>
              <input name="name" placeholder="Account / prospect name" required />
              <input name="company" placeholder="Company (optional)" />
              <input name="personaLabel" placeholder="Persona (e.g. PEO Owner)" />
              <select name="defaultAudience" defaultValue="BOTH" aria-label="Default audience">
                <option value="BOTH">Both audiences</option>
                <option value="SERVICE_PROVIDER">PEO Partner</option>
                <option value="DIRECT_EMPLOYER">SMB Client</option>
              </select>
              <button type="submit" className={styles.primaryBtn}>
                Create account
              </button>
            </form>
          )}
        </div>

        {activeAccount && (
          <div className={styles.pbBar}>
            <select
              value={activePlaybookId ?? ""}
              onChange={(e) => onPlaybookSelect(e.target.value)}
              aria-label="Playbook"
            >
              <option value="">— Master flow —</option>
              {playbooks.map((p) => (
                <option key={p.id} value={p.id}>
                  ▶ {p.name} ({p.items.length})
                </option>
              ))}
              {props.canWrite && <option value="__new__">+ New playbook…</option>}
            </select>

            {showNewPlaybook && props.canWrite && (
              <div className={styles.stackForm}>
                <form action={forkMasterFlow}>
                  {hidden(selected?.id)}
                  <button type="submit" className={styles.primaryBtn}>
                    Fork the master flow ({flow.screenIds.length} steps)
                  </button>
                </form>
                <form action={createPlaybook} className={styles.rowForm}>
                  {hidden(selected?.id)}
                  <input name="name" placeholder="Empty playbook name" required />
                  <button type="submit" className={styles.primaryBtn}>
                    Add
                  </button>
                </form>
              </div>
            )}

            {activePlaybook && props.canWrite && (
              <div className={styles.rowForm}>
                <form action={addToPlaybook} style={{ flex: 1 }}>
                  {hidden(selected?.id)}
                  <input type="hidden" name="playbookId" value={activePlaybook.id} />
                  <button type="submit" className={styles.ghostBtnSm}>
                    ＋ Add current screen
                  </button>
                </form>
                <form action={deletePlaybook}>
                  {hidden(selected?.id)}
                  <input type="hidden" name="playbookId" value={activePlaybook.id} />
                  <button type="submit" className={styles.ghostBtnSm} title="Delete playbook">
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

        <div className={styles.lensRow} role="tablist" aria-label="Navigation lens">
          <button
            className={lens === "flow" ? styles.lensOn : styles.lensBtn}
            onClick={() => setLens("flow")}
          >
            Flow
          </button>
          <button
            className={lens === "modules" ? styles.lensOn : styles.lensBtn}
            onClick={() => setLens("modules")}
          >
            Modules
          </button>
        </div>

        <div className={styles.nav}>
          {activePlaybook && activePlaybook.items.length > 0 && (
            <div>
              <div className={styles.grpTitle}>▶ {activePlaybook.name}</div>
              {activePlaybook.items.map((it, idx) => {
                const s = byId.get(it.screenId);
                if (!s) return null;
                const active = view.kind === "screen" && s.id === view.id;
                return (
                  <div key={it.id} className={styles.pbItem}>
                    <button
                      className={`${styles.item} ${active ? styles.itemActive : ""}`}
                      onClick={() => selectScreen(s.id)}
                    >
                      {idx + 1}. {s.title}
                    </button>
                    {props.canWrite && (
                      <span className={styles.pbControls}>
                        <form action={movePlaybookItem}>
                          {hidden(s.id)}
                          <input type="hidden" name="playbookId" value={activePlaybook.id} />
                          <input type="hidden" name="itemId" value={it.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button type="submit" title="Move up">↑</button>
                        </form>
                        <form action={movePlaybookItem}>
                          {hidden(s.id)}
                          <input type="hidden" name="playbookId" value={activePlaybook.id} />
                          <input type="hidden" name="itemId" value={it.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button type="submit" title="Move down">↓</button>
                        </form>
                        <form action={removePlaybookItem}>
                          {hidden(s.id)}
                          <input type="hidden" name="playbookId" value={activePlaybook.id} />
                          <input type="hidden" name="itemId" value={it.id} />
                          <button type="submit" title="Remove">✕</button>
                        </form>
                      </span>
                    )}
                  </div>
                );
              })}
              <div className={styles.grpTitle}>All screens</div>
            </div>
          )}

          {lens === "flow" &&
            filtered.map((s) => {
              const active = view.kind === "screen" && s.id === view.id;
              return (
                <button
                  key={s.id}
                  className={`${styles.item} ${active ? styles.itemActive : ""}`}
                  onClick={() => selectScreen(s.id)}
                >
                  <span className={styles.itemNum}>{stepOf.get(s.id)}</span>
                  <span className={styles.itemTitle}>{s.title}</span>
                  <span className={styles.itemClock}>{s.timestampStart.slice(0, 5)}</span>
                </button>
              );
            })}

          {lens === "modules" &&
            moduleGroups.map(([mod, group]) => (
              <div key={mod}>
                <div className={styles.grpTitle}>{v3ModuleLabel(mod)}</div>
                {group.map((s) => {
                  const active = view.kind === "screen" && s.id === view.id;
                  return (
                    <button
                      key={s.id}
                      className={`${styles.item} ${active ? styles.itemActive : ""}`}
                      onClick={() => selectScreen(s.id)}
                    >
                      <span className={styles.itemNum}>{stepOf.get(s.id)}</span>
                      <span className={styles.itemTitle}>{s.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}

          <div className={styles.grpTitle}>Companion</div>
          {(Object.keys(COMPANION_LABELS) as CompanionKey[]).map((key) => {
            const active = view.kind === "companion" && view.key === key;
            return (
              <button
                key={key}
                className={`${styles.item} ${active ? styles.itemActive : ""}`}
                onClick={() => setView({ kind: "companion", key })}
              >
                <span className={styles.itemNum}>☰</span>
                <span className={styles.itemTitle}>{COMPANION_LABELS[key]}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <section className={styles.main}>
        <div className={styles.toolbar}>
          <span className={styles.crumb}>
            {selected
              ? `${flow.title} · step ${orderIdx + 1} / ${order.length}`
              : view.kind === "companion"
                ? COMPANION_LABELS[view.key]
                : ""}
          </span>
          <span className={styles.spacer} />
          <div className={styles.audRow} role="tablist" aria-label="Audience">
            {(["both", "sp", "de"] as const).map((a) => (
              <button
                key={a}
                className={audience === a ? styles.audOn : styles.audBtn}
                onClick={() => setAudience(a)}
              >
                {a === "both" ? "Both" : a === "sp" ? "PEO" : "SMB"}
              </button>
            ))}
          </div>
          {selected && props.canWrite && (
            <button className={styles.ghostBtn} onClick={() => setEditing((v) => !v)}>
              {editing ? "Close editor" : "✎ Edit"}
            </button>
          )}
          {selected && (
            <button className={styles.ghostBtn} onClick={() => setPresenter(true)}>
              ▶ Presenter
            </button>
          )}
        </div>

        {props.dbUnavailable && (
          <p className={styles.banner}>
            Database unavailable — accounts, notes, playbooks, and edits are off; the
            flow itself still works.
          </p>
        )}
        {props.justSaved && <p className={styles.bannerOk}>Saved.</p>}

        {/* Companion panels */}
        {view.kind === "companion" && (
          <div className={styles.scroll}>
            {view.key === "discovery" && (
              <article className={styles.card}>
                <h1>{companion.discoveryBrief.title}</h1>
                <p className={styles.sourceNote}>{companion.discoveryBrief.sourceNote}</p>
                <ul className={styles.checkList}>
                  {companion.discoveryBrief.prompts.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </article>
            )}
            {view.key === "objections" && (
              <article className={styles.card}>
                <h1>{companion.objections.title}</h1>
                <p className={styles.sourceNote}>{companion.objections.sourceNote}</p>
                {companion.objections.items.map((o) => {
                  const rel = byId.get(o.relatedScreenId);
                  return (
                    <div key={o.objection} className={styles.objection}>
                      <p className={styles.objectionQ}>“{o.objection}”</p>
                      <p>{o.response}</p>
                      {rel && (
                        <button
                          className={styles.stepLink}
                          onClick={() => selectScreen(rel.id)}
                        >
                          → step {stepOf.get(rel.id)}: {rel.title}
                        </button>
                      )}
                    </div>
                  );
                })}
              </article>
            )}
            {view.key === "followups" && (
              <article className={styles.card}>
                <h1>{companion.followUps.title}</h1>
                <p className={styles.sourceNote}>{companion.followUps.sourceNote}</p>
                <ul className={styles.checkList}>
                  {companion.followUps.items.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </article>
            )}
          </div>
        )}

        {/* Screen card */}
        {selected && (
          <div className={styles.scroll}>
            <article className={styles.card}>
              <header className={styles.cardHead}>
                <h1>{selected.title}</h1>
                <div className={styles.chips}>
                  <span className={styles.chip}>
                    {v3ModuleLabel(selected.module)}
                  </span>
                  <span className={styles.chip}>{selected.screenType}</span>
                  <span className={styles.chip}>
                    ⏱ {selected.timestampStart}–{selected.timestampEnd}
                  </span>
                  <span className={styles.chip}>
                    moments {selected.sourceMoments.join(", ")}
                  </span>
                  {isEdited && <span className={styles.chipEdited}>edited</span>}
                </div>
              </header>

              <Shot key={selected.id} id={selected.id} />
              <p className={styles.provenance}>
                From the recorded demo · frame ≈{selected.suggestedScreenshotFrame.clock}{" "}
                ({selected.suggestedScreenshotFrame.approxFile}) — run{" "}
                <code>npm run sidekick:frames:v3</code> locally to populate screenshots.
              </p>

              {editing && props.canWrite ? (
                <form action={saveScreenScript} className={styles.editForm}>
                  {hidden(selected.id)}
                  <label>
                    Say
                    <textarea name="say" defaultValue={selected.say} rows={6} />
                  </label>
                  <label>
                    What
                    <textarea name="what" defaultValue={selected.what} rows={4} />
                  </label>
                  <label>
                    Capabilities (one per line)
                    <textarea
                      name="capabilities"
                      defaultValue={selected.capabilities.join("\n")}
                      rows={4}
                    />
                  </label>
                  <label>
                    Strategic points (one per line)
                    <textarea name="sp" defaultValue={selected.sp.join("\n")} rows={3} />
                  </label>
                  <label>
                    Discovery / executive notes (one per line)
                    <textarea name="de" defaultValue={selected.de.join("\n")} rows={3} />
                  </label>
                  <label>
                    Branching (one per line)
                    <textarea
                      name="branching"
                      defaultValue={selected.branching.join("\n")}
                      rows={3}
                    />
                  </label>
                  <div className={styles.rowForm}>
                    <button type="submit" className={styles.primaryBtn}>
                      Save override
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className={styles.block}>
                    <div className={styles.blockLabel}>Visual summary</div>
                    <p>{selected.visualSummary}</p>
                  </div>
                  <div className={styles.block}>
                    <div className={styles.blockLabel}>Demo purpose</div>
                    <p>{selected.demoPurpose}</p>
                  </div>
                  <div className={styles.blockSay}>
                    <div className={styles.blockLabel}>Say</div>
                    <p>{selected.say}</p>
                  </div>
                  <div className={styles.block}>
                    <div className={styles.blockLabel}>What</div>
                    <p>{selected.what}</p>
                  </div>
                  {selected.capabilities.length > 0 && (
                    <div className={styles.block}>
                      <div className={styles.blockLabel}>Capabilities</div>
                      <ul>
                        {selected.capabilities.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {audiencePoints(selected).map((grp) => (
                    <div key={grp.label} className={styles.block}>
                      <div className={styles.blockLabel}>{grp.label}</div>
                      <ul>
                        {grp.items.map((it) => (
                          <li key={it}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {selected.branching.length > 0 && (
                    <div className={styles.block}>
                      <div className={styles.blockLabel}>Branching</div>
                      <ul>
                        {selected.branching.map((b) => (
                          <li key={b}>{linkifySteps(b)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className={styles.block}>
                    <div className={styles.blockLabel}>Transcript anchor</div>
                    <blockquote className={styles.anchor}>
                      {selected.transcriptAnchor}
                    </blockquote>
                  </div>
                  {isEdited && props.canWrite && (
                    <form action={resetScreenScript}>
                      {hidden(selected.id)}
                      <button type="submit" className={styles.ghostBtnSm}>
                        Reset to curated content
                      </button>
                    </form>
                  )}
                </>
              )}

              {activeAccount && (
                <form action={saveNote} className={styles.noteForm}>
                  {hidden(selected.id)}
                  <div className={styles.blockLabel}>
                    Note for {activeAccount.name}
                  </div>
                  <textarea
                    key={`${activeAccount.id}:${selected.id}`}
                    name="body"
                    defaultValue={notes[selected.id] ?? ""}
                    placeholder={
                      props.canWrite
                        ? "Account-specific angle for this screen…"
                        : "Read-only access"
                    }
                    readOnly={!props.canWrite}
                    rows={3}
                  />
                  {props.canWrite && (
                    <button type="submit" className={styles.ghostBtnSm}>
                      Save note
                    </button>
                  )}
                </form>
              )}

              <footer className={styles.pager}>
                <button
                  className={styles.ghostBtn}
                  onClick={() => step(-1)}
                  disabled={orderIdx <= 0}
                >
                  ← Prev
                </button>
                <span className={styles.pagerMid}>
                  {orderIdx + 1} / {order.length}
                </span>
                <button
                  className={styles.ghostBtn}
                  onClick={() => step(1)}
                  disabled={orderIdx >= order.length - 1}
                >
                  Next →
                </button>
              </footer>
            </article>
          </div>
        )}
      </section>

      {/* ── Presenter overlay ──────────────────────────────────────────── */}
      {presenter && selected && (
        <div className={styles.presenter}>
          <button className={styles.presenterExit} onClick={() => setPresenter(false)}>
            ✕ Esc
          </button>
          <div className={styles.presenterMeta}>
            Step {orderIdx + 1} / {order.length} · ⏱ {selected.timestampStart}–
            {selected.timestampEnd}
          </div>
          <h1>{selected.title}</h1>
          <p className={styles.presenterSay}>{selected.say}</p>
          <ul className={styles.presenterPoints}>
            {(audience === "de" ? selected.de : audience === "sp" ? selected.sp : [...selected.sp, ...selected.de])
              .slice(0, 3)
              .map((it) => (
                <li key={it}>{it}</li>
              ))}
          </ul>
          {selected.branching.length > 0 && (
            <p className={styles.presenterBranch}>↳ {selected.branching[0]}</p>
          )}
          {orderIdx < order.length - 1 && (
            <p className={styles.presenterNext}>
              Next: {order[orderIdx + 1].title}
            </p>
          )}
          <div className={styles.pager}>
            <button className={styles.ghostBtn} onClick={() => step(-1)} disabled={orderIdx <= 0}>
              ← Prev
            </button>
            <button
              className={styles.ghostBtn}
              onClick={() => step(1)}
              disabled={orderIdx >= order.length - 1}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
