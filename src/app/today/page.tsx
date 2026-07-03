import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { loadDashboard } from "@/lib/dashboard/data";
import { loadFieldNotes, FIELD_NOTE_KINDS } from "@/lib/field-notes/data";
import { researchGeneratedAt } from "@/lib/book/research";
import {
  accountIntel,
  debtsFromCards,
  isStrongSignal,
  narrative,
  partnerAngle,
  signals,
  type AccountIntel,
} from "@/lib/today/build";
import { CopyLine, NoteSubmit } from "../today-client";
import { addFieldNote, resolveFieldNote } from "./actions";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

function PlayTag({ play }: { play: AccountIntel["play"] }) {
  if (!play) return null;
  const cls = play === "displacement" ? styles.tagDisplace : styles.tagGreen;
  return <span className={`${styles.tag} ${cls}`}>{play}</span>;
}

function FunnelChip({ funnel }: { funnel: AccountIntel["funnel"] }) {
  return (
    <span className={`${styles.funnelChip} ${funnel === "hcm" ? styles.funnelHcm : ""}`}>
      {funnel === "hcm" ? "HCM funnel" : "PEO channel"}
    </span>
  );
}

function fitClass(tier: "high" | "medium" | "low") {
  return tier === "high" ? styles.fitHigh : tier === "medium" ? styles.fitMedium : styles.fitLow;
}

function ageBadge(ageDays: number | null) {
  if (ageDays == null) return null;
  const label = ageDays === 0 ? "today" : `${ageDays}d owed`;
  const hot = ageDays >= 5; // the availability gate is 5 business days — past that it's aging
  return <span className={`${styles.ageBadge} ${hot ? styles.ageHot : ""}`}>{label}</span>;
}

