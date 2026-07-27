'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Kbd } from '@/components/ui/Menu';
import { Modal } from '@/components/ui/Modal';

/**
 * Console-wide keyboard shortcuts.
 *
 * Two-key sequences use the "g then h" idiom rather than a modifier, because
 * browsers and screen readers already claim most Ctrl and Alt combinations.
 * Nothing fires while focus is in a text field, so typing "g" into a search box
 * never navigates away.
 */

interface Shortcut {
  keys: string[];
  description: string;
}

export const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  {
    group: 'General',
    items: [
      { keys: ['⌘', 'K'], description: 'Open the command palette' },
      { keys: ['/'], description: "Focus this page's filter" },
      { keys: ['?'], description: 'Show this list' },
      { keys: ['Esc'], description: 'Close a dialog or clear focus' },
    ],
  },
  {
    group: 'Navigation',
    items: [
      { keys: ['g', 'd'], description: 'Go to dashboard' },
      { keys: ['g', 'h'], description: 'Go to hosted zones' },
      { keys: ['g', 'c'], description: 'Create a hosted zone' },
    ],
  },
  {
    group: 'Appearance',
    items: [
      { keys: ['⇧', 'D'], description: 'Toggle dark mode' },
      { keys: ['['], description: 'Collapse or expand the sidebar' },
    ],
  },
];

/** True when focus sits somewhere that should receive the keystroke instead. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function KeyboardShortcuts({
  open,
  onOpenChange,
  onToggleTheme,
  onOpenPalette,
  onToggleSidebar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleTheme: () => void;
  onOpenPalette: () => void;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const [pendingPrefix, setPendingPrefix] = useState<string | null>(null);

  const focusSearch = useCallback(() => {
    // The page's own filter first, the top bar's control only as a fallback. On
    // a table page the filter is what "/" is wanted for, and it sits later in
    // the DOM than the shell's own search — so document order would pick the
    // wrong one.
    const search =
      document.querySelector<HTMLInputElement>('#console-content input[type="search"]') ??
      document.querySelector<HTMLInputElement>('input[type="search"]');
    search?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // ⌘K and Ctrl+K are the one modifier combination the console claims, and
      // it is checked before the typing guard so the palette opens even while
      // the cursor is in a filter box.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenPalette();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      // Second key of a "g then x" sequence.
      if (pendingPrefix === 'g') {
        setPendingPrefix(null);
        const destination = { d: '/dashboard', h: '/hosted-zones', c: '/hosted-zones/create' }[
          event.key.toLowerCase()
        ];
        if (destination) {
          event.preventDefault();
          router.push(destination);
        }
        return;
      }

      if (event.key === 'g') {
        setPendingPrefix('g');
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        onOpenChange(true);
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        focusSearch();
        return;
      }
      if (event.key === '[') {
        event.preventDefault();
        onToggleSidebar();
        return;
      }
      if (event.key === 'D' && event.shiftKey) {
        event.preventDefault();
        onToggleTheme();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingPrefix, router, focusSearch, onToggleTheme, onOpenPalette, onOpenChange, onToggleSidebar]);

  // A half-finished sequence expires, so a stray "g" does not silently arm the
  // next keystroke minutes later.
  useEffect(() => {
    if (!pendingPrefix) return;
    const timer = setTimeout(() => setPendingPrefix(null), 1500);
    return () => clearTimeout(timer);
  }, [pendingPrefix]);

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title="Keyboard shortcuts"
      description="Every shortcut works from anywhere in the console."
      size="lg"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {SHORTCUTS.map((section) => (
          <section key={section.group}>
            <h3 className="mb-2.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
              {section.group}
            </h3>
            <dl className="flex flex-col gap-1">
              {section.items.map((shortcut) => (
                <div
                  key={shortcut.description}
                  className="flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-inset"
                >
                  <dt className="text-base text-ink-secondary">{shortcut.description}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
