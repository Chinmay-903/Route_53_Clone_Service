import type { Transition, Variants } from 'framer-motion';

/**
 * The console's motion vocabulary.
 *
 * Every animation in the application draws from this file. The point is not
 * convenience — it is that a modal, a dropdown, and a toast should feel like
 * they were built by the same hand, and they only do that if they share
 * durations and easing curves rather than each inventing their own.
 *
 * Three springs, chosen by what is moving:
 *   `snappy`  — small controls responding to a pointer. Fast enough to feel
 *               instant, damped enough not to wobble.
 *   `smooth`  — panels and surfaces. No overshoot; a large surface that
 *               bounces reads as unstable.
 *   `bouncy`  — things that appear from nothing and want to be noticed. Used
 *               sparingly, because overshoot on everything is a toy.
 */

export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 34, mass: 0.55 },
  smooth: { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 },
  bouncy: { type: 'spring', stiffness: 400, damping: 22, mass: 0.7 },
} satisfies Record<string, Transition>;

/** Durations for the tween-based transitions that springs do not suit. */
export const duration = {
  fast: 0.14,
  base: 0.22,
  slow: 0.36,
} as const;

export const easeOut = [0.22, 1, 0.36, 1] as const;

/**
 * Page-level entrance.
 *
 * The travel is 8px rather than the more common 20 — enough to read as arrival,
 * small enough that it never looks like the page is still loading.
 */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: easeOut, staggerChildren: 0.045 },
  },
  exit: { opacity: 0, y: -6, transition: { duration: duration.fast, ease: easeOut } },
};

/** One item inside a staggered container. */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: easeOut } },
};

/** Modal surface: scales from just under full size, never from zero. */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring.smooth },
  exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: duration.fast, ease: easeOut } },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.base } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
};

/**
 * Dropdown and popover surfaces.
 *
 * `originY: 0` is set by the consumer via `transform-origin`, so the panel
 * grows out of its trigger rather than out of its own centre.
 */
export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring.snappy },
  exit: { opacity: 0, scale: 0.97, y: -2, transition: { duration: duration.fast } },
};

/** Toast: enters from the right on desktop, settles with a slight overshoot. */
export const toastVariants: Variants = {
  hidden: { opacity: 0, x: 24, scale: 0.96 },
  visible: { opacity: 1, x: 0, scale: 1, transition: spring.bouncy },
  exit: {
    opacity: 0,
    x: 24,
    scale: 0.95,
    transition: { duration: duration.base, ease: easeOut },
  },
};

/**
 * Table rows.
 *
 * The stagger is capped by index in the consumer rather than here: past about
 * a dozen rows a per-row delay stops being a flourish and becomes a wait.
 */
export const rowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easeOut, delay: Math.min(index, 12) * 0.022 },
  }),
};
