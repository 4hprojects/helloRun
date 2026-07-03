# Event Promotion Feature Analysis

## Document Role

- **Purpose:** Current-state analysis for the organiser/admin event promotion email feature before refinement work.
- **Date:** Jul 3, 2026
- **Status:** Analysis updated after first refinement pass.
- **Primary feature paths:** `/organizer/promote` and `/admin/promote`

---

## Executive Summary

The event promotion feature is partially implemented and the main send pipeline is wired. Organisers and admins can open promotion pages, preview recipient counts, submit campaigns, create `EventPromotion` records, and enqueue `event.promotion` emails through the shared communication system.

The feature has now had its highest-priority refinements applied: the email footer unsubscribe path is backed by a route, runner notification settings expose `event.promotion`, admin/organiser preview + send recipient resolution excludes users who opted out of event promotion emails, and campaign history stores outcome counts for sent/skipped/suppressed/failed/queued sends. Remaining refinement work is mostly broader safety controls, signed one-click unsubscribe, and route-level integration coverage.

---

## Current Implementation

### Data Model

`src/models/EventPromotion.js` stores one campaign row per send attempt:

- `organizerId`
- `eventId`
- `audience`
- `recipientCount`
- `dateKey`
- `status`
- `adminTriggered`
- `sentAt`
- timestamps

Indexes exist for organiser/date and event/date. The model is used for organiser daily quota calculation and recent campaign history.

### Communication Event

`event.promotion` is registered in `src/services/communication-events.registry.js`:

- Category: `organiser`
- Priority: `low`
- Email enabled by default
- In-app disabled by default
- Recipient role: `runner`

`src/services/communication.service.js` dispatches `event.promotion` to `sendEventPromotionEmail()` in `src/services/email.service.js`.

### Email Template

`sendEventPromotionEmail(to, firstName, eventTitle, posterUrl, eventUrl, organiserName)` builds a branded HTML email with:

- HelloRun header
- Event title
- Optional poster image
- Register Now CTA
- Plain event URL fallback
- Attribution footer
- Unsubscribe link to `/unsubscribe?key=event.promotion`

The unsubscribe URL is now backed by a logged-in route that adds `event.promotion` to the user's email opt-out preferences.

### Admin Routes

Routes in `src/routes/admin.routes.js`:

- `GET /admin/promote`
- `GET /admin/promote/preview`
- `POST /admin/promote`

Access model:

- GET and preview require `requireAdmin`.
- POST requires `requireAdmin`, `requireFullAdmin`, and `adminPromotionLimiter`.
- Global admin CSRF middleware protects mutating admin routes.

Admin capabilities:

- Select any non-deleted, non-archived event.
- Send to `previous_participants`, `non_participants`, or `all_runners`.
- View platform daily email usage from `DailyEmailUsage`.
- View recent campaigns across organisers.

Admin send behavior:

- Creates an `EventPromotion` with `status: sending`.
- Enqueues background notifications through `notifyWithRetryInBackground('event.promotion')`.
- Marks campaign `completed` after enqueue attempts settle.
- Stores `recipientCount` as the number of selected recipient records, not confirmed email deliveries.

### Organiser Routes

Routes in `src/routes/organiser/event-management.js` mounted under `/organizer`:

- `GET /organizer/promote`
- `GET /organizer/promote/preview`
- `POST /organizer/promote`

Access model:

- Requires approved organiser access.
- POST also applies CSRF protection.

Organiser capabilities:

- Select own non-deleted, non-archived events.
- Send to `previous_participants` or `non_participants`.
- Daily cap: 20 selected recipients/day, tracked from `EventPromotion.recipientCount`.
- Non-participant audience is capped to 200 candidates before daily quota slicing.
- View recent own campaigns.

Organiser send behavior:

- Resolves recipients from organiser event participation.
- Slices recipients by daily quota remaining.
- Creates an `EventPromotion` with `status: sending`.
- Enqueues emails through `notifyWithRetryInBackground('event.promotion')`.
- Marks campaign `completed` after enqueue attempts settle.

### Dashboard Discoverability

The admin dashboard now links to `/admin/promote` from:

- Tools metric section.
- Admin Shortcuts grid.

This only improves discoverability. It does not change promotion send behavior.

---

## What Appears To Work

- Route wiring exists for admin and organiser promotion pages.
- Admin POST route is restricted to full admins.
- The shared admin route source test confirms `/admin/promote` uses the dedicated promotion limiter.
- The communication service knows about `event.promotion`.
- The email template function exists and calls Resend.
- Email budget gating and communication logs are handled by the shared communication service.
- User-level opt-out suppression is implemented in `communication.service.js` when `recipientUserId` is provided and the user's `notificationPreferences.emailOptOut` contains `event.promotion`.
- Background retry enqueueing exists through `notifyWithRetryInBackground`.

