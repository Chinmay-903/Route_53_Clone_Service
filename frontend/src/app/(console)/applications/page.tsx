import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the Applications section. */
export default function Page() {
  return (
    <ComingSoon
      title="Applications"
      description="Groups DNS resources by application. Zones are managed directly in this build."
      capabilities={['Resource grouping', 'Application view']}
    />
  );
}
