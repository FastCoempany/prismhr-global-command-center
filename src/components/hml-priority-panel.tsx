import { HmlValue } from "@/generated/prisma/client";
import { hmlTone, type HmlPrioritySummary } from "@/lib/hml-priority";
import { humanizeEnum } from "@/lib/format";
import { FieldGlyph } from "@/components/field-glyph";
import { Badge } from "@/components/ui/badge";

type HmlPriorityPanelProps = {
  compact?: boolean;
  emptyText?: string;
  summary: HmlPrioritySummary;
  title?: string;
};

const hmlOrder = [HmlValue.HIGH, HmlValue.MEDIUM, HmlValue.LOW];

export function HmlPriorityPanel({
  compact = false,
  emptyText = "No HML priorities yet. Add a sourced prospect to create the first priority read.",
  summary,
  title = "HML Priority",
}: HmlPriorityPanelProps) {
  const total = Math.max(summary.total, 1);
  const visibleItems = compact ? summary.items.slice(0, 3) : summary.items.slice(0, 5);
  const hasPriorityItems = summary.total > 0;
  const edgeTone = summary.counts.HIGH > 0 ? "red" : "blue";

  return (
    <section
      aria-label="High Medium Low priority meter"
      className={`ds-card ${edgeTone === "red" ? "ds-card--edge-red" : "ds-card--edge-blue"}`}
    >
      <span
        aria-hidden="true"
        className={`ds-gauge ${edgeTone === "red" ? "ds-gauge--red" : "ds-gauge--blue"}`}
      />
      <div className="ds-card__body">
        <div className="ds-card__head">
          <div className="grid gap-1">
            <p className="ds-kicker">Priority meter</p>
            <h2 className="ds-heading--title">{title}</h2>
          </div>
          <Badge tone={summary.counts.HIGH > 0 ? "high" : "unknown"}>
            {hasPriorityItems ? `${summary.counts.HIGH} High` : "No priorities yet"}
          </Badge>
        </div>

        {hasPriorityItems ? (
          <div className="grid gap-3">
            {hmlOrder.map((value) => {
              const count = summary.counts[value];
              const tone =
                value === HmlValue.HIGH
                  ? "red"
                  : value === HmlValue.MEDIUM
                    ? "amber"
                    : "green";
              return (
                <div className={`ds-meter ds-meter--${tone}`} key={value}>
                  <div className="flex items-center justify-between gap-3 text-xs font-bold leading-4">
                    <span>{humanizeEnum(value)}</span>
                    <span>{count}</span>
                  </div>
                  <div className="ds-meter__track">
                    <div
                      aria-hidden="true"
                      className="ds-meter__fill"
                      style={{
                        width: `${Math.max((count / total) * 100, count ? 12 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-2 grid gap-2">
          {visibleItems.length === 0 ? (
            <p className="ds-card__copy">{emptyText}</p>
          ) : (
            visibleItems.map((item) => (
              <a
                className="grid gap-1 rounded-md border border-[color:var(--ds-hair-strong)] bg-[color:var(--ds-surface-sub)] p-3"
                href={item.href ?? "#"}
                key={item.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-bold leading-5">
                    <FieldGlyph accent="blue" name="signal" size={16} />
                    {item.label}
                  </span>
                  <Badge tone={hmlTone(item.classification)}>
                    {humanizeEnum(item.classification)}
                  </Badge>
                </div>
                {!compact ? (
                  <p className="text-xs font-semibold leading-4 text-[color:var(--ds-ink-700)]">
                    {item.explanation}
                  </p>
                ) : null}
                <p className="text-xs font-semibold leading-4 text-[color:var(--ds-blue)]">
                  {humanizeEnum(item.category)} / {humanizeEnum(item.confidence)}
                </p>
              </a>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
