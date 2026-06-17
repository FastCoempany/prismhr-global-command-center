import Link from "next/link";
import { ProductLockup } from "@/components/brand";
import { FieldGlyph } from "@/components/field-glyph";
import { Badge } from "@/components/ui/badge";
import styles from "./mockups.module.css";

const sampleProspects = [
  {
    company: "North River Components",
    confidence: "Strong",
    fit: "Contractor-heavy operations with Canada hiring signal",
    permission: "Research only",
    priority: "High",
  },
  {
    company: "Lakefront Robotics",
    confidence: "Medium",
    fit: "Cross-border recruiting pattern, source freshness needed",
    permission: "Ownership unclear",
    priority: "Medium",
  },
  {
    company: "West Loop Foods",
    confidence: "Low",
    fit: "International signal is weak; watch for hiring change",
    permission: "Research only",
    priority: "Low",
  },
];

const hmlRows = [
  {
    count: "04",
    label: "High",
    read: "Needs a safe path before action.",
    tone: "red",
  },
  {
    count: "09",
    label: "Medium",
    read: "Useful, but evidence or permission is incomplete.",
    tone: "amber",
  },
  {
    count: "18",
    label: "Low",
    read: "Monitor until a trigger appears.",
    tone: "green",
  },
];

function MockupFrame({
  children,
  id,
  label,
  summary,
  why,
}: {
  children: React.ReactNode;
  id: string;
  label: string;
  summary: string;
  why: string;
}) {
  return (
    <section className={styles.mockupSection} id={id}>
      <div className={styles.explainer}>
        <p className={styles.kicker}>{label}</p>
        <h2>{summary}</h2>
        <p>{why}</p>
      </div>
      <div className={styles.frame}>{children}</div>
    </section>
  );
}

