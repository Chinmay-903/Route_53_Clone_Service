'use client';

import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';

import { toUserMessage } from '@/lib/queries/client';

/**
 * The designed failure state.
 *
 * Shows the API's own explanation, which is written for humans and carries no
 * internal detail, plus a retry. A raw error object never reaches the screen.
 */
export function ErrorState({
  title = 'Could not load this data',
  error,
  onRetry,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <Box padding={{ vertical: 'xl', horizontal: 'l' }} textAlign="center">
      <SpaceBetween size="m" alignItems="center">
        <ErrorMotif />
        <div style={{ maxWidth: '52ch', textAlign: 'left' }}>
          <Alert
            type="error"
            header={title}
            action={
              onRetry ? (
                <Button onClick={onRetry} iconName="refresh">
                  Retry
                </Button>
              ) : undefined
            }
          >
            {toUserMessage(error)}
          </Alert>
        </div>
      </SpaceBetween>
    </Box>
  );
}

/** Decorative motif; the alert beside it carries the meaning. */
function ErrorMotif() {
  return (
    <svg width="76" height="64" viewBox="0 0 76 64" fill="none" aria-hidden="true">
      <path
        d="M38 8L70 58H6L38 8Z"
        stroke="var(--danger)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path d="M38 26v14" stroke="var(--danger)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="38" cy="48" r="2.5" fill="var(--danger)" />
    </svg>
  );
}
