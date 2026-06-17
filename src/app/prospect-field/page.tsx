import {
  EvidenceType,
  HmlValue,
  PermissionState,
  ProductRelevance,
  SourceConfidence,
} from "@/generated/prisma/client";
import { AppWayfinder } from "@/components/app-wayfinder";
import { HmlPriorityPanel } from "@/components/hml-priority-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { signOut } from "@/app/auth/actions";
import { getAppAccess } from "@/lib/auth";
import { humanizeEnum as label } from "@/lib/format";
import { buildHmlSummaryFromAccounts, hmlTone } from "@/lib/hml-priority";
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
const signalIntensityOptions = Object.values(HmlValue);
const evidenceOptions = Object.values(EvidenceType);

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

  const { accountLimit, accounts, databaseReady, error, totalAccounts, unknowns } =
    await getProspectFieldData();
  const hmlSummary = buildHmlSummaryFromAccounts(accounts);
  const topAccount = accounts[0];
  const nextSafestAction =
    topAccount?.nextSafestAction ?? "Add a sourced prospect before action.";
  const permissionPosture = topAccount?.permissionState ?? PermissionState.RESEARCH_ONLY;
  const sourceConfidence = topAccount?.sourceConfidence ?? SourceConfidence.UNVERIFIED;

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
        <header className="top-bar">
          <div className="grid gap-2">
            <p className="eyebrow">Chicagoland prospecting</p>
            <h1>Prospect Field</h1>
            <p className="text-xs font-semibold leading-4 text-[color:var(--ds-ink-700)]">
              Signed in as {access.appUser.email} / {label(access.appUser.role)}
            </p>
          </div>
          {!databaseReady ? <Badge tone="medium">Records unavailable</Badge> : null}
        </header>

        <section
          aria-label="Current safety posture"
          className="safety-strip safety-strip--four"
        >
          <div className="grid gap-1">
            <span>Permission</span>
            <Badge tone={permissionTone(permissionPosture)}>
              {label(permissionPosture)}
            </Badge>
          </div>
          <div className="grid gap-1 md:col-span-2">
            <span>Next safest action</span>
            <strong>{nextSafestAction}</strong>
          </div>
          <div className="grid gap-1">
            <span>Source confidence</span>
            <Badge tone={confidenceTone(sourceConfidence)}>
              {label(sourceConfidence)}
            </Badge>
          </div>
          <div className="grid gap-1">
            <span>Records</span>
            <strong>{totalAccounts}</strong>
          </div>
        </section>

        <HmlPriorityPanel compact summary={hmlSummary} />

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

        <div className="prospect-grid">
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
                Add a Chicagoland prospect and record the first qualification signal.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                  <thead className="bg-[color:var(--color-surface-mist)]">
                    <tr>
                      <th className="px-4 py-3 font-bold">Company</th>
                      <th className="px-4 py-3 font-bold">Qualification Signals</th>
                      <th className="px-4 py-3 font-bold">HML Priority</th>
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
                          className="border-t border-[color:var(--color-line)] align-top"
                          id={`account-${account.id}`}
                          key={account.id}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold">{account.companyName}</div>
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
                Record qualification signals
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
