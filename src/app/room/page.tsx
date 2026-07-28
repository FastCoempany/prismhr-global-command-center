import Link from "next/link";
import { DM_Serif_Display, JetBrains_Mono, Public_Sans } from "next/font/google";
import { AppWayfinder } from "@/components/app-wayfinder";
import { loadDashboard } from "@/lib/dashboard/data";
import { peos } from "@/lib/book";
import { contactsFor } from "@/lib/book/contacts";
import { peopleFor } from "@/lib/intel/people";
import { loadAccountNotes, loadTouches } from "@/lib/today/overlay";
import { cardNextStep, morningDoneKey } from "@/lib/today/build";
import { DASH_NODES } from "@/lib/dashboard/stages";
import { corpusFor, extractDealIntel } from "@/lib/intel/extract";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import { COUNTRY_NAME } from "@/lib/intel/lexicon";
import { climbFraction, readDeal, type RoomRead } from "@/lib/room/engine";
import { RoomClient, type RoomRow } from "./room-client";
import styles from "./room.module.css";

export const dynamic = "force-dynamic";

const serif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--f-serif",
});
const sans = Public_Sans({ subsets: ["latin"], variable: "--f-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--f-mono" });

const HEALTH_ORDER = { red: 0, amber: 1, green: 2, quiet: 3 } as const;

function firstName(s: string): string {
  return (s ?? "").trim().split(/\s+/)[0] ?? "";
}

