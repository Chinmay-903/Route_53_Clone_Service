'use client';

import AppLayout from '@cloudscape-design/components/app-layout';
import Flashbar from '@cloudscape-design/components/flashbar';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AppTopNavigation } from '@/components/shell/AppTopNavigation';
import { navigationItems } from '@/components/shell/navigationItems';
import { dismissNotification, useNotifications } from '@/lib/notifications';

const THEME_STORAGE_KEY = 'r53-theme';

/**
 * The console chrome wrapping every authenticated page.
 *
 * `AppLayout` takes `content`, `navigation`, and `tools` as props rather than
 * rendering `{children}`, which does not fit the App Router's nested-layout
 * model directly. Resolving that is the point of this component: the route
 * group's layout passes its `children` here, and this passes them into
 * `AppLayout`'s `content` prop.
 */
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const notifications = useNotifications();

  const [navigationOpen, setNavigationOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    void applyTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
  }

  return (
    <>
      <AppTopNavigation darkMode={darkMode} onToggleTheme={toggleTheme} />
      <AppLayout
        headerSelector="#top-navigation"
        content={children}
        contentType="table"
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
              router.push(event.detail.href);
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
        toolsHide
        ariaLabels={{
          navigation: 'Console navigation',
          navigationToggle: 'Open navigation',
          navigationClose: 'Close navigation',
          notifications: 'Notifications',
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
