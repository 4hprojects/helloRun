# Active Quest Existing-System Audit

Status: complete; awaiting explicit approval before Phase 1

Audit date: 2026-10-28

Scope: repository and supplied Active Quest implementation package only

Production data access: not performed

## Executive summary

HelloRun already contains most runner-facing mechanics needed by Active Quest: virtual events, six selectable distance categories, one registration per event, accumulated proof submissions, manual review, approved-distance leaderboards, badge infrastructure, certificate rendering, public event pages, organizer/admin workflows, audit logging, and background workers.

The repository does not contain a reusable monthly series, an immutable template version, a draft-only monthly generator, series-aware public pages, Active Quest analytics, series achievements, or safe Active Quest automation flags. September and October 2026 are hard-coded event payloads and one-off creation scripts. They prove the monthly concept, but they are not a reusable series implementation.

The highest technical risk is reward correctness. Existing accumulated review refreshes challenge-progress badges. Existing default badge generation deliberately omits global challenge milestones for a multi-category event. Distance-completed awards use a different path that is not proven for accumulated submissions. Category badges must not be promised until a focused regression test proves the award path or a narrow fix is designed.

The highest operational risk is publication. Existing pending-review virtual events can be auto-approved and published. Active Quest generation must remain draft-only and must bypass this auto-approval path. All four proposed Active Quest flags must default to off. Audit approval must not enable scheduling or auto-publication.

Recommended approach: keep `Event` as the monthly edition, add a small `ActiveQuestSeries` aggregate and immutable `ActiveQuestTemplateVersion`, then add sparse series identity fields to `Event`. Do not create a second monthly-edition model. Build generation as an idempotent draft upsert protected by a unique series/month key. Add the public series page and automation only after manual generation, validation, rewards, and certificate behavior are proven.

## Audit boundaries and evidence

This audit read the full package under `docs/archive/todo-refinement/HelloRun_Active_Quest_Implementation_Pack/active-quest/`, including files `00` through `12`. It also inspected models, services, routes, controllers, views, migrations, workers, tests, and project documentation.

No database connection, production query, migration, publish action, external write, or deployment was performed. Examples below come from repository fixtures and tests, not live participant records. Identifiers are omitted or synthetic.

Verification run:

- `npm run lint:check`: passed; 1,076 JavaScript files and 181 EJS files checked.
- `npm run format:check`: passed; 2 JSON files and 98 automation files checked.
- `npm run test:unit`: passed with exit code 0 in 161.1 seconds.
- `npm run docs:check`: failed on the supplied package only. `12_EFFORT_AND_TOKEN_ESTIMATE.md:21` jumps from an H1 to an H3. No package file was changed.
- Integration tests were not run because local environment configuration may target production services.

## Current-state inventory

### Verified and reusable

