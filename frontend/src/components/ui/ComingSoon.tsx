'use client';

import Button from '@cloudscape-design/components/button';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Link from 'next/link';

import styles from './ComingSoon.module.css';

/**
 * The single reusable placeholder for console sections that are out of scope.
 *
 * Six routes render this. Rather than apologising, it explains what the real
 * feature does and why it is not here — which is more useful to a reviewer than
 * a progress bar that will never move.
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
      <div className={`${styles.panel} stagger`}>
        <PlaceholderMotif />

        <div className={styles.copy}>
          <h2 className={styles.title}>Not part of this build</h2>
          <p className={styles.description}>{description}</p>
        </div>

        {capabilities.length > 0 && (
          <ul className={styles.chips}>
            {capabilities.map((capability) => (
              <li key={capability} className={styles.chip}>
                {capability}
              </li>
            ))}
          </ul>
        )}

        <Button variant="primary" href="/hosted-zones">
          Go to hosted zones
        </Button>

        <p className={styles.footnote}>
          Hosted zones and records are fully implemented.{' '}
          <Link href="/hosted-zones">Open them</Link>.
        </p>
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
    <svg
      width="148"
      height="96"
      viewBox="0 0 148 96"
      fill="none"
      aria-hidden="true"
      // Scales down with the panel on a phone instead of forcing a minimum
      // width the container has to accommodate.
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <rect
        x="0.75"
        y="0.75"
        width="146.5"
        height="94.5"
        rx="8"
        stroke="var(--border-subtle)"
        strokeDasharray="5 6"
      />
      <rect x="20" y="56" width="28" height="22" rx="4" fill="var(--accent)" />
      <rect x="20" y="32" width="28" height="19" rx="4" fill="var(--accent)" opacity="0.4" />
      <rect
        x="60.5"
        y="44.5"
        width="28"
        height="33.5"
        rx="4"
        stroke="var(--border-strong)"
        strokeWidth="1.5"
      />
      <rect
        x="101.5"
        y="26.5"
        width="28"
        height="51.5"
        rx="4"
        stroke="var(--border-strong)"
        strokeWidth="1.5"
      />
      <circle cx="34" cy="21" r="4.5" fill="var(--accent)" />
    </svg>
  );
}
