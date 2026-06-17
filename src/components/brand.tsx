type ProductMarkProps = {
  className?: string;
  size?: number;
};

function strokeForSize(size: number) {
  if (size <= 16) return 2.6;
  if (size <= 20) return 2.35;
  if (size <= 24) return 2.1;
  return 2;
}

export function ProductMark({ className, size = 24 }: ProductMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      strokeWidth={strokeForSize(size)}
      viewBox="0 0 48 48"
      width={size}
    >
      <path d="M8 14h32M8 24h32M8 34h32" opacity="0.42" />
      <path d="M10 35c6-12 13-10 18-19 3-5 7-6 10-5" />
      <circle cx="28" cy="16" fill="var(--ds-orange)" r="3.2" stroke="none" />
      <path d="M34 11h6v6" stroke="var(--ds-blue)" />
    </svg>
  );
}

export function ProductLockup() {
  return (
    <span className="product-lockup" aria-label="Field Signal">
      <ProductMark size={24} />
      <span className="product-lockup__name">Field Signal</span>
    </span>
  );
}
