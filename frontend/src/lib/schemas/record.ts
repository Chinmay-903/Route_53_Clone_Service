import { z } from 'zod';

import type { CreateRecordData } from '@/lib/api/types.gen';

/** The request body for creating or replacing a record set. */
type RecordWriteBody = CreateRecordData['body'];

/**
 * Client-side record validation, mirroring `backend/app/domain/dns_rules.py`.
 *
 * This exists for immediate feedback while typing, not for enforcement — the
 * server revalidates everything and remains the authority. Where the two could
 * drift, the server wins and its message is what the user sees.
 *
 * Keyed as a discriminated union on record type so choosing MX validates
 * preference-and-exchange while choosing SRV validates priority-weight-port-
 * target, without branching inside the form component.
 */

export const RECORD_TYPES = [
  'A',
  'AAAA',
  'CNAME',
  'TXT',
  'MX',
  'NS',
  'PTR',
  'SRV',
  'CAA',
] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

/** Labels matching the console's record type dropdown. */
export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  A: 'A – IPv4 address',
  AAAA: 'AAAA – IPv6 address',
  CNAME: 'CNAME – Canonical name',
  TXT: 'TXT – Text',
  MX: 'MX – Mail exchange',
  NS: 'NS – Name servers',
  PTR: 'PTR – Pointer',
  SRV: 'SRV – Service locator',
  CAA: 'CAA – Certificate authority authorization',
};

/** Per-type guidance shown beneath the value field, as the real console does. */
export const RECORD_TYPE_HINTS: Record<RecordType, { hint: string; placeholder: string }> = {
  A: {
    hint: 'One IPv4 address per line.',
    placeholder: '192.0.2.1\n192.0.2.2',
  },
  AAAA: {
    hint: 'One IPv6 address per line.',
    placeholder: '2001:db8::1',
  },
  CNAME: {
    hint: 'One domain name. A CNAME cannot sit at the zone apex or share a name with another record.',
    placeholder: 'www.example.com.',
  },
  TXT: {
    hint: 'Quoted text, up to 255 characters per string. One record value per line.',
    placeholder: '"v=spf1 mx -all"',
  },
  MX: {
    hint: 'Priority and mail server, separated by a space. One per line.',
    placeholder: '10 mail.example.com.',
  },
  NS: {
    hint: 'One name server per line.',
    placeholder: 'ns-1.example-dns.com.',
  },
  PTR: {
    hint: 'One domain name.',
    placeholder: 'host.example.com.',
  },
  SRV: {
    hint: 'Priority, weight, port, and target, separated by spaces. One per line.',
    placeholder: '1 10 5060 sip.example.com.',
  },
  CAA: {
    hint: 'Flags, tag, and a quoted value. Tag must be issue, issuewild, or iodef.',
    placeholder: '0 issue "amazon.com"',
  },
};

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const HOSTNAME = /^(\*\.)?([a-z0-9_]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\.?$/i;
const MX_VALUE = /^\d{1,5}\s+\S+$/;
const SRV_VALUE = /^\d{1,5}\s+\d{1,5}\s+\d{1,5}\s+\S+$/;
const CAA_VALUE = /^\d{1,3}\s+(issue|issuewild|iodef)\s+".*"$/i;

/** Splits a textarea into non-empty trimmed lines. */
export function splitValues(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function everyLine(check: (line: string) => boolean, message: string) {
  return z
    .string()
    .min(1, 'Enter at least one value.')
    .refine((raw) => splitValues(raw).length > 0, 'Enter at least one value.')
    .refine((raw) => splitValues(raw).every(check), message);
}

function singleLine(check: (line: string) => boolean, message: string) {
  return everyLine(check, message).refine(
    (raw) => splitValues(raw).length === 1,
    'This record type accepts exactly one value.',
  );
}

function isIpv4(line: string): boolean {
  return IPV4.test(line) && line.split('.').every((part) => Number(part) <= 255);
}

function isIpv6(line: string): boolean {
  // Delegating to the URL parser avoids hand-rolling IPv6 syntax, which has
  // enough edge cases that regex attempts are reliably wrong.
  try {
    return Boolean(new URL(`http://[${line}]`).hostname);
  } catch {
    return false;
  }
}

const baseFields = {
  name: z.string().max(255),
  ttl: z
    .number({ invalid_type_error: 'Enter a TTL in seconds.' })
    .int('TTL must be a whole number.')
    .min(0, 'TTL cannot be negative.')
    .max(2147483647, 'TTL is too large.'),
  routingPolicy: z.literal('Simple').default('Simple'),
};

export const recordFormSchema = z.discriminatedUnion('type', [
  z.object({
    ...baseFields,
    type: z.literal('A'),
    values: everyLine(isIpv4, 'Enter a valid IPv4 address on each line.'),
  }),
  z.object({
    ...baseFields,
    type: z.literal('AAAA'),
    values: everyLine(isIpv6, 'Enter a valid IPv6 address on each line.'),
  }),
  z.object({
    ...baseFields,
    type: z.literal('CNAME'),
    values: singleLine((line) => HOSTNAME.test(line), 'Enter a valid domain name.'),
  }),
  z.object({
    ...baseFields,
    type: z.literal('TXT'),
    values: everyLine(
      (line) => line.length <= 512,
      'Each TXT value must be 512 characters or fewer.',
    ),
  }),
  z.object({
    ...baseFields,
    type: z.literal('MX'),
    values: everyLine(
      (line) => MX_VALUE.test(line),
      'Use "priority mailserver", for example 10 mail.example.com.',
    ),
  }),
  z.object({
    ...baseFields,
    type: z.literal('NS'),
    values: everyLine((line) => HOSTNAME.test(line), 'Enter a valid name server on each line.'),
  }),
  z.object({
    ...baseFields,
    type: z.literal('PTR'),
    values: singleLine((line) => HOSTNAME.test(line), 'Enter a valid domain name.'),
  }),
  z.object({
    ...baseFields,
    type: z.literal('SRV'),
    values: everyLine(
      (line) => SRV_VALUE.test(line),
      'Use "priority weight port target", for example 1 10 5060 sip.example.com.',
    ),
  }),
  z.object({
    ...baseFields,
    type: z.literal('CAA'),
    values: everyLine(
      (line) => CAA_VALUE.test(line),
      'Use "flags tag \\"value\\"", for example 0 issue "amazon.com".',
    ),
  }),
]);

export type RecordFormValues = z.infer<typeof recordFormSchema>;

/**
 * Converts validated form values into the API's request body.
 *
 * The cast is required because the generated body is a union discriminated on
 * `type`, and TypeScript cannot narrow it from a runtime string. The Zod schema
 * above has already established that `type` and `values` agree.
 */
export function toRecordRequestBody(values: RecordFormValues): RecordWriteBody {
  return {
    type: values.type,
    // An empty name means the zone apex, which the API accepts as "@".
    name: values.name.trim() || '@',
    ttl: values.ttl,
    values: splitValues(values.values),
    routing_policy: 'Simple',
    set_identifier: null,
  } as RecordWriteBody;
}
