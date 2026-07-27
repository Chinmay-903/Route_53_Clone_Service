'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Info, X } from 'lucide-react';
import { createContext, useContext, useMemo, useState } from 'react';

import { Button, IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * The Info drawer.
 *
 * A page registers explanatory content and the shell renders it in a slide-over
 * rather than inline, so a form that needs a paragraph of DNS background does
 * not have to choose between burying the explanation and burying the form.
 *
 * The context carries only the content and the open state; the panel's chrome
 * belongs to the shell, which is why a page never renders one itself.
 */

interface HelpPanelValue {
  content: React.ReactNode | null;
  title: string | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  setContent: (content: React.ReactNode | null, title?: string) => void;
}

const HelpPanelContext = createContext<HelpPanelValue | null>(null);

export function HelpPanelProvider({ children }: { children: React.ReactNode }) {
  const [content, setContentState] = useState<React.ReactNode | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const value = useMemo<HelpPanelValue>(
    () => ({
      content,
      title,
      open,
      setOpen,
      setContent: (next, nextTitle) => {
        setContentState(next);
        setTitle(nextTitle ?? null);
        // Clearing the content closes the panel too, so navigating away from a
        // page while its Info drawer is open does not leave an empty one.
        if (next === null) setOpen(false);
      },
    }),
    [content, title, open],
  );

  return <HelpPanelContext.Provider value={value}>{children}</HelpPanelContext.Provider>;
}

export function useHelpPanel(): HelpPanelValue {
  const context = useContext(HelpPanelContext);
  if (!context) throw new Error('useHelpPanel must be used inside HelpPanelProvider');
  return context;
}

/** The button pages put beside a heading to open the drawer. */
export function InfoButton({ className }: { className?: string }) {
  const helpPanel = useHelpPanel();

  if (!helpPanel.content) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => helpPanel.setOpen(true)}
      className={cn('text-brand', className)}
    >
      <Info aria-hidden="true" />
      Info
    </Button>
  );
}

/** The slide-over itself. Rendered once, by the shell. */
export function HelpPanelDrawer() {
  const helpPanel = useHelpPanel();

  return (
    <Dialog.Root open={helpPanel.open} onOpenChange={helpPanel.setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-[rgb(6_8_16/0.4)] backdrop-blur-[2px]',
            'data-[state=open]:animate-[fade-in_200ms_var(--ease-out)]',
            'data-[state=closed]:animate-[fade-out_140ms_var(--ease-in-out)_forwards]',
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col',
            'border-l border-line bg-surface shadow-xl focus:outline-none',
            'data-[state=open]:animate-[slide-in-right_280ms_var(--ease-out)]',
            'data-[state=closed]:animate-[slide-out-right_180ms_var(--ease-in-out)_forwards]',
          )}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
            <Dialog.Title className="text-md font-semibold text-ink">
              {helpPanel.title ?? 'About this page'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label="Close help panel" variant="ghost" size="sm">
                <X aria-hidden="true" />
              </IconButton>
            </Dialog.Close>
          </header>

          <Dialog.Description className="sr-only">
            Explanatory information about the current page.
          </Dialog.Description>

          {/*
            Typography for prose the page authors as plain markup, so a help
            entry can be written as headings and paragraphs without every one of
            them carrying its own classes.
          */}
          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto px-5 py-5',
              'text-base leading-relaxed text-ink-secondary',
              '[&_h3]:mb-1.5 [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-ink',
              '[&_h3:first-child]:mt-0',
              '[&_p]:mb-3.5 [&_p:last-child]:mb-0',
              '[&_strong]:font-semibold [&_strong]:text-ink',
              '[&_code]:rounded [&_code]:border [&_code]:border-line [&_code]:bg-surface-inset',
              '[&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-ink',
              '[&_ul]:mb-3.5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-4',
              '[&_li]:list-disc [&_li]:marker:text-ink-faint',
            )}
          >
            {helpPanel.content}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