Validation already run during this analysis:

- `npm test -- tests/admin-route-source.unit.test.js`
- `npm test -- tests/communication.service.integration.test.js`

---

## Gaps And Risks

### 1. Unsubscribe Link Is Backed By A Route

The promotion email footer links to:

```text
/unsubscribe?key=event.promotion
```

This route now exists and adds `event.promotion` to `notificationPreferences.emailOptOut` for the logged-in user.

Remaining risk: medium. The route requires login via `requireAuth`; a one-click signed unsubscribe link would be better for email usability.

### 2. Runner Profile Exposes Event Promotion Opt-Out

Runner notification settings currently allow these keys:

- `result.approved`
- `result.rejected`
- `certificate.issued`
- `badge.earned`
- `organiser.payment_reminder`
- `event.promotion`

Risk: low. The preference is now visible in the runner profile UI and accepted by the profile notification settings controller.

### 3. Preview Counts Now Exclude Event Promotion Opt-Outs

Preview endpoints now use the same opt-out-aware recipient resolver as send endpoints. Suppression for global email settings, budget stops, and downstream delivery failures still occurs later in the communication system.

Effects:

- Admin/organiser preview may still overstate actual provider sends when global budget or delivery errors intervene.
- Campaign `recipientCount` may count selected/enqueued users, not delivered emails.
- UI text says "eligible runners"; after the first refinement pass this means eligible after `event.promotion` opt-out filtering.

Risk: medium. This can still confuse admins and organisers when email budget or delivery outcomes differ from selected recipients.

### 4. Campaign Status Reflects Dispatch Outcomes

Admin and organiser sends now use the reliable communication path directly and store outcome counts on `EventPromotion`.

Tracked fields:

- `selectedCount`
- `sentCount`
- `skippedCount`
- `suppressedCount`
- `failedCount`
- `queuedCount`

Remaining risk: medium-low. Counts represent communication-service outcomes at send time. Provider-level bounces or delayed delivery events are still not reconciled back into campaign history.

### 5. Admin Platform Quota Display Is Advisory Only

The admin page displays `DailyEmailUsage`, and shared communication budget gating can skip emails when limits are reached. However, admin send does not pre-slice the recipient list by remaining platform quota.

Effects:

- Admin may submit a campaign larger than remaining quota.
- Some recipients may be skipped by communication budget rules.
- Campaign history can show the full selected count rather than the sent count.

Risk: medium. The shared budget protects the provider limit, but the UI can misrepresent outcome.

### 6. Missing Route-Level Tests

No direct tests were found for:

- Admin promotion page render.
- Admin preview recipient resolution.
- Admin send campaign creation.
- Organiser promotion page render.
- Organiser preview quota capping.
- Organiser send quota enforcement.
- Opt-out exclusion for `event.promotion`.
- Broken or missing unsubscribe behavior.

Risk: medium. The shared pieces are tested, but feature-level behavior is not locked.

### 7. Email Template Escaping Is Incomplete

The template escapes displayed `eventTitle`, `firstName`, and `organiserName`, but raw values are still used in some places:

- Subject uses `eventTitle` directly.
- `posterUrl` is interpolated into an image `src`.
- `eventUrl` is interpolated into link `href` and link text.
- `APP_URL` is interpolated into footer links.

Risk: low-medium if event URLs and media URLs are trusted server-side values. Still worth hardening as part of refinement.

### 8. Audience Semantics Need Product Confirmation

Current audience meanings:

- `previous_participants`: runners registered for any event by the organiser.
- `non_participants`: platform runners not registered for any event by the organiser.
- `all_runners`: all platform runners, admin only.

Potential issue: "previous participants" may include users already registered for the event being promoted. "Non-participants" may include runners who are not relevant to the organiser or location. There is no segmentation by country, event type, distance, registration status, or prior opt-in.

Risk: product/UX. The current broad audience model is simple but can feel spammy.

### 9. Duplicate Campaign Prevention Is Missing

There is no cooldown or dedupe check for repeated sends to the same audience/event beyond:

- Organiser daily cap.
- Admin hourly route limiter.
- Platform email budget.

Risk: medium. Admins can repeatedly send campaigns to the same recipients, and organisers can re-send until daily quota is consumed.

---

## Recommended Refinement Plan

### Phase 1: Consent And Unsubscribe Correctness

- Add `event.promotion` to runner notification settings allowed keys and profile UI.
- Add a working unsubscribe route for email footer links.
- Ensure unsubscribe can work from email context without requiring the user to manually find profile settings.
- Update UI copy so "eligible" means "eligible after opt-out filtering" if preview is refined in the same phase.

