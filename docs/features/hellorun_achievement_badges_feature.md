# HelloRun Achievement Badges Feature

## 1. Feature Summary

The Achievement Badges feature allows HelloRun to recognise verified runner, organiser, and event achievements through digital badges.

Badges should support the main HelloRun experience:

- Runners can see what they can earn before joining an event.
- Runners can collect badges after verified registration, submission, or completion.
- Organisers can make events more engaging by displaying event-specific badges.
- Admins can govern badge templates, badge awarding rules, and audit logs.
- HelloRun can build long-term runner identity through profile-based badge collections.

The feature should be implemented as a verified achievement system, not only a visual gamification layer.

Core rule:

```text
Badges are created from event rules.
Badges are awarded only after verified user actions.
```

## 1.1 Current Implementation Status

Status as of 2026-05-18:

```text
Phase 1 core event badges are implemented and covered by focused tests. Phase 2 challenge progress foundation has started.
```

Implemented:

- Supabase badge ledger tables for badge definitions, event badge links, earned badges, featured badges, and audit logs.
- MongoDB badge content and badge template models.
- Default event badge generation for published badge-enabled events.
- Participant badge awarding after confirmed registration, with paid events requiring paid payment status.
- Finisher, distance finisher, and mode finisher awarding after approved result submission.
- Finisher, distance finisher, and mode finisher awarding after approved onsite results and timing-system result imports.
- `badge_progress` migration and badge progress service foundation.
- Accumulated-distance events auto-create 25%, 50%, 75%, and 100% challenge badges.
- Approved accumulated activities refresh challenge progress and award reached milestone badges.
- Runner dashboard and profile display challenge badge progress.
- Global lifetime distance milestones create 5K, 50K, 100K, 500K, and 1000K badge definitions.
- Approved standard submissions and accumulated activities refresh global lifetime distance progress.
- Public earned badge verification/share pages and JSON verification endpoint.
- Public runner badge collection pages with profile-level share links.
- Server-rendered social share preview images for individual badges and public runner badge collections.
- Open Badges-ready hosted JSON metadata for verified earned badge pages.
- Leaderboard rank badges for top 1, top 3, and top 10 when leaderboard recognition is enabled.
- Leaderboard distance winner and mode winner badge variants for published rankings.
- Ranking publication evaluates leaderboard badge awards idempotently.
- Organiser achievement badges for verified organiser status, first published event, first confirmed registration, five published events, and 100 confirmed registrations.
- Organiser dashboard badge widget with public share/verification links.
- Duplicate award prevention for non-repeatable event badges.
- Admin revocation without deleting badge history.
- Automatic re-award suppression after admin revocation.
- Admin badge scope filtering for definitions, earned awards, and recent audit logs.
- Admin badge definition disable/enable controls with required disable reason and audit logging.
- Admin badge recalculation controls for capped additive event and organiser award recalculation.
- Read-only admin badge analytics for award volume, revocation rate, scope/type breakdowns, and top awarded definitions.
- In-app badge earned notifications.
- Badge email rollout through the communication manager, disabled globally by default unless `badge.earned` email is enabled and the badge definition opts in.
- Admin badge email notification level controls for `none`, `major`, and `all` definition-level rollout.
- Badge template service for reusable MongoDB badge template records and pattern rendering.
- Public event badge JSON route and event details badge display.
- Runner badge JSON routes, runner profile badge collection, and featured badge update.
- Organiser event badge read/update JSON routes for event-owned display fields.
- Admin badge list, earned badge, revocation, and audit-log UI/routes.
- Badge route, service, integration, shadow-sync, and payment-review regression tests.

Still intentionally deferred:

- AI-generated badge artwork.

## 2. Product Goals

The Achievement Badges feature should:

- Increase runner motivation.
- Improve event participation and completion.
- Give organisers a simple way to add collectible value to events.
- Make runner profiles more meaningful.
- Prepare for long-running challenges such as the 2026K Challenge after the core award path is stable.
- Preserve badge credibility by awarding badges only after verified conditions.
- Prepare HelloRun for future verifiable digital badges.

## 3. Non-Goals for MVP

The MVP should not include:

- Full Open Badges compliance.
- Blockchain or cryptographic badge issuing.
- Public API for third-party badge verification.
- Full badge marketplace.
- Manual badge awarding by organisers without admin review.
- AI-generated badge artwork.

These can be considered later after the core system is stable.

## 4. Design Principles

### 4.1 Separate Badge Creation and Badge Awarding

Badge creation means the system defines a badge that can be earned.

Badge awarding means a user actually receives the badge after meeting the rule.

Example:

```text
Event published by admin approval
↓
System creates "Baguio Fun Run 5K Finisher" badge
↓
Runner joins 5K category
↓
Runner submits result
↓
Submission is approved
↓
System awards the 5K Finisher badge
```

