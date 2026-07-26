import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the Outbound endpoints section. */
export default function Page() {
  return (
    <ComingSoon
      title="Outbound endpoints"
      description="Outbound endpoints forward queries from the resolver to another network."
      capabilities={['Forwarding targets', 'Availability zones']}
    />
  );
}
