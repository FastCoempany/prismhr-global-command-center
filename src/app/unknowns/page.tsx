import Link from "next/link";
import { redirect } from "next/navigation";
import {
  HmlValue,
  InternalUnknownStatus,
  SourceConfidence,
  UnknownCategory,
} from "@/generated/prisma/client";
import { AppWayfinder } from "@/components/app-wayfinder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { signOut } from "@/app/auth/actions";
import { getAppAccess } from "@/lib/auth";
import { humanizeEnum as label } from "@/lib/format";
import { hmlTone } from "@/lib/hml-priority";
import { createInternalUnknown, updateInternalUnknown } from "./actions";
import { buildUnknownsPath, getUnknownsData, parseUnknownsFilters } from "./data";

export const dynamic = "force-dynamic";

const categoryOptions = Object.values(UnknownCategory);
const confidenceOptions = Object.values(SourceConfidence);
const riskOptions = Object.values(HmlValue);
const statusOptions = Object.values(InternalUnknownStatus);
const filterStatusOptions = ["ALL", ...statusOptions] as const;

function confidenceTone(value: SourceConfidence) {
  if (value === SourceConfidence.CONFIRMED || value === SourceConfidence.STRONG) {
    return "low";
  }
  if (value === SourceConfidence.MEDIUM || value === SourceConfidence.INFERRED) {
    return "medium";
  }
  return "unknown";
}

