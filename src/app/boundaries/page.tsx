import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BoundaryRuleStatus,
  BoundaryRuleType,
  BoundaryScopeType,
  BoundarySeverity,
  SourceConfidence,
} from "@/generated/prisma/client";
import { AppWayfinder } from "@/components/app-wayfinder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { signOut } from "@/app/auth/actions";
import { getAppAccess } from "@/lib/auth";
import { humanizeEnum as label } from "@/lib/format";
import { createBoundaryRule, updateBoundaryRule } from "./actions";
import {
  buildBoundaryRulesPath,
  getBoundaryRulesData,
  parseBoundaryRulesFilters,
} from "./data";

export const dynamic = "force-dynamic";

const confidenceOptions = Object.values(SourceConfidence);
const filterScopeOptions = Object.values(BoundaryScopeType);
const ruleTypeOptions = Object.values(BoundaryRuleType);
const severityOptions = Object.values(BoundarySeverity);
const statusOptions = Object.values(BoundaryRuleStatus);
const createScopeOptions = [
  BoundaryScopeType.CSM_PARTNER,
  BoundaryScopeType.PEO,
  BoundaryScopeType.OPPORTUNITY,
  BoundaryScopeType.TERRITORY_ACCOUNT,
  BoundaryScopeType.EXTERNAL_CHANNEL,
  BoundaryScopeType.GLOBAL,
];

type BoundaryRulesData = Awaited<ReturnType<typeof getBoundaryRulesData>>;
type BoundaryRuleRecord = NonNullable<BoundaryRulesData["selectedRule"]>;
type BoundaryRuleRelationLabel = {
  csmPartner: { name: string } | null;
  opportunity: { name: string } | null;
  peo: { name: string } | null;
  peoClient: {
    displayName: string;
    peo: { name: string } | null;
  } | null;
  scopeType: BoundaryScopeType;
  territoryAccount: { companyName: string } | null;
};

function severityTone(value: BoundarySeverity) {
  if (value === BoundarySeverity.BLOCKED) return "high";
  if (value === BoundarySeverity.APPROVAL_REQUIRED) return "medium";
  return "unknown";
}

function statusTone(value: BoundaryRuleStatus) {
  if (value === BoundaryRuleStatus.ACTIVE) return "low";
  if (value === BoundaryRuleStatus.REVOKED) return "high";
  return "unknown";
}

