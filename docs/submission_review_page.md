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

The review page now uses a card-based review layout rather than the old wide registrants table. It shows:

- Header actions back to registrants and either the admin queue or organizer dashboard.
- Query-string success/error/warning messages at the top of the review page.
- Compact summary cards for review status, submission type, confirmation code, and submitted date.
- Participant and registration details in scan-friendly metadata blocks.
- Activity metrics: distance, elapsed time, run date, run location, run type, elevation, and steps.
- Evidence details: proof type, source, uploaded proof link, proof notes, and image preview when the proof is image-like.
- OCR review signals when available, including confidence, extracted values, mismatches, location/date checks, and name-match status.
- Suspicious activity flags and reasons in a dedicated review signals panel.
- Strava snapshot and external Strava activity link when available.
- Accumulated progress panel for accumulated-distance activities.
- Decision sidebar for pending submissions, or review history after approval or rejection.

## Workflow

Pending submissions render action forms on the standalone page:

- Approve with optional review notes.
- Reject with a required rejection reason and optional review notes.

Reviewed submissions render a read-only review summary and do not show approve/reject forms.

After approval or rejection, the reviewer is redirected back to the same standalone review page with a success or error message.

The current UI keeps the route and review service behavior unchanged. Only the presentation was redesigned into a responsive two-column card layout that collapses to one column on mobile.

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
- `src/public/css/organizer-events.css`
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
- Pending review pages render the card layout and decision sidebar.
- Reviewed pages render the card layout and review history sidebar.
- Image-like proof files render an inline preview plus the external evidence link.
- Pending registrants table rows link to the standalone review page.
- Admin review queue result rows link directly to the standalone review page.
- Approve/reject actions redirect back to the standalone page.
- Rejection still requires a valid rejection reason through existing route behavior.

## Verification Commands

Latest focused verification:

```bash
node --check src/routes/organizer.routes.js
node --check tests/submission-review-route-guards.test.js
node --test --test-concurrency=1 tests/submission-review-route-guards.test.js
```

Additional June 2026 render check:

- Authenticated pending review page returned 200, rendered `submission-review-page`, showed decision actions, and no longer rendered `registrants-table-wrap`.
- Authenticated reviewed success page returned 200, rendered the query message, showed `Review History`, omitted approve/reject actions, and rendered image proof preview when applicable.
- Browser screenshot verification was not available in the Codex session because the in-app browser connector returned no browser targets.