### 4.2 Award Only Verified Achievements

Finisher and distance badges must be based on verified records.

Examples of verified records:

- Confirmed registration
- Verified payment
- Approved run proof
- Imported onsite result
- Admin-approved correction

### 4.3 Make Badges Visible Before They Are Earned

Event pages should show available badges so runners know what they can earn.

Recommended visibility states:

```text
hidden
revealed
unlocked
```

- Hidden: Badge exists but details are not public.
- Revealed: Badge is visible but not yet earned.
- Unlocked: User has earned the badge.

### 4.4 Use In-App Notifications First

Badge earning should create in-app notifications.

Email badge notifications are deferred until after the core in-app award path is stable.

## 5. User Roles

### 5.1 Runner

Can:

- View badges available in an event.
- Earn badges after verified actions.
- View earned badges in profile.
- Feature one badge on profile.
- Share earned badges.
- View progress toward progress badges.

Cannot:

- Edit badge rules.
- Award badges manually.
- Modify verified badge history.

### 5.2 Organiser

Can:

- View auto-created badges for their event.
- Customise event badge title, description, and image if allowed.
- Enable or disable optional event badges before publishing.
- Preview event badges on the event page.
- View badge statistics for their event.

Cannot:

- Award badges directly without verified runner action.
- Delete badge audit logs.
- Modify global badge rules.
- Edit badges after they have been awarded unless admin allows safe display-only edits.

### 5.3 Admin

Can:

- Manage badge templates.
- Manage global badges.
- View all event badges.
- Disable badge awarding.
- Recalculate badge progress.
- Revoke wrongly awarded badges with reason.
- View audit logs.
- Approve or reject custom organiser badge images.

## 6. Badge Types

### 6.1 Event Participant Badge

Awarded when a runner has a confirmed registration.

Recommended rule:

```text
registration.status = confirmed
```

For paid events:

```text
registration.status = confirmed
payment.status = paid
```

### 6.2 Event Finisher Badge

Awarded when the runner completes the event with an approved result.

Recommended rule:

```text
submission.status = approved
```

For onsite imports:

```text
result_import.status = finalised
runner_result.status = verified
```

### 6.3 Distance Finisher Badge

Awarded when a runner completes a specific distance category.

Example badges:

```text
Baguio Fun Run 3K Finisher
Baguio Fun Run 5K Finisher
Baguio Fun Run 10K Finisher
```

Recommended rule:

```text
approved_distance >= required_distance
registration.distance_category = badge.distance_category
```

### 6.4 Mode Finisher Badge

Awarded based on participation mode.

Examples:

```text
Virtual Finisher
Onsite Finisher
Hybrid Finisher
```

Recommended rule:

```text
registration.participation_mode = badge.required_mode
completion_status = verified
```

### 6.5 Challenge Progress Badge

Deferred until Phase 2.

Awarded when a runner reaches progress thresholds.

Examples:

```text
2026K 25% Complete
2026K 50% Complete
2026K 75% Complete
2026K Finisher
```

Recommended rule:

```text
verified_accumulated_distance >= target_distance
```

### 6.6 Global Distance Milestone Badge

Awarded based on lifetime verified distance.

Examples:

```text
First 5K
50K Club
100K Club
500K Club
1000K Club
```

Recommended rule:

```text
user.total_verified_distance >= badge.requirement_value
```

### 6.7 Leaderboard Badge

Top-rank leaderboard badges are implemented for published rankings.

Awarded when final rankings are generated.

Examples:

```text
Top 1 Finisher
Top 3 Finisher
Top 10 Finisher
Category Winner
```

Recommended rule:

```text
event.status = published
rankings.published_at IS NOT NULL
rankings.rank_position <= badge.requirement_value
```

### 6.8 Organiser Badge

Deferred until Phase 3.

Awarded to organisers based on platform activity and credibility.

Examples:

```text
First Event Organised
Verified Organiser
100 Participants Reached
Repeat Organiser
Trusted Organiser
```

Recommended rule examples:

```text
organiser.published_event_count >= 1
```

```text
organiser.total_verified_participants >= 100
```

```text
organiser.dispute_rate <= allowed_threshold
```

## 7. Event Badge Auto-Creation Flow

Event badges should be automatically created when an admin approves an event and the app changes the event from `pending_review` to `published`.

Current HelloRun status flow:

```text
draft
pending_review
published
closed
archived
```

The current app does not have separate `approved`, `completed`, or `rejected` event statuses.

Create badges at:

```text
published, during admin approval
```

Show badges publicly at:

```text
published
```

Do not create public badges for:

```text
draft
pending_review
closed
archived
deleted events
personal record events
events with digitalBadgeEnabled = false
```

## 8. Default Event Badges

When an event is published by admin approval, HelloRun should generate these default badges if `digitalBadgeEnabled` is true.

