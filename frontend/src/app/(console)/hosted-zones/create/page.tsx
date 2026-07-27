'use client';

import { Globe, Lock, Plus, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { InfoButton, useHelpPanel } from '@/components/layout/HelpPanel';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { Counter, Field, Input } from '@/components/ui/Input';
import { RadioCards } from '@/components/ui/Select';
import { useCreateHostedZone } from '@/lib/queries/hosted-zones';

const COMMENT_MAX = 256;

/**
 * Explanatory copy for the shell's Info drawer.
 *
 * Written here in plain language rather than lifted from AWS documentation —
 * reproducing their prose would be copying a protected asset, and a shorter
 * explanation serves the reader better anyway.
 */
const HELP_CONTENT = (
  <>
    <p>
      A hosted zone is a container for the DNS records that decide how traffic for one
      domain is routed. Its name is the domain it answers for.
    </p>

    <h3>Public or private</h3>
    <p>
      A <strong>public</strong> zone answers queries from anywhere on the internet. A{' '}
      <strong>private</strong> zone answers only from inside networks you associate with
      it — useful for internal service names that should not resolve publicly.
    </p>

    <h3>What gets created with it</h3>
    <p>
      Every zone is created with two records that cannot be edited or deleted: an{' '}
      <strong>NS</strong> record naming the four servers responsible for the zone, and an{' '}
      <strong>SOA</strong> record holding its serial number and cache timers. Removing
      either would leave the zone unresolvable.
    </p>

    <h3>Naming</h3>
    <p>
      Enter the domain without a protocol — <code>example.com</code>, not{' '}
      <code>https://example.com</code>. Subdomains are managed as records inside the zone
      rather than as zones of their own.
    </p>
  </>
);

/** The create hosted zone form. */
export default function CreateHostedZonePage() {
  const router = useRouter();
  const mutation = useCreateHostedZone();
  const helpPanel = useHelpPanel();

  // Registers this page's help copy with the shell and clears it on the way
  // out, so a later page does not inherit an Info button explaining zones.
  useEffect(() => {
    helpPanel.setContent(HELP_CONTENT, 'Hosted zones');
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
      // The mutation reported the reason in a toast; the form stays filled so
      // the user can correct it rather than retype everything.
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Create hosted zone"
        icon={<Plus />}
        description="A hosted zone tells Route 53 how to respond to DNS queries for a domain."
        actions={<InfoButton />}
      />

      {/* Capped narrower than the page: a form field stretched to 1440px is
          harder to scan, not easier, because the label and the input drift
          apart. */}
      <form onSubmit={handleSubmit} noValidate className="max-w-3xl">
        <Card>
          <CardHeader
            title="Hosted zone configuration"
            description="Two of these can be changed later; the domain name cannot."
          />

          <CardBody className="flex flex-col gap-6">
            <Field
              label="Domain name"
              description="The domain this zone answers for. Subdomains are managed as records inside it."
              error={nameError}
              constraint="For example, example.com. Letters, digits, and hyphens only."
            >
              {(field) => (
                <Input
                  {...field}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={validateName}
                  placeholder="example.com"
                  leading={<Globe />}
                  disabled={mutation.isPending}
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                />
              )}
            </Field>

            <Field
              label="Description"
              optional
              description="A note for whoever looks at this zone next."
            >
              {(field) => (
                <Input
                  {...field}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Primary marketing domain"
                  maxLength={COMMENT_MAX}
                  disabled={mutation.isPending}
                  trailing={<Counter value={comment.length} max={COMMENT_MAX} />}
                />
              )}
            </Field>

            <Field
              label="Type"
              description="Whether this zone answers queries from the public internet or only from inside a private network."
            >
              {() => (
                <RadioCards
                  name="Hosted zone type"
                  value={type}
                  onValueChange={setType}
                  options={[
                    {
                      value: 'Public',
                      label: 'Public hosted zone',
                      description: 'Answers queries from anyone on the internet.',
                      icon: <Globe />,
                    },
                    {
                      value: 'Private',
                      label: 'Private hosted zone',
                      description:
                        'Answers only from inside associated networks. Modelled here, not enforced.',
                      icon: <Lock />,
                    },
                  ]}
                />
              )}
            </Field>

            {/*
              States what creating the zone will actually do. The two generated
              records surprise people who have not used Route 53 before, and a
              record count that jumps to two on a brand new zone looks like a
              bug unless it was announced.
            */}
            <div className="flex gap-2.5 rounded-lg border border-line bg-surface-sunken p-3">
              <Sparkles className="mt-px size-4 shrink-0 text-brand" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-ink-muted">
                Creating this zone also generates an <strong className="font-medium text-ink">SOA</strong>{' '}
                record and an <strong className="font-medium text-ink">NS</strong> record listing
                four name servers. Both are read-only.
              </p>
            </div>
          </CardBody>

          <CardFooter>
            <Button
              variant="ghost"
              type="button"
              onClick={() => router.push('/hosted-zones')}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={mutation.isPending}>
              <Plus aria-hidden="true" />
              Create hosted zone
            </Button>
          </CardFooter>
        </Card>
      </form>
    </PageContainer>
  );
}
