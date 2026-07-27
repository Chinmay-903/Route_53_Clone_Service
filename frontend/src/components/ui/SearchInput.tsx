'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';

import { Kbd } from '@/components/ui/Menu';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';

/**
 * The console's search field.
 *
 * `type="search"` is load-bearing rather than cosmetic: the `/` shortcut in
 * `KeyboardShortcuts` finds the page's filter by that selector, so changing it
 * to `type="text"` would silently break the shortcut.
 *
 * The trailing slot swaps between a shortcut hint and a clear button, which is
 * how the field advertises the shortcut while empty and offers the exit once it
 * is not.
 */
export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onValueChange: (value: string) => void;
  /** The key shown at rest. Hidden once the field has content. */
  shortcut?: string;
  /** Result count announced beside the field. */
  countText?: string;
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onValueChange, shortcut = '/', countText, className, containerClassName, ...props },
  forwardedRef,
) {
  const innerRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // Merges the forwarded ref with the local one, which the clear button needs
  // in order to return focus to the field rather than dropping it on the body.
  useEffect(() => {
    if (typeof forwardedRef === 'function') forwardedRef(innerRef.current);
    else if (forwardedRef) forwardedRef.current = innerRef.current;
  }, [forwardedRef]);

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', containerClassName)}>
      <div
        className={cn(
          'group relative flex h-9 items-center gap-2 rounded-lg border bg-surface pl-2.5 pr-1.5',
          'transition-[border-color,box-shadow,background-color] duration-200 ease-out',
          focused
            ? 'border-brand shadow-[0_0_0_3px_var(--brand-ring)]'
            : 'border-line hover:border-line-strong',
          className,
        )}
      >
        <Search
          className={cn(
            'size-4 shrink-0 transition-colors duration-200',
            focused ? 'text-brand' : 'text-ink-faint',
          )}
          aria-hidden="true"
        />

        <input
          ref={innerRef}
          type="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none sm:text-base',
            // WebKit draws its own clear button on search inputs, which would
            // sit beside the one below.
            '[&::-webkit-search-cancel-button]:appearance-none',
          )}
          {...props}
        />

        <AnimatePresence mode="wait" initial={false}>
          {value ? (
            <motion.button
              key="clear"
              type="button"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={spring.snappy}
              onClick={() => {
                onValueChange('');
                innerRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-inset hover:text-ink"
            >
              <X className="size-3.5" aria-hidden="true" />
            </motion.button>
          ) : (
            shortcut && (
              <motion.span
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: focused ? 0 : 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none hidden shrink-0 pr-0.5 sm:block"
                aria-hidden="true"
              >
                <Kbd>{shortcut}</Kbd>
              </motion.span>
            )
          )}
        </AnimatePresence>
      </div>

      {/*
        `aria-live` so the result count is announced as the user types, rather
        than being a number only sighted users benefit from.
      */}
      {countText && (
        <span className="px-0.5 text-xs text-ink-faint" role="status" aria-live="polite">
          {countText}
        </span>
      )}
    </div>
  );
});
