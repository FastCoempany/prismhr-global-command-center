import { HmlValue } from "@/generated/prisma/client";
import { hmlTone, type HmlPrioritySummary } from "@/lib/hml-priority";
import { humanizeEnum } from "@/lib/format";
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
  emptyText = "Signals appear after records have source, permission, and action context.",
  summary,
  title = "HML Priority",
}: HmlPriorityPanelProps) {
  const total = Math.max(summary.total, 1);
  const visibleItems = compact ? summary.items.slice(0, 3) : summary.items.slice(0, 5);

  return (
    <section
      aria-label="High Medium Low priority meter"
      className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
            Heat meter
          </p>
          <h2 className="text-base font-semibold leading-6">{title}</h2>
        </div>
        <Badge tone={summary.counts.HIGH > 0 ? "high" : "low"}>
          {summary.counts.HIGH} High
        </Badge>
      </div>

      <div className="grid gap-2">
        {hmlOrder.map((value) => {
          const count = summary.counts[value];
          return (
            <div className="grid gap-1" key={value}>
              <div className="flex items-center justify-between gap-3 text-xs font-bold leading-4">
                <span>{humanizeEnum(value)}</span>
                <span>{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-mist)]">
                <div
                  aria-hidden="true"
                  className={`h-full rounded-full ${value === HmlValue.HIGH ? "bg-[color:var(--color-high)]" : value === HmlValue.MEDIUM ? "bg-[color:var(--color-medium)]" : "bg-[color:var(--color-low)]"}`}
                  style={{ width: `${Math.max((count / total) * 100, count ? 12 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2">
        {visibleItems.length === 0 ? (
          <p className="text-sm font-semibold leading-5 text-[color:var(--color-ink-soft)]">
            {emptyText}
          </p>
        ) : (
          visibleItems.map((item) => (
            <a
              className="grid gap-1 rounded-md border border-[color:var(--color-line)] p-3"
              href={item.href ?? "#"}
              key={item.id}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold leading-5">{item.label}</span>
                <Badge tone={hmlTone(item.classification)}>
                  {humanizeEnum(item.classification)}
                </Badge>
              </div>
              {!compact ? (
                <p className="text-xs font-semibold leading-4 text-[color:var(--color-ink-soft)]">
                  {item.explanation}
                </p>
              ) : null}
              <p className="text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
                {humanizeEnum(item.category)} / {humanizeEnum(item.confidence)}
              </p>
            </a>
          ))
        )}
      </div>
    </section>
  );
}
