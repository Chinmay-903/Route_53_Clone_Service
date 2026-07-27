'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import {
  activeHref,
  navigationItems,
  type NavLink,
  type NavSection,
} from '@/components/navigation/navigationItems';
import { BrandLockup, BrandMark } from '@/components/ui/BrandMark';
import { Button, IconButton } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Menu';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';

export const SIDEBAR_WIDTH = 248;
export const SIDEBAR_RAIL_WIDTH = 60;

/**
 * The console's primary navigation.
 *
 * Two states rather than two components: expanded, and a 60px icon rail. The
 * rail keeps every destination reachable — each row becomes a tooltip-labelled
 * icon — which is what separates a collapsible sidebar from one that simply
 * disappears.
 *
 * On a narrow viewport the same markup is rendered as an overlay drawer by the
 * shell, so there is one navigation implementation for all three layouts.
 */
export function Sidebar({
  collapsed,
  onToggleCollapsed,
  onNavigate,
  className,
  /** Suppresses the collapse control in the mobile drawer, where it makes no sense. */
  showCollapseToggle = true,
}: {
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  className?: string;
  showCollapseToggle?: boolean;
}) {
  const pathname = usePathname();
  const active = activeHref(pathname);

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r border-line bg-surface-muted',
        className,
      )}
    >
      {/* Brand ------------------------------------------------------------ */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-line',
          collapsed ? 'justify-center px-2' : 'justify-between px-3.5',
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center rounded-lg transition-opacity hover:opacity-80"
          aria-label="Route 53 Console — go to dashboard"
        >
          {collapsed ? (
            <span className="text-brand">
              <BrandMark size={26} />
            </span>
          ) : (
            <BrandLockup size={26} />
          )}
        </Link>

        {!collapsed && showCollapseToggle && onToggleCollapsed && (
          <Tooltip content="Collapse sidebar" hint="[" side="right">
            <IconButton
              label="Collapse sidebar"
              variant="ghost"
              size="sm"
              onClick={onToggleCollapsed}
              className="text-ink-faint"
            >
              <PanelLeftClose aria-hidden="true" />
            </IconButton>
          </Tooltip>
        )}
      </div>

      {/* Primary action --------------------------------------------------- */}
      <div className={cn('shrink-0 pt-3', collapsed ? 'px-2' : 'px-3')}>
        {collapsed ? (
          <Tooltip content="Create hosted zone" hint="g c" side="right">
            <Button asChild variant="primary" icon size="md" className="w-full">
              <Link href="/hosted-zones/create" onClick={onNavigate} aria-label="Create hosted zone">
                <Plus aria-hidden="true" />
              </Link>
            </Button>
          </Tooltip>
        ) : (
          <Button asChild variant="primary" size="md" fullWidth>
            <Link href="/hosted-zones/create" onClick={onNavigate}>
              <Plus aria-hidden="true" />
              Create hosted zone
            </Link>
          </Button>
        )}
      </div>

      {/* Destinations ----------------------------------------------------- */}
      <nav
        aria-label="Console navigation"
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3',
          collapsed ? 'px-2' : 'px-3',
        )}
      >
        <ul className="flex flex-col gap-0.5">
          {navigationItems.map((item) =>
            item.type === 'link' ? (
              <li key={item.href}>
                <NavRow
                  item={item}
                  active={active === item.href}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              </li>
            ) : (
              <li key={item.label}>
                <NavGroup
                  section={item}
                  active={active}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              </li>
            ),
          )}
        </ul>
      </nav>

      {/* Footer ----------------------------------------------------------- */}
      <div className={cn('shrink-0 border-t border-line py-2.5', collapsed ? 'px-2' : 'px-3')}>
        {collapsed ? (
          showCollapseToggle &&
          onToggleCollapsed && (
            <Tooltip content="Expand sidebar" hint="[" side="right">
              <IconButton
                label="Expand sidebar"
                variant="ghost"
                size="sm"
                onClick={onToggleCollapsed}
                className="w-full text-ink-faint"
              >
                <PanelLeftOpen aria-hidden="true" />
              </IconButton>
            </Tooltip>
          )
        ) : (
          <p className="px-1 text-2xs leading-relaxed text-ink-faint">
            Educational clone. Not affiliated with AWS.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * One navigation row.
 *
 * The active state is a filled pill plus a 3px marker on the leading edge. The
 * marker is a shared `layoutId`, so it slides from the previous destination to
 * the new one rather than blinking out and back in — the single detail that
 * makes the sidebar feel like a product rather than a list of links.
 */
function NavRow({
  item,
  active,
  collapsed,
  onNavigate,
  nested,
}: {
  item: NavLink;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const Icon = item.icon;

  const row = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center rounded-lg text-base font-medium',
        'transition-colors duration-150',
        collapsed ? 'h-9 justify-center' : 'h-8 gap-2.5 px-2.5',
        nested && !collapsed && 'pl-8',
        active ? 'text-brand' : 'text-ink-secondary hover:bg-surface-inset hover:text-ink',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          transition={spring.snappy}
          className="absolute inset-0 rounded-lg bg-brand-wash"
          aria-hidden="true"
        />
      )}

      <Icon
        className={cn(
          'relative size-4 shrink-0 transition-colors',
          active ? 'text-brand' : 'text-ink-faint group-hover:text-ink-secondary',
        )}
        aria-hidden="true"
      />

      {!collapsed && <span className="relative truncate">{item.label}</span>}

      {/* Marks the two sections this build actually implements, so the rest
          read as navigation rather than as broken links. */}
      {!collapsed && item.implemented && !active && (
        <span
          className="relative ml-auto size-1.5 rounded-full bg-success/60"
          aria-hidden="true"
        />
      )}
    </Link>
  );

  if (!collapsed) return row;

  return (
    <Tooltip content={item.label} side="right">
      {row}
    </Tooltip>
  );
}

/**
 * A collapsible group of destinations.
 *
 * Opens itself when the current page is inside it, so a deep link never lands
 * the user on a page whose navigation entry is hidden. In the collapsed rail
 * the group flattens to its children, because a disclosure triangle on a 60px
 * column has nowhere to disclose to.
 */
function NavGroup({
  section,
  active,
  collapsed,
  onNavigate,
}: {
  section: NavSection;
  active: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const contentId = useId();
  const containsActive = section.items.some((item) => item.href === active);
  const [open, setOpen] = useState(containsActive);

  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  if (collapsed) {
    return (
      <ul className="flex flex-col gap-0.5">
        {/* A hairline stands in for the section heading, which has no room. */}
        <li className="my-1.5 h-px bg-line" aria-hidden="true" />
        {section.items.map((item) => (
          <li key={item.href}>
            <NavRow
              item={item}
              active={active === item.href}
              collapsed
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-controls={contentId}
        className={cn(
          'flex h-7 w-full items-center gap-1.5 rounded-md px-2.5',
          'text-2xs font-semibold uppercase tracking-wider',
          'text-ink-faint transition-colors hover:text-ink-secondary',
        )}
      >
        <ChevronDown
          className={cn(
            'size-3 shrink-0 transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          )}
          aria-hidden="true"
        />
        <span className="truncate">{section.label}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={contentId}
            // Animating height to `auto` requires the explicit `0 → auto`
            // pair; a CSS transition cannot interpolate to an intrinsic size.
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-0.5 overflow-hidden"
          >
            {section.items.map((item) => (
              <li key={item.href} className="list-none">
                <NavRow
                  item={item}
                  active={active === item.href}
                  collapsed={false}
                  onNavigate={onNavigate}
                  nested
                />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
