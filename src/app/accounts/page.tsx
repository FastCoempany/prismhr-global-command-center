import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { contactCount, contactsFor } from "@/lib/book/contacts";
import { peopleFor } from "@/lib/intel/people";
import { loadCommand } from "@/lib/command-center/data";
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
    const seat = (name: string) => {
      const key = name.trim();
      if (!key || key === "Unassigned") return null;
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
      if (row) row.notes += list.length;
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

  const rows: AccountRow[] = peos
    .filter((p) => !excludedIds.has(p.id))
    .map((p) => {
      const d = deskScore(p);
      const dem = getDemand(p.id);
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
        contactName: p.contactName,
        contactEmail: p.contactEmail,
        incumbent: d.incumbent,
        deskScore: d.score,
        demand,
        confidence: dem?.confidence ?? "low",
        signals: dem?.signals ?? [],
        evidence: dem?.evidence ?? [],
        summary: dem?.summary ?? "",
        researched: dem?.researched ?? false,
        play: play as AccountRow["play"],
        competitors: basePl.competitors,
        countries: extractCountries(dem),
        demandAdj: c.demandAdj,
        confFactor: c.confFactor,
        score: c.score,
        tier: c.tier,
        breakdown: d.breakdown,
        validation: v
          ? { status: v.status, note: v.note, adjustedDemand: v.adjustedDemand }
          : null,
        engagement: engagements.get(p.id) ?? EMPTY_ENGAGEMENT,
        disposition: (() => {
          const d = dispositions.get(p.id);
          return d && (d.status === "motion" || d.status === "parked")
            ? { status: d.status, reason: d.reason }
            : null;
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
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>Account Room</h1>

          <p
            className={styles.sub}
            title="Global fit blends 40% account profile with 60% researched demand, weighted by confidence. The profile covers size, platform, model, and recency. Play flags a competitor EOR already in place."
          >
            All {rows.length} accounts, scored for Global fit: 40% profile, 60% demand.
            Research from {researchGeneratedAt}.
          </p>
        </div>
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
