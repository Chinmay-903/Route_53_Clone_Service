'use client';

import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';

/**
 * The empty state shared by both tables.
 *
 * One illustration, one sentence, one action — anything more turns "there is
 * nothing here yet" into something the user has to read.
 */
export function EmptyState({
  title,
  description,
  action,
  variant = 'zones',
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  variant?: 'zones' | 'records' | 'search';
}) {
  return (
    <Box textAlign="center" padding={{ vertical: 'xxl', horizontal: 'l' }}>
      <SpaceBetween size="m" alignItems="center">
        <EmptyMotif variant={variant} />
        <div style={{ maxWidth: '44ch' }}>
          <Box variant="strong" color="text-body-secondary">
            {title}
          </Box>
          <Box variant="p" color="text-status-inactive" padding={{ top: 'xxs' }}>
            {description}
          </Box>
        </div>
        {action}
      </SpaceBetween>
    </Box>
  );
}

/** Decorative motif; the surrounding text carries the meaning. */
function EmptyMotif({ variant }: { variant: 'zones' | 'records' | 'search' }) {
  const stroke = 'var(--border-subtle)';
  const accent = 'var(--accent)';

  if (variant === 'search') {
    return (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="17" stroke={stroke} strokeWidth="2.5" />
        <path d="M45 45l12 12" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M25 32h14" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'records') {
    return (
      <svg width="80" height="72" viewBox="0 0 80 72" fill="none" aria-hidden="true">
        <rect x="9" y="14" width="62" height="12" rx="3" stroke={stroke} strokeWidth="2" />
        <rect x="9" y="32" width="62" height="12" rx="3" stroke={stroke} strokeWidth="2" />
        <rect
          x="9"
          y="50"
          width="62"
          height="12"
          rx="3"
          stroke={stroke}
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <circle cx="20" cy="20" r="3" fill={accent} />
        <circle cx="20" cy="38" r="3" fill={accent} opacity="0.5" />
      </svg>
    );
  }

  return (
    <svg width="80" height="72" viewBox="0 0 80 72" fill="none" aria-hidden="true">
      <circle cx="40" cy="36" r="23" stroke={stroke} strokeWidth="2" />
      <path d="M17 36h46M40 13c7 7 7 39 0 46M40 13c-7 7-7 39 0 46" stroke={stroke} strokeWidth="1.75" />
      <circle cx="40" cy="36" r="4.5" fill={accent} />
    </svg>
  );
}
