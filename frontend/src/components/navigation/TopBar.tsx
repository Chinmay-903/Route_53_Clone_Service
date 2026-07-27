'use client';

import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Bell,
  Command as CommandIcon,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Search,
  Sun,
  User,
} from 'lucide-react';

import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { Kbd, Menu, Tooltip } from '@/components/ui/Menu';
import { logout, readCurrentUser } from '@/lib/api';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';
import { useNotifications } from '@/lib/notifications';
import { queryKeys } from '@/lib/queries/keys';
import { useTheme } from '@/lib/theme';

// Empty means same-origin; see the note in api-config.ts.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/**
 * The console's top bar.
 *
 * The brand slot carries this project's own mark and wordmark. No AWS logo or
 * wordmark appears anywhere: replicating a layout is the assignment, but
 * shipping a trademarked asset would be a legal problem rather than a styling
 * choice.
 *
 * Sticky and translucent, so the content scrolls beneath it rather than under
 * an opaque band — which is what keeps a dense table from feeling truncated at
 * the top.
 */
export function TopBar({
  onOpenPalette,
  onOpenMobileNav,
}: {
  onOpenPalette: () => void;
  onOpenMobileNav: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const notifications = useNotifications();

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

  const email = user?.email ?? '';
  const initial = email.charAt(0).toUpperCase() || '?';

  return (
    <header
      id="top-navigation"
      className={cn(
        'sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-4',
        'glass',
      )}
    >
      {/* The drawer trigger exists only below the breakpoint at which the
          sidebar becomes a permanent column. */}
      <IconButton
        label="Open navigation"
        variant="ghost"
        size="sm"
        onClick={onOpenMobileNav}
        className="lg:hidden"
      >
        <MenuIcon aria-hidden="true" />
      </IconButton>

      <Breadcrumbs className="min-w-0 flex-1" />

      {/*
        A button rather than an input. It looks like a search field because that
        is what it does, but the actual search happens in the palette — so
        anything that opened a text cursor here would be a dead end.
      */}
      <button
        type="button"
        onClick={onOpenPalette}
        className={cn(
          'group hidden h-8 items-center gap-2 rounded-lg border border-line bg-surface/70 pl-2.5 pr-1.5 md:flex',
          'text-sm text-ink-faint transition-all duration-200',
          'hover:-translate-y-px hover:border-line-strong hover:bg-surface hover:shadow-sm',
          'lg:w-64',
        )}
        aria-label="Open command palette"
      >
        <Search className="size-3.5 shrink-0 transition-colors group-hover:text-brand" aria-hidden="true" />
        <span className="hidden flex-1 text-left lg:block">Search…</span>
        <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
          <Kbd>
            <CommandIcon className="size-2.5" />
          </Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <Tooltip content="Search" hint="⌘K">
        <IconButton
          label="Open command palette"
          variant="ghost"
          size="sm"
          onClick={onOpenPalette}
          className="md:hidden"
        >
          <Search aria-hidden="true" />
        </IconButton>
      </Tooltip>

      <div className="mx-0.5 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />

      {/*
        The count reflects the live notification store, so the badge is the same
        source of truth as the toasts rather than a second, drifting one.
      */}
      <Tooltip content={notifications.length ? `${notifications.length} unread` : 'No notifications'}>
        <IconButton label="Notifications" variant="ghost" size="sm" className="relative">
          <Bell aria-hidden="true" />
          <AnimatePresence>
            {notifications.length > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={spring.bouncy}
                className={cn(
                  'absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center',
                  'rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-brand-contrast',
                )}
                aria-hidden="true"
              >
                {notifications.length > 9 ? '9+' : notifications.length}
              </motion.span>
            )}
          </AnimatePresence>
        </IconButton>
      </Tooltip>

      <Tooltip
        content={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        hint="⇧D"
      >
        <IconButton
          label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
        >
          {/*
            The two glyphs cross-fade and counter-rotate rather than swapping,
            so the control reads as one thing changing state instead of two
            different buttons alternating.
          */}
          <span className="relative flex size-4 items-center justify-center">
            <AnimatePresence initial={false} mode="wait">
              {theme === 'dark' ? (
                <motion.span
                  key="sun"
                  initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                >
                  <Sun className="size-4" aria-hidden="true" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                >
                  <Moon className="size-4" aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </IconButton>
      </Tooltip>

      {/* Decorative: this application has no regions. Saying so in the label is
          better than a control that looks live and does nothing. */}
      <Badge
        tone="neutral"
        className="hidden font-mono lg:inline-flex"
        title="Region selector — not functional in this build"
      >
        us-east-1
      </Badge>

      <Menu
        label="Account menu"
        align="end"
        items={[
          { id: 'docs', label: 'API documentation', icon: <BookOpen /> },
          { id: 'signout', label: 'Sign out', icon: <LogOut />, danger: true, separatorBefore: true },
        ]}
        onSelect={(id) => {
          if (id === 'signout') void handleSignOut();
          if (id === 'docs') window.open(`${API_BASE_URL}/docs`, '_blank', 'noopener,noreferrer');
        }}
        trigger={
          <button
            type="button"
            className={cn(
              'flex h-8 items-center gap-2 rounded-lg pl-1 pr-1.5 transition-colors',
              'hover:bg-surface-inset',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            )}
            aria-label={email ? `Account menu for ${email}` : 'Account menu'}
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-md',
                'bg-gradient-to-br from-brand-500 to-brand-700 text-2xs font-semibold text-white',
              )}
              aria-hidden="true"
            >
              {user ? initial : <User className="size-3" />}
            </span>
            <span className="hidden max-w-36 truncate text-sm text-ink-secondary xl:block">
              {email || 'Account'}
            </span>
          </button>
        }
      />
    </header>
  );
}
