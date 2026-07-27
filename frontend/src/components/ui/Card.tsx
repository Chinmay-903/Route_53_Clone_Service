'use client';

import { motion } from 'framer-motion';
import { forwardRef, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

/**
 * The console's surface primitive.
 *
 * Every panel in the application is one of these, which is what keeps radius,
 * border, and elevation from being re-decided page by page.
 */
export const Card = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Adds a hover lift. Only for cards that are themselves a target. */
    interactive?: boolean;
    /** Removes the border and background, keeping the spacing rhythm. */
    bare?: boolean;
  }
>(function Card({ className, interactive, bare, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl',
        !bare && 'border border-line bg-surface shadow-xs',
        interactive && [
          'transition-all duration-250 ease-out',
          'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg',
          'active:translate-y-0 active:shadow-sm',
        ],
        className,
      )}
      {...props}
    />
  );
});

export function CardHeader({
  title,
  description,
  actions,
  className,
  icon,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-inset text-ink-muted [&_svg]:size-4"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-md font-semibold text-ink">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm leading-snug text-ink-muted">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3.5',
        className,
      )}
      {...props}
    />
  );
}

/**
 * A card that lights up beneath the pointer.
 *
 * The highlight is a radial gradient positioned from the pointer's offset
 * within the card, written straight to a CSS custom property rather than to
 * React state — a `setState` per `mousemove` would re-render the subtree at
 * pointer frequency, which is the classic way this effect becomes a
 * performance problem.
 */
export function SpotlightCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    element.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
    element.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-line bg-surface shadow-xs',
        'transition-[transform,box-shadow,border-color] duration-250 ease-out',
        'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg',
        className,
      )}
      {...props}
    >
      {/*
        Purely decorative and pointer-events-none, so it never intercepts a
        click meant for the content beneath it.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background:
            'radial-gradient(320px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), var(--brand-wash), transparent 65%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * A card that tilts fractionally toward the pointer.
 *
 * The rotation maxes out at 4 degrees. Anything more and the text inside starts
 * to look distorted rather than the card looking three-dimensional.
 */
export function TiltCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    // Normalised to -0.5 … 0.5 around the centre, then scaled to degrees.
    const px = (event.clientX - bounds.left) / bounds.width - 0.5;
    const py = (event.clientY - bounds.top) / bounds.height - 0.5;
    setTilt({ x: -py * 8, y: px * 8 });
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      style={{ transformStyle: 'preserve-3d', perspective: 900 }}
      className={cn(
        'rounded-xl border border-line bg-surface shadow-sm will-change-transform',
        className,
      )}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}