function statusTone(
  status: InternalUnknownStatus,
  blocksImplementation: boolean,
): "high" | "low" | "medium" | "unknown" {
  if (blocksImplementation && status === InternalUnknownStatus.OPEN) return "high";
  if (status === InternalUnknownStatus.DECIDED) return "low";
  if (status === InternalUnknownStatus.DEFERRED) return "medium";
  if (status === InternalUnknownStatus.NO_LONGER_RELEVANT) return "unknown";
  return "medium";
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

type UnknownsPageProps = {
  searchParams?: Promise<{
    blocking?: string;
    category?: string;
    confidence?: string;
    created?: string;
    formError?: string;
    q?: string;
    risk?: string;
    status?: string;
    updated?: string;
  }>;
};

export default async function UnknownsPage({ searchParams }: UnknownsPageProps) {
  const params = searchParams ? await searchParams : {};
  const access = await getAppAccess();

  if (access.status !== "active") {
    redirect("/login?next=/unknowns");
  }

  const filters = parseUnknownsFilters(params);
  const { accountOptions, counts, databaseReady, error, limit, unknowns } =
    await getUnknownsData(filters);
  const currentPath = buildUnknownsPath(filters);

  return (
    <main className="app-shell">
      <AppWayfinder
        current="Unknowns"
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
            <p className="eyebrow">Internal Unknowns</p>
            <h1>Keep unresolved facts from becoming operating assumptions.</h1>
            <p className="page-lede">
              Unknowns are product, permission, source, and territory risks. Track the
              current best answer, the source needed, whether implementation is blocked,
              and the related prospect when one exists.
            </p>
          </div>
          {!databaseReady ? <Badge tone="medium">Unknowns unavailable</Badge> : null}
        </header>

        <section className="signal-summary" aria-label="Internal unknown counts">
          <div>
            <span>Open</span>
            <strong>{counts.open}</strong>
          </div>
          <div>
            <span>Blocking</span>
            <strong>{counts.blockingOpen}</strong>
          </div>
          <div>
            <span>High Risk</span>
            <strong>{counts.highRiskOpen}</strong>
          </div>
          <div>
            <span>Visible</span>
            <strong>
              {counts.visible} of latest {limit}
            </strong>
          </div>
        </section>

        <form action="/unknowns" className="prospect-controls">
          <Field label="Find unknown" name="q">
            <Input
              id="q"
              name="q"
              placeholder="Question, answer, source, prospect"
              type="search"
              defaultValue={filters.q ?? ""}
            />
          </Field>
          <Field label="Status" name="status">
            <Select id="status" name="status" defaultValue={filters.status}>
              {filterStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All statuses" : label(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Blocking" name="blocking">
            <Select id="blocking" name="blocking" defaultValue={filters.blocking ?? ""}>
              <option value="">All</option>
              <option value="blocking">Blocks implementation</option>
              <option value="not-blocking">Does not block</option>
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
          <Field label="Risk" name="risk">
            <Select id="risk" name="risk" defaultValue={filters.risk ?? ""}>
              <option value="">All risk</option>
              {riskOptions.map((option) => (
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
            <Link className="ds-btn ds-btn--secondary" href="/unknowns">
              Reset
            </Link>
          </div>
        </form>

        {!databaseReady ? (
          <section className="ds-card ds-card--edge-amber">
            <span aria-hidden="true" className="ds-gauge ds-gauge--amber" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Unknown records are unavailable</h2>
              <p className="ds-card__copy">{error}</p>
            </div>
          </section>
        ) : null}

        {params.formError ? (
          <section className="ds-card ds-card--edge-red">
            <span aria-hidden="true" className="ds-gauge ds-gauge--red" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Unknown not saved</h2>
              <p className="ds-card__copy">{params.formError}</p>
            </div>
          </section>
        ) : null}

        {params.created ? (
          <section className="ds-card ds-card--edge-green">
            <span aria-hidden="true" className="ds-gauge ds-gauge--green" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Unknown created</h2>
              <p className="ds-card__copy">The unresolved fact is now visible.</p>
            </div>
          </section>
        ) : null}

        {params.updated ? (
          <section className="ds-card ds-card--edge-green">
            <span aria-hidden="true" className="ds-gauge ds-gauge--green" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Unknown updated</h2>
              <p className="ds-card__copy">
                Status, risk, confidence, and source need were refreshed.
              </p>
            </div>
          </section>
        ) : null}

        <div className="unknowns-grid">
          <section className="unknowns-list" aria-label="Internal unknown records">
            {unknowns.length === 0 ? (
              <section className="ds-card ds-card--edge-blue">
                <span aria-hidden="true" className="ds-gauge ds-gauge--blue" />
                <div className="ds-card__body">
                  <h2 className="ds-heading--title">No matching unknowns</h2>
                  <p className="ds-card__copy">
                    Create unknowns when a fact affects source quality, permission,
                    implementation, or prospecting motion.
                  </p>
                </div>
              </section>
            ) : (
              unknowns.map((unknown) => {
                const relatedProspectPath = unknown.relatedAccount
                  ? `/prospect-field?${new URLSearchParams({
                      accountId: unknown.relatedAccount.id,
                    }).toString()}`
                  : null;

                return (
                  <article
                    className="unknown-card"
                    id={`unknown-${unknown.id}`}
                    key={unknown.id}
                  >
                    <div className="unknown-card__head">
                      <div>
                        <p className="eyebrow">{label(unknown.category)}</p>
                        <h2>{unknown.question}</h2>
                      </div>
                      <div className="unknown-card__badges">
                        <Badge
                          tone={statusTone(unknown.status, unknown.blocksImplementation)}
                        >
                          {label(unknown.status)}
                        </Badge>
                        <Badge tone={hmlTone(unknown.riskLevel)}>
                          {label(unknown.riskLevel)} Risk
                        </Badge>
                        <Badge tone={confidenceTone(unknown.confidence)}>
                          {label(unknown.confidence)}
                        </Badge>
                      </div>
                    </div>

                    <div className="unknown-card__facts">
                      <div>
                        <span>Current best answer</span>
                        <p>{unknown.currentBestAnswer ?? "No answer recorded yet."}</p>
                      </div>
                      <div>
                        <span>Source needed</span>
                        <p>{unknown.sourceNeeded ?? "Source need not recorded."}</p>
                      </div>
                      <div>
                        <span>Due</span>
                        <p>{formatDate(unknown.dueAt)}</p>
                      </div>
                      <div>
                        <span>Related prospect</span>
                        <p>
                          {relatedProspectPath && unknown.relatedAccount ? (
                            <Link href={relatedProspectPath}>
                              {unknown.relatedAccount.companyName}
                            </Link>
                          ) : (
                            "Not linked"
                          )}
                        </p>
                      </div>
                      <div>
                        <span>Implementation</span>
                        <p>
                          {unknown.blocksImplementation
                            ? "Blocks implementation"
                            : "Tracked, not blocking"}
                        </p>
                      </div>
                    </div>

                    <form action={updateInternalUnknown} className="unknown-card__form">
                      <input name="id" type="hidden" value={unknown.id} />
                      <input name="returnTo" type="hidden" value={currentPath} />
                      <Field
                        htmlFor={`question-${unknown.id}`}
                        label="Question"
                        name="question"
                        required
                      >
                        <Textarea
                          id={`question-${unknown.id}`}
                          name="question"
                          required
                          defaultValue={unknown.question}
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Field
                          htmlFor={`status-${unknown.id}`}
                          label="Status"
                          name="status"
                          required
                        >
                          <Select
                            id={`status-${unknown.id}`}
                            name="status"
                            defaultValue={unknown.status}
                          >
                            {statusOptions.map((option) => (
                              <option key={option} value={option}>
                                {label(option)}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field
                          htmlFor={`risk-${unknown.id}`}
                          label="Risk"
                          name="riskLevel"
                          required
                        >
                          <Select
                            id={`risk-${unknown.id}`}
                            name="riskLevel"
                            defaultValue={unknown.riskLevel}
                          >
                            {riskOptions.map((option) => (
                              <option key={option} value={option}>
                                {label(option)}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field
                          htmlFor={`confidence-${unknown.id}`}
                          label="Confidence"
                          name="confidence"
                          required
                        >
                          <Select
                            id={`confidence-${unknown.id}`}
                            name="confidence"
                            defaultValue={unknown.confidence}
                          >
                            {confidenceOptions.map((option) => (
                              <option key={option} value={option}>
                                {label(option)}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field
                          htmlFor={`category-${unknown.id}`}
                          label="Category"
                          name="category"
                          required
                        >
                          <Select
                            id={`category-${unknown.id}`}
                            name="category"
                            defaultValue={unknown.category}
                          >
                            {categoryOptions.map((option) => (
                              <option key={option} value={option}>
                                {label(option)}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          htmlFor={`answer-${unknown.id}`}
                          label="Current best answer"
                          name="currentBestAnswer"
                        >
                          <Textarea
                            id={`answer-${unknown.id}`}
                            name="currentBestAnswer"
                            defaultValue={unknown.currentBestAnswer ?? ""}
                          />
                        </Field>
                        <Field
                          htmlFor={`source-${unknown.id}`}
                          label="Source needed"
                          name="sourceNeeded"
                        >
                          <Textarea
                            id={`source-${unknown.id}`}
                            name="sourceNeeded"
                            defaultValue={unknown.sourceNeeded ?? ""}
                          />
                        </Field>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          htmlFor={`related-${unknown.id}`}
                          label="Related prospect"
                          name="relatedAccountId"
                        >
                          <Select
                            id={`related-${unknown.id}`}
                            name="relatedAccountId"
                            defaultValue={unknown.relatedAccountId ?? ""}
                          >
                            <option value="">Not linked</option>
                            {accountOptions.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.companyName} / {account.city}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field
                          htmlFor={`due-${unknown.id}`}
                          label="Due date"
                          name="dueAt"
                        >
                          <Input
                            id={`due-${unknown.id}`}
                            name="dueAt"
                            type="date"
                            defaultValue={dateInputValue(unknown.dueAt)}
                          />
                        </Field>
                      </div>

                      <label className="unknown-checkbox">
                        <input
                          name="blocksImplementation"
                          type="checkbox"
                          defaultChecked={unknown.blocksImplementation}
                        />
                        Blocks implementation
                      </label>

                      <Button disabled={!databaseReady || !access.canWrite} type="submit">
                        Update unknown
                      </Button>
                    </form>
                  </article>
                );
              })
            )}
          </section>

          <aside className="unknown-create-panel">
            <p className="eyebrow">Unknown Intake</p>
            <h2>Create unknown</h2>
            <p>
              Use this when the app should remember a gap instead of hard-coding an
              assumption into workflow or copy.
            </p>

            <form action={createInternalUnknown} className="grid gap-4">
              <input name="returnTo" type="hidden" value={currentPath} />
              <Field label="Question" name="question" required>
                <Textarea
                  id="question"
                  name="question"
                  required
                  placeholder="What remains unresolved?"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field htmlFor="categoryCreate" label="Category" name="category" required>
                  <Select
                    id="categoryCreate"
                    name="category"
                    defaultValue={UnknownCategory.PRODUCT}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {label(option)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field htmlFor="riskCreate" label="Risk" name="riskLevel" required>
                  <Select id="riskCreate" name="riskLevel" defaultValue={HmlValue.MEDIUM}>
                    {riskOptions.map((option) => (
                      <option key={option} value={option}>
                        {label(option)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field
                htmlFor="confidenceCreate"
                label="Confidence"
                name="confidence"
                required
              >
                <Select
                  id="confidenceCreate"
                  name="confidence"
                  defaultValue={SourceConfidence.UNVERIFIED}
                >
                  {confidenceOptions.map((option) => (
                    <option key={option} value={option}>
                      {label(option)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                htmlFor="relatedAccountCreate"
                label="Related prospect"
                name="relatedAccountId"
              >
                <Select id="relatedAccountCreate" name="relatedAccountId">
                  <option value="">Not linked</option>
                  {accountOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.companyName} / {account.city}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                htmlFor="currentBestAnswerCreate"
                label="Current best answer"
                name="currentBestAnswer"
              >
                <Textarea
                  id="currentBestAnswerCreate"
                  name="currentBestAnswer"
                  placeholder="Current answer, if any. Mark low confidence when thin."
                />
              </Field>
              <Field
                htmlFor="sourceNeededCreate"
                label="Source needed"
                name="sourceNeeded"
              >
                <Textarea
                  id="sourceNeededCreate"
                  name="sourceNeeded"
                  placeholder="What would resolve this?"
                />
              </Field>
              <Field htmlFor="dueAtCreate" label="Due date" name="dueAt">
                <Input id="dueAtCreate" name="dueAt" type="date" />
              </Field>
              <label className="unknown-checkbox">
                <input name="blocksImplementation" type="checkbox" />
                Blocks implementation
              </label>
              <Button disabled={!databaseReady || !access.canWrite} type="submit">
                Create unknown
              </Button>
              {!databaseReady ? (
                <p className="text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
                  Unknown records are unavailable right now.
                </p>
              ) : null}
              {!access.canWrite ? (
                <p className="text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
                  Write access is required to create unknowns.
                </p>
              ) : null}
            </form>
          </aside>
        </div>
      </section>
    </main>
  );
}
