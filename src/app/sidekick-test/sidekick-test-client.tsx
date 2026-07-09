"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  demoModuleLabel,
  type DemoContext,
  type DemoModuleEntry,
  type DemoScreen,
} from "@/lib/catalog-demo";
import { createDemoAccount, resetScreenScript, saveNote, saveScreenScript } from "./actions";
import type { DemoAccountSummary } from "./data";
import s from "../sidekick/sidekick.module.css";
import x from "./sidekick-test.module.css";

type Audience = "both" | "sp" | "de";

const audienceFromDefault = (d: DemoAccountSummary["defaultAudience"]): Audience =>
  d === "SERVICE_PROVIDER" ? "sp" : d === "DIRECT_EMPLOYER" ? "de" : "both";

function escapeHtml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function md(v: string) {
  return escapeHtml(v)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

type Props = {
  meta: { source: string; note: string; flowCount: number };
  modules: DemoModuleEntry[];
  screens: DemoScreen[];
  context: DemoContext[];
  accounts: DemoAccountSummary[];
  activeAccount: DemoAccountSummary | null;
  notes: Record<string, string>;
  editedIds: string[];
  canWrite: boolean;
  dbUnavailable: boolean;
  initialScreenId?: string;
  justSaved: boolean;
};

export function SidekickTestClient(props: Props) {
  const { meta, screens, context, accounts, activeAccount, notes } = props;
  const router = useRouter();

  const first = screens[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(
    props.initialScreenId && screens.some((sc) => sc.id === props.initialScreenId)
      ? props.initialScreenId
      : first,
  );
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience>(
    audienceFromDefault(activeAccount?.defaultAudience ?? "BOTH"),
  );
  const [presenter, setPresenter] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => new Map(screens.map((sc) => [sc.id, sc])), [screens]);
  const selected = byId.get(selectedId);
  const editedSet = useMemo(() => new Set(props.editedIds), [props.editedIds]);
  const acctId = activeAccount?.id ?? "";
  const canEdit = props.canWrite && Boolean(activeAccount);

  const filtered = useMemo(() => {
    if (!query) return screens;
    const q = query.toLowerCase();
    return screens.filter((sc) =>
      `${sc.title} ${demoModuleLabel(sc.module)} ${sc.tags.join(" ")}`.toLowerCase().includes(q),
    );
  }, [screens, query]);

  const flatOrder = useMemo(() => filtered.map((sc) => sc.id), [filtered]);
  const stepIndex = screens.findIndex((sc) => sc.id === selectedId);

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      setEditing(false);
      const params = new URLSearchParams();
      if (activeAccount) params.set("account", activeAccount.id);
      params.set("screen", id);
      window.history.replaceState(null, "", `/sidekick-test?${params.toString()}`);
    },
    [activeAccount],
  );

  const stepTo = useCallback(
    (delta: number) => {
      const next = screens[stepIndex + delta];
      if (next) select(next.id);
    },
    [screens, stepIndex, select],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
      if (e.key === "Escape") {
        setPresenter(false);
        setShowBrief(false);
        return;
      }
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === "p") {
        setPresenter((v) => !v);
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const i = flatOrder.indexOf(selectedId);
        const next = flatOrder[Math.min(flatOrder.length - 1, i + 1)];
        if (next) select(next);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const i = flatOrder.indexOf(selectedId);
        const prev = flatOrder[Math.max(0, i - 1)];
        if (prev) select(prev);
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
    router.push(`/sidekick-test?account=${id}`);
  };

  const audValue = (sc: DemoScreen) => {
    const out: { who: string; de?: boolean; items: string[] }[] = [];
    if (audience === "both" || audience === "sp")
      out.push({ who: "For the PEO partner (channel)", items: sc.sp });
    if (audience === "both" || audience === "de")
      out.push({ who: "For the SMB client (via their PEO)", de: true, items: sc.de });
    return out.filter((b) => b.items.length);
  };

  const tierChip = (t: DemoScreen["tier"]) =>
    t === "high" ? s.tierHigh : t === "medium" ? s.tierMedium : s.tierLow;

  const hidden = (screenId: string) => (
    <>
      <input type="hidden" name="accountId" value={acctId} />
      <input type="hidden" name="screenId" value={screenId} />
    </>
  );

  return (
    <div className={s.app}>
      {/* Sidebar — the demo flow, in order */}
      <aside className={s.side}>
        <div className={s.accountBar}>
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
            <form action={createDemoAccount} className={s.newAcct}>
              <input type="hidden" name="screenId" value={selectedId} />
              <input name="name" placeholder="Account / prospect name" required />
              <input name="company" placeholder="Company (optional)" />
              <input name="personaLabel" placeholder="Persona (e.g. PEO Owner)" />
              <select name="defaultAudience" defaultValue="BOTH" aria-label="Default audience">
                <option value="BOTH">Both audiences</option>
                <option value="SERVICE_PROVIDER">PEO Partner</option>
                <option value="DIRECT_EMPLOYER">SMB Client</option>
              </select>
              <button type="submit" className={s.saveBtn}>
                Create account
              </button>
            </form>
          )}
        </div>

        <button className={x.briefBtn} onClick={() => setShowBrief(true)}>
          ▤ Discovery brief
        </button>

        <div className={s.search}>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the flow…  ( / )"
          />
        </div>

        <div className={s.nav}>
          <div className={x.flowHead}>Demo flow · {screens.length} steps</div>
          {filtered.map((sc) => (
            <button
              key={sc.id}
              className={`${s.item} ${x.flowItem} ${sc.id === selectedId ? s.itemActive : ""}`}
              onClick={() => select(sc.id)}
            >
              <span className={x.flowNum}>{sc.flowOrder}</span>
              <span className={`${s.dot} ${s[sc.tier]}`} />
              <span className={x.flowTitle}>{sc.title}</span>
              <span className={x.flowClock}>{sc.videoClock}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className={x.flowEmpty}>No steps match “{query}”.</div>}
        </div>
      </aside>

      {/* Main */}
      <main className={s.main}>
        <div className={s.top}>
          <span className={s.crumb}>{selected?.navPath.join("  ›  ")}</span>
          <span className={s.spacer} />
          <div className={s.stepper}>
            <button onClick={() => stepTo(-1)} disabled={stepIndex <= 0} title="Previous step (←)">
              ◀
            </button>
            <span>
              {stepIndex + 1} / {screens.length}
            </span>
            <button
              onClick={() => stepTo(1)}
              disabled={stepIndex >= screens.length - 1}
              title="Next step (→)"
            >
              ▶
            </button>
          </div>
          <div className={s.toggle}>
            {(["both", "sp", "de"] as Audience[]).map((a) => (
              <button
                key={a}
                className={audience === a ? s.toggleOn : ""}
                onClick={() => setAudience(a)}
              >
                {a === "both" ? "Both" : a === "sp" ? "PEO Partner" : "SMB Client"}
              </button>
            ))}
          </div>
          <button className={s.ghostBtn} onClick={() => setPresenter(true)}>
            ▶ Presenter
          </button>
        </div>

        {selected && (
          <div className={s.wrap}>
            <h1 className={s.h1}>
              <span className={x.h1Num}>{selected.flowOrder}</span>
              {selected.title}
            </h1>
            <div className={s.chips}>
              <span className={s.chip}>{demoModuleLabel(selected.module)}</span>
              <span className={`${s.chip} ${tierChip(selected.tier)}`}>{selected.tier} value</span>
              <span className={`${s.chip} ${x.clockChip}`} title="Where this happens in the recording">
                ⏱ {selected.videoClock}–{selected.videoEndClock}
              </span>
              {editedSet.has(selected.id) && <span className={`${s.chip} ${s.editedChip}`}>edited</span>}
              {selected.needsFrameCheck && (
                <span
                  className={`${s.chip} ${x.unverifiedChip}`}
                  title={selected.needsFrameCheck}
                >
                  ⚠ screen unverified
                </span>
              )}
              {canEdit && (
                <button className={s.ghostBtn} onClick={() => setEditing((v) => !v)}>
                  {editing ? "Close editor" : "✎ Edit script"}
                </button>
              )}
            </div>

            <div className={x.sourceLine}>
              From the recorded demo · {selected.videoClock} → {selected.videoEndClock}
              {selected.needsFrameCheck ? " · screen id not yet frame-confirmed" : ""}
            </div>

            {editing && canEdit ? (
              <form action={saveScreenScript} className={s.editForm}>
                {hidden(selected.id)}
                <label>Say this (talk track)</label>
                <textarea name="say" rows={4} defaultValue={selected.say} />
                <label>Capabilities (one per line)</label>
                <textarea name="capabilities" rows={5} defaultValue={selected.capabilities.join("\n")} />
                <label>Value — PEO partner / channel (one per line)</label>
                <textarea name="sp" rows={4} defaultValue={selected.sp.join("\n")} />
                <label>Value — SMB client via PEO (one per line)</label>
                <textarea name="de" rows={4} defaultValue={selected.de.join("\n")} />
                <label>Branching (one per line)</label>
                <textarea name="branching" rows={4} defaultValue={selected.branching.join("\n")} />
                <label>What this screen is</label>
                <textarea name="what" rows={3} defaultValue={selected.what} />
                <div className={s.editRow}>
                  <button type="submit" className={s.saveBtn}>
                    Save script
                  </button>
                  <button type="button" className={s.ghostBtn} onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                  {editedSet.has(selected.id) && (
                    <button type="submit" className={s.ghostBtn} formAction={resetScreenScript}>
                      ↺ Reset to demo
                    </button>
                  )}
                  <span className={s.muted}>Edits apply to every account.</span>
                </div>
              </form>
            ) : (
              <>
                {selected.say && (
                  <div className={s.say}>
                    <span className={s.accent} />
                    <div className={s.lab ?? ""}>▶ Say this</div>
                    <p dangerouslySetInnerHTML={{ __html: md(selected.say) }} />
                  </div>
                )}

                <div className={s.sec}>
                  <h3>
                    Your notes{activeAccount ? ` · ${activeAccount.name}` : ""}
                    {props.justSaved && <span className={s.savedFlag}> · saved ✓</span>}
                  </h3>
                  {canEdit ? (
                    <form action={saveNote} className={s.noteBox}>
                      {hidden(selected.id)}
                      <textarea
                        key={`${acctId}:${selected.id}`}
                        name="body"
                        defaultValue={notes[selected.id] ?? ""}
                        placeholder="Notes for this account on this step — saved per account."
                      />
                      <div className={s.noteRow}>
                        <button type="submit" className={s.saveBtn}>
                          Save note
                        </button>
                        <span className={s.muted}>Persists per account across devices.</span>
                      </div>
                    </form>
                  ) : (
                    <p className={s.muted}>
                      {props.dbUnavailable
                        ? "Notes are unavailable — database not configured."
                        : accounts.length === 0
                          ? "Create an account (top-left) to start saving per-account notes."
                          : "Read-only access."}
                    </p>
                  )}
                </div>

                {selected.capabilities.length > 0 && (
                  <div className={s.sec}>
                    <h3>Capabilities shown</h3>
                    <div className={s.cardBox}>
                      <ul className={s.clean}>
                        {selected.capabilities.map((c, i) => (
                          <li key={i} dangerouslySetInnerHTML={{ __html: md(c) }} />
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {audValue(selected).length > 0 && (
                  <div className={s.sec}>
                    <h3>Value narrative</h3>
                    <div className={s.cardBox}>
                      {audValue(selected).map((b, i) => (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <div className={`${s.who} ${b.de ? s.whoDe : ""}`}>{b.who}</div>
                          <ul className={s.clean}>
                            {b.items.map((it, j) => (
                              <li key={j} dangerouslySetInnerHTML={{ __html: md(it) }} />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.branching.length > 0 && (
                  <div className={s.sec}>
                    <h3>Branching</h3>
                    <div className={s.cardBox}>
                      {selected.branching.map((b, i) => (
                        <div key={i} className={s.branch}>
                          <span className={s.ico ?? ""}>▸</span>
                          <span dangerouslySetInnerHTML={{ __html: md(b) }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.what && (
                  <div className={s.sec}>
                    <h3>What this screen is</h3>
                    <div className={s.what} dangerouslySetInnerHTML={{ __html: md(selected.what) }} />
                  </div>
                )}

                <div className={x.stepNav}>
                  <button onClick={() => stepTo(-1)} disabled={stepIndex <= 0}>
                    ◀ Previous
                  </button>
                  <button onClick={() => stepTo(1)} disabled={stepIndex >= screens.length - 1}>
                    Next step ▶
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Discovery brief */}
      {showBrief && (
        <div className={x.briefOverlay} onClick={() => setShowBrief(false)}>
          <div className={x.brief} onClick={(e) => e.stopPropagation()}>
            <div className={x.briefTop}>
              <div>
                <div className={x.briefKicker}>Discovery brief</div>
                <div className={x.briefSource}>{meta.source}</div>
              </div>
              <button className={s.ghostBtn} onClick={() => setShowBrief(false)}>
                Close (Esc)
              </button>
            </div>
            {context.map((c) => (
              <div key={c.id} className={x.briefBlock}>
                <div className={x.briefTitle}>
                  {c.title} <span className={x.briefClock}>{c.videoClock}</span>
                </div>
                <ul className={s.clean}>
                  {c.facts.map((f, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: md(f) }} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presenter */}
      {presenter && selected && (
        <div className={s.presenter}>
          <button className={s.exit ?? x.exit} onClick={() => setPresenter(false)}>
            Exit (Esc)
          </button>
          <div className={x.presStep}>
            Step {selected.flowOrder} / {screens.length} · {selected.videoClock}
          </div>
          <div className={s.pTitle ?? x.presTitle}>{selected.title}</div>
          <div className={s.pSay ?? x.presSay}>{selected.say || selected.what}</div>
          <ul>
            {(audience === "de" ? selected.de : selected.sp).slice(0, 3).map((it, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: md(it) }} />
            ))}
          </ul>
          <div className={x.presNav}>
            <button onClick={() => stepTo(-1)} disabled={stepIndex <= 0}>
              ◀
            </button>
            <button onClick={() => stepTo(1)} disabled={stepIndex >= screens.length - 1}>
              ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
