import { Inter, JetBrains_Mono } from 'next/font/google';

/**
 * The interface face.
 *
 * `next/font` downloads and self-hosts the files at build time, which matters
 * twice over: the Content-Security-Policy sets `font-src 'self'`, so a runtime
 * request to Google Fonts would be blocked outright; and self-hosting removes a
 * third-party round trip from the critical path.
 *
 * Loaded as a variable font so every weight from 100 to 900 costs one file, and
 * the interface can use 450 for body text and 620 for headings — weights a
 * static cut does not offer.
 */
export const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  // Inter's contextual alternates fix the spacing around punctuation, and `cv11`
  // swaps the single-storey `l` for one with a tail so `Il1` stay distinct —
  // which matters in a console full of domain names and record values.
  axes: ['opsz'],
});

/**
 * The monospace face, used wherever the exact characters matter: record values,
 * zone IDs, keyboard hints, and the zone-file preview.
 *
 * JetBrains Mono is chosen over the system stack for its disambiguated glyphs —
 * a slashed zero and a dotted `i` prevent the misreadings that make a copied
 * IPv6 address fail silently.
 */
export const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});
