'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * The console's dialog.
 *
 * Built on Radix, which supplies the parts that are tedious to get right and
 * invisible when they are: a focus trap, focus restored to the trigger on
 * close, Escape to dismiss, `aria-modal` with the rest of the page inert, and
 * scroll locking that does not shift the layout when the scrollbar disappears.
 *
 * The enter and exit animations are CSS rather than Framer Motion for the same
 * reason as the popover surfaces — Radix keeps a closing element mounted only
 * until its animation ends, which it detects through `animationend`.
 */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Tints the header, for destructive confirmations. */
  tone?: 'default' | 'danger';
  /** Blocks Escape and backdrop dismissal while a mutation is in flight. */
  busy?: boolean;
  icon?: React.ReactNode;
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  tone = 'default',
  busy,
  icon,
}: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        // Dismissing mid-request would leave the mutation running with no way
        // to report what happened to it.
        if (!next && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-[rgb(6_8_16/0.5)] backdrop-blur-[3px]',
            'data-[state=open]:animate-[fade-in_200ms_var(--ease-out)]',
            'data-[state=closed]:animate-[fade-out_140ms_var(--ease-in-out)_forwards]',
          )}
        />

        <Dialog.Content
          onEscapeKeyDown={(event) => busy && event.preventDefault()}
          onInteractOutside={(event) => busy && event.preventDefault()}
          /*
           * Radix warns when a dialog has no `Description`, and the obvious
           * answer — a visually-hidden copy of the title — makes a screen
           * reader announce the same sentence twice, once as the name and once
           * as the description. Explicitly passing `aria-describedby={undefined}`
           * is Radix's documented opt-out. A dialog is not required to have a
           * description; the title already names it.
           *
           * The prop is spread rather than written inline because it must be
           * absent when a description exists, so that Radix can wire its own id.
           */
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            SIZES[size],
            'flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden',
            'rounded-2xl border border-line bg-surface-overlay shadow-xl',
            'focus:outline-none',
            'data-[state=open]:animate-[modal-in_260ms_var(--ease-out)]',
            'data-[state=closed]:animate-[modal-out_150ms_var(--ease-in-out)_forwards]',
          )}
        >
          <header className="flex items-start gap-3 px-5 pb-4 pt-5">
            {icon && (
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl border [&_svg]:size-[18px]',
                  tone === 'danger'
                    ? 'border-danger-border bg-danger-wash text-danger'
                    : 'border-line bg-surface-inset text-ink-muted',
                )}
                aria-hidden="true"
              >
                {icon}
              </span>
            )}

            <div className="min-w-0 flex-1 pt-0.5">
              <Dialog.Title className="text-lg font-semibold tracking-tight text-ink">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-base leading-normal text-ink-muted">
                  {description}
                </Dialog.Description>
              )}
            </div>

            <Dialog.Close asChild>
              <IconButton
                label="Close dialog"
                variant="ghost"
                size="sm"
                disabled={busy}
                className="-mr-1 -mt-1"
              >
                <X aria-hidden="true" />
              </IconButton>
            </Dialog.Close>
          </header>

          {/* Only the body scrolls, so the title and the actions stay reachable
              on a short viewport. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>

          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3.5">
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
