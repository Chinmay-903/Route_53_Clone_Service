'use client';

import { Plus, Radio, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import { RecordTypeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Counter, Field, Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import type { HostedZoneResponse, RecordSetResponse } from '@/lib/api/types.gen';
import { useCreateRecords, useUpdateRecord } from '@/lib/queries/records';
import {
  RECORD_TYPE_HINTS,
  RECORD_TYPE_LABELS,
  RECORD_TYPES,
  recordFormSchema,
  splitValues,
  type RecordType,
} from '@/lib/schemas/record';

/** TTL presets offered by the console, plus free entry. */
const TTL_PRESETS = [
  { value: '60', label: '1 minute' },
  { value: '300', label: '5 minutes' },
  { value: '3600', label: '1 hour' },
  { value: '86400', label: '1 day' },
];

const DEFAULT_TTL = '300';

interface FieldErrors {
  name?: string;
  values?: string;
  ttl?: string;
}

/**
 * Create and edit form for a record set.
 *
 * Replicates the console's Quick create view: a name field showing the zone
 * suffix inline, a type selector that changes the value field's hint and
 * placeholder, and TTL presets. Validation is the Zod discriminated union, so
 * choosing MX validates preference-and-exchange while choosing SRV validates
 * priority-weight-port-target, with no branching here.
 */
export function RecordFormPanel({
  zone,
  open,
  record,
  onClose,
}: {
  zone: HostedZoneResponse;
  open: boolean;
  record: RecordSetResponse | null;
  onClose: () => void;
}) {
  const isEdit = record !== null;
  const createMutation = useCreateRecords(zone.id);
  const updateMutation = useUpdateRecord(zone.id);

  const [name, setName] = useState('');
  const [type, setType] = useState<RecordType>('A');
  const [values, setValues] = useState('');
  const [ttl, setTtl] = useState(DEFAULT_TTL);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Re-seeds the form whenever it opens, so an edit shows the record's current
  // contents and a create always starts clean.
  useEffect(() => {
    if (!open) return;
    if (record) {
      setName(relativeName(record.name, zone.name));
      setType(record.type as RecordType);
      setValues(record.values.join('\n'));
      setTtl(String(record.ttl));
    } else {
      setName('');
      setType('A');
      setValues('');
      setTtl(DEFAULT_TTL);
    }
    setErrors({});
  }, [open, record, zone.name]);

  function validate(): boolean {
    const result = recordFormSchema.safeParse({
      name,
      type,
      values,
      ttl: Number(ttl),
      routingPolicy: 'Simple',
    });
    if (result.success) {
      setErrors({});
      return true;
    }

    const next: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field === 'name' || field === 'values' || field === 'ttl') {
        next[field] ??= issue.message;
      }
    }
    setErrors(next);
    return false;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      name,
      type,
      values,
      ttl: Number(ttl),
      routingPolicy: 'Simple' as const,
    };

    try {
      if (isEdit && record) {
        await updateMutation.mutateAsync({ recordId: record.id, values: payload });
      } else {
        await createMutation.mutateAsync([payload]);
      }
      onClose();
    } catch {
      // Reported in a toast by the mutation. The form stays open and filled so
      // the user can correct the value the server rejected.
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;
  const hints = RECORD_TYPE_HINTS[type];
  const valueCount = splitValues(values).length;
  const zoneSuffix = zone.name.replace(/\.$/, '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={pending}
      size="lg"
      icon={isEdit ? <Radio /> : <Plus />}
      title={isEdit ? 'Edit record' : 'Create record'}
      description={
        isEdit
          ? 'Changes replace the record set in full.'
          : 'Records decide how Route 53 answers queries for this domain.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={pending}>
            {isEdit ? 'Save changes' : 'Create record'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {/* Live preview -------------------------------------------------
            Shows the record exactly as it will be stored, which turns the
            relationship between the name field and the zone suffix from
            something the user has to infer into something they can read. */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-sunken px-3 py-2.5">
          <Sparkles className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
          <span className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
            Preview
          </span>
          <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink">
            {previewName(name, zone.name)}
          </code>
          <RecordTypeBadge type={type} />
          <span className="font-mono text-xs tabular-nums text-ink-faint">{ttl || 0}s</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Record name"
            description="Leave blank to create the record at the zone apex."
            error={errors.name}
            constraint={`Created as ${previewName(name, zone.name)}`}
            className="sm:col-span-2"
          >
            {(field) => (
              <Input
                {...field}
                value={name}
                onChange={(event) => setName(event.target.value)}
                // Validating on blur rather than on keystroke: an error while a
                // field is still being typed into is noise.
                onBlur={validate}
                placeholder="www"
                suffix={`.${zoneSuffix}`}
                disabled={pending}
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </Field>

          <Field label="Record type">
            {(field) => (
              <Select
                id={field.id}
                value={type}
                onValueChange={(next) => {
                  setType(next as RecordType);
                  // Clears errors from the previous type, which no longer apply.
                  setErrors({});
                }}
                options={RECORD_TYPES.map((option) => ({
                  value: option,
                  label: RECORD_TYPE_LABELS[option],
                }))}
                disabled={pending}
                aria-label="Record type"
              />
            )}
          </Field>

          <Field
            label="TTL (seconds)"
            description="How long resolvers cache this answer."
            error={errors.ttl}
          >
            {(field) => (
              <div className="flex gap-2">
                <Input
                  {...field}
                  value={ttl}
                  onChange={(event) => setTtl(event.target.value)}
                  onBlur={validate}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  disabled={pending}
                  className="flex-1"
                />
                <Select
                  value={
                    TTL_PRESETS.some((preset) => preset.value === ttl) ? ttl : 'custom'
                  }
                  onValueChange={(next) => next !== 'custom' && setTtl(next)}
                  options={[
                    ...TTL_PRESETS,
                    // A "Custom" entry that cannot be chosen, so the trigger has
                    // something to display when the value matches no preset.
                    { value: 'custom', label: 'Custom', disabled: true },
                  ]}
                  disabled={pending}
                  aria-label="TTL preset"
                  className="w-32 shrink-0"
                />
              </div>
            )}
          </Field>
        </div>

        <Field
          label="Value"
          description={hints.hint}
          error={errors.values}
          constraint={`${valueCount} value${valueCount === 1 ? '' : 's'} entered`}
        >
          {(field) => (
            <div className="relative">
              <Textarea
                {...field}
                mono
                value={values}
                onChange={(event) => setValues(event.target.value)}
                onBlur={validate}
                placeholder={hints.placeholder}
                rows={5}
                disabled={pending}
                spellCheck={false}
                className={cn(valueCount > 0 && 'pb-6')}
              />
              <span className="pointer-events-none absolute bottom-2 right-3">
                <Counter value={values.length} />
              </span>
            </div>
          )}
        </Field>

        <Field
          label="Routing policy"
          description="How Route 53 responds when several records share a name."
        >
          {(field) => (
            <Select
              id={field.id}
              value="Simple"
              onValueChange={() => undefined}
              options={[
                {
                  value: 'Simple',
                  label: 'Simple routing',
                  description: 'One answer for the name. The only policy in this build.',
                },
              ]}
              disabled
              aria-label="Routing policy"
            />
          )}
        </Field>

        {/* Lets Enter submit the form from any field without a visible second
            button beside the footer's own. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
}

/** Strips the zone suffix so an edit shows what the user originally typed. */
function relativeName(recordName: string, zoneName: string): string {
  if (recordName === zoneName) return '';
  return recordName.endsWith(`.${zoneName}`)
    ? recordName.slice(0, -(zoneName.length + 1))
    : recordName;
}

/** Shows the fully qualified name the record will be created with. */
function previewName(name: string, zoneName: string): string {
  const trimmed = name.trim().replace(/\.$/, '');
  return trimmed ? `${trimmed}.${zoneName}` : zoneName;
}
