import Link from "next/link";
import {
  EvidenceType,
  HmlValue,
  PermissionState,
  ProductRelevance,
  SourceConfidence,
} from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createTerritoryAccount } from "./actions";
import { getProspectFieldData } from "./data";

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
const hmlOptions = Object.values(HmlValue);
const evidenceOptions = Object.values(EvidenceType);

function label(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hmlTone(value: HmlValue) {
  if (value === HmlValue.HIGH) return "high";
  if (value === HmlValue.MEDIUM) return "medium";
  return "low";
}

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

type ProspectFieldPageProps = {
  searchParams?: Promise<{
    created?: string;
    formError?: string;
  }>;
};

export default async function ProspectFieldPage({
  searchParams,
}: ProspectFieldPageProps) {
  const params = searchParams ? await searchParams : {};
  const { accountLimit, accounts, databaseReady, error, totalAccounts, unknowns } =
    await getProspectFieldData();
  const topAccount = accounts[0];
  const nextSafestAction =
    topAccount?.nextSafestAction ?? "Add a sourced prospect before action.";
  const permissionPosture = topAccount?.permissionState ?? PermissionState.RESEARCH_ONLY;
  const sourceConfidence = topAccount?.sourceConfidence ?? SourceConfidence.UNVERIFIED;

  return (
    <main className="min-h-screen bg-[color:var(--color-canvas)] text-[color:var(--color-ink)]">
      <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)] max-[900px]:grid-cols-1">
        <aside className="border-r border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 max-[900px]:border-b max-[900px]:border-r-0">
          <Link
            className="mb-5 inline-flex min-h-8 items-center rounded-md border border-[color:var(--color-control-border)] px-3 text-sm font-semibold"
            href="/"
          >
            Field Signal
          </Link>
          <nav aria-label="Primary" className="grid gap-1">
            <Link
              className="rounded-md px-3 py-2 text-sm font-semibold text-[color:var(--color-ink-soft)]"
              href="/"
            >
              Today
            </Link>
            <Link
              aria-current="page"
              className="rounded-md border border-[color:var(--color-action-primary-border)] bg-[color:var(--color-selection)] px-3 py-2 text-sm font-semibold"
              href="/prospect-field"
            >
              Prospect Field
            </Link>
          </nav>
        </aside>

        <section className="min-w-0 p-5">
          <header className="mb-5 flex items-start justify-between gap-4 max-[760px]:grid">
            <div>
              <p className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
                Chicagoland prospecting
              </p>
              <h1 className="text-2xl font-semibold leading-8">Prospect Field</h1>
            </div>
            <Badge tone={databaseReady ? "low" : "medium"}>
              {databaseReady ? "Cloud database connected" : "Database pending"}
            </Badge>
          </header>

          <section
            aria-label="Current safety posture"
            className="mb-5 grid gap-3 rounded-lg border border-[color:var(--color-control-border)] bg-[color:var(--color-surface)] p-4 md:grid-cols-4"
          >
            <div className="grid gap-1">
              <span className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
                Permission
              </span>
              <Badge tone={permissionTone(permissionPosture)}>
                {label(permissionPosture)}
              </Badge>
            </div>
            <div className="grid gap-1 md:col-span-2">
              <span className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
                Next safest action
              </span>
              <strong className="text-sm leading-5">{nextSafestAction}</strong>
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
                Source confidence
              </span>
              <Badge tone={confidenceTone(sourceConfidence)}>
                {label(sourceConfidence)}
              </Badge>
            </div>
          </section>

          {!databaseReady ? (
            <section className="mb-5 rounded-lg border border-[color:var(--color-medium-border)] bg-[color:var(--color-medium-bg)] p-4">
              <h2 className="text-base font-semibold leading-6">
                Cloud database not queryable from this runtime yet
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
                The record is now in the cloud database.
              </p>
            </section>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="overflow-hidden rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
              <div className="border-b border-[color:var(--color-line)] p-4">
                <p className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
                  Evidence-led territory list
                </p>
                <h2 className="text-base font-semibold leading-6">
                  Accounts under research
                </h2>
                <p className="mt-1 text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
                  Showing {accounts.length} of {totalAccounts} account
                  {totalAccounts === 1 ? "" : "s"}; newest first. Limit {accountLimit}.
                </p>
              </div>

              {accounts.length === 0 ? (
                <div className="p-4 text-sm font-semibold leading-5 text-[color:var(--color-ink-soft)]">
                  Add a Chicagoland prospect and record the first fit signal.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead className="bg-[color:var(--color-surface-mist)]">
                      <tr>
                        <th className="px-4 py-3 font-bold">Company</th>
                        <th className="px-4 py-3 font-bold">Fit</th>
                        <th className="px-4 py-3 font-bold">Permission</th>
                        <th className="px-4 py-3 font-bold">Source</th>
                        <th className="px-4 py-3 font-bold">Next Safest Action</th>
                        <th className="px-4 py-3 font-bold">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((account) => {
                        const latestHml = account.hmlClassifications[0];
                        const latestEvidence = account.evidence[0];
                        return (
                          <tr
                            className="border-t border-[color:var(--color-line)] align-top"
                            key={account.id}
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold">{account.companyName}</div>
                              <div className="text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
                                {account.city}, {account.region}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                tone={
                                  latestHml
                                    ? hmlTone(latestHml.classification)
                                    : "unknown"
                                }
                              >
                                {latestHml ? label(latestHml.classification) : "Unscored"}
                              </Badge>
                              <div className="mt-2 max-w-56 text-xs font-semibold leading-4 text-[color:var(--color-ink-soft)]">
                                {account.fitSummary}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge tone={permissionTone(account.permissionState)}>
                                {label(account.permissionState)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge tone={confidenceTone(account.sourceConfidence)}>
                                {label(account.sourceConfidence)}
                              </Badge>
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
              <section className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
                <p className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
                  Add prospect
                </p>
                <h2 className="mb-4 text-base font-semibold leading-6">
                  Record first fit signal
                </h2>
                <form action={createTerritoryAccount} className="grid gap-4">
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
                    {[
                      ["internationalSignal", "International"],
                      ["contractorSignal", "Contractor"],
                      ["hiringSignal", "Hiring"],
                      ["complexitySignal", "Complexity"],
                      ["channelSignal", "Channel"],
                      ["boundaryRisk", "Boundary Risk"],
                    ].map(([name, fieldLabel]) => (
                      <Field key={name} label={fieldLabel} name={name} required>
                        <Select id={name} name={name}>
                          {hmlOptions.map((option) => (
                            <option key={option} value={option}>
                              {label(option)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ))}
                  </div>

                  <Field label="Fit summary" name="fitSummary" required>
                    <Textarea
                      id="fitSummary"
                      name="fitSummary"
                      required
                      placeholder="Why this account may fit PrismHR Global."
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

                  <Button disabled={!databaseReady} type="submit">
                    Add sourced prospect
                  </Button>
                  {!databaseReady ? (
                    <p className="text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
                      Apply the Prisma migration before creating records.
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
      </div>
    </main>
  );
}