- Monthly editions can remain ordinary `Event` records. The model already supports draft, pending-review, published, closed, and archived states (`src/models/Event.js:57-60`).
- Virtual accumulated-distance events already exist through `virtualCompletionMode`, challenge metrics, target fields, accepted activity types, and a final submission deadline (`src/models/Event.js:287-345`).
- Six category goals fit `raceCategories`, including stable category IDs and distance targets (`src/models/Event.js:85-109`).
- Registration already records one selected category in an immutable pricing snapshot. A partial unique index permits one account registration per event (`src/models/Registration.js:110-115`, `src/models/Registration.js:302-314`).
- Accumulated activities are separate reviewed records with proof metadata, OCR metadata, duplicate signals, certificate state, and review statuses (`src/models/AccumulatedActivitySubmission.js`).
- Submission requires a screenshot. It accepts an optional URL only when enabled, rejects exact proof-hash reuse, uses an idempotency lock, uploads to R2, and queues OCR (`src/controllers/page/submission.controller.js:460-765`).
- Optional activity URLs are corroborating evidence only. The server does not fetch provider pages or treat an inaccessible URL as automatic rejection (`src/services/ocr/activity-url-verification.service.js`).
- OCR, URL verification, and automatic approval flags fail closed by default (`src/services/ocr/ocr-config.js`).
- Near-image duplicate detection produces reviewer signals and does not automatically reject (`src/services/ocr/activity-duplicate.service.js`).
- Accumulated totals and leaderboards use approved activities only (`src/services/accumulated-activity.service.js:322-347`).
- Public leaderboard privacy respects consent, hidden status, and abbreviated-name preferences (`src/services/leaderboard.service.js:2236-2288`).
- Certificate finalization uses the selected category target, waits for the final deadline, and blocks while event reviews remain unresolved (`src/services/accumulated-certificate-finalization.service.js`).
- Certificate PDFs include the selected category and verified total. Public verification and regeneration/revocation flows already exist (`src/services/certificate.service.js`, `src/routes/certificateVerification.routes.js`).
- Admin and organizer event editing, readiness checks, review, badge management, CSRF protection, and critical audit logging already exist (`src/routes/organiser/event-management.js`, `src/routes/admin.routes.js`).
- Public event pages sanitize Markdown and escape rendered values (`src/utils/event-public-view.js`, `tests/event-public-view.unit.test.js`).
- MongoDB is authoritative for events and submissions. Postgres stores searchable/reporting shadows, badges, progress, rankings, certificates, and audit records (`src/db/migrations/003_phase3_event_core_shadow.sql`, `src/db/migrations/005_phase5_submission_certificate_shadow.sql`, `src/db/migrations/006_phase6_rankings_reporting.sql`, `src/db/migrations/009_phase9_achievement_badges.sql`).

### Partially reusable

- Event status and `publicListingAvailableAt` can represent visibility, but they do not provide an Active Quest scheduling contract. A published-but-future-hidden event can still trigger publication side effects.
- `getPublishReadinessErrors()` reuses generic form validation. It does not verify all six category badge assets, immutable copy snapshots, Active Quest dates, series identity, or certificate readiness (`src/services/event-form.service.js:2156-2161`).
- Event badge generation creates participant, finisher, distance, mode, and some challenge badges. Multi-category accumulated completion is not proven to issue the selected category badge (`src/services/event-badge.service.js:286-319`, `src/services/badge-progress.service.js:655-686`).
- A certificate template is event-scoped and reusable within one event. It is mutable and has no cross-edition immutable version model (`src/models/CertificateTemplate.js`, `src/services/certificateTemplate.service.js`).
- Event post-save synchronization provides a Postgres shadow, but existing shadow columns do not preserve full category IDs, targets, or future series/template provenance (`src/models/Event.js:855-875`, `src/db/migrations/003_phase3_event_core_shadow.sql`).
- Existing workers demonstrate interval startup, atomic claim patterns, retries, and audit integration. Several run inside each web process, so Active Quest scheduling needs database-level claims for multi-replica safety (`src/server.js:429-455`).
- Role checks support admins, organizers, owners, and co-organizers. They do not expose a specific Active Quest series-management permission (`src/services/event-access.service.js`).
- Exact proof hashes prevent reuse by a runner. There is no canonical cross-event activity identity for lifetime series achievement accounting.

### Not implemented

- Permanent Active Quest series record.
- Immutable, versioned Active Quest event template.
- Unique `(seriesKey, year, month)` edition identity.
- Idempotent draft-only monthly generator.
- Structured monthly copy generation and contradiction checks.
- Active Quest-specific pre-publication validator.
- Per-category badge-asset readiness validation.
- Reusable cross-edition certificate template versions.
- `/active-quest` series landing/archive page and current/next-edition resolution.
- Series analytics, monthly exports, return-rate reporting, and category trend reporting.
- Series achievement definitions and safe lifetime-distance deduplication.
- Active Quest scheduler, generation claims, failure alerting, and run history.
- Persistent, audited Active Quest feature flags.

### Unknown without approved non-production or production inventory

- Whether August, September, or October editions exist in production with the intended slugs and settings.
- Whether a November 2026 event or slug already exists.
- Which Postgres migrations are applied in each environment.
- Which organizer account should own generated editions.
- Whether all six November badge assets and an approved certificate design exist in R2.
- Whether existing production category badge awards and certificates behave as intended for accumulated events.
- Whether multiple web replicas run every in-process worker.

