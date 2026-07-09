import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { hasDatabaseEnv } from "@/lib/db";
import { csms } from "@/lib/book";
import { EXTRA_PARTNERS, partnerRole } from "@/lib/book/partners";
import { loadPartnerNotes, loadTouches } from "@/lib/today/overlay";
import { partnerOutreachKey } from "@/lib/today/build";
import type { Touch } from "@/lib/today/follow-ups";
import { LocalTime } from "../today-client";
import { addPartnerNote, deletePartnerNote } from "./actions";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

// One dated, time-stamped line in a partner's history.
type Entry = {
  at: string; // ISO
  body: string;
  tag: "outreach" | "reply" | "note" | "stash" | "log";
  noteId?: string; // present when the entry is a deletable PartnerNote
};

function clip(s: string, max = 200): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function shortDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Build a partner's merged timeline: every outreach + its thread history (from
// Touch rows) interleaved with dated notes, newest first.
function timelineFor(
  partner: string,
  touches: Touch[],
  notes: { id: string; body: string; source: string; createdAt: string }[],
): Entry[] {
  const out: Entry[] = [];
  for (const t of touches) {
    if (t.kind !== "partner" || t.label !== partner) continue;
    out.push({
      at: t.contactedAt,
      body: t.message ? `Outreach sent — “${clip(t.message)}”` : "Outreach logged",
      tag: "outreach",
    });
    for (const e of t.log) {
      out.push({
        at: e.at,
        body: e.body,
        tag: e.body.startsWith("Reply received") ? "reply" : "log",
      });
    }
  }
  for (const n of notes) {
    out.push({
      at: n.createdAt,
      body: n.body,
      tag: n.source === "stash" ? "stash" : "note",
      noteId: n.id,
    });
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

const TAG_LABEL: Record<Entry["tag"], string> = {
  outreach: "outreach",
  reply: "reply",
  note: "note",
  stash: "from Stash",
  log: "logged",
};

export default async function PartnersPage() {
  const access = await getAppAccess();
  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Partners" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }
  const canWrite = access.canWrite && hasDatabaseEnv();

  const [touches, partnerNotes] = await Promise.all([loadTouches(), loadPartnerNotes()]);

  // Roster: the book's CSMs (minus Unassigned) + standing extras + anyone who
  // already has partner history — so a name never disappears from the room.
  const roster = [
    ...new Set(
      [
        ...csms.filter((c) => c && c !== "Unassigned"),
        ...EXTRA_PARTNERS,
        ...touches.filter((t) => t.kind === "partner").map((t) => t.label),
        ...partnerNotes.keys(),
      ].filter(Boolean),
    ),
  ];

  return (
    <>
      <AppWayfinder current="Partners" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Partner Room</h1>
        <p className={styles.sub}>
          The by-partner repository — every outreach you&apos;ve sent, every reply, and
          every note, dated and time-stamped. Notes land here from the box below or by
          routing a Stash capture to a partner; outreach history syncs from the partner
          cards on <Link href="/today">Today</Link>.
        </p>

        {roster.map((partner) => {
          const key = partnerOutreachKey(partner);
          const t = touches.find((x) => x.subjectKey === key);
          const entries = timelineFor(partner, touches, partnerNotes.get(partner) ?? []);
          return (
            <section
              key={partner}
              id={encodeURIComponent(partner)}
              className={styles.prCard}
            >
              <div className={styles.prHead}>
                <span className={styles.prName}>{partner}</span>
                <span className={styles.prRole}>{partnerRole(partner)}</span>
                <span className={styles.prNext}>
                  {t
                    ? t.status === "replied"
                      ? `Replied ✓ · last outreach ${shortDate(t.contactedAt)}`
                      : `Awaiting reply · check-in ${shortDate(t.followUpAt)}`
                    : "No outreach logged yet"}
                </span>
                <Link href="/today" className={styles.prTodayLink}>
                  Outreach card on Today →
                </Link>
              </div>

              {canWrite && (
                <form action={addPartnerNote} className={styles.prNoteForm}>
                  <input type="hidden" name="partner" value={partner} />
                  <input
                    name="body"
                    required
                    maxLength={2000}
                    placeholder={`Add a dated note about ${partner.split(" ")[0]}…`}
                    aria-label={`Add a note about ${partner}`}
                  />
                  <button className={styles.prNoteBtn}>Add note</button>
                </form>
              )}

              {entries.length === 0 ? (
                <p className={styles.prEmpty}>
                  Nothing here yet — mark them contacted on Today or add a note above.
                </p>
              ) : (
                <ul className={styles.prTimeline}>
                  {entries.map((e, i) => (
                    <li key={e.noteId ?? `${e.at}-${i}`} className={styles.prEntry}>
                      <span className={styles.prWhen}>
                        <LocalTime iso={e.at} />
                      </span>
                      <span
                        className={`${styles.prTag} ${styles[`prTag_${e.tag}`] ?? ""}`}
                      >
                        {TAG_LABEL[e.tag]}
                      </span>
                      <span className={styles.prBody}>{e.body}</span>
                      {e.noteId && canWrite && (
                        <form action={deletePartnerNote} className={styles.valInline}>
                          <input type="hidden" name="id" value={e.noteId} />
                          <button className={styles.prDel} aria-label="Delete note">
                            ✕
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
