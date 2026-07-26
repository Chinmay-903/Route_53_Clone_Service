import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the Health checks section. */
export default function Page() {
  return (
    <ComingSoon
      title="Health checks"
      description="This build focuses on hosted zones and record management. Health checking would require actually probing endpoints, which is outside a DNS-record clone."
      capabilities={['Endpoint monitoring', 'Failover triggers', 'CloudWatch alarms']}
    />
  );
}
