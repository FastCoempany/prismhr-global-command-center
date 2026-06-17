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
    <label className="ds-field" htmlFor={name}>
      <span className="ds-field__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="ds-field__micro">{hint}</span> : null}
    </label>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("ds-input", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("ds-input ds-textarea", className)} {...props} />;
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("ds-input font-semibold", className)} {...props} />;
}
