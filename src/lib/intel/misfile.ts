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
// One guard rule keeps this from crying wolf: evidence only objects when the
// bound account has NO signal of its own. A Regis thread that mentions
// "Chassie at Simploy" in passing still carries Regis's own people and
// domain, so it files without a word. A capture that names only Simploy's
// people, dropped on Regis, is the one that asks.
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

  // Rung 1 — the read's own company claim. Unchanged behavior: a claim that
  // disagrees with the row has always stopped the filing.
  if (claim && !accountMatches(claim, bound.name))
    return {
      ok: false,
      claim,
      bound: bound.name,
      why: `the read names ${claim}`,
    };

  // Rung 2 — the evidence the text carries. Silence from the model is not
  // consent; it is simply silence, and the record speaks for itself.
  const { candidates } = routeCapture(inp.text ?? "", [...inp.roster]);
  const ownScore = candidates.find((c) => c.id === bound.id)?.score ?? 0;
  if (ownScore >= OWN_EVIDENCE_FLOOR) return { ok: true };

  const elsewhere: RouteHit | undefined = candidates.find(
    (c) => c.id !== bound.id && c.score >= OWN_EVIDENCE_FLOOR,
  );
  if (elsewhere)
    return {
      ok: false,
      claim: elsewhere.name,
      bound: bound.name,
      why: elsewhere.why,
    };

  return { ok: true };
}
