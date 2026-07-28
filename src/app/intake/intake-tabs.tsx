"use client";

// Intake's two work surfaces under one roof: the Payroll intake form
// (default — mirrors the MS Form, prefilled from DealIntel) and the SF
// activity paste (timeline + transcript filing).

import { useState } from "react";
import { IntakeClient } from "./intake-client";
import { PayrollForm } from "./payroll-form";
import styles from "../command-center.module.css";

type Acct = { id: string; name: string };

export function IntakeTabs({ accounts, ai }: { accounts: Acct[]; ai: boolean }) {
  const [tab, setTab] = useState<"form" | "paste">("form");
  return (
    <>
      <div className={styles.inkBar}>
        <button
          type="button"
          className={`${styles.chipPill} ${tab === "form" ? styles.chipPillOn : ""}`}
          onClick={() => setTab("form")}
          aria-pressed={tab === "form"}
        >
          Payroll intake form
        </button>
        <button
          type="button"
          className={`${styles.chipPill} ${tab === "paste" ? styles.chipPillOn : ""}`}
          onClick={() => setTab("paste")}
          aria-pressed={tab === "paste"}
        >
          SF activity paste
        </button>
      </div>
      {tab === "form" ? (
        <PayrollForm accounts={accounts} />
      ) : (
        <IntakeClient accounts={accounts} ai={ai} />
      )}
    </>
  );
}
