import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the Policy records section. */
export default function Page() {
  return (
    <ComingSoon
      title="Policy records"
      description="Policy records apply a traffic policy to a domain name. Records here are managed directly instead."
      capabilities={['Policy application', 'Version rollout']}
    />
  );
}
