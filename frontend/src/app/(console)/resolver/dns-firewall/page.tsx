import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the DNS Firewall section. */
export default function Page() {
  return (
    <ComingSoon
      title="DNS Firewall"
      description="DNS Firewall blocks queries against domain lists. It acts at resolution time, which this clone does not perform."
      capabilities={['Domain lists', 'Rule groups', 'Firewall rules']}
    />
  );
}