Acceptance criteria:

- Runner profile shows an "Event promotions" email preference.
- Saving notification preferences can opt out of `event.promotion`.
- `/unsubscribe?key=event.promotion` no longer 404s.
- A user opted out of `event.promotion` is excluded or suppressed consistently.

### Phase 2: Recipient Resolution Accuracy

- Centralize recipient resolution for admin and organiser flows in a promotion service.
- Include opt-out filtering in preview and send recipient lists.
- Decide whether preview should also account for platform budget remaining.
- Rename counts if needed:
  - `matchedCount`
  - `eligibleCount`
  - `selectedCount`
  - `sentCount`
  - `suppressedCount`

Acceptance criteria:

- Preview count matches the number of users the campaign will attempt to send to after opt-out filtering.
- Campaign history distinguishes selected recipients from actual communication results or uses honest labels.

### Phase 3: Campaign Outcome Tracking

- Extend `EventPromotion` with outcome fields, or store a campaign summary derived from `CommunicationLog`.
- Track at minimum:
  - selected
  - sent/enqueued
  - skipped
  - suppressed
  - failed/queued-for-retry
- Update status labels to distinguish `queued`, `completed`, `partial`, and `failed` if reliable data is available.

Acceptance criteria:

- Admin and organiser campaign history does not imply successful delivery when emails were skipped or suppressed.
- Failed or queued communication attempts are visible enough for admin follow-up.

### Phase 4: Safety Controls

- Add duplicate-send guardrails:
  - Event/audience cooldown.
  - Confirmation copy showing recipient count.
  - Optional "send test to myself" before bulk send.
- Consider admin cap alignment with platform budget or require explicit override.
- Consider limiting organiser promotion to published/upcoming events only.

Acceptance criteria:

- Repeated accidental sends are harder.
- Admins and organisers have clearer confirmation before sending bulk promotional email.

### Phase 5: Test Coverage

Add feature-level tests for:

- Admin route access and full-admin POST requirement.
- Admin preview for all three audience types.
- Admin send creates campaign and dispatches `event.promotion`.
- Organiser ownership restrictions.
- Organiser daily quota cap.
- Opt-out filtering for `event.promotion`.
- Unsubscribe route behavior.
- Campaign status/count behavior.

Acceptance criteria:

- Promotion route behavior is covered by integration or focused source/unit tests.
- Tests fail if `event.promotion` is removed from notification settings or unsubscribe support regresses.

---

## Suggested Refined Target Behavior

The refined feature should behave like this:

1. Admin or organiser selects an event and audience.
2. Preview returns matched, opted-out, eligible, and quota-capped counts.
3. UI shows a confirmation that clearly states how many emails will be attempted.
4. Send creates a campaign with `status: queued` or `sending`.
5. Dispatch uses the shared communication service and stores per-campaign metadata in communication logs.
6. Campaign summary reflects actual outcomes or clearly says "queued/attempted".
7. Recipients can opt out from runner profile and from the email unsubscribe link.
8. Future sends exclude opted-out recipients before preview and send.

---

## Files To Review During Refinement

Core implementation:

- `src/models/EventPromotion.js`
- `src/routes/organiser/event-management.js`
- `src/controllers/admin/events.controller.js`
- `src/routes/admin.routes.js`
- `src/views/organizer/event-promote.ejs`
- `src/views/admin/promote.ejs`
- `src/services/email.service.js`
- `src/services/communication.service.js`
- `src/services/communication-events.registry.js`

Preference and unsubscribe work:

- `src/controllers/runner.controller.js`
- `src/views/runner/profile.ejs`
- `src/models/User.js`
- Public/auth route files for adding unsubscribe handling

Tests to add or expand:

- `tests/admin-route-source.unit.test.js`
- `tests/admin-permission-tier-source.unit.test.js`
- New promotion route/service tests
- `tests/communication.service.integration.test.js`

---

## Open Product Decisions

- Should organisers only promote published/upcoming events?
- Should "previous participants" exclude users already registered for the promoted event?
- Should admin "all runners" be capped by remaining platform quota before submit?
- Should promotions support geographic or event-type targeting before broad rollout?
- Should campaigns require a preview/confirmation step with exact audience counts?
- Should campaign history show delivery metrics or only dispatch metrics?
- Should unsubscribe require login, or should email links include a signed token for one-click unsubscribe?

---

## Current Verdict

The feature is operational at the route and dispatch level, but it is not fully refined. The highest-priority fixes before broader use are:

1. Add route-level tests for admin and organiser promotion flows.
2. Consider signed one-click unsubscribe links that do not require login.
3. Add duplicate-send guardrails and stronger confirmation UX.
4. Consider provider webhook reconciliation for bounces or delayed delivery failures.
