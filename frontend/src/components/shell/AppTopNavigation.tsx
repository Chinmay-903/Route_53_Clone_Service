'use client';

import TopNavigation from '@cloudscape-design/components/top-navigation';
import { useQuery } from '@tanstack/react-query';

import { logout, readCurrentUser } from '@/lib/api';
import { queryKeys } from '@/lib/queries/keys';

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
        search={
          <input
            type="search"
            placeholder="Search services"
            aria-label="Search services"
            disabled
            title="Service search is not part of this build"
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-sunken)',
              color: 'var(--text-muted)',
              font: 'inherit',
            }}
          />
        }
        utilities={[
          {
            type: 'button',
            iconName: darkMode ? 'star' : 'star-half',
            text: darkMode ? 'Light mode' : 'Dark mode',
            ariaLabel: darkMode ? 'Switch to light mode' : 'Switch to dark mode',
            onClick: onToggleTheme,
          },
          {
            type: 'button',
            text: 'N. Virginia',
            // Decorative: there are no regions in this application, and a
            // control that looks interactive but does nothing is worse than one
            // that says so.
            ariaLabel: 'Region selector, not functional in this build',
            disableUtilityCollapse: false,
            onClick: () => undefined,
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
            items: [{ id: 'signout', text: 'Sign out' }],
          },
        ]}
        i18nStrings={{
          searchIconAriaLabel: 'Search',
          searchDismissIconAriaLabel: 'Close search',
          overflowMenuTriggerText: 'More',
          overflowMenuTitleText: 'All',
          overflowMenuBackIconAriaLabel: 'Back',
          overflowMenuDismissIconAriaLabel: 'Close menu',
        }}
      />
    </div>
  );
}
