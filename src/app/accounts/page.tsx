import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { EXTRA_PARTNERS } from "@/lib/book/partners";
import { contactCount, contactsFor } from "@/lib/book/contacts";
import { peopleFor } from "@/lib/intel/people";
import { relationshipFor } from "@/lib/intel/relationship";
import { anyLiveGem, fetchSecondRecords } from "@/lib/activity/read";
import { parseResearchBody, researchNs } from "@/lib/intel/deep-research";
import { loadCommand } from "@/lib/command-center/data";
import { loadDashboard } from "@/lib/dashboard/data";
import { readOutcome } from "@/lib/dashboard/outcome";
import { digestForCardName } from "@/lib/intel/digest";
import { SENDBOOK_NS, recordSends } from "@/lib/sendbook/read";
import { compositeScore, deskScore } from "@/lib/book/scoring";
import {
  analyzePlay,
  extractCountries,
  getDemand,
  researchGeneratedAt,
} from "@/lib/book/research";
import {
  loadAccountNotes,
  loadDispositions,
  loadEngagements,
  loadPartnerNotes,
  loadTodos,
  loadTouches,
  loadValidations,
} from "@/lib/today/overlay";
import { clearDisposition } from "../today/actions";
import { LocalTime } from "../today-client";
import { EMPTY_ENGAGEMENT } from "@/lib/engagement";
import type { LinkedNote } from "@/components/account-notes";
import { AccountsClient, type AccountRow } from "../accounts-client";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

// The live research note's first human line — the summary fallback when the
// book-wide sweep never met the account but a paid deep pass did.
function firstLineOf(body: string): string {
  return (
    body
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !/^[☰✎⚡▢✔☎✉✓]/.test(l)) ?? ""
  ).slice(0, 240);
}

