# Migration and Rollout Plan

**Status: Superseded**

**Last reconciled:** August 7, 2026 · **Delivery state:** [STATUS.md](../../STATUS.md) · **Sequencing:** [delivery-plan.md](delivery-plan.md)

This document is part of a pack whose premise is out of date. Read the
[README preface](README.md) before using it.

> Replaced by [delivery-plan.md](delivery-plan.md), which reflects the actual constraint: no
> isolated database environment exists, so additive onsite-only migrations are taken one at a
> time and anything touching the live registration path waits. The staged rollout and
> feature-flag scheme here assume a safety net the project does not have.


## Main requirement

Existing virtual-event registrations and workflows must continue to work during and after the refactor.

## Discovery phase

Before code changes:

- Inventory current event models
- Inventory registration models
- Inventory participant and account models
- List registration-related routes and controllers
- List virtual activity-submission dependencies
- Identify OCR, ranking, badge, certificate, and approval dependencies
- Identify all views that read registration fields directly
- Identify reporting and export code
- Identify scheduled jobs and notification code

## Compatibility strategy

Recommended approach:

1. Add shared services behind existing virtual routes.
2. Create adapters that map legacy input to new service input.
3. Preserve legacy response shapes where views still depend on them.
4. Add onsite routes only after virtual regression tests pass.
5. Migrate records gradually or lazily where practical.
6. Remove compatibility code only after all old consumers are migrated.

## Data migration options

### Compatibility-first migration

- Keep current records intact.
- Add new fields and related collections.
- Read legacy fields through adapters.
- Populate new structures when records are updated or through background scripts run manually.

Recommended for lower deployment risk.

### Full migration script

- Create backup.
- Run migration in batches.
- Validate counts and samples.
- Record migration version and errors.
- Provide rollback script where practical.

Use only after compatibility services are stable.

## Migration requirements

Migration scripts should be:

- Idempotent
- Batch-based
- Restartable
- Logged
- Dry-run capable
- Validated before writes
- Able to report skipped and failed records

## Suggested migration fields

For existing registrations:

- Generate `publicId`
- Generate `registrationReference` if missing
- Set `eventType` from event
- Create participant snapshot from available data
- Set `participantType`
- Map current status to new status
- Create virtual-specific detail where needed
- Preserve legacy identifiers
- Record migration version

## Feature flags

Suggested flags:

```js
{
  registrationRefactor: false,
  onsiteEvents: false,
  guestRegistration: false,
  accountClaiming: false,
  manualPayment: false,
  qrCheckIn: false,
  walkInRegistration: false,
  registrationImport: false
}
```

Flags may be global, organizer-specific, or event-specific.

## Rollout stages

### Stage 1: Internal development

- Shared registration services
- Virtual adapter
- Automated tests
- No public behavior changes

### Stage 2: Internal test events

- Enable onsite events for admin accounts
- Use test registrations
- Test account and guest flows
- Test payment, QR, import, and check-in

### Stage 3: Pilot organizers

- Enable for selected organizers
- Collect audit logs and error reports
- Monitor performance and data consistency

### Stage 4: General availability

- Enable onsite event creation for eligible organizers
- Keep advanced features separately flagged

## Deployment safeguards

Before deployment:

- Database backup
- Migration dry run
- Regression test pass
- Smoke-test checklist
- Feature flags default off
- Monitoring and error logging enabled

After deployment:

- Verify existing virtual registration
- Verify activity submissions
- Verify organizer dashboards
- Verify login and profile behavior
- Verify email delivery
- Verify no unexpected record changes

## Rollback

Rollback should include:

- Disable new feature flags
- Restore legacy route adapters
- Stop migration scripts
- Restore database backup only when necessary
- Preserve newly created onsite records for later recovery

Avoid destructive schema changes in the first rollout.