### 8.1 All Events

- Event Participant
- Event Finisher

### 8.2 Per Distance Category

For each value in `Event.raceDistances`, create a distance finisher badge.

Example:

```text
Event: Baguio Charity Run
Distances: 3K, 5K, 10K
```

Auto-created badges:

```text
Baguio Charity Run Participant
Baguio Charity Run Finisher
Baguio Charity Run 3K Finisher
Baguio Charity Run 5K Finisher
Baguio Charity Run 10K Finisher
```

### 8.3 Per Event Mode

Use `Event.eventTypesAllowed` first, with `Event.eventType` as a legacy fallback.

If the event allows virtual participation:

```text
Virtual Finisher
```

If the event allows onsite participation:

```text
Onsite Finisher
```

If the event allows both virtual and onsite participation:

```text
Virtual Finisher
Onsite Finisher
```

### 8.4 If Leaderboard Is Enabled

Top-rank leaderboard badges are created when leaderboard recognition is enabled.

```text
Top 3 Finisher
Top 10 Finisher
Category Winner
```

### 8.5 If Challenge Mode Is Enabled

Implemented as the Phase 2 foundation for accumulated-distance events.

```text
25% Complete
50% Complete
75% Complete
Challenge Finisher
```

## 9. Recommended MVP Badge List

### Event Badges

```text
Event Participant
Event Finisher
Distance Finisher
Virtual Finisher
Onsite Finisher
```

### Deferred Global Runner Badges

```text
First Event
First Verified Run
5K Finisher
10K Finisher
21K Finisher
50K Club
100K Club
500K Club
1000K Club
```

### Deferred Challenge Badges

```text
Challenge Participant
25% Complete
50% Complete
75% Complete
Challenge Finisher
```

### Deferred Organiser Badges

```text
First Event Organised
Verified Organiser
100 Participants Reached
Repeat Organiser
Trusted Organiser
```

## 10. Data Ownership and Storage Strategy

HelloRun uses a hybrid database model.

Recommended split:

- PostgreSQL / Supabase: structured badge definitions, event badge links, earned badges, and audit logs.
- MongoDB: flexible badge content, template metadata, and image display configuration.

Use the existing HelloRun bridge conventions:

- User references should point to `app_users.id`.
- Event references should point to `events_core.id`.
- Registration references should point to `registrations.id`.
- Submission references should point to `submissions_core.id`.
- Store MongoDB IDs as optional text fields only for traceability and hybrid lookup.

## 11. PostgreSQL Schema

### 11.1 `badge_definitions`

Stores reusable badge rules.

```sql
CREATE TABLE badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  badge_scope TEXT NOT NULL CHECK (badge_scope IN ('global', 'event', 'challenge', 'organiser')),
  badge_type TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value JSONB,
  points INTEGER DEFAULT 0,
  visibility_state TEXT NOT NULL DEFAULT 'revealed' CHECK (visibility_state IN ('hidden', 'revealed')),
  email_notification_level TEXT NOT NULL DEFAULT 'none' CHECK (email_notification_level IN ('none', 'major', 'all')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_auto_created BOOLEAN NOT NULL DEFAULT FALSE,
  is_repeatable BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 11.2 `event_badges`

Connects badge definitions to events.

```sql
CREATE TABLE event_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_core_id UUID NOT NULL REFERENCES events_core(id) ON DELETE CASCADE,
  mongo_event_id TEXT,
  badge_definition_id UUID NOT NULL REFERENCES badge_definitions(id),
  badge_name_override TEXT,
  badge_description_override TEXT,
  badge_image_url TEXT,
  is_visible_on_event_page BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_core_id, badge_definition_id)
);
```

### 11.3 `user_badges`

Stores earned runner badges.

```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  badge_definition_id UUID NOT NULL REFERENCES badge_definitions(id),
  event_core_id UUID REFERENCES events_core(id) ON DELETE SET NULL,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES submissions_core(id) ON DELETE SET NULL,
  mongo_user_id TEXT,
  mongo_event_id TEXT,
  mongo_registration_id TEXT,
  mongo_submission_id TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'pending_review', 'revoked')),
  source TEXT NOT NULL CHECK (source IN ('system_auto_award', 'admin_manual_award')),
  awarded_by UUID REFERENCES app_users(id),
  revoke_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Recommended unique index for non-repeatable event badges:

```sql
CREATE UNIQUE INDEX unique_runner_badge_non_repeatable
ON user_badges(runner_user_id, badge_definition_id, event_core_id)
WHERE verification_status != 'revoked';
```

If repeatable badges are needed later, enforce repeatability at service level by including period or event context.

### 11.4 `badge_progress`

Deferred until Phase 2.

Stores progress toward incremental badges.

