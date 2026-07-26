import type { CreateClientConfig } from './api/client.gen';

/**
 * Runtime configuration applied to the generated API client.
 *
 * Two things the generator cannot infer: the session lives in a cookie, so
 * every request must be credentialed; and writes carry a double-submit CSRF
 * token read from the cookie the login response set.
 */
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
  credentials: 'include',
});

const CSRF_COOKIE_NAME = 'r53_csrf';

/**
 * Reads the CSRF token the API set at login.
 *
 * Deliberately readable by script — that is the point of the double-submit
 * pattern. A cross-origin page can send the cookie but cannot read it, so it
 * cannot reproduce the matching header.
 */
export function readCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CSRF_COOKIE_NAME}=`));

  return match ? decodeURIComponent(match.slice(CSRF_COOKIE_NAME.length + 1)) : null;
}

/** Header name the API expects the CSRF token in. */
export const CSRF_HEADER_NAME = 'X-CSRF-Token';
