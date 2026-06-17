import type { CSSProperties } from "react";

type FieldGlyphName =
  | "add"
  | "attention"
  | "evidence"
  | "find"
  | "gauge"
  | "permission"
  | "prospect"
  | "ready"
  | "signal"
  | "trust"
  | "unknown";

type FieldGlyphProps = {
  accent?: "amber" | "blue" | "green" | "orange" | "red";
  className?: string;
  name: FieldGlyphName;
  size?: number;
};

const accentVar = {
  amber: "var(--ds-amber)",
  blue: "var(--ds-blue)",
  green: "var(--ds-green)",
  orange: "var(--ds-orange)",
  red: "var(--ds-red)",
};

export function FieldGlyph({ accent, className, name, size = 20 }: FieldGlyphProps) {
  const style = accent
    ? ({ "--field-glyph-accent": accentVar[accent] } as CSSProperties)
    : undefined;

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      strokeWidth="2"
      style={style}
      viewBox="0 0 24 24"
      width={size}
    >
      {name === "signal" ? (
        <>
          <path d="M4 13a8 8 0 0 1 16 0" />
          <path d="M8 13a4 4 0 0 1 8 0" />
          <circle
            cx="12"
            cy="13"
            fill="var(--field-glyph-accent, currentColor)"
            r="1.7"
            stroke="none"
          />
        </>
      ) : null}
      {name === "gauge" ? (
        <>
          <path d="M6 4v16" stroke="var(--field-glyph-accent, currentColor)" />
          <path d="M11 8h8M11 12h6M11 16h4" />
        </>
      ) : null}
      {name === "prospect" ? (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
          <path d="M8 19c3-7 7-5 9-12" stroke="var(--field-glyph-accent, currentColor)" />
          <circle
            cx="15"
            cy="8"
            fill="var(--field-glyph-accent, currentColor)"
            r="1.5"
            stroke="none"
          />
        </>
      ) : null}
      {name === "trust" ? (
        <>
          <path d="M5 15c3-6 8-6 14-2" />
          <circle cx="5" cy="15" r="2" />
          <circle cx="12" cy="10" r="2" />
          <circle
            cx="19"
            cy="13"
            r="2"
            stroke="var(--field-glyph-accent, currentColor)"
          />
        </>
      ) : null}
      {name === "permission" ? (
        <>
          <path d="M7 12a5 5 0 1 1 5 5" />
          <path d="M13 12h6" stroke="var(--field-glyph-accent, currentColor)" />
        </>
      ) : null}
      {name === "evidence" ? (
        <>
          <path d="M7 4h7l3 3v13H7z" />
          <path d="M14 4v4h4M9 13h6M9 16h4" />
          <circle
            cx="8"
            cy="8"
            fill="var(--field-glyph-accent, currentColor)"
            r="1.4"
            stroke="none"
          />
        </>
      ) : null}
      {name === "unknown" ? (
        <>
          <path d="M8 9a4 4 0 1 1 5 4c-1 .4-1 1-1 2" />
          <path d="M12 18v2" stroke="var(--field-glyph-accent, currentColor)" />
        </>
      ) : null}
      {name === "find" ? (
        <>
          <circle cx="11" cy="11" r="6" />
          <path d="M20 20l-4.5-4.5" />
        </>
      ) : null}
      {name === "add" ? <path d="M12 5v14M5 12h14" /> : null}
      {name === "ready" ? (
        <path d="M5 12.5l4.5 4.5L19 7" stroke="var(--field-glyph-accent, currentColor)" />
      ) : null}
      {name === "attention" ? (
        <>
          <path d="M12 4v10" stroke="var(--field-glyph-accent, currentColor)" />
          <path d="M12 17v2" stroke="var(--field-glyph-accent, currentColor)" />
        </>
      ) : null}
    </svg>
  );
}
