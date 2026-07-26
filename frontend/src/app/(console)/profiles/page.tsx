import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the Profiles section. */
export default function Page() {
  return (
    <ComingSoon
      title="Profiles"
      description="Profiles share DNS configuration across VPCs and accounts. There is no multi-account model here."
      capabilities={['Shared configuration', 'Account sharing']}
    />
  );
}
