# HelloRun Achievement Badges

This is the implementation handoff for the current achievement badge system. The full planning source remains `docs/features/hellorun_achievement_badges_feature.md`.

## Current Status

As of May 19, 2026, core event badges, challenge/global distance foundations, leaderboard variants, organiser variants, and admin recalculation controls are implemented.

Implemented:

- Supabase-first badge ledger for definitions, event badge links, earned badges, featured badges, and audit logs.
- MongoDB badge content and badge template models.
- Badge template service for reusable template lookup, upsert, normalization, and pattern rendering.
- Default badge generation for published events with digital badges enabled.
- Participant badge awards after confirmed registration, with paid events requiring paid payment status.
- Finisher, distance finisher, and mode finisher badge awards after approved result submission.
- Badge progress table and service foundation for accumulated-distance challenge milestones.
- Accumulated-distance events auto-create 25%, 50%, 75%, and 100% challenge badges.
- Approved accumulated activities refresh challenge progress and award reached milestone badges.
- Runner dashboard and profile show challenge badge progress.
- Global lifetime distance milestones create 5K, 50K, 100K, 500K, and 1000K badge definitions.
- Approved standard submissions and accumulated activities refresh global lifetime distance progress.
- Public earned badge verification/share pages and JSON verification endpoint.
- Public runner badge collection pages with profile-level share links.
- Server-rendered social share preview images for individual badges and public runner badge collections.
- Open Badges-ready hosted JSON metadata for verified earned badge pages.
- Leaderboard rank badges for top 1, top 3, and top 10 when leaderboard recognition is enabled.
- Leaderboard distance winner and mode winner badge variants for published rankings.
- Published rankings trigger leaderboard badge awards and keep awards idempotent.
- Organiser achievement badges for verified organiser status, first published event, first confirmed registration, five published events, and 100 confirmed registrations.
- Organiser dashboard badge widget with public share/verification links.
- Duplicate award prevention for non-repeatable event badges.
- Admin revocation without deleting earned badge history.
- Re-award suppression after admin revocation.
- Admin badge scope filtering for definitions, earned awards, and recent audit logs.
- Admin badge definition disable/enable controls with required disable reason and audit log entries.
- Admin badge email notification level controls for `none`, `major`, and `all` definition-level rollout.
- Admin badge recalculation controls for capped additive event and organiser award recalculation.
- Read-only admin badge analytics for definitions, awards, revocation rate, scope/type breakdowns, and top awarded definitions.
- In-app badge earned notifications.
- Badge email rollout through the communication manager, disabled globally by default unless `badge.earned` email is enabled and the badge definition opts in.
- Public event badge display.
- Runner dashboard recent badge widget.
- Runner profile badge collection and featured badge selection.
- Organiser badge manager for event badge display fields.
- Admin badge management UI for definitions, earned awards, revocation, and recent audit logs.

## Core Rule

```text
Badges are created from event rules.
Badges are awarded only after verified user actions.
```

Client-side pages display and manage badge content, but badge awarding must stay server-side.

## Data Model

PostgreSQL/Supabase:

- `badge_definitions`: reusable badge rules.
- `event_badges`: event-to-definition links plus display overrides.
- `user_badges`: earned runner badge ledger.
- `badge_audit_logs`: badge creation, award, and revocation history.
- `badge_definitions.email_notification_level`: `none`, `major`, or `all`.

MongoDB:

- `BadgeContent`: flexible display copy and metadata.
- `BadgeTemplate`: reusable visual/template metadata for later refinement.

## Services

- `src/services/badge-definition.service.js`
- `src/services/badge-template.service.js`
- `src/services/event-badge.service.js`
- `src/services/achievement.service.js`
- `src/services/badge-audit.service.js`
- `src/services/badge-notification.service.js`
- `src/services/badge-progress.service.js`
- `src/utils/badge-normalization.js`

## Routes And Screens

Public:

- `GET /runners/:userId/badges`
- `GET /runners/:userId/badges/share-image.svg`
- `GET /badges/:userBadgeId`
- `GET /badges/:userBadgeId/share-image.svg`
- `GET /badges/:userBadgeId/open-badge.json`
- `GET /badges/:userBadgeId/verify`
- `GET /events/:eventSlug/badges`
- Event details page badge section.

Runner:

