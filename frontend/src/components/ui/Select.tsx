'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '@/lib/cn';

/**
 * A select built on Radix rather than on `<select>`.
 *
 * The native element cannot be styled beyond its border on most platforms, and
 * its dropdown is drawn by the OS — which means a native select is the one
 * control in the console that would still look like the OS rather than like the
 * console. Radix renders its own listbox while keeping the keyboard behaviour,
 * typeahead, and screen-reader semantics the native element provides.
 */

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  className?: string;
  /** Renders a compact trigger, for use inside a table toolbar. */
  size?: 'sm' | 'md';
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  disabled,
  invalid,
  id,
  className,
  size = 'md',
  ...aria
}: SelectProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          'group inline-flex w-full items-center justify-between gap-2',
          'rounded-lg border border-line bg-surface text-ink',
          'transition-[border-color,box-shadow,background-color] duration-200 ease-out',
          'hover:border-line-strong',
          'focus-visible:border-brand focus-visible:shadow-[0_0_0_3px_var(--brand-ring)] focus-visible:outline-none',
          'data-[state=open]:border-brand data-[state=open]:shadow-[0_0_0_3px_var(--brand-ring)]',
          'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60',
          invalid && 'border-danger focus-visible:border-danger',
          size === 'sm' ? 'h-8 px-2.5 text-sm' : 'h-9 px-3 text-base',
          className,
        )}
        {...aria}
      >
        <SelectPrimitive.Value placeholder={placeholder}>
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          {/* Rotates to point at the open panel, so the control says which way
              it is going rather than only that it opens. */}
          <ChevronDown
            className="size-4 shrink-0 text-ink-faint transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)]',
            'overflow-hidden rounded-xl border border-line bg-surface-overlay shadow-xl',
            // `pop-surface` carries the enter/exit animation and anchors the
            // transform origin to the trigger, so the panel grows out of the
            // control rather than out of its own centre.
            'pop-surface',
          )}
        >
          <SelectPrimitive.Viewport className="max-h-72 overflow-y-auto p-1.5">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'relative flex cursor-pointer select-none items-start gap-2',
                  'rounded-lg py-1.5 pl-2.5 pr-8 text-base outline-none',
                  'text-ink-secondary transition-colors duration-100',
                  'data-[highlighted]:bg-brand-wash data-[highlighted]:text-ink',
                  'data-[state=checked]:font-medium data-[state=checked]:text-ink',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
                )}
              >
                <span className="min-w-0 flex-1">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  {option.description && (
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      {option.description}
                    </span>
                  )}
                </span>
                <SelectPrimitive.ItemIndicator className="absolute right-2.5 top-2">
                  <Check className="size-4 text-brand" aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/**
 * A checkbox drawn as an SVG rather than as a styled native input.
 *
 * The tick is a stroked path with a dash animation, so it draws itself on
 * check instead of appearing — the single cheapest way to make a form feel
 * considered.
 */
export const Checkbox = forwardRef<
  HTMLButtonElement,
  {
    checked: boolean | 'indeterminate';
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    className?: string;
    id?: string;
  }
>(function Checkbox({ checked, onCheckedChange, disabled, label, className, id }, ref) {
  const isIndeterminate = checked === 'indeterminate';
  const isChecked = checked === true;

  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="checkbox"
      aria-checked={isIndeterminate ? 'mixed' : isChecked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!isChecked)}
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:cursor-not-allowed disabled:opacity-45',
        isChecked || isIndeterminate
          ? 'border-brand bg-brand text-brand-contrast'
          : 'border-line-strong bg-surface hover:border-brand hover:bg-brand-wash',
        className,
      )}
    >
      {isIndeterminate ? (
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
          <path d="M4 8h8" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
          <path
            d="M3.5 8.5l3 3 6-6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            // pathLength normalises the dash maths regardless of the path's
            // real length, so the draw-on is exactly 0 → 1.
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={isChecked ? 0 : 1}
            style={{ transition: 'stroke-dashoffset 180ms var(--ease-out)' }}
          />
        </svg>
      )}
    </button>
  );
});

/**
 * A radio group whose options are full cards.
 *
 * The whole card is the target rather than the 16px dot, which is both easier
 * to hit and the only way to give each option room for a description.
 */
export function RadioCards<T extends string>({
  value,
  onValueChange,
  options,
  name,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: string; description?: string; icon?: React.ReactNode }[];
  name: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn('grid gap-2.5 sm:grid-cols-2', className)}>
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'group relative flex items-start gap-3 rounded-xl border p-3.5 text-left',
              'transition-all duration-200 ease-out',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              isSelected
                ? 'border-brand bg-brand-wash shadow-[0_0_0_1px_var(--brand)]'
                : 'border-line bg-surface hover:-translate-y-px hover:border-line-strong hover:shadow-sm',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                isSelected ? 'border-brand' : 'border-line-strong group-hover:border-brand',
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  'size-2 rounded-full bg-brand transition-transform duration-200 ease-spring',
                  isSelected ? 'scale-100' : 'scale-0',
                )}
              />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-base font-medium text-ink">
                {option.icon && (
                  <span className="text-ink-muted [&_svg]:size-4" aria-hidden="true">
                    {option.icon}
                  </span>
                )}
                {option.label}
              </span>
              {option.description && (
                <span className="mt-1 block text-sm leading-snug text-ink-muted">
                  {option.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
