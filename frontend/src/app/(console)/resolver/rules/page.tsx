import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the Rules section. */
export default function Page() {
  return (
    <ComingSoon
      title="Rules"
      description="Resolver rules decide which queries are forwarded where."
      capabilities={['Forwarding rules', 'Rule sharing']}
    />
  );
}
