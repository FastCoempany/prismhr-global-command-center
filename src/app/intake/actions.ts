"use server";

// Intake actions — file parsed Salesforce timeline entries onto an account as
// dated notes. The app only ever RECEIVES here; nothing talks back to SF.

import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { dealIntelFor } from "@/lib/intel/extract";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import { COUNTRY_NAME, redactMoney } from "@/lib/intel/lexicon";
import { loadAccountNotes, loadTodos, loadTouches } from "@/lib/today/overlay";
import { cleanSfPaste, type TimelineEntry } from "@/lib/sf-timeline";

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

const GLYPH: Record<TimelineEntry["kind"], string> = {
  email: "✉",
  task: "✔",
  call: "☎",
};

// One entry → one account note, stamped with the activity's own date so the
// note reads right even though createdAt is "when filed".
function noteBody(e: TimelineEntry): string {
  const when = [e.dayLabel, e.timeLabel].filter(Boolean).join(" ");
  const who = `${e.from} → ${e.to}${e.others ? ` +${e.others}` : ""}`;
  const head = `${GLYPH[e.kind] ?? "✉"} SF ${when || "activity"} — ${
    e.subject || "(no subject)"
  } · ${who}`;
  return (e.body ? `${head}\n${e.body}` : head).slice(0, 2000);
}

export async function fileTimeline(
  accountId: string,
  entries: TimelineEntry[],
): Promise<{ ok: boolean; filed: number }> {
  const id = (accountId ?? "").trim().slice(0, 40);
  if (!(await requireWrite()) || !id || !Array.isArray(entries))
    return { ok: false, filed: 0 };
  const batch = entries.slice(0, 50);
  let filed = 0;
  try {
    const prisma = getPrisma();
    for (const e of batch) {
      if (!e || typeof e !== "object") continue;
      await prisma.accountNote.create({
        data: { accountId: id, partner: "", kind: "account", body: noteBody(e) },
      });
      filed++;
    }
    revalidatePath("/accounts");
    revalidatePath("/today");
    return { ok: true, filed };
  } catch {
    return { ok: filed > 0, filed };
  }
}

// --- Payroll intake form prefills ------------------------------------------
// One value-returning action: derive the account's DealIntel and shape it as
// the 14 answers the MS Form asks for. Money never leaves redactMoney.

export type PayrollPrefill = {
  provider: string;
  billing: string; // exact option text or ""
  smb: string;
  platform: string; // "PrismHR" | ""
  country: string;
  employees: string;
  visa: string;
  compensation: string[];
  frequency: string;
  currentSystem: string;
  functionality: string[];
  gbc: string;
  misc: string;
};

// Countries where a monthly payroll cycle dominates — drives the frequency
// prefill only, never a hard answer.
const MONTHLY = new Set([
  "bg",
  "in",
  "ph",
  "za",
  "gb",
  "es",
  "de",
  "fr",
  "it",
  "nl",
  "pl",
  "ro",
  "pt",
  "br",
  "co",
  "ar",
  "cl",
  "pe",
  "mx",
  "cn",
  "jp",
  "sg",
  "hk",
]);

const BILLING_RESALE = "Reseller- Wholesale pricing for Service Provider to Resell";
const BILLING_REFERRAL = "Referral- List Price and we will be selling direct";

export async function getDealIntel(accountId: string): Promise<PayrollPrefill | null> {
  const access = await getAppAccess();
  if (access.status !== "active") return null;
  const id = (accountId ?? "").trim().slice(0, 40);
  const peo = peos.find((p) => p.id === id);
  if (!peo) return null;

  const [acctNotes, todos, touches] = await Promise.all([
    loadAccountNotes(),
    loadTodos(),
    loadTouches(),
  ]);
  const intel = dealIntelFor(id, peo.name, {
    acctNotes: acctNotes.get(id),
    todos: todos.filter((t) => t.accountId === id),
    touches: touches.filter((t) => t.subjectKey === `acct:${id}`),
  });
  const dig = digestFor(id) ?? digestForCardName(peo.name);

  // SMB name: a "— <SMB>" suffix on a digest alias (the dashboard card name).
  const smbAlias = dig?.names.find((n) => n.includes(" — "));
  const smb = smbAlias ? smbAlias.split(" — ").slice(1).join(" — ").trim() : "unknown";

  const countryNames = intel.countries.map((c) => COUNTRY_NAME[c.value] ?? c.value);
  const employees = intel.headcounts
    .map(
      (h) =>
        `~${h.value.n}${h.value.country ? ` ${COUNTRY_NAME[h.value.country] ?? h.value.country}` : ""}`,
    )
    .join("; ");

  const sysParts: string[] = [];
  const wirey = (dig?.facts ?? []).some((f) => /wire/i.test(f));
  if (wirey) sysParts.push("individual intl wires");
  if (intel.incumbent) sysParts.push(`considered ${intel.incumbent.value}`);

  const functionality: string[] = [];
  if (intel.products.some((p) => p.value === "tlm")) functionality.push("Time and Labor");
  if (intel.products.some((p) => p.value === "wallet"))
    functionality.push("Expense Mgmt");

  return {
    provider: peo.name,
    billing:
      intel.chair === "resale"
        ? BILLING_RESALE
        : intel.chair === "referral"
          ? BILLING_REFERRAL
          : "",
    smb,
    platform: peo.cloud ? "PrismHR" : "",
    country: countryNames.join(", "),
    employees,
    visa: "None noted",
    compensation: [],
    frequency: intel.countries.some((c) => MONTHLY.has(c.value)) ? "Monthly" : "",
    currentSystem: sysParts.join("; "),
    functionality,
    gbc: "Antaeus Coe",
    misc: (dig?.facts ?? []).slice(0, 3).map(redactMoney).join("\n"),
  };
}

// --- Transcript filing ------------------------------------------------------
// Meeting notes / call transcripts file as ONE ☰ note on the account —
// money-redacted, capped, dated by createdAt.
export async function fileTranscript(
  accountId: string,
  text: string,
): Promise<{ ok: boolean }> {
  const id = (accountId ?? "").trim().slice(0, 40);
  const body = redactMoney(cleanSfPaste(text ?? "")).slice(0, 6000);
  if (!(await requireWrite()) || !id || !body) return { ok: false };
  try {
    await getPrisma().accountNote.create({
      data: {
        accountId: id,
        partner: "",
        kind: "account",
        body: `☰ transcript — filed from Intake\n${body}`,
      },
    });
    revalidatePath("/accounts");
    revalidatePath("/today");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
