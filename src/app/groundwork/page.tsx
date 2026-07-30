// Groundwork — the prospecting room. The rail tells you what you are doing
// right now; the file does it with you. Locked design: the rail & the file,
// wire in the rail (docs/plans/groundwork-build-spec.md). Everything below is
// derived per request from stores the rest of the app writes — this room
// authors nothing.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { hasDatabaseEnv } from "@/lib/db";
import { peos, getPeo } from "@/lib/book";
import { contactCount, contactsFor } from "@/lib/book/contacts";
import { dealIntelFor } from "@/lib/intel/extract";
import type { DealIntel } from "@/lib/intel/types";
import {
  isNamespacedAccountId,
  loadAccountNotes,
  loadDoneTimes,
  loadTodos,
  loadTouches,
} from "@/lib/today/overlay";
import { clockShort, userDayKey } from "@/lib/tz";
import { buildQueue, currentBand, moveKey, type Band } from "@/lib/groundwork/day";
import { buildFile, workedStamp } from "@/lib/groundwork/file";
import { proximityMark } from "@/lib/groundwork/proximity";
import {
  intentFor,
  intentReadDue,
  ridingLaneDate,
  type IntentSignal,
} from "@/lib/groundwork/signals";
import {
  INST_NS,
  institutionCard,
  parseInstBody,
  type Institution,
} from "@/lib/groundwork/institutions";
import {
  WIRE_NS,
  orderWire,
  parseWireBody,
  sweepDue,
  wireAvailable,
  type WireItem,
} from "@/lib/groundwork/wire";
import { buildReadout, lint, readoutText } from "@/lib/groundwork/readout";
import { attachWireToAccount, markWorked, sweepWire } from "./actions";
import { CopyStamp } from "./copy-stamp";
import styles from "./groundwork.module.css";

export const dynamic = "force-dynamic";

const BAND_LABEL: Record<Band, string> = {
  now: "Now · sends · until 11:00",
  eleven: "At 11:00 · the people window",
  two: "After 2:00 · research & filing",
};
const BAND_ORDER: Band[] = ["now", "eleven", "two"];

