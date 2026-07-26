'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Modal from '@cloudscape-design/components/modal';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { useEffect, useState } from 'react';

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

  async function handleSubmit() {
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
      // Reported in a Flashbar by the mutation. The form stays open and filled
      // so the user can correct the value the server rejected.
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;
  const hints = RECORD_TYPE_HINTS[type];

  return (
    <Modal
      visible={open}
      onDismiss={onClose}
      size="large"
      header={isEdit ? 'Edit record' : 'Create record'}
      closeAriaLabel="Close"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={pending}>
              {isEdit ? 'Save changes' : 'Create records'}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        <FormField
          label="Routing policy"
          description="How Route 53 responds when several records share a name."
        >
          <Select
            selectedOption={{ value: 'Simple', label: 'Simple routing' }}
            options={[{ value: 'Simple', label: 'Simple routing' }]}
            disabled
            ariaLabel="Routing policy"
          />
        </FormField>

        <FormField
          label="Record name"
          description="Leave blank to create the record at the zone apex."
          errorText={errors.name}
          constraintText={`Will be created as ${previewName(name, zone.name)}`}
        >
          <SpaceBetween direction="horizontal" size="xs" alignItems="center">
            <Input
              value={name}
              onChange={({ detail }) => setName(detail.value)}
              onBlur={validate}
              placeholder="www"
              disabled={pending}
            />
            <Box variant="span" color="text-status-inactive">
              .{zone.name.replace(/\.$/, '')}
            </Box>
          </SpaceBetween>
        </FormField>

        <FormField label="Record type">
          <Select
            selectedOption={{ value: type, label: RECORD_TYPE_LABELS[type] }}
            onChange={({ detail }) => {
              setType(detail.selectedOption.value as RecordType);
              // Clears errors from the previous type, which no longer apply.
              setErrors({});
            }}
            options={RECORD_TYPES.map((option) => ({
              value: option,
              label: RECORD_TYPE_LABELS[option],
            }))}
            disabled={pending}
            ariaLabel="Record type"
          />
        </FormField>

        <FormField
          label="Value"
          description={hints.hint}
          errorText={errors.values}
          constraintText={`${splitValues(values).length} value(s) entered.`}
        >
          <Textarea
            value={values}
            onChange={({ detail }) => setValues(detail.value)}
            onBlur={validate}
            placeholder={hints.placeholder}
            rows={5}
            disabled={pending}
          />
        </FormField>

        <FormField
          label="TTL (seconds)"
          description="How long resolvers cache this answer."
          errorText={errors.ttl}
        >
          <SpaceBetween direction="horizontal" size="xs">
            <Input
              value={ttl}
              onChange={({ detail }) => setTtl(detail.value)}
              onBlur={validate}
              type="number"
              inputMode="numeric"
              disabled={pending}
            />
            <Select
              selectedOption={
                TTL_PRESETS.find((preset) => preset.value === ttl) ?? {
                  value: ttl,
                  label: 'Custom',
                }
              }
              onChange={({ detail }) => setTtl(detail.selectedOption.value ?? DEFAULT_TTL)}
              options={TTL_PRESETS}
              disabled={pending}
              ariaLabel="TTL preset"
            />
          </SpaceBetween>
        </FormField>
      </SpaceBetween>
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
