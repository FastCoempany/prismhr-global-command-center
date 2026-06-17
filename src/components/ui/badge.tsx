import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("ds-chip", {
  variants: {
    tone: {
      default: "",
      low: "ds-chip--green",
      medium: "ds-chip--amber",
      high: "ds-chip--red",
      unknown: "ds-chip--blue",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}
