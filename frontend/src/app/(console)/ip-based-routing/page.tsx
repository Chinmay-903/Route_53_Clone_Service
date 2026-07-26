import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the IP-based routing section. */
export default function Page() {
  return (
    <ComingSoon
      title="IP-based routing"
      description="IP-based routing answers queries differently depending on the resolver's address block. The routing policy is modelled but not evaluated in this build."
      capabilities={['CIDR collections', 'Location mapping']}
    />
  );
}