```sql
CREATE TABLE badge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_user_id UUID NOT NULL REFERENCES app_users(id),
  badge_definition_id UUID NOT NULL REFERENCES badge_definitions(id),
  event_core_id UUID REFERENCES events_core(id),
  current_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  target_value NUMERIC(12, 2) NOT NULL,
  progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(runner_user_id, badge_definition_id, event_core_id)
);
```

### 11.5 `badge_audit_logs`

Stores all badge-related actions.

```sql
CREATE TABLE badge_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_definition_id UUID,
  user_badge_id UUID,
  event_core_id UUID REFERENCES events_core(id) ON DELETE SET NULL,
  runner_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES app_users(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Example actions:

```text
badge_created
badge_updated
badge_awarded
badge_revoked
badge_recalculated
event_badges_auto_created
badge_disabled
badge_enabled
```

## 12. MongoDB Collections

### 12.1 `badge_content`

Stores display-focused badge data.

```js
{
  badgeDefinitionId: "uuid-from-postgres",
  eventId: "uuid-from-postgres",
  displayTitle: "Baguio Fun Run 5K Finisher",
  displayDescription: "Awarded for completing the 5K category of Baguio Fun Run.",
  imageUrl: "https://cdn.hellorun.online/badges/baguio-fun-run-5k.webp",
  theme: "event",
  rarity: "common",
  shareText: "I earned the Baguio Fun Run 5K Finisher badge on HelloRun.",
  unlockMessage: "You completed the 5K category. Great work.",
  socialPreviewImage: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date()
}
```

### 12.2 `badge_templates`

Stores reusable badge templates.

```js
{
  templateCode: "event-distance-finisher",
  scope: "event",
  titlePattern: "{{eventTitle}} {{distanceLabel}} Finisher",
  descriptionPattern: "Awarded for completing the {{distanceLabel}} category of {{eventTitle}}.",
  defaultImageUrl: null,
  badgeType: "distance_finisher",
  requirementType: "distance_completed",
  isDefault: true,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date()
}
```

## 13. Service Architecture

Create these services:

```text
badgeTemplateService
badgeDefinitionService
eventBadgeService
achievementService
badgeAuditService
badgeNotificationService
```

### 13.1 `eventBadgeService`

Responsibilities:

- Create default badges during admin approval when the event becomes `published`.
- Attach badges to events.
- Prevent duplicate badge creation.
- Read event badge list.
- Apply organiser display customisations.

### 13.2 `achievementService`

Responsibilities:

- Evaluate badge rules.
- Award badges.
- Prevent duplicate badge awards.
- Create audit logs.
- Trigger notifications.

### 13.3 `badgeProgressService`

Implemented as the Phase 2 foundation.

Responsibilities:

- Track challenge progress.
- Update progress percentages.
- Award progress badges when thresholds are met.

Deferred from this service:

- Global distance milestone progress.

### 13.4 `badgeNotificationService`

Responsibilities:

- Create an in-app notification through the existing MongoDB `Notification` model when a badge is earned.
- Use notification `type = 'badge_earned'`.
- Route badge-earned notifications through the communication manager.
- Attach badge email payloads only when `email_notification_level` is `major` or `all`.
- Keep the `badge.earned` communication event email-disabled by default.

## 14. Event Badge Auto-Creation Logic

```js
async function onEventPublishedByAdmin(eventId, approvedBy) {
  const event = await eventRepository.findById(eventId);

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.status !== 'published') {
    return;
  }

  if (event.isDeleted === true || event.isPersonalRecord === true) {
    return;
  }

  if (event.digitalBadgeEnabled !== true) {
    return;
  }

  const existingBadges = await eventBadgeRepository.findByEventId(eventId);

  if (existingBadges.length > 0) {
    return;
  }

  const badgePayloads = buildDefaultEventBadges(event);

  const createdBadges = await badgeDefinitionService.createMany(badgePayloads, {
    createdBy: approvedBy,
    source: 'system_auto_create'
  });

  await eventBadgeRepository.attachMany({
    eventCoreId: event.eventCoreId,
    mongoEventId: event._id,
    badges: createdBadges
  });

  await badgeAuditService.log({
    eventCoreId: event.eventCoreId,
    mongoEventId: event._id,
    action: 'event_badges_auto_created',
    performedBy: approvedBy,
    metadata: {
      badgeCount: createdBadges.length
    }
  });
}
```

## 15. Badge Builder Logic

```js
function buildDefaultEventBadges(event) {
  const badges = [];

  badges.push({
    badgeCode: `${event.slug}-participant`,
    name: `${event.title} Participant`,
    description: `Awarded for joining ${event.title}.`,
    badgeScope: 'event',
    badgeType: 'participant',
    requirementType: 'registration_confirmed',
    requirementValue: null,
    visibilityState: 'revealed',
    isAutoCreated: true
  });

  badges.push({
    badgeCode: `${event.slug}-finisher`,
    name: `${event.title} Finisher`,
    description: `Awarded for completing ${event.title}.`,
    badgeScope: 'event',
    badgeType: 'finisher',
    requirementType: 'result_approved',
    requirementValue: null,
    visibilityState: 'revealed',
    isAutoCreated: true
  });

  for (const distanceLabel of event.raceDistances || []) {
    badges.push({
      badgeCode: `${event.slug}-${slugify(distanceLabel)}-finisher`,
      name: `${event.title} ${distanceLabel} Finisher`,
      description: `Awarded for completing the ${distanceLabel} category of ${event.title}.`,
      badgeScope: 'event',
      badgeType: 'distance_finisher',
      requirementType: 'distance_completed',
      requirementValue: {
        raceDistance: distanceLabel
      },
      visibilityState: 'revealed',
      isAutoCreated: true
    });
  }

  const allowedModes = getAllowedParticipationModes(event);

  if (allowedModes.includes('virtual')) {
    badges.push(createModeBadge(event, 'virtual'));
  }

  if (allowedModes.includes('onsite')) {
    badges.push(createModeBadge(event, 'onsite'));
  }

  return badges;
}

