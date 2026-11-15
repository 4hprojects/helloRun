# Phases 9–10: Scheduling, Feature Flags and Recovery

## Default policy
Auto draft creation OFF until manually enabled; auto publishing OFF indefinitely unless separately approved. Human approval is the normal publishing path.

## Scheduler behavior
Runs daily in Asia/Manila context and determines if a future monthly draft should be prepared (recommended 7–14 days before registration opens, configurable). Use existing durable scheduler/queue where possible. DB uniqueness plus idempotency token prevents duplicate drafts on retries, restarts, concurrent workers.

## Control flags
`activeQuestSeriesEnabled`, `activeQuestDraftGenerationEnabled`, `activeQuestSchedulerEnabled`, `activeQuestAutoPublishEnabled`; treat absent/unreadable flags as disabled. Restrict modifications to authorized admins and log actor/old/new values/reason.

## Controls and recovery
Admin can pause/resume scheduling without disabling existing registrations or participant activity. Job timeout, retry with backoff, error alerts, no endless spin. Recovery lists missed editions and lets admin manually generate without duplicating.

## Publishing automation (future, independent release)
Only if separately enabled for the series AND global platform flag, and only if publication validator passes; do not publish if missing assets, registration dates already expired, or material changes are pending approval. Add dry-run and alert first.

## Acceptance
Two workers same month yield one draft, retry-after-crash returns existing draft, disabled flag causes no write, clock/year rollover correct, failed job observable, permission checks server side.
