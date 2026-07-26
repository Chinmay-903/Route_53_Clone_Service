import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the Inbound endpoints section. */
export default function Page() {
  return (
    <ComingSoon
      title="Inbound endpoints"
      description="Inbound endpoints forward DNS queries from a network into the resolver."
      capabilities={['IP addresses', 'Security groups']}
    />
  );
}
