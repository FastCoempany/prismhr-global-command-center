// The meat law (founder-decreed 2026-08-20): every citation, theme, and case
// opens to the actual email meat — cleaned of the junk Salesforce's Full
// Comments carry. This is the one cleaner both halves use: the browser cleans
// before staging (so the comment cap spends its budget on words, never on
// banners), and the reads clean again defensively for slices staged before
// the cleaner existed. Pure, isomorphic, and tested against real rows.

/** Proofpoint wraps its warning in a sentinel token pair; the whole span —
 *  including the "This Message Is From an External Sender / DO NOT CLICK"
 *  text between the tokens — is machinery, never words. */
const BANNER_SPAN = /ZjQcmQRYFpfptBannerStart[\s\S]*?ZjQcmQRYFpfptBannerEnd/g;
const BANNER_TOKEN = /ZjQcmQRYFpfptBanner(Start|End)/g;

/** Warning lines that survive outside the sentinel pair. */
const WARNING_LINES = [
  /This Message Is From an External Sender[\s\S]{0,120}?(content is safe\.?|know the content is safe\.?)/gi,
  /DO NOT CLICK links or attachments unless you recognize the sender and know the content is safe\.?/gi,
  /!\s*External email[\s\S]{0,80}?use caution[^.]*\.?/gi,
  /This message originated outside [^.]{0,80}\.(\s*Do n[^.]*\.?)?/gi,
];

/** Signature and disclaimer openers — everything from the FIRST of these to
 *  the end of the text is boilerplate. Order matters only for the search;
 *  the earliest match wins. */
const TAIL_MARKERS: RegExp[] = [
  /This message may contain confidential and\/or privileged information/i,
  /LEGAL DISCLAIMER\s*\/?\s*CONFIDENTIALITY/i,
  /This e-?mail and any files transmitted with it are confidential/i,
  /Your referral is the highest compliment we can receive/i,
  /Book a meeting with me/i,
  /CONFIDENTIALITY NOTICE/i,
];

/** The quoted trail: a reply's own words end where the quoted original
 *  begins. SF comments flatten the "From: … Sent: … To: … Subject: …" block
 *  onto run-on lines, so the cut looks for From: followed within a short
 *  span by Sent: — a shape body prose never has. */
const QUOTE_TRAIL = /(?:^|\n|\s)From:\s+[^\n]{1,120}?(?:\n|\s)Sent:\s/;

/** The comment head SF prepends: To/CC/BCC/Attachment/Subject then "Body:".
 *  Words start after "Body:" when that scaffold is present. */
const HEAD_SCAFFOLD = /^[\s\S]{0,400}?\bBody:\s*/;

/** Signature block lines that appear mid-text when a thread is flattened:
 *  "Name\nClient Growth ManagerP: 877…D: 440…" — strip the contact-card runs. */
const CONTACT_CARD =
  /(?:Client Growth Manager|Customer Success Manager|Sr\.? Business Development Executive)[^]{0,40}?(?:P:|T:)\s*[\d.\s()-]{7,}[^]{0,240}?(?=\s[A-Z"']|$)/g;

/** Mojibake from SF's encoding pass: � as space filler, ?-for-apostrophe
 *  inside contractions ("they?ve", "Sarah?s"), ?-for-dash spacing. */
function unmojibake(s: string): string {
  return s
    .replace(/�/g, " ")
    .replace(/(\w)\?(ve|re|ll|s|t|d|m)\b/g, "$1'$2")
    .replace(/\s\?\s/g, " — ");
}

/** Clean one Full Comments blob down to the words a person wrote. The cap is
 *  spent on meat: scaffold, banners, quoted trails, signatures, and legal
 *  boilerplate all go first, then the text trims to the cap on a word edge. */
export function cleanExcerpt(raw: string, cap = 500): string {
  let s = raw ?? "";
  if (!s.trim()) return "";

  s = s.replace(HEAD_SCAFFOLD, (m) => (/\bSubject:/.test(m) ? "" : m));
  s = s.replace(BANNER_SPAN, " ");
  s = s.replace(BANNER_TOKEN, " ");
  for (const w of WARNING_LINES) s = s.replace(w, " ");

  // Cut the quoted trail — the reply's own words end here.
  const trail = QUOTE_TRAIL.exec(s);
  if (trail && trail.index > 40) s = s.slice(0, trail.index);

  // Cut at the earliest signature/disclaimer marker.
  let cutAt = -1;
  for (const m of TAIL_MARKERS) {
    const hit = m.exec(s);
    if (hit && (cutAt === -1 || hit.index < cutAt)) cutAt = hit.index;
  }
  if (cutAt > 40) s = s.slice(0, cutAt);

  s = s.replace(CONTACT_CARD, " ");
  s = unmojibake(s);
  s = s.replace(/\s+/g, " ").trim();

  if (s.length <= cap) return s;
  const cut = s.slice(0, cap);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > cap * 0.6 ? lastSpace : cap).trimEnd()}…`;
}

// ── who was on the email ────────────────────────────────────────────────────
// The scaffold the cleaner throws away carries the one thing the export's
// columns do not: the actual people. On a logged email the Assigned column
// names the LOGGER — "Automated Process" on 118 of the operator's own rows in
// the 2026-08-28 export — while To/CC/BCC name Jennifer, Stephanie, Anika.
// Read the addresses before the scaffold is cut, and the room can say who was
// on the thread instead of naming a mechanism.
//
// Only the recipient lines are read. The body is never scanned: a signature
// block, a forwarded trail, or a disclaimer's "unsubscribe@" is not a
// correspondent, and a support case's own boilerplate is thick with them.

const RECIPIENT_LINE = /^(?:Additional\s+)?(?:To|CC|BCC):(.*)$/gim;
const ADDRESS = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const HEAD_LIMIT = 600;

/** The addresses in a logged email's To/CC/BCC lines, lowercased, deduped,
 *  in the order they appear. Empty for anything without the scaffold. */
export function correspondentsOf(raw: string, cap = 12): string[] {
  const s = raw ?? "";
  const bodyAt = s.search(/^Body:/im);
  const head = s.slice(0, bodyAt > 0 ? Math.min(bodyAt, HEAD_LIMIT) : HEAD_LIMIT);
  if (!head) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  RECIPIENT_LINE.lastIndex = 0;
  let line: RegExpExecArray | null;
  while ((line = RECIPIENT_LINE.exec(head))) {
    ADDRESS.lastIndex = 0;
    let a: RegExpExecArray | null;
    while ((a = ADDRESS.exec(line[1]))) {
      const addr = a[0].toLowerCase();
      if (seen.has(addr)) continue;
      seen.add(addr);
      out.push(addr);
      if (out.length >= cap) return out;
    }
  }
  return out;
}

/** Case-thread tokens strip from rendered subjects; kept in citations. */
export function cleanSubject(s: string): string {
  return (s ?? "")
    .replace(/\[\s*thread::[^\]]*\]?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The case number a support subject carries, or "" — the drill's grouping
 *  key one layer beneath the theme. */
export function caseNumberOf(subject: string): string {
  const m = /PrismHR Case\s*(\d{6,10})/i.exec(subject ?? "");
  return m ? m[1] : "";
}
