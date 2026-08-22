import { AppWayfinder } from "@/components/app-wayfinder";
import { getPeo, peos } from "@/lib/book";
import { DISCOVERY, questionsFor } from "@/lib/intel/discovery";
import { PRODUCT_BANK } from "@/lib/intel/discovery-product";
import { SCENARIOS } from "@/lib/intel/scenarios";
import { knowledgeKey, readPlaybook } from "@/lib/playbook/store";
import { fetchSecondRecords } from "@/lib/activity/read";
import { approveSecondDraft, dismissSecondDraft } from "./actions";
import { loadAccountNotes, loadDispositions } from "@/lib/today/overlay";
import { prospectAsks } from "@/lib/intranet/store";
import { harvestBattlecards } from "@/lib/intranet/bridges";
import { PlaybookClient } from "./playbook-client";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

// The Playbook — what the whole book has taught, plus the card that puts it to
// work. Three registers: the lessons deals leave behind, the market facts that
// outlive the account they came from, and the discovery card, shaped to the
// scenario in front of you.
export default async function PlaybookPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  // ?open=<questionId> — a deep link from an answer lands on the exact card,
  // scrolled to and lit, never a page the operator has to search again.
  const openId = typeof sp.open === "string" ? sp.open.slice(0, 60) : "";

  const [acctNotes, dispositions, buyerAsks] = await Promise.all([
    loadAccountNotes(),
    loadDispositions(),
    prospectAsks(600),
  ]);
  const { market, lessons } = readPlaybook(acctNotes);

  // The second record's draft queue (5.5): support themes crossing the
  // threshold — ≥5 cases on a theme, top 3 book-wide — become DRAFT market
  // facts awaiting the operator's hand. Approved and dismissed drafts leave
  // the queue; arithmetic only, the counts come from the rollup builder.
  const srDrafts = await (async () => {
    try {
      const secondById = await fetchSecondRecords();
      const nameById = new Map(peos.map((p) => [p.id, p.name]));
      const agg = new Map<
        string,
        { label: string; n: number; accounts: Set<string>; bestId: string; bestN: number }
      >();
      for (const [id, sr] of secondById) {
        if (!nameById.has(id)) continue;
        for (const t of sr.support?.themes ?? []) {
          const key = t.label.toLowerCase();
          const cur = agg.get(key) ?? {
            label: t.label,
            n: 0,
            accounts: new Set<string>(),
            bestId: id,
            bestN: 0,
          };
          cur.n += t.n;
          cur.accounts.add(id);
          if (t.n > cur.bestN) {
            cur.bestN = t.n;
            cur.bestId = id;
          }
          agg.set(key, cur);
        }
      }
      const marketKeys = new Set(market.map((m) => knowledgeKey(m.text)));
      const dismissed = new Set(
        [...dispositions.keys()]
          .filter((k) => k.startsWith("srdraft:"))
          .map((k) => k.slice("srdraft:".length)),
      );
      return [...agg.values()]
        .filter((a) => a.n >= 5)
        .sort((a, b) => b.n - a.n)
        .slice(0, 3)
        .map((a) => {
          const text = `Support traffic keeps hitting "${a.label}": ${a.n} cases across ${a.accounts.size} account${a.accounts.size === 1 ? "" : "s"} this window. Say how Global sits beside it.`;
          return {
            key: knowledgeKey(text),
            text,
            accountId: a.bestId,
            accountName: nameById.get(a.bestId) ?? "",
          };
        })
        .filter((d) => !marketKeys.has(d.key) && !dismissed.has(d.key));
    } catch {
      return [];
    }
  })();

  // IV.5 · what real buyers asked, read from the brain — proposals beside the
  // lessons and market facts they feed. The brain proposes; the Playbook is
  // written by hand.
  const harvest = harvestBattlecards(
    buyerAsks,
    [...DISCOVERY, ...PRODUCT_BANK].map((q) => q.question),
  );

  // The card is account-less (binding retired, founder-decreed 2026-08-22):
  // questions stay country-agnostic.
  const fill = (s: string) => s.replaceAll("{countries}", "their countries");

  // The whole bank: the original country-agnostic questions plus the
  // product-line depth. `questionsFor` handles the originals' phase ordering;
  // here every question is available and the card does the shaping.
  const bank = [
    ...questionsFor({ phase: "contract", gaps: [], countries: [] }),
    ...PRODUCT_BANK,
  ];

  const questions = bank.map((q) => ({
    id: q.id,
    category: q.category,
    phase: q.phase,
    audience: q.audience,
    product: q.product ?? "any",
    soph: q.soph ?? "any",
    question: fill(q.question),
    why: q.why,
    listenFor: q.listenFor,
    followUp: q.followUp,
    relayLine: fill(q.relayLine),
  }));

  return (
    <>
      <AppWayfinder current="Playbook" />
      <main className={styles.wrap}>
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>Playbook</h1>
          <p className={styles.sub}>
            {questions.length} questions across EOR, contractor management, and global
            payroll, shaped by the scenario you&apos;re actually in. Below: what the book
            has learned, carried across every account.
          </p>
        </div>
        {srDrafts.length > 0 && (
          <details className="srDraftQueue">
            <summary>
              FROM THE SECOND RECORD — {srDrafts.length} DRAFT
              {srDrafts.length === 1 ? "" : "S"} ▾
            </summary>
            {srDrafts.map((d) => (
              <div key={d.key} className="srDraftCard">
                <p>{d.text}</p>
                <div>
                  <form action={approveSecondDraft} style={{ display: "inline" }}>
                    <input type="hidden" name="text" value={d.text} />
                    <input type="hidden" name="accountId" value={d.accountId} />
                    <input type="hidden" name="accountName" value={d.accountName} />
                    <button type="submit" title="File it as a market fact">
                      Approve ✓
                    </button>
                  </form>
                  <form action={dismissSecondDraft} style={{ display: "inline" }}>
                    <input type="hidden" name="key" value={d.key} />
                    <button
                      type="submit"
                      title="Close without filing — it never re-proposes"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </details>
        )}
        <PlaybookClient
          questions={questions}
          scenarios={SCENARIOS}
          initialOpen={openId}
          lessons={lessons.map((l) => ({
            id: l.id,
            text: l.text,
            // The live book name outranks the frozen tail — accounts rename
            // (Ted doctrine). Who SAID it stays frozen; that's point-in-time.
            from: getPeo(l.accountId)?.name ?? l.accountName,
            at: l.at,
          }))}
          market={market.map((m) => ({
            id: m.id,
            text: m.text,
            who: m.who,
            from: getPeo(m.accountId)?.name ?? m.accountName,
            at: m.at,
          }))}
          prospectAsks={harvest.propose.map((p) => ({
            question: p.question,
            read: p.read,
            asked: p.asked,
            rooms: p.rooms.join(", "),
          }))}
          oursNotTheirs={harvest.oursNotTheirs}
        />
      </main>
    </>
  );
}
