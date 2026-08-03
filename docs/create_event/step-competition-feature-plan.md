# Step-Based Competition Events

**Status:** Repository implemented behind disabled feature flag; rollout pending  
**Reconciliation date:** 2026-08-03

## Purpose

Extend the organizer create/edit event process so virtual and hybrid accumulated
challenges can compete by verified distance, verified steps, or both. One metric
is always the official ranking basis. When both are tracked, both totals are
shown, but the secondary metric never silently changes rank or completion.

Related references:

- [Create-event tracker](create_event.md)
- [Create-event wizard implementation guide](create_event_wizard_codex_implementation.md)
- [Leaderboard improvement specification](../features/hellorun_leaderboard_improvement_spec.md)
- [Hybrid database architecture](../database/hellorun_hybrid_database_schema_architecture.md)

## Locked Product Decisions

- V1 applies to virtual and hybrid accumulated challenges only.
- Organizers choose `distance`, `steps`, or both as tracked challenge metrics.
- Each event has one official primary metric: `distance` or `steps`.
- Both totals are displayed when both are tracked.
- Step goals are optional, event-wide positive integers.
- Existing distance goals remain category-derived.
- Only the primary metric and its goal determine completion, certificates, and
  completion badges.
- A missing primary goal makes the event ranking-only and prevents automatic
  finisher rewards.
- Step-only activity proofs may omit distance.
- Every proof for a step-tracked event requires a verified positive step count.
- Strava-only submissions cannot enter a step-tracked event until the
  integration supplies verified steps.
- Equal primary totals share the same official competition rank. Tied rows use
  final contributing submission time and registration ID only for stable
  display order.

## Public Data Contract

### Event

```text
virtualCompletionMode:
  single_activity | accumulated_activity | accumulated_distance (legacy read)

challengeMetrics:
  [distance] | [steps] | [distance, steps]

primaryChallengeMetric:
  distance | steps

targetSteps:
  null | integer from 1 through 1,000,000,000
```

Legacy `accumulated_distance` records without the new fields resolve to
`challengeMetrics: [distance]` and `primaryChallengeMetric: distance`. New and
edited accumulated challenges save `accumulated_activity`.

### Submission

- `distanceKm` is nullable only for step-only accumulated challenges.
- `steps` is an official nullable integer metric in MongoDB and PostgreSQL.
- Distance-tracked events require positive distance.
- Step-tracked events require positive integer steps.
- Both-metric events require both values.

### Leaderboard

- `leaderboardSettings.rankingBasis` adds `highest_verified_steps`.
- Visible columns add `steps`.
- New metric-neutral modes are `top_metric` and
  `finishers_and_top_metric`.
- Existing `top_distance` modes remain readable as distance aliases.

### Progress and certificates

Progress exposes approved, pending, rejected, remaining, and percentage values
for every tracked metric. Certificate metadata adds `completionMetric`,
`goalSteps`, and `verifiedSteps`; existing distance metadata remains supported.

## Prioritized Tasks

### Priority 0 — Documentation gate

- [x] P0.1 Create this feature specification.
- [x] P0.2 Record all behavior, compatibility, ranking, and acceptance rules.

Application implementation starts only after this document is accepted.

### Priority 1 — Launch-blocking implementation

#### Phase 1: Data foundation and compatibility

- [x] P1.1 Add `accumulated_activity` with legacy accumulated-distance reads.
- [x] P1.2 Add event challenge metric fields.
- [x] P1.3 Centralize challenge compatibility and target helpers.
- [x] P1.4 Make accumulated distance nullable and steps official.
- [x] P1.5 Add additive PostgreSQL migrations.
- [x] P1.6 Update event, submission, ranking, and certificate shadow sync.
- [x] P1.7 Add an idempotent legacy event backfill.
- [x] P1.8 Add `FEATURE_STEP_COMPETITIONS_ENABLED`, defaulting to false.

#### Phase 2: Organizer create/edit process

- [x] P2.1 Use the organizer label “Accumulated challenge.”
- [x] P2.2 Add Distance, Steps, and Distance and steps choices.
- [x] P2.3 Show a primary-metric selector when both are tracked.
- [x] P2.4 Add the optional event-wide step goal.
- [x] P2.5 Permit named step-only categories without numeric distance.
- [x] P2.6 Update normalization, drafts, publish validation, and edit hydration.
- [x] P2.7 Update preview and readiness explanations.
- [x] P2.8 Save new leaderboard choices with metric-neutral values.

#### Phase 3: Submission, verification, and progress

