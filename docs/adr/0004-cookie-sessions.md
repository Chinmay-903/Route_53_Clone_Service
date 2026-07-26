# ADR-0004: Opaque cookie sessions over JWT

## Status
Accepted

## Context
The client is a browser. It needs to stay signed in across reloads, and the
credential must survive a page navigation without JavaScript reading it.

## Decision
An opaque random token in an `httpOnly`, `Secure`, `SameSite=Lax` cookie. Only
the token's SHA-256 hash is stored in `sessions`. A separate readable cookie
carries a CSRF token for the double-submit pattern.

## Alternatives considered
- **JWT in `localStorage`.** Any XSS becomes credential theft, because script can
  read it. Revocation also requires server state, which removes the one reason
  people reach for JWT in the first place.
- **JWT in a cookie.** Fixes the XSS exposure but keeps the revocation problem
  and adds signature verification for no benefit at one instance.

## Consequences
- Signing out genuinely ends the session: the row is deleted.
- Every authenticated request costs one indexed primary-key lookup.
- The token is hashed at rest, so a database disclosure does not let an attacker
  resume anyone's session. SHA-256 rather than Argon2 is correct here — the token
  is 384 bits of entropy, so there is no dictionary to attack, and the lookup
  runs on every request.
- `SameSite=Lax` alone would probably suffice against CSRF; the double-submit
  token is defence in depth, in case a redirect chain or future browser change
  relaxes that guarantee.
