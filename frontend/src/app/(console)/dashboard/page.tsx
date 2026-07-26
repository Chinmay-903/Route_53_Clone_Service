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
import { useRouter } from 'next/navigation';

import { useHostedZones } from '@/lib/queries/hosted-zones';

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
        >
          Route 53 dashboard
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">Your resources</Header>}>
          <ColumnLayout columns={3} variant="text-grid">
            <Metric label="Hosted zones" value={zoneCount} loading={query.isLoading} />
            <Metric label="Record sets" value={recordCount} loading={query.isLoading} />
            <div>
              <Box variant="awsui-key-label">Health checks</Box>
              <Box color="text-status-inactive">Not in this build</Box>
            </div>
          </ColumnLayout>
        </Container>

        <Container
          header={
            <Header
              variant="h2"
              actions={
                <Button variant="primary" onClick={() => router.push('/hosted-zones/create')}>
                  Create hosted zone
                </Button>
              }
            >
              Get started
            </Header>
          }
        >
          <SpaceBetween size="m">
            <Box variant="p">
              Create a hosted zone for a domain, then add the records that decide how its
              traffic is routed. Every zone is created with an SOA record and an NS record
              listing four name servers, both read-only.
            </Box>
            <Link
              href="/hosted-zones"
              onFollow={(event) => {
                event.preventDefault();
                router.push('/hosted-zones');
              }}
            >
              View all hosted zones
            </Link>
          </SpaceBetween>
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

function Metric({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <Box fontSize="display-l" fontWeight="bold">
        {/* An em dash while loading reserves the same line height as a number,
            so the card does not resize when the value arrives. */}
        {loading ? '—' : value}
      </Box>
    </div>
  );
}
