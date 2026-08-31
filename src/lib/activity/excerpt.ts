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
// Outlook mobile glues its sign-off straight onto the header —
// "Get Outlook for iOSFrom: Javier Ramirez <…>" — with no space at all, so a
// pattern anchored on whitespace walks straight past the earliest cut and
// leaves a whole quoted message in the excerpt. 268 bodies in the 2026-08-29
// export carry that glued form — and the character before is as often a
// capital as not ("iOSFrom:"), so any letter or digit closes the boundary.
// The "Sent:" that must follow within 120 characters is what keeps this from
// firing on ordinary prose.
const QUOTE_TRAIL = /(?:^|\n|\s|[A-Za-z0-9])From:\s+[^\n]{1,120}?(?:\n|\s)Sent:\s/;

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

// The self-quote cut. Salesforce's Full Comments holds the whole flattened
// thread, and Outlook's HTML-to-text pass emits each message TWICE — once as a
// run-on line, once properly broken — so the words repeat even where no
// "From:" header survives to cut on. 2,243 of 11,643 excerpts in the
// 2026-08-29 export said the same thing twice (2026-08-31).
//
// Content is the only reliable boundary: when a long opening run appears again
// later, everything from that second appearance on is the quote. The probe is
// deliberately long (a real sentence, not a stock phrase like "Thanks for your
// time") and only the opening of the text is probed, so a message that merely
// repeats itself rhetorically is left alone.
// Compared on WORDS, not characters. The two copies of a message differ in
// their punctuation and in how far SF's encoding mangled them — "the correct
// Cheryl.?.?." against "the correct Cheryl..." — so a literal compare misses
// them. Letters and digits only, with a map back to the original offsets.
const SELF_QUOTE_PROBE = 48; // normalized chars ≈ a full sentence
const SELF_QUOTE_MIN_KEEP = 80; // never cut an excerpt down to a fragment

