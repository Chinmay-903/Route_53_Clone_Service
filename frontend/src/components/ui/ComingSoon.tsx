'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Link from 'next/link';

/**
 * The single reusable placeholder for console sections that are out of scope.
 *
 * There are six of these routes. A bare "Coming soon" heading on each would be
 * the most visible quality tell in the application, so this is composed as
 * deliberately as a real page: an original geometric motif, a stated scope
 * boundary, and a route back to the part that does work.
 */
export function ComingSoon({
  title,
  description,
  capabilities,
}: {
  title: string;
  description: string;
  capabilities: string[];
}) {
  return (
    <ContentLayout header={<Header variant="h1">{title}</Header>}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--space-l)',
          padding: 'var(--space-xxl) var(--space-l)',
          background: 'var(--surface-raised)',
          border: 'var(--border-width) solid var(--border-subtle)',
          borderRadius: 'var(--radius)',
        }}
      >
        <PlaceholderMotif />

        <div style={{ maxWidth: '52ch' }}>
          <h2
            style={{
              margin: '0 0 var(--space-s)',
              fontSize: 'var(--font-size-heading)',
              color: 'var(--text-strong)',
              letterSpacing: '-0.01em',
            }}
          >
            Not part of this build
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--font-size-lead)',
              lineHeight: 1.6,
              color: 'var(--text-muted)',
            }}
          >
            {description}
          </p>
        </div>

        {capabilities.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 'var(--space-s)',
              maxWidth: '60ch',
            }}
          >
            {capabilities.map((capability) => (
              <li
                key={capability}
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--text-muted)',
                  background: 'var(--surface-sunken)',
                  border: 'var(--border-width) solid var(--border-subtle)',
                  borderRadius: '999px',
                  padding: 'var(--space-xs) var(--space-m)',
                }}
              >
                {capability}
              </li>
            ))}
          </ul>
        )}

        <SpaceBetween direction="horizontal" size="xs">
          <Button variant="primary" href="/hosted-zones" ariaLabel="Go to hosted zones">
            Go to hosted zones
          </Button>
        </SpaceBetween>

        <Box variant="small" color="text-status-inactive">
          Hosted zones and records are fully implemented.{' '}
          <Link href="/hosted-zones" style={{ color: 'var(--accent)' }}>
            Open them
          </Link>
          .
        </Box>
      </div>
    </ContentLayout>
  );
}

/**
 * An original geometric motif rather than stock art.
 *
 * Reads as a partially-built structure: solid where the application is
 * complete, outlined where it is not. Decorative only, so it is hidden from
 * assistive technology — the heading beside it carries the meaning.
 */
function PlaceholderMotif() {
  return (
    <svg width="132" height="88" viewBox="0 0 132 88" fill="none" aria-hidden="true">
      <rect
        x="0.75"
        y="0.75"
        width="130.5"
        height="86.5"
        rx="6"
        stroke="var(--border-subtle)"
        strokeDasharray="5 5"
      />
      <rect x="16" y="52" width="26" height="20" rx="3" fill="var(--accent)" opacity="0.9" />
      <rect x="16" y="30" width="26" height="18" rx="3" fill="var(--accent)" opacity="0.45" />
      <rect
        x="52.5"
        y="40.5"
        width="26"
        height="31"
        rx="3"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
      />
      <rect
        x="89.5"
        y="24.5"
        width="26"
        height="47"
        rx="3"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
      />
      <circle cx="29" cy="20" r="4" fill="var(--accent)" />
    </svg>
  );
}