## Existing monthly examples

Repository fixtures already model the target categories. September uses IDs such as `september-starter-run-25k` and `september-ultra-run-200k`; October follows the same six-category pattern (`src/content/events/september-active-run-2026.js:17-22`, `src/content/events/october-active-run-2026.js:15-20`).

Redacted schema-shaped example derived from those fixtures:

```json
{
  "event": "October Active Run",
  "slug": "october-active-run-2026",
  "status": "published",
  "virtualCompletionMode": "accumulated_distance",
  "categories": ["25K", "50K", "75K", "100K", "150K", "200K"],
  "participant": "[redacted]",
  "registrationId": "[redacted]"
}
```

The fixtures use explicit end-of-day copy: October registration closes October 22 at 11:59 PM PHT, and proof closes November 14 at 11:59 PM PHT (`src/content/events/october-active-run-2026.js:54-76`). The proposed plan instead defines half-open boundaries at the following midnight. That semantic difference requires a single canonical contract and boundary tests.

## Detailed findings

### AQ-001: no reusable series or immutable template

Severity: high. Confidence: verified.

September and October use separate content modules and creator scripts. Each module contains month-specific categories, dates, copy, and asset inputs. This requires source edits for every edition and provides no template provenance, regeneration guard, or edition uniqueness beyond slug uniqueness.

Use `Event` as the edition. Add:

- `ActiveQuestSeries`: stable key, owner, timezone, current approved template version, operational defaults, flag state, and audit metadata.
- `ActiveQuestTemplateVersion`: immutable structured configuration, content blocks, category definitions, asset references, certificate reference, version number, approval state, checksum, creator, and approval metadata.
- Sparse `Event` fields: `seriesKey`, `seriesYear`, `seriesMonth`, `seriesTemplateVersionId`, `seriesSnapshot`, `generatedAt`, and `generatedBy`.
- A partial unique index on `(seriesKey, seriesYear, seriesMonth)`.

Do not add a separate monthly-edition collection. It would duplicate `Event` lifecycle, registration, submissions, public URLs, and authorization.

### AQ-002: existing publication path violates draft-only generation

Severity: critical. Confidence: verified.

`tryAutoApproveEvent()` can publish a pending-review free virtual event for an approved, email-verified organizer. Trusted organizers can also auto-publish more complex setups (`src/services/event-approval.service.js:87-179`). Publication immediately starts badge generation and organizer achievement evaluation (`src/services/event-approval.service.js:8-85`).

The generator must save only `draft`. It must not call organizer submission, `tryAutoApproveEvent()`, `publishEvent()`, or any route that transitions to `pending_review`. Active Quest validation and human publication must remain separate actions.

### AQ-003: date semantics conflict at boundary instants

Severity: high. Confidence: verified.

The package specifies PHT and half-open intervals. Existing submission-window logic rejects only when `now > end`, making the stored deadline inclusive (`src/utils/submission-window.js:3-20`). Existing fixtures store and display 11:59 PM end-of-day deadlines. The proposed contract uses exclusive next-day midnight.

Before Phase 2, choose one representation. Recommended representation:

- Store UTC instants derived from PHT.
- Use half-open comparisons: `start <= instant < endExclusive`.
- Display the inclusive human day, not the exclusive storage instant.
- Keep run dates as PHT calendar days.
- Add tests at one millisecond before, exactly at, and one millisecond after every boundary.

Changing generic helpers could affect all existing events. Prefer new explicit `...EndExclusiveAt` series snapshot values first. Migrate shared behavior only with compatibility tests.

### AQ-004: accumulated category badge issuance is not proven

Severity: critical. Confidence: strong code-path evidence; runtime integration proof pending.

Multi-category events deliberately avoid one global challenge-progress milestone set. Accumulated review refreshes challenge progress, while ordinary distance-completed awards use another evaluation path. `sumApprovedChallengeMetrics()` is registration-scoped, but lifetime distance uses runner-wide totals (`src/services/badge-progress.service.js:637-686`).

