"use client";

import { useState, type ReactNode } from "react";
import styles from "./command-center.module.css";

type TabKey = "morning" | "followups" | "notes" | "narrative" | "plan";

const TABS: { key: TabKey; label: string }[] = [
  { key: "morning", label: "This morning" },
  { key: "followups", label: "Follow-ups" },
  { key: "notes", label: "Notes" },
  { key: "narrative", label: "Narrative" },
  { key: "plan", label: "Plan" },
];

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
  const panels: Record<TabKey, ReactNode> = { morning, followups, notes, narrative, plan };
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
        <div key={t.key} role="tabpanel" hidden={tab !== t.key} className={styles.tabPanel}>
          {panels[t.key]}
        </div>
      ))}
    </div>
  );
}
