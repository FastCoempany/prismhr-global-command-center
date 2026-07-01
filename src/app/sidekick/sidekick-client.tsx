"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  moduleLabel,
  resolveChild,
  type ModuleEntry,
  type Screen,
} from "@/lib/catalog";
import { createDemoAccount, saveNote, togglePin } from "./actions";
import type { DemoAccountSummary } from "./data";
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

type Props = {
  modules: ModuleEntry[];
  screens: Screen[];
  accounts: DemoAccountSummary[];
  activeAccount: DemoAccountSummary | null;
  notes: Record<string, string>;
  pinnedScreenIds: string[];
  canWrite: boolean;
  dbUnavailable: boolean;
  initialScreenId?: string;
  justSaved: boolean;
};

export function SidekickClient(props: Props) {
  const { modules, screens, accounts, activeAccount, notes, pinnedScreenIds } = props;
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
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const searchRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => new Map(screens.map((s) => [s.id, s])), [screens]);
  const selected = byId.get(selectedId);
  const pinnedSet = useMemo(() => new Set(pinnedScreenIds), [pinnedScreenIds]);

  const matches = useCallback(
    (s: Screen) => {
      if (!query) return true;
      const hay = `${s.title} ${s.module} ${s.tags.join(" ")}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    },
    [query],
  );

  // Ordered, grouped list for the sidebar + flat order for keyboard nav.
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
    () => pinnedScreenIds.map((id) => byId.get(id)).filter((s): s is Screen => Boolean(s)),
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
      // keep URL in sync without a server round-trip
      const params = new URLSearchParams();
      if (activeAccount) params.set("account", activeAccount.id);
      params.set("screen", id);
      window.history.replaceState(null, "", `/sidekick?${params.toString()}`);
    },
    [activeAccount],
  );

  // Global keyboard shortcuts
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

  const audValue = (s: Screen) => {
    const out: { who: string; de?: boolean; items: string[] }[] = [];
    if (audience === "both" || audience === "sp")
      out.push({ who: "For service providers (PEOs / ASOs / payroll)", items: s.sp });
    if (audience === "both" || audience === "de")
      out.push({ who: "For direct employers (hiring across borders)", de: true, items: s.de });
    return out.filter((b) => b.items.length);
  };

  const tierChip = (t: Screen["tier"]) =>
    t === "high" ? styles.tierHigh : t === "medium" ? styles.tierMedium : styles.tierLow;

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
              <select name="defaultAudience" defaultValue="BOTH" aria-label="Default audience">
                <option value="BOTH">Both audiences</option>
                <option value="SERVICE_PROVIDER">Service Provider</option>
                <option value="DIRECT_EMPLOYER">Direct Employer</option>
              </select>
              <button type="submit" className={styles.saveBtn}>
                Create account
              </button>
            </form>
          )}
        </div>

        <div className={styles.search}>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search screens…  ( / )"
          />
        </div>

        <div className={styles.nav}>
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
          <div className={styles.toggle}>
            {(["both", "sp", "de"] as Audience[]).map((a) => (
              <button
                key={a}
                className={audience === a ? styles.toggleOn : ""}
                onClick={() => setAudience(a)}
              >
                {a === "both" ? "Both" : a === "sp" ? "Service Provider" : "Direct Employer"}
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
              {props.canWrite && activeAccount && (
                <form action={togglePin}>
                  <input type="hidden" name="accountId" value={activeAccount.id} />
                  <input type="hidden" name="screenId" value={selected.id} />
                  <button type="submit" className={styles.ghostBtn}>
                    {pinnedSet.has(selected.id) ? "★ Unpin" : "☆ Pin"}
                  </button>
                </form>
              )}
            </div>

            {selected.say && (
              <div className={styles.say}>
                <span className={styles.accent} />
                <div className={styles.lab}>▶ Say this</div>
                <p dangerouslySetInnerHTML={{ __html: md(selected.say) }} />
              </div>
            )}

            {/* Per-account notes */}
            <div className={styles.sec}>
              <h3>
                Your notes{activeAccount ? ` · ${activeAccount.name}` : ""}
                {props.justSaved && <span className={styles.savedFlag}> · saved ✓</span>}
              </h3>
              {activeAccount && props.canWrite ? (
                <form action={saveNote} className={styles.noteBox}>
                  <input type="hidden" name="accountId" value={activeAccount.id} />
                  <input type="hidden" name="screenId" value={selected.id} />
                  <textarea
                    key={`${activeAccount.id}:${selected.id}`}
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
                    <div className={`${styles.who} ${b.de ? styles.whoDe : ""}`}>{b.who}</div>
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
                            <span className={styles.checkActions}> — {el.actions.join(", ")}</span>
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
                <div className={styles.what} dangerouslySetInnerHTML={{ __html: md(selected.what) }} />
              </div>
            )}

            {selected.children.length > 0 && (
              <div className={styles.sec}>
                <h3>Where you can go from here</h3>
                <div className={styles.jump}>
                  {selected.children.map((c, i) => {
                    const dest = resolveChild(c);
                    return (
                      <button key={i} disabled={!dest} onClick={() => dest && select(dest.id)}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Presenter mode */}
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

      {/* Command palette */}
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
        !ql ? true : `${s.title} ${s.module} ${s.tags.join(" ")}`.toLowerCase().includes(ql),
      )
      .slice(0, 40);
  }, [q, screens]);

  useEffect(() => setI(0), [q]);

  return (
    <div className={styles.paletteOverlay} onClick={onClose}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
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
