# ADR-0006: A generated TypeScript client

## Status
Accepted

## Context
The frontend and backend are separate applications. The usual failure mode is
drift: a field is renamed server-side, the frontend keeps reading the old name,
and nothing complains until someone loads the page.

## Decision
Export `openapi.json` from the FastAPI application and generate a typed client
with `@hey-api/openapi-ts` into `src/lib/api`, which is never hand-edited. CI
regenerates it and runs `tsc --noEmit`, so a breaking contract change fails the
build.

`generate_unique_id_function=lambda route: route.name` on the FastAPI app gives
the generated methods clean names — `listHostedZones`, not a mangled
path-and-verb string.

## Alternatives considered
- **Hand-written fetch wrappers.** More code to write and maintain, and the
  types are a manual restatement of the contract that can silently fall out of
  date — exactly the problem being solved.
- **Orval.** Comparable. `@hey-api/openapi-ts` was chosen for its simpler output.

## Consequences
- This is complexity that *removes* work: less hand-written code, and drift
  becomes a compile error.
- The generated directory is committed, so a reviewer can read the client without
  running a build step.
- Generator and runtime versions must match. They did not initially, and the
  symptom was obscure: response types resolved to a union of their own field
  types. Both now come from one package.
