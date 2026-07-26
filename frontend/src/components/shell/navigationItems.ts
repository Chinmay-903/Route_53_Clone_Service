import type { SideNavigationProps } from '@cloudscape-design/components/side-navigation';

/**
 * Side navigation structure, replicating the real console's labels and order.
 *
 * Only Hosted zones is implemented; every other destination renders the shared
 * Coming Soon page. They are listed rather than hidden because the navigation
 * tree is a large part of what makes the console recognisable.
 */
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
