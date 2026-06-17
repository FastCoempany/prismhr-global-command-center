import Link from "next/link";
import {
  EvidenceType,
  HmlValue,
  PermissionState,
  ProductRelevance,
  SourceConfidence,
} from "@/generated/prisma/client";
import { AppWayfinder } from "@/components/app-wayfinder";
import { FieldGlyph } from "@/components/field-glyph";
import { HmlPriorityPanel } from "@/components/hml-priority-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { signOut } from "@/app/auth/actions";
import { getAppAccess } from "@/lib/auth";
import { humanizeEnum as label } from "@/lib/format";
import { buildHmlSummaryFromAccounts, hmlTone } from "@/lib/hml-priority";
import {
  createSourceEvidence,
  createTerritoryAccount,
  updateTerritoryAccountPosture,
} from "./actions";
import {
  buildProspectFieldPath,
  getProspectFieldData,
  parseProspectFieldFilters,
} from "./data";

export const dynamic = "force-dynamic";

const productOptions = Object.values(ProductRelevance);
const confidenceOptions = Object.values(SourceConfidence);
const permissionOptions = [
  PermissionState.RESEARCH_ONLY,
  PermissionState.CSM_CONTEXT_NEEDED,
  PermissionState.OWNERSHIP_UNCLEAR_REQUIRES_VERIFICATION,
  PermissionState.DIRECT_CONTACT_NOT_ALLOWED,
  PermissionState.HOLD_SENSITIVE,
  PermissionState.OFF_LIMITS,
];
const signalIntensityOptions = Object.values(HmlValue);
const evidenceOptions = Object.values(EvidenceType);
const sortOptions = [
  ["updated", "Recently updated"],
  ["priority", "Priority score"],
  ["freshness", "Source freshness"],
  ["source", "Source confidence"],
  ["company", "Company name"],
];
const freshnessOptions = [
  ["fresh", "Fresh source"],
  ["stale", "Stale source"],
  ["missing", "Evidence missing"],
];

function confidenceTone(value: SourceConfidence) {
  if (value === SourceConfidence.CONFIRMED || value === SourceConfidence.STRONG) {
    return "low";
  }
  if (value === SourceConfidence.MEDIUM || value === SourceConfidence.INFERRED) {
    return "medium";
  }
  return "unknown";
}

