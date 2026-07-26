'use client';

import AppLayout from '@cloudscape-design/components/app-layout';
import Flashbar from '@cloudscape-design/components/flashbar';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AppTopNavigation } from '@/components/shell/AppTopNavigation';
import { HelpPanelProvider, useHelpPanel } from '@/components/shell/HelpPanelContext';
import { KeyboardShortcuts } from '@/components/shell/KeyboardShortcuts';
import { navigationItems } from '@/components/shell/navigationItems';
import { useIsCompact } from '@/lib/useMediaQuery';
import { dismissNotification, useNotifications } from '@/lib/notifications';

const THEME_STORAGE_KEY = 'r53-theme';

/** Wraps the shell so pages beneath it can fill the Info panel. */
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <HelpPanelProvider>
      <ConsoleFrame>{children}</ConsoleFrame>
    </HelpPanelProvider>
  );
}

/**
 * The console chrome wrapping every authenticated page.
 *
 * `AppLayout` takes `content`, `navigation`, and `tools` as props rather than
 * rendering `{children}`, which does not fit the App Router's nested-layout
 * model directly. Resolving that is the point of this component: the route
 * group's layout passes its `children` here, and this passes them into
 * `AppLayout`'s `content` prop.
 */
function ConsoleFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const notifications = useNotifications();
  const isCompact = useIsCompact();
  const helpPanel = useHelpPanel();

  const [navigationOpen, setNavigationOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // On a tablet the drawer covers most of the page, so it starts closed there
  // and open on desktop. Tracking the viewport rather than setting it once
  // means rotating a tablet gets the right answer too.
  useEffect(() => {
    setNavigationOpen(!isCompact);
  }, [isCompact]);

  // `@cloudscape-design/global-styles` touches the document as it initialises,
  // so it is imported inside the effect rather than at module scope: a
  // top-level import runs during server rendering, where there is no document.
  const applyTheme = useCallback(async (dark: boolean) => {
    const { applyMode, Mode } = await import('@cloudscape-design/global-styles');
    applyMode(dark ? Mode.Dark : Mode.Light);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark =
      stored === 'dark' ||
      (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches);

    setDarkMode(prefersDark);
    void applyTheme(prefersDark);
  }, [applyTheme]);

  // A client-side route change swaps the content without moving focus, which
  // leaves a screen-reader user still on the link they activated. Moving focus
  // to the content region announces the new page.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [pathname]);

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    void applyTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
  }

  function navigateTo(href: string) {
    router.push(href);
    // On a tablet the drawer overlays the content, so leaving it open would
    // hide the page the user just asked for.
    if (isCompact) setNavigationOpen(false);
  }

  return (
    <>
      <a className="skip-link" href="#console-content">
        Skip to main content
      </a>

      <KeyboardShortcuts onToggleTheme={toggleTheme} />
      <AppTopNavigation darkMode={darkMode} onToggleTheme={toggleTheme} />

      <AppLayout
        headerSelector="#top-navigation"
        contentType="table"
        content={
          <div
            id="console-content"
            ref={mainRef}
            // -1 keeps it out of the tab order while still being focusable by
            // the skip link and by the route-change effect above.
            tabIndex={-1}
            style={{ outline: 'none' }}
          >
            {children}
          </div>
        }
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        navigation={
          <SideNavigation
            header={{ text: 'Route 53', href: '/hosted-zones' }}
            activeHref={activeHref(pathname)}
            items={navigationItems}
            onFollow={(event) => {
              if (event.detail.external) return;
              // Client-side navigation preserves the query cache; letting the
              // browser follow the link would discard it on every click.
              event.preventDefault();
              navigateTo(event.detail.href);
            }}
          />
        }
        notifications={
          <Flashbar
            stackItems
            items={notifications.map((notification) => ({
              id: notification.id,
              type: notification.type,
              header: notification.header,
              content: notification.content,
              dismissible: true,
              dismissLabel: 'Dismiss message',
              onDismiss: () => dismissNotification(notification.id),
            }))}
          />
        }
        // The drawer exists only while a page has put something in it, so pages
        // without help text show no empty Info button.
        toolsHide={helpPanel.content === null}
        tools={helpPanel.content}
        toolsOpen={helpPanel.open}
        onToolsChange={({ detail }) => helpPanel.setOpen(detail.open)}
        ariaLabels={{
          navigation: 'Console navigation',
          navigationToggle: 'Open navigation',
          navigationClose: 'Close navigation',
          notifications: 'Notifications',
          tools: 'Help panel',
          toolsToggle: 'Open help panel',
          toolsClose: 'Close help panel',
        }}
      />
    </>
  );
}

/**
 * Resolves the navigation entry to highlight.
 *
 * A record page lives beneath its zone, so the deepest matching top-level
 * section is highlighted rather than nothing at all.
 */
function activeHref(pathname: string): string {
  if (pathname.startsWith('/hosted-zones')) return '/hosted-zones';
  return pathname;
}
