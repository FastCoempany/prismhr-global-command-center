// Groundwork's face — the winged stage (decided 2026-08-10) under the Klaxon
// (decided 2026-08-11), as it paints from what the page derived. One account
// center stage with an action line and a reason line; the day's worked
// stamps in the left wing, each with its take-back; the waiting queue in the
// right wing, heat-mapped, each name with its trigger whispered beneath; the
// lower deck (the wire · the institutions · State of play); and the
// Tallyfoot, the Sendbook's one door, at the page foot. The page holds the
// reads; these hold the face, so the suite can render it whole.

import Link from "next/link";
import type { ReactNode } from "react";
import { heatOf, type QueueItem } from "@/lib/groundwork/day";
import type { Institution } from "@/lib/groundwork/institutions";
import type { WireItem } from "@/lib/groundwork/wire";
import type { weekStats } from "@/lib/sendbook/read";
import {
  attachWireToAccount,
  markReadoutRead,
  markWorked,
  sweepWire,
  unWork,
} from "./actions";
import { prepKicker, type Cite } from "@/lib/groundwork/chips";
import { multiTone } from "@/lib/room/multi";
import { ChannelAsk } from "./channel-ask";
import { CiteRows } from "./evidence-chips";
import { CopyStamp } from "./copy-stamp";
import { Instrument } from "./instrument";
import { SweepButton } from "./sweep-button";
import styles from "./groundwork.module.css";

/** One worked stamp on the left wing. `mk` is the move key the take-back
 *  hands back; `sub` is the stamp's subtext (wingStamp, D27). */
export type DoneStamp = {
  name: string;
  at: string;
  sub: string;
  mk: string;
  accountId: string;
  /** What a count in the subtext opens to, one click down (the click-depth
   *  law): the rows "{N} SUPPORT CASES" stands on, or the grab line "{N}
   *  SALES NAV READS" was read from. Absent when the subtext counts nothing. */
  opens?: { cites: Cite[]; empty: string } | { lines: string[] } | null;
};

export function GroundworkFace({
  nudge,
  done,
  canWrite,
  stage,
  waiting,
  rest,
  hrefOf,
  deck,
  foot,
}: {
  nudge: boolean;
  done: readonly DoneStamp[];
  canWrite: boolean;
  /** The account on stage, its proximity mark, and everything under its
   *  two lines; null when the queue is clear. */
  stage: { item: QueueItem; prox: string; body: ReactNode } | null;
  waiting: readonly QueueItem[];
  /** The live moves past the wing's six, opened by "And N more". */
  rest: readonly QueueItem[];
  hrefOf: (q: { accountId: string }) => string;
  deck: LowerDeckProps;
  foot: TallyfootProps;
}) {
  return (
    <main className={styles.wrap}>
      <Instrument />

      {nudge && (
        <div className={styles.due}>
          <span className={styles.dueBar} />
          <span>
            ▤ <b>Run the Sales Nav grab.</b> The intent read is due. The grab lives on the{" "}
            <Link href="/intake">Capture page</Link>. Paste the rows into the{" "}
            <Link href="/">HomeRoom</Link> Chute or an account&apos;s Drop. They file as a
            note and the queue re-ranks on who is reading us. Ten minutes.
          </span>
        </div>
      )}

      {/* ── The wings ─────────────────────────────────────────────── */}
      <div className={styles.wings}>
        <DoneWing done={done} canWrite={canWrite} />

        {/* ── Center stage ────────────────────────────────────────── */}
        <section className={styles.stage}>
          {stage ? (
            <>
              <StageLines item={stage.item} prox={stage.prox} />
              {stage.body}
            </>
          ) : (
            <div className={styles.stgClear}>
              The queue is clear. The next paste, read, or reply re-ranks everything.
            </div>
          )}
        </section>

        <WaitingWing waiting={waiting} rest={rest} hrefOf={hrefOf} />
      </div>

      <LowerDeck {...deck} />

      <Tallyfoot {...foot} />
    </main>
  );
}

/** The left wing: the day's worked stamps, oldest first. Every stamp carries
 *  the hover ↺ that takes it back: the move returns to the queue and the tap
 *  it filed leaves the register. A read-only session sees the stamps and no
 *  ↺. */
