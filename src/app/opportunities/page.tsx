import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BoundarySeverity,
  HmlValue,
  NoteSensitivity,
  NoteType,
  OpportunitySourceType,
  OpportunityStage,
  PermissionState,
  ProductRelevance,
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
import {
  createOpportunity,
  createOpportunityFollowUp,
  createOpportunityNote,
  updateOpportunity,
} from "./actions";
import {
  buildOpportunityRoomsPath,
  getOpportunityRoomsData,
  parseOpportunityRoomsFilters,
} from "./data";

export const dynamic = "force-dynamic";

const confidenceOptions = Object.values(SourceConfidence);
const hmlOptions = Object.values(HmlValue);
const noteSensitivityOptions = [
  NoteSensitivity.INTERNAL_ONLY,
  NoteSensitivity.PRIVATE_CSM_DEBRIEF,
  NoteSensitivity.SENSITIVE_BOUNDARY,
  NoteSensitivity.SHAREABLE_SUMMARY,
];
const noteTypeOptions = [
  NoteType.RESEARCH_NOTE,
  NoteType.BOUNDARY_NOTE,
  NoteType.PRIVATE_DEBRIEF,
  NoteType.SHAREABLE_SUMMARY,
];
const permissionOptions = [
  PermissionState.CSM_CONTEXT_NEEDED,
  PermissionState.CSM_APPROVED_FOR_DISCUSSION,
  PermissionState.CSM_APPROVED_FOR_INTRO,
  PermissionState.PEO_ENGAGED,
  PermissionState.PEO_CLIENT_ENGAGED,
  PermissionState.DIRECT_CONTACT_NOT_ALLOWED,
  PermissionState.HOLD_SENSITIVE,
  PermissionState.OFF_LIMITS,
  PermissionState.OWNERSHIP_UNCLEAR_REQUIRES_VERIFICATION,
];
const productOptions = Object.values(ProductRelevance);
const sourceTypeOptions = Object.values(OpportunitySourceType);
const stageOptions = Object.values(OpportunityStage);

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
  if (value === PermissionState.OFF_LIMITS || value === PermissionState.HOLD_SENSITIVE) {
    return "high";
  }
  if (
    value === PermissionState.CSM_CONTEXT_NEEDED ||
    value === PermissionState.OWNERSHIP_UNCLEAR_REQUIRES_VERIFICATION ||
    value === PermissionState.DIRECT_CONTACT_NOT_ALLOWED
  ) {
    return "medium";
  }
  return "low";
}

function stageTone(value: OpportunityStage) {
  if (
    value === OpportunityStage.MEETING_BOOKED ||
    value === OpportunityStage.ACTIVE_DISCOVERY ||
    value === OpportunityStage.INTRO_READY
  ) {
    return "low";
  }
  if (
    value === OpportunityStage.CSM_CONTEXT_NEEDED ||
    value === OpportunityStage.QUALIFYING
  ) {
    return "medium";
  }
  if (value === OpportunityStage.CLOSED_LOST) return "high";
  return "unknown";
}

