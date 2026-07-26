import { defineConfig } from '@hey-api/openapi-ts';

/**
 * Generates the typed API client from the backend's own OpenAPI schema.
 *
 * Regenerate with `npm run generate:api` after any API change. CI does the same
 * and then typechecks, so a breaking contract change fails the build instead of
 * surfacing as a runtime error in the browser.
 */
export default defineConfig({
  input: './openapi.json',
  output: {
    path: './src/lib/api',
    postProcess: ['prettier'],
  },
  plugins: [
    {
      name: '@hey-api/client-fetch',
      // Cookies carry the session, so every request must be credentialed.
      runtimeConfigPath: './src/lib/api-config.ts',
    },
  ],
});
