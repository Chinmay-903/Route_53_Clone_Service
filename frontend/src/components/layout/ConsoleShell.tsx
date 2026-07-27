'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BreadcrumbProvider } from '@/components/layout/Breadcrumbs';
import { HelpPanelDrawer, HelpPanelProvider } from '@/components/layout/HelpPanel';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { KeyboardShortcuts } from '@/components/navigation/KeyboardShortcuts';
import {
  Sidebar,
  SIDEBAR_RAIL_WIDTH,
  SIDEBAR_WIDTH,
} from '@/components/navigation/Sidebar';
import { TopBar } from '@/components/navigation/TopBar';
import { TooltipProvider } from '@/components/ui/Menu';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';
import { useTheme } from '@/lib/theme';

const COLLAPSE_STORAGE_KEY = 'r53-sidebar-collapsed';

/**
 * The console chrome wrapping every authenticated page.
 *
 * Three layouts from one set of components:
 *   ≥ 1024px  a permanent sidebar column, expanded or collapsed to a rail
 *   < 1024px  the same sidebar as an overlay drawer
 *
 * The layout is a CSS grid whose first column is animated by Framer Motion, so
 * collapsing the sidebar slides the content edge rather than snapping it.
 */
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <HelpPanelProvider>
        <BreadcrumbProvider>
          <ConsoleFrame>{children}</ConsoleFrame>
        </BreadcrumbProvider>
      </HelpPanelProvider>
    </TooltipProvider>
  );
}

function ConsoleFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // Read after mount rather than during render: `localStorage` does not exist
  // on the server, and reading it during render would make the server and
  // client disagree about the sidebar's width.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
    } catch {
      // Private browsing can refuse reads; the default is fine.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // See above.
      }
      return next;
    });
  }, []);

  // A client-side route change swaps the content without moving focus, which
  // leaves a screen-reader user still on the link they activated. Moving focus
  // to the content region announces the new page.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-canvas">
      <a className="skip-link" href="#console-content">
        Skip to main content
      </a>

      <KeyboardShortcuts
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        onToggleTheme={toggleTheme}
        onOpenPalette={() => setPaletteOpen(true)}
        onToggleSidebar={toggleCollapsed}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      <HelpPanelDrawer />

      {/* Desktop sidebar ---------------------------------------------------
          Fixed rather than a grid track, so the column does not scroll with the
          page and long navigation stays anchored. */}
      <motion.aside
        animate={{ width: collapsed ? SIDEBAR_RAIL_WIDTH : SIDEBAR_WIDTH }}
        transition={spring.smooth}
        className="fixed inset-y-0 left-0 z-30 hidden lg:block"
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </motion.aside>

      {/* Mobile drawer ----------------------------------------------------- */}
      <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-[rgb(6_8_16/0.5)] backdrop-blur-[2px] lg:hidden',
              'data-[state=open]:animate-[fade-in_200ms_var(--ease-out)]',
              'data-[state=closed]:animate-[fade-out_140ms_var(--ease-in-out)_forwards]',
            )}
          />
          <Dialog.Content
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-[17rem] focus:outline-none lg:hidden',
              'data-[state=open]:animate-[slide-in-left_280ms_var(--ease-out)]',
              'data-[state=closed]:animate-[slide-out-left_180ms_var(--ease-in-out)_forwards]',
            )}
          >
            <VisuallyHidden>
              <Dialog.Title>Console navigation</Dialog.Title>
              <Dialog.Description>Links to every section of the console.</Dialog.Description>
            </VisuallyHidden>
            <Sidebar
              collapsed={false}
              showCollapseToggle={false}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Content ----------------------------------------------------------- */}
      <motion.div
        animate={{ paddingLeft: collapsed ? SIDEBAR_RAIL_WIDTH : SIDEBAR_WIDTH }}
        transition={spring.smooth}
        // The padding animation applies only where the sidebar is a permanent
        // column. Below `lg` the inline style is overridden back to zero.
        className="min-h-dvh [@media(max-width:1023px)]:!pl-0"
      >
        <TopBar
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main
          id="console-content"
          ref={mainRef}
          // -1 keeps it out of the tab order while still being focusable by the
          // skip link and by the route-change effect above.
          tabIndex={-1}
          className="focus:outline-none"
        >
          {children}
        </main>
      </motion.div>
    </div>
  );
}
