import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import styles from "./demos.module.css";
import shell from "../command-center.module.css";

export const dynamic = "force-dynamic";

// The demo picker — one nav entry, three rooms. Each card says what the room
// is for so the right one gets opened without touring all three.
const DEMOS = [
  {
    href: "/sidekick",
    name: "Demo Sidekick",
    blurb:
      "The full catalog — every flow, talk track, and product area, searchable. Reach for it when a demo goes off-script.",
  },
  {
    href: "/sidekick-v3",
    name: "v3 Sidekick",
    blurb:
      "Recorded-demo flows — the curated v3 walkthroughs in presentation order, one screen at a time.",
  },
  {
    href: "/payroll-demo-sidekick",
    name: "Payroll Demo",
    blurb:
      "The China payroll walkthrough plus the questions that come up in payroll-first conversations.",
  },
];

export default function DemosPage() {
  return (
    <>
      <AppWayfinder current="Demos" />
      <main className={shell.wrap}>
        <div className={shell.pageHead}>
          <h1 className={shell.h1}>Demos</h1>
          <p className={shell.sub}>Pick the room that fits the meeting.</p>
        </div>
        <div className={styles.grid}>
          {DEMOS.map((d) => (
            <Link key={d.href} href={d.href} className={styles.card}>
              <span className={styles.name}>{d.name} →</span>
              <span className={styles.blurb}>{d.blurb}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
