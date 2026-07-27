import type { Metadata, Viewport } from 'next';

// Cloudscape's global stylesheet must be imported exactly once, and Next.js
// only permits importing global CSS from node_modules in the root layout.
import '@cloudscape-design/global-styles/index.css';
import './globals.css';

import { displayFont } from '@/app/fonts';
import { Providers } from '@/providers';

export const metadata: Metadata = {
  title: 'Route 53 Console Clone',
  description:
    'An educational clone of the AWS Route 53 console for managing hosted zones and DNS records. Not affiliated with Amazon Web Services.',
  robots: { index: false, follow: false },
};

/**
 * Renders every route per request rather than prerendering it at build time.
 *
 * Required by the nonce-based Content-Security-Policy. The middleware mints a
 * fresh nonce per request and Next stamps it onto the script tags it emits —
 * but it can only do that while handling a request. A statically prerendered
 * page is HTML generated at build time, when no request and therefore no nonce
 * exists, so its scripts ship without one and `strict-dynamic` blocks every one
 * of them. The symptom is a blank page with no visible error.
 *
 * The cost is negligible here: every console page is behind authentication and
 * already needs per-request work.
 */
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No maximumScale and no userScalable:false — pinch-zoom is an accessibility
  // affordance, and disabling it to stop iOS input zoom would be the wrong
  // trade. Inputs are sized at 16px instead, which prevents the zoom anyway.
  viewportFit: 'cover',
};

/** Root layout: fonts, global styles, and the client-side providers. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={displayFont.variable}>
      {/*
        Browser extensions — Grammarly and password managers among them — add
        their own attributes to <body> before React hydrates, which React then
        reports as a server/client mismatch the application cannot fix.

        This suppression applies to this element's own attributes and one level
        of text only, so a genuine mismatch anywhere inside still surfaces.
      */}
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
