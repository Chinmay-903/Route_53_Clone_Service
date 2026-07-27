'use client';

import Box from '@cloudscape-design/components/box';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Modal from '@cloudscape-design/components/modal';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/**
 * Console-wide keyboard shortcuts.
 *
 * Two-key sequences use the "g then h" idiom rather than a modifier, because
 * browsers and screen readers already claim most Ctrl and Alt combinations.
 * Nothing fires while focus is in a text field, so typing "g" into a search box
 * never navigates away.
 */

interface Shortcut {
  keys: string;
  description: string;
}

export const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  {
    group: 'Navigation',
    items: [
      { keys: 'g then d', description: 'Go to dashboard' },
      { keys: 'g then h', description: 'Go to hosted zones' },
      { keys: 'g then c', description: 'Create a hosted zone' },
    ],
  },
  {
    group: 'On this page',
    items: [
      { keys: '/', description: "Focus this page's filter" },
      { keys: 'Escape', description: 'Close a dialog or clear focus' },
    ],
  },
  {
    group: 'Appearance',
    items: [
      { keys: 'Shift + D', description: 'Toggle dark mode' },
      { keys: '?', description: 'Show this list' },
    ],
  },
];

/** True when focus sits somewhere that should receive the keystroke instead. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function KeyboardShortcuts({ onToggleTheme }: { onToggleTheme: () => void }) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingPrefix, setPendingPrefix] = useState<string | null>(null);

  const focusSearch = useCallback(() => {
    // The page's own filter first, the top bar's service search only as a
    // fallback. On a table page the filter is what "/" is wanted for, and it
    // sits later in the DOM than the nav search — so document order would pick
    // the wrong one.
    const search =
      document.querySelector<HTMLInputElement>('#console-content input[type="search"]') ??
      document.querySelector<HTMLInputElement>('input[type="search"]');
    search?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
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
        setHelpOpen(true);
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        focusSearch();
        return;
      }
      if (event.key === 'D' && event.shiftKey) {
        event.preventDefault();
        onToggleTheme();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingPrefix, router, focusSearch, onToggleTheme]);

  // A half-finished sequence expires, so a stray "g" does not silently arm the
  // next keystroke minutes later.
  useEffect(() => {
    if (!pendingPrefix) return;
    const timer = setTimeout(() => setPendingPrefix(null), 1500);
    return () => clearTimeout(timer);
  }, [pendingPrefix]);

  return (
    <Modal
      visible={helpOpen}
      onDismiss={() => setHelpOpen(false)}
      header="Keyboard shortcuts"
      closeAriaLabel="Close"
      size="medium"
    >
      <ColumnLayout columns={2} variant="text-grid">
        {SHORTCUTS.map((section) => (
          <div key={section.group}>
            <Box variant="awsui-key-label">{section.group}</Box>
            <dl style={{ margin: 0, display: 'grid', gap: 'var(--space-xs)' }}>
              {section.items.map((shortcut) => (
                <div
                  key={shortcut.keys}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 'var(--space-m)',
                    alignItems: 'baseline',
                  }}
                >
                  <dd style={{ margin: 0, color: 'var(--text-muted)' }}>
                    {shortcut.description}
                  </dd>
                  <dt style={{ margin: 0 }}>
                    <kbd
                      style={{
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-s)',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--surface-inset)',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: 'var(--text-caption)',
                        color: 'var(--text-strong)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {shortcut.keys}
                    </kbd>
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </ColumnLayout>
    </Modal>
  );
}
