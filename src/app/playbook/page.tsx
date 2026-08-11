import { AppWayfinder } from "@/components/app-wayfinder";
import { peos } from "@/lib/book";
import { DISCOVERY, questionsFor } from "@/lib/intel/discovery";
import { PRODUCT_BANK } from "@/lib/intel/discovery-product";
import { SCENARIOS } from "@/lib/intel/scenarios";
import { COUNTRY_NAME } from "@/lib/intel/lexicon";
import { dealIntelFor } from "@/lib/intel/extract";
import { readPlaybook } from "@/lib/playbook/store";
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
  const accountId = typeof sp.account === "string" ? sp.account : "";
  const account = accountId ? (peos.find((p) => p.id === accountId) ?? null) : null;

  const [acctNotes, dispositions, buyerAsks] = await Promise.all([
    loadAccountNotes(),
    loadDispositions(),
    prospectAsks(600),
  ]);
  const { market, lessons } = readPlaybook(acctNotes);

  // IV.5 · what real buyers asked, read from the brain — proposals beside the
  // lessons and market facts they feed. The brain proposes; the Playbook is
  // written by hand.
  const harvest = harvestBattlecards(
    buyerAsks,
    [...DISCOVERY, ...PRODUCT_BANK].map((q) => q.question),
  );

  // Country substitution runs off the bound account's own intel; with no
  // account the questions stay country-agnostic ("their countries").
  let countries: string[] = [];
  let accountName = "";
  if (accountId) {
    accountName = account?.name ?? accountId;
    const intel = dealIntelFor(accountId, accountName, {
      acctNotes: acctNotes.get(accountId),
    });
    countries = intel.countries.map((c) => c.value);
  }
  const names = countries.map((c) => COUNTRY_NAME[c] ?? c.toUpperCase());
  const merged = names.length > 0 ? names.join(", ") : "their countries";
  const fill = (s: string) => s.replaceAll("{countries}", merged);

  // The whole bank: the original country-agnostic questions plus the
  // product-line depth. `questionsFor` handles the originals' phase ordering;
  // here every question is available and the card does the shaping.
  const bank = [
    ...questionsFor({ phase: "contract", gaps: [], countries }),
    ...PRODUCT_BANK,
  ];

  // A question retired for this account stays retired — keyed by (account, id),
  // which is why question ids are permanent.
  const retired = new Set(
    [...dispositions.keys()]
      .filter((k) => k.startsWith(`asknext-done:${accountId}:`))
      .map((k) => k.slice(`asknext-done:${accountId}:`.length)),
  );
  const questions = bank
    .filter((q) => !accountId || !retired.has(q.id))
    .map((q) => ({
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

  // The scenario is remembered per account (a disposition row, reason = id).
  const savedScenario = accountId
    ? (dispositions.get(`scenario:${accountId}`)?.reason ?? "")
    : "";

  return (
    <>
      <AppWayfinder current="Playbook" />
      <main className={styles.wrap}>
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>Playbook{accountName ? ` — ${accountName}` : ""}</h1>
          <p className={styles.sub}>
            {questions.length} questions across EOR, contractor management, and global
            payroll, shaped by the scenario you&apos;re actually in. Below: what the book
            has learned, carried across every account.
          </p>
        </div>
        <PlaybookClient
          questions={questions}
          scenarios={SCENARIOS}
          savedScenario={savedScenario}
          accountId={accountId}
          accounts={peos
            .map((p) => ({ id: p.id, name: p.name }))
            .sort((a, b) => a.name.localeCompare(b.name))}
          lessons={lessons.map((l) => ({
            id: l.id,
            text: l.text,
            from: l.accountName,
            at: l.at,
          }))}
          market={market.map((m) => ({
            id: m.id,
            text: m.text,
            who: m.who,
            from: m.accountName,
            at: m.at,
          }))}
          prospectAsks={harvest.propose.map((p) => ({
            question: p.question,
            read: p.read,
            asked: p.asked,
            rooms: p.rooms.join(", "),
          }))}
          oursNotTheirs={harvest.oursNotTheirs}
          bankTotal={DISCOVERY.length + PRODUCT_BANK.length}
        />
      </main>
    </>
  );
}