- [x] P3.1 Pass event metric requirements to proof UI and server validation.
- [x] P3.2 Require distance only when tracked.
- [x] P3.3 Require positive steps whenever tracked.
- [x] P3.4 Require both values for both-metric events.
- [x] P3.5 Block Strava-only step event submissions.
- [x] P3.6 Require OCR match for trusted step auto-approval.
- [x] P3.7 Skip distance integrity checks when distance is absent by design.
- [x] P3.8 Calculate progress for distance and steps.
- [x] P3.9 Display applicable metrics in organizer review.

#### Phase 4: Leaderboards and participant displays

- [x] P4.1 Add step ranking and visible-column settings.
- [x] P4.2 Aggregate approved distance and steps per registration.
- [x] P4.3 Rank by the primary metric.
- [x] P4.4 Assign shared ranks to equal primary totals.
- [x] P4.5 Apply deterministic, non-ranking tie ordering.
- [x] P4.6 Include metric settings in cache behavior.
- [x] P4.7 Update organizer, runner, public, discovery, and reporting displays.

#### Phase 5: Completion rewards

- [x] P5.1 Resolve threshold crossing by primary metric.
- [x] P5.2 Persist metric-aware certificate metadata.
- [x] P5.3 Render step-aware certificates and verification copy.
- [x] P5.4 Add 25%, 50%, 75%, and 100% step milestones.
- [x] P5.5 Reconcile rewards after review state changes.
- [x] P5.6 Prevent automatic rewards when the primary goal is absent.

### Priority 2 — Verification and rollout

- [x] P6.1 Add focused form, model, migration, shadow, submission, progress,
  leaderboard, certificate, badge, and UI tests.
- [ ] P6.2 Run focused suites and the complete regression suite.
- [ ] P6.3 Apply additive database migrations.
- [ ] P6.4 Deploy compatibility support with the feature flag off.
- [ ] P6.5 Dry-run, run, and audit the legacy backfill.
- [ ] P6.6 Smoke-test the complete step-only and legacy distance workflows.
- [ ] P6.7 Enable the feature flag and monitor operational errors.
- [x] P6.8 Reconcile repository status and changelog documentation; append
  production evidence after rollout.

### Repository verification evidence

- Focused step-competition, organizer-form, progress, certificate, badge,
  ranking, and shadow tests pass.
- JavaScript syntax/module-load checks and `git diff --check` pass.
- The public leaderboard integration fixture remains blocked by an existing
  test-data visibility mismatch: it marks seeded events `isTestData: true`
  while the production visibility query excludes test data.
- PostgreSQL migration application, live backfill, browser smoke tests,
  deployment, and feature-flag enablement remain intentionally pending.

## Publish Validation

- At least one challenge metric is selected.
- The primary metric is included in the tracked metrics.
- Distance-tracked events have a valid category-derived target.
- A supplied step target is a positive integer within the supported range.
- Step-only events have at least one named registration category.
- Ranking-only events disclose that automatic finisher rewards are unavailable.

## Test and Acceptance Matrix

- Create, draft, preview, publish, and edit round-trip all metric combinations.
- Step-only proofs succeed without distance and fail without valid steps.
- Both-metric proofs require both distance and steps.
- Distance-only behavior remains unchanged.
- Strava-only proof is unavailable for step-tracked events.
- Only approved metrics contribute to official progress and rankings.
- Manual steps without extracted proof require review.
- Leaderboards sort by the primary metric and share rank on equal totals.
- Pending metrics remain visually separate from approved metrics.
- Step goal completion issues metric-aware certificates and badges.
- Ranking-only events issue no automatic finisher rewards.
- Public output never exposes proof, OCR, suspicious-review, or private runner
  data.
- MongoDB/PostgreSQL backfill and shadow operations are idempotent.

## Rollout

1. Apply additive PostgreSQL migrations.
2. Deploy compatibility helpers and shadow support with the flag disabled.
3. Dry-run and audit the legacy event backfill.
4. Deploy organizer, submission, leaderboard, progress, and reward behavior.
5. Smoke-test create → register → submit → approve → rank → reward for a
   step-only event and a legacy distance event.
6. Enable `FEATURE_STEP_COMPETITIONS_ENABLED`.
7. Monitor validation failures, review volume, shadow sync, leaderboard cache,
   and certificate generation.
8. Update this status, `docs/STATUS.md`, and `docs/CHANGELOG.md` with evidence.

## Deferred

- Onsite-only step competitions.
- Per-category step targets.
- Separate official distance and step leaderboards.
- Combined or weighted scores.
- Organizer-defined formulas.
- Estimated steps derived from distance.
- Team step competitions.
- Daily cumulative-step submission rules.
- Strava step eligibility without a verified provider value.
