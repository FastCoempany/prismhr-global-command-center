import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CanonStatus,
  DailyServeCategory,
  DailyServeOutcome,
  DailyServeStatus,
  SourceConfidence,
} from "@/generated/prisma/client";
import { AppWayfinder } from "@/components/app-wayfinder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { signOut } from "@/app/auth/actions";
import { getAppAccess } from "@/lib/auth";
import { humanizeEnum as label } from "@/lib/format";
import { hmlTone } from "@/lib/hml-priority";
import { createDailyServe, updateDailyServeOutcome } from "./actions";
import {
  buildDailyServesPath,
  getDailyServesData,
  parseDailyServesFilters,
} from "./data";

export const dynamic = "force-dynamic";

const canonOptions = [
  CanonStatus.HYPOTHESIS,
  CanonStatus.INFERENCE,
  CanonStatus.CANON,
  CanonStatus.UNVERIFIED,
];
const categoryOptions = Object.values(DailyServeCategory);
const confidenceOptions = Object.values(SourceConfidence);
const outcomeOptions = Object.values(DailyServeOutcome);
const statusOptions = Object.values(DailyServeStatus);

function statusTone(value: DailyServeStatus) {
  if (value === DailyServeStatus.SENT) return "low";
  if (value === DailyServeStatus.READY) return "medium";
  if (value === DailyServeStatus.HELD || value === DailyServeStatus.ARCHIVED) {
    return "high";
  }
  return "unknown";
}

