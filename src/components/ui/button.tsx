import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-9 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-100",
  {
    variants: {
      variant: {
        primary:
          "border-[color:var(--color-action-primary-border)] bg-[color:var(--color-action-primary)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-action-primary-hover)] focus-visible:outline-[color:var(--color-focus-ring)]",
        secondary:
          "border-[color:var(--color-action-secondary-border)] bg-[color:var(--color-action-secondary)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-action-secondary-hover)] focus-visible:outline-[color:var(--color-focus-ring)]",
        quiet:
          "border-[color:var(--color-control-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-mist)] focus-visible:outline-[color:var(--color-focus-ring)]",
      },
      size: {
        default: "min-h-9",
        compact: "min-h-8 px-2 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
