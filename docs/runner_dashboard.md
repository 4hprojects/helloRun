# Runner Dashboard

## Document Role

This document defines the runner-facing dashboard at `/runner/dashboard`.

Use this file for dashboard-specific behavior, data sources, card ownership, status language, and implementation notes. Keep chronological implementation history in `docs/CHANGELOG.md`, and keep detailed submitted-entry page behavior in `docs/runner_submitted_entries.md`.

---

## Route

Primary route:

- `GET /runner/dashboard`

Partial route:

- `GET /runner/dashboard/result-submissions`

Supporting runner routes:

- `GET /runner/submissions`
- `GET /runner/submissions/:submissionId`
- `GET /runner/submissions/:submissionId/proof`
- `GET /runner/submissions/eligible`
- `GET /my-registrations`

---

## Purpose

The dashboard is the runner's operational home after login.

It should answer:

- What events am I registered for?
- Which events need payment or run proof?
- Did HelloRun receive my submitted run proof?
- Is my proof pending, approved, rejected, or certificate-ready?
- For accumulated challenges, how much approved distance counts toward the goal?
- What are my recent submissions, badges, certificates, groups, and activity?

The dashboard is an overview surface. Full history and detailed review feedback belong on `/runner/submissions` and `/my-registrations`.

---

## Current Main Cards

### Hero

Shows:

- runner greeting
- submit run result action
- My Registrations link
- completed events count
- pending review count
- running group count

The submit action opens the shared run proof modal and uses dashboard-specific empty-state copy.

### At A Glance

Shows KPI rows/cards for:

- upcoming events
- pending results
- certificates
- total approved distance

### Upcoming Events

Shows recent upcoming registrations with:

- event title and public event link
- start date
- distance
- participation mode
- confirmation code
- payment CTA when unpaid or payment proof was rejected

### Event Progress

Shows normalized status for registered events and submitted run proof.

This is the primary dashboard surface for a runner to understand the progress or status of events they signed up for.

Standard event states:

- `payment_required`: payment must be completed before run proof can be submitted
- `registration_not_ready`: registration is not confirmed
- `not_submitted`: run proof has not been submitted
- `submitted`: proof was received and is pending review
- `approved`: result was approved
- `rejected`: proof needs update and can be resubmitted
- `certificate_ready`: represented as approved state with a certificate action

Accumulated challenge states:

- `payment_required`: payment must be completed before activity submission is available
- `not_submitted`: no activity has been submitted
- `in_progress`: at least one activity exists, but the challenge is not complete
- `submitted`: pending activity exists and is waiting for review
- `completed`: approved distance reached the challenge target

Accumulated challenge display:

- approved distance / target distance
- progress bar
- approved activity count
- pending activity count
- rejected activity count
- helper text clarifying that only approved distance counts

Actions:

- payment states link to `/my-registrations`
- not submitted and accumulated in-progress states open the run proof modal
- rejected standard submissions open the run proof modal in resubmit mode
- submitted states link to submission detail when available
- certificate-ready states link to certificate download

### Result Submissions

Shows recent submission history with status filters:

- all
- submitted
- approved
- rejected

This card remains history-focused. It should not replace the Event Progress card because it is keyed by submissions, not by every active registration.

### Recent Badges

Shows recently earned badges and links to the badge area on the runner profile.

### Challenge Progress

Shows badge/challenge milestone progress from the badge progress service.

This is separate from Event Progress:

- Event Progress is registration/submission state.
- Challenge Progress is achievement/badge progress.

### Past Events

Shows recent past registrations.

### Activity Log

Shows merged dashboard activity:

- registrations
- running group activity
- result submission events
- result approval/rejection events
- certificate events

### Certificates Earned

Shows recent certificates and performance summary.

### Progress Statistics

Shows aggregate registration and submission counts.

### Running Groups

Shows current running group membership summary and links to group management.

---

## Data Sources

Controller:

- `src/controllers/runner.controller.js`

Services:

- `src/services/runner-data.service.js`
- `src/services/submission.service.js`
- `src/services/runner-submissions.service.js`
- `src/services/running-group.service.js`
- `src/services/achievement.service.js`
- `src/services/badge-progress.service.js`

Models:

- `Registration`
- `Submission`
- `AccumulatedActivitySubmission`
- `Event`
- `User`

View and assets:

- `src/views/runner/dashboard.ejs`
- `src/views/runner/partials/result-submissions-card.ejs`
- `src/public/css/runner-dashboard.css`
- `src/public/js/runner-dashboard.js`

---

## Event Progress Data Contract

`getRunnerEventProgressCards()` builds the dashboard event progress list from runner registrations plus standard and accumulated submissions.

Each card should be normalized before reaching EJS:

- registration id
- event title and slug
- confirmation code
- registration status
- payment status
- event type
- status key
- runner-facing status label
- tone for badge/card styling
- helper text
- optional progress object
- optional submitted/reviewed timestamps
- optional next action

The EJS template should render prepared values and avoid owning business-state decisions.

---

## Status Rules

Payment rules:

- Only `paymentStatus: paid` unlocks result/activity proof submission.
- `proof_submitted` means payment is awaiting review.
- `unpaid` and `proof_rejected` should send the runner to `/my-registrations`.

Standard result rules:

- A paid confirmed standard registration with no submission needs run proof.
- `submitted` means pending review.
- `approved` means official result accepted.
- `approved` plus certificate metadata means certificate-ready.
- `rejected` should allow resubmission through the shared run proof modal.

Accumulated challenge rules:

- Multiple activities can exist per registration.
- Approved distance counts toward official progress.
- Pending and rejected activity distance does not count toward official progress.
- Completion is reached when approved distance is greater than or equal to the event target distance.
- Certificate actions use the accumulated activity that received the completion certificate.

---

## UX Constraints

- Keep cards scannable and dense enough for operational use.
- Do not turn the dashboard into the full submitted-entry history page.
- Keep mobile layouts single-column and avoid clipped action buttons.
- Use the shared run proof modal for submit and resubmit actions.
- Keep status language neutral and review-oriented.
- Do not present OCR as final authority; submitted values are runner-confirmed and reviewer-approved.

---

## Validation

Focused checks:

```bash
node --check src/services/runner-data.service.js
node --check src/controllers/runner.controller.js
node --test --test-concurrency=1 tests/runner-dashboard-profile.test.js
node --test --test-concurrency=1 tests/runner-dashboard-modal.test.js
```

Related broader checks:

```bash
node --test --test-concurrency=1 tests/runner-submissions-routes.test.js
node --test --test-concurrency=1 tests/submission.service.test.js
node --test --test-concurrency=1 tests/submission-routes.test.js
```

---

## Related Documents

- `docs/runner_submitted_entries.md`
- `docs/codex/submit_run_proof_process_refinement.md`
- `docs/submission_review_page.md`
- `docs/achievement_badges.md`
- `docs/ui-ux-reference.md`
