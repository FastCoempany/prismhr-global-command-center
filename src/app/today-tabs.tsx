"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./command-center.module.css";

type TabKey = "morning" | "followups" | "notes" | "narrative" | "plan";

const TABS: { key: TabKey; label: string }[] = [
  { key: "morning", label: "This morning" },
  { key: "followups", label: "Follow-ups" },
  { key: "notes", label: "Notes" },
  { key: "narrative", label: "Narrative" },
  { key: "plan", label: "Plan" },
];

// In-page anchors that live inside a specific tab. A link to one of these (or a
// deep link like /today#capture) selects the owning tab, then scrolls to it.
const ANCHOR_TAB: Record<string, TabKey> = {
  capture: "narrative",
};

// Reveal an anchored section: select its tab, then scroll to it once the panel
// has un-hidden (a frame after the state change).
function reveal(id: string, target: TabKey, setTab: (t: TabKey) => void) {
  setTab(target);
  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

// Tabs for the Today surface. Every panel stays mounted (toggled with `hidden`)
// so the live notetaker keeps its autosave state and every server-action form
// keeps working when you switch tabs — the tab bar only changes what's visible,
// which keeps any one view short instead of one long scroll.
export function TodayTabs({
  morning,
  followups,
  notes,
  narrative,
  plan,
  followUpsDue = 0,
  notesCount = 0,
}: {
  morning: ReactNode;
  followups: ReactNode;
  notes: ReactNode;
  narrative: ReactNode;
  plan: ReactNode;
  followUpsDue?: number;
  notesCount?: number;
}) {
  const [tab, setTab] = useState<TabKey>("morning");

  // Make cross-tab anchor links work: a click on a mapped "#anchor" switches to
  // its tab and scrolls there; a deep link (/today#capture) does the same on
  // load. Other in-page anchors pass through untouched.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href")!.slice(1);
      const target = ANCHOR_TAB[id];
      if (!target) return;
      e.preventDefault();
      reveal(id, target, setTab);
      history.replaceState(null, "", `#${id}`);
    };
    const onHash = () => {
      const id = window.location.hash.slice(1);
      const target = ANCHOR_TAB[id];
      if (target) reveal(id, target, setTab);
    };
    const initial = window.setTimeout(onHash, 0); // deep link on load (deferred)
    document.addEventListener("click", onClick);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.clearTimeout(initial);
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const panels: Record<TabKey, ReactNode> = {
    morning,
    followups,
    notes,
    narrative,
    plan,
  };
  const badgeFor = (k: TabKey): number | null =>
    k === "followups" ? followUpsDue || null : k === "notes" ? notesCount || null : null;

  return (
    <div className={styles.tabsWrap}>
      <div className={styles.tabBar} role="tablist" aria-label="Today sections">
        {TABS.map((t) => {
          const badge = badgeFor(t.key);
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              className={`${styles.tabBtn} ${on ? styles.tabBtnOn : ""} ${styles[`tab_${t.key}`] ?? ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {badge != null && <span className={styles.tabCount}>{badge}</span>}
            </button>
          );
        })}
      </div>
      {TABS.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          hidden={tab !== t.key}
          className={styles.tabPanel}
        >
          {panels[t.key]}
        </div>
      ))}
    </div>
  );
}
