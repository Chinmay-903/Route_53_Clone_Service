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
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCreateHostedZone } from '@/lib/queries/hosted-zones';

/** The create hosted zone form. */
export default function CreateHostedZonePage() {
  const router = useRouter();
  const mutation = useCreateHostedZone();

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

            <Container header={<Header variant="h2">What happens next</Header>}>
              <SpaceBetween size="s">
                <Box variant="p">
                  Two records are created with the zone and cannot be edited or deleted:
                </Box>
                <Box variant="p">
                  <Box variant="strong">NS</Box> — the four name servers responsible for the
                  zone, and <Box variant="strong">SOA</Box> — the zone&apos;s authority record,
                  holding its serial number and cache timers.
                </Box>
                <Box variant="p" color="text-status-inactive">
                  Removing either would leave the zone unresolvable, which is why the console
                  disables their delete actions.
                </Box>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Form>
      </form>
    </ContentLayout>
  );
}