export function DoneWing({
  done,
  canWrite,
}: {
  done: readonly DoneStamp[];
  canWrite: boolean;
}) {
  return (
    <aside className={`${styles.wing} ${styles.wingL}`} aria-label="Done today">
      <span className={styles.wingKick}>Done today</span>
      {done.length === 0 ? (
        <span className={styles.wingItem}>Nothing worked yet.</span>
      ) : (
        done.map((d, i) => (
          <span key={i} className={`${styles.wingItem} ${styles.wingDone}`}>
            <span className={styles.wingTick}>✓</span> {d.name}{" "}
            <span className={styles.wingTm}>{d.at}</span>
            {canWrite && (
              <form
                action={unWork.bind(null, d.mk, d.accountId)}
                className={styles.wingUndoForm}
              >
                <button
                  className={styles.wingUndo}
                  type="submit"
                  title="Take it back. The move returns to the queue, and the tap it filed leaves the register. A filed email stays on the record."
                >
                  ↺
                </button>
              </form>
            )}
            {d.sub && d.opens ? (
              <details className={styles.stampFold}>
                <summary className={styles.wingSub}>{d.sub} ▸</summary>
                <div className={styles.stampRows}>
                  {"cites" in d.opens ? (
                    d.opens.cites.length > 0 ? (
                      <CiteRows accountId={d.accountId} rows={d.opens.cites} />
                    ) : (
                      <span className={styles.evQuiet}>{d.opens.empty}</span>
                    )
                  ) : (
                    d.opens.lines.map((l, i) => (
                      <span key={i} className={styles.stampLine}>
                        {l}
                      </span>
                    ))
                  )}
                </div>
              </details>
            ) : (
              d.sub && <span className={styles.wingSub}>{d.sub}</span>
            )}
          </span>
        ))
      )}
    </aside>
  );
}

/** Center stage's head: one account, its action line and its reason line. */
export function StageLines({ item, prox }: { item: QueueItem; prox: string }) {
  return (
    <>
      {item.carried && (
        <span
          className={styles.stgCarry}
          title="Surfaced yesterday and left unworked. A carried move ranks first among equals until it is worked."
        >
          left from yesterday
        </span>
      )}
      <div className={styles.stgName}>
        <Link href={`/accounts?focus=${encodeURIComponent(item.accountId)}`}>
          {item.name}
        </Link>
        {prox && <span className={styles.prox}>{prox}</span>}
      </div>
      <h1 className={styles.stgAct}>{item.action}</h1>
      <p className={styles.stgWhy}>{item.reason}</p>
    </>
  );
}

/** The right wing: the waiting queue, heat-mapped (3 burns today, 2 is dated
 *  this week, 1 keeps), each name with its trigger whispered beneath. "And N
 *  more that can wait." opens the rest in place, painted the same way. */
export function WaitingWing({
  waiting,
  rest,
  hrefOf,
}: {
  waiting: readonly QueueItem[];
  rest: readonly QueueItem[];
  hrefOf: (q: { accountId: string }) => string;
}) {
  const row = (q: QueueItem) => (
    <Link
      key={q.accountId}
      className={styles.wingItem}
      href={hrefOf(q)}
      title={`Ranked by the queue brain. The trigger: ${q.reason}`}
    >
      <span className={`${styles.wingNm} ${styles[`h${heatOf(q)}`]}`}>{q.name}</span>
      <span className={`${styles.tickHeat} ${styles[`tick${heatOf(q)}`]}`} />
      {q.carried && (
        <span
          className={styles.wingCarry}
          title="Surfaced yesterday and left unworked. The room never quietly forgets what it asked for."
        >
          {" "}
          carried
        </span>
      )}
      <span className={styles.wingWhy}>{q.reason}</span>
    </Link>
  );
  return (
    <aside className={`${styles.wing} ${styles.wingR}`} aria-label="Waiting, by heat">
      <span className={styles.wingKick}>Waiting · by heat</span>
      {waiting.length === 0 ? (
        <span className={styles.wingItem}>No one behind this.</span>
      ) : (
        waiting.map(row)
      )}
      {rest.length > 0 && (
        <details className={styles.wingMore}>
          <summary className={styles.wingFoot}>
            And {rest.length} more that can wait.
          </summary>
          {rest.map(row)}
        </details>
      )}
    </aside>
  );
}

/** Worked-it. When the record already holds today's send, the ask is
 *  pre-answered (decreed 2026-08-19): a plain stamp, no chip row. Otherwise
 *  the Channel Ask springs its chips. */
