'use client';

import Input from '@cloudscape-design/components/input';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import { useQuery } from '@tanstack/react-query';

import { logout, readCurrentUser } from '@/lib/api';
import { queryKeys } from '@/lib/queries/keys';

// Empty means same-origin; see the note in api-config.ts.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/**
 * The console's top bar.
 *
 * The brand slot carries this project's own mark and wordmark. No AWS logo or
 * wordmark appears anywhere: replicating a layout is the assignment, but
 * shipping a trademarked asset would be a legal problem rather than a styling
 * choice.
 */
export function AppTopNavigation({
  darkMode,
  onToggleTheme,
}: {
  darkMode: boolean;
  onToggleTheme: () => void;
}) {
  const { data: user } = useQuery({
    queryKey: queryKeys.session(),
    queryFn: async () => {
      const { data, error } = await readCurrentUser();
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  async function handleSignOut() {
    await logout();
    // A full navigation so the middleware re-evaluates against the now-cleared
    // cookie and the query cache is discarded with the page.
    window.location.assign('/login');
  }

  return (
    <div id="top-navigation" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
      <TopNavigation
        identity={{
          href: '/hosted-zones',
          title: 'Route 53 Console Clone',
          logo: { src: '/brand-mark.svg', alt: '' },
        }}
        // Cloudscape collapses this into an icon below its own breakpoint, so
        // the bar stays usable on a tablet without a second implementation.
        search={
          <Input
            type="search"
            value=""
            readOnly
            placeholder="Search services"
            ariaLabel="Search services — not functional in this build"
          />
        }
        utilities={[
          {
            type: 'button',
            // A sun and moon rather than one of Cloudscape's stock glyphs: the
            // control switches appearance, and no built-in icon says that.
            iconSvg: darkMode ? <SunIcon /> : <MoonIcon />,
            text: darkMode ? 'Light' : 'Dark',
            ariaLabel: darkMode ? 'Switch to light mode' : 'Switch to dark mode',
            onClick: onToggleTheme,
          },
          {
            type: 'button',
            iconName: 'settings',
            text: 'N. Virginia',
            // Decorative: this application has no regions. Saying so in the
            // label is better than a control that looks live and does nothing.
            ariaLabel: 'Region selector — not functional in this build',
            disableTextCollapse: false,
          },
          {
            type: 'menu-dropdown',
            text: user?.email ?? 'Account',
            description: user?.email,
            iconName: 'user-profile',
            ariaLabel: 'Account menu',
            onItemClick: ({ detail }) => {
              if (detail.id === 'signout') void handleSignOut();
            },
            items: [
              {
                id: 'docs',
                text: 'API documentation',
                href: `${API_BASE_URL}/docs`,
                external: true,
                externalIconAriaLabel: '(opens in a new tab)',
              },
              { id: 'signout', text: 'Sign out' },
            ],
          },
        ]}
        i18nStrings={{
          overflowMenuTriggerText: 'More',
          overflowMenuTitleText: 'All',
          overflowMenuBackIconAriaLabel: 'Back',
          overflowMenuDismissIconAriaLabel: 'Close menu',
        }}
      />
    </div>
  );
}

/** Outline sun, matching Cloudscape's 16px icon grid and 1.5px stroke. */
function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" focusable="false">
      <circle cx="8" cy="8" r="3.25" />
      <path
        d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06M12.95 12.95l-1.06-1.06M4.11 4.11L3.05 3.05"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Outline moon, drawn on the same grid so the two toggle states feel paired. */
function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" focusable="false">
      <path
        d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.75 5.75 0 1 0 7.1 7.1Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
