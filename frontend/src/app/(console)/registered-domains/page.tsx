import { ComingSoon } from '@/components/ui/ComingSoon';

/** Placeholder for the Registered domains section. */
export default function Page() {
  return (
    <ComingSoon
      title="Registered domains"
      description="Domain registration involves a registrar and real payments, neither of which belongs in an educational clone."
      capabilities={['Registration', 'Transfers', 'Auto-renew']}
    />
  );
}
