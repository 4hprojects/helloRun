# Standalone Submission Review Page

## Document Role

This document defines the dedicated organizer/admin page for reviewing submitted run result or activity proof in HelloRun.

The page replaces pending approve/reject controls that were previously embedded in the event registrants table, while keeping the registrants table available for participant scanning, filters, export, and read-only review status.

## Feature Name

Standalone Submission Review Page

## Current Status

Status: implemented.

Primary route:

- `GET /organizer/events/:eventId/submissions/:submissionId/review`

Review action routes:

- `POST /organizer/events/:eventId/submissions/:submissionId/approve`
- `POST /organizer/events/:eventId/submissions/:submissionId/reject`

The route is shared by approved organizers and admins:

- Approved organizers can review submissions for events they own.
- Admins can review submissions across all events.
- Runners and non-owner organizers cannot access the page.

## Supported Submission Types

The standalone page supports both current activity-proof models:

- Standard `Submission` records for single-run results.
- `AccumulatedActivitySubmission` records for accumulated-distance challenge activities.

For accumulated-distance activities, the page also shows current progress toward the runner's selected registration target and activity counts by review status.

## Page Content

The review page shows:

- Event title and review status.
- Participant name, email, mobile, country, and gender.
- Registration confirmation code, race distance, participation mode, registration status, and payment status.
- Activity metrics: distance, elapsed time, run date, run location, run type, elevation, and steps.
- Evidence details: proof type, source, uploaded proof link, and proof notes.
- OCR review signals when available, including confidence, extracted values, mismatches, location/date checks, and name-match status.
- Suspicious activity flags and reasons.
- Strava snapshot and external Strava activity link when available.
- Review history after approval or rejection, including reviewed-at, reviewer, notes, and rejection reason.

## Workflow

Pending submissions render action forms on the standalone page:

- Approve with optional review notes.
- Reject with a required rejection reason and optional review notes.

Reviewed submissions render a read-only review summary and do not show approve/reject forms.

After approval or rejection, the reviewer is redirected back to the same standalone review page with a success or error message.

## Navigation

Current entry points:

- Admin review queue result rows link directly to the standalone review page.
- Organizer dashboard "Open Next Pending Result" links to the next pending review detail when available.
- Event registrants table shows a single `Open Review` action for pending run results instead of inline approve/reject forms.
- Reviewed rows in the registrants table continue to show read-only review status, reviewer, notes, and rejection reason.

The existing admin cross-event queue remains:

- `GET /admin/reviews?type=results`

## Implementation Notes

No database schema changes were required.

The feature reuses existing review services:

- `reviewSubmission`
- `reviewAccumulatedActivitySubmission`

Those services remain responsible for review status transitions, validation, notifications, certificate issuance, critical audit logging, badge progress, and accumulated challenge progress.

Primary implementation files:

- `src/routes/organizer.routes.js`
- `src/views/organizer/submission-review.ejs`
- `src/views/organizer/event-registrants.ejs`
- `src/controllers/admin.controller.js`

## Test Coverage

Focused coverage exists in:

- `tests/submission-review-route-guards.test.js`
- `tests/admin-dashboard.test.js`
- `tests/organizer-dashboard-analytics.test.js`

Verified scenarios:

- Unauthenticated users are redirected to login.
- Runners are denied.
- Non-owner organizers cannot access another organizer's submission review page.
- Owner organizers can view standard submission review pages.
- Admins can view standard submission review pages.
- Owner organizers and admins can view accumulated activity review pages.
- Reviewed submissions render read-only state.
- Pending registrants table rows link to the standalone review page.
- Admin review queue result rows link directly to the standalone review page.
- Approve/reject actions redirect back to the standalone page.
- Rejection still requires a valid rejection reason through existing route behavior.

## Verification Commands

Latest focused verification:

```bash
node --check src/routes/organizer.routes.js
node --check src/controllers/admin.controller.js
node --check tests/submission-review-route-guards.test.js
node --check tests/organizer-dashboard-analytics.test.js
node --test --test-concurrency=1 tests/submission-review-route-guards.test.js
node --test --test-concurrency=1 tests/admin-dashboard.test.js
node --test --test-concurrency=1 tests/organizer-dashboard-analytics.test.js
```
