import Link from "next/link";
import { redirect } from "next/navigation";
import { HmlCategory, HmlValue, SourceConfidence } from "@/generated/prisma/client";
import { AppWayfinder } from "@/components/app-wayfinder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { signOut } from "@/app/auth/actions";
import { getAppAccess } from "@/lib/auth";
import { formatContributingSignal, humanizeEnum as label } from "@/lib/format";
import { hmlTone } from "@/lib/hml-priority";
import { getSignalFeedData, parseSignalFeedFilters } from "./data";

export const dynamic = "force-dynamic";

const hmlOptions = Object.values(HmlValue);
const categoryOptions = Object.values(HmlCategory);
const confidenceOptions = Object.values(SourceConfidence);

function confidenceTone(value: SourceConfidence) {
  if (value === SourceConfidence.CONFIRMED || value === SourceConfidence.STRONG) {
    return "low";
  }
  if (value === SourceConfidence.MEDIUM || value === SourceConfidence.INFERRED) {
    return "medium";
  }
  return "unknown";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

type SignalFeedPageProps = {
  searchParams?: Promise<{
    category?: string;
    confidence?: string;
    hml?: string;
    q?: string;
  }>;
};

export default async function SignalFeedPage({ searchParams }: SignalFeedPageProps) {
  const params = searchParams ? await searchParams : {};
  const access = await getAppAccess();

  if (access.status !== "active") {
    redirect("/login?next=/signal-feed");
  }

  const filters = parseSignalFeedFilters(params);
  const { counts, databaseReady, error, limit, signals, total } =
    await getSignalFeedData(filters);

  return (
    <main className="app-shell">
      <AppWayfinder
        current="Signal Feed"
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
            <p className="eyebrow">HML Signal Feed</p>
            <h1>Explain what is high, medium, and low attention.</h1>
            <p className="page-lede">
              HML is the operating signal layer: priority, confidence, explanation, source
              linkage, and next safest action.
            </p>
          </div>
          {!databaseReady ? <Badge tone="medium">Signals unavailable</Badge> : null}
        </header>

        <section className="signal-summary" aria-label="HML signal counts">
          <div>
            <span>High</span>
            <strong>{counts.HIGH}</strong>
          </div>
          <div>
            <span>Medium</span>
            <strong>{counts.MEDIUM}</strong>
          </div>
          <div>
            <span>Low</span>
            <strong>{counts.LOW}</strong>
          </div>
          <div>
            <span>Visible</span>
            <strong>
              {total} of latest {limit}
            </strong>
          </div>
        </section>

        <form action="/signal-feed" className="prospect-controls">
          <Field label="Find signal" name="q">
            <Input
              id="q"
              name="q"
              placeholder="Company, explanation, contributing signal"
              type="search"
              defaultValue={filters.q ?? ""}
            />
          </Field>
          <Field label="HML priority" name="hml">
            <Select id="hml" name="hml" defaultValue={filters.hml ?? ""}>
              <option value="">All priorities</option>
              {hmlOptions.map((option) => (
                <option key={option} value={option}>
                  {label(option)}
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
            <Link className="ds-btn ds-btn--secondary" href="/signal-feed">
              Reset
            </Link>
          </div>
        </form>

        {!databaseReady ? (
          <section className="ds-card ds-card--edge-amber">
            <span aria-hidden="true" className="ds-gauge ds-gauge--amber" />
            <div className="ds-card__body">
              <h2 className="ds-heading--title">Signal records are unavailable</h2>
              <p className="ds-card__copy">{error}</p>
            </div>
          </section>
        ) : null}

        <section className="signal-feed-list" aria-label="HML signals">
          {signals.length === 0 ? (
            <section className="ds-card ds-card--edge-blue">
              <span aria-hidden="true" className="ds-gauge ds-gauge--blue" />
              <div className="ds-card__body">
                <h2 className="ds-heading--title">No matching signals</h2>
                <p className="ds-card__copy">
                  Signals appear after records include source, permission, and action
                  context.
                </p>
              </div>
            </section>
          ) : (
            signals.map((signal) => {
              const signalLabel =
                signal.account?.companyName ??
                signal.csmPartner?.name ??
                signal.peo?.name ??
                signal.opportunity?.name ??
                "Unlinked signal";
              const signalPath = signal.account
                ? `/prospect-field?${new URLSearchParams({
                    accountId: signal.account.id,
                  }).toString()}`
                : signal.opportunity
                  ? `/opportunities?${new URLSearchParams({
                      opportunityId: signal.opportunity.id,
                    }).toString()}`
                  : signal.csmPartner
                    ? `/partners?${new URLSearchParams({
                        partnerId: signal.csmPartner.id,
                      }).toString()}`
                    : signal.peo?.csmPartnerId
                      ? `/partners?${new URLSearchParams({
                          partnerId: signal.peo.csmPartnerId,
                        }).toString()}`
                      : null;

              return (
                <article className="signal-card" key={signal.id}>
                  <div className="signal-card__head">
                    <div>
                      <p className="eyebrow">{label(signal.category)}</p>
                      <h2>{signalLabel}</h2>
                    </div>
                    <div className="signal-card__badges">
                      <Badge tone={hmlTone(signal.classification)}>
                        {label(signal.classification)}
                      </Badge>
                      <Badge tone={confidenceTone(signal.confidence)}>
                        {label(signal.confidence)}
                      </Badge>
                    </div>
                  </div>

                  <p className="signal-card__explanation">{signal.explanation}</p>

                  <div className="signal-card__next">
                    <span>Next safest action</span>
                    <strong>{signal.recommendedNextAction}</strong>
                  </div>

                  <div className="signal-card__meta">
                    <span>{formatDate(signal.createdAt)}</span>
                    <span>Rule {signal.ruleVersion}</span>
                    {signalPath ? <Link href={signalPath}>Open record</Link> : null}
                  </div>

                  {signal.contributingSignals.length > 0 ? (
                    <div className="signal-card__signals">
                      {signal.contributingSignals.map((contributingSignal) => (
                        <Badge key={contributingSignal} tone="unknown">
                          {formatContributingSignal(contributingSignal)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      </section>
    </main>
  );
}
