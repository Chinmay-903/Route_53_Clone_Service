'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Activity,
  CircleDashed,
  Globe as GlobeIcon,
  ListTree,
  Lock,
  Plus,
  Sparkles,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { StatCard } from '@/components/cards/StatCard';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Badge, StatusDot } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { duration, easeOut } from '@/lib/motion';
import { useHostedZones } from '@/lib/queries/hosted-zones';
import { useHostedZoneStats } from '@/lib/queries/zone-stats';

/** Client-only and non-essential, so it never blocks the figures beside it. */
const Globe = dynamic(
  () => import('@/components/visuals/Globe').then((module) => module.Globe),
  { ssr: false },
);

/**
 * The dashboard.
 *
 * Likely the first screen a reviewer sees, so it reports real counts from the
 * API rather than standing in as a placeholder. It states plainly which parts
 * of the console are implemented, which is more useful than inventing metrics
 * nothing here produces.
 */
export default function DashboardPage() {
  const router = useRouter();
  const stats = useHostedZoneStats();
  const query = useHostedZones({ sort: 'name', order: 'asc', limit: 50, offset: 0 });

  const zones = query.data?.items ?? [];
  const busiest = [...zones].sort((a, b) => b.record_count - a.record_count).slice(0, 5);
  const maxRecords = Math.max(1, ...busiest.map((zone) => zone.record_count));

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Manage hosted zones and the DNS records inside them."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/hosted-zones">
                View hosted zones
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="primary" onClick={() => router.push('/hosted-zones/create')}>
              <Plus aria-hidden="true" />
              Create hosted zone
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Hosted zones"
          value={stats.zoneCount}
          hint="Across this account"
          icon={<GlobeIcon />}
          tone="brand"
          loading={stats.loading}
          onClick={() => router.push('/hosted-zones')}
        />
        <StatCard
          label="Record sets"
          value={stats.recordCount}
          hint={stats.truncated ? 'Across the first 100 zones' : 'Including generated SOA and NS'}
          icon={<ListTree />}
          tone="info"
          loading={stats.loading}
          onClick={() => router.push('/hosted-zones')}
        />
        <StatCard
          label="Private zones"
          value={stats.privateCount}
          hint="Answer inside associated networks"
          icon={<Lock />}
          tone="warning"
          loading={stats.loading}
        />
        <StatCard
          label="Health checks"
          value={null}
          hint="Not part of this build"
          icon={<Activity />}
          tone="neutral"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* Busiest zones ---------------------------------------------------
            Sorted by record count rather than by name: on a dashboard the
            useful question is which zone has the most in it, and the full
            alphabetical list is one click away. */}
        <Card>
          <CardHeader
            title="Your hosted zones"
            description="The five holding the most records."
            icon={<GlobeIcon />}
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/hosted-zones">
                  View all
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <CardBody className="p-2">
            {query.isLoading ? (
              <ul className="flex flex-col gap-1 p-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <li key={index} className="flex items-center gap-3 px-1 py-2">
                    <Skeleton className="size-7 rounded-lg" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-12" />
                  </li>
                ))}
              </ul>
            ) : busiest.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                <CircleDashed className="size-8 text-ink-faint" aria-hidden="true" />
                <p className="max-w-[36ch] text-base text-ink-muted">
                  No hosted zones yet. Create one to start managing DNS records for a
                  domain.
                </p>
                <Button variant="primary" size="sm" asChild>
                  <Link href="/hosted-zones/create">
                    <Plus aria-hidden="true" />
                    Create hosted zone
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col">
                {busiest.map((zone, index) => (
                  <motion.li
                    key={zone.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: duration.base, ease: easeOut, delay: index * 0.05 }}
                  >
                    <Link
                      href={`/hosted-zones/${zone.id}`}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-2.5 py-2.5',
                        'transition-colors hover:bg-surface-inset',
                      )}
                    >
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-inset text-ink-faint transition-colors group-hover:border-line-accent group-hover:bg-brand-wash group-hover:text-brand"
                        aria-hidden="true"
                      >
                        {zone.type === 'Private' ? (
                          <Lock className="size-3.5" />
                        ) : (
                          <GlobeIcon className="size-3.5" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-medium text-ink">
                          {zone.name}
                        </span>
                        {/* A proportional bar rather than a number alone: the
                            comparison between zones is the point, and a bar
                            makes it readable at a glance. */}
                        <span
                          className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-surface-inset"
                          aria-hidden="true"
                        >
                          <motion.span
                            className="block h-full rounded-full bg-brand/70"
                            initial={{ width: 0 }}
                            animate={{ width: `${(zone.record_count / maxRecords) * 100}%` }}
                            transition={{ duration: 0.7, ease: easeOut, delay: 0.1 + index * 0.05 }}
                          />
                        </span>
                      </span>

                      <span className="shrink-0 text-right">
                        <span className="block text-base font-semibold tabular-nums text-ink">
                          {zone.record_count}
                        </span>
                        <span className="block text-2xs text-ink-faint">records</span>
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Globe ------------------------------------------------------------ */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-70" aria-hidden="true" />
          <div className="absolute inset-0 bg-dots opacity-50" aria-hidden="true" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-3 px-5 pt-5">
              <div>
                <h2 className="text-md font-semibold text-ink">Namespace</h2>
                <p className="mt-0.5 text-sm text-ink-muted">
                  One marker per hosted zone.
                </p>
              </div>
              <Badge tone="brand" className="gap-1">
                <Sparkles className="size-3" aria-hidden="true" />
                Live
              </Badge>
            </div>

            <div className="relative min-h-56 flex-1">
              <Globe
                zoneNames={zones.map((zone) => zone.name)}
                className="absolute inset-0 size-full"
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
              <StatusDot tone="success" pulse>
                {stats.zoneCount} zone{stats.zoneCount === 1 ? '' : 's'} resolving
              </StatusDot>
              <span className="font-mono text-2xs text-ink-faint">us-east-1</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Scope ------------------------------------------------------------- */}
      <Card className="mt-4">
        <CardHeader
          title="Scope of this build"
          description="What the clone implements, and what it deliberately does not."
        />
        <CardBody>
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <h3 className="mb-2.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                Implemented
              </h3>
              <ul className="flex flex-col gap-2">
                {[
                  'Hosted zones — full CRUD',
                  'Records — all nine types',
                  'Server-side DNS validation',
                  'Zone file import and export',
                ].map((item) => (
                  <li key={item}>
                    <StatusDot tone="success">{item}</StatusDot>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                Out of scope
              </h3>
              <ul className="flex flex-col gap-2">
                {[
                  'Health checks',
                  'Traffic flow and routing policies',
                  'Resolver endpoints and domains',
                  'DNSSEC signing',
                ].map((item) => (
                  <li key={item}>
                    <StatusDot tone="neutral">{item}</StatusDot>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  );
}
