import { forwardRef } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

import { cn } from '@/lib/cn';

const badge = tv({
  base: [
    'inline-flex items-center gap-1 whitespace-nowrap',
    'rounded-md border font-medium',
    'transition-colors duration-150',
  ],
  variants: {
    tone: {
      neutral: 'border-line bg-surface-inset text-ink-secondary',
      brand: 'border-line-accent bg-brand-wash text-brand',
      success: 'border-success-border bg-success-wash text-success',
      warning: 'border-warning-border bg-warning-wash text-warning',
      danger: 'border-danger-border bg-danger-wash text-danger',
      info: 'border-info-border bg-info-wash text-info',
      /** No fill — for use inside an already-tinted row. */
      outline: 'border-line-strong bg-transparent text-ink-muted',
    },
    size: {
      sm: 'h-5 px-1.5 text-2xs',
      md: 'h-6 px-2 text-xs',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, size, ...props },
  ref,
) {
  return <span ref={ref} className={cn(badge({ tone, size }), className)} {...props} />;
});

/**
 * A status dot with a label.
 *
 * Colour alone would carry the meaning for most readers but not for all of
 * them, so the label is required rather than optional — the dot is the
 * decoration, the word is the information.
 */
export function StatusDot({
  tone = 'neutral',
  children,
  pulse,
  className,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
  children: React.ReactNode;
  /** Adds an expanding halo. Reserved for genuinely live states. */
  pulse?: boolean;
  className?: string;
}) {
  const colour = {
    neutral: 'bg-ink-faint',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
    brand: 'bg-brand',
  }[tone];

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm text-ink-secondary', className)}>
      <span className="relative flex size-2 shrink-0" aria-hidden="true">
        {pulse && (
          <span className={cn('absolute inset-0 rounded-full animate-pulse-ring', colour)} />
        )}
        <span className={cn('relative size-2 rounded-full', colour)} />
      </span>
      {children}
    </span>
  );
}

/**
 * The per-type chip used throughout the records table.
 *
 * Each DNS record type gets a stable hue, so a reader learns to spot MX or
 * CNAME by colour after a few minutes without ever being told to. The hues are
 * fixed here rather than derived from a hash, because a hash would reassign
 * them whenever the type list changed.
 */
const RECORD_TYPE_TONE: Record<string, string> = {
  A: 'text-[#2563eb] bg-[#2563eb]/10 border-[#2563eb]/25',
  AAAA: 'text-[#7c3aed] bg-[#7c3aed]/10 border-[#7c3aed]/25',
  CNAME: 'text-[#0891b2] bg-[#0891b2]/10 border-[#0891b2]/25',
  TXT: 'text-[#65758b] bg-[#65758b]/10 border-[#65758b]/25',
  MX: 'text-[#c2410c] bg-[#c2410c]/10 border-[#c2410c]/25',
  NS: 'text-[#059669] bg-[#059669]/10 border-[#059669]/25',
  PTR: 'text-[#a16207] bg-[#a16207]/10 border-[#a16207]/25',
  SRV: 'text-[#db2777] bg-[#db2777]/10 border-[#db2777]/25',
  CAA: 'text-[#4f46e5] bg-[#4f46e5]/10 border-[#4f46e5]/25',
  SOA: 'text-[#475569] bg-[#475569]/10 border-[#475569]/25',
};

/** The dark-mode counterparts, lifted for contrast against a near-black card. */
const RECORD_TYPE_TONE_DARK: Record<string, string> = {
  A: 'dark:text-[#7ab0ff] dark:bg-[#7ab0ff]/12 dark:border-[#7ab0ff]/25',
  AAAA: 'dark:text-[#b79bff] dark:bg-[#b79bff]/12 dark:border-[#b79bff]/25',
  CNAME: 'dark:text-[#4fd1e8] dark:bg-[#4fd1e8]/12 dark:border-[#4fd1e8]/25',
  TXT: 'dark:text-[#a7b4c6] dark:bg-[#a7b4c6]/12 dark:border-[#a7b4c6]/25',
  MX: 'dark:text-[#ff9f5a] dark:bg-[#ff9f5a]/12 dark:border-[#ff9f5a]/25',
  NS: 'dark:text-[#42d99b] dark:bg-[#42d99b]/12 dark:border-[#42d99b]/25',
  PTR: 'dark:text-[#e0b13c] dark:bg-[#e0b13c]/12 dark:border-[#e0b13c]/25',
  SRV: 'dark:text-[#ff7ab8] dark:bg-[#ff7ab8]/12 dark:border-[#ff7ab8]/25',
  CAA: 'dark:text-[#8b7ff5] dark:bg-[#8b7ff5]/12 dark:border-[#8b7ff5]/25',
  SOA: 'dark:text-[#93a3b8] dark:bg-[#93a3b8]/12 dark:border-[#93a3b8]/25',
};

export function RecordTypeBadge({ type, className }: { type: string; className?: string }) {
  const tone = RECORD_TYPE_TONE[type] ?? RECORD_TYPE_TONE.TXT;
  const toneDark = RECORD_TYPE_TONE_DARK[type] ?? RECORD_TYPE_TONE_DARK.TXT;

  return (
    <span
      className={cn(
        'inline-flex h-5.5 items-center rounded-md border px-1.5',
        'font-mono text-2xs font-semibold tracking-wide tabular-nums',
        tone,
        toneDark,
        className,
      )}
    >
      {type}
    </span>
  );
}
