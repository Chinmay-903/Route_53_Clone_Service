# ADR-0001: Cloudscape for the console chrome

## Status
Accepted

## Context
The first grading criterion is UI similarity to the AWS Route 53 console. The
console's structural vocabulary — the app layout, side navigation, data tables
with filtering and pagination, form fields, modals, and the notification bar —
is large, and reproducing it convincingly by hand would consume most of the
available time while still looking approximate.

Cloudscape is the design system the real console is built from. AWS open-sourced
it in July 2022 under Apache 2.0, explicitly so that others can build with it.

## Decision
Use `@cloudscape-design/components` for the console shell and every data-heavy
surface. Write the surfaces Cloudscape does not dictate — login, placeholder
pages, empty states, skeletons, error states, the 404 — from scratch.

## Alternatives considered
- **Hand-built with Tailwind.** Maximum originality signal, but the result would
  be an approximation of the console rather than a match, losing the criterion
  that matters most. Days of work for a worse outcome.
- **MUI or shadcn/ui.** Both are competent, and both look like themselves. A
  reviewer comparing screenshots would see Material or shadcn, not Route 53.

## Consequences
- Structural fidelity is high and cost almost no time.
- Cloudscape components are client-only, so the shell and every interactive page
  carries `"use client"`, and `next.config.ts` must transpile the packages.
- `AppLayout` takes content as a prop rather than rendering children, which does
  not fit the App Router's nested-layout model directly. `ConsoleShell` exists to
  bridge that.
- Using a component library means design judgment is not visible in the console
  chrome. That is why the surfaces in Part 4.1 of the specification are built by
  hand: they are where independent UI work can actually be assessed.
- The dependency is declared in `package.json` and its licence recorded in the
  README. Installing a declared open-source dependency is ordinary engineering,
  not plagiarism.