export default async function AccountsPage() {
  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Accounts" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const canAdd = access.canWrite && hasDatabaseEnv();
  const now = new Date();

  // Which accounts are already on the dashboard (matched by name) — so the
  // "+ Dashboard" button can show an added state instead of doing nothing visible.
  let onDashboard: string[] = [];
  if (canAdd) {
    try {
      const cards = await getPrisma().dashCard.findMany({ select: { name: true } });
      onDashboard = cards.map((c) => c.name);
    } catch {
      onDashboard = [];
    }
  }

  // Owner/CSM validation overlay — confirmed/flagged annotate; adjusted overrides
  // demand and reflows the composite.
  const validations = await loadValidations();
  const engagements = await loadEngagements();
  const chipNotes = await loadAccountNotes();
  const dispositions = await loadDispositions();
  // The risk register (founder-decreed 2026-08-20, from the SF banner on LSI
  // Staffing): risk:<accountId> notes carry Salesforce's Account Risk Level;
  // the newest note is the level. HIGH lights the row red — real risk is the
  // one thing red is for.
  const riskById = new Map<string, string>();
  for (const [id, list] of chipNotes) {
    if (!id.startsWith("risk:")) continue;
    const accountId = id.slice("risk:".length);
    const head = (list[0]?.body ?? "")
      .split(/[\n—·]/)[0]
      .trim()
      .toUpperCase();
    if (accountId && head) riskById.set(accountId, head);
  }
  // The partner register, folded in. Partners used to own a tab; the work
  // happens account by account now, so the roster lives here — present,
  // countable, and out of the way.
  const [partnerNotes, touches] = await Promise.all([loadPartnerNotes(), loadTouches()]);
  // Working-the-deal state (stage/approach/intent/next action) — the Book's
  // store, now living inside each account's expanded row.
  const command = await loadCommand();
  const peoStateById = new Map(command.rows.map((r) => [r.id, r]));

  // Notetaker notes linked to accounts (surfaced read-only here).
  const notesByAccount = new Map<string, LinkedNote[]>();
  for (const t of await loadTodos()) {
    if (!t.accountId) continue;
    const list = notesByAccount.get(t.accountId) ?? [];
    list.push({ id: t.id, body: t.body, done: t.done, remindAt: t.remindAt });
    notesByAccount.set(t.accountId, list);
  }

  // Not-mine accounts drop out of the room and into the exclusions ledger below
  // — kept with the reason and date so the book count reconciles and you
  // remember why (and can undo).
  const excluded = peos
    .map((p) => ({ p, d: dispositions.get(p.id) }))
    .filter((x) => x.d?.status === "not-mine");
  const excludedIds = new Set(excluded.map((x) => x.p.id));

  // The board's word on every account (founder-decreed 2026-08-20): a
  // stamped outcome outranks any "in motion" read, a live row IS motion,
  // and cold outreach without a row reads ENGAGED — never "in motion".
  const boardById = new Map<string, { outcome: "won" | "lost" | null; live: boolean }>();
  {
    const dash = await loadDashboard();
    if (dash.status !== "unauthenticated" && dash.status !== "database-unavailable") {
      const idByName = new Map(peos.map((p) => [p.name.toLowerCase(), p.id]));
      for (const card of dash.cards) {
        const id =
          idByName.get(card.name.toLowerCase()) ??
          digestForCardName(card.name)?.accountId ??
          "";
        if (!id) continue;
        const b = boardById.get(id) ?? { outcome: null, live: false };
        const o = readOutcome(card.notes);
        if (o) b.outcome = o.status;
        else if (!card.archived) b.live = true;
        boardById.set(id, b);
      }
    }
  }
  // Cold outreach on the record: a logged touch, a tapped Sendbook channel,
  // or a filed outbound — the widest merge the app holds (Ted doctrine).
  const engagedIds = new Set<string>();
  for (const t of touches) {
    const m = /^outreach:(.+)$/.exec(t.subjectKey);
    if (m) engagedIds.add(m[1]);
  }
  for (const key of chipNotes.keys())
    if (key.startsWith(SENDBOOK_NS)) engagedIds.add(key.slice(SENDBOOK_NS.length));

  // One row per partner who actually owns something in the book.
  const partnerRoster = (() => {
    const acc = new Map<
      string,
      {
        name: string;
        accounts: number;
        notes: number;
        touches: number;
        lastTouch: string;
      }
    >();
    // Membership comes from the book alone (founder-decreed 2026-08-20): a
    // partner is a CSM who owns accounts, or a name on the known-partners
    // list. The touch log's freeform labels ENRICH a seat — they never mint
    // one, or every early jotting ("send pricing to bryce", a pasted message)
    // becomes a person with 0 accounts and a broken row.
    const KNOWN = new Set<string>(EXTRA_PARTNERS.map((n) => n.trim()));
    for (const p of peos) if (p.csm && p.csm !== "Unassigned") KNOWN.add(p.csm.trim());
    const seat = (name: string) => {
      const key = name.trim();
      if (!key || key === "Unassigned" || !KNOWN.has(key)) return null;
      const found = acc.get(key);
      if (found) return found;
      const fresh = { name: key, accounts: 0, notes: 0, touches: 0, lastTouch: "" };
      acc.set(key, fresh);
      return fresh;
    };
    for (const p of peos) {
      // Not-mine accounts are excluded from the room above; counting them here
      // would make a partner look busier than they are.
      if (excludedIds.has(p.id)) continue;
      const row = seat(p.csm ?? "");
      if (row) row.accounts += 1;
    }
    for (const [partner, list] of partnerNotes) {
      const row = seat(partner);
      if (!row) continue;
      row.notes += list.length;
      // A filed partner note is as real a touch as a logged send (Ted
      // doctrine) — "last" reads the latest of both stores.
      for (const n of list)
        if (!row.lastTouch || Date.parse(n.createdAt) > Date.parse(row.lastTouch))
          row.lastTouch = n.createdAt;
    }
    for (const t of touches) {
      const row = seat(t.label ?? "");
      if (!row) continue;
      row.touches += 1;
      if (!row.lastTouch || Date.parse(t.contactedAt) > Date.parse(row.lastTouch))
        row.lastTouch = t.contactedAt;
    }
    return [...acc.values()].sort(
      (a, b) => b.accounts - a.accounts || a.name.localeCompare(b.name),
    );
  })();

  // The second record, one query for the whole book — the three new columns
  // and the in-row fold read from this map.
  const secondById = await fetchSecondRecords().catch(
    () => new Map<string, never>() as Awaited<ReturnType<typeof fetchSecondRecords>>,
  );

  const rows: AccountRow[] = peos
    .filter((p) => !excludedIds.has(p.id))
    .map((p) => {
      const d = deskScore(p, {
        lastActivityIso: (chipNotes.get(p.id) ?? [])[0]?.createdAt,
        now,
      });
      const dem = getDemand(p.id);
      // The relationship outranks the book seed here too (Ted doctrine):
      // the contact this page names, mails, exports, and merges into
      // campaign copy is the record's person, book seed only as fallback.
      const rel = relationshipFor(chipNotes.get(p.id) ?? [], contactsFor(p.id), {
        name: p.contactName,
        email: p.contactEmail,
      });
      // Research reads BOTH stores: the book-wide sweep and the live
      // deep-pass notes — a paid pass must never render "Not researched."
      // The stores merge by latest (Ted doctrine): whichever pass spoke last
      // supplies each field; the other stands in where it is silent.
      const liveResearch = (chipNotes.get(researchNs(p.id)) ?? [])[0];
      const liveFinding = liveResearch ? parseResearchBody(liveResearch.body) : null;
      const liveNewer =
        !!liveResearch &&
        (Number.isNaN(Date.parse(researchGeneratedAt)) ||
          Date.parse(liveResearch.createdAt) >= Date.parse(researchGeneratedAt));
      const seedSignals = dem?.signals ?? [];
      const liveSignals = liveFinding?.signals ?? [];
      const seedEvidence = dem?.evidence ?? [];
      const liveEvidence = (liveFinding?.sources ?? []).map((s) => ({
        claim: s.title,
        url: s.url,
      }));
      const researchedDemand = dem?.researched ? dem.demandScore : null;
      const v = validations.get(p.id);
      const demand =
        v?.status === "adjusted" && v.adjustedDemand != null
          ? Math.max(0, Math.min(100, Math.round(v.adjustedDemand)))
          : researchedDemand;
      const c = compositeScore(d.score, demand, dem?.confidence ?? "low");
      // Play re-gates on the (possibly adjusted) demand; competitor detection is
      // text-based and unchanged.
      const basePl = analyzePlay(dem);
      const play =
        demand != null && demand >= 30
          ? basePl.competitors.length
            ? "displacement"
            : "greenfield"
          : demand == null
            ? basePl.play
            : null;
      return {
        id: p.id,
        name: p.name,
        industry: p.industry,
        sizeBucket: p.sizeBucket,
        size: p.size,
        city: p.city,
        state: p.state,
        csm: p.csm,
        cloud: p.cloud,
        website: p.website,
        contactName: rel.name,
        contactEmail: rel.email,
        incumbent: d.incumbent,
        deskScore: d.score,
        demand,
        confidence: dem?.confidence ?? "low",
        signals:
          liveNewer && liveSignals.length
            ? liveSignals
            : seedSignals.length
              ? seedSignals
              : liveSignals,
        evidence:
          liveNewer && liveEvidence.length
            ? liveEvidence
            : seedEvidence.length
              ? seedEvidence
              : liveEvidence,
        summary:
          (liveNewer ? liveFinding?.summary : "") ||
          dem?.summary ||
          liveFinding?.summary ||
          firstLineOf(liveResearch?.body ?? ""),
        researched: (dem?.researched ?? false) || !!liveResearch,
        play: play as AccountRow["play"],
        competitors: basePl.competitors,
        countries: [
          ...new Set([...extractCountries(dem), ...(liveFinding?.countries ?? [])]),
        ],
        demandAdj: c.demandAdj,
        confFactor: c.confFactor,
        score: c.score,
        tier: c.tier,
        breakdown: d.breakdown,
        validation: v
          ? { status: v.status, note: v.note, adjustedDemand: v.adjustedDemand }
          : null,
        engagement: engagements.get(p.id) ?? EMPTY_ENGAGEMENT,
        risk: riskById.get(p.id) ?? null,
        second: (() => {
          const sr = secondById.get(p.id);
          if (!sr) return null;
          const lh = sr.rollup?.lastHuman ?? null;
          const gem = anyLiveGem(sr);
          const live = sr.gems.filter((g) => !g.actedDay).slice(0, 3);
          return {
            touch: lh ? { who: lh.who, day: lh.day, kind: lh.kind } : null,
            gems: live.map((g) => ({
              term: g.term,
              act: g.act,
              reason: g.reason,
              whenDay: g.whenDay,
              cites: g.cites,
            })),
            act: gem && !gem.actedDay ? gem.act : null,
            verdict: sr.rollup?.verdict ?? "",
            supportTotal: sr.support?.total ?? 0,
            spikeDay: sr.support?.spike?.day ?? "",
          };
        })(),
        disposition: (() => {
          const board = boardById.get(p.id);
          // The stamp outranks everything: a Closed deal is never "in motion".
          if (board?.outcome)
            return {
              status: board.outcome,
              reason: "Stamped on the HomeRoom board. The record keeps everything.",
            };
          const d = dispositions.get(p.id);
          if (d && (d.status === "motion" || d.status === "parked"))
            return { status: d.status, reason: d.reason };
          if (board?.live)
            return { status: "motion" as const, reason: "On the HomeRoom board." };
          if (engagedIds.has(p.id) || recordSends(chipNotes.get(p.id) ?? []).length > 0)
            return {
              status: "engaged" as const,
              reason: "Cold outreach on the record. No HomeRoom row yet.",
            };
          return null;
        })(),
        notes: notesByAccount.get(p.id) ?? [],
        contactCount: contactCount(p.id),
        // Two registers: the working record ("mine") renders by default; the
        // background register (case/support traffic) sits behind a click.
        chipNotes: (chipNotes.get(p.id) ?? [])
          .filter((n) => n.lane === "mine")
          .map((n) => ({
            id: n.id,
            partner: n.partner,
            kind: n.kind,
            body: n.body,
            actors: n.actors,
            createdAt: n.createdAt,
          })),
        bgNotes: (chipNotes.get(p.id) ?? [])
          .filter((n) => n.lane === "background")
          .map((n) => ({
            id: n.id,
            partner: n.partner,
            kind: n.kind,
            body: n.body,
            actors: n.actors,
            createdAt: n.createdAt,
          })),
        people: peopleFor(chipNotes.get(p.id) ?? [], contactsFor(p.id)),
        stage: peoStateById.get(p.id)?.stage ?? "NOT_TOUCHED",
        approach: peoStateById.get(p.id)?.approach ?? "NEEDS_CSM",
        intent: peoStateById.get(p.id)?.intent ?? "UNKNOWN",
        blended: peoStateById.get(p.id)?.priority ?? 0,
        nextAction: peoStateById.get(p.id)?.nextAction ?? null,
        nextActionDate: peoStateById.get(p.id)?.nextActionDate ?? null,
        peoNotes: peoStateById.get(p.id)?.notes ?? null,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <AppWayfinder current="Accounts" />
      <main className={styles.wrap}>
        {/* The header lives in the client (founder-decreed 2026-08-21): the
            subtext is retired; the copy/CSV icons ride beside the title. */}
        <AccountsClient
          rows={rows}
          canAdd={canAdd}
          canWrite={canAdd}
          onDashboard={onDashboard}
        />

        {/* The partner register — everything the Partners tab held, kept as an
            archival fold: who owns which accounts, how much traffic each has,
            and the way into their room. Quiet by construction. */}
        {partnerRoster.length > 0 && (
          <details className={styles.ledger}>
            <summary className={styles.ledgerSummary}>
              Partner roster ({partnerRoster.length})
            </summary>
            <ul className={styles.ledgerList}>
              {partnerRoster.map((p) => (
                <li key={p.name} className={styles.ledgerRow}>
                  <b>{p.name}</b>
                  <span className={styles.ledgerWhy}>
                    {p.accounts} account{p.accounts === 1 ? "" : "s"}
                    {p.notes > 0 ? ` · ${p.notes} filed` : ""}
                    {p.touches > 0 ? ` · ${p.touches} outreach` : ""}
                    {p.lastTouch ? (
                      <>
                        {" · last "}
                        <LocalTime iso={p.lastTouch} />
                      </>
                    ) : null}
                  </span>
                  <Link href="/partners" className={styles.ledgerLink}>
                    their room
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* The exclusions ledger — accounts marked "not mine" leave the room
            but never vanish silently: name, reason, when, and an undo. */}
        {excluded.length > 0 && (
          <details className={styles.ledger}>
            <summary className={styles.ledgerSummary}>
              Excluded as not mine ({excluded.length})
            </summary>
            <ul className={styles.ledgerList}>
              {excluded.map(({ p, d }) => (
                <li key={p.id} className={styles.ledgerRow}>
                  <b>{p.name}</b>
                  <span className={styles.ledgerWhy}>
                    {d?.reason || "no reason logged"} ·{" "}
                    {d ? <LocalTime iso={d.updatedAt} /> : null}
                  </span>
                  <form action={clearDisposition} className={styles.valInline}>
                    <input type="hidden" name="accountId" value={p.id} />
                    <input type="hidden" name="returnTo" value="/accounts" />
                    <button className={styles.ledgerUndo}>↩ Restore</button>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        )}
      </main>
    </>
  );
}