function permissionTone(value: PermissionState) {
  if (
    value === PermissionState.OFF_LIMITS ||
    value === PermissionState.HOLD_SENSITIVE ||
    value === PermissionState.DIRECT_CONTACT_NOT_ALLOWED
  ) {
    return "high";
  }
  if (
    value === PermissionState.CSM_CONTEXT_NEEDED ||
    value === PermissionState.OWNERSHIP_UNCLEAR_REQUIRES_VERIFICATION
  ) {
    return "medium";
  }
  return "unknown";
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function sourceFreshness(evidence: { staleAfter: Date | null } | null | undefined): {
  label: string;
  tone: "high" | "low" | "medium" | "unknown";
} {
  if (!evidence) {
    return {
      label: "Evidence missing",
      tone: "high",
    };
  }

  if (evidence.staleAfter && evidence.staleAfter.getTime() <= Date.now()) {
    return {
      label: "Stale source",
      tone: "medium",
    };
  }

  return {
    label: "Fresh source",
    tone: "low",
  };
}

type ProspectFieldPageProps = {
  searchParams?: Promise<{
    accountId?: string;
    confidence?: string;
    created?: string;
    evidenceAdded?: string;
    freshness?: string;
    formError?: string;
    hml?: string;
    permission?: string;
    q?: string;
    sort?: string;
    updated?: string;
  }>;
};

export default async function ProspectFieldPage({
  searchParams,
}: ProspectFieldPageProps) {
  const params = searchParams ? await searchParams : {};
  const access = await getAppAccess();

  if (access.status !== "active") {
    return (
      <main className="min-h-screen bg-[color:var(--color-canvas)] p-5 text-[color:var(--color-ink)]">
        <section className="mx-auto grid min-h-[calc(100vh-40px)] max-w-3xl content-center gap-5">
          <div className="rounded-lg border border-[color:var(--color-medium-border)] bg-[color:var(--color-medium-bg)] p-5">
            <p className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
              Access pending
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-8">
              Prospect Field is protected.
            </h1>
            <p className="mt-3 text-sm font-semibold leading-5 text-[color:var(--color-ink-soft)]">
              {access.message}
            </p>
            {access.authEmail ? (
              <p className="mt-2 text-sm font-semibold leading-5">
                Signed in as {access.authEmail}
              </p>
            ) : null}
            <form action={signOut} className="mt-4">
              <Button type="submit" variant="quiet">
                Sign out
              </Button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  const filters = parseProspectFieldFilters(params);
  const {
    accountLimit,
    accounts,
    databaseReady,
    error,
    selectedAccount,
    totalAccounts,
    unknowns,
  } = await getProspectFieldData(filters);
  const hmlSummary = buildHmlSummaryFromAccounts(accounts);
  const topAccount = accounts[0];
  const nextSafestAction =
    topAccount?.nextSafestAction ?? "Add a sourced prospect before action.";
  const permissionPosture = topAccount?.permissionState ?? PermissionState.RESEARCH_ONLY;
  const sourceConfidence = topAccount?.sourceConfidence ?? SourceConfidence.UNVERIFIED;
  const selectedPath = buildProspectFieldPath(
    filters,
    selectedAccount
      ? {
          accountId: selectedAccount.id,
        }
      : {},
  );
  const selectedHml = selectedAccount?.hmlClassifications[0];
  const selectedFreshness = sourceFreshness(selectedAccount?.evidence[0]);

  return (
    <main className="app-shell">
      <AppWayfinder
        current="Prospect Field"
        onSignOut={
          <form action={signOut}>
            <Button size="compact" type="submit" variant="quiet">
              Sign out
            </Button>
          </form>
        }
      />

      <section className="work-surface">
        <section className="prospect-brief" aria-label="Prospecting desk posture">
          <section className="prospect-brief__main">
            <p className="eyebrow">Prospecting Desk</p>
            <h1>Build the Chicagoland account list without breaking the trust path.</h1>
            <p className="prospect-brief__lede">
              Chicagoland prospecting is central. Every account needs evidence, source
              confidence, permission posture, HML priority, and a safe next move before
              action.
            </p>
            <div className="prospect-brief__action">
              <span>Next safest action</span>
              <strong>{nextSafestAction}</strong>
              <p>
                {topAccount
                  ? `${topAccount.companyName} is the current working account.`
                  : "Start by adding a sourced prospect with a clear qualification signal."}
              </p>
            </div>
            <p className="text-xs font-semibold leading-4 text-[color:var(--ds-ink-700)]">
              Signed in as {access.appUser.email} / {label(access.appUser.role)}
            </p>
          </section>

          <aside className="prospect-brief__trust-stack">
            <div className="prospect-brief__trust-card">
              <span>Territory</span>
              <strong>Chicagoland</strong>
            </div>
            <div className="prospect-brief__trust-card">
              <span>Permission posture</span>
              <Badge tone={permissionTone(permissionPosture)}>
                {label(permissionPosture)}
              </Badge>
            </div>
            <div className="prospect-brief__trust-card">
              <span>Source confidence</span>
              <Badge tone={confidenceTone(sourceConfidence)}>
                {label(sourceConfidence)}
              </Badge>
            </div>
            <div className="prospect-brief__trust-card">
              <span>Records</span>
              <strong>
                {databaseReady
                  ? `${totalAccounts} prospect${totalAccounts === 1 ? "" : "s"}`
                  : "Records unavailable"}
              </strong>
            </div>
          </aside>

          <section className="prospect-brief__path-panel">
            <div className="prospect-brief__path-node">
              <FieldGlyph accent="blue" name="prospect" size={22} />
              <span>Prospect</span>
            </div>
            <div className="prospect-brief__path-line" />
            <div className="prospect-brief__path-node">
              <FieldGlyph accent="orange" name="evidence" size={22} />
              <span>Source evidence</span>
            </div>
            <div className="prospect-brief__path-line" />
            <div className="prospect-brief__path-node">
              <FieldGlyph accent="amber" name="permission" size={22} />
              <span>Permission</span>
            </div>
            <div className="prospect-brief__path-line" />
            <div className="prospect-brief__path-node">
              <FieldGlyph accent="green" name="trust" size={22} />
              <span>CSM-safe move</span>
            </div>
          </section>
        </section>

        <HmlPriorityPanel compact summary={hmlSummary} />

        <form action="/prospect-field" className="prospect-controls">
          <Field label="Find account" name="q">
            <Input
              id="q"
              name="q"
              placeholder="Company, city, category"
              type="search"
              defaultValue={filters.q ?? ""}
            />
          </Field>
          <Field label="HML priority" name="hml">
            <Select id="hml" name="hml" defaultValue={filters.hml ?? ""}>
              <option value="">All priorities</option>
              {signalIntensityOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Permission" name="permission">
            <Select
              id="permission"
              name="permission"
              defaultValue={filters.permission ?? ""}
            >
              <option value="">All permissions</option>
              {permissionOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Confidence" name="confidence">
            <Select
              id="confidence"
              name="confidence"
              defaultValue={filters.confidence ?? ""}
            >
              <option value="">All confidence</option>
              {confidenceOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Source freshness" name="freshness">
            <Select
              id="freshness"
              name="freshness"
              defaultValue={filters.freshness ?? ""}
            >
              <option value="">All sources</option>
              {freshnessOptions.map(([value, optionLabel]) => (
                <option key={value} value={value}>
                  {optionLabel}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort" name="sort">
            <Select id="sort" name="sort" defaultValue={filters.sort}>
              {sortOptions.map(([value, optionLabel]) => (
                <option key={value} value={value}>
                  {optionLabel}
                </option>
              ))}
            </Select>
          </Field>
          <div className="prospect-controls__actions">
            <Button type="submit">Apply</Button>
            <Link className="ds-btn ds-btn--secondary" href="/prospect-field">
              Reset
            </Link>
          </div>
        </form>

        {!databaseReady ? (
          <section className="mb-5 rounded-lg border border-[color:var(--color-medium-border)] bg-[color:var(--color-medium-bg)] p-4">
            <h2 className="text-base font-semibold leading-6">
              Prospect records are unavailable
            </h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[color:var(--color-ink-soft)]">
              {error}
            </p>
          </section>
        ) : null}

        {params.formError ? (
          <section className="mb-5 rounded-lg border border-[color:var(--color-high-border)] bg-[color:var(--color-high-bg)] p-4">
            <h2 className="text-base font-semibold leading-6">Prospect not saved</h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[color:var(--color-ink-soft)]">
              {params.formError}
            </p>
          </section>
        ) : null}

        {params.created ? (
          <section className="mb-5 rounded-lg border border-[color:var(--color-low-border)] bg-[color:var(--color-low-bg)] p-4">
            <h2 className="text-base font-semibold leading-6">Prospect saved</h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[color:var(--color-ink-soft)]">
              The prospect record is saved.
            </p>
          </section>
        ) : null}

        {params.updated ? (
          <section className="mb-5 rounded-lg border border-[color:var(--color-low-border)] bg-[color:var(--color-low-bg)] p-4">
            <h2 className="text-base font-semibold leading-6">Prospect updated</h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[color:var(--color-ink-soft)]">
              Permission, confidence, next action, and HML priority were refreshed.
            </p>
          </section>
        ) : null}

        {params.evidenceAdded ? (
          <section className="mb-5 rounded-lg border border-[color:var(--color-low-border)] bg-[color:var(--color-low-bg)] p-4">
            <h2 className="text-base font-semibold leading-6">Evidence added</h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[color:var(--color-ink-soft)]">
              The selected prospect now has an additional source record.
            </p>
          </section>
        ) : null}

        <div className="prospect-grid">
          <section className="overflow-hidden rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
            <div className="section-heading">
              <p className="eyebrow">Prospecting Desk</p>
              <h2 className="ds-heading--title">Accounts under research</h2>
              <p className="mt-2 text-sm font-semibold leading-5 text-[color:var(--ds-ink-700)]">
                This is the primary work surface. The list exists to decide what is worth
                researching, what is unsafe, and what needs a better source.
              </p>
              <p className="mt-2 text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
                Showing {accounts.length} of {totalAccounts} account
                {totalAccounts === 1 ? "" : "s"}; newest first. Limit {accountLimit}.
              </p>
            </div>

            {accounts.length === 0 ? (
              <div className="p-4 text-sm font-semibold leading-5 text-[color:var(--color-ink-soft)]">
                Add a Chicagoland prospect and record the first qualification signal.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                  <thead className="bg-[color:var(--color-surface-mist)]">
                    <tr>
                      <th className="px-4 py-3 font-bold">Company</th>
                      <th className="px-4 py-3 font-bold">Qualification Signals</th>
                      <th className="px-4 py-3 font-bold">Permission</th>
                      <th className="px-4 py-3 font-bold">Source Confidence</th>
                      <th className="px-4 py-3 font-bold">HML Priority</th>
                      <th className="px-4 py-3 font-bold">Next Safest Action</th>
                      <th className="px-4 py-3 font-bold">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => {
                      const latestHml = account.hmlClassifications[0];
                      const latestEvidence = account.evidence[0];
                      const freshness = sourceFreshness(latestEvidence);
                      const accountPath = buildProspectFieldPath(filters, {
                        accountId: account.id,
                      });
                      const qualificationSignals = [
                        ["International", account.internationalSignal],
                        ["Contractor", account.contractorSignal],
                        ["Hiring", account.hiringSignal],
                        ["Complexity", account.complexitySignal],
                        ["Channel", account.channelSignal],
                        ["Boundary", account.boundaryRisk],
                      ];
                      return (
                        <tr
                          className={`border-t border-[color:var(--color-line)] align-top ${
                            selectedAccount?.id === account.id
                              ? "account-row-selected"
                              : ""
                          }`}
                          id={`account-${account.id}`}
                          key={account.id}
                        >
                          <td className="px-4 py-3">
                            <Link className="account-link" href={accountPath}>
                              {account.companyName}
                            </Link>
                            <div className="text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
                              {account.city}, {account.region}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-64 text-xs font-semibold leading-4 text-[color:var(--color-ink-soft)]">
                              {account.fitSummary}
                            </div>
                            <div className="mt-2 flex max-w-72 flex-wrap gap-1.5">
                              {qualificationSignals.map(([name, value]) => (
                                <Badge
                                  className="rounded-md"
                                  key={name}
                                  tone={hmlTone(value as HmlValue)}
                                >
                                  {name}: {label(value)}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={permissionTone(account.permissionState)}>
                              {label(account.permissionState)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="grid gap-2 justify-items-start">
                              <Badge tone={confidenceTone(account.sourceConfidence)}>
                                {label(account.sourceConfidence)}
                              </Badge>
                              <Badge tone={freshness.tone}>{freshness.label}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              tone={
                                latestHml ? hmlTone(latestHml.classification) : "unknown"
                              }
                            >
                              {latestHml ? label(latestHml.classification) : "Unscored"}
                            </Badge>
                            {latestHml ? (
                              <div className="mt-2 max-w-64 text-xs font-semibold leading-4 text-[color:var(--color-ink-soft)]">
                                {latestHml.explanation}
                              </div>
                            ) : null}
                          </td>
                          <td className="max-w-72 px-4 py-3 font-semibold leading-5">
                            {account.nextSafestAction}
                          </td>
                          <td className="max-w-72 px-4 py-3">
                            {latestEvidence ? (
                              <div>
                                <div className="font-semibold">
                                  {latestEvidence.title}
                                </div>
                                <div className="mt-1 text-xs font-semibold leading-4 text-[color:var(--color-ink-soft)]">
                                  {latestEvidence.capturedClaim}
                                </div>
                              </div>
                            ) : (
                              <Badge tone="high">Evidence needed</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="grid content-start gap-5">
            <section className="selected-account-panel">
              <p className="eyebrow">Selected prospect</p>
              {selectedAccount ? (
                <div className="grid gap-5">
                  <div className="selected-account-summary">
                    <div>
                      <h2>{selectedAccount.companyName}</h2>
                      <p>
                        {selectedAccount.city}, {selectedAccount.region}
                        {selectedAccount.category ? ` / ${selectedAccount.category}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={permissionTone(selectedAccount.permissionState)}>
                        {label(selectedAccount.permissionState)}
                      </Badge>
                      <Badge tone={confidenceTone(selectedAccount.sourceConfidence)}>
                        {label(selectedAccount.sourceConfidence)}
                      </Badge>
                      <Badge tone={selectedFreshness.tone}>
                        {selectedFreshness.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="selected-account-metrics">
                    <div>
                      <span>Product relevance</span>
                      <strong>
                        {selectedAccount.productRelevance.length > 0
                          ? selectedAccount.productRelevance.map(label).join(", ")
                          : "Not recorded"}
                      </strong>
                    </div>
                    <div>
                      <span>Last reviewed</span>
                      <strong>{formatDate(selectedAccount.lastReviewedAt)}</strong>
                    </div>
                    <div>
                      <span>HML priority</span>
                      <strong>
                        {selectedHml ? label(selectedHml.classification) : "Unscored"}
                      </strong>
                    </div>
                  </div>

                  {selectedHml ? (
                    <div className="selected-account-note">
                      <span>Signal explanation</span>
                      <p>{selectedHml.explanation}</p>
                    </div>
                  ) : null}

                  <form action={updateTerritoryAccountPosture} className="grid gap-4">
                    <input name="accountId" type="hidden" value={selectedAccount.id} />
                    <input name="returnTo" type="hidden" value={selectedPath} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        htmlFor="permissionStateSelected"
                        label="Permission"
                        name="permissionState"
                        required
                      >
                        <Select
                          id="permissionStateSelected"
                          name="permissionState"
                          defaultValue={selectedAccount.permissionState}
                        >
                          {permissionOptions.map((option) => (
                            <option key={option} value={option}>
                              {label(option)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        htmlFor="sourceConfidenceSelected"
                        label="Source confidence"
                        name="sourceConfidence"
                        required
                      >
                        <Select
                          id="sourceConfidenceSelected"
                          name="sourceConfidence"
                          defaultValue={selectedAccount.sourceConfidence}
                        >
                          {confidenceOptions.map((option) => (
                            <option key={option} value={option}>
                              {label(option)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <Field
                      htmlFor="fitSummarySelected"
                      label="Qualification summary"
                      name="fitSummary"
                      required
                    >
                      <Textarea
                        id="fitSummarySelected"
                        name="fitSummary"
                        required
                        defaultValue={selectedAccount.fitSummary}
                      />
                    </Field>
                    <Field
                      htmlFor="nextSafestActionSelected"
                      label="Next safest action"
                      name="nextSafestAction"
                      required
                    >
                      <Textarea
                        id="nextSafestActionSelected"
                        name="nextSafestAction"
                        required
                        defaultValue={selectedAccount.nextSafestAction}
                      />
                    </Field>
                    <Button disabled={!databaseReady || !access.canWrite} type="submit">
                      Update operating read
                    </Button>
                  </form>

                  <form action={createSourceEvidence} className="grid gap-3">
                    <input name="accountId" type="hidden" value={selectedAccount.id} />
                    <input name="returnTo" type="hidden" value={selectedPath} />
                    <h3 className="text-base font-semibold leading-6">
                      Add source evidence
                    </h3>
                    <Field
                      htmlFor="selectedEvidenceTitle"
                      label="Evidence title"
                      name="evidenceTitle"
                      required
                    >
                      <Input id="selectedEvidenceTitle" name="evidenceTitle" required />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        htmlFor="selectedEvidenceType"
                        label="Evidence type"
                        name="evidenceType"
                        required
                      >
                        <Select id="selectedEvidenceType" name="evidenceType">
                          {evidenceOptions.map((option) => (
                            <option key={option} value={option}>
                              {label(option)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        htmlFor="selectedEvidenceConfidence"
                        label="Evidence confidence"
                        name="evidenceConfidence"
                        required
                      >
                        <Select id="selectedEvidenceConfidence" name="evidenceConfidence">
                          {confidenceOptions.map((option) => (
                            <option key={option} value={option}>
                              {label(option)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <Field
                      htmlFor="selectedEvidenceUrl"
                      label="Evidence URL"
                      name="evidenceUrl"
                    >
                      <Input id="selectedEvidenceUrl" name="evidenceUrl" type="url" />
                    </Field>
                    <Field
                      htmlFor="selectedCapturedClaim"
                      label="Captured claim"
                      name="capturedClaim"
                      required
                    >
                      <Textarea
                        id="selectedCapturedClaim"
                        name="capturedClaim"
                        required
                        placeholder="Specific claim this source supports."
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        htmlFor="selectedSourceDate"
                        label="Source date"
                        name="sourceDate"
                      >
                        <Input id="selectedSourceDate" name="sourceDate" type="date" />
                      </Field>
                      <Field
                        htmlFor="selectedStaleAfter"
                        label="Stale after"
                        name="staleAfter"
                      >
                        <Input id="selectedStaleAfter" name="staleAfter" type="date" />
                      </Field>
                    </div>
                    <Button disabled={!databaseReady || !access.canWrite} type="submit">
                      Add evidence
                    </Button>
                  </form>

                  <div className="selected-account-list">
                    <h3>Recent evidence</h3>
                    {selectedAccount.evidence.length === 0 ? (
                      <p>No source evidence recorded.</p>
                    ) : (
                      selectedAccount.evidence.map((evidence) => (
                        <div key={evidence.id}>
                          <strong>
                            {evidence.url ? (
                              <a href={evidence.url} rel="noreferrer" target="_blank">
                                {evidence.title}
                              </a>
                            ) : (
                              evidence.title
                            )}
                          </strong>
                          <p>{evidence.capturedClaim}</p>
                          <span>
                            {label(evidence.type)} / {label(evidence.confidence)} / stale
                            after {formatDate(evidence.staleAfter)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="selected-account-list">
                    <h3>Permission history</h3>
                    {selectedAccount.permissionHistory.length === 0 ? (
                      <p>No permission history recorded.</p>
                    ) : (
                      selectedAccount.permissionHistory.map((event) => (
                        <div key={event.id}>
                          <strong>{label(event.state)}</strong>
                          <p>{event.reason}</p>
                          <span>
                            {formatDate(event.createdAt)} / {event.setBy ?? "Unknown"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedAccount.internalUnknowns.length > 0 ? (
                    <div className="selected-account-list">
                      <h3>Selected-account unknowns</h3>
                      {selectedAccount.internalUnknowns.map((unknown) => (
                        <div key={unknown.id}>
                          <strong>{unknown.question}</strong>
                          <p>
                            {label(unknown.category)} / {label(unknown.confidence)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold leading-5 text-[color:var(--ds-ink-700)]">
                  Select an account from the desk or add the first sourced prospect.
                </p>
              )}
            </section>

            <section className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
              <p className="eyebrow">Desk intake</p>
              <h2 className="mb-4 text-base font-semibold leading-6">
                Add sourced prospect
              </h2>
              <form action={createTerritoryAccount} className="grid gap-4">
                <input name="returnTo" type="hidden" value={selectedPath} />
                <Field label="Company" name="companyName" required>
                  <Input id="companyName" name="companyName" required />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="City" name="city">
                    <Input id="city" name="city" placeholder="Chicago" />
                  </Field>
                  <Field label="Website" name="website">
                    <Input id="website" name="website" type="url" />
                  </Field>
                </div>
                <Field label="Category" name="category">
                  <Input
                    id="category"
                    name="category"
                    placeholder="Example: manufacturing, tech, services"
                  />
                </Field>

                <fieldset className="grid gap-2">
                  <legend className="text-sm font-semibold leading-5">
                    Product relevance
                  </legend>
                  <div className="grid gap-2">
                    {productOptions.map((option) => (
                      <label
                        className="flex items-center gap-2 text-sm font-semibold leading-5"
                        key={option}
                      >
                        <input
                          className="h-4 w-4 accent-[color:var(--color-action-primary-border)]"
                          name="productRelevance"
                          type="checkbox"
                          value={option}
                        />
                        {label(option)}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Permission" name="permissionState" required>
                    <Select id="permissionState" name="permissionState">
                      {permissionOptions.map((option) => (
                        <option key={option} value={option}>
                          {label(option)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Source confidence" name="sourceConfidence" required>
                    <Select id="sourceConfidence" name="sourceConfidence">
                      {confidenceOptions.map((option) => (
                        <option key={option} value={option}>
                          {label(option)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <fieldset className="grid gap-2 sm:col-span-2">
                    <legend className="text-sm font-semibold leading-5">
                      Qualification signals
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ["internationalSignal", "International activity"],
                        ["contractorSignal", "Contractor intensity"],
                        ["hiringSignal", "Hiring signal"],
                        ["complexitySignal", "Complexity signal"],
                        ["channelSignal", "Channel path"],
                        ["boundaryRisk", "Boundary risk"],
                      ].map(([name, fieldLabel]) => (
                        <Field key={name} label={fieldLabel} name={name} required>
                          <Select id={name} name={name}>
                            {signalIntensityOptions.map((option) => (
                              <option key={option} value={option}>
                                {label(option)}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <Field label="Qualification summary" name="fitSummary" required>
                  <Textarea
                    id="fitSummary"
                    name="fitSummary"
                    required
                    placeholder="Why this account may be relevant to PrismHR Global."
                  />
                </Field>
                <Field label="Next safest action" name="nextSafestAction" required>
                  <Textarea
                    id="nextSafestAction"
                    name="nextSafestAction"
                    required
                    placeholder="Action that preserves permission and trust."
                  />
                </Field>

                <div className="rounded-lg border border-[color:var(--color-control-border)] p-3">
                  <h3 className="mb-3 text-sm font-semibold leading-5">
                    Source evidence
                  </h3>
                  <div className="grid gap-3">
                    <Field label="Evidence title" name="evidenceTitle" required>
                      <Input id="evidenceTitle" name="evidenceTitle" required />
                    </Field>
                    <Field label="Evidence type" name="evidenceType" required>
                      <Select id="evidenceType" name="evidenceType">
                        {evidenceOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Evidence URL" name="evidenceUrl">
                      <Input id="evidenceUrl" name="evidenceUrl" type="url" />
                    </Field>
                    <Field label="Captured claim" name="capturedClaim" required>
                      <Textarea
                        id="capturedClaim"
                        name="capturedClaim"
                        required
                        placeholder="Specific claim this source supports."
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Source date" name="sourceDate">
                        <Input id="sourceDate" name="sourceDate" type="date" />
                      </Field>
                      <Field label="Stale after" name="staleAfter">
                        <Input id="staleAfter" name="staleAfter" type="date" />
                      </Field>
                    </div>
                  </div>
                </div>

                <Button disabled={!databaseReady || !access.canWrite} type="submit">
                  Add sourced prospect
                </Button>
                {!databaseReady ? (
                  <p className="text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
                    Prospect records are unavailable right now.
                  </p>
                ) : null}
                {!access.canWrite ? (
                  <p className="text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
                    Write access is required to create prospect records.
                  </p>
                ) : null}
              </form>
            </section>

            <section className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
              <p className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
                Internal unknowns
              </p>
              <h2 className="mb-3 text-base font-semibold leading-6">Open questions</h2>
              {unknowns.length === 0 ? (
                <p className="text-sm font-semibold leading-5 text-[color:var(--color-ink-soft)]">
                  No open unknowns loaded for this slice.
                </p>
              ) : (
                <div className="grid gap-2">
                  {unknowns.map((unknown) => (
                    <div
                      className="rounded-md border border-[color:var(--color-line)] p-3"
                      key={unknown.id}
                    >
                      <div className="font-semibold">{unknown.question}</div>
                      <div className="mt-1 text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
                        {label(unknown.category)} / {label(unknown.confidence)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
