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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