export function WorkedControl({
  preAnswered,
  mk,
  accountId,
  contacts,
  clause,
  accent,
}: {
  preAnswered: boolean;
  mk: string;
  accountId: string;
  contacts: string[];
  clause: string;
  accent: boolean;
}) {
  return preAnswered ? (
    <form action={markWorked.bind(null, mk)}>
      <button
        className={accent ? styles.btnAccent : styles.btn2nd}
        type="submit"
        title="The record already holds today's send. This stamps the move worked."
      >
        Worked it
      </button>
    </form>
  ) : (
    <ChannelAsk
      mk={mk}
      accountId={accountId}
      contacts={contacts}
      clause={clause}
      accent={accent}
    />
  );
}

type LowerDeckProps = {
  canWrite: boolean;
  /** The wire, newest and account-matched first (orderWire). */
  wire: readonly WireItem[];
  wireCount: number;
  /** Every wire item shows, not the newest three: the count was opened. */
  wireAll: boolean;
  /** The count's door: opens every item on file, or folds back to three. */
  wireHref: string;
  wireAvailable: boolean;
  wireIsDue: boolean;
  inst: { inst: Institution; eventSoon: boolean } | null;
  readout: { sections: { title: string; paragraphs: { text: string }[] }[] };
  readoutPayload: string;
  /** The lint's flags on the readout, each said one click down. */
  lintIssues: readonly { kind: string; detail: string }[];
  readoutReadAt: string | undefined;
  idToName: (id: string) => string;
  wireWhen: (at: string) => string;
  monthDay: (iso: string) => string;
};

/** The lower deck the room keeps: the wire, the institutions, and State of
 *  play. */
