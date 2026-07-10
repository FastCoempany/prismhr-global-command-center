import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { moduleLabel } from "@/lib/catalog";
import { prismhrGlobalMasterDemoFlow } from "@/lib/sidekick-flows";
import styles from "./flow.module.css";

export const metadata = {
  title: "PrismHR Global Guided Demo Flow",
};

const flow = prismhrGlobalMasterDemoFlow;

function List({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className={styles.block}>
      <div className={styles.blockLabel}>{label}</div>
      <ul className={styles.blockList}>
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function Text({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div className={styles.block}>
      <div className={styles.blockLabel}>{label}</div>
      <p className={styles.blockText}>{text}</p>
    </div>
  );
}

export default function GuidedDemoFlowPage() {
  return (
    <>
      <AppWayfinder current="Guided Demo Flow" trail="Demo Sidekick" />
      <main className={styles.page}>
        <header className={styles.head}>
          <h1>PrismHR Global Guided Demo Flow</h1>
          <p className={styles.lede}>
            Account-neutral curated flow ({flow.version}) — {flow.screens.length}{" "}
            screens distilled from a recorded demo (Zoom recording + dense frame
            review). Read-only reference: nothing on this page writes to the
            database or the editable Sidekick catalog.
          </p>
          <p className={styles.backLink}>
            <Link href="/sidekick">← Back to Demo Sidekick</Link>
          </p>
        </header>

        <ol className={styles.screens}>
          {flow.screens.map((s, i) => (
            <li key={s.id} className={styles.card} id={s.id}>
              <div className={styles.cardHead}>
                <span className={styles.cardIndex}>{i + 1}</span>
                <h2 className={styles.cardTitle}>{s.title}</h2>
                <span className={styles.cardRange}>
                  {s.timestampStart} → {s.timestampEnd}
                </span>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaChip}>
                  moments {s.sourceMoments.join(", ")}
                </span>
                <span className={styles.metaChip}>
                  {moduleLabel(s.recommendedSidekickModule)} (
                  {s.recommendedSidekickModule})
                </span>
                <span className={styles.metaChip}>{s.screenType}</span>
                <span className={styles.metaChip}>
                  frame ≈{s.suggestedScreenshotFrame.clock} ·{" "}
                  {s.suggestedScreenshotFrame.approxFile}
                </span>
              </div>

              <Text label="Visual summary" text={s.visualSummary} />
              <Text label="Demo purpose" text={s.demoPurpose} />

              <div className={styles.block}>
                <div className={styles.blockLabel}>Transcript anchor</div>
                <blockquote className={styles.anchor}>
                  {s.transcriptAnchor}
                </blockquote>
              </div>

              <Text label="Say" text={s.say} />
              <Text label="What" text={s.what} />
              <List label="Capabilities" items={s.capabilities} />
              <List label="Strategic points" items={s.sp} />
              <List label="Discovery / executive notes" items={s.de} />
              <List label="Branching" items={s.branching} />
            </li>
          ))}
        </ol>

        <section className={styles.cuts}>
          <h2>Cuts — not demo screens</h2>
          <ul>
            {flow.cuts.map((c) => (
              <li key={c.moments}>
                <strong>
                  Moments {c.moments} ({c.range})
                </strong>{" "}
                — {c.disposition}: {c.reason}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
