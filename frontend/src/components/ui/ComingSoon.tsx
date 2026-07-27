'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Globe } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/feedback/EmptyState';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { duration, easeOut } from '@/lib/motion';

/**
 * The single reusable placeholder for console sections that are out of scope.
 *
 * Fourteen routes render this. Rather than apologising, it explains what the
 * real feature does and why it is not here — which is more useful to a reviewer
 * than a progress bar that will never move.
 */
export function ComingSoon({
  title,
  description,
  capabilities,
}: {
  title: string;
  description: string;
  capabilities: string[];
}) {
  return (
    <PageContainer>
      <PageHeader
        title={title}
        badge={<Badge tone="neutral">Not in this build</Badge>}
      />

      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-60" aria-hidden="true" />

        <div className="relative">
          <EmptyState
            variant="build"
            title="Not part of this build"
            description={description}
            action={
              <Button variant="primary" asChild>
                <Link href="/hosted-zones">
                  <Globe aria-hidden="true" />
                  Go to hosted zones
                </Link>
              </Button>
            }
          />

          {capabilities.length > 0 && (
            <div className="mx-auto max-w-2xl px-6 pb-12">
              <p className="mb-3 text-center text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                What the real feature does
              </p>
              <ul className="flex flex-wrap justify-center gap-2">
                {capabilities.map((capability, index) => (
                  <motion.li
                    key={capability}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: duration.base,
                      ease: easeOut,
                      delay: 0.24 + index * 0.06,
                    }}
                  >
                    <Badge tone="outline" className="h-7 px-2.5">
                      {capability}
                    </Badge>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-line bg-surface-muted px-6 py-3.5 text-center">
            <p className="text-sm text-ink-muted">
              Hosted zones and records are fully implemented.{' '}
              <Link
                href="/hosted-zones"
                className="inline-flex items-center gap-0.5 font-medium text-brand underline-offset-4 hover:underline"
              >
                Open them
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