function outcomeTone(value: DailyServeOutcome) {
  if (
    value === DailyServeOutcome.USED_BY_CSM ||
    value === DailyServeOutcome.FORWARDED ||
    value === DailyServeOutcome.REPLIED ||
    value === DailyServeOutcome.CREATED_NEXT_STEP ||
    value === DailyServeOutcome.CONVERTED_TO_OPPORTUNITY
  ) {
    return "low";
  }
  if (value === DailyServeOutcome.NO_RESPONSE) return "medium";
  if (value === DailyServeOutcome.NOT_USEFUL) return "high";
  return "unknown";
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

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

type DailyServesPageProps = {
  searchParams?: Promise<{
    category?: string;
    confidence?: string;
    created?: string;
    csmPartnerId?: string;
    dailyServeId?: string;
    formError?: string;
    outcome?: string;
    outcomeUpdated?: string;
    q?: string;
    status?: string;
  }>;
};

export default async function DailyServesPage({ searchParams }: DailyServesPageProps) {
  const params = searchParams ? await searchParams : {};
  const access = await getAppAccess();

  if (access.status !== "active") {
    redirect("/login?next=/daily-serves");
  }

  const filters = parseDailyServesFilters(params);
  const {
    counts,
    csmOptions,
    dailyServes,
    databaseReady,
    error,
    limit,
    opportunityOptions,
    peoOptions,
    pitchAssetOptions,
    selectedDailyServe,
    territoryOptions,
  } = await getDailyServesData(filters);
  const currentPath = buildDailyServesPath(
    filters,
    selectedDailyServe
      ? {
          dailyServeId: selectedDailyServe.id,
        }
      : {},
  );

  return (
    <main className="app-shell">
      <AppWayfinder
        current="Daily Serves"
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
            <p className="eyebrow">Daily Serves</p>
            <h1>Track useful CSM material and what it changed.</h1>
            <p className="page-lede">
              Daily Serves capture reusable material, who it helped, whether it was sent,
              and the outcome signal that should affect relationship heat or opportunity
              momentum.
            </p>
          </div>
          {!databaseReady ? (
            <Badge tone="medium">Daily Serve records unavailable</Badge>
          ) : null}
        </header>

        <section className="signal-summary" aria-label="Daily Serve counts">
          <div>
            <span>Serves</span>
            <strong>{counts.dailyServes}</strong>
          </div>
          <div>
            <span>Sent</span>
            <strong>{counts.sent}</strong>
          </div>
          <div>
            <span>Positive Outcomes</span>
            <strong>{counts.positive}</strong>
          </div>
          <div>
            <span>Pending Outcomes</span>
            <strong>{counts.pending}</strong>
          </div>
        </section>

        <form action="/daily-serves" className="prospect-controls">
          <Field label="Find serve" name="q">
            <Input
              id="q"
              name="q"
              placeholder="Serve, CSM, outcome, next action"
              type="search"
              defaultValue={filters.q ?? ""}
            />
          </Field>
          <Field label="CSM partner" name="csmPartnerId">
            <Select
              id="csmPartnerId"
              name="csmPartnerId"
              defaultValue={filters.csmPartnerId ?? ""}
            >
              <option value="">All CSMs</option>
              {csmOptions.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category" name="category">
            <Select id="category" name="category" defaultValue={filters.category ?? ""}>
              <option value="">All categories</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" name="status">
            <Select id="status" name="status" defaultValue={filters.status ?? ""}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Outcome" name="outcome">
            <Select id="outcome" name="outcome" defaultValue={filters.outcome ?? ""}>
              <option value="">All outcomes</option>
              {outcomeOptions.map((option) => (
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
          <div className="prospect-controls__actions">
            <Button type="submit">Apply</Button>
            <Link className="ds-btn ds-btn--secondary" href="/daily-serves">
              Reset
            </Link>
          </div>
        </form>

        {!databaseReady ? (
          <section className="ds-card ds-card--edge-amber">
            <span aria-hidden="true" className="ds-gauge ds-gauge--amber" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Daily Serve records are unavailable</h2>
              <p className="ds-card__copy">{error}</p>
            </div>
          </section>
        ) : null}

        {params.formError ? (
          <section className="ds-card ds-card--edge-red">
            <span aria-hidden="true" className="ds-gauge ds-gauge--red" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Daily Serve not saved</h2>
              <p className="ds-card__copy">{params.formError}</p>
            </div>
          </section>
        ) : null}

        {params.created || params.outcomeUpdated ? (
          <section className="ds-card ds-card--edge-green">
            <span aria-hidden="true" className="ds-gauge ds-gauge--green" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Daily Serve updated</h2>
              <p className="ds-card__copy">
                The serve, sent state, or outcome is now reflected in the operating read.
              </p>
            </div>
          </section>
        ) : null}

        <div className="partners-grid">
          <section className="partners-column" aria-label="Daily Serve list">
            <section className="partner-list">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Serve history</p>
                  <h2 className="ds-heading--title">
                    Showing {dailyServes.length} of {counts.dailyServes}; limit {limit}
                  </h2>
                </div>
              </div>
              {dailyServes.length === 0 ? (
                <section className="ds-card ds-card--edge-blue">
                  <span aria-hidden="true" className="ds-gauge ds-gauge--blue" />
                  <div className="ds-card__body">
                    <h2 className="ds-heading--title">No matching Daily Serves</h2>
                    <p className="ds-card__copy">
                      Create a serve when useful CSM material should be tracked with an
                      outcome.
                    </p>
                  </div>
                </section>
              ) : (
                dailyServes.map((dailyServe) => {
                  const dailyServePath = buildDailyServesPath(filters, {
                    dailyServeId: dailyServe.id,
                  });
                  const selected = selectedDailyServe?.id === dailyServe.id;

                  return (
                    <Link
                      className={`partner-card ${selected ? "partner-card--selected" : ""}`}
                      href={dailyServePath}
                      key={dailyServe.id}
                    >
                      <div className="partner-card__head">
                        <div>
                          <p className="eyebrow">{label(dailyServe.category)}</p>
                          <h2>{dailyServe.title}</h2>
                        </div>
                        <div className="partner-card__badges">
                          <Badge tone={statusTone(dailyServe.status)}>
                            {label(dailyServe.status)}
                          </Badge>
                          <Badge tone={outcomeTone(dailyServe.outcome)}>
                            {label(dailyServe.outcome)}
                          </Badge>
                        </div>
                      </div>
                      <p>{dailyServe.nextSafestAction}</p>
                      <div className="partner-card__badges">
                        {dailyServe.csmPartner ? (
                          <Badge tone="unknown">{dailyServe.csmPartner.name}</Badge>
                        ) : null}
                        {dailyServe.opportunity ? (
                          <Badge tone="unknown">{dailyServe.opportunity.name}</Badge>
                        ) : null}
                        {dailyServe.peo ? (
                          <Badge tone="unknown">{dailyServe.peo.name}</Badge>
                        ) : null}
                        <Badge tone={confidenceTone(dailyServe.sourceConfidence)}>
                          {label(dailyServe.sourceConfidence)}
                        </Badge>
                      </div>
                    </Link>
                  );
                })
              )}
            </section>

            <section className="partner-intake-panel">
              <p className="eyebrow">Serve Intake</p>
              <h2>Create Daily Serve</h2>
              <form action={createDailyServe} className="grid gap-4">
                <input name="returnTo" type="hidden" value={currentPath} />
                <DailyServeFields
                  csmOptions={csmOptions}
                  opportunityOptions={opportunityOptions}
                  peoOptions={peoOptions}
                  pitchAssetOptions={pitchAssetOptions}
                  territoryOptions={territoryOptions}
                />
                <Button disabled={!databaseReady || !access.canWrite} type="submit">
                  Create Daily Serve
                </Button>
              </form>
            </section>
          </section>

          <aside className="partner-detail-panel">
            {selectedDailyServe ? (
              <>
                <div className="partner-detail-panel__head">
                  <p className="eyebrow">Selected Daily Serve</p>
                  <h2>{selectedDailyServe.title}</h2>
                  <p>{selectedDailyServe.nextSafestAction}</p>
                  <div className="partner-card__badges">
                    <Badge tone={statusTone(selectedDailyServe.status)}>
                      {label(selectedDailyServe.status)}
                    </Badge>
                    <Badge tone={outcomeTone(selectedDailyServe.outcome)}>
                      {label(selectedDailyServe.outcome)}
                    </Badge>
                    <Badge tone={confidenceTone(selectedDailyServe.sourceConfidence)}>
                      {label(selectedDailyServe.sourceConfidence)}
                    </Badge>
                  </div>
                </div>

                <div className="partner-metrics">
                  <div>
                    <span>Sent</span>
                    <strong>{formatDate(selectedDailyServe.sentAt)}</strong>
                  </div>
                  <div>
                    <span>Outcome</span>
                    <strong>{formatDate(selectedDailyServe.outcomeAt)}</strong>
                  </div>
                  <div>
                    <span>Category</span>
                    <strong>{label(selectedDailyServe.category)}</strong>
                  </div>
                </div>

                <div className="partner-note-stack">
                  <div>
                    <span>Serve content</span>
                    <p>{selectedDailyServe.content}</p>
                  </div>
                  <div>
                    <span>Why useful</span>
                    <p>{selectedDailyServe.usefulnessReason}</p>
                  </div>
                </div>

                <section className="partner-subsection">
                  <h3>Context links</h3>
                  <div>
                    <strong>CSM partner</strong>
                    <p>{selectedDailyServe.csmPartner?.name ?? "Not linked"}</p>
                  </div>
                  <div>
                    <strong>Opportunity</strong>
                    <p>{selectedDailyServe.opportunity?.name ?? "Not linked"}</p>
                  </div>
                  <div>
                    <strong>Pitch asset</strong>
                    <p>{selectedDailyServe.pitchAsset?.title ?? "Not linked"}</p>
                  </div>
                </section>

                <section className="partner-subsection">
                  <h3>Related unknowns</h3>
                  {selectedDailyServe.internalUnknowns.length === 0 ? (
                    <p>No open unknowns linked to this Daily Serve.</p>
                  ) : (
                    selectedDailyServe.internalUnknowns.map((unknown) => (
                      <div key={unknown.id}>
                        <Link href={`/unknowns#unknown-${unknown.id}`}>
                          <strong>{unknown.question}</strong>
                        </Link>
                        <p>{unknown.currentBestAnswer ?? "No answer recorded yet."}</p>
                        <div className="partner-card__badges">
                          <Badge tone={hmlTone(unknown.riskLevel)}>
                            {label(unknown.riskLevel)} Risk
                          </Badge>
                          <Badge tone={unknown.blocksImplementation ? "high" : "unknown"}>
                            {unknown.blocksImplementation
                              ? "Blocks implementation"
                              : "Tracked unknown"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </section>

                <form action={updateDailyServeOutcome} className="partner-form-block">
                  <input name="returnTo" type="hidden" value={currentPath} />
                  <input
                    name="dailyServeId"
                    type="hidden"
                    value={selectedDailyServe.id}
                  />
                  <h3>Tag outcome</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field htmlFor="statusUpdate" label="Status" name="status" required>
                      <Select
                        id="statusUpdate"
                        name="status"
                        defaultValue={selectedDailyServe.status}
                      >
                        {statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      htmlFor="outcomeUpdate"
                      label="Outcome"
                      name="outcome"
                      required
                    >
                      <Select
                        id="outcomeUpdate"
                        name="outcome"
                        defaultValue={selectedDailyServe.outcome}
                      >
                        {outcomeOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <Button disabled={!databaseReady || !access.canWrite} type="submit">
                    Save outcome
                  </Button>
                </form>

                <section className="partner-subsection">
                  <h3>HML reflection</h3>
                  {selectedDailyServe.hmlClassifications.length === 0 ? (
                    <p>Outcome HML appears after a non-pending outcome is saved.</p>
                  ) : (
                    selectedDailyServe.hmlClassifications.map((classification) => (
                      <div key={classification.id}>
                        <strong>{label(classification.category)}</strong>
                        <p>{classification.explanation}</p>
                        <Badge tone={hmlTone(classification.classification)}>
                          {label(classification.classification)}
                        </Badge>
                      </div>
                    ))
                  )}
                </section>
              </>
            ) : (
              <div className="partner-detail-panel__head">
                <p className="eyebrow">Selected Daily Serve</p>
                <h2>No Daily Serve selected</h2>
                <p>Create or select a serve before tagging an outcome.</p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

type DailyServeFieldsProps = {
  csmOptions: Array<{ id: string; name: string }>;
  opportunityOptions: Array<{
    csmPartnerId: string | null;
    id: string;
    name: string;
    peoId: string | null;
    territoryAccountId: string | null;
  }>;
  peoOptions: Array<{ csmPartnerId: string | null; id: string; name: string }>;
  pitchAssetOptions: Array<{ id: string; title: string }>;
  territoryOptions: Array<{ city: string; companyName: string; id: string }>;
};

function DailyServeFields({
  csmOptions,
  opportunityOptions,
  peoOptions,
  pitchAssetOptions,
  territoryOptions,
}: DailyServeFieldsProps) {
  return (
    <>
      <Field htmlFor="serveTitleCreate" label="Title" name="title" required>
        <Input id="serveTitleCreate" name="title" required />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field htmlFor="serveCategoryCreate" label="Category" name="category" required>
          <Select
            id="serveCategoryCreate"
            name="category"
            defaultValue={DailyServeCategory.USE_CASE_BLURB}
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor="serveStatusCreate" label="Status" name="status" required>
          <Select
            id="serveStatusCreate"
            name="status"
            defaultValue={DailyServeStatus.DRAFT}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field htmlFor="serveOutcomeCreate" label="Outcome" name="outcome" required>
          <Select
            id="serveOutcomeCreate"
            name="outcome"
            defaultValue={DailyServeOutcome.PENDING}
          >
            {outcomeOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          htmlFor="serveConfidenceCreate"
          label="Confidence"
          name="sourceConfidence"
          required
        >
          <Select
            id="serveConfidenceCreate"
            name="sourceConfidence"
            defaultValue={SourceConfidence.UNVERIFIED}
          >
            {confidenceOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field htmlFor="serveCanonCreate" label="Canon" name="canonStatus" required>
        <Select
          id="serveCanonCreate"
          name="canonStatus"
          defaultValue={CanonStatus.HYPOTHESIS}
        >
          {canonOptions.map((option) => (
            <option key={option} value={option}>
              {label(option)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field htmlFor="serveCsmCreate" label="CSM partner" name="csmPartnerId">
          <Select id="serveCsmCreate" name="csmPartnerId">
            <option value="">Not linked</option>
            {csmOptions.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor="servePeoCreate" label="PEO" name="peoId">
          <Select id="servePeoCreate" name="peoId">
            <option value="">Not linked</option>
            {peoOptions.map((peo) => (
              <option key={peo.id} value={peo.id}>
                {peo.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field htmlFor="serveOpportunityCreate" label="Opportunity" name="opportunityId">
        <Select id="serveOpportunityCreate" name="opportunityId">
          <option value="">Not linked</option>
          {opportunityOptions.map((opportunity) => (
            <option key={opportunity.id} value={opportunity.id}>
              {opportunity.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          htmlFor="serveTerritoryCreate"
          label="Territory account"
          name="territoryAccountId"
        >
          <Select id="serveTerritoryCreate" name="territoryAccountId">
            <option value="">Not linked</option>
            {territoryOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.companyName} / {account.city}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor="servePitchCreate" label="Pitch asset" name="pitchAssetId">
          <Select id="servePitchCreate" name="pitchAssetId">
            <option value="">Not linked</option>
            {pitchAssetOptions.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field htmlFor="serveContentCreate" label="Serve content" name="content" required>
        <Textarea id="serveContentCreate" name="content" required />
      </Field>
      <Field
        htmlFor="serveReasonCreate"
        label="Why useful"
        name="usefulnessReason"
        required
      >
        <Textarea id="serveReasonCreate" name="usefulnessReason" required />
      </Field>
      <Field
        htmlFor="serveNextCreate"
        label="Next safest action"
        name="nextSafestAction"
        required
      >
        <Textarea id="serveNextCreate" name="nextSafestAction" required />
      </Field>
    </>
  );
}
