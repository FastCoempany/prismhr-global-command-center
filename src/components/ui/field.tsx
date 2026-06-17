import * as React from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  name: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
};

export function Field({ label, name, children, hint, required }: FieldProps) {
  return (
    <label className="grid gap-1.5" htmlFor={name}>
      <span className="text-sm font-semibold leading-5 text-[color:var(--color-ink)]">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="text-xs font-semibold leading-4 text-[color:var(--color-ink-support)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-9 rounded-md border border-[color:var(--color-control-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm leading-5 text-[color:var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 rounded-md border border-[color:var(--color-control-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm leading-5 text-[color:var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-9 rounded-md border border-[color:var(--color-control-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm font-semibold leading-5 text-[color:var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]",
        className,
      )}
      {...props}
    />
  );
}