export default async function GroundworkPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const access = await getAppAccess();
  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Groundwork" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }
  const canWrite = access.canWrite && hasDatabaseEnv();
  const now = new Date();

  const [notesMap, touches, todos, doneTimes] = await Promise.all([
    loadAccountNotes(),
    loadTouches(),
    loadTodos(),
    loadDoneTimes(),
  ]);

  // Split the note map: real accounts feed the corpus; namespaces feed the
  // wire and the institutions program.
  const accountNotes = new Map<
    string,
    { body: string; source: string; createdAt: string }[]
  >();
  const wireItems: WireItem[] = [];
  const institutions: Institution[] = [];
  for (const [id, notes] of notesMap) {
    if (id.startsWith(WIRE_NS)) {
      const item = parseWireBody(notes[0]?.body ?? "");
      if (item) wireItems.push(item);
      continue;
    }
    if (id.startsWith(INST_NS)) {
      const inst = parseInstBody(notes[0]?.body ?? "");
      if (inst) institutions.push(inst);
      continue;
    }
    if (isNamespacedAccountId(id)) continue;
    accountNotes.set(
      id,
      notes.map((n) => ({ body: n.body, source: n.source, createdAt: n.createdAt })),
    );
  }

  // Intel only where a corpus exists — regex extraction over notes + touches.
  const touchesByAccount = new Map<string, typeof touches>();
  for (const t of touches) {
    const m = /^outreach:(.+)$/.exec(t.subjectKey);
    if (!m) continue;
    const list = touchesByAccount.get(m[1]) ?? [];
    list.push(t);
    touchesByAccount.set(m[1], list);
  }
  const intelById = new Map<string, DealIntel>();
  const intentById = new Map<string, IntentSignal>();
  for (const p of peos) {
    const notes = accountNotes.get(p.id);
    const acctTouches = touchesByAccount.get(p.id);
    if (notes?.length || acctTouches?.length) {
      intelById.set(
        p.id,
        dealIntelFor(p.id, p.name, {
          acctNotes: (notes ?? []).map((n, i) => ({
            id: `${p.id}:${i}`,
            body: n.body,
            createdAt: n.createdAt,
            kind: "account",
          })),
          touches: (acctTouches ?? []).map((t) => ({
            subjectKey: t.subjectKey,
            label: t.label,
            contactedAt: t.contactedAt,
            message: t.message,
            log: t.log ?? [],
          })),
        }),
      );
    }
    const sig = intentFor(notes, now);
    if (sig) intentById.set(p.id, sig);
  }

  const { items: queue, overflow } = buildQueue({
    accounts: peos,
    intelById,
    notesById: accountNotes,
    touches,
    todos,
    contactCountById: contactCount,
    now,
  });

  const { focus } = await searchParams;
  const focusItem =
    (focus && queue.find((q) => q.accountId === focus)) || queue[0] || null;
  const focusAccount = focusItem ? getPeo(focusItem.accountId) : undefined;

  const file =
    focusItem && focusAccount
      ? buildFile(focusAccount, {
          queueItem: focusItem,
          intel: intelById.get(focusItem.accountId),
          intent: intentById.get(focusItem.accountId) ?? null,
          notes: accountNotes.get(focusItem.accountId) ?? [],
          touches: (touchesByAccount.get(focusItem.accountId) ?? []).map((t) => ({
            subjectKey: t.subjectKey,
            label: t.label,
            contactedAt: t.contactedAt,
          })),
          wire: wireItems,
          contacts: contactsFor(focusItem.accountId).map((c) => ({
            name: [c.first, c.last].filter(Boolean).join(" "),
            title: c.title,
          })),
          laneDate: ridingLaneDate(accountNotes.get(focusItem.accountId), now),
          now,
        })
      : null;

  // The readout — one builder for the drawer AND every file's pull tab.
  const outreachAccountIds = new Set(touchesByAccount.keys());
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const partnerTouches = touches.filter(
    (t) =>
      t.subjectKey.startsWith("partner-outreach:") &&
      Date.parse(t.contactedAt) >= weekAgo,
  );
  const readout = buildReadout({
    accounts: peos,
    queue,
    intelById,
    intentById,
    outreachAccountIds,
    partnerUpdatesSent: partnerTouches.length,
    partnerUpdatesReplied: partnerTouches.filter(
      (t) => t.status === "replied" || t.status === "responded",
    ).length,
    now,
  });
  const readoutPayload = readoutText(readout);
  const lintIssues = lint(readoutPayload);

  const nudge = intentReadDue(accountNotes, now);
  const wireOrdered = orderWire(wireItems);
  const wireIsDue = sweepDue(wireItems, now);
  const inst = institutionCard(institutions, now);
  const band = currentBand(now);
  const dayKey = userDayKey(now);
  const idToName = (id: string) => getPeo(id)?.name ?? id;

  return (
    <>
      <AppWayfinder current="Groundwork" trail="Homeroom" />
      <main className={styles.wrap}>
        <div className={styles.lay}>
          {/* ── The rail ─────────────────────────────────────────────── */}
          <div>
            <div className={styles.ribbon}>
              <span className={styles.ribbonLabel}>
                The queue · all {peos.length}, ranked
              </span>
              <span className={styles.ribbonRule} />
              <span className={styles.ribbonCount}>
                {queue.length} in front · {peos.length - queue.length} held back
              </span>
            </div>

            {nudge && (
              <div className={styles.due}>
                <span className={styles.dueBar} />
                <span>
                  ▤ <b>Intent read due</b> — run the Sales Nav grab (installed on the{" "}
                  <Link href="/intake">Capture page</Link>), paste it in the{" "}
                  <Link href="/intranet">Intranet</Link>, and the queue re-ranks on who is
                  reading us. Ten minutes.
                </span>
              </div>
            )}

            {BAND_ORDER.map((b) => {
              const items = queue.filter((q) => q.band === b);
              return (
                <div key={b}>
                  <div className={styles.band}>
                    <span
                      className={`${styles.bandLabel} ${b === band ? styles.bandNow : ""}`}
                    >
                      {BAND_LABEL[b]}
                    </span>
                    <span className={styles.bandRule} />
                  </div>
                  {items.length === 0 ? (
                    <p className={styles.queueFoot}>Nothing waiting in this window.</p>
                  ) : (
                    <div className={styles.queue}>
                      {items.map((q, i) => {
                        const stamp = workedStamp(doneTimes, dayKey, moveKey(q));
                        const acct = getPeo(q.accountId);
                        const prox = acct ? proximityMark(acct) : null;
                        const focused = focusItem?.accountId === q.accountId;
                        const off = b === "now" && i === 0;
                        return (
                          <Link
                            key={q.accountId}
                            href={`/groundwork?focus=${encodeURIComponent(q.accountId)}`}
                            className={[
                              styles.row,
                              focused ? styles.rowFocused : "",
                              off ? styles.rowOff : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <span
                              className={[
                                styles.gauge,
                                q.intent
                                  ? styles.gaugeBlue
                                  : q.weight >= 85
                                    ? styles.gaugeAmber
                                    : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            />
                            <span>
                              <span className={styles.rowName}>{q.name}</span>{" "}
                              {q.intent && (
                                <span className={styles.intent}>
                                  {q.intent.level === "high" ? "High" : "Moderate"} intent
                                  {q.intent.activities ? ` · ${q.intent.activities}` : ""}
                                </span>
                              )}{" "}
                              {prox && <span className={styles.prox}>{prox}</span>}
                              <br />
                              <span className={styles.rowMeta}>
                                <b>{q.situation}</b>
                              </span>
                            </span>
                            <span
                              className={`${styles.rowOwed} ${stamp ? styles.rowWorked : ""}`}
                            >
                              {stamp ?? q.owed}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {overflow > 0 && (
              <p className={styles.queueFoot}>
                And {overflow} more that can wait — nothing is hidden, it just is not in
                front of you. Blue marks come from your pasted Sales Nav read; green means
                meeting in person is nearly free. Proximity breaks ties; it never sets
                priority.
              </p>
            )}

            <div className={styles.ribbon}>
              <span className={styles.ribbonLabel}>Outside · the wire</span>
              <span className={styles.ribbonRule} />
              <span className={styles.ribbonCount}>
                {wireItems.length === 0 ? "no sweep yet" : `${wireItems.length} on file`}
              </span>
            </div>
            {wireOrdered.length === 0 ? (
              <div className={styles.empty}>
                The wire watches the outside — the EOR and PEO world, the named
                competitors, and every account name in the book — and files what matters
                with a one-sentence read. Nothing has been swept yet.
                {canWrite && wireAvailable() && (
                  <form action={sweepWire} style={{ marginTop: 8 }}>
                    <button className={styles.btn2nd} type="submit">
                      Run the first sweep
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className={styles.wire}>
                {wireOrdered.slice(0, 3).map((w) => (
                  <div key={w.url} className={styles.wireItem}>
                    <span className={styles.wireSrc}>
                      {w.source} · {clockShort(w.at) || w.at.slice(0, 10)}
                      {w.accountIds.slice(0, 2).map((id) => (
                        <span key={id} className={styles.wtag}>
                          {idToName(id)}
                        </span>
                      ))}
                    </span>
                    <span className={styles.wireHead}>
                      <a href={w.url} target="_blank" rel="noreferrer">
                        {w.headline}
                      </a>
                    </span>
                    <span className={styles.wireRead}>{w.read}</span>
                    {canWrite && w.accountIds.length > 0 && (
                      <div className={styles.wireActs}>
                        <form
                          action={attachWireToAccount.bind(
                            null,
                            w.accountIds[0],
                            w.headline,
                            w.source,
                            w.url,
                            w.read,
                          )}
                        >
                          <button
                            className={`${styles.btn2nd} ${styles.btnSmall}`}
                            type="submit"
                          >
                            File to {idToName(w.accountIds[0])}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
                {canWrite && wireAvailable() && wireIsDue && (
                  <form action={sweepWire}>
                    <button
                      className={`${styles.btn2nd} ${styles.btnSmall}`}
                      type="submit"
                    >
                      Sweep again — the last one is stale
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className={styles.ribbon}>
              <span className={styles.ribbonLabel}>The institutions</span>
              <span className={styles.ribbonRule} />
              <span className={styles.ribbonCount}>next 7 days</span>
            </div>
            {inst ? (
              <div className={styles.instCard}>
                <b>{inst.inst.name}</b>
                {inst.inst.nextEventIso && inst.eventSoon
                  ? ` — gathering ${inst.inst.nextEventIso}.`
                  : "."}{" "}
                {inst.inst.note ?? ""}
              </div>
            ) : (
              <div className={styles.instCard}>
                No institution on the calendar yet. The program starts with a
                verification, not a membership — the Global Chamber&rsquo;s Chicago
                chapter is first on the list: who convenes it, who attends, what
                membership asks. Education first, never a lead request.
              </div>
            )}

            <div className={styles.ribbon}>
              <span className={styles.ribbonLabel}>Standing by</span>
              <span className={styles.ribbonRule} />
              {lintIssues.length > 0 && (
                <span className={styles.ribbonCount}>
                  {lintIssues.length} line{lintIssues.length === 1 ? "" : "s"} owe their
                  reader
                </span>
              )}
            </div>
            <details className={styles.russ}>
              <summary>
                <span className={styles.russKick}>State of play ▾</span>
                <span>read this to Russ, any moment he asks</span>
                <span className={styles.russNote}>composes itself</span>
              </summary>
              <div className={styles.russBody}>
                {readout.sections.map((s) => (
                  <div key={s.title} style={{ marginBottom: 10 }}>
                    <span className={styles.kick} style={{ display: "block" }}>
                      {s.title}
                    </span>
                    {s.paragraphs.map((para, i) => (
                      <p key={i} style={{ margin: "4px 0 8px" }}>
                        {para.text}
                      </p>
                    ))}
                  </div>
                ))}
                <CopyStamp payload={readoutPayload} label="Copy the readout" accent />
              </div>
            </details>
          </div>

          {/* ── The file ─────────────────────────────────────────────── */}
          <div>
            {file ? (
              <div className={styles.file}>
                <span className={styles.kick}>
                  The working file · {file.name}
                  {file.csm && file.csm !== "Unassigned"
                    ? ` · ${file.csm} is the partner manager`
                    : ""}
                  {file.sourcesLine ? ` · sources: ${file.sourcesLine}` : ""}
                </span>
                <h1 className={styles.fileTitle}>{file.title}</h1>
                <p className={styles.fileStory}>{file.story}</p>
                <div className={styles.draft}>
                  <span
                    className={styles.kick}
                    style={{ display: "block", marginBottom: 6 }}
                  >
                    The composed thing · to {file.composed.to}
                  </span>
                  {file.composed.payload}
                </div>
                <div className={styles.people}>
                  {file.people.map((person) => (
                    <span
                      key={person.name}
                      className={`${styles.chip} ${person.flag === "csm" ? styles.chipCsm : ""}`}
                    >
                      {person.name}
                      {person.title ? ` · ${person.title}` : ""}
                    </span>
                  ))}
                </div>
                {file.singleThread && (
                  <p className={styles.actNote}>
                    This conversation rides on one person — the widening question is part
                    of the composed text.
                  </p>
                )}
                <div className={styles.acts}>
                  <CopyStamp
                    payload={file.composed.payload}
                    label={file.composed.label}
                    accent
                    action={
                      canWrite && focusItem
                        ? markWorked.bind(null, moveKey(focusItem))
                        : undefined
                    }
                  />
                  {(file.composed.kind === "send-draft" ||
                    file.composed.kind === "reply-frame" ||
                    file.composed.kind === "relay-note") && (
                    <a
                      className={styles.btn2nd}
                      href={`mailto:?subject=${encodeURIComponent(
                        `${file.name} — from Groundwork`,
                      )}&body=${encodeURIComponent(file.composed.payload)}`}
                    >
                      Compose in your mail app — pre-filled
                    </a>
                  )}
                  <Link
                    className={`${styles.btn2nd} ${styles.btnSmall}`}
                    href={`/accounts?focus=${encodeURIComponent(file.accountId)}`}
                  >
                    Open in Accounts
                  </Link>
                </div>
                <p className={styles.actNote}>
                  Copy puts the exact text on your clipboard and stamps the row — the
                  stamp is a side effect of the action, never its own button.
                </p>
                <details className={styles.russ}>
                  <summary>
                    <span className={styles.russKick}>To Russ ▾</span>
                    <span>the paragraph he&rsquo;d hear about this account</span>
                    <span className={styles.russNote}>recomposes as you work</span>
                  </summary>
                  <div className={styles.russBody}>{file.russ}</div>
                </details>
                <div className={styles.hist}>
                  <span
                    className={styles.kick}
                    style={{ display: "block", marginBottom: 4 }}
                  >
                    The file&rsquo;s history
                  </span>
                  {file.history.length === 0 ? (
                    <p className={styles.histLine}>
                      Nothing on file yet — the first paste starts the record.
                    </p>
                  ) : (
                    file.history.map((h, i) => (
                      <div key={i} className={styles.histLine}>
                        <span className={styles.histAt}>
                          {h.atIso.slice(5, 10).replace("-", "/")}
                        </span>
                        <span>{h.line}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.empty}>
                The queue is clear — no evidence anywhere in the book puts an account in
                front of you right now. That is a real state, not a fault: the next paste,
                read, or reply re-ranks everything.
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
