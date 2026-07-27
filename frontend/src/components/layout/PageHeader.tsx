'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/cn';
import { duration, easeOut } from '@/lib/motion';

/**
 * The heading block every console page opens with.
 *
 * One component rather than a per-page arrangement, because "title, one line of
 * explanation, actions on the right" is a decision worth making once — and the
 * moment it is made per page, the gap between the title and the body starts
 * varying by a few pixels from screen to screen.
 */
export function PageHeader({
  title,
  description,
  actions,
  badge,
  icon,
  className,
  /** Rendered beneath the description — statistics, filters, or tabs. */
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.slow, ease: easeOut }}
      className={cn('mb-6', className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span
              className={cn(
                'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl',
                'border border-line bg-surface text-brand shadow-xs',
                '[&_svg]:size-5',
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
              {badge}
            </div>
            {description && (
              <p className="mt-1.5 max-w-[68ch] text-base leading-relaxed text-ink-muted">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {children && <div className="mt-5">{children}</div>}
    </motion.div>
  );
}

/**
 * The page's outer container.
 *
 * The max width is 1440px rather than unbounded: a table stretched across an
 * ultrawide monitor puts the row's first and last cells so far apart that
 * scanning one row becomes a head movement.
 */
export function PageContainer({
  className,
  children,
  /** Removes the width cap, for pages whose content is genuinely full-bleed. */
  wide,
}: {
  className?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
        wide ? 'max-w-none' : 'max-w-[1440px]',
        className,
      )}
    >
      {children}
    </div>
  );
}
