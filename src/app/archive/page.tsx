// The Archive — done sheet notes (dated, grouped by day) and the hidden bin
// (everything ✕ ever hid, restorable). The search box sweeps EVERY note store
// — open, done, hidden, account and partner notes — so a mistyped note is
// always findable.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import {
  loadAccountNotes,
  loadDispositions,
  loadPartnerNotes,
  loadTodos,
} from "@/lib/today/overlay";
import { peos } from "@/lib/book";
import { splitMarker, splitTags, visibleText } from "@/lib/today/route-notes";
import { userDayKey, USER_TZ } from "@/lib/tz";
import { deleteForever, reopenTodo, restoreHidden } from "./actions";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

function fmtDay(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) return dayKey;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtStamp(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString("en-US", {
    timeZone: USER_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STORE_LABEL: Record<string, string> = {
  todo: "sheet note",
  acct: "account note",
  partner: "partner note",
  touchLog: "thread log",
  move: "checked move",
  send: "sent stamp",
};

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const access = await getAppAccess();
  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Archive" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const [todos, dispositions, acctNotes, partnerNotes] = await Promise.all([
    loadTodos(),
    loadDispositions(),
    loadAccountNotes(),
    loadPartnerNotes(),
  ]);
  const nameById = new Map(peos.map((p) => [p.id, p.name]));

  const hidden = [...dispositions.entries()]
    .filter(([k]) => k.startsWith("hide:"))
    .map(([k, d]) => ({
      key: k,
      store: k.split(":")[1] ?? "",
      snippet: d.reason,
      at: d.updatedAt,
    }))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const hiddenTodoIds = new Set(
    hidden.filter((h) => h.store === "todo").map((h) => h.key.split(":")[2]),
  );

  // Done sheet notes — dated, newest day first.
  const doneNotes = todos
    .filter((t) => t.done && !hiddenTodoIds.has(t.id))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const doneByDay = new Map<string, typeof doneNotes>();
  for (const t of doneNotes) {
    const day = userDayKey(t.updatedAt);
    const list = doneByDay.get(day);
    if (list) list.push(t);
    else doneByDay.set(day, [t]);
  }

  // Search — every store, every state.
  type Hit = { where: string; when: string; text: string };
  const hits: Hit[] = [];
  if (query) {
    for (const t of todos) {
      const text = visibleText(t.body);
      if (!text.toLowerCase().includes(query)) continue;
      const tags = splitTags(splitMarker(t.body).text).tags;
      const state = hiddenTodoIds.has(t.id)
        ? "hidden"
        : t.done
          ? "done"
          : tags.kind === "action"
            ? "open action"
            : "open note";
      hits.push({ where: `sheet · ${state}`, when: t.createdAt, text });
    }
    for (const [accId, list] of acctNotes) {
      for (const n of list) {
        if (!n.body.toLowerCase().includes(query)) continue;
        hits.push({
          where: `account · ${nameById.get(accId) ?? "unknown"}`,
          when: n.createdAt,
          text: n.body,
        });
      }
    }
    for (const [partner, list] of partnerNotes) {
      for (const n of list) {
        if (!n.body.toLowerCase().includes(query)) continue;
        hits.push({ where: `partner · ${partner}`, when: n.createdAt, text: n.body });
      }
    }
    hits.sort((a, b) => Date.parse(b.when) - Date.parse(a.when));
  }

  return (
    <>
      <AppWayfinder current="Archive" />
      <main className={styles.wrap}>
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>Archive</h1>
          <p className={styles.sub}>
            Done notes and the hidden bin — nothing here is lost.{" "}
            <Link href="/today">← Today</Link>
          </p>
        </div>

        {/* Search sweeps every note store — open, done, hidden, account, partner. */}
        <form method="GET" className={styles.arcSearch}>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search every note ever written — any word, any state…"
            aria-label="Search notes"
          />
          <button className={styles.atcBtn}>Search</button>
          {query && (
            <Link href="/archive" className={styles.arcClear}>
              clear
            </Link>
          )}
        </form>

        {query && (
          <section className={styles.arcSection}>
            <h2 className={styles.h2}>
              Matches for “{q}” ({hits.length})
            </h2>
            {hits.length === 0 && (
              <p className={styles.muted}>
                Nothing contains “{q}”. Try a fragment — even three letters match.
              </p>
            )}
            {hits.slice(0, 100).map((h, i) => (
              <div className={styles.arcRow} key={`hit-${i}`}>
                <span className={styles.arcWhen} suppressHydrationWarning>
                  {fmtStamp(h.when)}
                </span>
                <span className={styles.arcWhere}>{h.where}</span>
                <span className={styles.arcText}>{h.text}</span>
              </div>
            ))}
          </section>
        )}

        <section className={styles.arcSection}>
          <h2 className={styles.h2}>Done notes ({doneNotes.length})</h2>
          {doneNotes.length === 0 && (
            <p className={styles.muted}>Nothing checked off yet.</p>
          )}
          {[...doneByDay.entries()].map(([day, list]) => (
            <div key={day}>
              <div className={styles.arcDay}>{fmtDay(day)}</div>
              {list.map((t) => (
                <div className={styles.arcRow} key={t.id}>
                  <span className={styles.arcWhen} suppressHydrationWarning>
                    {fmtStamp(t.updatedAt)}
                  </span>
                  <span className={styles.arcText}>{visibleText(t.body)}</span>
                  <form action={reopenTodo} className={styles.valInline}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className={styles.atcBtn} title="Reopen on the Day Sheet">
                      ↩ reopen
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ))}
        </section>

        <section className={styles.arcSection}>
          <h2 className={styles.h2}>Hidden bin ({hidden.length})</h2>
          {hidden.length === 0 && (
            <p className={styles.muted}>
              Empty — ✕ anywhere hides an item into this bin instead of deleting it.
            </p>
          )}
          {hidden.map((h) => (
            <div className={styles.arcRow} key={h.key}>
              <span className={styles.arcWhen} suppressHydrationWarning>
                {fmtStamp(h.at)}
              </span>
              <span className={styles.arcWhere}>{STORE_LABEL[h.store] ?? h.store}</span>
              <span className={styles.arcText}>{h.snippet || "(no preview)"}</span>
              <form action={restoreHidden} className={styles.valInline}>
                <input type="hidden" name="key" value={h.key} />
                <button className={styles.atcBtn}>restore</button>
              </form>
              <form action={deleteForever} className={styles.valInline}>
                <input type="hidden" name="key" value={h.key} />
                <button
                  className={styles.arcDelete}
                  title="Delete forever — the only real delete in the app"
                >
                  delete forever
                </button>
              </form>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
