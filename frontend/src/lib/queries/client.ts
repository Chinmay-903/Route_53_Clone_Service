'use client';

import { client } from '@/lib/api/client.gen';
import { CSRF_HEADER_NAME, readCsrfToken } from '@/lib/api-config';
import type { ProblemDetail } from '@/lib/api/types.gen';

/**
 * Attaches the CSRF header to state-changing requests.
 *
 * Registered once at module load rather than passed per call, so no mutation
 * can forget it.
 */
client.interceptors.request.use((request) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const token = readCsrfToken();
    if (token) request.headers.set(CSRF_HEADER_NAME, token);
  }
  return request;
});

/** True when a value looks like the API's RFC 9457 error body. */
function isProblemDetail(value: unknown): value is ProblemDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'detail' in value &&
    typeof (value as ProblemDetail).detail === 'string'
  );
}

/**
 * Turns any thrown value into a sentence safe to show a user.
 *
 * The API's `detail` is written for humans and contains no internal data, so it
 * is shown directly. Anything else falls back to a generic message rather than
 * risking a raw error object reaching the screen.
 */
export function toUserMessage(error: unknown): string {
  if (isProblemDetail(error)) return error.detail;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

export { client };
