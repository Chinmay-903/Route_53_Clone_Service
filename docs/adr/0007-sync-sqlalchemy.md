# ADR-0007: Synchronous SQLAlchemy over aiosqlite

## Status
Accepted

## Context
FastAPI is an async framework, so `async def` endpoints with `aiosqlite` look
like the natural choice.

## Decision
Synchronous SQLAlchemy with `def` endpoints. FastAPI runs those in a threadpool
automatically.

## Alternatives considered
- **`aiosqlite` with async SQLAlchemy.** SQLite serialises writers regardless, so
  async buys no write concurrency. It costs an async session, async-aware
  relationship loading, and the standing hazard that one accidental blocking call
  in an `async def` endpoint stalls the whole event loop — a bug that appears
  under load rather than in testing.

## Consequences
- Repository and service code is ordinary synchronous Python, which is easier to
  read and to test.
- Throughput is bounded by the threadpool, which is far above anything a console
  demo will see.
- Moving to Postgres later would make async worth reconsidering, since a real
  server supports concurrent writers.
