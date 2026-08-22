// Phase 8 · DECOMPOSE — depth without over-splitting.
//
// A topic opens into its children to whatever depth the material genuinely
// supports, and refuses when it doesn't. The bias is toward KEEP: thirty
// near-identical leaves in the rail is a worse outcome than one topic that is
// slightly too broad, because the first makes the index useless and the second
// only makes it coarse.

import Anthropic from "@anthropic-ai/sdk";
import { claudeClient, claudeAvailable } from "@/lib/claude/health";
import {
  MODEL_TOPIC,
  TOPIC_CHILD_MAX,
  TOPIC_CHILD_MIN,
  TOPIC_SPLIT_AT,
} from "./doctrine";
import type { Claim, Topic } from "./types";

export type SplitProposal = {
  verdict: "split" | "keep";
  why: string;
  children: { label: string; summary: string; claimIds: string[] }[];
};

export const KEEP: SplitProposal = { verdict: "keep", why: "", children: [] };

/** Consideration is not splitting. A topic only reaches the model when it has
 *  grown past the threshold and has no children yet. */
export function shouldConsiderSplit(topic: Topic, childCount: number): boolean {
  return (
    topic.status === "live" && childCount === 0 && topic.claimCount >= TOPIC_SPLIT_AT
  );
}

const SYSTEM = `You decide whether a topic in an index should be split into sub-topics.

DEFAULT TO KEEP. A split is only right when the claims fall into groups that a person would NAME DIFFERENTLY and LOOK FOR SEPARATELY. Two groups that differ only in wording are not a split. A topic that is merely large is not a split.

If you do split:
- between 2 and ${TOPIC_CHILD_MAX} children, never more
- every child needs at least ${TOPIC_CHILD_MIN} claims; a smaller group stays with the parent
- every claim id you were given must appear in exactly one child, OR be left out entirely to stay with the parent
- child labels are short and concrete, the way someone would search for them

Explain your verdict in one sentence either way.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "why", "children"],
  properties: {
    verdict: { type: "string", enum: ["split", "keep"] },
    why: { type: "string" },
    children: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "summary", "claimIds"],
        properties: {
          label: { type: "string" },
          summary: { type: "string" },
          claimIds: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

/** Coerce and enforce the shape rules. The model is told them; this is what
 *  makes them true (F5). */
export function sanitizeSplit(raw: unknown, validIds: Set<string>): SplitProposal {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (r.verdict !== "split") return { ...KEEP, why: String(r.why ?? "").slice(0, 240) };

  const seen = new Set<string>();
  const children = (Array.isArray(r.children) ? r.children : [])
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      const claimIds = (Array.isArray(o.claimIds) ? o.claimIds : [])
        .map((x) => (typeof x === "string" ? x : ""))
        // A claim can only land in one child, and only if it was ours to move.
        .filter((id) => id && validIds.has(id) && !seen.has(id))
        .map((id) => {
          seen.add(id);
          return id;
        });
      return {
        label: String(o.label ?? "")
          .trim()
          .slice(0, 80),
        summary: String(o.summary ?? "")
          .trim()
          .slice(0, 240),
        claimIds,
      };
    })
    .filter((c) => c.label && c.claimIds.length >= TOPIC_CHILD_MIN)
    .slice(0, TOPIC_CHILD_MAX);

  // One child is not a split; it is a rename with extra steps.
  if (children.length < 2) return { ...KEEP, why: "the material did not separate" };
  return { verdict: "split", why: String(r.why ?? "").slice(0, 240), children };
}

export async function runSplit(topic: Topic, claims: Claim[]): Promise<SplitProposal> {
  if (!claudeAvailable()) return KEEP;
  const client = claudeClient({ timeout: 90_000, maxRetries: 1 });

  // Claims go in as text + kind + date only. Full documents would blow the
  // context and add nothing to a question about how claims group.
  const list = claims
    .map((c) => `${c.id} · [${c.kind}] ${c.text} (${c.saidAt.slice(0, 10)})`)
    .join("\n");

  const res = await client.messages.create({
    model: MODEL_TOPIC,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: {
      format: {
        type: "json_schema",
        schema: SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [
      {
        role: "user",
        content: `TOPIC: ${topic.label}\n${topic.summary}\n\nCLAIMS (${claims.length})\n${list}`,
      },
    ],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  try {
    return sanitizeSplit(JSON.parse(text), new Set(claims.map((c) => c.id)));
  } catch {
    return KEEP;
  }
}

/** Undoing a split: children's claims return to the parent and the children are
 *  marked merged-into-parent, never deleted (C6). Available from the rail,
 *  because the model will occasionally be wrong and the operator should not have
 *  to live with it. */
export function unsplitPlan(
  parent: Topic,
  children: Topic[],
): { childIds: string[]; mergedInto: string } {
  return { childIds: children.map((c) => c.id), mergedInto: parent.id };
}