function cutSelfQuote(s: string): string {
  if (s.length < SELF_QUOTE_MIN_KEEP + SELF_QUOTE_PROBE) return s;
  let norm = "";
  const at: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const lower = c >= 65 && c <= 90 ? c + 32 : c; // A-Z → a-z
    if ((lower >= 97 && lower <= 122) || (lower >= 48 && lower <= 57)) {
      norm += String.fromCharCode(lower);
      at.push(i);
    }
  }
  if (norm.length < SELF_QUOTE_PROBE * 2) return s;
  const again = norm.indexOf(norm.slice(0, SELF_QUOTE_PROBE), SELF_QUOTE_PROBE);
  if (again < 0) return s;
  const cut = at[again];
  return cut >= SELF_QUOTE_MIN_KEEP ? s.slice(0, cut) : s;
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
  // Last, on the normalized text: the doubled copy differs from the original
  // only in its whitespace, so it is invisible until the runs are flattened.
  s = cutSelfQuote(s).trim();

  if (s.length <= cap) return s;
  const cut = s.slice(0, cap);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > cap * 0.6 ? lastSpace : cap).trimEnd()}…`;
}

// ── who WROTE it ────────────────────────────────────────────────────────────
// Salesforce's comment scaffold carries To/CC/BCC and no From at all, so every
// reader downstream fell back to the Assigned column — which on a captured
// email is whose record the row hangs on, not whose hands typed it. On the
// 2026-08-29 export that made 47 rows read as the operator's own sends when a
// colleague had written them: Anika's onboarding welcome to Staff Leasing,
// filed under Antaeus because he was CC'd. Attributing one person's words to
// another is the worst thing this record can do (founder, 2026-08-31).
//
// The sender IS in the data, in the signature. Two independent signals, and
// the read only speaks when they agree or when one stands alone and clean:
//   · the sign-off name  ("Best regards,\nAnika Steenstra")
//   · the signature's own address  ("E: anika.steenstra@prismhr.com")
// Agreement is the confident case. Disagreement means a flattened thread has
// put two people's signatures in one body, and the read declines rather than
// guess — no attribution beats a wrong one.

const SIGN_OFF =
  /\b(?:Best regards|Kind regards|Warm regards|Best wishes|Many thanks|Regards|Sincerely|Cheers|Thanks|Thank you|Talk soon|Best)\b[,!.]?[\s\r\n]*([A-Z][A-Za-z.'’-]+(?:[ \t]+[A-Z][A-Za-z.'’-]+){0,2})(?![A-Za-z])/g;
const SIG_EMAIL = /\bE:\s*[\s\uFFFD]*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/;

/** Tokens that can follow a sign-off but are never part of a signature: the
 *  first words of the next sentence ("Thanks! The invoice…"), the job title
 *  glued under the name ("Amy Grazioso Vice President"), and the case
 *  boilerplate SF stamps into support comments ("Original Case Details"). The
 *  name is cut at the first of these; what stands before it is the name. */
const NOT_A_NAME =
  /^(?:And|The|For|You|Your|We|I|If|In|On|At|To|So|My|Our|Please|Again|All|Very|Much|Sent|From|Get|Have|Here|It|Is|Let|Look|Team|Support|Hi|Hello|Dear|Thanks?|Best|Regards|He|She|They|That|This|But|Same|Who|What|When|Why|Also|Just|Sample|Original|Case|Details|Info|Message|Banner|Practice|Workflow|Configuration|Senior|Sr|Jr|Junior|Director|Manager|Vice|President|Chief|Officer|Executive|Enterprise|Product|Client|Customer|Employee|Resource|Payroll|Sales|Account|Business|Development|Growth|Success|Partner|Specialist|Consultant|Coordinator|Analyst|Lead|Head|Global|Regional|National|Project|Certified|Professional|Associate|Assistant|Administrator|Advisor|Operations|Marketing|Service|Services|Solutions|Technology|Implementation|Onboarding|Benefits|Human|Resources|Talent|People|Building|Experience)$/i;

/** Outlook's HTML-to-text pass glues the title onto the surname with no space
 *  — "Jamie MorrisonSenior Sales" — and Proofpoint's sentinel glues its whole
 *  banner on the same way. Keep the name half. Real names carry an internal
 *  capital too (McDonald, MacKenzie, DeSantis), so the split only fires past a
 *  prefix long enough that no such particle could be sitting there. */
function unglue(token: string): string {
  const m = /^([A-Za-z][a-z]{3,})([A-Z][A-Za-z]*)$/.exec(token);
  return m ? m[1] : token;
}

/** A capital in the middle of a word the unglue could not split — "JoryJory's"
 *  — is wreckage, not a surname. The particles that legitimately carry one are
 *  named, so McDonald and O'Neill still read. */
const PARTICLE = /^(?:Mc|Mac|O['’]|D['’]|De|Del|Della|Di|Du|La|Le|Van|Von)/;
function isWreck(token: string): boolean {
  // Hyphenated surnames are two names; each half is judged on its own, so
  // "King-Corbin" reads while "JoryJory's" does not.
  return token
    .split(/[-–]/)
    .some((part) => !PARTICLE.test(part) && /^.[a-z’']*[A-Z]/.test(part));
}

/** "CHASSIE SMITH" → "Chassie Smith"; "Bill Bill Laffey" → "Bill Laffey";
 *  "Jamie MorrisonSenior Sales" → "Jamie Morrison"; "Sample Info" → "". The
 *  result is a whole name or it is nothing — two clean tokens at least, since
 *  a bare first name attributes to whoever else shares it. */
function tidyName(raw: string): string {
  const out: string[] = [];
  // "Thanks, Mary.Hi Christina" — SF's flattening eats the space after a full
  // stop. Put it back so the stop can end the signature where it should.
  const words = raw
    .trim()
    .replace(/\.(?=[A-Z])/g, ". ")
    .split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const shout = word === word.toUpperCase() && /[A-Z]/.test(word);
    // A short shout after a mixed-case word is a credential, not a name:
    // "Jessica Brach EVP", "Jeanette Coleman SPHR". A shout after a shout is
    // just an all-caps signature — "CHASSIE SMITH" keeps both halves.
    const priorShout =
      i > 0 && words[i - 1] === words[i - 1].toUpperCase() && /[A-Z]/.test(words[i - 1]);
    if (out.length && shout && word.replace(/\W/g, "").length <= 5 && !priorShout) break;
    const cased = shout && word.length > 1 ? word[0] + word.slice(1).toLowerCase() : word;
    const token = unglue(cased);
    const stem = token.replace(/[.,]$/, "");
    if (NOT_A_NAME.test(stem)) break;
    if (token.length > 20 || /\d/.test(token) || isWreck(stem)) break;
    // A trailing initial ("Celine Tabare R.") names nobody further.
    if (out.length >= 2 && stem.length <= 1) break;
    if (out.length && out[out.length - 1].toLowerCase() === token.toLowerCase()) continue;
    out.push(stem);
    // A full stop ends the signature. "Thanks, Riley. Nice to meet you" signs
    // off with a first name only; the sentence after it is not a surname.
    if (/\.$/.test(token) && stem.length > 1) break;
    if (out.length === 3) break;
  }
  return out.length >= 2 ? out.join(" ") : "";
}

/** Do a name and an address plausibly belong to the same person? Matches
 *  "anika.steenstra@", "asteenstra@", "steenstra@" and "anika@". */
function nameFitsAddress(name: string, address: string): boolean {
  const local = address
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const words = name
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (!local || words.length === 0) return false;
  const last = words[words.length - 1];
  const first = words[0];
  return (
    local.includes(last) ||
    local.includes(first) ||
    local === `${first[0]}${last}` ||
    local === `${first}${last[0]}`
  );
}

export type SenderRead = { name: string; email: string };

/** Who wrote this email, from its own signature. Empty when the body does not
 *  say plainly — an unattributed row is honest; a misattributed one is not. */
export function senderOf(raw: string): SenderRead {
  const s = raw ?? "";
  const at = s.search(/^Body:/im);
  let body = at >= 0 ? s.slice(at + 5) : s;
  // Only the newest message speaks for the sender. Everything past the quoted
  // trail was written by whoever is being replied TO — reading a signature out
  // of there is exactly the misattribution this function exists to stop.
  // No floor on the cut here, unlike the excerpt cleaner: an excerpt trimmed
  // to nothing is a loss, but a sender read down to nothing is the right
  // answer — the row simply does not say who wrote it.
  const trail = QUOTE_TRAIL.exec(body);
  if (trail) body = body.slice(0, trail.index);
  body = body.replace(BANNER_SPAN, " ");
  if (!body.trim()) return { name: "", email: "" };

  const em = SIG_EMAIL.exec(body);
  const email = em ? em[1].toLowerCase() : "";

  // The newest message leads a flattened thread, so the FIRST sign-off wins.
  let name = "";
  SIGN_OFF.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SIGN_OFF.exec(body))) {
    if (m.index > 6000) break;
    const cand = tidyName(m[1]);
    if (!cand) continue;
    name = cand;
    break;
  }

  if (name && email) {
    // Both present and agreeing is the confident read. Disagreeing means the
    // body holds more than one signature; say nothing rather than pick.
    return nameFitsAddress(name, email) ? { name, email } : { name: "", email: "" };
  }
  if (name) return { name, email: "" };
  if (email) {
    // No usable sign-off. An address spells a name only when it separates the
    // two parts; "rjones@" does not, and "Rjones" is not a person.
    const parts = email
      .split("@")[0]
      .split(/[._]/)
      .filter((b) => b.length > 1);
    if (parts.length >= 2)
      return {
        name: parts.map((b) => b[0].toUpperCase() + b.slice(1)).join(" "),
        email,
      };
    return { name: "", email };
  }
  return { name: "", email: "" };
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
