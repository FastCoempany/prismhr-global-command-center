// The two stage ladders (the F26 face, release two; ship order 2026-11-04;
// docs/mockups/stages-two-ladders-2026-11-04.html and
// homeroom-f-decks-2026-11-04.html). The partner ladder runs once for each
// PEO: not met, engaged cold, engaged warm, reviewing, signed, oriented,
// live. The client ladder runs once for each client the PEO brings: named,
// scoped, shown, won, onboarding, live. Live on the partner ladder is read
// from the client ladder and never set by hand.
//
// Each stage is read from the record first, the way the founder defined it
// (2026-11-04): engaged cold is a reply or a call with nothing concrete in
// it; warm is a stated leaning toward reseller or referral, a named need or a
// request for a call; reviewing is the agreement sent at their request;
// signed is the executed agreement; oriented is the first call after
// signing, held with the PEO's team. Every stage names the record line it
// stands on. The operator's own mark outranks the read and says so, and ↺
// puts back what the record shows (the facts: store, src/lib/room/facts.ts).
// Pure: the page hands in the account read's docs and facts.

import type { RowFacts } from "@/lib/room/facts";

export const PARTNER_STAGES = [
  {
    k: "none",
    label: "Not met",
    short: "Not met",
    def: "We have written. No reply and no call yet.",
  },
  {
    k: "cold",
    label: "Engaged · cold",
    short: "Cold",
    def: "One reply by email or one call so far, and nothing concrete.",
  },
  {
    k: "warm",
    label: "Engaged · warm",
    short: "Warm",
    def: "They leaned toward reseller or referral, named a need, or asked for a call.",
  },
  {
    k: "review",
    label: "Reviewing",
    short: "Review",
    def: "They agreed to receive the agreement, and we sent it.",
  },
  {
    k: "signed",
    label: "Signed",
    short: "Signed",
    def: "The reseller or referral agreement is executed.",
  },
  {
    k: "oriented",
    label: "Oriented",
    short: "Oriented",
    def: "The first call after signing is held, with the PEO's team and without the client.",
  },
  {
    k: "live",
    label: "Live",
    short: "Live",
    def: "Their first client is live. Read from the client ladder.",
  },
] as const;
export const CLIENT_STAGES = [
  {
    k: "named",
    label: "Named",
    short: "Named",
    def: "A client is mentioned or named. Countries and needs are unclear.",
  },
  {
    k: "scoped",
    label: "Scoped",
    short: "Scoped",
    def: "The country, the product, about how many people and a date are all on file.",
  },
  {
    k: "shown",
    label: "Shown",
    short: "Shown",
    def: "A demo was held or numbers went to them.",
  },
  { k: "won", label: "Won", short: "Won", def: "The client said yes." },
  {
    k: "onboarding",
    label: "Onboarding",
    short: "Onboarding",
    def: "The client's employees are onboarded, then the PEO's team trains the client.",
  },
  { k: "live", label: "Live", short: "Live", def: "Onboarding and training are done." },
] as const;

export type PartnerKey = (typeof PARTNER_STAGES)[number]["k"];
export type ClientKey = (typeof CLIENT_STAGES)[number]["k"];
export const PARTNER_KEYS = PARTNER_STAGES.map((s) => s.k) as readonly PartnerKey[];
export const CLIENT_KEYS = CLIENT_STAGES.map((s) => s.k) as readonly ClientKey[];
export const isPartnerKey = (v: unknown): v is PartnerKey =>
  typeof v === "string" && (PARTNER_KEYS as readonly string[]).includes(v);
export const isClientKey = (v: unknown): v is ClientKey =>
  typeof v === "string" && (CLIENT_KEYS as readonly string[]).includes(v);

/** Grey before anything concrete, blue while it moves, green once it is real
 *  (the founder's colors, 2026-11-04). */
export function stageTone(which: "p" | "c", k: string): "t0" | "tb" | "tg" {
  if (which === "p")
    return k === "warm" || k === "review"
      ? "tb"
      : k === "signed" || k === "oriented" || k === "live"
        ? "tg"
        : "t0";
  return k === "scoped" || k === "shown"
    ? "tb"
    : k === "won" || k === "onboarding" || k === "live"
      ? "tg"
      : "t0";
}

/** Where a stage came from: the record line, the board, or the hand. */
export type StageSource = {
  kind: "record" | "board" | "hand";
  day: string;
  line: string;
};
export type Ladders = {
  partner: { k: PartnerKey; src: StageSource; recordK: PartnerKey; hand: boolean };
  /** Null while no client is mentioned, named or marked. */
  client: {
    k: ClientKey;
    src: StageSource;
    recordK: ClientKey | null;
    hand: boolean;
  } | null;
  /** The agreement review: 0 not sent, 1 sent at their request, 2 their
   *  redline is back, 3 signed (red, amber, green). */
  agreement: { n: 0 | 1 | 2 | 3; src: StageSource | null };
  /** The deal is closed lost on the board: the partner ladder shows Passed. */
  passed: boolean;
};

