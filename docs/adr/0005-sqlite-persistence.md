# ADR-0005: SQLite persistence strategy

## Status
Accepted

## Context
SQLite is mandated. Its defaults are tuned for compatibility rather than for
serving a web application, and the deployment target matters: several popular
free hosting tiers run web instances on ephemeral filesystems, so a SQLite file
is destroyed on every redeploy, restart, or spin-down.

## Decision
Set five pragmas on every connection through a SQLAlchemy `connect` listener,
and deploy to a host with a persistent volume.

```
journal_mode = WAL      -- readers no longer block the writer
synchronous  = NORMAL   -- the correct durability pairing for WAL
foreign_keys = ON       -- off by default; without it every CASCADE is inert
busy_timeout = 5000     -- wait for a writer instead of failing immediately
temp_store   = MEMORY
```

Pragmas are per-connection, not per-database, so setting them once at startup
would leave pooled connections unconfigured.

## Alternatives considered
- **Defaults.** `foreign_keys` off means the schema's `ON DELETE CASCADE` clauses
  do nothing and orphaned rows accumulate silently. An integration test deletes a
  zone and asserts no records remain, which fails without the pragma.
- **A free tier without a volume.** The demo would be empty or broken after any
  restart, which defeats the point of a hosted demo.

## Consequences
- SQLite behaves credibly for this workload.
- Writes still serialise, which is acceptable: this is a single-user console.
- Turso/libSQL is kept as a fallback. It is SQLite-compatible, so switching is a
  connection-string change rather than a migration.
