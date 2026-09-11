// The misfile guard — one verdict, every door (founder-decreed 2026-09-03).
//
// The old guard compared COMPANY NAMES only, and its first rule was "an empty
// claim is no objection". On 2026-09-03 a Simploy call transcript was dropped
// on the Regis HR Group row: the tape says neither company's name — nobody
// says their own company out loud on a call — so the read had no claim to
// make, the guard shrugged, and a Simploy conversation filed to Regis. It
// took three todos, a gap set, and three playbook facts with it, so the
// cross-account brain now held Chassie Smith as a Regis voice.
//
// The app knew. The book binds Chassie Smith to Simploy in two separate
// stores. The guard just never looked at people — only at a company name the
// tape never contained.
//
// So the verdict reads BOTH rungs, and the record outranks the model's claim
// (the Ted doctrine): the company the read names, and the evidence the text
// itself carries — a known contact's address, a company domain, a person the
// book binds to exactly one account. Either rung may object.
//
// One guard rule keeps this from crying wolf: NEITHER rung objects when the
// bound account has signal of its own. A Regis thread that mentions "Chassie
// at Simploy" in passing still carries Regis's own people and domain, so it
// files without a word. A capture that names only Simploy's people, dropped on
// Regis, is the one that asks.
//
// That rule has to cover the read's claim too, and on 2026-09-03 it did not —
// rung 1 objected before anything looked at the row's own evidence. This is
// the two-tier law arriving at the guard: a PEO's mail is usually ABOUT its
// client, and the client is not in our book and never will be. So a read that
// names some other company is the ordinary shape of a channel sale, not a
// misfile.
//
// Measured 2026-09-11: a thread from Martha Ohler at Simple Everest —
// Infiniti HR's own prospect — addressed to Tom at infinitihr.com, subject
// "Info needed for InfinitiHR", with us copied in. The router put it on
// Infiniti HR at 80 on the domain alone. The read named Simple Everest, rung 1
// fired, and a live Poland contractor-of-record enquiry was held out of the
// vault.
//
// The verdict never blocks. It informs, and the operator files anyway if the
// operator is right.

import { accountMatches } from "./ai-clean";
import { routeCapture, type RouteAccount, type RouteHit } from "@/lib/route-capture";

export type MisfileVerdict =
  | { ok: true }
  | {
      ok: false;
      /** What the capture reads like — a company name or a named person. */
      claim: string;
      /** The row it was dropped on. */
      bound: string;
      /** Which rung objected, in the operator's words. */
      why: string;
      /** What the row the operator chose carries for itself — "" when it
       *  carries nothing. The banner shows both sides or the operator is
       *  reading a verdict instead of making a choice. */
      boundWhy: string;
    };

/** A bound account carrying this much of its own evidence is never disputed
 *  by the other rung — the operator dropped it somewhere the text supports. */
const OWN_EVIDENCE_FLOOR = 55;

export function judgeFiling(inp: {
  /** The capture's text, as filed. */
  text: string;
  /** The company the read says this is about ("" when it named none). */
  claim: string;
  /** The row it is being filed to. */
  bound: { id: string; name: string };
  /** Every account the book knows, with its routing signals. */
  roster: readonly RouteAccount[];
}): MisfileVerdict {
  const bound = inp.bound;
  const claim = (inp.claim ?? "").trim();

  // The evidence the text carries, read once and used by both rungs.
  const { candidates } = routeCapture(inp.text ?? "", [...inp.roster]);
  const ownScore = candidates.find((c) => c.id === bound.id)?.score ?? 0;

  // The guard rule, ahead of both rungs: a row carrying its own evidence is
  // not disputed. The operator dropped it somewhere the text supports, and
  // whatever other company the read named is the client being discussed.
  //
  // Clearing the floor is not enough on its own — the floor is the weakest
  // tier there is (a head word appearing anywhere in the text). A Simploy
  // email carrying csmith@simploy.com scores Simploy 100; if it happens to say
  // the word "Regis" and is dropped on Regis, Regis scores 55 on that word
  // alone. Letting that through silently files a Simploy thread to Regis —
  // the exact misfile this guard was built for. So the row must also be the
  // strongest signal in the text, not merely a present one.
  // Taken as a max rather than off the front of the list: candidates arrives
  // sorted, but reading a rule's correctness off someone else's sort order is
  // how it breaks quietly later.
  const rivalScore = candidates.reduce(
    (m, c) => (c.id === bound.id ? m : Math.max(m, c.score)),
    0,
  );
  // Strictly outranks, not ties. The router already holds this position on the
  // same evidence: it refuses to auto-route unless the top score beats the
  // second by AUTO_ROUTE_GAP, so a tie is ambiguous there and it hands the
  // capture to the picker. A thread carrying both accounts' domains is exactly
  // that — and blessing whichever row happened to be open would file a
  // cross-account thread silently. The guard informs and never blocks, so
  // asking costs a click and the banner now shows both sides.
  if (ownScore >= OWN_EVIDENCE_FLOOR && ownScore > rivalScore) return { ok: true };

  // Rung 1 — the read's own company claim, now only when the row has nothing
  // of its own to stand on.
  //
  // Note on what this rung is NOT: the read is asked for "the prospect/client
  // company this paste is ABOUT" (ai-clean), so on a channel sale it answers
  // with the PEO's client — a company the book will never hold. Narrowing this
  // rung to claims that resolve to a real account was tried on 2026-09-11 and
  // backed out: it silently retires "a disagreeing company claim disputes on
  // its own", and a capture naming another company on a row with NO evidence
  // of its own is exactly the drop worth asking about. The own-evidence gate
  // above is what keeps the ordinary two-tier case quiet.
  if (claim && !accountMatches(claim, bound.name))
    return {
      ok: false,
      claim,
      bound: bound.name,
      why: `the read names ${claim}`,
      boundWhy: candidates.find((c) => c.id === bound.id)?.why ?? "",
    };

  // Rung 2 — the evidence the text carries. Silence from the model is not
  // consent; it is simply silence, and the record speaks for itself.
  const elsewhere: RouteHit | undefined = candidates.find(
    (c) => c.id !== bound.id && c.score >= OWN_EVIDENCE_FLOOR,
  );
  if (elsewhere)
    return {
      ok: false,
      claim: elsewhere.name,
      bound: bound.name,
      why: elsewhere.why,
      boundWhy: candidates.find((c) => c.id === bound.id)?.why ?? "",
    };

  return { ok: true };
}
