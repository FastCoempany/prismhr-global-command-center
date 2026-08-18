import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { getPeo } from "@/lib/book";
import { askLinks } from "@/lib/ask/links";
import { dayLabelFor, timeLabelFor } from "@/lib/scratch";
import { bankAsk } from "./actions";
import styles from "./asks.module.css";

export const dynamic = "force-dynamic";

// The bank — every question the app has been asked, with its answer and the
// doors that land on the exact thing. The pad's ✎ ask door files here too;
// one brain, one ledger, this page is its running record.

type StoredCite = {
  origin?: string;
  originRef?: string;
  accountId?: string;
  docTitle?: string;
};

export default async function AsksPage() {
  const access = await getAppAccess();
  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Asks" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  let rows: {
    id: string;
    question: string;
    answer: string;
    citations: unknown;
    model: string;
    askedAt: Date;
  }[] = [];
  if (hasDatabaseEnv()) {
    try {
      rows = await getPrisma().intranetAsk.findMany({
        orderBy: { askedAt: "desc" },
        take: 200,
        select: {
          id: true,
          question: true,
          answer: true,
          citations: true,
          model: true,
          askedAt: true,
        },
      });
    } catch {
      rows = [];
    }
  }

  const now = new Date();
  const nameOf = (id: string) => getPeo(id)?.name ?? "";
  const days = rows.map((r) => dayLabelFor(r.askedAt.toISOString(), now));
  const entries = rows.map((r, i) => {
    const cites = Array.isArray(r.citations) ? (r.citations as StoredCite[]) : [];
    const day = days[i];
    const showDay = i === 0 || day !== days[i - 1];
    return {
      id: r.id,
      question: r.question,
      answer: r.answer,
      model: r.model,
      at: r.askedAt.toISOString(),
      day,
      showDay,
      links: askLinks(
        {
          question: r.question,
          accounts: [],
          citations: cites.map((c) => ({
            origin: c?.origin ?? "",
            originRef: c?.originRef ?? "",
            accountId: c?.accountId ?? "",
            docTitle: c?.docTitle ?? "",
          })),
        },
        nameOf,
      ),
    };
  });

  return (
    <>
      <AppWayfinder current="Asks" />
      <main className={styles.wrap}>
        <h1 className={styles.masthead}>The bank</h1>
        <p className={styles.sub}>
          Every question the app has answered, kept. Each answer carries the doors that
          land on the exact thing — an account already open, the Playbook card already
          lit, the archive already searched.
        </p>
        {access.canWrite && (
          <>
            <form className={styles.askBar} action={bankAsk}>
              <input name="q" placeholder="Ask the app anything." maxLength={300} />
              <button type="submit">Ask</button>
            </form>
            <p className={styles.askNote}>
              An ask takes a minute here. The ✎ pad answers in the background and pulses
              when it lands.
            </p>
          </>
        )}
        {entries.length === 0 && (
          <p className={styles.empty}>
            Nothing asked yet. The first question starts the bank.
          </p>
        )}
        {entries.map((e) => {
          return (
            <div key={e.id}>
              {e.showDay && <div className={styles.day}>{e.day}</div>}
              <article className={styles.entry}>
                <div className={styles.meta}>
                  <span>{timeLabelFor(e.at)}</span>
                  {e.model && <span>{e.model}</span>}
                </div>
                <div className={styles.q}>{e.question}</div>
                {e.answer ? (
                  <div className={styles.a}>{e.answer}</div>
                ) : (
                  <div className={styles.nothing}>
                    The record held nothing on this when it was asked.
                  </div>
                )}
                {e.links.length > 0 && (
                  <div className={styles.links}>
                    {e.links.map((k) => (
                      <Link key={k.href} href={k.href}>
                        {k.label}
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            </div>
          );
        })}
      </main>
    </>
  );
}
