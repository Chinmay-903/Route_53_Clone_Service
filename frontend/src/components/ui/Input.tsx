'use client';

import { forwardRef, useId } from 'react';

import { cn } from '@/lib/cn';

/**
 * The shared shell for every text-entry control.
 *
 * The focus treatment is a ring drawn with box-shadow rather than an outline,
 * because it has to sit flush against a 1px border without the 2px gap an
 * outline-offset would introduce. `focus-within` rather than `focus` so the
 * ring appears when focus lands on the input inside the wrapper.
 */
const fieldShell = [
  'group/field relative flex w-full items-center gap-2',
  'rounded-lg border border-line bg-surface',
  'transition-[border-color,box-shadow,background-color] duration-200 ease-out',
  'hover:border-line-strong',
  'focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--brand-ring)]',
  'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-surface-sunken has-[input:disabled]:opacity-60',
  'has-[textarea:disabled]:bg-surface-sunken has-[textarea:disabled]:opacity-60',
];

const invalidShell =
  'border-danger focus-within:border-danger focus-within:shadow-[0_0_0_3px_var(--danger-wash)]';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  invalid?: boolean;
  /** Rendered inside the field, before the text. */
  leading?: React.ReactNode;
  /** Rendered inside the field, after the text. */
  trailing?: React.ReactNode;
  /** Static text pinned to the right, e.g. a domain suffix. */
  suffix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leading, trailing, suffix, ...props },
  ref,
) {
  return (
    <div className={cn(fieldShell, invalid && invalidShell, className)}>
      {leading && (
        <span
          className="pl-3 text-ink-faint transition-colors group-focus-within/field:text-brand [&_svg]:size-4"
          aria-hidden="true"
        >
          {leading}
        </span>
      )}
      <input
        ref={ref}
        // 16px on touch devices prevents iOS from zooming the viewport when the
        // field receives focus, which is why the size steps down only at `sm`.
        className={cn(
          'peer h-9 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none sm:text-base',
          leading ? 'pl-2' : 'pl-3',
          trailing || suffix ? 'pr-2' : 'pr-3',
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
      {suffix && (
        <span className="shrink-0 pr-3 font-mono text-sm text-ink-faint" aria-hidden="true">
          {suffix}
        </span>
      )}
      {trailing && <span className="flex shrink-0 items-center pr-1.5">{trailing}</span>}
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /** Renders the content in the monospace face, for values and zone files. */
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, mono, rows = 4, ...props },
  ref,
) {
  return (
    <div className={cn(fieldShell, 'items-stretch', invalid && invalidShell, className)}>
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'min-w-0 flex-1 resize-y bg-transparent px-3 py-2.5 text-[16px] leading-relaxed text-ink outline-none sm:text-base',
          mono && 'font-mono text-sm',
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
    </div>
  );
});

/**
 * A labelled field with description, error, and constraint text.
 *
 * Wiring the ids by hand at every call site is how a form ends up with an error
 * message no screen reader ever announces, so the association is built here:
 * `aria-describedby` collects whichever of the three slots are present, and
 * `aria-invalid` follows the error.
 */
export interface FieldProps {
  label: React.ReactNode;
  /** Explanatory text above the control. */
  description?: React.ReactNode;
  /** Format guidance below the control. Hidden while an error is showing. */
  constraint?: React.ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  children: (props: {
    id: string;
    invalid: boolean;
    'aria-describedby': string | undefined;
  }) => React.ReactNode;
}

export function Field({
  label,
  description,
  constraint,
  error,
  optional,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const constraintId = `${id}-constraint`;

  const describedBy =
    [
      description ? descriptionId : null,
      error ? errorId : null,
      constraint && !error ? constraintId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline gap-1.5 text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-ink-faint">optional</span>}
      </label>

      {description && (
        <p id={descriptionId} className="text-sm leading-snug text-ink-muted">
          {description}
        </p>
      )}

      {children({ id, invalid: Boolean(error), 'aria-describedby': describedBy })}

      {/*
        The message region keeps its place in the layout whether or not it holds
        text, so validating a field does not push everything below it down.
      */}
      {(error || constraint) && (
        <p
          id={error ? errorId : constraintId}
          className={cn(
            'flex items-start gap-1 text-xs leading-snug',
            error ? 'font-medium text-danger' : 'text-ink-faint',
          )}
          // Announced when it changes, so an error that appears after blur is
          // read out rather than only drawn.
          role={error ? 'alert' : undefined}
        >
          {error ?? constraint}
        </p>
      )}
    </div>
  );
}

/**
 * A character or item counter for the corner of a field.
 *
 * Turns amber as the limit approaches and red once it is passed, so the state
 * is legible before the submit fails rather than after.
 */
export function Counter({ value, max }: { value: number; max?: number }) {
  if (max === undefined) {
    return <span className="text-xs tabular-nums text-ink-faint">{value}</span>;
  }

  const ratio = value / max;

  return (
    <span
      className={cn(
        'text-xs tabular-nums transition-colors',
        ratio > 1 ? 'font-medium text-danger' : ratio > 0.85 ? 'text-warning' : 'text-ink-faint',
      )}
    >
      {value}/{max}
    </span>
  );
}
