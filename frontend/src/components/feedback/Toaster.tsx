'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

import { cn } from '@/lib/cn';
import { spring, toastVariants } from '@/lib/motion';
import {
  dismissNotification,
  useNotifications,
  type NotificationType,
} from '@/lib/notifications';

/**
 * The console's toast stack.
 *
 * Reads the existing `notifications` store rather than introducing a second
 * one, so every `notify()` call already scattered through the mutation hooks
 * keeps working untouched — this replaces Cloudscape's Flashbar as the renderer
 * and nothing else.
 *
 * Stacked bottom-right rather than inline at the top of the page: an inline
 * banner pushes the content down when it arrives, which moves the row the user
 * was about to click.
 */

const TONE = {
  success: {
    icon: CheckCircle2,
    ring: 'text-success',
    bar: 'bg-success',
  },
  error: {
    icon: XCircle,
    ring: 'text-danger',
    bar: 'bg-danger',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'text-warning',
    bar: 'bg-warning',
  },
  info: {
    icon: Info,
    ring: 'text-info',
    bar: 'bg-info',
  },
} satisfies Record<NotificationType, { icon: typeof Info; ring: string; bar: string }>;

export function Toaster() {
  const notifications = useNotifications();

  return (
    <div
      // `pointer-events-none` on the container and `auto` on each toast, so the
      // empty column does not swallow clicks on the page beneath it.
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4',
        'sm:inset-x-auto sm:right-0 sm:items-end sm:p-5',
      )}
      // `polite` rather than `assertive`: a success message should not
      // interrupt what a screen reader is already reading.
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {notifications.map((notification) => {
          const tone = TONE[notification.type];
          const Icon = tone.icon;

          return (
            <motion.div
              key={notification.id}
              layout
              variants={toastVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={spring.bouncy}
              // Swiping a toast aside is faster than aiming at its close
              // button, and it is what a touch user reaches for first.
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.05, right: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 90) dismissNotification(notification.id);
              }}
              className={cn(
                'pointer-events-auto relative w-full max-w-[26rem] cursor-grab overflow-hidden active:cursor-grabbing',
                'rounded-xl border border-line bg-surface-overlay shadow-lg',
                'glass-strong',
              )}
            >
              {/* A tone stripe down the leading edge — colour without tinting
                  the whole surface, which would hurt the text contrast. */}
              <span className={cn('absolute inset-y-0 left-0 w-1', tone.bar)} aria-hidden="true" />

              <div className="flex items-start gap-3 py-3 pl-5 pr-3">
                <Icon className={cn('mt-px size-[18px] shrink-0', tone.ring)} aria-hidden="true" />

                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium leading-snug text-ink">
                    {notification.header}
                  </p>
                  {notification.content && (
                    <p className="mt-1 text-sm leading-normal text-ink-muted">
                      {notification.content}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => dismissNotification(notification.id)}
                  aria-label={`Dismiss: ${notification.header}`}
                  className="-mr-0.5 -mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-inset hover:text-ink"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              {/*
                A depleting bar for the messages the store auto-dismisses after
                five seconds. Errors and warnings stay until dismissed, so they
                get no bar — a countdown on a message that is not counting down
                would be a lie.
              */}
              {(notification.type === 'success' || notification.type === 'info') && (
                <motion.span
                  className={cn('absolute bottom-0 left-0 h-0.5 origin-left', tone.bar)}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 5, ease: 'linear' }}
                  style={{ width: '100%' }}
                  aria-hidden="true"
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
