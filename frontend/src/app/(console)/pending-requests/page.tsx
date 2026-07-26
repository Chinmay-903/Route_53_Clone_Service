import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the Pending requests section. */
export default function Page() {
  return (
    <ComingSoon
      title="Pending requests"
      description="Tracks in-flight registration and transfer operations. Nothing here registers domains, so there is nothing to track."
      capabilities={['Operation status', 'Transfer progress']}
    />
  );
}
