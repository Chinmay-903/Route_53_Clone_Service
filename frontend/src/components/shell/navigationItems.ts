import type { SideNavigationProps } from '@cloudscape-design/components/side-navigation';

/**
 * Side navigation structure, replicating the real console's labels and order.
 *
 * Only Hosted zones is implemented; every other destination renders the shared
 * Coming Soon page. They are listed rather than hidden because the navigation
 * tree is a large part of what makes the console recognisable.
 */
/** One searchable destination, as offered by the top bar's service search. */
export interface ConsoleDestination {
  label: string;
  href: string;
  /** The section it sits under, shown as secondary text in the suggestion. */
  group?: string;
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
      destinations.push({ label: item.text, href: item.href });
    } else if (item.type === 'section') {
      for (const child of item.items) {
        if (child.type === 'link') {
          destinations.push({ label: child.text, href: child.href, group: item.text });
        }
      }
    }
  }
  return destinations;
}

export const navigationItems: SideNavigationProps.Item[] = [
  { type: 'link', text: 'Dashboard', href: '/dashboard' },
  { type: 'link', text: 'Hosted zones', href: '/hosted-zones' },
  { type: 'link', text: 'Health checks', href: '/health-checks' },
  { type: 'link', text: 'IP-based routing', href: '/ip-based-routing' },
  { type: 'divider' },
  {
    type: 'section',
    text: 'Traffic flow',
    items: [
      { type: 'link', text: 'Traffic policies', href: '/traffic-policies' },
      { type: 'link', text: 'Policy records', href: '/policy-records' },
    ],
  },
  {
    type: 'section',
    text: 'Domains',
    items: [
      { type: 'link', text: 'Registered domains', href: '/registered-domains' },
      { type: 'link', text: 'Pending requests', href: '/pending-requests' },
    ],
  },
  {
    type: 'section',
    text: 'Resolver',
    items: [
      { type: 'link', text: 'VPCs', href: '/resolver/vpcs' },
      { type: 'link', text: 'Inbound endpoints', href: '/resolver/inbound-endpoints' },
      { type: 'link', text: 'Outbound endpoints', href: '/resolver/outbound-endpoints' },
      { type: 'link', text: 'Rules', href: '/resolver/rules' },
      { type: 'link', text: 'Query logging', href: '/resolver/query-logging' },
      { type: 'link', text: 'DNS Firewall', href: '/resolver/dns-firewall' },
    ],
  },
  { type: 'divider' },
  { type: 'link', text: 'Applications', href: '/applications' },
  { type: 'link', text: 'Profiles', href: '/profiles' },
];
