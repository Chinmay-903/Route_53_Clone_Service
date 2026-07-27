'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { useState } from 'react';

// Registers the CSRF interceptor on the generated client.
import '@/lib/queries/client';

import { Toaster } from '@/components/feedback/Toaster';
import { ThemeProvider } from '@/lib/theme';

/** Client-side providers shared by every route. */
export function Providers({ children }: { children: React.ReactNode }) {
  // Created in state rather than at module scope so each browser tab gets its
  // own cache and no request state is shared across users during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // A 401 or 404 will not become a 200 on retry; retrying only delays
            // the error the user needs to see.
            retry: (failureCount, error) => {
              const status = (error as { status?: number } | null)?.status;
              if (status === 401 || status === 404) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider>
      {/*
        `reducedMotion="user"` makes every Framer Motion animation in the tree
        respect the OS setting, matching what the media query in globals.css
        does for CSS animations. Without it the two halves of the motion system
        would disagree, and a user who asked for less motion would still get
        every spring transition.
      */}
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </QueryClientProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
