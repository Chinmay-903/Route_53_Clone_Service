'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useEffect } from 'react';

import { Skeleton } from '@/components/ui/Skeleton';
import { SpotlightCard } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

/**
 * A headline statistic.
 *
 * The number counts up to its value on first paint. It is a small thing, but it
 * is the difference between a figure that was always there and one the console
 * just finished calculating — and the second reads as live data.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  loading,
  onClick,
  className,
}: {
  label: string;
  /** `null` means the metric does not exist in this build, shown as an em dash. */
  value: number | null;
  hint?: string;
  icon: React.ReactNode;
  tone?: 'brand' | 'success' | 'warning' | 'info' | 'neutral';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const tones = {
    brand: 'border-line-accent bg-brand-wash text-brand',
    success: 'border-success-border bg-success-wash text-success',
    warning: 'border-warning-border bg-warning-wash text-warning',
    info: 'border-info-border bg-info-wash text-info',
    neutral: 'border-line bg-surface-inset text-ink-muted',
  }[tone];

  const body = (
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-lg border [&_svg]:size-[18px]',
            tones,
          )}
          aria-hidden="true"
        >
          {icon}
        </span>

        {onClick && (
          <ArrowUpRight
            className="size-4 text-ink-faint opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
            aria-hidden="true"
          />
        )}
      </div>

      <p className="mt-3.5 text-sm font-medium text-ink-muted">{label}</p>

      {loading ? (
        <Skeleton className="mt-1.5 h-8 w-20" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">
          {value === null ? '—' : <CountUp value={value} />}
        </p>
      )}

      {hint && <p className="mt-1.5 text-xs leading-snug text-ink-faint">{hint}</p>}
    </div>
  );

  if (!onClick) {
    return <SpotlightCard className={cn('group', className)}>{body}</SpotlightCard>;
  }

  return (
    <SpotlightCard className={cn('group', className)}>
      {/*
        A real button, so it is keyboard-reachable and announced as clickable
        without any ARIA patching. Stretched over the card with an inset overlay
        rather than wrapping it, which would put a button inside a button when
        the card holds one.
      */}
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        aria-label={`${label}: ${loading ? 'loading' : (value ?? 'not available')}. ${hint ?? ''}`}
      />
      {body}
    </SpotlightCard>
  );
}

/**
 * Animates an integer from zero to its value.
 *
 * Driven by a motion value rather than React state: a `setState` per frame
 * would re-render the whole card sixty times a second to change three
 * characters.
 */
function CountUp({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 22, mass: 0.8 });
  const rounded = useTransform(spring, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  return (
    <>
      {/*
        The animated span is hidden from assistive technology and a static
        number is exposed instead — otherwise a screen reader announces every
        intermediate value as the count climbs.
      */}
      <motion.span aria-hidden="true" className="tabular-nums">
        {rounded}
      </motion.span>
      <span className="sr-only">{value.toLocaleString()}</span>
    </>
  );
}
