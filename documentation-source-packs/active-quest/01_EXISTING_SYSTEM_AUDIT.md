# Phase 0: Existing System Audit (no behavior changes)

## Objective
Map real production-compatible HelloRun implementation before designing schema or writing feature code. Never treat previous public-web observations as evidence of internal code behavior.

## Audit checklist
1. Framework, package scripts, routing, auth, roles, CSRF, validation, test runner, jobs/queues, deployment pipeline.
2. Event model: types, dates, recurrence fields, status, slugs, organizer, prices, category relationship, content fields, timezones.
3. Registration: idempotency, single-category rule, cancellation, privacy preferences, permissions.
4. Activity proof: submission models and storage, OCR implementation, date checking, duplicate detection, accessible URL checking, device integration status, corrective flow, approval/rejection audit trail.
5. Accumulated distance and leaderboards: calculation source, tie-breaking, approval changes, caching, overlap between events.
6. Rewards: image storage, automatic badge/certificate grants, public links, revocation, downloadable formats.
7. Event creation/edit UI: what is already reusable, where descriptions are manually duplicated, route protections, publication status.
8. Schedulers: cron/job runner, lock/idempotency patterns, retry/recovery, timezone handling.
9. Public published event behavior, e.g. August Active Quest 2026, September/October Active Run 2026. Validate claim-to-model consistency and keep snapshot references.
10. Privacy/security: upload validation, injection, XSS, data retention, event moderation, audit logs, least-privilege permissions.

## Required report output
`docs/active-quest/AUDIT_FINDINGS.md` including: a current-state table (Verified / Partially implemented / Not implemented / Unknown), actual model and route/file locations, data examples with personal information removed, identified contradictions, data migration impact, compatibility risks and preferred extension points.

## Acceptance
- Cite actual repository paths/functions, no invented APIs.
- All new functionality mapped to existing components or justified as genuinely new.
- List missing tests and test fixtures.
- Flag any decisions that depend on inspecting production settings.
- No production writes, renames or migrations in this phase.
