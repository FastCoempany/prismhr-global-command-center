"use client";

// Capture, the shelf. Three grabs sit side by side, equal weight, each one
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

  return (
    <>
      <div className={styles.shelf}>
        {TOOLS.map((t) => (
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
            <a
              ref={(el) => {
                refs.current[t.key] = el;
              }}
              className={styles.toolDrag}
              title="Drag me to the bookmarks bar. Don't click here."
            >
              {t.label}
              <span className={styles.toolDragRail}>drag</span>
            </a>
            <div className={styles.toolBody}>
              <span className={styles.toolTakes}>
                <b>takes</b>
                {t.takes}
              </span>
              <span className={styles.toolRefuses}>
                <b>refuses</b>
                {t.refuses}
              </span>
            </div>
          </article>
        ))}
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
