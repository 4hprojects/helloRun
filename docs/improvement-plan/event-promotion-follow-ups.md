# Event Promotion Follow-Up Plan

## Document Role

- **Purpose:** Current-state analysis for the organiser/admin event promotion email feature before refinement work.
- **Date:** Jul 3, 2026
- **Status:** Active follow-up list. The core feature and July 5 queue-delivery
  fix are implemented; only the residual risks below remain open.
- **Priority owner:** `COM-01` in [ROADMAP.md](../ROADMAP.md)
- **Delivery state:** [STATUS.md](../STATUS.md)
- **Primary feature paths:** `/organizer/promote` and `/admin/promote`

## Repository Update — October 20, 2026

The residual repository work is implemented and `COM-01` is verification
pending:

- promotion emails carry a signed, 30-day unsubscribe link for known users, so
  opting out no longer requires an existing login session; invalid or expired
  links fail closed;
- email subjects strip line breaks, HTML values are escaped, and event/poster
  URLs accept only HTTP(S), resolving site-relative poster paths against the
  configured application URL;
- admin preview and send are capped to the current platform quota, while the
  organiser quota remains enforced before campaign creation;
- manual campaigns receive a unique same-day fingerprint derived from event,
  audience, and normalized recipients, preventing concurrent or repeated
  duplicate creation; and
- confirmation copy uses the actual preview count. Four isolated route
  scenarios plus 25 focused tests cover access, ownership, opt-outs, quotas,
  duplicate rejection, signed unsubscribe, escaping, and outcome behavior.

The existing audience meanings were not expanded or reinterpreted. Geographic
or interest segmentation remains a future product decision, not an implicit
recipient change. A supervised provider send remains required before closing
`COM-01`; see ROADMAP for that acceptance gate.

---

## Executive Summary

The event promotion feature is repository-complete and the main send pipeline is wired. Organisers and admins can open promotion pages, preview recipient counts, submit campaigns, create `EventPromotion` records, and enqueue `event.promotion` emails through the shared communication system.

The feature has now had its highest-priority refinements applied: signed
email-context unsubscribe, visible preferences, opt-out-aware shared recipient
resolution, quota-capped preview/send behavior, campaign outcome counts,
selected pasted-email mode, atomic duplicate prevention, hardened email values,
and route-level integration coverage. Remaining work is deployed verification
and optional future segmentation/provider reconciliation.

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
- Send to `previous_participants`, `non_participants`, `all_runners`, or `selected_emails`.
- Paste selected recipient emails for admin-directed campaigns.
- View platform daily email usage from `DailyEmailUsage`.
- View recent campaigns across organisers.

Admin send behavior:

- Creates an `EventPromotion` with `status: sending`.
- Dispatches event promotion emails through the reliable communication path and records campaign outcome counts.
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
- Daily cap: 25 selected recipients/day, tracked from `EventPromotion.recipientCount`.
- Non-participant audience is capped to 200 candidates before daily quota slicing.
- View recent own campaigns.

Organiser send behavior:

- Resolves recipients from organiser event participation.
- Slices recipients by daily quota remaining.
- Creates an `EventPromotion` with `status: sending`.
- Dispatches event promotion emails through the reliable communication path and records campaign outcome counts.
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

For known HelloRun users, the promotion email footer links to a signed token:

```text
/unsubscribe?token=SIGNED_TOKEN
```

The route adds `event.promotion` to the signed user's preferences without a
login. The legacy keyed URL remains an authenticated fallback for manual email
addresses with no user record.

Remaining risk: low. Signed links work without login for known users; manually
entered addresses without a HelloRun user ID retain the authenticated fallback.

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

Preview endpoints use the same opt-out-aware recipient resolver as send
endpoints. Admin preview and send also slice to current platform quota;
organiser preview and send slice to the organiser daily quota. Downstream
provider failures can still differ from the preview.

Effects:

- Preview may still overstate provider delivery when a concurrent campaign
  consumes quota or the provider rejects a message after selection.
- Campaign `recipientCount` may count selected/enqueued users, not delivered emails.
- UI text says "eligible runners"; after the first refinement pass this means eligible after `event.promotion` opt-out filtering.

Risk: low-medium. Selected and provider-delivered counts remain deliberately
separate and campaign history records the dispatch outcome.

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

Since October 3, 2026, the dispatcher also writes progress per recipient (`processedCount`, live counters, `lastProgressAt` and a `deliveries` list capped at 1,000 entries), and `/admin/promote` shows it in the Live Send Status card through `GET /admin/promote/live`. Sends still run inside the web process. If the process restarts mid-campaign, the campaign stays `sending` and is shown as **stalled** after two minutes without progress; nothing resumes or finalises it automatically.

### 5. Admin Platform Quota Is Enforced

The admin page displays `DailyEmailUsage`; both preview and send pre-slice the
recipient list to the current remaining quota, while the shared communication
budget remains a second enforcement layer.

Effects:

- A concurrent campaign can consume quota after preview.
- Provider or policy failures can still reduce the sent count.
- Campaign history retains selected and outcome counts separately.

Risk: low. The deployed provider smoke must still confirm account-side quota
behavior.

### 6. Route-Level Tests

Direct isolated route tests now cover:

- Admin promotion page render.
- Admin selected-email preview, send, quota capping, and duplicate rejection.
- Organiser previous-participant preview, ownership, and quota-aware send.
- Opt-out exclusion for `event.promotion`.
- Signed unsubscribe success and tamper rejection.

Risk: low. A deployed provider smoke remains because repository tests do not
prove inbox delivery or account-side provider behavior.

### 7. Email Template Escaping

The template now escapes displayed values and URLs, rejects non-HTTP(S) media
and event URLs, resolves safe relative poster paths, and strips subject line
breaks before the provider payload is built.

Risk: low; deployed rendering remains part of the provider smoke.

### 8. Audience Semantics Need Product Confirmation

Current audience meanings:

- `previous_participants`: runners registered for any event by the organiser.
- `non_participants`: platform runners not registered for any event by the organiser.
- `all_runners`: all platform runners, admin only.

Potential issue: "previous participants" may include users already registered for the event being promoted. "Non-participants" may include runners who are not relevant to the organiser or location. There is no segmentation by country, event type, distance, registration status, or prior opt-in.

Risk: product/UX. The current broad audience model is simple but can feel spammy.

### 9. Duplicate Campaign Prevention

Manual campaigns now use an atomic unique fingerprint for the UTC date, event,
audience, and normalized recipient set. A repeated or concurrent identical
campaign is rejected with an explicit message. Existing route and provider
limits remain layered controls.

- Organiser daily cap.
- Admin hourly route limiter.
- Platform email budget.

Risk: low. A materially different recipient set is intentionally a distinct
campaign; broader cooldown policy remains a product decision.

---

## Supporting Refinement Plan

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
- Admin audiences are capped by remaining platform quota before submit.
- Should promotions support geographic or event-type targeting before broad rollout?
- Campaigns require preview and exact-count confirmation.
- Campaign history currently shows dispatch metrics; provider-event
  reconciliation is a future option.
- Known users receive a signed email-context unsubscribe link; unknown manual
  addresses use the authenticated fallback.

---

## Current Verdict

The feature is repository-complete and awaits a supervised deployed provider
send. Remaining future refinements are:

1. Confirm the signed unsubscribe and quota-capped send in the deployed email
   provider path.
2. Decide whether current audience definitions should gain geographic or
   interest segmentation.
3. Consider provider webhook reconciliation for bounces or delayed delivery
   failures.
