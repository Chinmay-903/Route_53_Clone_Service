'use client';

import { useEffect } from 'react';

import { readCurrentUser } from '@/lib/api';

/**
 * Wakes the API while the user is still reading the sign-in screen.
 *
 * The demo backend runs on a free tier that stops the container after 15
 * minutes idle, and the first request afterwards waits 30–60 seconds for it to
 * start. Firing a request on mount moves that wait into the time the user
 * spends typing their credentials, so by the time they submit the server is
 * usually already up.
 *
 * It warms through `/api/v1/auth/me` rather than `/healthz` for a practical
 * reason: only `/api/*` is proxied through this origin, so `/healthz` would hit
 * the frontend's own 404 and never reach the backend at all.
 *
 * Deliberately fire-and-forget. On this screen the caller is signed out, so a
 * 401 is the expected answer — the response is irrelevant, only the round trip
 * matters. A failure means the server is down, which the sign-in attempt will
 * report properly a moment later.
 */
export function useWarmBackend(): void {
  useEffect(() => {
    void readCurrentUser().catch(() => undefined);
  }, []);
}
