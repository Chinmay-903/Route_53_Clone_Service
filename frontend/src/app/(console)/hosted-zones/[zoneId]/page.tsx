'use client';

import {
  ArrowLeft,
  Check,
  Copy,
  FileText,
  Globe,
  Lock,
  Pencil,
  ShieldCheck,
  Tags,
  X,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { ErrorState } from '@/components/feedback/ErrorState';
import { useBreadcrumbLabel } from '@/components/layout/Breadcrumbs';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { RecordTable } from '@/components/records/RecordTable';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Tooltip } from '@/components/ui/Menu';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import type { HostedZoneResponse } from '@/lib/api/types.gen';
import { useHostedZone, useUpdateHostedZone } from '@/lib/queries/hosted-zones';

/**
 * Hosted zone detail, with the records table as the default tab.
 *
 * Deliberately has no Suspense boundary of its own, and deliberately does not
 * call `useSearchParams`. A boundary at this level is opened by the server,
 * which streams the fallback and then postpones the content for the client to
 * fill in — and in this arrangement it is never resumed, so the page shows its
 * skeleton forever. The records table owns the one boundary this page needs,
 * because it is the part that actually reads URL state.
 *
 * The tab is therefore read from `window.location` in an effect rather than
 * through the router's hook: same deep-linkable `?tab=` behaviour, no
 * suspension.
 */
export default function HostedZoneDetailPage() {
  const params = useParams<{ zoneId: string }>();
  const router = useRouter();
  const zoneId = params.zoneId;

  const query = useHostedZone(zoneId);
  const zone = query.data;

  // Replaces the opaque id in the breadcrumb with the zone's own name.
  useBreadcrumbLabel(zoneId, zone?.name);

  const [tab, setTab] = useState('records');

  // Runs once on mount, so a link to `?tab=details` opens on that tab. Reading
  // `window` in an effect keeps it off the server, where it does not exist.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    if (requested) setTab(requested);
  }, []);

  function selectTab(next: string) {
    setTab(next);
    // `replaceState` rather than a router push: switching tabs should not add a
    // history entry the back button has to step through, but the URL should
    // still be copyable.
    const url = new URL(window.location.href);
    if (next === 'records') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  }

  if (query.isLoading) {
    return (
      <PageContainer>
        <div className="mb-6 flex flex-col gap-3">
          <div className="shimmer h-9 w-64 rounded-lg" />
          <div className="shimmer h-4 w-96 rounded" />
        </div>
        <TableSkeleton rows={8} columns={5} />
      </PageContainer>
    );
  }

  if (query.isError || !zone) {
    return (
      <PageContainer>
        <ErrorState
          title="Could not load this hosted zone"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={zone.name}
        icon={zone.type === 'Private' ? <Lock /> : <Globe />}
        badge={
          <>
            <Badge tone={zone.type === 'Private' ? 'warning' : 'info'}>{zone.type}</Badge>
            <Badge tone="neutral" className="tabular-nums">
              {zone.record_count} records
            </Badge>
          </>
        }
        description={zone.comment ?? undefined}
        actions={
          <Button variant="secondary" onClick={() => router.push('/hosted-zones')}>
            <ArrowLeft aria-hidden="true" />
            All hosted zones
          </Button>
        }
      />

      <Tabs
        value={tab}
        onValueChange={selectTab}
        items={[
          {
            id: 'records',
            label: 'Records',
            icon: <FileText />,
            badge: zone.record_count,
            // The records table keeps its filters in the URL through `nuqs`,
            // which reads `useSearchParams` and suspends. This boundary sits
            // below the page component, where the client owns the render and
            // the fallback resolves normally.
            content: (
              <Suspense fallback={<TableSkeleton rows={8} columns={5} />}>
                <RecordTable zone={zone} />
              </Suspense>
            ),
          },
          {
            id: 'details',
            label: 'Hosted zone details',
            icon: <Globe />,
            content: <ZoneDetails zone={zone} />,
          },
          {
            id: 'tags',
            label: 'Tags',
            icon: <Tags />,
            content: (
              <OutOfScope
                title="Tags"
                body="Tagging is not part of this build. Zones are identified by name and ID."
              />
            ),
          },
          {
            id: 'dnssec',
            label: 'DNSSEC signing',
            icon: <ShieldCheck />,
            content: (
              <OutOfScope
                title="DNSSEC signing"
                body="DNSSEC signs zone data with a key hierarchy so resolvers can verify responses. It requires real cryptographic signing of served records, which this clone does not do."
              />
            ),
          },
        ]}
      />
    </PageContainer>
  );
}

/**
 * The details tab.
 *
 * Shows the read-only facts about the zone and lets its description be edited —
 * the only mutable field, because a zone's name is its identity and renaming
 * one would orphan every record beneath it.
 */
function ZoneDetails({ zone }: { zone: HostedZoneResponse }) {
  const mutation = useUpdateHostedZone(zone.id);

  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState('');

  async function save() {
    await mutation.mutateAsync(comment.trim() || null);
    setEditing(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Configuration" icon={<Globe />} />
        <CardBody>
          {/* A definition list rather than a grid of divs: each row genuinely
              is a term and its value, and the markup should say so. */}
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label="Hosted zone name" value={zone.name} copyable />
            <Detail label="Hosted zone ID" value={zone.id} mono copyable />
            <Detail label="Type" value={zone.type} />
            <Detail label="Record count" value={String(zone.record_count)} />
            <Detail label="Created by" value={zone.created_by} className="sm:col-span-2" />
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Description"
          icon={<Pencil />}
          actions={
            editing ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={mutation.isPending}
                >
                  <X aria-hidden="true" />
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={save}
                  loading={mutation.isPending}
                >
                  <Check aria-hidden="true" />
                  Save
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setComment(zone.comment ?? '');
                  setEditing(true);
                }}
              >
                <Pencil aria-hidden="true" />
                Edit
              </Button>
            )
          }
        />
        <CardBody>
          {editing ? (
            <Input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="A note for whoever looks at this zone next"
              maxLength={256}
              autoFocus
              aria-label="Zone description"
            />
          ) : zone.comment ? (
            <p className="text-base leading-relaxed text-ink-secondary">{zone.comment}</p>
          ) : (
            <p className="text-base italic text-ink-faint">No description set.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/**
 * One labelled fact, optionally with a copy control.
 *
 * Zone IDs and domain names are the two things anyone reading this page is
 * likely to want in their clipboard, and selecting monospace text by hand is
 * the kind of small friction a console should absorb.
 */
function Detail({
  label,
  value,
  mono,
  copyable,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be denied; the value is still selectable by hand.
    }
  }

  return (
    <div className={className}>
      <dt className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-1.5">
        <span
          className={cn('min-w-0 truncate text-base text-ink', mono && 'font-mono text-sm')}
          title={value}
        >
          {value}
        </span>
        {copyable && (
          <Tooltip content={copied ? 'Copied' : 'Copy'}>
            <IconButton
              label={`Copy ${label}`}
              variant="ghost"
              size="xs"
              onClick={copy}
              className="shrink-0 text-ink-faint"
            >
              {copied ? (
                <Check className="text-success" aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </dd>
    </div>
  );
}

function OutOfScope({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        <p className="max-w-[70ch] text-base leading-relaxed text-ink-muted">{body}</p>
      </CardBody>
    </Card>
  );
}