type Doc = {
  text: string;
  at: string;
  direction?: "in" | "out";
  sender: string;
  senderIsHome: boolean;
  machinery: boolean;
  closer: boolean;
  tape: boolean;
};

const mmdd = (iso: string): string => {
  const t = Date.parse(iso);
  return Number.isNaN(t)
    ? ""
    : new Date(t).toLocaleDateString("en-US", {
        timeZone: "America/Chicago",
        month: "numeric",
        day: "numeric",
      });
};
const head = (text: string): string =>
  (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean)
    ?.slice(0, 160) ?? "";
const src = (d: Doc): StageSource => ({
  kind: "record",
  day: mmdd(d.at),
  line: head(d.text),
});

// What each step looks like in the record's own words.
const MEETING_RE = /meeting held|^\s*✔|CALL TRANSCRIPT|☎|\bcall\b/i;
const CALL_ASK_RE =
  /\b(?:(?:set|book|find|grab|schedule|get)\s+(?:up\s+)?(?:a\s+)?(?:time|call|meeting|minutes)|(?:hop|jump|get) on a call|a call (?:this|next) week|walk (?:us|me) through|time to (?:talk|chat|connect))\b/i;
// The agreement going out, not the agreement mentioned: an intro that names
// the reseller agreement is not a send of it.
const AGREEMENT_SENT_RE =
  /\b(?:review copy|(?:attached|attaching|enclosed|here(?: i|')s|sending(?: you)?|sent(?: you)?)[^.\n]{0,60}\b(?:reseller|referral) agreement|(?:reseller|referral) agreement[^.\n]{0,30}\b(?:attached|enclosed|for (?:your|you to) review))/i;
const REDLINE_RE =
  /\b(?:red-?lines?|red-?lined|tracked changes|mark-?up|marked[- ]up|comments on the agreement|(?:our|their) (?:counsel|legal(?: team)?|attorney)(?:'s)? (?:edits|changes|comments|notes))\b/i;
const SIGNED_RE =
  /\b(?:signed (?:copy|agreement|contract|version|reseller|referral)|counter-?signed|fully executed|executed (?:agreement|copy|contract)|attached (?:is )?the signed|docusign\b[^.\n]{0,40}\bcompleted)\b/i;
const ORIENT_RE = /\b(?:orientation|implementation|kick-?off|onboarding)\b/i;
const NUMBERS_RE =
  /\b(?:quote|pricing|proposal|the numbers|cost (?:breakdown|estimate))\b/i;

export function readLadders(args: {
  docs: readonly Doc[];
  facts: RowFacts;
  /** The board's Closed Won or Lost stamp, when there is one. */
  outcome: { status: "won" | "lost"; at: string } | null;
  /** A demo held, on the board or in the record. */
  demoHeld: { at: string; line: string } | null;
  /** The agreements' review copies the app sent as files (release three):
   *  each is the agreement going out, with its day. */
  agreementFiles?: readonly { at: string; line: string }[];
  hand: {
    partner?: PartnerKey;
    client?: ClientKey;
    partnerDay?: string;
    clientDay?: string;
  };
}): Ladders {
  const docs = [...args.docs]
    .filter((d) => !d.machinery)
    .sort((a, b) => a.at.localeCompare(b.at));
  const theirs = docs.filter(
    (d) => d.direction === "in" && !d.senderIsHome && !!d.sender,
  );
  const ours = docs.filter((d) => d.direction === "out" || d.senderIsHome);
  const meetings = docs.filter((d) => d.tape || MEETING_RE.test(head(d.text)));
  const first = <T>(xs: T[]): T | undefined => xs[0];

  // ── the partner ladder, read from the record ──
  let recordK: PartnerKey = "none";
  let recordSrc: StageSource = {
    kind: "record",
    day: "",
    line: "Only our own sends are on the record.",
  };
  const engaged = first(
    [...theirs.filter((d) => !d.closer), ...meetings].sort((a, b) =>
      a.at.localeCompare(b.at),
    ),
  );
  if (engaged) {
    recordK = "cold";
    recordSrc = src(engaged);
  }
  const callAsk = first(theirs.filter((d) => CALL_ASK_RE.test(d.text)));
  // A leaning the record states, not the digest's seed (a seed has no line).
  const chairStated =
    args.facts.chair.v !== "none" && !args.facts.chair.hand && !!args.facts.chair.line;
  const needNamed = !!engaged && args.facts.products.length > 0;
  if (chairStated || callAsk || needNamed) {
    recordK = "warm";
    recordSrc = chairStated
      ? { kind: "record", day: args.facts.chair.day, line: args.facts.chair.line }
      : callAsk
        ? src(callAsk)
        : {
            kind: "record",
            day: args.facts.products[0]!.day,
            line: args.facts.products[0]!.line,
          };
  }
  const sentDoc = first(ours.filter((d) => AGREEMENT_SENT_RE.test(d.text)));
  const sentFile = first(
    [...(args.agreementFiles ?? [])].sort((a, b) => a.at.localeCompare(b.at)),
  );
  // Whichever went out first: a send the record reads, or a review copy the
  // app recorded leaving with Send files.
  const sent: { at: string; src: StageSource } | undefined =
    sentDoc && (!sentFile || sentDoc.at <= sentFile.at)
      ? { at: sentDoc.at, src: src(sentDoc) }
      : sentFile
        ? {
            at: sentFile.at,
            src: { kind: "record", day: mmdd(sentFile.at), line: sentFile.line },
          }
        : undefined;
  const redline = first(
    theirs.filter((d) => REDLINE_RE.test(d.text) && (!sent || d.at >= sent.at)),
  );
  const signedDoc = first(theirs.filter((d) => SIGNED_RE.test(d.text)));
  let agreement: Ladders["agreement"] = { n: 0, src: null };
  if (sent) {
    recordK = "review";
    recordSrc = sent.src;
    agreement = { n: 1, src: sent.src };
  }
  if (redline) agreement = { n: 2, src: src(redline) };
  let signedAt = "";
  if (signedDoc) {
    recordK = "signed";
    recordSrc = src(signedDoc);
    agreement = { n: 3, src: src(signedDoc) };
    signedAt = signedDoc.at;
  } else if (args.outcome?.status === "won") {
    // The board's Closed Won has meant the agreement signed: the partner's
    // deal is the Salesforce opportunity (the founder, 2026-11-04).
    const s: StageSource = {
      kind: "board",
      day: mmdd(args.outcome.at),
      line: "Closed Won on the board.",
    };
    recordK = "signed";
    recordSrc = s;
    agreement = { n: 3, src: s };
    signedAt = args.outcome.at;
  }
  if (signedAt) {
    const orient = first(
      meetings.filter((d) => d.at > signedAt && ORIENT_RE.test(d.text)),
    );
    if (orient) {
      recordK = "oriented";
      recordSrc = src(orient);
    }
  }

  // ── the client ladder, read from the record ──
  const f = args.facts;
  let clientK: ClientKey | null = null;
  let clientSrc: StageSource | null = null;
  if (f.client.name || f.countries.length || f.heads.length) {
    clientK = "named";
    const c = f.countries[0] ?? f.heads[0];
    clientSrc = c
      ? { kind: "record", day: c.day, line: c.line }
      : { kind: "hand", day: f.client.day, line: "You named the client." };
  }
  if (
    clientK &&
    f.countries.length &&
    f.products.length &&
    f.heads.length &&
    f.date?.iso
  ) {
    clientK = "scoped";
    clientSrc = { kind: "record", day: f.date.day, line: f.date.line };
  }
  const numbers = first(ours.filter((d) => NUMBERS_RE.test(d.text)));
  if (clientK && (args.demoHeld || numbers)) {
    clientK = "shown";
    clientSrc = args.demoHeld
      ? { kind: "record", day: mmdd(args.demoHeld.at), line: args.demoHeld.line }
      : src(numbers!);
  }

  // ── the hand on top ──
  const hc = args.hand.client;
  const client = hc
    ? {
        k: hc,
        src: {
          kind: "hand" as const,
          day: args.hand.clientDay ?? "",
          line: "You set this stage by hand.",
        },
        recordK: clientK,
        hand: true,
      }
    : clientK
      ? { k: clientK, src: clientSrc!, recordK: clientK, hand: false }
      : null;
  const hp = args.hand.partner;
  let partner: Ladders["partner"] = hp
    ? {
        k: hp,
        src: {
          kind: "hand",
          day: args.hand.partnerDay ?? "",
          line: "You set this stage by hand.",
        },
        recordK,
        hand: true,
      }
    : { k: recordK, src: recordSrc, recordK, hand: false };
  // A partner is live when one of its clients is live.
  if (client?.k === "live")
    partner = {
      ...partner,
      k: "live",
      src: {
        kind: client.src.kind,
        day: client.src.day,
        line: "A client is live, so the partner is live.",
      },
    };
  // A signed partner the hand marked keeps a signed agreement on its meter.
  if (
    (partner.k === "signed" || partner.k === "oriented" || partner.k === "live") &&
    agreement.n < 3
  )
    agreement = { n: 3, src: partner.src };
  return { partner, client, agreement, passed: args.outcome?.status === "lost" };
}
