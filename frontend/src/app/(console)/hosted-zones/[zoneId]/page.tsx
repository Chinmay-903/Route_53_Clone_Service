'use client';

import Box from '@cloudscape-design/components/box';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Tabs from '@cloudscape-design/components/tabs';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';

import { RecordTable } from '@/components/records/RecordTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useHostedZone, useUpdateHostedZone } from '@/lib/queries/hosted-zones';

/** Hosted zone detail, with the records table as the default tab. */
export default function HostedZoneDetailPage() {
  const params = useParams<{ zoneId: string }>();
  const router = useRouter();
  const zoneId = params.zoneId;

  const query = useHostedZone(zoneId);
  const zone = query.data;

  if (query.isLoading) {
    return <TableSkeleton rows={6} columns={5} />;
  }

  if (query.isError || !zone) {
    return (
      <ErrorState
        title="Could not load this hosted zone"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: 'Hosted zones', href: '/hosted-zones' },
            { text: zone.name, href: `/hosted-zones/${zone.id}` },
          ]}
          onFollow={(event) => {
            event.preventDefault();
            router.push(event.detail.href);
          }}
        />
      }
      header={
        <Header
          variant="h1"
          description={zone.comment ?? undefined}
          actions={
            <Button onClick={() => router.push('/hosted-zones')}>Back to hosted zones</Button>
          }
        >
          {zone.name}
        </Header>
      }
    >
      <Tabs
        tabs={[
          {
            id: 'records',
            label: 'Records',
            // The records table keeps its filters in the URL, so it needs its
            // own boundary for the same reason the zones list does.
            content: (
              <Suspense fallback={<TableSkeleton rows={8} columns={5} />}>
                <RecordTable zone={zone} />
              </Suspense>
            ),
          },
          {
            id: 'details',
            label: 'Hosted zone details',
            content: <ZoneDetails zoneId={zone.id} />,
          },
          {
            id: 'tags',
            label: 'Tags',
            content: (
              <Container header={<Header variant="h2">Tags</Header>}>
                <Box color="text-status-inactive">
                  Tagging is not part of this build. Zones are identified by name and ID.
                </Box>
              </Container>
            ),
          },
          {
            id: 'dnssec',
            label: 'DNSSEC signing',
            content: (
              <Container header={<Header variant="h2">DNSSEC signing</Header>}>
                <Box color="text-status-inactive">
                  DNSSEC signs zone data with a key hierarchy so resolvers can verify
                  responses. It requires real cryptographic signing of served records, which
                  this clone does not do.
                </Box>
              </Container>
            ),
          },
        ]}
      />
    </ContentLayout>
  );
}

/**
 * The details tab.
 *
 * Shows the read-only facts about the zone and lets its description be edited —
 * the only mutable field, because a zone's name is its identity and renaming
 * one would orphan every record beneath it.
 */
function ZoneDetails({ zoneId }: { zoneId: string }) {
  const query = useHostedZone(zoneId);
  const mutation = useUpdateHostedZone(zoneId);
  const zone = query.data;

  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState('');

  if (!zone) return null;

  async function save() {
    await mutation.mutateAsync(comment.trim() || null);
    setEditing(false);
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            editing ? (
              <SpaceBetween direction="horizontal" size="xs">
                <Button onClick={() => setEditing(false)} disabled={mutation.isPending}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={save} loading={mutation.isPending}>
                  Save
                </Button>
              </SpaceBetween>
            ) : (
              <Button
                onClick={() => {
                  setComment(zone.comment ?? '');
                  setEditing(true);
                }}
              >
                Edit description
              </Button>
            )
          }
        >
          Hosted zone details
        </Header>
      }
    >
      <ColumnLayout columns={2} variant="text-grid">
        <SpaceBetween size="l">
          <Detail label="Hosted zone name" value={zone.name} />
          <Detail label="Type" value={zone.type} />
          <Detail label="Hosted zone ID" value={zone.id} code />
        </SpaceBetween>
        <SpaceBetween size="l">
          <Detail label="Record count" value={String(zone.record_count)} />
          <Detail label="Created by" value={zone.created_by} />
          <div>
            <Box variant="awsui-key-label">Description</Box>
            {editing ? (
              <Input
                value={comment}
                onChange={({ detail }) => setComment(detail.value)}
                placeholder="Add a description"
              />
            ) : (
              <Box>{zone.comment ?? '–'}</Box>
            )}
          </div>
        </SpaceBetween>
      </ColumnLayout>
    </Container>
  );
}

function Detail({ label, value, code }: { label: string; value: string; code?: boolean }) {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <Box variant={code ? 'code' : 'span'}>{value}</Box>
    </div>
  );
}