export default function MockupsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <Link className={styles.lockupLink} href="/">
          <ProductLockup />
        </Link>
        <nav className={styles.nav} aria-label="Mockup variants">
          <a href="#prospecting-desk">Prospecting Desk</a>
          <a href="#relationship-brief">Relationship Brief</a>
          <a href="#signal-board">Signal Board</a>
        </nav>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Mockup pass</p>
        <h1>Three distinct directions for the first real operating surface.</h1>
        <p>
          These are visual prototypes for direction only. They use representative data to
          test hierarchy, not live records.
        </p>
      </section>

      <MockupFrame
        id="prospecting-desk"
        label="Variant 1"
        summary="Prospecting Desk"
        why="Best when the app needs to make Chicagoland prospecting unmistakably central. The table is the product: every row carries qualification signal, source, permission, priority, and the next safe move."
      >
        <article className={styles.prospectingDesk}>
          <header className={styles.variantTopbar}>
            <div>
              <p className={styles.kicker}>Prospect Field</p>
              <h3>Build the Chicagoland account list.</h3>
            </div>
            <button className={styles.primaryButton}>Add sourced prospect</button>
          </header>

          <section className={styles.searchBand} aria-label="Prospecting filters">
            <div>
              <span>Territory</span>
              <strong>Chicagoland</strong>
            </div>
            <div>
              <span>Product signal</span>
              <strong>EOR / Contractor Mgmt</strong>
            </div>
            <div>
              <span>Evidence floor</span>
              <strong>Source + confidence required</strong>
            </div>
          </section>

          <div className={styles.prospectLayout}>
            <section className={styles.tableSurface}>
              <div className={styles.tableHead}>
                <span>Company</span>
                <span>Qualification signal</span>
                <span>Permission</span>
                <span>HML</span>
              </div>
              {sampleProspects.map((prospect) => (
                <div className={styles.tableRow} key={prospect.company}>
                  <div>
                    <strong>{prospect.company}</strong>
                    <small>{prospect.confidence} source confidence</small>
                  </div>
                  <p>{prospect.fit}</p>
                  <Badge
                    tone={prospect.permission.includes("unclear") ? "medium" : "unknown"}
                  >
                    {prospect.permission}
                  </Badge>
                  <Badge
                    tone={
                      prospect.priority === "High"
                        ? "high"
                        : prospect.priority === "Medium"
                          ? "medium"
                          : "low"
                    }
                  >
                    {prospect.priority}
                  </Badge>
                </div>
              ))}
            </section>

            <aside className={styles.evidencePanel}>
              <p className={styles.kicker}>Selected read</p>
              <h4>North River Components</h4>
              <p>
                Strong prospecting signal, but action stays research-only until a safe
                channel path is identified.
              </p>
              <div className={styles.nextMove}>
                <FieldGlyph accent="orange" name="evidence" size={20} />
                <span>Find one public source that supports Canada hiring.</span>
              </div>
            </aside>
          </div>
        </article>
      </MockupFrame>

      <MockupFrame
        id="relationship-brief"
        label="Variant 2"
        summary="Relationship Brief"
        why="Best when borrowed trust is the product's first job. The page starts with permission, relationship owner, and safe action before any prospecting or priority score gets visual weight."
      >
        <article className={styles.relationshipBrief}>
          <section className={styles.briefMain}>
            <p className={styles.kicker}>Today</p>
            <h3>Protect the trust path before motion.</h3>
            <div className={styles.briefAction}>
              <span>Next safest action</span>
              <strong>Ask CSM owner for channel context before motion.</strong>
              <p>
                The prospect has enough qualification signal to research, but no approved
                intro path exists yet.
              </p>
            </div>
          </section>

          <aside className={styles.trustStack}>
            <div className={styles.trustCard}>
              <span>Relationship owner</span>
              <strong>CSM context needed</strong>
            </div>
            <div className={styles.trustCard}>
              <span>Permission posture</span>
              <strong>Research only</strong>
            </div>
            <div className={styles.trustCard}>
              <span>Boundary risk</span>
              <strong>No rule recorded</strong>
            </div>
          </aside>

          <section className={styles.pathPanel}>
            <div className={styles.pathNode}>
              <FieldGlyph accent="blue" name="prospect" size={22} />
              <span>Prospect</span>
            </div>
            <div className={styles.pathLine} />
            <div className={styles.pathNode}>
              <FieldGlyph accent="amber" name="permission" size={22} />
              <span>Permission</span>
            </div>
            <div className={styles.pathLine} />
            <div className={styles.pathNode}>
              <FieldGlyph accent="green" name="trust" size={22} />
              <span>CSM-safe move</span>
            </div>
          </section>
        </article>
      </MockupFrame>

      <MockupFrame
        id="signal-board"
        label="Variant 3"
        summary="Signal Board"
        why="Best when the app has enough data that HML should become the main daily triage model. It turns prospects, relationship risk, promises, and unknowns into one priority board."
      >
        <article className={styles.signalBoard}>
          <header className={styles.boardHeader}>
            <div>
              <p className={styles.kicker}>Priority board</p>
              <h3>What needs attention, what can wait, what is unsafe.</h3>
            </div>
            <div className={styles.boardStat}>
              <strong>04</strong>
              <span>High</span>
            </div>
          </header>

          <section className={styles.hmlStrip}>
            {hmlRows.map((row) => (
              <div className={`${styles.hmlCell} ${styles[row.tone]}`} key={row.label}>
                <strong>{row.count}</strong>
                <span>{row.label}</span>
                <p>{row.read}</p>
              </div>
            ))}
          </section>

          <section className={styles.boardColumns}>
            <div>
              <span className={styles.columnTitle}>Do now</span>
              <div className={styles.workCard}>
                <strong>Verify safe path for North River Components</strong>
                <p>Strong qualification signal, permission still research-only.</p>
              </div>
              <div className={styles.workCard}>
                <strong>Resolve ownership on Lakefront Robotics</strong>
                <p>Medium HML until relationship owner is clear.</p>
              </div>
            </div>
            <div>
              <span className={styles.columnTitle}>Watch</span>
              <div className={styles.workCard}>
                <strong>Contractor-heavy manufacturing accounts</strong>
                <p>Pattern is forming, but source quality varies.</p>
              </div>
            </div>
            <div>
              <span className={styles.columnTitle}>Blocked</span>
              <div className={styles.workCard}>
                <strong>No motion without channel context</strong>
                <p>Research can raise priority. It cannot override permission.</p>
              </div>
            </div>
          </section>
        </article>
      </MockupFrame>
    </main>
  );
}
