'use client';

import { motion } from 'framer-motion';
import { RotateCw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { duration, easeOut } from '@/lib/motion';
import { toUserMessage } from '@/lib/queries/client';

/**
 * The designed failure state.
 *
 * Shows the API's own explanation, which is written for humans and carries no
 * internal detail, plus a retry. A raw error object never reaches the screen —
 * `toUserMessage` is what stands between a stack trace and the user.
 */
export function ErrorState({
  title = 'Could not load this data',
  error,
  onRetry,
  className,
  compact,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
  className?: string;
  /** Narrower padding, for use inside a table body. */
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.slow, ease: easeOut }}
      className={cn(
        'flex flex-col items-center px-6 text-center',
        compact ? 'py-10' : 'py-16',
        className,
      )}
      role="alert"
    >
      <span
        className="flex size-12 items-center justify-center rounded-2xl border border-danger-border bg-danger-wash text-danger"
        aria-hidden="true"
      >
        <TriangleAlert className="size-5" />
      </span>

      <h3 className="mt-4 text-md font-semibold text-ink">{title}</h3>

      <p className="mt-1.5 max-w-[52ch] text-base leading-relaxed text-ink-muted">
        {toUserMessage(error)}
      </p>

      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-5">
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      )}
    </motion.div>
  );
}
