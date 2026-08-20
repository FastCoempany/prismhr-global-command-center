"use client";

// The sweep's pending face: the pass runs minutes, and a silent button reads
// as a dead one (caught 2026-08-20).

import { useFormStatus } from "react-dom";
import styles from "./groundwork.module.css";

export function SweepButton({ label, small }: { label: string; small?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={small ? `${styles.btn2nd} ${styles.btnSmall}` : styles.btn2nd}
      type="submit"
      disabled={pending}
    >
      {pending ? "Sweeping the wire… a few minutes." : label}
    </button>
  );
}
