import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';

/**
 * ESLint's flat configuration.
 *
 * `npm run lint` had no config file to find, so it exited with an error rather
 * than linting anything. `eslint-config-next` is still published in the legacy
 * shareable format, which is what `FlatCompat` is for — it adapts that format
 * into the flat one ESLint 9 requires.
 */
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      // Written by Next.js on every build, so a finding here cannot be fixed —
      // the next build would put it straight back.
      'next-env.d.ts',
      // Regenerated from the OpenAPI schema by `npm run generate:api`, so any
      // finding here would be reintroduced on the next run.
      'src/lib/api/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // The console renders untrusted DNS values as text everywhere; the one
      // `dangerouslySetInnerHTML` is the pre-paint theme script in the root
      // layout, which is a static string this project authors itself.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
