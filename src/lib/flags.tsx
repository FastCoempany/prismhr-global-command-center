// Country flags, drawn as inline SVG — flag EMOJIS render as bare letter pairs
// on Windows, so every flag in the app is vector art. Codes are ISO-3166
// alpha-2 (lowercase). Countries without drawn art fall back to a small navy
// plate showing the code, which still reads as "this row has a country".

import type { ReactNode } from "react";

const VB = { viewBox: "0 0 30 20" } as const;

// prettier-ignore
const ART: Record<string, ReactNode> = {
  ca: (
    <svg {...VB}><rect width="30" height="20" fill="#fff" /><rect width="7.5" height="20" fill="#D52B1E" /><rect x="22.5" width="7.5" height="20" fill="#D52B1E" /><path d="M15 4.2l1 2.6 2.1-.6-.5 2.1 2.1-.3-2.4 2.3.4 1.4-2.2-.4-.1 2.5h-.8l-.1-2.5-2.2.4.4-1.4-2.4-2.3 2.1.3-.5-2.1 2.1.6z" fill="#D52B1E" /></svg>
  ),
  bg: (
    <svg {...VB}><rect width="30" height="20" fill="#fff" /><rect y="6.67" width="30" height="6.66" fill="#00966E" /><rect y="13.33" width="30" height="6.67" fill="#D62612" /></svg>
  ),
  tr: (
    <svg {...VB}><rect width="30" height="20" fill="#E30A17" /><circle cx="11" cy="10" r="5" fill="#fff" /><circle cx="12.5" cy="10" r="4" fill="#E30A17" /><path d="M19.6 8l.7 1.5 1.7.1-1.3 1.1.4 1.6-1.5-.9-1.5.9.4-1.6-1.3-1.1 1.7-.1z" fill="#fff" /></svg>
  ),
  mx: (
    <svg {...VB}><rect width="30" height="20" fill="#fff" /><rect width="10" height="20" fill="#006847" /><rect x="20" width="10" height="20" fill="#CE1126" /><circle cx="15" cy="10" r="2.3" fill="#8a6d3b" /></svg>
  ),
  gb: (
    <svg {...VB}><rect width="30" height="20" fill="#012169" /><path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth="4" /><path d="M0 0l30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.6" /><path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6.5" /><path d="M15 0v20M0 10h30" stroke="#C8102E" strokeWidth="3.6" /></svg>
  ),
  in: (
    <svg {...VB}><rect width="30" height="6.67" fill="#FF9933" /><rect y="6.67" width="30" height="6.66" fill="#fff" /><rect y="13.33" width="30" height="6.67" fill="#138808" /><circle cx="15" cy="10" r="2.4" fill="none" stroke="#000080" strokeWidth=".9" /></svg>
  ),
  de: (
    <svg {...VB}><rect width="30" height="6.67" fill="#000" /><rect y="6.67" width="30" height="6.66" fill="#DD0000" /><rect y="13.33" width="30" height="6.67" fill="#FFCE00" /></svg>
  ),
  ph: (
    <svg {...VB}><rect width="30" height="10" fill="#0038A8" /><rect y="10" width="30" height="10" fill="#CE1126" /><path d="M0 0l11 10L0 20z" fill="#fff" /><circle cx="4" cy="10" r="1.8" fill="#FCD116" /></svg>
  ),
  bs: (
    <svg {...VB}><rect width="30" height="20" fill="#FFC72C" /><rect width="30" height="6.67" fill="#00778B" /><rect y="13.33" width="30" height="6.67" fill="#00778B" /><path d="M0 0l10 10L0 20z" fill="#000" /></svg>
  ),
};

// The book's research names countries in prose — map the ones we act on.
const NAME_TO_CODE: Record<string, string> = {
  canada: "ca",
  bulgaria: "bg",
  turkey: "tr",
  mexico: "mx",
  "united kingdom": "gb",
  uk: "gb",
  india: "in",
  germany: "de",
  philippines: "ph",
  bahamas: "bs",
};

export function countryCode(name: string): string {
  return NAME_TO_CODE[name.trim().toLowerCase()] ?? "";
}

// The flag list the manual picker offers — the countries this book actually
// touches, most-likely first.
export const PICKER_CODES = ["ca", "mx", "gb", "in", "bg", "de", "tr", "ph"];

export const CODE_TO_NAME: Record<string, string> = {
  ca: "Canada",
  bg: "Bulgaria",
  tr: "Turkey",
  mx: "Mexico",
  gb: "United Kingdom",
  in: "India",
  de: "Germany",
  ph: "Philippines",
  bs: "Bahamas",
};

export function CountryFlag({
  code,
  title,
  className,
}: {
  code: string;
  title?: string;
  className?: string;
}) {
  const c = code.toLowerCase();
  const art = ART[c];
  return (
    <span className={className} title={title ?? CODE_TO_NAME[c] ?? c.toUpperCase()}>
      {art ?? (
        <svg {...VB}>
          <rect width="30" height="20" rx="2" fill="#0a1c40" />
          <text
            x="15"
            y="14.5"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#fff"
            fontFamily="Arial, sans-serif"
          >
            {c.toUpperCase()}
          </text>
        </svg>
      )}
    </span>
  );
}
