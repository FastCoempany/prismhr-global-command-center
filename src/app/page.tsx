import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { SfCheckpoint } from "@/components/sf";
import type { ChipNote } from "@/components/account-notes";
import { peos } from "@/lib/book";
import { loadDashboard } from "@/lib/dashboard/data";
import {
  loadAccountNotes,
  loadDispositions,
  loadTodos,
  loadTouches,
} from "@/lib/today/overlay";
import { accountIntel } from "@/lib/today/build";
import { countryCode } from "@/lib/flags";
import { corpusFor, extractDealIntel } from "@/lib/intel/extract";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import { suggestChecks, type CheckSuggestion } from "@/lib/intel/evidence";
import { liveContextFor, type LiveContextLine } from "@/lib/intel/live-context";
import { askNextFor } from "@/lib/intel/ask-next";
import { researchPrompt } from "@/lib/intel/research";
import { COUNTRY_NAME } from "@/lib/intel/lexicon";
import type { AskNextQ } from "./today/ask-next";
import type { DealIntel } from "@/lib/intel/types";
import { DashboardClient } from "./dashboard-client";
import styles from "./command-center.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, acctNotesById, touches, todos, dispositions] = await Promise.all([
    loadDashboard(),
    loadAccountNotes(),
    loadTouches(),
    loadTodos(),
    loadDispositions(),
  ]);

  // Surface the chip-written account notes ("Worked notes" — yours + what the
  // partner said) on their card, matched by account name (cards are keyed by
  // name; notes carry the account id → resolve via the book). Notetaker notes
  // deliberately do NOT land here — they live on Today and the Account Room.
  const nameById = new Map(peos.map((p) => [p.id, p.name]));
  // Country flags on cards — auto from the research's country extraction.
  const countryByName: Record<string, string> = {};
  for (const a of accountIntel()) {
    const code = countryCode(a.countries[0] ?? "");
    if (code) countryByName[a.name] = code;
  }
  const notesByName: Record<string, ChipNote[]> = {};
  for (const [accountId, list] of acctNotesById) {
    const name = nameById.get(accountId);
    if (!name) continue;
    notesByName[name] = list.map((n) => ({
      id: n.id,
      partner: n.partner,
      kind: n.kind,
      body: n.body,
      createdAt: n.createdAt,
    }));
  }

  // --- Deal intel, per card ------------------------------------------------
  // Derived at render from the account's full corpus (notes + touches + sheet
  // rows + digest seed) — nothing stored. Cards are keyed by name; resolve the
  // account id via the book (exact name) with the digest's aliases as fallback.
  const idByName = new Map(peos.map((p) => [p.name.toLowerCase(), p.id]));
  const dispositionKeySet = new Set(dispositions.keys());
  const intelByName: Record<string, DealIntel> = {};
  const suggByName: Record<string, CheckSuggestion[]> = {};
  const ctxByName: Record<string, LiveContextLine[]> = {};
  const askByName: Record<
    string,
    { accountId: string; questions: AskNextQ[]; research: string }
  > = {};
  for (const card of data.cards) {
    if (card.archived) continue;
    const acctId =
      idByName.get(card.name.toLowerCase()) ??
      digestForCardName(card.name)?.accountId ??
      "";
    const docs = corpusFor(acctId, card.name, {
      acctNotes: acctNotesById.get(acctId),
      todos: todos.filter((t) => acctId && t.accountId === acctId),
      touches: touches.filter(
        (t) =>
          (acctId && t.subjectKey === `acct:${acctId}`) ||
          t.label.toLowerCase() === card.name.toLowerCase(),
      ),
    });
    const dig = digestFor(acctId) ?? digestForCardName(card.name);
    intelByName[card.name] = extractDealIntel(docs, dig);
    const dismissed = new Set<string>();
    const prefix = `sugg-dismiss:${card.id}:`;
    for (const key of dispositions.keys())
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length); // "<node>:<itemIdx>"
        if (rest) dismissed.add(rest);
      }
    suggByName[card.name] = suggestChecks(docs, card, dismissed);
    ctxByName[card.name] = liveContextFor(docs, {
      excludeTexts: (notesByName[card.name] ?? []).map((n) => n.body),
    }).lines;
    const questions = askNextFor({
      intel: intelByName[card.name],
      states: card.states,
      accountId: acctId,
      doneKeys: dispositionKeySet,
    });
    if (questions.length > 0) {
      const aIntel = intelByName[card.name];
      askByName[card.name] = {
        accountId: acctId,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          why: q.why,
          drumLine: q.drumLine,
        })),
        research: researchPrompt("custom", {
          account: card.name,
          countries: aIntel.countries.map((c) => COUNTRY_NAME[c.value] ?? c.value),
          known: [
            aIntel.direction?.line ?? "",
            aIntel.incumbent ? `incumbent: ${aIntel.incumbent.value}` : "",
            aIntel.timing?.value.phrase ?? "",
          ].filter(Boolean),
          question: questions[0].question,
        }),
      };
    }
  }

  if (data.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Dashboard" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <AppWayfinder current="Dashboard" />
      <main className={styles.wrap}>
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>Dashboard</h1>

          <p className={styles.sub}>
            Hand-sewn board — click a node to set its state.{" "}
            <Link href="/accounts">Account Room →</Link>
          </p>
        </div>
        <SfCheckpoint when="dashboard" />

        {data.status === "database-unavailable" && (
          <div className={styles.banner}>
            Read-only — run <code>docs/dashboard-tables.sql</code> in Supabase to start
            saving cards and node states. This board&apos;s table is isolated from
            everything else.
          </div>
        )}
        <DashboardClient
          cards={data.cards}
          canWrite={data.canWrite}
          dbUnavailable={data.status === "database-unavailable"}
          labels={data.labels}
          notesByName={notesByName}
          countryByName={countryByName}
          intelByName={intelByName}
          suggByName={suggByName}
          ctxByName={ctxByName}
          askByName={askByName}
        />
      </main>
    </>
  );
}
