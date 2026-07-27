import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';

import './globals.css';

import { mono, sans } from '@/app/fonts';
import { THEME_SCRIPT } from '@/lib/theme';
import { Providers } from '@/providers';

export const metadata: Metadata = {
  title: {
    default: 'Route 53 Console',
    // Pages set only their own name; this supplies the product half, so the
    // browser tab reads "Hosted zones · Route 53 Console" without every page
    // repeating the suffix.
    template: '%s · Route 53 Console',
  },
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7fa' },
    { media: '(prefers-color-scheme: dark)', color: '#08090f' },
  ],
};

/** Root layout: fonts, global styles, the theme script, and client providers. */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The same nonce the middleware put on the CSP header. The inline theme
  // script below needs it to survive `script-src 'nonce-…' 'strict-dynamic'`;
  // without it the script is blocked and dark mode flashes white on every load.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      // The theme script below mutates this element's class and style before
      // React hydrates, which React would otherwise report as a mismatch.
      suppressHydrationWarning
    >
      <head>
        {/*
          React does not serialise `nonce` to the client — it is deliberately
          omitted from the hydration payload so a nonce cannot be read back out
          of the DOM by injected script. The attribute is therefore present in
          the server HTML and absent on the client, which React itself then
          reports as a mismatch. Suppressing it here is the documented answer;
          the alternative is dropping the nonce, which would let the CSP block
          the script and bring the dark-mode flash back.
        */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      {/*
        Browser extensions — Grammarly and password managers among them — add
        their own attributes to <body> before React hydrates, which React then
        reports as a server/client mismatch the application cannot fix.

        This suppression applies to this element's own attributes and one level
        of text only, so a genuine mismatch anywhere inside still surfaces.
      */}
      <body className="antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
