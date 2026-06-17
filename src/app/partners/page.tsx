import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BoundarySeverity,
  CsmPartnerStatus,
  HmlValue,
  NoteSensitivity,
  PermissionState,
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
import { createCsmPartner, createFollowUpPromise, createPeoRecord } from "./actions";
import {
  buildPartnerRoomsPath,
  getPartnerRoomsData,
  parsePartnerRoomsFilters,
} from "./data";

export const dynamic = "force-dynamic";

const csmStatusOptions = Object.values(CsmPartnerStatus);
const confidenceOptions = Object.values(SourceConfidence);
const hmlOptions = Object.values(HmlValue);
const permissionOptions = [
  PermissionState.CSM_CONTEXT_NEEDED,
  PermissionState.CSM_APPROVED_FOR_DISCUSSION,
  PermissionState.CSM_APPROVED_FOR_INTRO,
  PermissionState.PEO_ENGAGED,
  PermissionState.DIRECT_CONTACT_NOT_ALLOWED,
  PermissionState.HOLD_SENSITIVE,
  PermissionState.OFF_LIMITS,
  PermissionState.OWNERSHIP_UNCLEAR_REQUIRES_VERIFICATION,
];
const sensitivityOptions = [
  NoteSensitivity.INTERNAL_ONLY,
  NoteSensitivity.PRIVATE_CSM_DEBRIEF,
  NoteSensitivity.SENSITIVE_BOUNDARY,
  NoteSensitivity.SHAREABLE_SUMMARY,
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

function statusTone(value: CsmPartnerStatus) {
  if (value === CsmPartnerStatus.ACTIVE) return "low";
  if (value === CsmPartnerStatus.WATCH) return "medium";
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

type PartnersPageProps = {
  searchParams?: Promise<{
    confidence?: string;
    created?: string;
    formError?: string;
    heat?: string;
    partnerId?: string;
    peoCreated?: string;
    permission?: string;
    promiseCreated?: string;
    q?: string;
    status?: string;
  }>;
};

export default async function PartnersPage({ searchParams }: PartnersPageProps) {
  const params = searchParams ? await searchParams : {};
  const access = await getAppAccess();

  if (access.status !== "active") {
    redirect("/login?next=/partners");
  }

  const filters = parsePartnerRoomsFilters(params);
  const { counts, databaseReady, error, limit, partners, selectedPartner } =
    await getPartnerRoomsData(filters);
  const currentPath = buildPartnerRoomsPath(
    filters,
    selectedPartner
      ? {
          partnerId: selectedPartner.id,
        }
      : {},
  );

  return (
    <main className="app-shell">
      <AppWayfinder
        current="Partners"
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
            <p className="eyebrow">CSM Partner Rooms</p>
            <h1>Map the relationship owner before the motion.</h1>
            <p className="page-lede">
              Partner Rooms keep CSM trust context, PEO mapping, permission posture, and
              follow-up promises close to the next safest action.
            </p>
          </div>
          {!databaseReady ? (
            <Badge tone="medium">Partner records unavailable</Badge>
          ) : null}
        </header>

        <section className="signal-summary" aria-label="Partner room counts">
          <div>
            <span>CSM Partners</span>
            <strong>{counts.partners}</strong>
          </div>
          <div>
            <span>Mapped PEOs</span>
            <strong>{counts.peos}</strong>
          </div>
          <div>
            <span>Open Promises</span>
            <strong>{counts.openPromises}</strong>
          </div>
          <div>
            <span>High Heat</span>
            <strong>
              {counts.highHeat} of latest {limit}
            </strong>
          </div>
        </section>

        <form action="/partners" className="prospect-controls">
          <Field label="Find partner" name="q">
            <Input
              id="q"
              name="q"
              placeholder="CSM, PEO, guidance, trust note"
              type="search"
              defaultValue={filters.q ?? ""}
            />
          </Field>
          <Field label="Relationship heat" name="heat">
            <Select id="heat" name="heat" defaultValue={filters.heat ?? ""}>
              <option value="">All heat</option>
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
          <Field label="Status" name="status">
            <Select id="status" name="status" defaultValue={filters.status ?? ""}>
              <option value="">All status</option>
              {csmStatusOptions.map((option) => (
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
            <Link className="ds-btn ds-btn--secondary" href="/partners">
              Reset
            </Link>
          </div>
        </form>

        {!databaseReady ? (
          <section className="ds-card ds-card--edge-amber">
            <span aria-hidden="true" className="ds-gauge ds-gauge--amber" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Partner records are unavailable</h2>
              <p className="ds-card__copy">{error}</p>
            </div>
          </section>
        ) : null}

        {params.formError ? (
          <section className="ds-card ds-card--edge-red">
            <span aria-hidden="true" className="ds-gauge ds-gauge--red" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Partner record not saved</h2>
              <p className="ds-card__copy">{params.formError}</p>
            </div>
          </section>
        ) : null}

        {params.created || params.peoCreated || params.promiseCreated ? (
          <section className="ds-card ds-card--edge-green">
            <span aria-hidden="true" className="ds-gauge ds-gauge--green" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Partner room updated</h2>
              <p className="ds-card__copy">
                The CSM, PEO, or follow-up promise is now part of the relationship map.
              </p>
            </div>
          </section>
        ) : null}

        <div className="partners-grid">
          <section className="partners-column" aria-label="CSM partner list">
            <section className="partner-list">
              {partners.length === 0 ? (
                <section className="ds-card ds-card--edge-blue">
                  <span aria-hidden="true" className="ds-gauge ds-gauge--blue" />
                  <div className="ds-card__body">
                    <h2 className="ds-heading--title">No matching partners</h2>
                    <p className="ds-card__copy">
                      Create a CSM partner before mapping PEOs or promises.
                    </p>
                  </div>
                </section>
              ) : (
                partners.map((partner) => {
                  const partnerPath = buildPartnerRoomsPath(filters, {
                    partnerId: partner.id,
                  });
                  const selected = selectedPartner?.id === partner.id;

                  return (
                    <Link
                      className={`partner-card ${selected ? "partner-card--selected" : ""}`}
                      href={partnerPath}
                      key={partner.id}
                    >
                      <div className="partner-card__head">
                        <div>
                          <p className="eyebrow">CSM Partner</p>
                          <h2>{partner.name}</h2>
                        </div>
                        <div className="partner-card__badges">
                          <Badge tone={statusTone(partner.status)}>
                            {label(partner.status)}
                          </Badge>
                          <Badge tone={hmlTone(partner.relationshipHeat)}>
                            {label(partner.relationshipHeat)} Heat
                          </Badge>
                        </div>
                      </div>
                      <p>{partner.nextSafestAction}</p>
                      <div className="partner-card__badges">
                        <Badge tone={permissionTone(partner.permissionState)}>
                          {label(partner.permissionState)}
                        </Badge>
                        <Badge tone={confidenceTone(partner.sourceConfidence)}>
                          {label(partner.sourceConfidence)}
                        </Badge>
                        <Badge tone="unknown">
                          {partner._count.peos} PEO{partner._count.peos === 1 ? "" : "s"}
                        </Badge>
                        <Badge tone="unknown">
                          {partner._count.followUpPromises} promise
                          {partner._count.followUpPromises === 1 ? "" : "s"}
                        </Badge>
                        <Badge
                          tone={partner.boundaryRules.length > 0 ? "medium" : "unknown"}
                        >
                          {partner.boundaryRules.length} active boundary
                          {partner.boundaryRules.length === 1 ? "" : " rules"}
                        </Badge>
                      </div>
                      {partner.boundaryRules.length > 0 ? (
                        <div className="partner-card__peos">
                          {partner.boundaryRules.map((rule) => (
                            <span key={rule.id}>{rule.title}</span>
                          ))}
                        </div>
                      ) : null}
                      {partner.peos.length > 0 ? (
                        <div className="partner-card__peos">
                          {partner.peos.map((peo) => (
                            <span key={peo.id}>{peo.name}</span>
                          ))}
                        </div>
                      ) : null}
                    </Link>
                  );
                })
              )}
            </section>

            <section className="partner-intake-panel">
              <p className="eyebrow">Partner Intake</p>
              <h2>Create CSM partner</h2>
              <form action={createCsmPartner} className="grid gap-4">
                <input name="returnTo" type="hidden" value={currentPath} />
                <Field htmlFor="partnerNameCreate" label="Name" name="name" required>
                  <Input id="partnerNameCreate" name="name" required />
                </Field>
                <Field htmlFor="partnerEmailCreate" label="Email" name="email">
                  <Input id="partnerEmailCreate" name="email" type="email" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    htmlFor="partnerStatusCreate"
                    label="Status"
                    name="status"
                    required
                  >
                    <Select
                      id="partnerStatusCreate"
                      name="status"
                      defaultValue={CsmPartnerStatus.ACTIVE}
                    >
                      {csmStatusOptions.map((option) => (
                        <option key={option} value={option}>
                          {label(option)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    htmlFor="partnerPermissionCreate"
                    label="Permission"
                    name="permissionState"
                    required
                  >
                    <Select
                      id="partnerPermissionCreate"
                      name="permissionState"
                      defaultValue={PermissionState.CSM_CONTEXT_NEEDED}
                    >
                      {permissionOptions.map((option) => (
                        <option key={option} value={option}>
                          {label(option)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field
                    htmlFor="partnerHeatCreate"
                    label="Relationship heat"
                    name="relationshipHeat"
                    required
                  >
                    <Select
                      id="partnerHeatCreate"
                      name="relationshipHeat"
                      defaultValue={HmlValue.MEDIUM}
                    >
                      {hmlOptions.map((option) => (
                        <option key={option} value={option}>
                          {label(option)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    htmlFor="partnerProtectivenessCreate"
                    label="Protectiveness"
                    name="protectivenessLevel"
                    required
                  >
                    <Select
                      id="partnerProtectivenessCreate"
                      name="protectivenessLevel"
                      defaultValue={HmlValue.MEDIUM}
                    >
                      {hmlOptions.map((option) => (
                        <option key={option} value={option}>
                          {label(option)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    htmlFor="partnerConfidenceCreate"
                    label="Confidence"
                    name="sourceConfidence"
                    required
                  >
                    <Select
                      id="partnerConfidenceCreate"
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
                <Field
                  htmlFor="partnerNextActionCreate"
                  label="Next safest action"
                  name="nextSafestAction"
                  required
                >
                  <Textarea
                    id="partnerNextActionCreate"
                    name="nextSafestAction"
                    required
                  />
                </Field>
                <Field
                  htmlFor="partnerCadenceCreate"
                  label="Communication cadence"
                  name="communicationCadence"
                >
                  <Input id="partnerCadenceCreate" name="communicationCadence" />
                </Field>
                <Field
                  htmlFor="partnerIntroCreate"
                  label="Preferred intro motion"
                  name="preferredIntroMotion"
                >
                  <Textarea id="partnerIntroCreate" name="preferredIntroMotion" />
                </Field>
                <Field
                  htmlFor="partnerFollowupCreate"
                  label="Preferred follow-up motion"
                  name="preferredFollowupMotion"
                >
                  <Textarea id="partnerFollowupCreate" name="preferredFollowupMotion" />
                </Field>
                <Field
                  htmlFor="partnerDosCreate"
                  label="Do / do not guidance"
                  name="dosAndDonts"
                >
                  <Textarea id="partnerDosCreate" name="dosAndDonts" />
                </Field>
                <Field
                  htmlFor="partnerTrustCreate"
                  label="Trust surface notes"
                  name="trustSurfaceNotes"
                >
                  <Textarea id="partnerTrustCreate" name="trustSurfaceNotes" />
                </Field>
                <label className="unknown-checkbox">
                  <input name="privateDebriefRequired" type="checkbox" defaultChecked />
                  Private CSM debrief required
                </label>
                <Button disabled={!databaseReady || !access.canWrite} type="submit">
                  Create CSM partner
                </Button>
              </form>
            </section>
          </section>

          <aside className="partner-detail-panel">
            {selectedPartner ? (
              <>
                <div className="partner-detail-panel__head">
                  <p className="eyebrow">Selected Partner Room</p>
                  <h2>{selectedPartner.name}</h2>
                  <p>{selectedPartner.nextSafestAction}</p>
                  <div className="partner-card__badges">
                    <Badge tone={hmlTone(selectedPartner.relationshipHeat)}>
                      {label(selectedPartner.relationshipHeat)} Heat
                    </Badge>
                    <Badge tone={hmlTone(selectedPartner.protectivenessLevel)}>
                      {label(selectedPartner.protectivenessLevel)} Protectiveness
                    </Badge>
                    <Badge tone={permissionTone(selectedPartner.permissionState)}>
                      {label(selectedPartner.permissionState)}
                    </Badge>
                  </div>
                </div>

                <div className="partner-metrics">
                  <div>
                    <span>Private debrief</span>
                    <strong>
                      {selectedPartner.privateDebriefRequired
                        ? "Required"
                        : "Not required"}
                    </strong>
                  </div>
                  <div>
                    <span>Cadence</span>
                    <strong>
                      {selectedPartner.communicationCadence ?? "Not recorded"}
                    </strong>
                  </div>
                  <div>
                    <span>Last reviewed</span>
                    <strong>{formatDate(selectedPartner.lastReviewedAt)}</strong>
                  </div>
                </div>

                {selectedPartner.dosAndDonts || selectedPartner.trustSurfaceNotes ? (
                  <div className="partner-note-stack">
                    {selectedPartner.dosAndDonts ? (
                      <div>
                        <span>Do / do not guidance</span>
                        <p>{selectedPartner.dosAndDonts}</p>
                      </div>
                    ) : null}
                    {selectedPartner.trustSurfaceNotes ? (
                      <div>
                        <span>Trust surface</span>
                        <p>{selectedPartner.trustSurfaceNotes}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {selectedPartner.boundaryRules.length > 0 ? (
                  <section className="partner-subsection">
                    <h3>Active boundary rules</h3>
                    {selectedPartner.boundaryRules.map((rule) => (
                      <div key={rule.id}>
                        <strong>{rule.title}</strong>
                        <p>{rule.description}</p>
                        <span>
                          {label(rule.ruleType)} / {label(rule.severity)} / review{" "}
                          {formatDate(rule.reviewAt)}
                        </span>
                      </div>
                    ))}
                  </section>
                ) : null}

                <section className="partner-subsection">
                  <h3>Mapped PEOs</h3>
                  {selectedPartner.peos.length === 0 ? (
                    <p>No PEOs mapped to this CSM yet.</p>
                  ) : (
                    selectedPartner.peos.map((peo) => (
                      <div key={peo.id}>
                        <strong>{peo.name}</strong>
                        <p>{peo.nextSafestAction}</p>
                        <span>
                          {label(peo.readinessLevel)} readiness /{" "}
                          {label(peo.permissionState)}
                        </span>
                        {peo.boundaryRules.length > 0 ? (
                          <div className="partner-card__badges">
                            {peo.boundaryRules.map((rule) => (
                              <Badge
                                key={rule.id}
                                tone={boundarySeverityTone(rule.severity)}
                              >
                                {rule.title}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </section>

                <section className="partner-subsection">
                  <h3>Open promises</h3>
                  {selectedPartner.followUpPromises.length === 0 ? (
                    <p>No open promises for this CSM.</p>
                  ) : (
                    selectedPartner.followUpPromises.map((promise) => (
                      <div key={promise.id}>
                        <strong>{promise.promise}</strong>
                        <p>Made to {promise.madeTo}</p>
                        <span>Due {formatDate(promise.dueAt)}</span>
                      </div>
                    ))
                  )}
                </section>

                <form action={createPeoRecord} className="partner-form-block">
                  <input name="returnTo" type="hidden" value={currentPath} />
                  <input name="csmPartnerId" type="hidden" value={selectedPartner.id} />
                  <h3>Add PEO</h3>
                  <Field htmlFor="peoNameCreate" label="PEO name" name="name" required>
                    <Input id="peoNameCreate" name="name" required />
                  </Field>
                  <Field htmlFor="peoWebsiteCreate" label="Website" name="website">
                    <Input id="peoWebsiteCreate" name="website" type="url" />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field
                      htmlFor="peoReadinessCreate"
                      label="Readiness"
                      name="readinessLevel"
                      required
                    >
                      <Select
                        id="peoReadinessCreate"
                        name="readinessLevel"
                        defaultValue={HmlValue.MEDIUM}
                      >
                        {hmlOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      htmlFor="peoProtectivenessCreate"
                      label="Protectiveness"
                      name="protectivenessLevel"
                      required
                    >
                      <Select
                        id="peoProtectivenessCreate"
                        name="protectivenessLevel"
                        defaultValue={HmlValue.MEDIUM}
                      >
                        {hmlOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      htmlFor="peoBoundaryCreate"
                      label="Boundary risk"
                      name="boundaryRisk"
                      required
                    >
                      <Select
                        id="peoBoundaryCreate"
                        name="boundaryRisk"
                        defaultValue={HmlValue.MEDIUM}
                      >
                        {hmlOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      htmlFor="peoPermissionCreate"
                      label="Permission"
                      name="permissionState"
                      required
                    >
                      <Select
                        id="peoPermissionCreate"
                        name="permissionState"
                        defaultValue={PermissionState.CSM_CONTEXT_NEEDED}
                      >
                        {permissionOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      htmlFor="peoConfidenceCreate"
                      label="Confidence"
                      name="sourceConfidence"
                      required
                    >
                      <Select
                        id="peoConfidenceCreate"
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
                  <Field
                    htmlFor="peoNextActionCreate"
                    label="Next safest action"
                    name="nextSafestAction"
                    required
                  >
                    <Textarea id="peoNextActionCreate" name="nextSafestAction" required />
                  </Field>
                  <Field
                    htmlFor="peoResearchCreate"
                    label="Public research summary"
                    name="publicResearchSummary"
                  >
                    <Textarea id="peoResearchCreate" name="publicResearchSummary" />
                  </Field>
                  <Field
                    htmlFor="peoIndustryCreate"
                    label="Industry focus"
                    name="industryFocus"
                  >
                    <Input id="peoIndustryCreate" name="industryFocus" />
                  </Field>
                  <Field
                    htmlFor="peoClientBaseCreate"
                    label="Client base notes"
                    name="clientBaseNotes"
                  >
                    <Textarea
                      id="peoClientBaseCreate"
                      name="clientBaseNotes"
                      placeholder="Use anonymized descriptions. Do not enter client names here."
                    />
                  </Field>
                  <Field
                    htmlFor="peoFitCreate"
                    label="Global fit signals"
                    name="globalFitSignals"
                  >
                    <Textarea id="peoFitCreate" name="globalFitSignals" />
                  </Field>
                  <Field
                    htmlFor="peoOffLimitsCreate"
                    label="Off-limits summary"
                    name="offLimitsSummary"
                  >
                    <Textarea id="peoOffLimitsCreate" name="offLimitsSummary" />
                  </Field>
                  <Button disabled={!databaseReady || !access.canWrite} type="submit">
                    Add PEO
                  </Button>
                </form>

                <form action={createFollowUpPromise} className="partner-form-block">
                  <input name="returnTo" type="hidden" value={currentPath} />
                  <input name="csmPartnerId" type="hidden" value={selectedPartner.id} />
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
                  <Field htmlFor="promisePeoCreate" label="Related PEO" name="peoId">
                    <Select id="promisePeoCreate" name="peoId">
                      <option value="">CSM-level promise</option>
                      {selectedPartner.peos.map((peo) => (
                        <option key={peo.id} value={peo.id}>
                          {peo.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
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
                        {sensitivityOptions.map((option) => (
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
                <p className="eyebrow">Selected Partner Room</p>
                <h2>No CSM selected</h2>
                <p>Create or select a CSM partner before mapping PEOs and promises.</p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