function getAllowedParticipationModes(event) {
  const fromAllowed = Array.isArray(event.eventTypesAllowed) ? event.eventTypesAllowed : [];
  const modes = new Set(fromAllowed.filter((mode) => mode === 'virtual' || mode === 'onsite'));

  if (event.eventType === 'virtual') modes.add('virtual');
  if (event.eventType === 'onsite') modes.add('onsite');
  if (event.eventType === 'hybrid') {
    modes.add('virtual');
    modes.add('onsite');
  }

  return Array.from(modes);
}

function createModeBadge(event, mode) {
  return {
    badgeCode: `${event.slug}-${mode}-finisher`,
    name: `${event.title} ${capitalize(mode)} Finisher`,
    description: `Awarded for completing ${event.title} as a ${mode} participant.`,
    badgeScope: 'event',
    badgeType: 'mode_finisher',
    requirementType: 'mode_completed',
    requirementValue: {
      mode
    },
    visibilityState: 'revealed',
    isAutoCreated: true
  };
}
```

## 16. Achievement Evaluation Logic

```js
async function evaluateUserAchievements(runnerUserId, context) {
  const activeBadges = await badgeDefinitionRepository.findActiveByContext(context);

  for (const badge of activeBadges) {
    const isEligible = await checkBadgeRequirement(runnerUserId, badge, context);

    if (!isEligible) {
      continue;
    }

    const alreadyAwarded = await userBadgeRepository.exists({
      runnerUserId,
      badgeDefinitionId: badge.id,
      eventCoreId: context.eventCoreId,
      includeRevoked: false
    });

    if (alreadyAwarded && badge.isRepeatable !== true) {
      continue;
    }

    const userBadge = await userBadgeRepository.create({
      runnerUserId,
      badgeDefinitionId: badge.id,
      eventCoreId: context.eventCoreId,
      registrationId: context.registrationId,
      submissionId: context.submissionId,
      mongoUserId: context.mongoUserId,
      mongoEventId: context.mongoEventId,
      mongoRegistrationId: context.mongoRegistrationId,
      mongoSubmissionId: context.mongoSubmissionId,
      verificationStatus: 'verified',
      source: context.source || 'system_auto_award',
      awardedBy: context.awardedBy || null
    });

    await badgeAuditService.log({
      badgeDefinitionId: badge.id,
      userBadgeId: userBadge.id,
      eventCoreId: context.eventCoreId,
      runnerUserId,
      action: 'badge_awarded',
      performedBy: context.awardedBy || null,
      metadata: context
    });

    await badgeNotificationService.notifyBadgeEarned(context.mongoUserId, userBadge);
  }
}
```

## 17. Badge Requirement Checker

```js
async function checkBadgeRequirement(runnerUserId, badge, context) {
  switch (badge.requirement_type) {
    case 'registration_confirmed':
      return context.registrationStatus === 'confirmed';

    case 'payment_confirmed':
      return context.paymentStatus === 'paid';

    case 'result_approved':
      return context.submissionStatus === 'approved' || context.resultStatus === 'verified';

    case 'distance_completed': {
      const requiredDistance = badge.requirement_value?.raceDistance;
      return context.raceDistance === requiredDistance &&
        (context.submissionStatus === 'approved' || context.resultStatus === 'verified');
    }

    case 'mode_completed':
      return context.participationMode === badge.requirement_value?.mode &&
        (context.submissionStatus === 'approved' || context.resultStatus === 'verified');

    default:
      return false;
  }
}
```

Deferred requirement types:

```text
rank_achieved
accumulated_distance
challenge_progress
organiser_activity
```

## 18. Trigger Points

Call `achievementService.evaluateUserAchievements()` after these actions.

During the current hybrid period, trigger from the existing MongoDB workflow and resolve Supabase IDs through the bridge tables before writing badge rows.

### 18.1 Registration Confirmed

Trigger:

```text
registration.status changes to confirmed
```

Context:

```js
{
  eventCoreId,
  registrationId,
  registrationStatus: 'confirmed',
  paymentStatus,
  participationMode,
  raceDistance,
  mongoUserId,
  mongoEventId,
  mongoRegistrationId,
  source: 'system_auto_award'
}
```

### 18.2 Payment Paid

Trigger:

```text
Registration.paymentStatus changes to paid
```

Use this if participant badge depends on paid status.

### 18.3 Submission Approved

Trigger:

```text
submission.status changes to approved
```

Context:

```js
{
  eventCoreId,
  registrationId,
  submissionId,
  submissionStatus: 'approved',
  distanceKm,
  raceDistance,
  finishTime,
  participationMode,
  mongoUserId,
  mongoEventId,
  mongoRegistrationId,
  mongoSubmissionId,
  source: 'system_auto_award'
}
```

### 18.4 Result Import Finalised

Implemented for approved onsite results and timing-system result imports.

Trigger:

```text
onsite results imported and finalised
```

Context:

```js
{
  eventCoreId,
  mongoEventId,
  registrationId,
  resultStatus: 'verified',
  distanceKm,
  finishTime,
  rank,
  rankingsStatus,
  source: 'result_import'
}
```

### 18.5 Rankings Finalised

Implemented for top-rank leaderboard badges.

Trigger:

```text
rankings.published_at becomes non-null
```

Evaluate leaderboard badges.

## 19. API Routes

Adjust route names based on existing HelloRun conventions.

### 19.1 Public Routes

Event badge JSON and earned badge verification/share pages are implemented.

```text
GET /badges/:userBadgeId
GET /badges/:userBadgeId/verify
GET /events/:eventSlug/badges
```

Public runner badge collection pages are implemented at:

```text
GET /runners/:userId/badges
```

### 19.2 Runner Routes

```text
GET /runner/dashboard/badges
GET /runner/profile/badges
POST /runner/profile/badges/featured
```

### 19.3 Organiser Routes

```text
GET /organizer/events/:eventId/badges
POST /organizer/events/:eventId/badges/:badgeId
```

Deferred:

```text
POST /organizer/events/:eventId/badges/:badgeId/preview
```

### 19.4 Admin Routes

```text
GET /admin/badges
POST /admin/user-badges/:userBadgeId/revoke
```

Deferred:

```text
POST /admin/badges
PATCH /admin/badges/:badgeId
POST /admin/events/:eventId/badges/generate
POST /admin/badges/:badgeId/disable
POST /admin/badges/recalculate
GET /admin/badges/audit-logs
```

## 20. UI Requirements

### 20.1 Event Page

Add a section:

```text
Badges You Can Earn
```

Display:

- Badge image
- Badge name
- Short description
- Requirement label

Example:

```text
Baguio Fun Run 5K Finisher
Complete the 5K category with an approved result.
```

### 20.2 Runner Dashboard

Add a badge widget:

```text
Recent Badges
```

Current implementation provides runner dashboard badge data and UI at:

```text
GET /runner/dashboard/badges
```

Add progress cards:

Implemented for challenge badge progress.

```text
100K Club
72.4K / 100K completed
```

```text
2026K Challenge
184.6K / 2026K completed
```

### 20.3 Runner Profile

Add badge sections:

```text
Featured Badge
Recent Badges
Event Badges
Distance Badges
Challenge Badges
Leaderboard Badges
```

Challenge and leaderboard sections are deferred until Phase 2 and Phase 3.

### 20.4 Organiser Event Badge Manager

Add page:

```text
/organizer/events/:eventId/badges/manage
```

Current implementation provides the organiser event badge manager UI plus JSON read/update routes for event-owned badge display fields. The organiser dashboard also shows earned organiser-scope badges at `/organizer/dashboard`.

Fields:

- Badge title
- Badge description
- Badge image
- Visibility toggle
- Active toggle
- Preview card

### 20.5 Admin Badge Manager

Add page:

```text
/admin/badges
```

Current implementation provides the admin badge management UI plus JSON list and revoke routes.

Admin should see:

- Badge definitions
- Event badge count
- Earned count
- Active status
- Auto-created flag
- Requirement type
- Audit log link

## 21. Notification Requirements

### 21.1 In-App Notification

Create notification when badge is earned.

Example:

```text
You earned the Baguio Fun Run 5K Finisher badge.
```

Payload example:

```js
{
  type: 'badge_earned',
  userId,
  title: 'Badge earned',
  message: 'You earned the Baguio Fun Run 5K Finisher badge.',
  metadata: {
    badgeDefinitionId,
    userBadgeId,
    eventCoreId,
    mongoEventId
  }
}
```

### 21.2 Email Notification

Implemented as opt-in decision logic.

The default setting stays disabled:

```text
badge.earned.emailEnabled = false
badge_definitions.email_notification_level = none | major | all
```

## 22. Badge Revocation

Admins should be able to revoke a badge.

Use cases:

- Fraudulent submission
- Incorrect imported result
- Duplicate account issue
- Admin correction

Revocation should not delete the row.

Update:

```text
user_badges.verification_status = revoked
user_badges.revoke_reason = reason
```

Create audit log:

```text
badge_revoked
```

## 23. Security and Access Control

### Runner

Can read own badge progress after Phase 2 progress tracking is implemented.

Can read public earned badge verification pages for verified, non-revoked badge awards.

Can update own featured badge only if badge is already earned.

### Organiser

Can read and customise badges only for their own events.

Can only edit display fields unless admin grants more permissions.

### Admin

Can manage all badge definitions and badge awards.

### System

Only server-side services should award badges.

Do not allow client-side badge awarding.

## 24. Validation Rules

- Badge code must be unique.
- Badge code should be slug-safe.
- Badge requirement type must be valid.
- Event badges must belong to existing published events.
- Awarded badge must reference an active badge definition.
- Runner must not receive duplicate non-repeatable badges.
- Revoked badges must remain in audit history.
- Organiser badge image uploads should use allowed image types only.
- Uploaded badge images should be converted to WebP if the existing media pipeline supports it.

## 25. Testing Requirements

Current Phase 1 coverage:

- `tests/achievement-badges.service.test.js`
- `tests/achievement-badges.integration.test.js`
- `tests/achievement-badges-routes.test.js`
- Badge-adjacent regression coverage in event shadow, registration shadow, submission shadow, and organiser payment review tests.

### 25.1 Unit Tests

Test:

- Default badge builder
- Badge requirement checker
- Duplicate award prevention
- Badge revocation

### 25.2 Integration Tests

Test:

- Event publish-by-admin approval creates badges.
- Draft event does not create badges.
- Deleted, archived, closed, personal record, and badge-disabled events do not create public badges.
- Confirmed registration awards participant badge.
- Approved submission awards finisher badge.
- Approved submission awards correct distance badge.
- Revoked badge does not show as earned.

### 25.3 UI Tests

Test:

- Event page displays available badges.
- Runner dashboard displays earned badges.
- Runner profile displays badge collection.
- Organiser can edit badge display content.
- Admin can disable badge definition.

## 26. Acceptance Criteria

Phase 1 core event badges are ready when:

- Events published by admin approval automatically create default event badges when `digitalBadgeEnabled` is true.
- Draft, pending review, closed, archived, deleted, personal record, and badge-disabled events do not create public badges.
- Event badges appear on published event pages.
- Runners can see badges they can earn before joining.
- Confirmed runners receive participant badges.
- Runners receive finisher badges only after verified completion.
- Distance badges match the runner’s selected distance category.
- Duplicate badge awards are prevented.
- Badge awards create audit logs.
- Badge revocation is supported without deleting history.
- Runner profiles display earned badges.
- Admins can view, filter, disable, and enable badge definitions and revoke earned badges through server-side routes.
- Organisers can customise badge display fields through owner-scoped server-side routes and a dedicated badge manager UI, but cannot manipulate earned badge history.

Remaining acceptance criteria for later phases:

- AI-generated badge artwork, if HelloRun wants custom visual assets beyond template rendering.

## 27. Suggested Implementation Phases

### Phase 1: Core Event Badges

Build:

- PostgreSQL tables
- MongoDB badge content collection
- Default event badge generation when admin approval publishes an event
- Event badge display on event page
- Participant badge awarding
- Finisher badge awarding
- Distance finisher badge awarding
- Virtual and onsite finisher badge awarding
- Runner profile badge display
- In-app notification
- Audit logging
- Badge revocation

Do not build in Phase 1:

- Challenge progress badges
- Global distance milestone badges
- Leaderboard badges
- Organiser achievement badges
- Shareable verification pages
- Badge email notifications

### Phase 2: Challenge Progress Badges

Build:

- Badge progress table
- Progress calculation service
- 25%, 50%, 75%, 100% challenge badges
- Dashboard progress cards
- Accumulated distance milestone badges
- Global runner distance milestone badges

### Phase 3: Leaderboard and Organiser Badges

Build:

- Top finisher badges
- Category winner badges
- Organiser achievement badges
- Organiser badge statistics
- Use `rankings.published_at IS NOT NULL` and `rank_position` for leaderboard badge awards

### Phase 4: Shareable and Verifiable Badges

Build:

- Public badge pages
- Badge verification page
- Social share preview image
- Open Badges-ready metadata

## 28. Environment Variables

The MVP may not require new environment variables.

If badge image uploads use existing Cloudflare R2, reuse the existing storage configuration.

Optional future variables:

```text
BADGE_EMAIL_NOTIFICATIONS_ENABLED=false
BADGE_PUBLIC_SHARE_ENABLED=true
BADGE_IMAGE_UPLOAD_MAX_MB=2
```

## 29. Codex Implementation Checklist

Use this checklist for implementation.

```text
[x] Create PostgreSQL migration for badge_definitions
[x] Create PostgreSQL migration for event_badges
[x] Create PostgreSQL migration for user_badges
[x] Create PostgreSQL migration for badge_audit_logs
[x] Create MongoDB badge_content model
[x] Create MongoDB badge_templates model
[x] Create badgeTemplateService
[x] Create badgeDefinitionService
[x] Create eventBadgeService
[x] Create achievementService
[x] Create badgeAuditService
[x] Create badgeNotificationService
[x] Add event publish-by-admin approval trigger for badge generation
[x] Add registration confirmed trigger for participant badges
[x] Add submission approved trigger for finisher badges
[x] Add paid-registration trigger if participant badges require payment
[x] Add runner dashboard badges route
[x] Add runner profile badges route
[x] Add organiser event badge manager route
[x] Add admin badge manager route
[x] Add badge revocation route
[x] Add event page badge UI
[x] Add runner dashboard badge widget
[x] Add runner profile badge collection
[x] Add organiser badge customisation UI
[x] Add admin badge management UI
[x] Add unit tests
[x] Add integration tests
[x] Add UI tests if applicable
[x] Update docs/PRD.md with feature summary
[x] Add this file to docs/achievement_badges.md