export default async function TodayPage() {
  const dash = await loadDashboard();

  if (dash.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Today" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const intel = accountIntel();
  const sig = signals(intel);
  const hcm = intel.filter((a) => a.funnel === "hcm").slice(0, 6);
  const debts = debtsFromCards(dash.cards, dash.labels);
  const nar = narrative(intel);
  const notes = await loadFieldNotes();

  // The single highest-leverage move: top composite-fit account that has a real
  // play (displacement or greenfield) and isn't already on the Dashboard.
  const onDash = new Set(dash.cards.map((c) => c.name));
  const withPlay = intel.filter((a) => a.play);
  const move = withPlay.find((a) => !onDash.has(a.name)) ?? withPlay[0] ?? null;
  const onDeck = withPlay.filter((a) => a !== move && !onDash.has(a.name)).slice(0, 4);

  return (
    <>
      <AppWayfinder current="Today" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Today</h1>
        <p className={styles.sub}>
          The daily command surface. Cold calling isn&apos;t the motion — this is a channel sell
          through partners into the base you already serve. Two lead streams route here: the{" "}
          <b>PEO channel</b> (CSM-owned) and the <b>HCM funnel</b> — net-new HCM logos Eric brings
          on, plus HRaaS platforms and the clients riding our PrismHR HCM. Read → route → record.
        </p>

        {/* ── Band 1 · Signal in ─────────────────────────────────────────── */}
        <section className={styles.band}>
          <div className={styles.bandHead}>
            <span className={styles.bandNum}>1</span>
            <div>
              <h2 className={styles.bandTitle}>Signal in</h2>
              <p className={styles.bandSub}>
                What the base is telling you — accounts where research surfaced real global-hiring
                demand. Snapshot as of {researchGeneratedAt}; re-run research from the Account Room to
                refresh.
              </p>
            </div>
          </div>
          <div className={styles.bandBody}>
            {sig.length === 0 && (
              <p className={styles.muted}>
                No account is showing actionable demand yet. Demand is thin across the base — which
                is itself the signal. Run deeper research from the Account Room.
              </p>
            )}
            {sig.map((a) => (
              <div key={a.id} className={styles.signalRow}>
                <div className={styles.signalTop}>
                  <Link href={`/accounts?focus=${a.id}`}>{a.name}</Link>
                  <span className={`${styles.fit} ${fitClass(a.tier)}`}>{a.demand}</span>
                  {!isStrongSignal(a) && <span className={styles.emergingTag}>emerging</span>}
                  <PlayTag play={a.play} />
                  <FunnelChip funnel={a.funnel} />
                  <span className={styles.signalCsm}>
                    {a.confidence} conf · {a.csm}
                  </span>
                </div>
                {a.summary && <p className={styles.signalSummary}>{a.summary}</p>}
                {a.countries.length > 0 && (
                  <div className={styles.countries}>
                    {a.countries.map((c) => (
                      <span key={c} className={styles.countryChip}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {hcm.length > 0 && (
              <div className={styles.hcmStrip}>
                <span className={styles.hcmLabel}>HCM funnel — routes to you directly:</span>
                {hcm.map((a) => (
                  <Link key={a.id} href={`/accounts?focus=${a.id}`} className={styles.hcmChip}>
                    {a.name} <b>{a.score}</b> · {a.csm}
                  </Link>
                ))}
              </div>
            )}
            <Link href="/look-into" className={styles.hcmWarn}>
              ⚠ This HCM funnel is incomplete — the roster of PEO clients running on PrismHR HCM
              isn&apos;t loaded yet, so it looks smaller than it is. Look into →
            </Link>
          </div>
        </section>

        {/* ── Band 2 · Debts out ─────────────────────────────────────────── */}
        <section className={styles.band}>
          <div className={styles.bandHead}>
            <span className={styles.bandNum}>2</span>
            <div>
              <h2 className={styles.bandTitle}>Debts out ({debts.length})</h2>
              <p className={styles.bandSub}>
                What you owe before an account can move — the recap, the availability request, the
                partner brief. Pulled live from the mandatory checkboxes on in-flight Dashboard
                nodes, oldest first.
              </p>
            </div>
          </div>
          <div className={styles.bandBody}>
            {dash.status === "database-unavailable" && (
              <p className={styles.muted}>
                The execution ledger isn&apos;t connected — run <code>docs/dashboard-tables.sql</code>{" "}
                in Supabase and start moving nodes on the <Link href="/">Dashboard</Link> to see what
                you owe.
              </p>
            )}
            {dash.status === "active" && debts.length === 0 && (
              <p className={styles.muted}>
                Nothing owed on any in-flight node. Either you&apos;re clean, or nothing has been
                started — advance a node on the <Link href="/">Dashboard</Link>.
              </p>
            )}
            {debts.slice(0, 12).map((d) => (
              <div key={`${d.cardId}-${d.nodeKey}-${d.item}`} className={styles.debt}>
                <div className={styles.debtTop}>
                  <span className={styles.debtName}>{d.cardName}</span>
                  <span className={styles.debtNode}>{d.nodeLabel}</span>
                  {ageBadge(d.ageDays)}
                </div>
                <div className={styles.debtItem}>{d.item}</div>
                {d.note && <div className={styles.debtNote}>“{d.note}”</div>}
              </div>
            ))}
            {debts.length > 12 && (
              <p className={styles.muted}>
                + {debts.length - 12} more on the <Link href="/">Dashboard</Link>.
              </p>
            )}
          </div>
        </section>

        {/* ── Band 3 · Highest-leverage move ─────────────────────────────── */}
        <section className={styles.band}>
          <div className={styles.bandHead}>
            <span className={styles.bandNum}>3</span>
            <div>
              <h2 className={styles.bandTitle}>Highest-leverage move</h2>
              <p className={styles.bandSub}>
                The one account to touch now — top Global-fit with a real play, not yet on the board.
                Lead with the partner, not the client.
              </p>
            </div>
          </div>
          <div className={styles.bandBody}>
            {!move && (
              <p className={styles.muted}>
                No account carries a qualified play yet. Deepen research or seed a partner from the{" "}
                <Link href="/accounts">Account Room</Link>.
              </p>
            )}
            {move && (
              <div className={styles.moveHero}>
                <div className={styles.moveTop}>
                  <Link href={`/accounts?focus=${move.id}`} className={styles.moveName}>
                    {move.name}
                  </Link>
                  <span className={`${styles.fit} ${fitClass(move.tier)}`}>{move.score}</span>
                  <PlayTag play={move.play} />
                  <FunnelChip funnel={move.funnel} />
                  {move.competitors.length > 0 && (
                    <span className={styles.signalCsm}>vs {move.competitors.join(", ")}</span>
                  )}
                </div>
                {move.summary && <p className={styles.signalSummary}>{move.summary}</p>}
                <div className={styles.moveAsk}>
                  <strong>The line for {move.csm}:</strong> {partnerAngle(move)}
                </div>
                <CopyLine text={partnerAngle(move)} />
              </div>
            )}
            {onDeck.length > 0 && (
              <div className={styles.onDeck}>
                <span className={styles.onDeckLabel}>On deck:</span>
                {onDeck.map((a) => (
                  <Link key={a.id} href={`/accounts?focus=${a.id}`} className={styles.onDeckChip}>
                    {a.name} <b>{a.score}</b>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Band 4 · Narrative forming ─────────────────────────────────── */}
        <section className={styles.band}>
          <div className={styles.bandHead}>
            <span className={styles.bandNum}>4</span>
            <div>
              <h2 className={styles.bandTitle}>Narrative forming</h2>
              <p className={styles.bandSub}>
                Voice of the base — the honest pattern in the data, and the line it&apos;s accruing
                toward your 1:1 with Aleks.
              </p>
            </div>
          </div>
          <div className={styles.bandBody}>
            <div className={styles.statRow}>
              <Stat n={`${nar.researched}/${nar.total}`} label="accounts researched" />
              <Stat n={nar.strongDemand} label="strong demand" />
              <Stat n={nar.emerging} label="emerging / hedged" />
              <Stat n={`${nar.displacement}/${nar.greenfield}`} label="displace / greenfield" />
              <Stat n={nar.hcmFunnel} label="HCM-funnel accounts" />
            </div>

            {nar.topCountries.length > 0 && (
              <div className={styles.narLine}>
                <span className={styles.narLabel}>Where the base points:</span>
                <div className={styles.countries}>
                  {nar.topCountries.map((c) => (
                    <span key={c.name} className={styles.countryChip}>
                      {c.name} <b>{c.count}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.narGrid}>
              <div className={styles.narCard}>
                <h4>The line up to Aleks</h4>
                <p>
                  “Demand across the base is thin but real — <b>{nar.strongDemand}</b> accounts carry
                  a solid global-hiring signal
                  {nar.emerging > 0 ? (
                    <>
                      , plus <b>{nar.emerging}</b> emerging (lower demand or confidence — worth a
                      partner conversation, not a forecast)
                    </>
                  ) : null}
                  . Split <b>{nar.displacement} displacement / {nar.greenfield} greenfield</b>. The
                  motion isn&apos;t volume, it&apos;s precision through partners — here&apos;s the one
                  I&apos;m converting this week.”
                </p>
              </div>
              <div className={styles.narCard}>
                <h4>Arm the partners</h4>
                <p>
                  At startup stage, the job is to make Eric and the CSMs dangerous on Global. Be
                  loud to Aleks and marketing on what we have, what we don&apos;t, and what we need —
                  capture it below so it&apos;s ready for the 1:1, not remembered on the spot.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Voice of the base & enablement gaps (capture) ──────────────── */}
        <h2 className={styles.h2}>Voice of the base &amp; enablement gaps</h2>
        <p className={styles.sub}>
          The running list you carry into the Aleks 1:1 and to marketing — what the base keeps
          asking for, what&apos;s missing to arm partners, and what you need from the org. Resolve an
          item once you&apos;ve raised it.
        </p>
        <div className={styles.notesWrap}>
          {!notes.available && (
            <p className={styles.muted}>
              Capture isn&apos;t connected yet — run <code>docs/dashboard-tables.sql</code> in
              Supabase (it now creates the FieldNote table) to start logging.
            </p>
          )}
          {notes.available && (
            <>
              <form action={addFieldNote} className={styles.noteForm}>
                <select name="kind" aria-label="Note kind" defaultValue="gap">
                  {FIELD_NOTE_KINDS.map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <input
                  name="body"
                  required
                  maxLength={2000}
                  placeholder="e.g. 3rd account this month asking about contractor conversion — need a one-pager"
                  aria-label="Note body"
                />
                <NoteSubmit />
              </form>

              {notes.notes.length === 0 ? (
                <p className={styles.muted}>Nothing logged yet.</p>
              ) : (
                <div className={styles.noteList}>
                  {notes.notes.map((n) => {
                    const meta = FIELD_NOTE_KINDS.find((k) => k.key === n.kind);
                    return (
                      <div key={n.id} className={styles.noteItem}>
                        <span className={`${styles.noteKind} ${styles[`kind_${n.kind}`] ?? ""}`}>
                          {meta?.label ?? n.kind}
                        </span>
                        <span className={styles.noteBody}>{n.body}</span>
                        <form action={resolveFieldNote} className={styles.noteResolve}>
                          <input type="hidden" name="id" value={n.id} />
                          <button className={styles.noteResolveBtn} aria-label="Resolve note">
                            Resolve
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── The daily loop ─────────────────────────────────────────────── */}
        <h2 className={styles.h2}>The three questions I run every day</h2>
        <div className={styles.cards}>
          <div className={styles.card}>
            <h3>1 · What changed in the base?</h3>
            <p className={styles.muted}>
              New global-hiring evidence, a partner flag, an inbound. <b>Read</b> the signal before
              anything else — Band 1 is the answer.
            </p>
          </div>
          <div className={styles.card}>
            <h3>2 · What do I owe, and who do I clear?</h3>
            <p className={styles.muted}>
              <b>Route</b> through the partner. Pay the debts in Band 2, and never jump a client
              before the CSM has cleared them.
            </p>
          </div>
          <div className={styles.card}>
            <h3>3 · What language drums up the intent?</h3>
            <p className={styles.muted}>
              The partner question: what do I say to <b>gauge, drum up, or campaign</b> a
              client&apos;s interest in Global? <b>Record</b> the answer on the Dashboard node.
            </p>
          </div>
        </div>

        {/* ── 30 / 60 / 90 ───────────────────────────────────────────────── */}
        <h2 className={styles.h2}>30 / 60 / 90 — first-ever 1:1 with Aleks is Monday</h2>
        <div className={styles.plan}>
          <div className={styles.planCol}>
            <div className={styles.planNum}>First 30</div>
            <div className={styles.planTheme}>Learn the base · arm the partners</div>
            <ul>
              <li>Ship the Account Room as shared targeting intel partners can see.</li>
              <li>Sit with each partner — start with Eric — and map their books to Global fit.</li>
              <li>Publish the first enablement-gap list to Aleks + marketing.</li>
              <li>Land the first 2–3 partner-cleared discovery calls.</li>
            </ul>
          </div>
          <div className={styles.planCol}>
            <div className={styles.planNum}>By 60</div>
            <div className={styles.planTheme}>Convert signal to pipeline</div>
            <ul>
              <li>A handful of qualified Global opportunities in flight on the Dashboard.</li>
              <li>First tailored demos delivered — countries and worker types matched.</li>
              <li>A repeatable partner-brief motion (the same three questions every time).</li>
              <li>First “voice of the base” note to marketing.</li>
            </ul>
          </div>
          <div className={styles.planCol}>
            <div className={styles.planNum}>By 90</div>
            <div className={styles.planTheme}>Prove the motion</div>
            <ul>
              <li>First Global close or a deal in late-stage decision.</li>
              <li>A documented displacement + greenfield play partners can self-serve.</li>
              <li>A standing lunch-and-learn / SME webinar cadence.</li>
              <li>A weekly base-signal digest that Aleks can carry upward.</li>
            </ul>
          </div>
        </div>

        {/* ── Weekly 1:1 agenda ──────────────────────────────────────────── */}
        <h2 className={styles.h2}>Weekly 1:1 with Aleks — standing agenda</h2>
        <div className={styles.agenda}>
          <ol>
            <li>
              <b>Base-expansion pipeline</b> — what moved this week, what&apos;s next, where it&apos;s
              stuck.
            </li>
            <li>
              <b>Partner health</b> — who&apos;s engaged (Eric, the CSMs), who&apos;s cold, where I
              need her air cover.
            </li>
            <li>
              <b>Market signal</b> — the one thing the base is telling us (voice of the base, above).
            </li>
            <li>
              <b>Asks / air cover</b> — what I need from her or marketing to arm partners.
            </li>
            <li>
              <b>Enablement gaps</b> — what we have, what we don&apos;t, what we need to sell Global.
            </li>
            <li>
              <b>The narrative up</b> — the one line she carries to her leadership.
            </li>
          </ol>
          <p className={styles.muted}>
            PEPM = per employee, per month — the unit EOR and global payroll price on. Keep the deal
            math in those terms when you brief her.
          </p>
        </div>
      </main>
    </>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statNum}>{n}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
