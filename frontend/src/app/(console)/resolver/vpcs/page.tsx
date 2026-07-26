import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the VPCs section. */
export default function Page() {
  return (
    <ComingSoon
      title="VPCs"
      description="Resolver features operate inside a VPC. This clone has no network model."
      capabilities={['VPC associations', 'DNS resolution']}
    />
  );
}
