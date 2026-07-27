import {
  Activity,
  AppWindow,
  ArrowLeftRight,
  ArrowRightToLine,
  Boxes,
  ClipboardList,
  Clock,
  Globe,
  LayoutDashboard,
  Network,
  Route,
  ScrollText,
  Shield,
  UserCog,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';

/**
 * Side navigation structure, replicating the real console's labels and order.
 *
 * Only Hosted zones is implemented; every other destination renders the shared
 * placeholder page. They are listed rather than hidden because the navigation
 * tree is a large part of what makes the console recognisable.
 *
 * Icons were added with the redesign. The real console's sidebar is text-only,
 * but a collapsed rail needs a glyph per row to be usable at all, and the icons
 * double as the scan target in the command palette.
 */

export interface NavLink {
  type: 'link';
  label: string;
  href: string;
  icon: LucideIcon;
  /** Marks the sections this build actually implements. */
  implemented?: boolean;
}

export interface NavSection {
  type: 'section';
  label: string;
  icon: LucideIcon;
  items: NavLink[];
}

export type NavItem = NavLink | NavSection;

export const navigationItems: NavItem[] = [
  {
    type: 'link',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    implemented: true,
  },
  {
    type: 'link',
    label: 'Hosted zones',
    href: '/hosted-zones',
    icon: Globe,
    implemented: true,
  },
  { type: 'link', label: 'Health checks', href: '/health-checks', icon: Activity },
  { type: 'link', label: 'IP-based routing', href: '/ip-based-routing', icon: Route },
  {
    type: 'section',
    label: 'Traffic flow',
    icon: Waypoints,
    items: [
      { type: 'link', label: 'Traffic policies', href: '/traffic-policies', icon: Waypoints },
      { type: 'link', label: 'Policy records', href: '/policy-records', icon: ClipboardList },
    ],
  },
  {
    type: 'section',
    label: 'Domains',
    icon: Boxes,
    items: [
      { type: 'link', label: 'Registered domains', href: '/registered-domains', icon: Boxes },
      { type: 'link', label: 'Pending requests', href: '/pending-requests', icon: Clock },
    ],
  },
  {
    type: 'section',
    label: 'Resolver',
    icon: Network,
    items: [
      { type: 'link', label: 'VPCs', href: '/resolver/vpcs', icon: Network },
      {
        type: 'link',
        label: 'Inbound endpoints',
        href: '/resolver/inbound-endpoints',
        icon: ArrowRightToLine,
      },
      {
        type: 'link',
        label: 'Outbound endpoints',
        href: '/resolver/outbound-endpoints',
        icon: ArrowLeftRight,
      },
      { type: 'link', label: 'Rules', href: '/resolver/rules', icon: ScrollText },
      { type: 'link', label: 'Query logging', href: '/resolver/query-logging', icon: ScrollText },
      { type: 'link', label: 'DNS Firewall', href: '/resolver/dns-firewall', icon: Shield },
    ],
  },
  { type: 'link', label: 'Applications', href: '/applications', icon: AppWindow },
  { type: 'link', label: 'Profiles', href: '/profiles', icon: UserCog },
];

/** One searchable destination, as offered by the command palette. */
export interface ConsoleDestination {
  label: string;
  href: string;
  icon: LucideIcon;
  /** The section it sits under, shown as secondary text in the suggestion. */
  group?: string;
  implemented?: boolean;
}

/**
 * Flattens the navigation tree into a searchable list of destinations.
 *
 * Derived from `navigationItems` rather than duplicated, so a section added to
 * the sidebar becomes searchable without a second edit — and the two can never
 * disagree about what exists.
 */
export function consoleDestinations(): ConsoleDestination[] {
  const destinations: ConsoleDestination[] = [];

  for (const item of navigationItems) {
    if (item.type === 'link') {
      destinations.push({
        label: item.label,
        href: item.href,
        icon: item.icon,
        implemented: item.implemented,
      });
    } else {
      for (const child of item.items) {
        destinations.push({
          label: child.label,
          href: child.href,
          icon: child.icon,
          group: item.label,
          implemented: child.implemented,
        });
      }
    }
  }

  return destinations;
}

/**
 * Resolves the navigation entry to highlight for a pathname.
 *
 * A record page lives beneath its zone, so the deepest matching top-level
 * section is highlighted rather than nothing at all.
 */
export function activeHref(pathname: string): string {
  if (pathname.startsWith('/hosted-zones')) return '/hosted-zones';
  if (pathname.startsWith('/resolver/')) return pathname;
  return pathname;
}

/** Human-readable labels for the path segments the breadcrumb cannot infer. */
export const SEGMENT_LABELS: Record<string, string> = {
  'hosted-zones': 'Hosted zones',
  'health-checks': 'Health checks',
  'ip-based-routing': 'IP-based routing',
  'traffic-policies': 'Traffic policies',
  'policy-records': 'Policy records',
  'registered-domains': 'Registered domains',
  'pending-requests': 'Pending requests',
  resolver: 'Resolver',
  vpcs: 'VPCs',
  'inbound-endpoints': 'Inbound endpoints',
  'outbound-endpoints': 'Outbound endpoints',
  rules: 'Rules',
  'query-logging': 'Query logging',
  'dns-firewall': 'DNS Firewall',
  applications: 'Applications',
  profiles: 'Profiles',
  dashboard: 'Dashboard',
  create: 'Create hosted zone',
  records: 'Records',
};
