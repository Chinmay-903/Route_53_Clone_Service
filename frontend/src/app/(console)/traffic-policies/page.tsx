import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the Traffic policies section. */
export default function Page() {
  return (
    <ComingSoon
      title="Traffic policies"
      description="Traffic flow builds routing trees visually. The underlying record model supports it; the visual editor is out of scope."
      capabilities={['Policy versions', 'Visual editor', 'Traffic records']}
    />
  );
}
