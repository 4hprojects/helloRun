# HelloRun Onsite Event Registration Implementation Pack

**Status:** Not implemented

**Last reconciled:** August 7, 2026

**Delivery state:** [STATUS.md](../../STATUS.md) · **Priorities:** [ROADMAP.md](../../ROADMAP.md)

## Read this first: the premise of this pack is out of date

This pack was written as though HelloRun were a virtual-only platform that needs onsite
support introduced through a foundational refactor. It is not. Onsite events are already a
shipped, first-class concept, and a repository review on August 7, 2026 found that roughly
40% of the pack describes software that already exists.

Treat this pack as a **requirements source only**. Its security, privacy, consent-versioning
and concurrency sections remain valuable. Its architecture, module layout, status model and
data design are superseded:

- `Event.eventType` is already `virtual | onsite | hybrid` with `eventTypesAllowed`, and
  `Registration.participationMode` is already `virtual | onsite`. Event creation already
  validates onsite venue fields and publish readiness.
- Bib assignment, check-in, race kits, result imports, QR generation and a timing-system
  webhook already ship, with integration and smoke coverage. What is missing is the
  **organiser UI** for them, not the backend.
- `02-architecture-refactor.md` is superseded. Its `src/modules/` tree conflicts with the
  established `src/{controllers,routes,services,models,middleware}` layout, and the scattered
  event-type conditionals it targets do not exist — the registration controller has 18
  event-type references, already centralised in helpers.
- `03-data-models.md` is superseded where it proposes MongoDB models for onsite detail and
  inventory. Those live in **PostgreSQL** (`007_phase7_onsite_operations.sql`), which this
  pack never mentions. Implementing it as written would create two conflicting sources of
  truth for bib and kit data.
- The 14-status registration model in `03-data-models.md` is not adopted. The existing
  status and payment-status enums are referenced across ~25 files including the Postgres
  shadow sync and view templates.
- `05-form-builder.md` depends on reusing "the HelloUniversity form or quiz builder", which
  **does not exist in this repository**. Registration fields are a fixed Mongoose
  sub-document. This is deferred.

**Sequencing for the remaining work lives in [delivery-plan.md](delivery-plan.md).**

Genuinely missing and still worth building: organiser onsite UI, guest registration
(blocked by the `required` `userId` and the unique `{eventId, userId}` index on
`Registration`), staff roles, waitlist, inventory, transfers and CSV import.

The pack also correctly identifies two real defects: the registration capacity check is a
non-atomic count-then-insert, and QR codes encode raw MongoDB event IDs without signing or
revocation.

## Original pack

This implementation pack defines the planned refactor and expansion of HelloRun's registration system to support onsite events while preserving current virtual-event behavior.

## Documents

1. [01-product-scope.md](01-product-scope.md) — product goals, scope, user journeys, and phased delivery.
2. [02-architecture-refactor.md](02-architecture-refactor.md) — target architecture, modules, services, and refactor strategy.
3. [03-data-models.md](03-data-models.md) — proposed MongoDB models, field structures, snapshots, statuses, and versioning.
4. [04-registration-workflows.md](04-registration-workflows.md) — logged-in, guest, claim, payment, waitlist, check-in, walk-in, transfer, and cancellation flows.
5. [05-form-builder.md](05-form-builder.md) — standard fields, custom fields, profile mapping, validation, conditional logic, and form versioning.
6. [06-organizer-operations.md](06-organizer-operations.md) — dashboard, staff roles, bulk actions, imports, exports, inventory, bibs, and race kits.
7. [07-security-privacy.md](07-security-privacy.md) — authorization, audit logs, tokens, uploads, rate limiting, consent, and data retention.
8. [08-migration-rollout.md](08-migration-rollout.md) — backward compatibility, migration plan, feature flags, deployment, and rollback.
9. [09-testing-acceptance.md](09-testing-acceptance.md) — testing requirements, acceptance criteria, and regression coverage.
10. [10-implementation-checklist.md](10-implementation-checklist.md) — actionable implementation checklist for Claude Code or the development team.

## Guiding principles

- Onsite registration must be introduced through a refactor, not by adding extensive onsite conditionals to existing virtual-event controllers.
- Shared behavior belongs in reusable services, validators, policies, and field modules.
- Virtual, onsite, and future hybrid behavior must remain separated through event-type handlers.
- Guests may register without being forced to create an account.
- Successful guest registration should encourage account creation and allow secure registration claiming.
- Existing virtual events, registrations, submissions, rankings, and participant records must remain functional throughout the migration.
- Server-side authorization, validation, privacy controls, and audit logging are required.

## Recommended delivery order

1. Build shared registration foundation and compatibility layer.
2. Preserve and migrate virtual registration behavior.
3. Add onsite event configuration and participant registration.
4. Add guest access and account claiming.
5. Add organizer operations, payments, bibs, QR check-in, inventory, and imports.
6. Add advanced timing, offline support, payment gateways, and hybrid-event capabilities later.
