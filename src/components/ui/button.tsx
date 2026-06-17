import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("ds-btn", {
  variants: {
    variant: {
      primary: "ds-btn--accent",
      secondary: "ds-btn--primary",
      quiet: "ds-btn--secondary",
    },
    size: {
      default: "",
      compact: "min-h-8 px-2 py-1 text-xs",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
  },
});

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
