const readinessItems = [
  "Cloud-first app shell",
  "Supabase env contract",
  "Design tokens loaded",
  "No local domain storage",
];

const focusItems = [
  {
    id: "prospect-field-summary",
    label: "Prospect Field",
    body: "Chicagoland account discovery with fit evidence, source confidence, and safe channel path.",
  },
  {
    id: "partner-rooms",
    label: "Trust Path",
    body: "Relationship-owned motion where permission posture stays visible before action.",
  },
  {
    id: "signal-feed",
    label: "Signal Feed",
    body: "Explainable HML classifications grounded in app records, not black-box scoring.",
  },
];

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="nav-rail" aria-label="Primary">
        <div className="brand-mark" aria-hidden="true">
          <span />
        </div>
        <div>
          <p className="eyebrow">Field Signal</p>
          <h1>PrismHR Global</h1>
        </div>
        <nav>
          <a aria-current="page" href="#today">
            Today
          </a>
          <a href="#prospect-field">Prospect Field</a>
          <a href="#partner-rooms">Partner Rooms</a>
          <a href="#signal-feed">Signal Feed</a>
          <a href="#boundaries">Boundaries</a>
        </nav>
      </aside>

      <section className="work-surface" id="today">
        <header className="top-bar">
          <div>
            <p className="eyebrow">Cloud build ready</p>
            <h2>Find the right prospects. Protect the trust path.</h2>
          </div>
          <div className="status-pill">Phase 0 scaffold</div>
        </header>

        <section className="safety-strip" aria-label="Current safety posture">
          <div>
            <span>Permission</span>
            <strong>Research only</strong>
          </div>
          <div>
            <span>Next safest action</span>
            <strong>Wire cloud database</strong>
          </div>
          <div>
            <span>Source confidence</span>
            <strong>Project supplied</strong>
          </div>
        </section>

        <section className="panel-grid" aria-label="Workspace readiness">
          {focusItems.map((item) => (
            <article className="panel" id={item.id} key={item.label}>
              <h3>{item.label}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </section>

        <section className="table-panel" id="prospect-field">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Build contract</p>
              <h3>Cloud-first readiness</h3>
            </div>
          </div>
          <div className="readiness-list">
            {readinessItems.map((item) => (
              <div className="readiness-row" key={item}>
                <span className="status-dot" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="right-rail" aria-label="Intelligence rail">
        <section id="boundaries">
          <p className="eyebrow">Pitch rail</p>
          <h2>Prospecting and partner-motion command center.</h2>
          <p>
            This scaffold is ready for Supabase-backed records, Prisma schema work, and
            the first Prospect Field screen.
          </p>
        </section>
        <section>
          <p className="eyebrow">Boundary</p>
          <p>No browser local storage for domain records.</p>
        </section>
      </aside>
    </main>
  );
}
