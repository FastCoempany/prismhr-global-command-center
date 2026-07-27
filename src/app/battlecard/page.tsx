import { AppWayfinder } from "@/components/app-wayfinder";
import { peos } from "@/lib/book";
import { DISCOVERY, questionsFor } from "@/lib/intel/discovery";
import { dealIntelFor } from "@/lib/intel/extract";
import { loadAccountNotes, loadDispositions } from "@/lib/today/overlay";
import { BattlecardClient } from "./battlecard-client";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

// The full payroll discovery battlecard — the whole question bank, filterable
// by category / phase / audience. `?account=<id>` merges that account's known
// countries into every question and hides what's already been asked there.
export default async function BattlecardPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const accountId = typeof sp.account === "string" ? sp.account : "";
  const account = accountId ? (peos.find((p) => p.id === accountId) ?? null) : null;

  let questions = DISCOVERY;
  let accountName = "";
  if (accountId) {
    const [acctNotes, dispositions] = await Promise.all([
      loadAccountNotes(),
      loadDispositions(),
    ]);
    accountName = account?.name ?? accountId;
    const intel = dealIntelFor(accountId, accountName, {
      acctNotes: acctNotes.get(accountId),
    });
    const merged = questionsFor({
      phase: "contract", // no phase ceiling on the full card — show everything
      gaps: [],
      countries: intel.countries.map((c) => c.value),
    });
    const done = new Set(
      [...dispositions.keys()].filter((k) => k.startsWith(`asknext-done:${accountId}:`)),
    );
    questions = merged.filter((q) => !done.has(`asknext-done:${accountId}:${q.id}`));
  }

  return (
    <>
      <AppWayfinder current="Battlecard" />
      <main className={styles.wrap}>
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>
            Payroll discovery battlecard
            {accountName ? ` — ${accountName}` : ""}
          </h1>
          <p className={styles.sub}>
            The universal question bank — country-agnostic; the countries fill in per
            account. Drum lines are the exact sentence for the roundup voice.
          </p>
        </div>
        <BattlecardClient
          questions={questions.map((q) => ({
            id: q.id,
            category: q.category,
            phase: q.phase,
            audience: q.audience,
            question: q.question,
            why: q.why,
            listenFor: q.listenFor,
            followUp: q.followUp,
            drumLine: q.drumLine,
          }))}
          accountId={accountId}
        />
      </main>
    </>
  );
}
