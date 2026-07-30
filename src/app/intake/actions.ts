"use server";

// Capture actions — the payroll intake form's prefill, derived from the deal's
// own intel. Filing a paste moved to the account's ⚡ box in the HomeRoom; the
// app only ever RECEIVES, and nothing here talks back to Salesforce or Forms.

import { getAppAccess } from "@/lib/auth";
import { peos } from "@/lib/book";
import { dealIntelFor } from "@/lib/intel/extract";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import { COUNTRY_NAME, redactMoney } from "@/lib/intel/lexicon";
import { loadAccountNotes, loadTodos, loadTouches } from "@/lib/today/overlay";

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
    touches: touches.filter(
      (t) => t.subjectKey === `outreach:${id}` || t.subjectKey === `acct:${id}`,
    ),
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