export default async function RoomPage() {
  const data = await loadDashboard();
  if (data.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Room" />
        <main className={styles.gate}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const [notesById, touches] = await Promise.all([loadAccountNotes(), loadTouches()]);
  const idByName = new Map(peos.map((p) => [p.name.toLowerCase(), p.id]));
  const peoById = new Map(peos.map((p) => [p.id, p]));
  const now = new Date();

  const rows: RoomRow[] = [];
  for (const card of data.cards) {
    if (card.archived) continue;
    const accountId =
      idByName.get(card.name.toLowerCase()) ??
      digestForCardName(card.name)?.accountId ??
      "";
    const peo = peoById.get(accountId);
    const allNotes = accountId ? (notesById.get(accountId) ?? []) : [];
    const mine = allNotes.filter((n) => n.lane === "mine");

    // Deal intel — chair / timing / countries / products, derived not stored.
    const docs = corpusFor(accountId, card.name, {
      acctNotes: allNotes,
      todos: [],
      touches: touches.filter(
        (t) =>
          (accountId && t.subjectKey === `outreach:${accountId}`) ||
          t.label.toLowerCase() === card.name.toLowerCase(),
      ),
    });
    const intel = extractDealIntel(
      docs,
      digestFor(accountId) ?? digestForCardName(card.name),
    );

    // Shape chip from the product mix.
    const prods = new Set(intel.products.map((p) => p.value));
    const shape = prods.has("eor")
      ? `EOR${prods.has("contractor") ? " +CP" : ""}${prods.has("wallet") ? " +W" : ""}`
      : prods.has("contractor")
        ? `CP${prods.has("wallet") ? " +W" : ""}`
        : "GP";

    // Meta kicker: chair · timing · first country. No partner names on rows.
    const country = intel.countries[0]
      ? (COUNTRY_NAME[intel.countries[0].value] ?? intel.countries[0].value)
      : "";
    const meta = [
      intel.chair === "resale" ? "RESALE" : intel.chair === "referral" ? "REFERRAL" : "",
      intel.timing?.value.phrase ?? "",
      country,
    ]
      .filter(Boolean)
      .join(" · ")
      .toUpperCase()
      .slice(0, 72);

    // People behind the MULTI badge — engaged / involved / cc'd, from the repo.
    const people = accountId ? peopleFor(allNotes, contactsFor(accountId), 6) : [];
    const threadCount = people.length;
    const multiTone = threadCount >= 3 ? "g" : threadCount === 2 ? "y" : "r";

    // Briefed mark — the stage record's own partner-brief item, checked.
    let briefed = false;
    for (const node of DASH_NODES) {
      node.checklist.forEach((item, i) => {
        if (/partner (de)?brief/i.test(item) && card.checks[node.key]?.[i])
          briefed = true;
      });
    }

    const step = cardNextStep(card, data.labels, now.getTime());
    const stageNode = step ? DASH_NODES.find((n) => n.key === step.nodeKey) : null;
    const doneInStage = stageNode
      ? (card.checks[stageNode.key] ?? []).filter(Boolean).length
      : 0;
    const totalInStage = stageNode?.checklist.length ?? 0;
    const frac = climbFraction(step?.nodeKey ?? null, doneInStage, totalInStage);

    const touch = accountId
      ? touches.find((t) => t.subjectKey === `outreach:${accountId}`)
      : undefined;
    const read: RoomRead = readDeal({
      accountName: card.name,
      step: step
        ? {
            nodeKey: step.nodeKey,
            nodeLabel: step.nodeLabel,
            item: step.item,
            ageDays: step.ageDays,
          }
        : null,
      timing: intel.timing
        ? { phrase: intel.timing.value.phrase, dateIso: intel.timing.value.dateIso ?? "" }
        : null,
      lastTouch: touch
        ? {
            at: touch.contactedAt,
            awaitingReply: touch.status === "awaiting",
            who: firstName(peo?.contactName ?? "") || "them",
          }
        : null,
      lastRecordAt: allNotes[0]?.createdAt ?? "",
      now,
    });

    const stageLabel = step
      ? `${(data.labels[step.nodeKey] ?? step.nodeLabel).toUpperCase().slice(0, 16)} · ${doneInStage} OF ${totalInStage}`
      : "NOTHING IN FLIGHT";

    rows.push({
      accountId,
      cardId: card.id,
      name: card.name,
      meta,
      shape,
      multiTone,
      people: people.map((p) => ({
        name: p.name,
        line: [
          p.title,
          p.inMine && p.inBackground
            ? "your threads + case traffic"
            : p.inMine
              ? "your threads"
              : "case traffic",
          `×${p.count}`,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
      briefed,
      climb: {
        frac,
        capTone: read.health === "red" ? "risk" : read.health === "amber" ? "warn" : "ok",
        label: stageLabel,
        metaLine:
          read.health === "red"
            ? "CURRENT STAGE RUNNING RED"
            : read.health === "amber"
              ? "CURRENT STAGE ON THE CLOCK"
              : read.health === "quiet"
                ? "WAITING ON FIRST SIGNAL"
                : "CURRENT STAGE HEALTHY",
      },
      move: read.move,
      thin: read.thin,
      court: read.court,
      outstanding: step
        ? {
            item: step.item,
            node: step.nodeKey,
            index: step.index,
            doneKey: morningDoneKey(
              `card:${card.id}:${step.nodeKey}:${step.index}`,
              now.getTime(),
            ),
            closedCount: doneInStage,
          }
        : null,
      record: mine.slice(0, 6).map((n) => ({
        id: n.id,
        t: new Date(Date.parse(n.createdAt)).toLocaleDateString("en-US", {
          timeZone: "America/Chicago",
          month: "numeric",
          day: "numeric",
        }),
        text: n.body.split("\n")[0].slice(0, 160),
        struck: n.body.startsWith("✓"),
      })),
      health: read.health,
      rank: 0,
      canWrite: data.canWrite,
    });
  }

  rows.sort(
    (a, b) =>
      HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health] || a.name.localeCompare(b.name),
  );
  rows.forEach((r, i) => (r.rank = i));

  return (
    <>
      <AppWayfinder current="Room" />
      <main
        className={`${styles.room} ${serif.variable} ${sans.variable} ${mono.variable}`}
      >
        <RoomClient rows={rows} dbUnavailable={data.status === "database-unavailable"} />
        <div className={styles.edge}>
          <Link href="/today" className={styles.edgeLink}>
            <span>ROUNDUPS</span>
          </Link>
          <span className={styles.edgeDot}>·</span>
          <Link href="/today" className={styles.edgeLink}>
            <span>CHECK-INS</span>
          </Link>
        </div>
      </main>
    </>
  );
}
