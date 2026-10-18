# Phase 0: Source inspection, compatibility, and baseline

## Objective

Establish verifiable facts about the existing HelloRun implementation and capture the current OCR and verification performance before modifying behavior.

## Audit tasks

1. Map repository layout, package managers, runtime versions, test setup, lint/typecheck, CI, branch strategy and deployment environments.
2. Trace a submission end-to-end: UI upload -> validation -> file storage -> persistence -> extraction (if present) -> review -> final activity status -> email/notifications.
3. Inventory all existing OCR algorithms, models, preprocessing, file transformations, error handlers, confidence calculations and logs. Identify whether Tesseract is actually installed.
4. Inventory admin routes, auth/RBAC claims, reviewer permissions, form validation, event rules, duplicate detection, profile fields, existing Strava/COROS integration work, and audit logging.
5. Inspect DB models, indexes, backup process, migrations and screenshot retention policies. Document how corrected values and activity verification statuses are persisted.
6. Identify email provider, templates, administrator recipients, scheduling infrastructure, queue workers, Redis if deployed, and idempotency handling.
7. Map infrastructure: where web/server/worker processes run, available resources, PM2/Docker/HelloDeploy behavior, disk quotas, secrets, monitoring and model storage.
8. Check current app UX for mobile and accessible admin interactions. Verify permissions using server tests, not only client visibility.
9. Obtain or identify representative appropriately authorized screenshots by platform and layout. Do not copy personal images into repositories or external tooling without appropriate permission.
10. Determine whether optional URL can already be supplied and whether actual link-reading methods are permitted under each provider's API and terms.

## Baseline dataset and experiments

- Create a small **consented** labeled benchmark stratified by source platform and layout, including generic, blurry, cropped, and unfamiliar formats.
- Keep samples from the same original screenshot/activity together within one data split.
- Report count per platform/layout and separate accuracy for distance, duration, pace, date and activity type.
- Measure CER, exact-field accuracy, field completeness, processing latency, correction rate and current reviewer time where observable.
- Record uncertainty: no claimed accuracy if no verified labels; use `N/A` where data is unavailable.
- Save benchmark manifest and metric scripts as versioned, reproducible artifacts, without sensitive originals in Git.

## Discovery report deliverables

- Actual architecture diagram; sequence diagram; current feature and security inventory.
- Gap table: existing, reusable, missing, to-deprecate, incompatible.
- Dependency recommendation with alternatives: same runtime vs Python OCR worker, current queue vs BullMQ, current database vs new collections.
- Per-phase revised estimates and constraints.
- Migration and rollback strategy.
- Threat model for uploads and activity URLs.
- Baseline metrics report and dataset representativeness statement.
- Explicit blockers/questions requiring owner decisions before code changes.

## Acceptance criteria

A maintainer can run documented local commands to replicate the benchmark; all major proposed integrations are verified or marked as assumptions; sensitive data handling is documented; and Phase 1 scope is reconciled to existing code. No major production changes during this phase.