function ruleTypeTone(value: BoundaryRuleType) {
  if (
    value === BoundaryRuleType.OFF_LIMITS ||
    value === BoundaryRuleType.DIRECT_CONTACT_NOT_ALLOWED ||
    value === BoundaryRuleType.HOLD_SENSITIVE
  ) {
    return "high";
  }
  if (
    value === BoundaryRuleType.APPROVAL_REQUIRED ||
    value === BoundaryRuleType.RELATIONSHIP_OWNER_REQUIRED
  ) {
    return "medium";
  }
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

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function relatedLabel(rule: BoundaryRuleRelationLabel) {
  if (rule.csmPartner) return rule.csmPartner.name;
  if (rule.peo) return rule.peo.name;
  if (rule.peoClient) {
    return `${rule.peoClient.displayName}${rule.peoClient.peo ? ` / ${rule.peoClient.peo.name}` : ""}`;
  }
  if (rule.opportunity) return rule.opportunity.name;
  if (rule.territoryAccount) return rule.territoryAccount.companyName;
  if (rule.scopeType === BoundaryScopeType.EXTERNAL_CHANNEL) return "External channel";
  if (rule.scopeType === BoundaryScopeType.GLOBAL) return "Global";
  return "Unlinked";
}

type BoundariesPageProps = {
  searchParams?: Promise<{
    boundaryId?: string;
    confidence?: string;
    created?: string;
    formError?: string;
    q?: string;
    review?: string;
    ruleType?: string;
    scopeType?: string;
    severity?: string;
    status?: string;
    updated?: string;
  }>;
};

export default async function BoundariesPage({ searchParams }: BoundariesPageProps) {
  const params = searchParams ? await searchParams : {};
  const access = await getAppAccess();

  if (access.status !== "active") {
    redirect("/login?next=/boundaries");
  }

  const filters = parseBoundaryRulesFilters(params);
  const {
    counts,
    csmOptions,
    databaseReady,
    error,
    opportunityOptions,
    peoOptions,
    rules,
    selectedRule,
    territoryOptions,
  } = await getBoundaryRulesData(filters);
  const currentPath = buildBoundaryRulesPath(
    filters,
    selectedRule
      ? {
          boundaryId: selectedRule.id,
        }
      : {},
  );

  return (
    <main className="app-shell">
      <AppWayfinder
        current="Boundaries"
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
            <p className="eyebrow">Boundary Rules</p>
            <h1>Make the unsafe path explicit before action.</h1>
            <p className="page-lede">
              Boundary Rules keep off-limits zones, approval gates, relationship-owner
              requirements, and allowed alternatives attached to the records they affect.
            </p>
          </div>
          {!databaseReady ? (
            <Badge tone="medium">Boundary records unavailable</Badge>
          ) : null}
        </header>

        <section className="signal-summary" aria-label="Boundary rule counts">
          <div>
            <span>Rules</span>
            <strong>{counts.rules}</strong>
          </div>
          <div>
            <span>Active</span>
            <strong>{counts.active}</strong>
          </div>
          <div>
            <span>Blocked</span>
            <strong>{counts.blocked}</strong>
          </div>
          <div>
            <span>Approval Required</span>
            <strong>{counts.approvalRequired}</strong>
          </div>
          <div>
            <span>Review Due</span>
            <strong>{counts.reviewDue}</strong>
          </div>
        </section>

        <form action="/boundaries" className="prospect-controls">
          <Field label="Find boundary" name="q">
            <Input
              id="q"
              name="q"
              placeholder="Rule, reason, owner, account, PEO, opportunity"
              type="search"
              defaultValue={filters.q ?? ""}
            />
          </Field>
          <Field label="Rule type" name="ruleType">
            <Select id="ruleType" name="ruleType" defaultValue={filters.ruleType ?? ""}>
              <option value="">All rule types</option>
              {ruleTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Scope" name="scopeType">
            <Select
              id="scopeType"
              name="scopeType"
              defaultValue={filters.scopeType ?? ""}
            >
              <option value="">All scopes</option>
              {filterScopeOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Severity" name="severity">
            <Select id="severity" name="severity" defaultValue={filters.severity ?? ""}>
              <option value="">All severity</option>
              {severityOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" name="status">
            <Select id="status" name="status" defaultValue={filters.status ?? ""}>
              <option value="">All status</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Review" name="review">
            <Select id="review" name="review" defaultValue={filters.review ?? ""}>
              <option value="">Any review date</option>
              <option value="due">Review due</option>
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
            <Link className="ds-btn ds-btn--secondary" href="/boundaries">
              Reset
            </Link>
          </div>
        </form>

        {!databaseReady ? (
          <section className="ds-card ds-card--edge-amber">
            <span aria-hidden="true" className="ds-gauge ds-gauge--amber" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Boundary records are unavailable</h2>
              <p className="ds-card__copy">{error}</p>
            </div>
          </section>
        ) : null}

        {params.formError ? (
          <section className="ds-card ds-card--edge-red">
            <span aria-hidden="true" className="ds-gauge ds-gauge--red" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Boundary rule not saved</h2>
              <p className="ds-card__copy">{params.formError}</p>
            </div>
          </section>
        ) : null}

        {params.created || params.updated ? (
          <section className="ds-card ds-card--edge-green">
            <span aria-hidden="true" className="ds-gauge ds-gauge--green" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Boundary rule updated</h2>
              <p className="ds-card__copy">
                The current restriction, approval gate, or allowed alternative is now part
                of the operating read.
              </p>
            </div>
          </section>
        ) : null}

        <div className="partners-grid">
          <section className="partners-column" aria-label="Boundary rule list">
            <section className="partner-list">
              {rules.length === 0 ? (
                <section className="ds-card ds-card--edge-blue">
                  <span aria-hidden="true" className="ds-gauge ds-gauge--blue" />
                  <div className="ds-card__body">
                    <h2 className="ds-heading--title">No matching boundary rules</h2>
                    <p className="ds-card__copy">
                      Record a boundary when a relationship, account, PEO, or opportunity
                      needs a restriction, approval gate, or safer alternative.
                    </p>
                  </div>
                </section>
              ) : (
                rules.map((rule) => {
                  const rulePath = buildBoundaryRulesPath(filters, {
                    boundaryId: rule.id,
                  });
                  const selected = selectedRule?.id === rule.id;

                  return (
                    <Link
                      className={`partner-card ${selected ? "partner-card--selected" : ""}`}
                      href={rulePath}
                      key={rule.id}
                    >
                      <div className="partner-card__head">
                        <div>
                          <p className="eyebrow">{label(rule.scopeType)}</p>
                          <h2>{rule.title}</h2>
                        </div>
                        <div className="partner-card__badges">
                          <Badge tone={severityTone(rule.severity)}>
                            {label(rule.severity)}
                          </Badge>
                          <Badge tone={statusTone(rule.status)}>
                            {label(rule.status)}
                          </Badge>
                        </div>
                      </div>
                      <p>{rule.description}</p>
                      <div className="partner-card__badges">
                        <Badge tone={ruleTypeTone(rule.ruleType)}>
                          {label(rule.ruleType)}
                        </Badge>
                        <Badge tone={confidenceTone(rule.sourceConfidence)}>
                          {label(rule.sourceConfidence)}
                        </Badge>
                        <Badge tone="unknown">{relatedLabel(rule)}</Badge>
                      </div>
                      <div className="partner-card__peos">
                        <span>Review {formatDate(rule.reviewAt)}</span>
                        <span>Effective {formatDate(rule.effectiveFrom)}</span>
                        {rule.expiresAt ? (
                          <span>Expires {formatDate(rule.expiresAt)}</span>
                        ) : null}
                      </div>
                    </Link>
                  );
                })
              )}
            </section>

            <section className="partner-intake-panel">
              <p className="eyebrow">Boundary Intake</p>
              <h2>Create boundary rule</h2>
              <form action={createBoundaryRule} className="grid gap-4">
                <input name="returnTo" type="hidden" value={currentPath} />
                <BoundaryRuleFields
                  csmOptions={csmOptions}
                  defaultSetBy={access.appUser.name}
                  opportunityOptions={opportunityOptions}
                  peoOptions={peoOptions}
                  rule={null}
                  territoryOptions={territoryOptions}
                />
                <Button disabled={!databaseReady || !access.canWrite} type="submit">
                  Create boundary rule
                </Button>
              </form>
            </section>
          </section>

          <aside className="partner-detail-panel">
            {selectedRule ? (
              <>
                <div className="partner-detail-panel__head">
                  <p className="eyebrow">Selected Boundary</p>
                  <h2>{selectedRule.title}</h2>
                  <p>{selectedRule.description}</p>
                  <div className="partner-card__badges">
                    <Badge tone={ruleTypeTone(selectedRule.ruleType)}>
                      {label(selectedRule.ruleType)}
                    </Badge>
                    <Badge tone={severityTone(selectedRule.severity)}>
                      {label(selectedRule.severity)}
                    </Badge>
                    <Badge tone={statusTone(selectedRule.status)}>
                      {label(selectedRule.status)}
                    </Badge>
                    <Badge tone={confidenceTone(selectedRule.sourceConfidence)}>
                      {label(selectedRule.sourceConfidence)}
                    </Badge>
                  </div>
                </div>

                <div className="partner-metrics">
                  <div>
                    <span>Scope</span>
                    <strong>{label(selectedRule.scopeType)}</strong>
                  </div>
                  <div>
                    <span>Related</span>
                    <strong>{relatedLabel(selectedRule)}</strong>
                  </div>
                  <div>
                    <span>Review</span>
                    <strong>{formatDate(selectedRule.reviewAt)}</strong>
                  </div>
                </div>

                <div className="partner-note-stack">
                  <div>
                    <span>Reason</span>
                    <p>{selectedRule.reason}</p>
                  </div>
                  <div>
                    <span>Allowed Alternative</span>
                    <p>
                      {selectedRule.allowedAlternative ??
                        "No alternative recorded. Resolve the boundary before motion."}
                    </p>
                  </div>
                </div>

                <form action={updateBoundaryRule} className="partner-form-block">
                  <input name="returnTo" type="hidden" value={currentPath} />
                  <input name="boundaryId" type="hidden" value={selectedRule.id} />
                  <h3>Update boundary read</h3>
                  <BoundaryRuleFields
                    csmOptions={csmOptions}
                    defaultSetBy={access.appUser.name}
                    includeStatus
                    opportunityOptions={opportunityOptions}
                    peoOptions={peoOptions}
                    rule={selectedRule}
                    territoryOptions={territoryOptions}
                  />
                  <Button disabled={!databaseReady || !access.canWrite} type="submit">
                    Update boundary rule
                  </Button>
                </form>
              </>
            ) : (
              <div className="partner-detail-panel__head">
                <p className="eyebrow">Selected Boundary</p>
                <h2>No boundary selected</h2>
                <p>
                  Create or select a boundary rule before changing approval, off-limits,
                  or safer-alternative guidance.
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

type BoundaryRuleFieldsProps = {
  csmOptions: Array<{ id: string; name: string }>;
  defaultSetBy: string;
  includeStatus?: boolean;
  opportunityOptions: Array<{ id: string; name: string }>;
  peoOptions: Array<{ csmPartnerId: string | null; id: string; name: string }>;
  rule: BoundaryRuleRecord | null;
  territoryOptions: Array<{ city: string; companyName: string; id: string }>;
};

function BoundaryRuleFields({
  csmOptions,
  defaultSetBy,
  includeStatus = false,
  opportunityOptions,
  peoOptions,
  rule,
  territoryOptions,
}: BoundaryRuleFieldsProps) {
  const scopeOptions =
    rule?.scopeType === BoundaryScopeType.PEO_CLIENT
      ? filterScopeOptions
      : createScopeOptions;

  return (
    <>
      {rule?.peoClient?.id ? (
        <input name="peoClientId" type="hidden" value={rule.peoClient.id} />
      ) : null}
      <Field
        htmlFor={rule ? "boundaryTitleEdit" : "boundaryTitleCreate"}
        label="Title"
        name="title"
        required
      >
        <Input
          id={rule ? "boundaryTitleEdit" : "boundaryTitleCreate"}
          name="title"
          required
          defaultValue={rule?.title ?? ""}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          htmlFor={rule ? "boundaryRuleTypeEdit" : "boundaryRuleTypeCreate"}
          label="Rule type"
          name="ruleType"
          required
        >
          <Select
            id={rule ? "boundaryRuleTypeEdit" : "boundaryRuleTypeCreate"}
            name="ruleType"
            defaultValue={rule?.ruleType ?? BoundaryRuleType.APPROVAL_REQUIRED}
          >
            {ruleTypeOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          htmlFor={rule ? "boundaryScopeEdit" : "boundaryScopeCreate"}
          label="Scope"
          name="scopeType"
          required
        >
          <Select
            id={rule ? "boundaryScopeEdit" : "boundaryScopeCreate"}
            name="scopeType"
            defaultValue={rule?.scopeType ?? BoundaryScopeType.CSM_PARTNER}
          >
            {scopeOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          htmlFor={rule ? "boundarySeverityEdit" : "boundarySeverityCreate"}
          label="Severity"
          name="severity"
          required
        >
          <Select
            id={rule ? "boundarySeverityEdit" : "boundarySeverityCreate"}
            name="severity"
            defaultValue={rule?.severity ?? BoundarySeverity.APPROVAL_REQUIRED}
          >
            {severityOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold leading-5">Linked record</legend>
        <p className="ds-field__micro">
          Pick the record that matches the scope. Global and external-channel rules can
          stay unlinked.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            htmlFor={rule ? "boundaryCsmEdit" : "boundaryCsmCreate"}
            label="CSM partner"
            name="csmPartnerId"
          >
            <Select
              id={rule ? "boundaryCsmEdit" : "boundaryCsmCreate"}
              name="csmPartnerId"
              defaultValue={rule?.csmPartner?.id ?? ""}
            >
              <option value="">Not linked</option>
              {csmOptions.map((csm) => (
                <option key={csm.id} value={csm.id}>
                  {csm.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            htmlFor={rule ? "boundaryPeoEdit" : "boundaryPeoCreate"}
            label="PEO"
            name="peoId"
          >
            <Select
              id={rule ? "boundaryPeoEdit" : "boundaryPeoCreate"}
              name="peoId"
              defaultValue={rule?.peo?.id ?? ""}
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
            htmlFor={rule ? "boundaryOpportunityEdit" : "boundaryOpportunityCreate"}
            label="Opportunity"
            name="opportunityId"
          >
            <Select
              id={rule ? "boundaryOpportunityEdit" : "boundaryOpportunityCreate"}
              name="opportunityId"
              defaultValue={rule?.opportunity?.id ?? ""}
            >
              <option value="">Not linked</option>
              {opportunityOptions.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            htmlFor={rule ? "boundaryTerritoryEdit" : "boundaryTerritoryCreate"}
            label="Territory account"
            name="territoryAccountId"
          >
            <Select
              id={rule ? "boundaryTerritoryEdit" : "boundaryTerritoryCreate"}
              name="territoryAccountId"
              defaultValue={rule?.territoryAccount?.id ?? ""}
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
      </fieldset>

      <Field
        htmlFor={rule ? "boundaryDescriptionEdit" : "boundaryDescriptionCreate"}
        label="Description"
        name="description"
        required
      >
        <Textarea
          id={rule ? "boundaryDescriptionEdit" : "boundaryDescriptionCreate"}
          name="description"
          required
          defaultValue={rule?.description ?? ""}
        />
      </Field>
      <Field
        htmlFor={rule ? "boundaryReasonEdit" : "boundaryReasonCreate"}
        label="Reason"
        name="reason"
        required
      >
        <Textarea
          id={rule ? "boundaryReasonEdit" : "boundaryReasonCreate"}
          name="reason"
          required
          defaultValue={rule?.reason ?? ""}
        />
      </Field>
      <Field
        htmlFor={rule ? "boundaryAlternativeEdit" : "boundaryAlternativeCreate"}
        label="Allowed alternative"
        name="allowedAlternative"
      >
        <Textarea
          id={rule ? "boundaryAlternativeEdit" : "boundaryAlternativeCreate"}
          name="allowedAlternative"
          defaultValue={rule?.allowedAlternative ?? ""}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          htmlFor={rule ? "boundaryEffectiveEdit" : "boundaryEffectiveCreate"}
          label="Effective from"
          name="effectiveFrom"
          required
        >
          <Input
            id={rule ? "boundaryEffectiveEdit" : "boundaryEffectiveCreate"}
            name="effectiveFrom"
            type="date"
            required
            defaultValue={dateInputValue(rule?.effectiveFrom) || todayInputValue()}
          />
        </Field>
        <Field
          htmlFor={rule ? "boundaryReviewEdit" : "boundaryReviewCreate"}
          label="Review at"
          name="reviewAt"
        >
          <Input
            id={rule ? "boundaryReviewEdit" : "boundaryReviewCreate"}
            name="reviewAt"
            type="date"
            defaultValue={dateInputValue(rule?.reviewAt)}
          />
        </Field>
        <Field
          htmlFor={rule ? "boundaryExpiresEdit" : "boundaryExpiresCreate"}
          label="Expires at"
          name="expiresAt"
        >
          <Input
            id={rule ? "boundaryExpiresEdit" : "boundaryExpiresCreate"}
            name="expiresAt"
            type="date"
            defaultValue={dateInputValue(rule?.expiresAt)}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {includeStatus ? (
          <Field
            htmlFor={rule ? "boundaryStatusEdit" : "boundaryStatusCreate"}
            label="Status"
            name="status"
            required
          >
            <Select
              id={rule ? "boundaryStatusEdit" : "boundaryStatusCreate"}
              name="status"
              defaultValue={rule?.status ?? BoundaryRuleStatus.ACTIVE}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field
          htmlFor={rule ? "boundaryConfidenceEdit" : "boundaryConfidenceCreate"}
          label="Confidence"
          name="sourceConfidence"
          required
        >
          <Select
            id={rule ? "boundaryConfidenceEdit" : "boundaryConfidenceCreate"}
            name="sourceConfidence"
            defaultValue={rule?.sourceConfidence ?? SourceConfidence.UNVERIFIED}
          >
            {confidenceOptions.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          htmlFor={rule ? "boundarySetByEdit" : "boundarySetByCreate"}
          label="Set by"
          name="setBy"
        >
          <Input
            id={rule ? "boundarySetByEdit" : "boundarySetByCreate"}
            name="setBy"
            defaultValue={rule?.setBy ?? defaultSetBy}
          />
        </Field>
      </div>
    </>
  );
}
