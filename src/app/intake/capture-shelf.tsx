"use client";

// Capture, the shelf. The grabs sit side by side, equal weight, each one
// stating what it takes and what it refuses — a capture that quietly grabs the
// wrong region is worse than one that declines, so the refusal is printed where
// the operator reads it, not buried in a comment.
//
// The paste workflow that used to live here is gone on purpose: filing happens
// at the account, in the ⚡ box on its row. This page installs tools and
// answers "what does this one actually see"; it never files anything.
//
// The bookmarklet hrefs are attached via refs — React (rightly) refuses a
// javascript: href in JSX — and are built from location.origin at mount.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PayrollForm } from "./payroll-form";
import { TOOLS } from "./grabs";
import styles from "../command-center.module.css";

type Acct = { id: string; name: string };

export function CaptureShelf({ accounts }: { accounts: Acct[] }) {
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    for (const t of TOOLS) {
      refs.current[t.key]?.setAttribute("href", t.build(window.location.origin));
    }
  }, []);

  const salesnav = TOOLS.filter((t) => t.group === "salesnav");
  const dragOf = (t: (typeof TOOLS)[number]) => (
    <a
      key={t.key}
      ref={(el) => {
        refs.current[t.key] = el;
      }}
      className={styles.toolDrag}
      title="Drag me to the bookmarks bar. Don't click here."
    >
      {t.label}
      <span className={styles.toolDragRail}>drag</span>
    </a>
  );
  const saysOf = (t: (typeof TOOLS)[number]) => (
    <>
      <span className={styles.toolTakes}>
        <b>takes</b>
        {t.takes}
      </span>
      <span className={styles.toolRefuses}>
        <b>refuses</b>
        {t.refuses}
      </span>
    </>
  );

  return (
    <>
      <div className={styles.shelf}>
        {TOOLS.filter((t) => !t.group).map((t) => (
          <article key={t.key} className={styles.tool}>
            <div className={styles.toolTop}>
              <span
                className={styles.toolGlyph}
                style={t.key === "sf" ? { color: "var(--orange)" } : undefined}
                aria-hidden="true"
              >
                {t.glyph}
              </span>
              <span className={styles.toolName}>{t.name}</span>
              <span className={styles.toolWhere}>{t.where}</span>
            </div>
            {dragOf(t)}
            <div className={styles.toolBody}>{saysOf(t)}</div>
          </article>
        ))}
        {/* The Sales Nav grabs, one card (2026-10-14): the accounts list, the
            Home tab's alerts and an account's people. What each takes and
            refuses opens one click down, so the shelf arrives inside its
            budget (the click-depth law). */}
        <article className={styles.tool}>
          <div className={styles.toolTop}>
            <span className={styles.toolGlyph} aria-hidden="true">
              ▤
            </span>
            <span className={styles.toolName}>Sales Nav</span>
          </div>
          {salesnav.map((t) => dragOf(t))}
          <details className={styles.toolFold}>
            <summary>What each takes and refuses</summary>
            {salesnav.map((t) => (
              <div key={t.key} className={styles.toolBody}>
                <span className={styles.toolName}>{t.name}</span>
                {saysOf(t)}
              </div>
            ))}
          </details>
        </article>
      </div>

      <div className={styles.shelfFoot}>
        <span>
          Every grab lands on your clipboard. Teams threads paste into the{" "}
          <Link href="/intranet">Intranet</Link>; account activity goes to the ⚡ box on
          the account in the <Link href="/room">HomeRoom</Link>. This page files nothing,
          and nothing here writes back to Salesforce or Forms. When a grab changes, the
          bookmarks bar keeps the old copy. Re-drag it to pick up the new one.
        </span>
        <button
          type="button"
          className={styles.shelfFormBtn}
          onClick={() => setFormOpen((v) => !v)}
          aria-expanded={formOpen}
        >
          {formOpen ? "✕ Close the payroll intake form" : "✎ Payroll intake form"}
        </button>
      </div>

      {formOpen && (
        <div className={styles.shelfForm}>
          <PayrollForm accounts={accounts} />
        </div>
      )}
    </>
  );
}
