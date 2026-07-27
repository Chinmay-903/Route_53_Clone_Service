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
  /**
   * Proxies the API through this origin.
   *
   * Without it the browser talks to the API on another domain, which makes the
   * session cookie third-party — and browsers now block those by default, even
   * with `SameSite=None; Secure`. Login returns 200, the cookie is silently
   * dropped, and every request after it is unauthenticated.
   *
   * Routing through `/api` makes the cookie first-party, which also removes the
   * need for CORS and lets the cookie stay `SameSite=Lax`.
   *
   * `API_ORIGIN` has no NEXT_PUBLIC_ prefix on purpose: the rewrite is resolved
   * on the server, so the value never needs to reach the browser bundle.
   */
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN;
    if (!apiOrigin) return [];
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },

  // Source maps would publish readable application source on the demo host.
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
