/**
 * Query-key factory.
 *
 * Every key is built here so invalidation after a mutation targets exactly the
 * right cache entries. Keys are hierarchical: invalidating `zones.all()` also
 * invalidates every list and detail beneath it.
 */

export const queryKeys = {
  session: () => ['session'] as const,

  zones: {
    all: () => ['zones'] as const,
    // `params` is serialized into the key, so any shape is acceptable; typing
    // it as a specific interface would force every caller to widen.
    list: (params: object) => ['zones', 'list', params] as const,
    detail: (zoneId: string) => ['zones', 'detail', zoneId] as const,
  },

  records: {
    all: (zoneId: string) => ['zones', 'detail', zoneId, 'records'] as const,
    list: (zoneId: string, params: object) =>
      ['zones', 'detail', zoneId, 'records', 'list', params] as const,
  },
} as const;
