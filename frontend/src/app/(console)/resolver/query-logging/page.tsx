import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the Query logging section. */
export default function Page() {
  return (
    <ComingSoon
      title="Query logging"
      description="Query logging records every DNS query answered. No queries are resolved here, so there are none to log."
      capabilities={['Log configurations', 'Destinations']}
    />
  );
}
