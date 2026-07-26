# ADR-0002: Layering without a DI container or UnitOfWork

## Status
Accepted

## Context
The brief asks for a loosely coupled backend. The obvious reading is a
dependency-injection container and a UnitOfWork wrapping each transaction, which
is what most layered-architecture material prescribes.

The competing requirement is that a reviewer understands any file in under two
minutes. Every abstraction is a thing they must learn before they can read the
code that uses it.

## Decision
Four layers — routers, services, repository protocols, pure domain — composed
with FastAPI's own `Depends`. No DI container. No UnitOfWork class.

Loose coupling comes from `repositories/protocols.py`: services depend on
`Protocol` interfaces, never on the SQLAlchemy classes that satisfy them.
Persistence is swappable and services are unit-testable against fakes.

Atomicity comes from the session-per-request dependency. FastAPI caches
dependency results per request, so every repository in a request shares one
session; the service commits once at the end and the dependency rolls back on
exception. Creating a zone with its SOA and NS records is therefore atomic
without additional machinery.

## Alternatives considered
- **`dependency-injector` or `wireup`.** Real projects at real scale benefit.
  Here it would add a registration module and a resolution mechanism a reviewer
  must learn, to solve a problem `Depends` already solves.
- **An explicit UnitOfWork.** Would make transaction boundaries more visible at
  the cost of a class that wraps a session and forwards to it. The commit call
  in the service is already visible.

## Consequences
- Services take their repositories as constructor arguments, so wiring is
  explicit and greppable in `api/v1/dependencies.py`.
- Transaction boundaries live in the service layer, which a reader has to notice
  rather than being announced by a type name.
- Swapping persistence means writing new protocol implementations and changing
  the dependency functions — a small, contained edit.
