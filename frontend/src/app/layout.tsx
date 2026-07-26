import type { Metadata } from 'next';

// Cloudscape's global stylesheet must be imported exactly once, and Next.js
// only permits importing global CSS from node_modules in the root layout.
import '@cloudscape-design/global-styles/index.css';
import './globals.css';

import { Providers } from '@/providers';

export const metadata: Metadata = {
  title: 'Route 53 Console Clone',
  description:
    'An educational clone of the AWS Route 53 console for managing hosted zones and DNS records. Not affiliated with Amazon Web Services.',
  robots: { index: false, follow: false },
};

/** Root layout: global styles and the client-side providers. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
