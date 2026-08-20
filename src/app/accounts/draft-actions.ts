"use server";

// The draft desk (founder-decreed 2026-08-20): every contact carries a ✎ —
// step one drafts here with the brain's help against the account's own
// record; step two hands the finished text to Outlook with the addresses
// already on it. Nothing files anywhere from this desk — the Chute keeps
// its job when the sent mail comes back as an .eml.

import Anthropic from "@anthropic-ai/sdk";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { getPeo } from "@/lib/book";
import { redactMoney } from "@/lib/intel/lexicon";

const SYSTEM = `You draft outreach email for Antaeus Coe, Sr. Global Business Consultant at PrismHR Global. He sells global payroll, EOR, and contractor management to PEOs that already run on PrismHR software.

Voice, binding:
- Plain sentences a peer would say out loud. Short paragraphs. No hedging ("it may be worth", "you might want to consider"), no em-dash asides, no corporate filler.
- A PEO's clients ARE its book. A need is either "internal" (the PEO's own) or "a client's" — never contrast "their client" with "their own book". Never write "X-shaped" or "domestic-only".
- Never invent facts, names, dates, or prices. Money figures never appear. Use only what the context below states; where the record is silent, stay silent.
- One clear ask per email. Signature is just "Antaeus" — the mail client carries the block.

Return ONLY a JSON object: {"subject": "...", "body": "..."} — body is plain text with blank lines between paragraphs, no markdown.`;

export async function draftOutreach(
  accountId: string,
  toNames: string[],
  instruction: string,
  current: string,
): Promise<{ ok: boolean; subject?: string; body?: string; reason?: string }> {
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite)
    return { ok: false, reason: "Read-only session." };
  if (!process.env.ANTHROPIC_API_KEY)
    return { ok: false, reason: "No API key configured — drafting is off." };
  const peo = getPeo((accountId ?? "").slice(0, 40));
  if (!peo) return { ok: false, reason: "Not a book account." };
  const ask = redactMoney((instruction ?? "").trim()).slice(0, 600);
  const draft = redactMoney((current ?? "").trim()).slice(0, 4000);
  if (!ask && !draft) return { ok: false, reason: "Say what the email should do." };

  // The account's recent record, heads only — the draft grounds in what
  // actually happened, money redacted like everywhere else.
  let recent = "";
  if (hasDatabaseEnv()) {
    try {
      const notes = await getPrisma().accountNote.findMany({
        where: { accountId: peo.id },
        select: { body: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
      recent = notes
        .map(
          (n) =>
            `- ${n.createdAt.toISOString().slice(0, 10)}: ${redactMoney(
              n.body.split("\n")[0],
            ).slice(0, 180)}`,
        )
        .join("\n");
    } catch {
      recent = "";
    }
  }

  const user = `ACCOUNT: ${peo.name} (a PEO on PrismHR software). Recipients: ${toNames
    .filter(Boolean)
    .slice(0, 6)
    .join(", ")}.

RECENT RECORD (newest first):
${recent || "(nothing filed yet — this is a first touch)"}

${draft ? `CURRENT DRAFT — revise it per the instruction, keep what works:\n${draft}\n\n` : ""}INSTRUCTION FROM ANTAEUS: ${ask || "Sharpen the current draft."}`;

  try {
    const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    } as Anthropic.MessageCreateParamsNonStreaming);
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const a = text.indexOf("{");
    const z = text.lastIndexOf("}");
    if (a < 0 || z <= a) return { ok: false, reason: "The draft didn't parse. Again?" };
    const parsed = JSON.parse(text.slice(a, z + 1)) as {
      subject?: string;
      body?: string;
    };
    const body = redactMoney((parsed.body ?? "").trim());
    if (!body) return { ok: false, reason: "The draft came back empty. Again?" };
    return {
      ok: true,
      subject: redactMoney((parsed.subject ?? "").trim()).slice(0, 140),
      body,
    };
  } catch {
    return { ok: false, reason: "The drafting call failed. Try again." };
  }
}

// ── Mail templates (founder-decreed 2026-08-20) ─────────────────────────────
// Named, reusable drafts. Stored as template:mail rows in the note table —
// app-wide, outside every account view by construction. {{first}}, {{last}},
// {{name}} and {{account}} fill in when a template is applied.

const TEMPLATE_NS = "template:mail";

export type MailTemplate = { id: string; name: string; subject: string; body: string };

export async function listMailTemplates(): Promise<MailTemplate[]> {
  const access = await getAppAccess();
  if (access.status !== "active" || !hasDatabaseEnv()) return [];
  try {
    const rows = await getPrisma().accountNote.findMany({
      where: { accountId: TEMPLATE_NS },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, body: true },
    });
    return rows
      .map((r) => {
        try {
          const t = JSON.parse(r.body) as Partial<MailTemplate>;
          return t?.name && typeof t.body === "string"
            ? {
                id: r.id,
                name: String(t.name).slice(0, 80),
                subject: String(t.subject ?? "").slice(0, 140),
                body: String(t.body).slice(0, 8000),
              }
            : null;
        } catch {
          return null;
        }
      })
      .filter((t): t is MailTemplate => t !== null);
  } catch {
    return [];
  }
}

export async function saveMailTemplate(
  name: string,
  subject: string,
  body: string,
): Promise<{ ok: boolean; id?: string; reason?: string }> {
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite || !hasDatabaseEnv())
    return { ok: false, reason: "Read-only session." };
  const n = redactMoney((name ?? "").trim()).slice(0, 80);
  const b = redactMoney((body ?? "").trim()).slice(0, 8000);
  if (!n) return { ok: false, reason: "Name it first." };
  if (!b) return { ok: false, reason: "An empty template saves nothing." };
  try {
    const row = await getPrisma().accountNote.create({
      data: {
        accountId: TEMPLATE_NS,
        kind: "account",
        lane: "background",
        actors: "",
        source: "mail-template",
        body: JSON.stringify({
          name: n,
          subject: redactMoney((subject ?? "").trim()).slice(0, 140),
          body: b,
        }),
      },
      select: { id: true },
    });
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, reason: "The template didn't save. Try again." };
  }
}

export async function deleteMailTemplate(
  id: string,
): Promise<{ ok: boolean; reason?: string }> {
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite || !hasDatabaseEnv())
    return { ok: false, reason: "Read-only session." };
  try {
    await getPrisma().accountNote.deleteMany({
      where: { id: (id ?? "").slice(0, 40), accountId: TEMPLATE_NS },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "The delete didn't take." };
  }
}
