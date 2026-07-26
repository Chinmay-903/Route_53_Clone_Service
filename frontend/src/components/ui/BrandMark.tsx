/**
 * The application's logomark.
 *
 * Original geometry, not an AWS asset: three nodes resolving to one, which is
 * what a resolver does. Drawn with `currentColor` so it inherits whatever
 * surface it sits on and needs no dark-mode variant.
 */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Route 53 Console Clone"
    >
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="1.5" opacity="0.28" />
      <path
        d="M6.5 9.5h7.2M6.5 16h5.1M6.5 22.5h7.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M13.7 9.5c4 0 4 6.5 7.4 6.5M11.6 16h9.5M13.7 22.5c4 0 4-6.5 7.4-6.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.72"
      />
      <circle cx="23.2" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

/** Wordmark used in the top navigation and on the login screen. */
export function BrandLockup({ size = 28 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-s)',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        color: 'inherit',
      }}
    >
      <BrandMark size={size} />
      <span>Route 53</span>
    </span>
  );
}
