"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "../command-center.module.css";

type DrawerKey = "aleks" | "narrative" | "doctrine";

// The cockpit's brief bar + drawers. The bar carries the read-only numbers
// (rendered server-side and passed in as `stats`); the three toggles open
// full-content drawers over the page, so knowing never costs a navigation.
// A click on any in-page "#capture" link (or a /today#capture deep link)
// opens the Narrative drawer and scrolls to the capture box.
export function CockpitDrawers({
  stats,
  aleks,
  narrative,
  doctrine,
}: {
  stats: ReactNode;
  aleks: ReactNode;
  narrative: ReactNode;
  doctrine: ReactNode;
}) {
  const [open, setOpen] = useState<DrawerKey | null>(null);
  const toggle = (k: DrawerKey) => setOpen((o) => (o === k ? null : k));

  // #capture lives inside the Narrative drawer — reveal it on demand.
  useEffect(() => {
    const reveal = () => {
      setOpen("narrative");
      window.setTimeout(() => {
        document
          .getElementById("capture")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement | null)?.closest?.('a[href="#capture"]');
      if (!link) return;
      e.preventDefault();
      reveal();
      history.replaceState(null, "", "#capture");
    };
    const onHash = () => {
      if (window.location.hash === "#capture") reveal();
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

  const btn = (k: DrawerKey, label: string) => (
    <button
      type="button"
      className={`${styles.briefLink} ${open === k ? styles.briefLinkOn : ""}`}
      onClick={() => toggle(k)}
      aria-expanded={open === k}
    >
      {label} {open === k ? "▴" : "▸"}
    </button>
  );

  return (
    <>
      <div className={styles.briefBar}>
        {stats}
        <span className={styles.briefSep} />
        {btn("aleks", "Aleks room")}
        {btn("narrative", "Narrative & capture")}
        {btn("doctrine", "How I work")}
      </div>
      {open && (
        <div className={styles.cockDrawer}>
          <div className={styles.cockDrawerHead}>
            <b>
              {open === "aleks"
                ? "Aleks room"
                : open === "narrative"
                  ? "Narrative & capture"
                  : "How I work"}
            </b>
            <button type="button" className={styles.atcBtn} onClick={() => setOpen(null)}>
              Close ✕
            </button>
          </div>
          <div hidden={open !== "aleks"}>{aleks}</div>
          <div hidden={open !== "narrative"}>{narrative}</div>
          <div hidden={open !== "doctrine"}>{doctrine}</div>
        </div>
      )}
    </>
  );
}
