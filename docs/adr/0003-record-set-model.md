# ADR-0003: One row per record set, values in a child table

## Status
Accepted

## Context
DNS lets several values share one name and type: an A record with two addresses,
an MX record with two mail servers. Route 53 groups these as a single *record
set*, and weighted or multivalue answers go further, sharing a name and type
while differing only by a set identifier.

The modelling choice is whether a row represents a value or a record set.

## Decision
One row per record set in `record_sets`, with its values in `record_values`,
ordered by `sort_order`. Uniqueness is enforced by a database constraint on
`(hosted_zone_id, name, type, set_identifier)`.

## Alternatives considered
- **One row per value.** Simpler to write initially, and wrong. The uniqueness
  rule above becomes inexpressible as a constraint: two A values at `www` are
  legitimate, but two A *record sets* at `www` are not, and a per-value table
  cannot tell those apart. Every read would also have to group rows back into
  sets in application code, which is the shape the data already had.
- **Values as a delimited string column.** Removes a table and gives up ordering,
  per-value length limits, and the ability to query values at all.

## Consequences
- Reading a page of records is two queries, not N+1, via `selectinload`.
- Editing a record set replaces its value rows, letting the orphan cascade clean
  up so values cannot accumulate across edits.
- SQLite treats NULLs as distinct in a unique index, so a simple-routing record
  with `set_identifier IS NULL` is not caught by the constraint. The service
  checks explicitly as well, which also produces a better error message than a
  raw integrity error.