Required proof before promising rewards:

1. Create a six-category accumulated event in an isolated test database.
2. Register runners in at least 25K and 200K categories.
3. Approve activities below, at, and above each selected target.
4. Prove only the selected category badge is awarded once.
5. Prove reversal or correction revokes/restores the correct badge.
6. Prove one participant cannot receive another category badge from the same edition unless policy explicitly permits it.

If the test fails, fix only the accumulated selected-category award path. Do not restore global milestones for multi-category editions.

### AQ-005: certificate templates are mutable and event-scoped

Severity: medium. Confidence: verified.

Current certificate templates support rich rendering and a single active template per event. Updates mutate the active record. Historical certificates retain rendered files and template IDs, but there is no immutable reusable master across editions.

Create immutable template versions or include a frozen certificate snapshot inside each Active Quest template version. Each edition must reference the exact version used. Publishing a new version must not mutate older editions.

### AQ-006: feature-flag requirements need persistent audit state

Severity: high. Confidence: verified.

The codebase has domain-specific environment flags, but no generic persistent feature-flag service that records actor, old value, new value, time, and reason. Environment variables alone cannot satisfy authorized admin updates and audit history.

Keep scope narrow. Store the four Active Quest flags on `ActiveQuestSeries` or a dedicated Active Quest settings record:

- `activeQuestSeriesEnabled`
- `activeQuestDraftGenerationEnabled`
- `activeQuestSchedulerEnabled`
- `activeQuestAutoPublishEnabled`

All must default to `false` in schema, seed behavior, and missing-record behavior. Add an environment hard-disable only if operations require it. Never let an environment variable silently enable publication.

### AQ-007: dual-database changes need one source of truth

Severity: high. Confidence: verified.

MongoDB currently owns event state. Postgres stores event shadows and reward/reporting data. Adding fields only to Mongoose would leave reports and downstream jobs blind to series identity.

Recommended migration:

1. Add Mongo models and sparse `Event` fields first.
2. Add nullable `series_key`, `series_year`, `series_month`, `series_template_version_id`, and snapshot checksum columns to `events_core`.
3. Add a partial unique Postgres index for non-null series identities after duplicate preflight.
4. Extend event shadow mapping and checksum logic in the same release.
5. Backfill only after an explicit production inventory and mapping approval.

Rollback is additive: stop writing new fields and remove consumers first. Drop columns or indexes only in a separate approved migration. Do not infer historical month identity from titles or slugs.

### AQ-008: series achievements can double-count reused activities

Severity: high. Confidence: verified.

Lifetime distance sums approved standard submissions plus approved accumulated activities by runner. It has no cross-event canonical activity key (`src/services/badge-progress.service.js:655-686`). The same real activity could be submitted to overlapping events with different screenshots or URLs and count twice.

Do not implement lifetime Active Quest distance achievements until policy defines reuse and identity. Month-streak achievements can use edition participation without distance deduplication. Distance achievements need a stable activity identity or an explicit, documented acceptance of cross-event double counting.

### AQ-009: public series experience is absent

Severity: medium. Confidence: verified.

Public routes expose `/events/:slug` and event lists. There is no stable `/active-quest` route, series archive, current/next edition resolver, continuity explanation, or cross-edition navigation.

Build the series page from series identity fields. Do not detect membership from title text. Preserve every historical event slug and URL.

### AQ-010: upload and provider claims must stay conservative

Severity: medium. Confidence: verified.

Screenshot upload, hash checks, OCR, and duplicate signals exist. Official Strava submission remains blocked in current service logic. URL verification does not use provider APIs. Active Quest copy must not imply automated Strava verification, provider API integration, or guaranteed OCR accuracy.

New asset uploads should reuse byte-signature validation where available. Client MIME alone is insufficient for admin-uploaded badge and certificate assets.

## Compatibility risks

