'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/cn';
import { duration, easeOut } from '@/lib/motion';

/**
 * The empty state shared by both tables and the placeholder pages.
 *
 * One illustration, one sentence, one action — anything more turns "there is
 * nothing here yet" into something the user has to read.
 *
 * The illustrations are drawn here rather than imported: each one says
 * something specific about the thing that is missing, which stock art cannot.
 * All of them are `aria-hidden`, because the heading beside them carries the
 * meaning and a described decoration is just noise in a screen reader.
 */
export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  variant = 'zones',
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  variant?: 'zones' | 'records' | 'search' | 'build';
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: duration.slow, ease: easeOut }}
      >
        <EmptyMotif variant={variant} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.slow, ease: easeOut, delay: 0.08 }}
        className="mt-5 max-w-[44ch]"
      >
        <h3 className="text-md font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-base leading-relaxed text-ink-muted">{description}</p>
      </motion.div>

      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.slow, ease: easeOut, delay: 0.16 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          {action}
          {secondaryAction}
        </motion.div>
      )}
    </div>
  );
}

function EmptyMotif({ variant }: { variant: 'zones' | 'records' | 'search' | 'build' }) {
  const line = 'var(--border-strong)';
  const faint = 'var(--border)';
  const accent = 'var(--brand)';

  if (variant === 'search') {
    return (
      <svg width="104" height="88" viewBox="0 0 104 88" fill="none" aria-hidden="true">
        <circle cx="44" cy="38" r="22" stroke={line} strokeWidth="2" />
        <circle cx="44" cy="38" r="30" stroke={faint} strokeWidth="1.5" strokeDasharray="3 6" />
        <path d="M61 55l14 14" stroke={accent} strokeWidth="3.5" strokeLinecap="round" />
        {/* An empty result, drawn as a magnifier over nothing. */}
        <path d="M35 38h18" stroke={faint} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'records') {
    return (
      <svg width="116" height="88" viewBox="0 0 116 88" fill="none" aria-hidden="true">
        <rect x="16" y="14" width="84" height="16" rx="5" stroke={line} strokeWidth="1.75" />
        <rect x="16" y="36" width="84" height="16" rx="5" stroke={line} strokeWidth="1.75" />
        <rect
          x="16"
          y="58"
          width="84"
          height="16"
          rx="5"
          stroke={faint}
          strokeWidth="1.75"
          strokeDasharray="5 5"
        />
        <circle cx="28" cy="22" r="3.5" fill={accent} />
        <circle cx="28" cy="44" r="3.5" fill={accent} opacity="0.45" />
        <rect x="40" y="20" width="34" height="4" rx="2" fill={faint} />
        <rect x="40" y="42" width="26" height="4" rx="2" fill={faint} />
      </svg>
    );
  }

  if (variant === 'build') {
    return (
      <svg width="132" height="92" viewBox="0 0 132 92" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="130" height="90" rx="10" stroke={faint} strokeDasharray="5 6" />
        {/* Solid where the application is complete, outlined where it is not. */}
        <rect x="20" y="52" width="26" height="22" rx="4" fill={accent} />
        <rect x="20" y="30" width="26" height="18" rx="4" fill={accent} opacity="0.4" />
        <rect x="54" y="42" width="26" height="32" rx="4" stroke={line} strokeWidth="1.75" />
        <rect x="88" y="26" width="26" height="48" rx="4" stroke={line} strokeWidth="1.75" />
        <circle cx="33" cy="20" r="4.5" fill={accent} />
      </svg>
    );
  }

  return (
    <svg width="116" height="92" viewBox="0 0 116 92" fill="none" aria-hidden="true">
      {/* A globe with meridians — a zone is a domain's slice of the namespace. */}
      <circle cx="58" cy="46" r="30" stroke={line} strokeWidth="1.75" />
      <ellipse cx="58" cy="46" rx="12" ry="30" stroke={faint} strokeWidth="1.5" />
      <path d="M28 46h60M33 30h50M33 62h50" stroke={faint} strokeWidth="1.5" />
      <circle cx="58" cy="46" r="5" fill={accent} />
      <circle cx="58" cy="46" r="11" stroke={accent} strokeWidth="1.5" opacity="0.35" />
    </svg>
  );
}
