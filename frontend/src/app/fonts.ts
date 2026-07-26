import { Plus_Jakarta_Sans } from 'next/font/google';

/**
 * Display face for the surfaces Cloudscape does not own.
 *
 * `next/font` downloads and self-hosts the files at build time, which matters
 * twice over: the Content-Security-Policy sets `font-src 'self'`, so a runtime
 * request to Google Fonts would be blocked outright; and self-hosting removes a
 * third-party round trip from the critical path.
 *
 * Applied to headings on the login, placeholder, and error screens only. The
 * console keeps Cloudscape's own stack, because matching the real console's
 * typography is the point of using Cloudscape at all.
 */
export const displayFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  // `swap` renders fallback text immediately rather than leaving a blank space
  // while the file loads, so no screen ever shows invisible headings.
  display: 'swap',
  variable: '--font-display',
});
