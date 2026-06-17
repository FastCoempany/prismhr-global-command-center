import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ApprovalStatus,
  CanonStatus,
  PitchAssetType,
  PitchAudience,
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
import { createDiscoveryFramework, createPitchAsset } from "./actions";
import { getPitchRailData, parsePitchRailFilters } from "./data";

export const dynamic = "force-dynamic";

const approvalOptions = Object.values(ApprovalStatus);
const assetTypeOptions = Object.values(PitchAssetType);
const audienceOptions = Object.values(PitchAudience);
const canonOptions = [
  CanonStatus.HYPOTHESIS,
  CanonStatus.INFERENCE,
  CanonStatus.CANON,
  CanonStatus.UNVERIFIED,
];
const confidenceOptions = Object.values(SourceConfidence);
const productOptions = Object.values(ProductRelevance);

function approvalTone(value: ApprovalStatus) {
  if (value === ApprovalStatus.OWNER_APPROVED) return "low";
  if (value === ApprovalStatus.NEEDS_OWNER_REVIEW) return "medium";
  if (value === ApprovalStatus.RETIRED) return "high";
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

function formatLines(lines: string[]) {
  return lines.length > 0 ? lines.join(" / ") : "Not recorded";
}

type PitchRailPageProps = {
  searchParams?: Promise<{
    approval?: string;
    assetCreated?: string;
    assetType?: string;
    audience?: string;
    confidence?: string;
    formError?: string;
    frameworkCreated?: string;
    product?: string;
    q?: string;
  }>;
};

export default async function PitchRailPage({ searchParams }: PitchRailPageProps) {
  const params = searchParams ? await searchParams : {};
  const access = await getAppAccess();

  if (access.status !== "active") {
    redirect("/login?next=/pitch-rail");
  }

  const filters = parsePitchRailFilters(params);
  const { assets, counts, databaseReady, error, frameworks, limit } =
    await getPitchRailData(filters);
  const currentPath = "/pitch-rail";

  return (
    <main className="app-shell">
      <AppWayfinder
        current="Pitch Rail"
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
            <p className="eyebrow">Pitch Rail</p>
            <h1>Keep frameworks and CSM-safe copy approval-aware.</h1>
            <p className="page-lede">
              Pitch Rail holds discovery frameworks, use-case notes, and approved or
              review-needed messaging assets. Draft material stays visibly separate from
              owner-approved copy.
            </p>
          </div>
          {!databaseReady ? <Badge tone="medium">Pitch records unavailable</Badge> : null}
        </header>

        <section className="signal-summary" aria-label="Pitch rail counts">
          <div>
            <span>Frameworks</span>
            <strong>{counts.frameworks}</strong>
          </div>
          <div>
            <span>Assets</span>
            <strong>{counts.assets}</strong>
          </div>
          <div>
            <span>Approved Copy</span>
            <strong>{counts.approvedAssets}</strong>
          </div>
          <div>
            <span>Needs Review</span>
            <strong>{counts.needsReview}</strong>
          </div>
        </section>

        <form action="/pitch-rail" className="prospect-controls">
          <Field label="Find pitch item" name="q">
            <Input
              id="q"
              name="q"
              placeholder="Framework, asset, use case, copy"
              type="search"
              defaultValue={filters.q ?? ""}
            />
          </Field>
          <Field label="Product" name="product">
            <Select id="product" name="product" defaultValue={filters.product ?? ""}>
              <option value="">All products</option>
              {productOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Audience" name="audience">
            <Select id="audience" name="audience" defaultValue={filters.audience ?? ""}>
              <option value="">All audiences</option>
              {audienceOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Approval" name="approval">
            <Select id="approval" name="approval" defaultValue={filters.approval ?? ""}>
              <option value="">All approval</option>
              {approvalOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Asset type" name="assetType">
            <Select
              id="assetType"
              name="assetType"
              defaultValue={filters.assetType ?? ""}
            >
              <option value="">All asset types</option>
              {assetTypeOptions.map((option) => (
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
            <Link className="ds-btn ds-btn--secondary" href="/pitch-rail">
              Reset
            </Link>
          </div>
        </form>

        {!databaseReady ? (
          <section className="ds-card ds-card--edge-amber">
            <span aria-hidden="true" className="ds-gauge ds-gauge--amber" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Pitch records are unavailable</h2>
              <p className="ds-card__copy">{error}</p>
            </div>
          </section>
        ) : null}

        {params.formError ? (
          <section className="ds-card ds-card--edge-red">
            <span aria-hidden="true" className="ds-gauge ds-gauge--red" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Pitch item not saved</h2>
              <p className="ds-card__copy">{params.formError}</p>
            </div>
          </section>
        ) : null}

        {params.frameworkCreated || params.assetCreated ? (
          <section className="ds-card ds-card--edge-green">
            <span aria-hidden="true" className="ds-gauge ds-gauge--green" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Pitch Rail updated</h2>
              <p className="ds-card__copy">
                The framework or asset is now available with approval, source, and canon
                metadata.
              </p>
            </div>
          </section>
        ) : null}

        <div className="partners-grid">
          <section className="partners-column">
            <section className="partner-list" aria-label="Discovery frameworks">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Discovery Frameworks</p>
                  <h2 className="ds-heading--title">
                    Showing {frameworks.length} of {counts.frameworks}; limit {limit}
                  </h2>
                </div>
              </div>
              {frameworks.length === 0 ? (
                <section className="ds-card ds-card--edge-blue">
                  <span aria-hidden="true" className="ds-gauge ds-gauge--blue" />
                  <div className="ds-card__body">
                    <h2 className="ds-heading--title">No matching frameworks</h2>
                    <p className="ds-card__copy">
                      Add frameworks only when product/use-case framing is source-backed.
                    </p>
                  </div>
                </section>
              ) : (
                frameworks.map((framework) => (
                  <article className="partner-card" key={framework.id}>
                    <div className="partner-card__head">
                      <div>
                        <p className="eyebrow">{label(framework.productRelevance)}</p>
                        <h2>{framework.title}</h2>
                      </div>
                      <div className="partner-card__badges">
                        <Badge tone={approvalTone(framework.approvalStatus)}>
                          {label(framework.approvalStatus)}
                        </Badge>
                        <Badge tone={confidenceTone(framework.sourceConfidence)}>
                          {label(framework.sourceConfidence)}
                        </Badge>
                      </div>
                    </div>
                    <p>{framework.useCase}</p>
                    <div className="partner-note-stack">
                      <div>
                        <span>Triggers</span>
                        <p>{formatLines(framework.triggerSignals)}</p>
                      </div>
                      <div>
                        <span>Discovery Questions</span>
                        <p>{formatLines(framework.discoveryQuestions)}</p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="partner-intake-panel">
              <p className="eyebrow">Framework Intake</p>
              <h2>Create discovery framework</h2>
              <form action={createDiscoveryFramework} className="grid gap-4">
                <input name="returnTo" type="hidden" value={currentPath} />
                <PitchMetadataFields prefix="framework" />
                <Field htmlFor="frameworkTitle" label="Title" name="title" required>
                  <Input id="frameworkTitle" name="title" required />
                </Field>
                <Field
                  htmlFor="frameworkUseCase"
                  label="Use case"
                  name="useCase"
                  required
                >
                  <Textarea id="frameworkUseCase" name="useCase" required />
                </Field>
                <Field
                  htmlFor="frameworkTriggers"
                  label="Trigger signals"
                  name="triggerSignals"
                >
                  <Textarea
                    id="frameworkTriggers"
                    name="triggerSignals"
                    placeholder="One per line."
                  />
                </Field>
                <Field
                  htmlFor="frameworkQuestions"
                  label="Discovery questions"
                  name="discoveryQuestions"
                >
                  <Textarea
                    id="frameworkQuestions"
                    name="discoveryQuestions"
                    placeholder="One per line."
                  />
                </Field>
                <Field
                  htmlFor="frameworkDisqualifiers"
                  label="Disqualification signals"
                  name="disqualificationSignals"
                >
                  <Textarea
                    id="frameworkDisqualifiers"
                    name="disqualificationSignals"
                    placeholder="One per line."
                  />
                </Field>
                <Field htmlFor="frameworkDemo" label="Demo focus" name="demoFocus">
                  <Textarea id="frameworkDemo" name="demoFocus" />
                </Field>
                <Field
                  htmlFor="frameworkBoundary"
                  label="Boundary notes"
                  name="boundaryNotes"
                >
                  <Textarea id="frameworkBoundary" name="boundaryNotes" />
                </Field>
                <Button disabled={!databaseReady || !access.canWrite} type="submit">
                  Create framework
                </Button>
              </form>
            </section>
          </section>

          <aside className="partner-detail-panel">
            <section className="partner-subsection" aria-label="Pitch assets">
              <p className="eyebrow">Approved Messaging Assets</p>
              <h2 className="ds-heading--title">Pitch assets</h2>
              {assets.length === 0 ? (
                <p>No matching pitch assets.</p>
              ) : (
                assets.map((asset) => (
                  <div key={asset.id}>
                    <strong>{asset.title}</strong>
                    <p>{asset.content}</p>
                    <div className="partner-card__badges">
                      <Badge tone={approvalTone(asset.approvalStatus)}>
                        {label(asset.approvalStatus)}
                      </Badge>
                      <Badge tone={confidenceTone(asset.sourceConfidence)}>
                        {label(asset.sourceConfidence)}
                      </Badge>
                      <Badge tone="unknown">{label(asset.assetType)}</Badge>
                    </div>
                    {asset.usageNotes ? <p>{asset.usageNotes}</p> : null}
                  </div>
                ))
              )}
            </section>

            <form action={createPitchAsset} className="partner-form-block">
              <input name="returnTo" type="hidden" value={currentPath} />
              <h3>Create pitch asset</h3>
              <PitchMetadataFields prefix="asset" />
              <Field htmlFor="assetType" label="Asset type" name="assetType" required>
                <Select
                  id="assetType"
                  name="assetType"
                  defaultValue={PitchAssetType.CSM_SAFE_BLURB}
                >
                  {assetTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {label(option)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field htmlFor="assetTitle" label="Title" name="title" required>
                <Input id="assetTitle" name="title" required />
              </Field>
              <Field htmlFor="assetContent" label="Content" name="content" required>
                <Textarea id="assetContent" name="content" required />
              </Field>
              <Field htmlFor="assetUsage" label="Usage notes" name="usageNotes">
                <Textarea id="assetUsage" name="usageNotes" />
              </Field>
              <Button disabled={!databaseReady || !access.canWrite} type="submit">
                Create asset
              </Button>
            </form>
          </aside>
        </div>
      </section>
    </main>
  );
}

function PitchMetadataFields({ prefix }: { prefix: "asset" | "framework" }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        htmlFor={`${prefix}Product`}
        label="Product"
        name="productRelevance"
        required
      >
        <Select
          id={`${prefix}Product`}
          name="productRelevance"
          defaultValue={ProductRelevance.CONTRACTOR_MANAGEMENT}
        >
          {productOptions.map((option) => (
            <option key={option} value={option}>
              {label(option)}
            </option>
          ))}
        </Select>
      </Field>
      <Field htmlFor={`${prefix}Audience`} label="Audience" name="audience" required>
        <Select id={`${prefix}Audience`} name="audience" defaultValue={PitchAudience.CSM}>
          {audienceOptions.map((option) => (
            <option key={option} value={option}>
              {label(option)}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        htmlFor={`${prefix}Approval`}
        label="Approval"
        name="approvalStatus"
        required
      >
        <Select
          id={`${prefix}Approval`}
          name="approvalStatus"
          defaultValue={ApprovalStatus.DRAFT}
        >
          {approvalOptions.map((option) => (
            <option key={option} value={option}>
              {label(option)}
            </option>
          ))}
        </Select>
      </Field>
      <Field htmlFor={`${prefix}Canon`} label="Canon" name="canonStatus" required>
        <Select
          id={`${prefix}Canon`}
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
      <Field
        htmlFor={`${prefix}Confidence`}
        label="Confidence"
        name="sourceConfidence"
        required
      >
        <Select
          id={`${prefix}Confidence`}
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
      <Field htmlFor={`${prefix}ApprovedBy`} label="Approved by" name="approvedBy">
        <Input id={`${prefix}ApprovedBy`} name="approvedBy" />
      </Field>
    </div>
  );
}
