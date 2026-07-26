import Link from 'next/link';

import { BrandMark } from '@/components/ui/BrandMark';

/** The 404 page — designed, not a raw framework default. */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-xl) var(--space-l)',
      }}
    >
      <div className="animate-rise" style={{ maxWidth: '46ch', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            marginBottom: 'var(--space-2xl)',
            color: 'var(--text-strong)',
            fontFamily: 'var(--font-display), system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 'var(--text-title)',
            letterSpacing: '-0.015em',
          }}
        >
          <BrandMark size={28} />
          Route 53
        </div>

        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-display), system-ui, sans-serif',
            fontSize: 'var(--text-display)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: 'var(--accent)',
          }}
        >
          404
        </p>
        <h1
          style={{
            margin: 'var(--space-s) 0 var(--space-m)',
            fontFamily: 'var(--font-display), system-ui, sans-serif',
            fontSize: 'var(--text-heading)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-strong)',
            textWrap: 'balance',
          }}
        >
          That page does not exist
        </h1>
        <p
          style={{
            margin: '0 0 var(--space-2xl)',
            lineHeight: 'var(--leading-normal)',
            color: 'var(--text-muted)',
          }}
        >
          The address may be mistyped, or the resource may have been deleted.
        </p>

        <Link
          href="/hosted-zones"
          style={{
            display: 'inline-block',
            padding: 'var(--space-s) var(--space-l)',
            borderRadius: 'var(--radius-s)',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            fontWeight: 600,
            fontSize: 'var(--text-body)',
            textDecoration: 'none',
          }}
        >
          Go to hosted zones
        </Link>
      </div>
    </main>
  );
}