function boundarySeverityTone(value: BoundarySeverity) {
  if (value === BoundarySeverity.BLOCKED) return "high";
  if (value === BoundarySeverity.APPROVAL_REQUIRED) return "medium";
  return "unknown";
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function dateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function riskFlagText(flags: string[]) {
  return flags.length > 0 ? flags.join("\n") : "";
}

type OpportunitiesPageProps = {
  searchParams?: Promise<{
    confidence?: string;
    created?: string;
    formError?: string;
    momentum?: string;
    noteCreated?: string;
    opportunityId?: string;
    permission?: string;
    promiseCreated?: string;
    q?: string;
    sourceType?: string;
    stage?: string;
    updated?: string;
  }>;
};

export default async function OpportunitiesPage({
  searchParams,
}: OpportunitiesPageProps) {
  const params = searchParams ? await searchParams : {};
  const access = await getAppAccess();

  if (access.status !== "active") {
    redirect("/login?next=/opportunities");
  }

  const filters = parseOpportunityRoomsFilters(params);
  const {
    counts,
    csmOptions,
    databaseReady,
    error,
    limit,
    opportunities,
    peoOptions,
    selectedOpportunity,
    territoryOptions,
  } = await getOpportunityRoomsData(filters);
  const currentPath = buildOpportunityRoomsPath(
    filters,
    selectedOpportunity
      ? {
          opportunityId: selectedOpportunity.id,
        }
      : {},
  );

  return (
    <main className="app-shell">
      <AppWayfinder
        current="Opportunities"
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
            <p className="eyebrow">Opportunity Room</p>
            <h1>Keep every motion tied to permission, source path, and next step.</h1>
            <p className="page-lede">
              Opportunity Rooms hold active or potential PrismHR Global motion: source
              path, related CSM or PEO, product interest, discovery notes, follow-up
              promises, permission status, and momentum risk.
            </p>
          </div>
          {!databaseReady ? (
            <Badge tone="medium">Opportunity records unavailable</Badge>
          ) : null}
        </header>

        <section className="signal-summary" aria-label="Opportunity counts">
          <div>
            <span>Opportunities</span>
            <strong>{counts.opportunities}</strong>
          </div>
          <div>
            <span>Active</span>
            <strong>{counts.active}</strong>
          </div>
          <div>
            <span>Open Promises</span>
            <strong>{counts.openPromises}</strong>
          </div>
          <div>
            <span>High Momentum</span>
            <strong>
              {counts.highMomentum} of latest {limit}
            </strong>
          </div>
        </section>

        <form action="/opportunities" className="prospect-controls">
          <Field label="Find opportunity" name="q">
            <Input
              id="q"
              name="q"
              placeholder="Opportunity, next step, CSM, PEO, account"
              type="search"
              defaultValue={filters.q ?? ""}
            />
          </Field>
          <Field label="Stage" name="stage">
            <Select id="stage" name="stage" defaultValue={filters.stage ?? ""}>
              <option value="">All stages</option>
              {stageOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Momentum" name="momentum">
            <Select id="momentum" name="momentum" defaultValue={filters.momentum ?? ""}>
              <option value="">All momentum</option>
              {hmlOptions.map((option) => (
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
              <option value="">All permission</option>
              {permissionOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Source" name="sourceType">
            <Select
              id="sourceType"
              name="sourceType"
              defaultValue={filters.sourceType ?? ""}
            >
              <option value="">All sources</option>
              {sourceTypeOptions.map((option) => (
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
            <Link className="ds-btn ds-btn--secondary" href="/opportunities">
              Reset
            </Link>
          </div>
        </form>

        {!databaseReady ? (
          <section className="ds-card ds-card--edge-amber">
            <span aria-hidden="true" className="ds-gauge ds-gauge--amber" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Opportunity records are unavailable</h2>
              <p className="ds-card__copy">{error}</p>
            </div>
          </section>
        ) : null}

        {params.formError ? (
          <section className="ds-card ds-card--edge-red">
            <span aria-hidden="true" className="ds-gauge ds-gauge--red" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Opportunity not saved</h2>
              <p className="ds-card__copy">{params.formError}</p>
            </div>
          </section>
        ) : null}

        {params.created ||
        params.updated ||
        params.noteCreated ||
        params.promiseCreated ? (
          <section className="ds-card ds-card--edge-green">
            <span aria-hidden="true" className="ds-gauge ds-gauge--green" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Opportunity room updated</h2>
              <p className="ds-card__copy">
                Opportunity state, notes, or promises are now part of the operating read.
              </p>
            </div>
          </section>
        ) : null}

        <div className="partners-grid">
          <section className="partners-column" aria-label="Opportunity list">
            <section className="partner-list">
              {opportunities.length === 0 ? (
                <section className="ds-card ds-card--edge-blue">
                  <span aria-hidden="true" className="ds-gauge ds-gauge--blue" />
                  <div className="ds-card__body">
                    <h2 className="ds-heading--title">No matching opportunities</h2>
                    <p className="ds-card__copy">
                      Create an opportunity when there is a real or potential motion to
                      manage.
                    </p>
                  </div>
                </section>
              ) : (
                opportunities.map((opportunity) => {
                  const opportunityPath = buildOpportunityRoomsPath(filters, {
                    opportunityId: opportunity.id,
                  });
                  const selected = selectedOpportunity?.id === opportunity.id;

                  return (
                    <Link
                      className={`partner-card ${selected ? "partner-card--selected" : ""}`}
                      href={opportunityPath}
                      key={opportunity.id}
                    >
                      <div className="partner-card__head">
                        <div>
                          <p className="eyebrow">{label(opportunity.sourceType)}</p>
                          <h2>{opportunity.name}</h2>
                        </div>
                        <div className="partner-card__badges">
                          <Badge tone={stageTone(opportunity.stage)}>
                            {label(opportunity.stage)}
                          </Badge>
                          <Badge tone={hmlTone(opportunity.momentumLevel)}>
                            {label(opportunity.momentumLevel)} Momentum
                          </Badge>
                        </div>
                      </div>
                      <p>{opportunity.nextStep}</p>
                      <div className="partner-card__badges">
                        <Badge tone={permissionTone(opportunity.permissionState)}>
                          {label(opportunity.permissionState)}
                        </Badge>
                        <Badge tone={confidenceTone(opportunity.sourceConfidence)}>
                          {label(opportunity.sourceConfidence)}
                        </Badge>
                        {opportunity.csmPartner ? (
                          <Badge tone="unknown">{opportunity.csmPartner.name}</Badge>
                        ) : null}
                        {opportunity.peo ? (
                          <Badge tone="unknown">{opportunity.peo.name}</Badge>
                        ) : null}
                        {opportunity.territoryAccount ? (
                          <Badge tone="unknown">
                            {opportunity.territoryAccount.companyName}
                          </Badge>
                        ) : null}
                      </div>
                      {opportunity.boundaryRules.length > 0 ? (
                        <div className="partner-card__peos">
                          {opportunity.boundaryRules.map((rule) => (
                            <span key={rule.id}>{rule.title}</span>
                          ))}
                        </div>
                      ) : null}
                      {opportunity.followUpPromises.length > 0 ? (
                        <div className="partner-card__peos">
                          {opportunity.followUpPromises.map((promise) => (
                            <span key={promise.id}>Due {formatDate(promise.dueAt)}</span>
                          ))}
                        </div>
                      ) : null}
                    </Link>
                  );
                })
              )}
            </section>

            <section className="partner-intake-panel">
              <p className="eyebrow">Opportunity Intake</p>
              <h2>Create opportunity</h2>
              <form action={createOpportunity} className="grid gap-4">
                <input name="returnTo" type="hidden" value={currentPath} />
                <OpportunityFields
                  csmOptions={csmOptions}
                  opportunity={null}
                  peoOptions={peoOptions}
                  territoryOptions={territoryOptions}
                />
                <Button disabled={!databaseReady || !access.canWrite} type="submit">
                  Create opportunity
                </Button>
              </form>
            </section>
          </section>

          <aside className="partner-detail-panel">
            {selectedOpportunity ? (
              <>
                <div className="partner-detail-panel__head">
                  <p className="eyebrow">Selected Opportunity</p>
                  <h2>{selectedOpportunity.name}</h2>
                  <p>{selectedOpportunity.nextStep}</p>
                  <div className="partner-card__badges">
                    <Badge tone={stageTone(selectedOpportunity.stage)}>
                      {label(selectedOpportunity.stage)}
                    </Badge>
                    <Badge tone={hmlTone(selectedOpportunity.momentumLevel)}>
                      {label(selectedOpportunity.momentumLevel)} Momentum
                    </Badge>
                    <Badge tone={permissionTone(selectedOpportunity.permissionState)}>
                      {label(selectedOpportunity.permissionState)}
                    </Badge>
                  </div>
                </div>

                <div className="partner-metrics">
                  <div>
                    <span>CSM</span>
                    <strong>
                      {selectedOpportunity.csmPartner?.name ?? "Not linked"}
                    </strong>
                  </div>
                  <div>
                    <span>PEO</span>
                    <strong>{selectedOpportunity.peo?.name ?? "Not linked"}</strong>
                  </div>
                  <div>
                    <span>Account</span>
                    <strong>
                      {selectedOpportunity.territoryAccount?.companyName ?? "Not linked"}
                    </strong>
                  </div>
                </div>

                {selectedOpportunity.riskFlags.length > 0 ? (
                  <div className="partner-note-stack">
                    <div>
                      <span>Risk flags</span>
                      <p>{selectedOpportunity.riskFlags.join(", ")}</p>
                    </div>
                  </div>
                ) : null}

                {selectedOpportunity.boundaryRules.length > 0 ? (
                  <section className="partner-subsection">
                    <h3>Active boundary rules</h3>
                    {selectedOpportunity.boundaryRules.map((rule) => (
                      <div key={rule.id}>
                        <strong>{rule.title}</strong>
                        <p>{rule.description}</p>
                        <div className="partner-card__badges">
                          <Badge tone={boundarySeverityTone(rule.severity)}>
                            {label(rule.severity)}
                          </Badge>
                          <Badge tone="unknown">{label(rule.ruleType)}</Badge>
                        </div>
                        {rule.allowedAlternative ? (
                          <p>{rule.allowedAlternative}</p>
                        ) : null}
                      </div>
                    ))}
                  </section>
                ) : null}

                <form action={updateOpportunity} className="partner-form-block">
                  <input name="returnTo" type="hidden" value={currentPath} />
                  <input
                    name="opportunityId"
                    type="hidden"
                    value={selectedOpportunity.id}
                  />
                  <h3>Update opportunity read</h3>
                  <OpportunityFields
                    csmOptions={csmOptions}
                    opportunity={selectedOpportunity}
                    peoOptions={peoOptions}
                    territoryOptions={territoryOptions}
                  />
                  <Button disabled={!databaseReady || !access.canWrite} type="submit">
                    Update opportunity
                  </Button>
                </form>

                <section className="partner-subsection">
                  <h3>Discovery notes</h3>
                  {selectedOpportunity.notes.length === 0 ? (
                    <p>No discovery notes recorded.</p>
                  ) : (
                    selectedOpportunity.notes.map((note) => (
                      <div key={note.id}>
                        <strong>{label(note.noteType)}</strong>
                        <p>{note.body}</p>
                        <span>
                          {label(note.sensitivity)} / {label(note.sourceConfidence)}
                        </span>
                      </div>
                    ))
                  )}
                </section>

                <section className="partner-subsection">
                  <h3>Follow-up promises</h3>
                  {selectedOpportunity.followUpPromises.length === 0 ? (
                    <p>No follow-up promises recorded.</p>
                  ) : (
                    selectedOpportunity.followUpPromises.map((promise) => (
                      <div key={promise.id}>
                        <strong>{promise.promise}</strong>
                        <p>Made to {promise.madeTo}</p>
                        <span>
                          {label(promise.status)} / due {formatDate(promise.dueAt)}
                        </span>
                      </div>
                    ))
                  )}
                </section>

                <form action={createOpportunityNote} className="partner-form-block">
                  <input name="returnTo" type="hidden" value={currentPath} />
                  <input
                    name="opportunityId"
                    type="hidden"
                    value={selectedOpportunity.id}
                  />
                  <h3>Add discovery note</h3>
                  <Field htmlFor="noteBodyCreate" label="Note" name="body" required>
                    <Textarea id="noteBodyCreate" name="body" required />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field htmlFor="noteTypeCreate" label="Type" name="noteType" required>
                      <Select
                        id="noteTypeCreate"
                        name="noteType"
                        defaultValue={NoteType.RESEARCH_NOTE}
                      >
                        {noteTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      htmlFor="noteSensitivityCreate"
                      label="Sensitivity"
                      name="sensitivity"
                      required
                    >
                      <Select
                        id="noteSensitivityCreate"
                        name="sensitivity"
                        defaultValue={NoteSensitivity.INTERNAL_ONLY}
                      >
                        {noteSensitivityOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      htmlFor="noteConfidenceCreate"
                      label="Confidence"
                      name="sourceConfidence"
                      required
                    >
                      <Select
                        id="noteConfidenceCreate"
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
                  <Button disabled={!databaseReady || !access.canWrite} type="submit">
                    Add note
                  </Button>
                </form>

                <form action={createOpportunityFollowUp} className="partner-form-block">
                  <input name="returnTo" type="hidden" value={currentPath} />
                  <input
                    name="opportunityId"
                    type="hidden"
                    value={selectedOpportunity.id}
                  />
                  <h3>Create follow-up promise</h3>
                  <Field htmlFor="promiseCreate" label="Promise" name="promise" required>
                    <Textarea id="promiseCreate" name="promise" required />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field htmlFor="madeToCreate" label="Made to" name="madeTo" required>
                      <Input id="madeToCreate" name="madeTo" required />
                    </Field>
                    <Field htmlFor="dueAtCreate" label="Due date" name="dueAt" required>
                      <Input id="dueAtCreate" name="dueAt" type="date" required />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      htmlFor="promiseSensitivityCreate"
                      label="Sensitivity"
                      name="sensitivity"
                      required
                    >
                      <Select
                        id="promiseSensitivityCreate"
                        name="sensitivity"
                        defaultValue={NoteSensitivity.INTERNAL_ONLY}
                      >
                        {noteSensitivityOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      htmlFor="promiseConfidenceCreate"
                      label="Confidence"
                      name="sourceConfidence"
                      required
                    >
                      <Select
                        id="promiseConfidenceCreate"
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
                  <Button disabled={!databaseReady || !access.canWrite} type="submit">
                    Create promise
                  </Button>
                </form>
              </>
            ) : (
              <div className="partner-detail-panel__head">
                <p className="eyebrow">Selected Opportunity</p>
                <h2>No opportunity selected</h2>
                <p>
                  Create or select an opportunity before recording notes and promises.
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

type OpportunityFieldsProps = {
  csmOptions: Array<{ id: string; name: string }>;
  opportunity: {
    csmPartnerId: string | null;
    followUpDueAt: Date | null;
    momentumLevel: HmlValue;
    name: string;
    nextStep: string;
    nextStepOwner: string | null;
    peoId: string | null;
    permissionState: PermissionState;
    productInterest: ProductRelevance[];
    riskFlags: string[];
    sourceConfidence: SourceConfidence;
    sourceType: OpportunitySourceType;
    stage: OpportunityStage;
    territoryAccountId: string | null;
  } | null;
  peoOptions: Array<{ csmPartnerId: string | null; id: string; name: string }>;
  territoryOptions: Array<{ city: string; companyName: string; id: string }>;
};

function OpportunityFields({
  csmOptions,
  opportunity,
  peoOptions,
  territoryOptions,
}: OpportunityFieldsProps) {
  const selectedProducts = new Set(opportunity?.productInterest ?? []);

  return (
    <>
      <Field
        htmlFor={opportunity ? "opportunityNameEdit" : "opportunityNameCreate"}
        label="Name"
        name="name"
        required
      >
        <Input
          id={opportunity ? "opportunityNameEdit" : "opportunityNameCreate"}
          name="name"
          required
          defaultValue={opportunity?.name ?? ""}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          htmlFor={opportunity ? "stageEdit" : "stageCreate"}
          label="Stage"
          name="stage"
          required
        >
          <Select
            id={opportunity ? "stageEdit" : "stageCreate"}
            name="stage"
            defaultValue={opportunity?.stage ?? OpportunityStage.RESEARCH}
          >
            {stageOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          htmlFor={opportunity ? "sourceTypeEdit" : "sourceTypeCreate"}
          label="Source path"
          name="sourceType"
          required
        >
          <Select
            id={opportunity ? "sourceTypeEdit" : "sourceTypeCreate"}
            name="sourceType"
            defaultValue={opportunity?.sourceType ?? OpportunitySourceType.CSM}
          >
            {sourceTypeOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          htmlFor={opportunity ? "momentumEdit" : "momentumCreate"}
          label="Momentum"
          name="momentumLevel"
          required
        >
          <Select
            id={opportunity ? "momentumEdit" : "momentumCreate"}
            name="momentumLevel"
            defaultValue={opportunity?.momentumLevel ?? HmlValue.MEDIUM}
          >
            {hmlOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          htmlFor={opportunity ? "permissionEdit" : "permissionCreate"}
          label="Permission"
          name="permissionState"
          required
        >
          <Select
            id={opportunity ? "permissionEdit" : "permissionCreate"}
            name="permissionState"
            defaultValue={
              opportunity?.permissionState ?? PermissionState.CSM_CONTEXT_NEEDED
            }
          >
            {permissionOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          htmlFor={opportunity ? "confidenceEdit" : "confidenceCreate"}
          label="Confidence"
          name="sourceConfidence"
          required
        >
          <Select
            id={opportunity ? "confidenceEdit" : "confidenceCreate"}
            name="sourceConfidence"
            defaultValue={opportunity?.sourceConfidence ?? SourceConfidence.UNVERIFIED}
          >
            {confidenceOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          htmlFor={opportunity ? "csmPartnerEdit" : "csmPartnerCreate"}
          label="CSM partner"
          name="csmPartnerId"
        >
          <Select
            id={opportunity ? "csmPartnerEdit" : "csmPartnerCreate"}
            name="csmPartnerId"
            defaultValue={opportunity?.csmPartnerId ?? ""}
          >
            <option value="">Not linked</option>
            {csmOptions.map((csm) => (
              <option key={csm.id} value={csm.id}>
                {csm.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor={opportunity ? "peoEdit" : "peoCreate"} label="PEO" name="peoId">
          <Select
            id={opportunity ? "peoEdit" : "peoCreate"}
            name="peoId"
            defaultValue={opportunity?.peoId ?? ""}
          >
            <option value="">Not linked</option>
            {peoOptions.map((peo) => (
              <option key={peo.id} value={peo.id}>
                {peo.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          htmlFor={opportunity ? "territoryEdit" : "territoryCreate"}
          label="Territory account"
          name="territoryAccountId"
        >
          <Select
            id={opportunity ? "territoryEdit" : "territoryCreate"}
            name="territoryAccountId"
            defaultValue={opportunity?.territoryAccountId ?? ""}
          >
            <option value="">Not linked</option>
            {territoryOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.companyName} / {account.city}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold leading-5">Product interest</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {productOptions.map((option) => (
            <label className="unknown-checkbox" key={option}>
              <input
                name="productInterest"
                type="checkbox"
                value={option}
                defaultChecked={selectedProducts.has(option)}
              />
              {label(option)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        htmlFor={opportunity ? "nextStepEdit" : "nextStepCreate"}
        label="Next step"
        name="nextStep"
        required
      >
        <Textarea
          id={opportunity ? "nextStepEdit" : "nextStepCreate"}
          name="nextStep"
          required
          defaultValue={opportunity?.nextStep ?? ""}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          htmlFor={opportunity ? "nextStepOwnerEdit" : "nextStepOwnerCreate"}
          label="Next step owner"
          name="nextStepOwner"
        >
          <Input
            id={opportunity ? "nextStepOwnerEdit" : "nextStepOwnerCreate"}
            name="nextStepOwner"
            defaultValue={opportunity?.nextStepOwner ?? ""}
          />
        </Field>
        <Field
          htmlFor={opportunity ? "followUpDueEdit" : "followUpDueCreate"}
          label="Follow-up due"
          name="followUpDueAt"
        >
          <Input
            id={opportunity ? "followUpDueEdit" : "followUpDueCreate"}
            name="followUpDueAt"
            type="date"
            defaultValue={dateInputValue(opportunity?.followUpDueAt)}
          />
        </Field>
      </div>
      <Field
        htmlFor={opportunity ? "riskFlagsEdit" : "riskFlagsCreate"}
        label="Risk flags"
        name="riskFlags"
      >
        <Textarea
          id={opportunity ? "riskFlagsEdit" : "riskFlagsCreate"}
          name="riskFlags"
          placeholder="One per line or comma-separated."
          defaultValue={riskFlagText(opportunity?.riskFlags ?? [])}
        />
      </Field>
    </>
  );
}