Deferred checklist:

[x] Create PostgreSQL migration for badge_progress
[x] Create badgeProgressService
[x] Add challenge progress badge generation and accumulated-activity approval trigger
[x] Add runner challenge progress UI
[x] Add global runner distance milestone badges
[x] Add result import finalised trigger for onsite imported badges
[x] Add public badge verification routes
[x] Add public runner badge collection pages
[x] Add social share preview images
[x] Add Open Badges-ready hosted metadata
[x] Add badge email notification decision logic
[x] Add badge email rollout admin controls and reviewed earned-badge email template
[x] Add ranking published trigger for leaderboard badges
[x] Add leaderboard distance and mode winner badge variants
[x] Add organiser achievement badges
[x] Add organiser published-event and confirmed-registration badge variants
[x] Add organiser dashboard badge widget
[x] Add admin badge scope filtering and audit shortcuts
[x] Add admin badge definition disable and enable controls
[x] Add read-only admin badge analytics
[x] Add admin badge recalculation controls
[x] Run broad badge release-readiness regression sweep
[x] Add release handoff notes for migration order, environment toggles, admin rollout, and smoke checks
```

## 30. Reference Notes

These references are design guides only. Do not copy their implementation directly.

- Strava Trophy Case shows completed challenge badges and supports profile-based badge display.
- Google Play Games achievements use states such as hidden, revealed, and unlocked.
- Google Play Games also supports incremental achievement progress.
- Open Badges defines verifiable badge metadata including achievement, issuer, criteria, evidence, and verification.
- Garmin Connect uses badges, points, and levels, which may be useful for a future HelloRun runner level system.

## 31. Release Handoff Summary

Before rollout:

- Run Supabase migrations in filename order with `npm run supabase:migrate`.
- Confirm badge migrations `009`, `012`, `013`, and `014` are applied.
- Confirm `DATABASE_URL`, `MONGODB_URI`, and `APP_URL` are configured.
- Keep `badge.earned` email disabled in `/admin/communications` until the email channel is intentionally enabled.

Admin smoke:

- Verify `/admin/badges` loads definitions, awards, analytics, audit logs, disable/enable controls, email-level controls, and recalculation.
- Publish one badge-enabled event and confirm event badges are generated.
- Award one registration badge, one result badge, one leaderboard badge, and one organiser badge.
- Open public badge verification, Open Badges JSON, share image SVG, runner collection, and featured badge update.

Validation:

- Latest split release-readiness sweep passed 101/101 tests across badge, ranking, communication, onsite operations, submission, shadow sync, shop read/payment-review, and validation middleware coverage.

## 32. Final Recommendation

Implement the feature as:

```text
Verified Achievement Badges
```

Core system behaviour:

```text
Auto-create badges when admin approval publishes an event.
Show badges on published event pages.
Allow organiser customisation before publishing.
Award Phase 1 badges only after confirmed registration, paid registration when required, or verified completion.
Track all badge actions in audit logs.
```

This gives HelloRun a credible achievement layer that supports runner motivation and organiser event promotion while leaving AI-generated badge artwork as a future enhancement rather than part of the core award path.

