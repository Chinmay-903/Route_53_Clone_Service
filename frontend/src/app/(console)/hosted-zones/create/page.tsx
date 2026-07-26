'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import RadioGroup from '@cloudscape-design/components/radio-group';
import SpaceBetween from '@cloudscape-design/components/space-between';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import HelpPanel from '@cloudscape-design/components/help-panel';
import Link from '@cloudscape-design/components/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useHelpPanel } from '@/components/shell/HelpPanelContext';
import { useCreateHostedZone } from '@/lib/queries/hosted-zones';

/**
 * Explanatory copy for the shell's Info panel.
 *
 * Written here in plain language rather than lifted from AWS documentation —
 * reproducing their prose would be copying a protected asset, and a shorter
 * explanation serves the reader better anyway.
 */
const HELP_CONTENT = (
  <HelpPanel header={<h2>Hosted zones</h2>}>
    <p>
      A hosted zone is a container for the DNS records that decide how traffic
      for one domain is routed. Its name is the domain it answers for.
    </p>
    <h3>Public or private</h3>
    <p>
      A <strong>public</strong> zone answers queries from anywhere on the
      internet. A <strong>private</strong> zone answers only from inside networks
      you associate with it — useful for internal service names that should not
      resolve publicly.
    </p>
    <h3>What gets created with it</h3>
    <p>
      Every zone is created with two records that cannot be edited or deleted:
      an <strong>NS</strong> record naming the four servers responsible for the
      zone, and an <strong>SOA</strong> record holding its serial number and
      cache timers. Removing either would leave the zone unresolvable.
    </p>
    <h3>Naming</h3>
    <p>
      Enter the domain without a protocol — <code>example.com</code>, not{' '}
      <code>https://example.com</code>. Subdomains are managed as records inside
      the zone rather than as zones of their own.
    </p>
  </HelpPanel>
);

/** The create hosted zone form. */
export default function CreateHostedZonePage() {
  const router = useRouter();
  const mutation = useCreateHostedZone();
  const helpPanel = useHelpPanel();

  // Registers this page's help copy with the shell and clears it on the way
  // out, so a later page does not inherit an Info button explaining zones.
  useEffect(() => {
    helpPanel.setContent(HELP_CONTENT);
    return () => helpPanel.setContent(null);
    // setContent is stable for the provider's lifetime; re-running on every
    // render would clear the panel it had just set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [type, setType] = useState<'Public' | 'Private'>('Public');
  const [nameError, setNameError] = useState<string | null>(null);

  function validateName(): boolean {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Enter a domain name.');
      return false;
    }
    if (!trimmed.includes('.')) {
      setNameError('Enter a fully qualified domain name, for example example.com.');
      return false;
    }
    setNameError(null);
    return true;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validateName()) return;

    try {
      const zone = await mutation.mutateAsync({
        name: name.trim(),
        comment: comment.trim() || null,
        type,
      });
      router.push(`/hosted-zones/${zone.id}`);
    } catch {
      // The mutation reported the reason in a Flashbar; the form stays filled
      // so the user can correct it rather than retype everything.
    }
  }

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: 'Hosted zones', href: '/hosted-zones' },
            { text: 'Create hosted zone', href: '#' },
          ]}
          onFollow={(event) => {
            event.preventDefault();
            if (event.detail.href !== '#') router.push(event.detail.href);
          }}
        />
      }
      header={
        <Header
          variant="h1"
          description="A hosted zone tells Route 53 how to respond to DNS queries for a domain."
          info={
            <Link variant="info" onFollow={() => helpPanel.setOpen(true)}>
              Info
            </Link>
          }
        >
          Create hosted zone
        </Header>
      }
    >
      <form onSubmit={handleSubmit}>
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => router.push('/hosted-zones')}>
                Cancel
              </Button>
              <Button variant="primary" formAction="submit" loading={mutation.isPending}>
                Create hosted zone
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            <Container header={<Header variant="h2">Hosted zone configuration</Header>}>
              <SpaceBetween size="l">
                <FormField
                  label="Domain name"
                  description="The domain this zone answers for. Subdomains are managed as records inside it."
                  constraintText="For example, example.com. Letters, digits, and hyphens only."
                  errorText={nameError}
                >
                  <Input
                    value={name}
                    onChange={({ detail }) => setName(detail.value)}
                    onBlur={validateName}
                    placeholder="example.com"
                    autoFocus
                  />
                </FormField>

                <FormField
                  label={
                    <span>
                      Description <Box variant="span" color="text-status-inactive">– optional</Box>
                    </span>
                  }
                  description="A note for whoever looks at this zone next."
                  constraintText="Up to 256 characters."
                >
                  <Input
                    value={comment}
                    onChange={({ detail }) => setComment(detail.value)}
                    placeholder="Primary marketing domain"
                  />
                </FormField>

                <FormField
                  label="Type"
                  description="Whether this zone answers queries from the public internet or only from inside a private network."
                >
                  <RadioGroup
                    value={type}
                    onChange={({ detail }) => setType(detail.value as 'Public' | 'Private')}
                    items={[
                      {
                        value: 'Public',
                        label: 'Public hosted zone',
                        description: 'Answers queries from anyone on the internet.',
                      },
                      {
                        value: 'Private',
                        label: 'Private hosted zone',
                        description:
                          'Answers queries only from inside associated networks. Modelled here, not enforced.',
                      },
                    ]}
                  />
                </FormField>
              </SpaceBetween>
            </Container>

          </SpaceBetween>
        </Form>
      </form>
    </ContentLayout>
  );
}