export function LowerDeck({
  canWrite,
  wire,
  wireCount,
  wireAll,
  wireHref,
  wireAvailable,
  wireIsDue,
  inst,
  readout,
  readoutPayload,
  lintIssues,
  readoutReadAt,
  idToName,
  wireWhen,
  monthDay,
}: LowerDeckProps) {
  return (
    <div className={styles.ldeck}>
      <div className={styles.ribbon}>
        <span className={styles.ribbonLabel}>Outside · the wire</span>
        <span className={styles.ribbonRule} />
        <span className={styles.ribbonCount}>
          {wireCount === 0 ? (
            "no sweep yet"
          ) : wireCount > 3 ? (
            <Link
              href={wireHref}
              title={wireAll ? "Show the newest three." : "Show every item on file."}
            >
              {wireCount} on file {wireAll ? "▴" : "▾"}
            </Link>
          ) : (
            `${wireCount} on file`
          )}
        </span>
      </div>
      {wire.length === 0 ? (
        <div className={styles.empty}>
          The wire watches the outside: the EOR and PEO world, the named competitors, and
          every account name in the book. It files what matters with a one-sentence read.
          Nothing has been swept yet.
          {canWrite && wireAvailable && (
            <form action={sweepWire} style={{ marginTop: 8 }}>
              <SweepButton label="Run the first sweep" />
            </form>
          )}
        </div>
      ) : (
        <div className={styles.wire}>
          {(wireAll ? wire : wire.slice(0, 3)).map((w) => (
            <div key={w.url} className={styles.wireItem}>
              <span className={styles.wireSrc}>
                {w.source} · {wireWhen(w.at) || w.at.slice(0, 10)}
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
          {canWrite && wireAvailable && wireIsDue && (
            <form action={sweepWire}>
              <SweepButton label="Sweep again. The last sweep is stale." small />
            </form>
          )}
        </div>
      )}

      <div className={styles.ribbon}>
        <span className={styles.ribbonLabel}>The institutions</span>
        <span className={styles.ribbonRule} />
        <span className={styles.ribbonCount}>
          {inst?.eventSoon ? "next 7 days" : "standing"}
        </span>
      </div>
      {inst ? (
        <div className={styles.instCard}>
          <b>{inst.inst.name}</b>
          {inst.inst.nextEventIso && inst.eventSoon
            ? `. Gathering ${monthDay(inst.inst.nextEventIso)}.`
            : "."}{" "}
          {inst.inst.note ?? ""}
        </div>
      ) : (
        <div className={styles.instCard}>
          No institution on the calendar yet. Start with a verification, not a membership.
          Verify the Global Chamber&rsquo;s Chicago chapter first: who convenes it, who
          attends, what membership asks. Education first, never a lead request.
        </div>
      )}

      <div className={styles.ribbon}>
        <span className={styles.ribbonLabel}>Standing by</span>
        <span className={styles.ribbonRule} />
        {lintIssues.length > 0 && (
          <details className={`${styles.ribbonCount} ${styles.flagFold}`}>
            <summary>
              {lintIssues.length} flag{lintIssues.length === 1 ? "" : "s"} for the reader
              ▾
            </summary>
            <ul className={styles.flagList}>
              {lintIssues.map((f, i) => (
                <li key={i}>{flagLine(f)}</li>
              ))}
            </ul>
          </details>
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
          <CopyStamp
            payload={readoutPayload}
            label="Copy the readout"
            action={canWrite ? markReadoutRead : undefined}
          />
          {readoutReadAt && (
            <p className={styles.actNote}>Last read to Russ {monthDay(readoutReadAt)}.</p>
          )}
        </div>
      </details>
    </div>
  );
}

type TallyfootProps = {
  week: ReturnType<typeof weekStats>;
  /** The second record's age in days when it is past stale, else null. */
  staleDropDays: number | null;
};

/** One lint flag, said plainly. A money flag names no figure: money never
 *  renders. */
function flagLine(f: { kind: string; detail: string }): string {
  if (f.kind === "banned-word") return `Trade shorthand: "${f.detail}". Say it plainly.`;
  if (f.kind === "bare-date") return "A date written in numbers. Spell the month.";
  if (f.kind === "money") return "A dollar figure. Take it out.";
  return f.detail;
}

/** The Tallyfoot: the page-foot line that is the Sendbook's door
 *  (`THIS WEEK · N WORKED · …`, decreed 2026-08-19). A stale second record
 *  rides ahead of it as its own door, to the drop's receipt on the
 *  Intranet's dock. */
export function Tallyfoot({ week, staleDropDays }: TallyfootProps) {
  return (
    <div className={styles.tallyfoot}>
      {staleDropDays != null ? (
        <Link
          href="/intranet#second-record"
          className={styles.staleFoot}
          title="Open the last drop's receipt on the Intranet."
        >
          SECOND RECORD · {Math.floor(staleDropDays)} DAYS OLD · DROP THE FRESH EXPORT
          ·{" "}
        </Link>
      ) : null}
      <Link
        href="/sendbook"
        className={styles.tallyDoor}
        title="Open the Sendbook. Every touch you made is kept there."
      >
        {week.total === 0 ? (
          <>THIS WEEK · NOTHING WORKED YET · THE SENDBOOK →</>
        ) : (
          <>
            THIS WEEK · <b>{week.total} WORKED</b>
            {week.byChannel.map(([ch, n]) => ` · ${n} ${ch}`).join("")} ·{" "}
            <b>
              {week.accounts} ACCOUNT{week.accounts === 1 ? "" : "S"}
            </b>
            {week.replied > 0 ? ` · ${week.replied} REPLIED` : ""} · THE SENDBOOK →
          </>
        )}
      </Link>
    </div>
  );
}

/** The roundup brief's folded CSM prep (5.3; pass 8 G5, G6): the partner
 *  manager's own last rows, folded on arrival under a kicker that says the
 *  real count, each row a door to its excerpt. Nothing when there are none. */
export function CsmPrep({
  accountId,
  rows,
}: {
  accountId: string;
  rows: readonly Cite[];
}) {
  if (rows.length === 0) return null;
  return (
    <details className={styles.prepFold}>
      <summary>{prepKicker(rows.length)} ▾</summary>
      <div className={styles.prepLine}>
        <CiteRows accountId={accountId} rows={[...rows]} />
      </div>
    </details>
  );
}

/** The threading badge: exactly MULTI, in the one ladder's tone (red one
 *  thread, amber two, green three or more; src/lib/room/multi.ts). No badge
 *  when no one is on file. */
export function MultiBadge({ count }: { count: number }) {
  if (!(count >= 1)) return null;
  return (
    <span
      className={[
        styles.multi,
        { r: styles.multiRed, y: styles.multiAmber, g: styles.multiGreen }[
          multiTone(count)
        ],
      ].join(" ")}
      title={`${count} ${count === 1 ? "person carries" : "people carry"} this conversation`}
    >
      MULTI
    </span>
  );
}
