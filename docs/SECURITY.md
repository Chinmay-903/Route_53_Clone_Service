# Security

Structured against the OWASP Top 10 and API Security Top 10, adapted to this
stack: FastAPI, SQLite, and Next.js, with local authentication and no payments.

## Timing

Secret scanning and dependency auditing run from the first commit, in
`.pre-commit-config.yaml` and in CI. Both are cheap to run continuously and
impossible to apply retroactively — a secret that reaches a pushed history
cannot be retracted by rotation alone, only by rewriting history.

Authorization and data-flow review happen at each phase boundary rather than
before submission, because a missing owner filter is cheap to add while the
query is being written and expensive to find later.

## Authorization — the primary risk

Broken object-level authorization is the most likely real vulnerability in an
application shaped like this one, so it is the control with the most attention.

- Every repository method that reads user-owned data takes an owner identifier
  and applies it **in the SQL `WHERE` clause**. There is deliberately no method
  that returns a zone without an owner argument, so "fetch, then check" is not an
  available mistake.
- Records are reachable only through their zone. A caller obtains the internal
  `hosted_zone_id` solely by first resolving the zone through an owner-scoped
  query, so authorization is established before any record is addressable.
- **A cross-user request returns `404`, not `403`.** A 403 confirms the
  identifier names a real resource, which is itself a disclosure.

This is tested, not asserted. `backend/tests/integration/test_authorization.py`
signs in as a second account and requests the first account's zone and record,
asserting 404 on both, and confirms the zone is untouched afterwards.

## Authentication and sessions

- Passwords are hashed with Argon2id via `argon2-cffi`, including the seeded
  demo account. "Mocked authentication" describes the absence of IAM, not
  permission to store plaintext.
- Sessions are opaque 384-bit tokens delivered in an `httpOnly`, `Secure`,
  `SameSite=Lax` cookie with an expiry. Only the SHA-256 digest is stored, so a
  database disclosure does not yield resumable sessions.
- Expired sessions are deleted on sight rather than merely ignored, so a stale
  cookie cannot be replayed after a clock change.
- A double-submit CSRF token guards state-changing requests as defence in depth
  behind `SameSite=Lax`.
- Login is rate-limited (`slowapi`, five attempts per minute per address). The
  counters are in-process, which is correct for the single instance this deploys
  as; behind multiple workers each would keep its own tally, and Redis is the
  documented path if that changes.
- A failed login takes a similar amount of time whether the address exists or
  not: when no account matches, the service still verifies against a decoy hash,
  so response latency does not enumerate registered addresses. The response body
  is identical in both cases.

## Input, output, and transport

- **SQL injection.** SQLAlchemy parameterised queries throughout; no
  string-formatted SQL anywhere. The genuine risk is the dynamic `sort`
  parameter, which reaches an `ORDER BY` clause — it is a `StrEnum`, so an
  unrecognised value is rejected during request parsing and never reaches the
  query. `LIKE` wildcards in search terms are escaped.
- **Mass assignment.** Input schemas are separate types that simply have no
  field for `id`, `public_id`, `user_id`, or `is_system`. A client cannot set
  ownership or forge a system-record flag because there is no representation for
  it in the request body.
- **Over-serialisation.** Every endpoint declares a `response_model`.
  `password_hash` appears in no output schema.
- **XSS.** React escapes by default and `dangerouslySetInnerHTML` is not used.
  Record values are untrusted text and render as text. A nonce-based
  Content-Security-Policy backs this up.
- **CSP.** `script-src` carries a per-request nonce plus `strict-dynamic`.
  `style-src` permits inline styles, which is a deliberate concession: Cloudscape
  injects component styles at runtime through the CSSOM, and a strict `style-src`
  breaks every control it renders. Scripts remain restricted, which is where the
  XSS risk actually lives.
- **Next.js middleware.** Pinned past CVE-2025-29927, in which a spoofed
  `x-middleware-subrequest` header could bypass middleware. The middleware's
  redirect is a user-experience convenience only; authorization is enforced in
  the API and again in every query, never in middleware alone.
- **Security headers** are set in both layers, because the API is reachable
  directly and cannot rely on headers set by a frontend the client may never
  contact: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, and HSTS in production.
- **CORS** uses an explicit origin allowlist with credentials. A wildcard is
  rejected at startup, since browsers refuse that combination anyway.
- **Errors** are RFC 9457 Problem Details carrying a correlation ID. No stack
  trace, SQL fragment, or file path reaches a client; the traceback goes to the
  log. Pydantic's raw validation errors are summarised to field-and-message
  pairs, because the raw form echoes the offending input — which for a login
  request is the submitted password.
- **Resource limits.** A 1 MB request body cap, `max_length` on every string
  field, and a 100-value cap per record set. Password length is bounded because
  Argon2's cost scales with input.
- **`/docs` and `/redoc`** are disabled entirely in production.

## Public demo credentials

The seeded demo account's credentials are displayed on the login page. A public
demo behind credentials nobody has is useless. The account is low-privilege,
sees only its own seeded data (proven by the owner-scoping tests above), and
login is rate-limited. This is a conscious trade-off, recorded here rather than
left implicit.

## Deliberately not applicable

Stated rather than skipped silently:

- **Payment and PCI controls, webhook signature verification, server-side price
  recalculation.** No payments exist.
- **Row Level Security and service-role key handling.** No Supabase. SQLite has
  no RLS; the equivalent here is query-level owner scoping, described above.
- **OAuth token storage and refresh rotation.** Authentication is local.
- **Email and SMTP injection.** No mail is sent.
- **Server-side request forgery.** No user input drives an outbound request. The
  nearest analogue would be a zone-file import honouring `$INCLUDE`, which is a
  local-file-read primitive — the import feature is not built, and if it is
  added, `$INCLUDE` must be rejected explicitly.

## Checklist

| Control | State |
|---|---|
| `PRAGMA foreign_keys = ON` on every connection | Done, with a test that fails without it |
| Argon2id password hashing | Done |
| `httpOnly` / `Secure` / `SameSite` session cookie | Done |
| Session tokens stored hashed | Done |
| Double-submit CSRF token | Done |
| Owner scoping in every user-data query | Done |
| Cross-user 404-not-403 test committed | Done |
| Allowlisted sort columns | Done, via `StrEnum` |
| Parameterised SQL throughout | Done |
| `response_model` on every endpoint | Done |
| Separate input schemas | Done |
| Nonce-based CSP | Done |
| Security headers in both layers | Done |
| CORS allowlist, wildcard rejected at startup | Done |
| Login rate limiting | Done, single-instance |
| `/docs` gated in production | Done |
| gitleaks and detect-secrets in pre-commit | Done |
| pip-audit, npm audit in CI | Done |
| Next.js pinned past CVE-2025-29927 | Done |
| Zone-file import hardening | Not applicable — feature not built |