- `GET /runner/dashboard`
- `GET /runner/dashboard/badges`
- `GET /runner/dashboard/badge-progress`
- `GET /runner/profile`
- `GET /runner/profile/badges`
- `GET /runner/profile/badge-progress`
- `POST /runner/profile/badges/featured`

Organiser:

- `GET /organizer/dashboard`
- `GET /organizer/events/:id/badges`
- `GET /organizer/events/:id/badges/manage`
- `POST /organizer/events/:id/badges/:badgeId`

Admin:

- `GET /admin/badges`
- `GET /admin/badges?scope=organiser&status=verified`
- `GET /admin/badges?scope=event&status=verified` JSON includes analytics payload when requested with `Accept: application/json`.
- `POST /admin/badges/recalculate`
- `POST /admin/badge-definitions/:badgeDefinitionId/status`
- `POST /admin/badge-definitions/:badgeDefinitionId/email`
- `POST /admin/user-badges/:userBadgeId/revoke`

## Award Triggers

- Admin event approval/publish generates default event badges.
- Confirmed registration evaluates participant badges.
- Paid-event payment approval evaluates participant badges after payment status is paid.
- Submission approval evaluates finisher, distance finisher, and mode finisher badges.
- Approved onsite results and timing-system result imports evaluate finisher, distance finisher, and mode finisher badges.
- Accumulated activity approval refreshes badge progress and evaluates challenge progress milestones.
- Submission approval and accumulated activity approval refresh global lifetime distance milestones.
- Ranking publication evaluates top-rank leaderboard badges.
- Organiser application approval and event publication evaluate organiser achievement badges.

## Validation

Current focused and adjacent validation:

```powershell
node --test --test-concurrency=1 tests/achievement-badges-routes.test.js tests/achievement-badges.integration.test.js tests/achievement-badges.service.test.js tests/submission-shadow.service.test.js tests/registration-payment-shadow.service.test.js tests/event-shadow.service.test.js tests/organizer-shop-payment-review-actions.test.js
```

Latest split release-readiness sweep: 101/101 passing across badge, ranking, communication, onsite operations, submission, shadow sync, shop read/payment-review, and validation middleware tests.

Latest focused route result: 4/4 passing for `tests/achievement-badges-routes.test.js`.

## Deferred Scope

None currently tracked for the badge MVP. Future enhancements can add richer artwork, public API access, and deeper analytics.

## Release Handoff

Migration order:

1. Run existing Supabase migrations in filename order through `npm run supabase:migrate`.
2. Badge-specific migrations are `009_phase9_achievement_badges.sql`, `012_phase12_badge_progress.sql`, `013_phase12_global_distance_badges.sql`, and `014_phase12_badge_email_notification_levels.sql`.
3. Commerce migrations `008`, `010`, and `011` should also be present because registration add-on/payment-review coverage shares payment and badge trigger paths.

Environment and rollout:

- `DATABASE_URL` must point to the Supabase/Postgres database.
- `MONGODB_URI` must be available for badge content, templates, communication settings, and notification logs.
- `APP_URL` should be set before enabling badge share links or badge earned email.
- Keep `badge.earned` email disabled in `/admin/communications` until templates and sender reputation are ready.
- Enable badge emails gradually by setting badge definitions to `major` or `all` from `/admin/badges`.

Admin rollout steps:

1. Open `/admin/badges` and confirm definitions, analytics, audit logs, and earned awards load.
2. Confirm default event badges are created when an approved event has `digitalBadgeEnabled = true`.
3. Review organiser-scope badges after approving an organiser and publishing their first event.
4. Use `/admin/badges/recalculate` with a small batch first after migration or rule changes.
5. Use disable/revoke controls only with an audit reason.

Production smoke checklist:

- Publish a badge-enabled test event and confirm event badge display.
- Register a runner and confirm participant badge award.
- Approve a result and confirm finisher, distance, and mode badge awards.
- Publish rankings and confirm top-rank plus distance/mode winner badges.
- Open a public badge page, verification JSON, Open Badges JSON, and share image SVG.
- Confirm runner profile featured badge update works.
- Confirm `badge.earned` in-app notification is created.
- With email still disabled, confirm email logs show skipped rather than failed when badge definitions opt in.

## Recommended Next Phase

Next: move back to the shop Phase 11B/11C UI queue: event shop page, product detail page, and runner order detail pages.
