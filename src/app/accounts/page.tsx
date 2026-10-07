import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { csms, peos } from "@/lib/book";
import { EXTRA_PARTNERS } from "@/lib/book/partners";
import { contactCount, contactsFor } from "@/lib/book/contacts";
import { collisionFor, fetchSecondRecords } from "@/lib/activity/read";
import { readAccount, secondRecordFor } from "@/lib/record/read";
import { lastHumanTouch, sheetSecond } from "@/lib/record/accounts";
import { homeSideFrom } from "@/lib/pipeline/build";
import { ACT_DRAFT_NS, parseActDraftBody } from "@/lib/act/lane";
import { parseResearchBody, researchNs } from "@/lib/intel/deep-research";
import { loadCommand } from "@/lib/command-center/data";
import { loadDashboard } from "@/lib/dashboard/data";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import { SENDBOOK_NS } from "@/lib/sendbook/read";
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
import { clearDisposition } from "../room/ledger-actions";
import { LocalTime } from "../today-client";
import { EMPTY_ENGAGEMENT } from "@/lib/engagement";
import type { LinkedNote } from "@/components/account-notes";
import { theirLoopOf } from "@/lib/room/owed";
import { AccountsClient, type AccountRow } from "../accounts-client";
import { boardWords, liveOnBoard, registersOf, touchCiteOf } from "./rules";
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

  // Notetaker notes linked to accounts (surfaced read-only here). A loop on
  // their side (D10) is not the operator's note; owedByThem reads it.
  const todos = await loadTodos();
  const notesByAccount = new Map<string, LinkedNote[]>();
  for (const t of todos) {
    if (!t.accountId || theirLoopOf(t.body)) continue;
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
  // The fold lives in ./rules (boardWords) so the suite calls it.
  const boardById = await (async () => {
    const dash = await loadDashboard();
    if (dash.status === "unauthenticated" || dash.status === "database-unavailable")
      return boardWords([], () => "");
    const idByName = new Map(peos.map((p) => [p.name.toLowerCase(), p.id]));
    return boardWords(
      dash.cards,
      (name) =>
        idByName.get(name.toLowerCase()) ?? digestForCardName(name)?.accountId ?? "",
    );
  })();
  // Who counts as our side, read over the WHOLE book — the CSM column plus
  // everyone the record shows working across several accounts — built once,
  // the way the room builds it, and handed to every read below (E9: the
  // caller says who we are; the read never guesses).
  const ourSide = [...csms, ...homeSideFrom(chipNotes)];
  // The Sendbook's tapped channel (a sendbook:<id> note) is the one door to
  // "engaged" the read's input does not carry: namespaced rows never enter an
  // account's corpus. The touch log and the record's own sends are the
  // read's (conversationExists, field 16), so the old outreach rung is gone.
  const tapped = new Set<string>();
  for (const key of chipNotes.keys())
    if (key.startsWith(SENDBOOK_NS)) tapped.add(key.slice(SENDBOOK_NS.length));

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
      // The single account read (src/lib/record/read.ts; the Chute brains
      // refactor plan, §2.2, slice 15): one read of every store for this
      // account, from the same loaders the room reads. The touch column, the
      // engaged read, the newest-note clock and the relationship take their
      // facts from it; the book's roster and seeded contact ride in as the
      // seeds the record outranks (the Ted doctrine).
      const acct = readAccount({
        account: {
          id: p.id,
          name: p.name,
          contacts: contactsFor(p.id),
          contact: { name: p.contactName, email: p.contactEmail },
        },
        notes: chipNotes.get(p.id) ?? [],
        touches,
        todos,
        dispositions,
        // Folded by canonical id: a drop keyed by a shell id reads under the
        // one account (E17) — the fold §2.7 names for C1's merge on this page.
        secondRecord: secondRecordFor(secondById, p.id),
        homeSide: ourSide,
        digest: digestFor(p.id) ?? digestForCardName(p.name),
        now,
      });
      const sr = acct.secondRecord;
      const touch = lastHumanTouch(acct, sr);
      // Hidden is hidden (pass 8 X1): the registers read the record minus
      // the read's own ✕-parked set.
      const registers = registersOf(chipNotes.get(p.id) ?? [], acct.hidden);
      const d = deskScore(p, {
        // The newest entry's moment (field 20): the visible record's own
        // clock, never a ✕-parked row; "" on an empty record is no clock.
        lastActivityIso: acct.lastRecordAt || undefined,
        now,
      });
      const dem = getDemand(p.id);
      // The relationship outranks the book seed here too (Ted doctrine):
      // the contact this page names, mails, exports, and merges into
      // campaign copy is the record's person, book seed only as fallback —
      // the read's own answer (field 13), the same one the room shows.
      const rel = acct.relationship;
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
        // The Act Lane's saved draft — one per account, newest wins.
        actDraft: (() => {
          const n = (chipNotes.get(`${ACT_DRAFT_NS}${p.id}`) ?? [])[0];
          const d = n ? parseActDraftBody(n.body) : null;
          return d ? { to: d.to, subject: d.subject, body: d.body } : null;
        })(),
        // The ✓ stamp: the newest acted gem's day and term (take-back needs
        // the term). "" when nothing is stamped.
        actedDay: (sr?.gems ?? []).find((x) => x.actedDay)?.actedDay ?? "",
        actedTerm: (sr?.gems ?? []).find((x) => x.actedDay)?.term ?? "",
        // The fork's HomeRoom half reads a live deal: an archived card or a
        // Closed Won/Lost stamp is not one (pass 8 A4; the board lift).
        onBoard: liveOnBoard(boardById.get(p.id)),
        // The quiet flag's fact (the direct doctrine; pass 8 A7, A8): live
        // marketing sends or a colleague's thread inside seven days, read by
        // the same collision guard Groundwork's file card reads, over both
        // records: the export and the read's own docs (pass 9 seam, S-18).
        collision: collisionFor(sr, now, acct),
        // LAST HUMAN TOUCH reads both records (C1): the later of the read's
        // own touch and the export's last human row, with the whisper. Its
        // cite is the door one click down (pass 8 A5).
        touch,
        touchCite: touchCiteOf(acct, touch, sr?.rollup?.lastHuman ?? null),
        // The row's gems and the ACT chip read only an account person's gems
        // (C6, C16, amended 2026-10-05) through the THEIRS line's own
        // builder — a colleague's gem never raises an act for the operator.
        second: sheetSecond(sr),
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
          // Engaged reads the conversation (field 16): any doc with a
          // direction — a send of ours or their inbound — or any touch, so an
          // inbound with no send reads engaged and a bounce or a sign-off
          // alone does not; the Sendbook's tap is the second door.
          if (acct.conversationExists || tapped.has(p.id))
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
        chipNotes: registers.mine,
        bgNotes: registers.background,
        // The people index is the read's own (field 19), over the visible
        // record only, joined to the roster.
        people: acct.people,
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
