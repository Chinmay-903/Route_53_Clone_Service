'use client';

import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

import { cn } from '@/lib/cn';

/**
 * The console's button.
 *
 * Variants are declared once here rather than spelled out at each call site,
 * which is what stops "the primary button" from drifting into four slightly
 * different primary buttons across the application.
 *
 * The hover treatment is a 1px lift plus a shadow. It is deliberately small:
 * the cue needs to confirm the pointer is on target, not perform.
 */
const button = tv({
  base: [
    'relative inline-flex select-none items-center justify-center gap-1.5',
    'font-medium whitespace-nowrap',
    'rounded-lg border',
    'transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-out',
    // Pressing translates down past the resting position, so the control feels
    // physically depressed rather than merely recoloured.
    'active:translate-y-0 active:scale-[0.985]',
    'disabled:pointer-events-none disabled:opacity-45',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    // Keeps the label from shifting when the spinner replaces the icon slot.
    '[&_svg]:shrink-0',
  ],
  variants: {
    variant: {
      primary: [
        'border-transparent bg-brand text-brand-contrast',
        'shadow-[0_1px_2px_rgb(11_13_23/0.12)]',
        'hover:bg-brand-hover hover:-translate-y-px hover:shadow-brand',
      ],
      secondary: [
        'border-line-strong bg-surface text-ink',
        'shadow-xs',
        'hover:-translate-y-px hover:border-line-accent hover:bg-surface-muted hover:shadow-sm',
      ],
      ghost: [
        'border-transparent bg-transparent text-ink-secondary',
        'hover:bg-surface-inset hover:text-ink',
      ],
      danger: [
        'border-transparent bg-danger text-white',
        'shadow-[0_1px_2px_rgb(11_13_23/0.12)]',
        'hover:bg-danger-hover hover:-translate-y-px hover:shadow-[0_6px_20px_rgb(208_50_47/0.32)]',
      ],
      dangerSubtle: [
        'border-danger-border bg-danger-wash text-danger',
        'hover:-translate-y-px hover:bg-danger hover:text-white',
      ],
      link: [
        'border-transparent bg-transparent p-0 text-brand underline-offset-4',
        'hover:underline active:scale-100',
      ],
    },
    size: {
      xs: 'h-7 px-2 text-xs [&_svg]:size-3.5',
      sm: 'h-8 px-2.5 text-sm [&_svg]:size-4',
      md: 'h-9 px-3.5 text-base [&_svg]:size-4',
      lg: 'h-11 px-5 text-md [&_svg]:size-[18px]',
    },
    /** Square, label-less. The size variants above assume a text label. */
    icon: {
      true: 'aspect-square px-0',
    },
    fullWidth: {
      true: 'w-full',
    },
  },
  compoundVariants: [
    // `link` has no box, so the height and padding from `size` would only add
    // dead space around the text.
    { variant: 'link', class: 'h-auto px-0' },
  ],
  defaultVariants: {
    variant: 'secondary',
    size: 'md',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  /** Renders the child element instead of a `<button>`, keeping the styling. */
  asChild?: boolean;
  /** Swaps the content for a spinner and blocks interaction. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, icon, fullWidth, asChild, loading, children, disabled, ...props },
  ref,
) {
  const classes = cn(button({ variant, size, icon, fullWidth }), className);

  /*
   * `asChild` hands the styling to the caller's own element — a Next.js `Link`,
   * usually — and Radix's Slot merges the props onto it. Slot accepts exactly
   * one element child, so this branch passes `children` straight through rather
   * than wrapping it. A spinner is meaningless here anyway: `asChild` is for
   * navigation, which has no pending state of its own.
   */
  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      // Announces the pending state rather than only showing it, so a screen
      // reader user learns the action is in flight.
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {/*
        The label stays mounted while loading and is hidden visually instead of
        being removed. Removing it would collapse the button to the spinner's
        width mid-click, moving every control beside it.
      */}
      <span className={cn('contents', loading && 'sr-only')}>{children}</span>
    </button>
  );
});

/**
 * A button that is only an icon.
 *
 * Separate from `Button` because the accessible name has to come from
 * somewhere, and requiring `label` in the type is the only way to make that
 * non-optional at every call site.
 */
export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'children'> {
  label: string;
  children: React.ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, ...props },
  ref,
) {
  return (
    <Button ref={ref} icon aria-label={label} {...props}>
      {children}
    </Button>
  );
});
