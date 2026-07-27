'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { useId } from 'react';

import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';

/**
 * Tabs with an indicator that travels between triggers.
 *
 * The underline is one shared element rather than a border on the active tab,
 * and Framer Motion's `layoutId` is what makes it slide: two elements with the
 * same id in different positions are animated between rather than swapped. The
 * effect is that the indicator moves to the new tab instead of disappearing
 * from one and appearing at another.
 */
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Rendered as a count beside the label. */
  badge?: React.ReactNode;
  content: React.ReactNode;
}

export function Tabs({
  items,
  value,
  onValueChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  // Scopes the shared layout id to this instance, so two tab sets on one page
  // do not animate their indicators into each other.
  const layoutId = useId();

  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={className}>
      <TabsPrimitive.List
        className={cn(
          'relative flex items-center gap-0.5 border-b border-line',
          // Tabs overflow rather than wrap on a narrow viewport: a wrapped tab
          // row changes the page's height and pushes the panel down.
          'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {items.map((item) => {
          const isActive = item.id === value;

          return (
            <TabsPrimitive.Trigger
              key={item.id}
              value={item.id}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5',
                'text-base font-medium transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                '[&_svg]:size-4',
                isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
              )}
            >
              {item.icon}
              {item.label}
              {item.badge !== undefined && (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-2xs font-semibold tabular-nums transition-colors',
                    isActive ? 'bg-brand-wash text-brand' : 'bg-surface-inset text-ink-faint',
                  )}
                >
                  {item.badge}
                </span>
              )}

              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  transition={spring.snappy}
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand"
                  aria-hidden="true"
                />
              )}
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>

      {items.map((item) => (
        <TabsPrimitive.Content
          key={item.id}
          value={item.id}
          className={cn(
            'pt-5 focus-visible:outline-none',
            'data-[state=active]:animate-[slide-up-in_300ms_var(--ease-out)]',
          )}
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

/**
 * A pill-style segmented control.
 *
 * Same travelling-indicator technique, used where the choice filters a view
 * rather than switching between panels of content.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onValueChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const layoutId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-sunken p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 text-sm font-medium',
              'transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
              '[&_svg]:size-3.5',
              isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                transition={spring.snappy}
                className="absolute inset-0 rounded-[7px] border border-line bg-surface shadow-xs"
                aria-hidden="true"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
