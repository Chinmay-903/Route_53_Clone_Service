import type { NextConfig } from 'next';

/**
 * Next.js configuration.
 *
 * Cloudscape ships untranspiled ES modules, so Next must compile them itself;
 * without `transpilePackages` the build fails on their `import` syntax.
 */
const nextConfig: NextConfig = {
  // Pins the trace root to this package. Without it Next walks up and finds an
  // unrelated lockfile in the home directory, then warns about the ambiguity.
  outputFileTracingRoot: __dirname,
  transpilePackages: [
    '@cloudscape-design/components',
    '@cloudscape-design/component-toolkit',
  ],
  // Source maps would publish readable application source on the demo host.
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
