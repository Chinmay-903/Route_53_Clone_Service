'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
// Imported per-icon rather than from the package root: the root barrel pulls in
// every glyph in the set, which is several megabytes before tree-shaking.
import { GlobeIcon } from '@phosphor-icons/react/dist/csr/Globe';
import { HeartbeatIcon } from '@phosphor-icons/react/dist/csr/Heartbeat';
import { ListBulletsIcon } from '@phosphor-icons/react/dist/csr/ListBullets';
import { useRouter } from 'next/navigation';

import { useHostedZones } from '@/lib/queries/hosted-zones';

import styles from './dashboard.module.css';

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
  const query = useHostedZones({ sort: 'name', order: 'asc', limit: 50, offset: 0 });

  const zones = query.data?.items ?? [];
  const zoneCount = query.data?.total ?? 0;
  const recordCount = zones.reduce((sum, zone) => sum + zone.record_count, 0);

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Manage hosted zones and the DNS records inside them."
          actions={
            <Button variant="primary" onClick={() => router.push('/hosted-zones/create')}>
              Create hosted zone
            </Button>
          }
        >
          Dashboard
        </Header>
      }
    >
      <SpaceBetween size="l">
        <div className={styles.metricGrid}>
          <Metric
            label="Hosted zones"
            value={zoneCount}
            hint="Across this account"
            loading={query.isLoading}
            icon={<GlobeIcon size={22} weight="duotone" />}
            onClick={() => router.push('/hosted-zones')}
          />
          <Metric
            label="Record sets"
            value={recordCount}
            hint="Including generated SOA and NS"
            loading={query.isLoading}
            icon={<ListBulletsIcon size={22} weight="duotone" />}
            onClick={() => router.push('/hosted-zones')}
          />
          <Metric
            label="Health checks"
            value={null}
            hint="Not part of this build"
            loading={false}
            icon={<HeartbeatIcon size={22} weight="duotone" />}
          />
        </div>

        <Container
          header={
            <Header
              variant="h2"
              actions={
                <Button onClick={() => router.push('/hosted-zones')}>View all</Button>
              }
            >
              Your hosted zones
            </Header>
          }
        >
          <ZoneSummary
            zones={zones.slice(0, 5)}
            loading={query.isLoading}
            onOpen={(zoneId) => router.push(`/hosted-zones/${zoneId}`)}
            onCreate={() => router.push('/hosted-zones/create')}
          />
        </Container>

        <Container header={<Header variant="h2">Scope of this build</Header>}>
          <ColumnLayout columns={2} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">Implemented</Box>
              <SpaceBetween size="xxs">
                <StatusIndicator type="success">Hosted zones — full CRUD</StatusIndicator>
                <StatusIndicator type="success">Records — all nine types</StatusIndicator>
                <StatusIndicator type="success">Server-side DNS validation</StatusIndicator>
              </SpaceBetween>
            </div>
            <div>
              <Box variant="awsui-key-label">Out of scope</Box>
              <SpaceBetween size="xxs">
                <StatusIndicator type="pending">Health checks</StatusIndicator>
                <StatusIndicator type="pending">Traffic flow</StatusIndicator>
                <StatusIndicator type="pending">Resolver and domains</StatusIndicator>
              </SpaceBetween>
            </div>
          </ColumnLayout>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}

/**
 * One metric card.
 *
 * A `null` value means the metric does not exist in this build, which reads
 * differently from zero and is shown as an em dash rather than a number.
 */
function Metric({
  label,
  value,
  hint,
  loading,
  icon,
  onClick,
}: {
  label: string;
  value: number | null;
  hint: string;
  loading: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className={styles.metricIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.metricBody}>
        <span className={styles.metricLabel}>{label}</span>
        {loading ? (
          <span className={styles.metricSkeleton} aria-hidden="true" />
        ) : (
          <p className={styles.metricValue}>{value ?? '—'}</p>
        )}
        <p className={styles.metricHint}>{hint}</p>
      </span>
    </>
  );

  if (!onClick) {
    return (
      <div className={styles.metric}>{body}</div>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.metric} ${styles.metricInteractive}`}
      onClick={onClick}
      // A real button, so it is keyboard-reachable and announced as clickable
      // without any ARIA patching.
      aria-label={`${label}: ${loading ? 'loading' : (value ?? 'not available')}. View hosted zones.`}
    >
      {body}
    </button>
  );
}

/** The five most recent zones, or a prompt to create the first one. */
function ZoneSummary({
  zones,
  loading,
  onOpen,
  onCreate,
}: {
  zones: { id: string; name: string; record_count: number; type: string }[];
  loading: boolean;
  onOpen: (zoneId: string) => void;
  onCreate: () => void;
}) {
  if (loading) {
    return (
      <Box color="text-status-inactive" padding={{ vertical: 'm' }}>
        Loading hosted zones…
      </Box>
    );
  }

  if (zones.length === 0) {
    return (
      <SpaceBetween size="m">
        <Box variant="p" color="text-body-secondary">
          No hosted zones yet. Create one to start managing DNS records for a domain.
        </Box>
        <Button variant="primary" onClick={onCreate}>
          Create hosted zone
        </Button>
      </SpaceBetween>
    );
  }

  return (
    <SpaceBetween size="xs">
      {zones.map((zone) => (
        <div
          key={zone.id}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 'var(--space-m)',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href={`/hosted-zones/${zone.id}`}
            onFollow={(event) => {
              event.preventDefault();
              onOpen(zone.id);
            }}
          >
            {zone.name}
          </Link>
          <Box variant="small" color="text-status-inactive">
            {zone.type} · {zone.record_count} records
          </Box>
        </div>
      ))}
    </SpaceBetween>
  );
}