- Changing shared deadline comparisons may reopen or close existing event windows unexpectedly.
- Making slugs immutable globally could break existing organizer editing. Lock generated Active Quest slugs through series rules first.
- Adding required fields to `Event` would break historical records. Every new series field must be optional outside Active Quest.
- A compound unique index can fail if historical records are backfilled incorrectly. Preflight duplicates before index creation.
- Reusing generic event auto-approval can publish drafts. Active Quest must use a separate manual transition.
- Badge fixes can award or revoke existing event rewards. Scope queries by series identity and add regression coverage.
- Certificate finalization currently waits for unresolved reviews across the event. One unresolved participant can delay finalization for all participants.
- In-process schedulers can execute on every replica. Use an atomic database claim and an idempotency key.
- Public analytics and CSV exports can leak participant data. Default to aggregates and apply existing leaderboard privacy rules.

## Test and fixture gaps

No Active Quest-specific tests exist. Required coverage before publication:

- Series and template-version schema validation.
- Unique edition identity and concurrent generator idempotency.
- Draft-only generation and negative tests for every publish path.
- PHT month-length, leap-year, and exact-boundary tests.
- Structured copy contradiction validation.
- Six exact category definitions and registration snapshot preservation.
- Accumulated selected-category badge award, correction, reversal, and idempotency.
- Certificate template version immutability and final-review gating.
- Series page current, next, archive, and historical URL behavior.
- Privacy-safe analytics and export authorization.
- Scheduler multi-replica claims, retries, failure state, and disabled defaults.
- Flag missing-record, false-default, audit, and unauthorized-update behavior.
- November 2026 golden fixture.

## Recommended implementation sequence

The package phase order is sound, with two gates added before feature work:

1. Approval gate: approve this audit and resolve the pending decisions in `ACTIVE_QUEST_DECISIONS.md`.
2. Correctness gate: add focused tests for boundary semantics and accumulated category rewards before schema work relies on either behavior.
3. Phase 1: series model, immutable template version, optional event identity fields, Postgres shadow migration, four disabled flags, and audit records.
4. Phase 2: pure PHT schedule builder and idempotent draft-only generator.
5. Phase 3: structured content renderer and contradiction validator.
6. Phase 4: admin series/template/edition workflows and Active Quest readiness checks.
7. Phase 5: prove or fix category badges and versioned certificates.
8. Phase 6: stable public series page and historical navigation.
9. Phase 7: privacy-safe analytics and authorized exports.
10. Phase 8: streak achievements first; distance achievements only after identity policy.
11. Phase 9: November 2026 fixture generated as a draft and manually preflighted.
12. Phase 10: disabled scheduler with atomic claims and alerts.
13. Phase 11: optional auto-publication only under a separate explicit approval.

November urgency must not bypass draft-only generation, reward proof, assets, or human publication review.

## Complexity and blockers

Relative estimates include implementation, tests, review, and documentation. They exclude production backfill, asset design, and incident response.

- Foundations and generator, Phases 1-2: large; about 25-45 engineering hours.
- Content and admin tooling, Phases 3-4: medium to large; about 20-35 hours.
- Rewards and public series page, Phases 5-6: large; about 25-45 hours.
- Analytics and achievements, Phases 7-8: large; about 25-50 hours.
- November fixture and disabled scheduler, Phases 9-10: medium; about 15-30 hours.
- Auto-publication, Phase 11: high-risk optional work; estimate only after manual operation evidence.

Current blockers to Phase 1:

- Explicit user approval is required.
- Date storage/comparison contract needs confirmation.
- Series ownership and permission boundary need confirmation.
- Mongo-authoritative with Postgres shadow strategy needs confirmation.

Blockers to November publication, not to Phase 1 coding:

- Production event/slug inventory.
- Approved organizer identity.
- Six final badge assets.
- Approved certificate design/version.
- Isolated proof of category reward issuance.
- Human pre-publication approval.

## Stage 0 conclusion

The repository can support Active Quest without replacing its event, registration, submission, leaderboard, or certificate systems. The safe design is additive and series-aware. The work should begin only after approval of this audit. Approval authorizes Phase 1 only; it does not authorize publication, scheduling, production migration, backfill, or auto-publication.
