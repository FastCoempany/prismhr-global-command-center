"use client";

// One readout paragraph with its counts as doors (the meat law, pass 12):
// the words stay the plain sentence read to Russ, and each count it carries
// opens, in place, the names it counts, or links to the page that holds them.

import { Fragment, useState } from "react";
import Link from "next/link";
import type { ReadoutDoor } from "@/lib/groundwork/readout";
import styles from "./groundwork.module.css";

export function ReadoutText({
  text,
  doors = [],
}: {
  text: string;
  doors?: ReadoutDoor[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  // Split the sentence at each door's phrase, in the order the text says them.
  const at = doors
    .map((d, i) => ({ d, i, from: text.indexOf(d.phrase) }))
    .filter((x) => x.from >= 0)
    .sort((a, b) => a.from - b.from);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const { d, i, from } of at) {
    if (from < cursor) continue;
    parts.push(text.slice(cursor, from));
    parts.push(
      d.href ? (
        <Link key={i} href={d.href} className={styles.readDoor}>
          {d.phrase}
        </Link>
      ) : (
        <button
          key={i}
          type="button"
          className={styles.readDoor}
          aria-expanded={open === i}
          onClick={() => setOpen(open === i ? null : i)}
        >
          {d.phrase}
        </button>
      ),
    );
    cursor = from + d.phrase.length;
  }
  parts.push(text.slice(cursor));
  const shown = open === null ? null : doors[open];
  return (
    <>
      <p style={{ margin: "4px 0 8px" }}>
        {parts.map((p, k) => (
          <Fragment key={k}>{p}</Fragment>
        ))}
      </p>
      {shown?.lines && (
        <ul className={styles.readList}>
          {shown.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </>
  );
}
