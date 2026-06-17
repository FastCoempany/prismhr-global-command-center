import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-[22px] items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-bold leading-4 text-[color:var(--color-ink)]",
  {
    variants: {
      tone: {
        default:
          "border-[color:var(--color-control-border)] bg-[color:var(--color-surface)]",
        low: "border-[color:var(--color-low-border)] bg-[color:var(--color-low-bg)]",
        medium:
          "border-[color:var(--color-medium-border)] bg-[color:var(--color-medium-bg)]",
        high: "border-[color:var(--color-high-border)] bg-[color:var(--color-high-bg)]",
        unknown:
          "border-[color:var(--color-unknown-border)] bg-[color:var(--color-unknown-bg)]",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}
