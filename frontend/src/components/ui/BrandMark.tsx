'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/cn';

/**
 * The application's logomark.
 *
 * Original geometry, not an AWS asset: three queries entering on the left,
 * resolving through a routing lattice, and leaving as one answer on the right —
 * which is what a resolver does. Drawn with `currentColor` so it inherits
 * whatever surface it sits on and needs no dark-mode variant.
 */
export function BrandMark({
  size = 32,
  className,
  /** Draws the paths on mount. Used once, on the login screen. */
  animate = false,
}: {
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const Path = animate ? motion.path : 'path';
  const Circle = animate ? motion.circle : 'circle';

  const draw = animate
    ? {
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
      }
    : {};

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Route 53 Console"
      className={cn('shrink-0', className)}
    >
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="1.5" opacity="0.22" />

      {/* The three incoming queries. */}
      <Path
        d="M6.5 9.5h7.2M6.5 16h5.1M6.5 22.5h7.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        {...draw}
        {...(animate && { transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } })}
      />

      {/* The lattice they resolve through. */}
      <Path
        d="M13.7 9.5c4 0 4 6.5 7.4 6.5M11.6 16h9.5M13.7 22.5c4 0 4-6.5 7.4-6.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
        {...draw}
        {...(animate && {
          transition: { duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] },
        })}
      />

      {/* The single answer. */}
      <Circle
        cx="23.2"
        cy="16"
        r="3"
        fill="currentColor"
        {...(animate && {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { delay: 1, type: 'spring', stiffness: 400, damping: 16 },
          style: { transformOrigin: '23.2px 16px' },
        })}
      />
    </svg>
  );
}

/** Wordmark used in the sidebar, the top bar, and on the login screen. */
export function BrandLockup({
  size = 26,
  className,
  showSubtitle = false,
}: {
  size?: number;
  className?: string;
  /** Adds the "Console" line beneath the wordmark. */
  showSubtitle?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <span className="text-brand">
        <BrandMark size={size} />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-md font-semibold tracking-tight">Route 53</span>
        {showSubtitle && (
          <span className="mt-1 text-2xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            Console
          </span>
        )}
      </span>
    </span>
  );
}
