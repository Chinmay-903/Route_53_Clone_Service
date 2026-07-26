import Link from 'next/link';

import { BrandLockup } from '@/components/ui/BrandMark';

/** The 404 page — designed, not a raw framework default. */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-xl)',
      }}
    >
      <div style={{ maxWidth: '46ch', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-strong)', marginBottom: 'var(--space-xl)' }}>
          <BrandLockup />
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-display)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-strong)',
          }}
        >
          404
        </p>
        <h1
          style={{
            margin: 'var(--space-s) 0 var(--space-m)',
            fontSize: 'var(--font-size-heading)',
            fontWeight: 600,
            color: 'var(--text-strong)',
          }}
        >
          That page does not exist
        </h1>
        <p style={{ margin: '0 0 var(--space-xl)', lineHeight: 1.6, color: 'var(--text-muted)' }}>
          The address may be mistyped, or the resource may have been deleted.
        </p>

        <Link
          href="/hosted-zones"
          style={{
            display: 'inline-block',
            padding: 'var(--space-s) var(--space-l)',
            borderRadius: 'var(--radius)',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Go to hosted zones
        </Link>
      </div>
    </main>
  );
}
