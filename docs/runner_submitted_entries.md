# Runner Submitted Entries Page

## Document Role

This document defines the dedicated runner-facing page where runners can view, track, filter, inspect, and act on submitted run/activity entries in HelloRun.

This page serves as the runner’s main submission history and proof-status page.

The PRD should only reference this document instead of storing the full implementation plan inside `PRD.md`.

---

## Feature Name

Runner Submitted Entries Page

---

## Final Route Decision

Primary route:

- `GET /runner/submissions`

Detail route:

- `GET /runner/submissions/:submissionId`

Recommended navigation label:

- `Submitted Entries`

Reason:

- It follows the newer runner route structure.
- It separates registration/payment management from result-proof management.
- It gives OCR-based and manual-entry submissions a dedicated place.
- It keeps `/my-registrations` focused on registration and payment state.

---

## Locked Decisions

The first implementation will follow these decisions:

- Route: `/runner/submissions`
- Proof display: show a `View Proof` action instead of displaying proof screenshots on every card
- Resubmission: reuse the existing run-proof modal
- Scope: runner-owned event submissions and personal-record submissions

---

## Next UI Improvement Pass [PLANNED]

Status: notes only. No UI implementation has started for this pass.

Goal: improve `/runner/submissions` so the page feels like a polished runner workspace rather than a basic list, while preserving the current route, data contract, filters, ownership rules, and resubmission/certificate behavior.

Primary UX issues to address:

- Strengthen the page hierarchy so summary, filters, and entries scan cleanly on mobile, tablet, and desktop.
- Make event-based submissions and personal-record submissions visually understandable without hiding either type.
- Improve the entry cards so status, event/activity identity, time, distance, proof type, certificate availability, and next action are easier to parse.
- Reduce visual density in the filter/status area while keeping all controls reachable on small screens.
- Make empty states clearer by distinguishing "no entries yet" from "filters hide your entries".
- Ensure action buttons remain touch-friendly and do not wrap awkwardly on narrow screens.
- Keep hamburger navigation behavior intact on `/runner/submissions` during mobile/tablet QA.

Implementation constraints for the next pass:

- Do not change backend ownership or status semantics unless a UI requirement proves it is necessary.
- Do not remove personal-record submissions from the page.
- Do not reintroduce duplicate run-proof modal markup.
- Reuse the existing shared nav and run-proof modal behavior.
- Keep the page accessible with clear focus states, semantic headings, usable labels, and preserved `aria-current` behavior.
- Keep visual changes scoped to `runner-submissions.css` and the runner submissions templates unless shared styles are genuinely required.

Candidate UI changes:

- Add a compact page toolbar layout that keeps search, status tabs, activity filter, and sort predictable at mobile/tablet widths.
- Add a submission-type badge or label for personal records versus event entries.
- Improve KPI cards with tighter labels and better mobile grid behavior.
- Convert each entry row into a clearer two-zone card: identity/status on the left/top, primary actions on the right/bottom.
- Add consistent icon usage for distance, elapsed time, date, proof type, certificate, and review state.
- Add better responsive wrapping rules for badges and action buttons.
- Tune spacing, border contrast, and hover/focus states to match the runner dashboard style.

Validation target for implementation:

- Manual browser check for `/runner/submissions` at mobile, tablet, and desktop widths.
- Confirm hamburger opens from icon center and button padding.
- Confirm personal-record and event-based submissions both render.
- Confirm filters, pagination, detail links, resubmit, and certificate actions still work.
- Run `node --test tests/runner-submissions-routes.test.js`.

---

## Feature Goal

Create a dedicated page where a runner can check all submitted entries across HelloRun.

The page should answer these runner questions:

- What entries have I submitted?
- Which entries are waiting for review?
- Which entries were approved?
- Which entries were rejected?
- Why was an entry rejected?
- Can I resubmit a corrected proof?
- Can I download my certificate?
- Did the screenshot analysis or manual entry produce the final submitted values?
- Which event, distance, and activity type does each entry belong to?

---

## Current System Context

HelloRun already supports:

- Runner registration records.
- Payment proof upload and review.
- Run-proof submission and resubmission.
- Organizer/admin review of submitted run proofs.
- Submission statuses such as `submitted`, `approved`, and `rejected`.
- Certificate issuance after approval.
- Runner dashboard cards backed by real registration and submission data.
- Run-proof modal with screenshot analysis wording.
- Manual-entry fallback when OCR is unavailable or fails.
- Regression coverage for the run-proof modal and OCR proof reader.
- CSRF protection for runner upload and submission/resubmission flows.

This new page should reuse the existing submission workflow.

It should not replace the run-proof modal.

It should not replace `/my-registrations`.

It should provide a clearer history and management surface for submitted entries.

---

## Problem Statement

The runner dashboard gives a useful overview of registrations, activity, certificates, and submission actions.

That works for quick access.

It becomes limited when a runner has:

- multiple registered events
- multiple submitted proofs
- rejected submissions
- resubmission attempts
- certificate-ready entries
- OCR-assisted entries
- manually entered fallback submissions

A dedicated page is needed so runners can review every submitted entry in one place without scanning dashboard cards or registration records.

---

## User Story

As a runner, I want to see all my submitted event entries in one page so I can track their review status, view feedback, resubmit corrected proofs, and access certificates for approved results.

---

## Scope

## In Scope

The page should include:

- List of all runner-owned submissions.
- Submission status summary.
- Filters by status and activity type.
- Search by event title, organiser name, or event reference code.
- Sort options.
- Submission cards or table-like rows.
- Detail page for each submitted entry.
- Rejected-entry resubmission action.
- Certificate download action for approved entries.
- Review notes and rejection reason visibility.
- OCR metadata display when available.
- Manual-entry indicator when OCR fallback was used.
- `View Proof` action.
- Empty states.
- Mobile-responsive layout.
- Pagination.
- Regression tests for route access, ownership, filters, and action visibility.

## Out of Scope for Initial Version

The first version should not include:

- Direct organizer review actions.
- Admin moderation controls.
- Public visibility controls.
- Social sharing.
- Editing approved submissions.
- Deleting submitted entries.
- Advanced analytics charts.
- Full OCR reprocessing from this page.
- Always-visible proof screenshots in every card.

---

## Recommended Page Title

Final page title:

- `Submitted Entries`

Alternative labels considered:

- `My Submitted Entries`
- `My Run Proofs`
- `Activity Submissions`
- `Submission History`

Reason for final label:

`Submitted Entries` is clear for runners and flexible enough for future activity types such as run, walk, trail run, hike, and steps.

---

## Navigation Placement

## Runner Dashboard

Add a CTA:

- `View Submitted Entries`

Recommended placements:

- Progress Statistics card
- Recent Activity card
- Certificates card
- Run-proof modal success state

## Main Runner Navigation

Optional after first implementation:

- Dashboard
- My Registrations
- Submitted Entries
- Running Groups
- Profile

## My Registrations Page

Add contextual links:

- If a registration has a submitted entry:
  - `View Entry`

- If rejected:
  - `Fix Submission`

- If approved:
  - `View Entry`
  - `Download Certificate`

---

## Page Layout

## 1. Page Header

Title:

- `Submitted Entries`

Subtitle:

- `Check the status of your uploaded run proofs, review feedback, and certificates in one place.`

Primary action:

- `Submit Run Proof`

Secondary action:

- `View My Registrations`

Helper text:

- `Use this page to check whether your submitted activity has been received, approved, rejected, or issued with a certificate.`

---

## 2. Summary Cards

Show compact cards at the top of the page.

Recommended cards:

### Total Entries

Counts all runner-owned submissions.

### Pending Review

Counts submissions with `submitted` status.

### Approved

Counts submissions with `approved` status.

### Needs Action

Counts submissions with `rejected` status.

### Certificates

Counts approved submissions with issued certificate metadata.

Optional future card:

### Additional Review

Counts submissions with duplicate or suspicious flags if this is safe to show to runners.

---

## 3. Filters and Search

## Recommended Filters

### Search

Search should support:

- Event title
- Organiser name
- Event reference code
- Submission reference code if added later

### Status

Options:

- All
- Pending Review
- Approved
- Rejected
- Certificate Ready

### Activity Type

Options:

- Run
- Walk
- Trail Run
- Hike
- Steps

### Event Mode

Options:

- All
- Virtual
- Onsite
- Hybrid

### Sort

Options:

- Newest submitted
- Oldest submitted
- Event date
- Fastest time
- Distance

## Recommended Initial Filter Set

Start with:

- Search
- Status
- Activity Type
- Sort

Defer date range and event mode if the first build needs to stay lean.

---

## 4. Main Entries List

Use a card layout on mobile and a card-table hybrid layout on desktop.

Each entry should show:

- Event title
- Event reference code
- Organiser name
- Distance category
- Activity type
- Submitted distance
- Elapsed time
- Pace if available
- Run date
- Run location
- Submitted date
- Review status
- OCR/manual indicator
- Certificate status
- Primary action

Recommended status labels:

- `Pending Review`
- `Approved`
- `Rejected`
- `Certificate Ready`
- `Resubmission Needed`

Recommended visual treatment:

- Pending Review: neutral or warm status
- Approved: success status
- Rejected: danger status
- Certificate Ready: success or accent status
- Needs Action: warning status

Status should not rely on colour alone.

---

## 5. Entry Card Actions

Action visibility should depend on submission status.

## Pending Review

Show:

- `View Details`
- `View Proof`

Do not show:

- `Edit`
- `Resubmit`
- `Download Certificate`

Optional future action:

- `Cancel Submission`

Only add cancellation if withdrawal is intentionally supported.

## Approved

Show:

- `View Details`
- `View Proof`
- `Download Certificate`
- `View Leaderboard`

Do not show:

- `Resubmit`

## Rejected

Show:

- `View Details`
- `View Proof`
- `View Rejection Reason`
- `Resubmit Proof`

The `Resubmit Proof` action should trigger the existing run-proof modal.

It should pass the related registration ID through the existing modal trigger pattern.

## Certificate Ready

Show:

- `Download Certificate`
- `View Entry`
- `View Leaderboard`

---

## Entry Detail Page

Recommended detail route:

- `/runner/submissions/:submissionId`

Reason:

- Easier to test.
- Easier to deep-link from notifications.
- Cleaner for certificate and resubmission states.
- Better for future OCR details.
- Avoids putting too much data inside the list page.

---

## Entry Detail Content

The detail page should include these sections.

## 1. Entry Overview

Fields:

- Event title
- Event reference code
- Organiser
- Distance category
- Activity type
- Submission status
- Submitted date
- Reviewed date
- Certificate issued date if available

## 2. Submitted Activity Details

Fields:

- Activity date
- Activity location
- Distance
- Elapsed time
- Pace
- Source app if available
- Manual entry flag
- OCR confidence score if available

## 3. Review Result

## Approved Entry

Show:

- Approved status
- Approved date
- Certificate status
- Leaderboard inclusion status

Suggested copy:

`Your entry has been approved. You may now view your certificate if it has been issued.`

## Rejected Entry

Show:

- Rejection reason
- Review notes
- Date rejected
- Resubmission instructions

Suggested copy:

`This entry needs correction. Review the organiser’s feedback and submit an updated proof.`

## Pending Entry

Show:

- Pending status
- Submitted date
- Waiting-for-review message

Suggested copy:

`Your entry has been received and is waiting for organiser review.`

## 4. Proof Image

Do not show the proof image directly on every card.

Use a controlled action:

- `View Proof`

Proof display options:

- open proof in a modal
- open proof in a protected detail section
- open proof in a signed URL if storage supports it

Security rules:

- Only the owner runner can view their proof.
- Organiser/admin access remains through existing review pages.
- Proof image URLs should not be exposed as permanent public URLs if the storage strategy supports signed URLs.

## 5. OCR and Manual Entry Data

Show this section only when OCR or manual fallback metadata exists.

## OCR Used Successfully

Show:

- Source app detected
- Extracted distance
- Extracted duration
- Extracted date
- Extracted pace
- Confidence score
- OCR warnings
- Manual edits made by runner if tracked

Suggested copy:

`Screenshot analysis helped pre-fill this entry. You confirmed the final details before submission.`

## OCR Failed and Manual Fallback Was Used

Show:

- Manual entry label
- Entered distance
- Entered duration
- Entered date
- Entered location

Suggested copy:

`Screenshot analysis was unavailable, so this entry was completed manually.`

## OCR Unavailable

Hide the OCR section or show:

`Screenshot analysis was not used for this entry.`

## Duplicate or Suspicious Flag

Runner-facing copy should avoid unnecessary alarm.

Recommended label:

- `Needs additional review`

Admin/organiser pages can show deeper validation metadata.

---

## Empty States

## No Submissions Yet

Title:

- `No submitted entries yet`

Body:

- `Once you submit a run proof, your entry will appear here with its review status and certificate updates.`

Actions:

- `Submit Run Proof`
- `View Registered Events`

## No Filter Results

Title:

- `No entries match your filters`

Body:

- `Try clearing the filters or choosing a different status.`

Action:

- `Clear Filters`

## No Eligible Registrations for Submission

Title:

- `No eligible events for submission`

Body:

- `You need a paid or approved registration before you can submit a run proof.`

Action:

- `View My Registrations`

---

## Data Requirements

## Submission

Required fields:

- `_id`
- `runnerId`
- `registrationId`
- `eventId`
- `status`
- `submittedAt`
- `reviewedAt`
- `reviewedBy`
- `rejectionReason`
- `reviewNotes`
- `distance`
- `elapsedTime`
- `pace`
- `runDate`
- `runLocation`
- `activityType`
- `proofImage`
- `certificate`
- `ocrMetadata`
- `manualEntryUsed`
- `duplicateFlag`
- `suspiciousFlag`

## Registration

Required fields:

- `_id`
- `userId`
- `eventId`
- `paymentStatus`
- `participationMode`
- `registeredAt`

## Event

Required fields:

- `_id`
- `title`
- `slug`
- `referenceCode`
- `organizerId`
- `eventType`
- `distanceOptions`
- `eventStartAt`
- `eventEndAt`
- `registrationCloseAt`

## Organiser/User

Required fields:

- organiser display name
- organiser profile reference if needed

---

## Recommended Query Behaviour

The backend should only return submissions owned by the authenticated runner.

Base query:

- `runnerId = req.session.user._id`

Populate:

- event title
- event slug
- event reference code
- organiser name
- registration payment status

Default sort:

- `submittedAt DESC`

Pagination:

- 10 entries per page

Recommended query params:

- `/runner/submissions?status=approved&activityType=run&q=earth&page=2`

Filter params:

- `q`
- `status`
- `activityType`
- `sort`
- `page`

Optional later params:

- `eventMode`
- `dateFrom`
- `dateTo`

---

## Security Rules

- Runner must be authenticated.
- Runner role is required.
- Runner can only access their own submissions.
- Submission detail routes must validate ownership.
- Certificate downloads must validate ownership and approved status.
- Resubmission must only be available for rejected submissions.
- Pending and approved submissions should not be editable.
- File/proof access should not expose other runners’ uploads.
- CSRF protection must apply to resubmission and any state-changing action.
- Query params should be sanitized.
- Return paths should be sanitized to avoid open redirects.
- Proof image access should be protected through existing auth checks or signed access.

---

## UX Rules

## Status Priority

The page should make status obvious before technical details.

Recommended visual priority:

1. Status badge
2. Event title
3. Distance and time
4. Run date
5. Action button

## Mobile Behaviour

Mobile cards should show:

- Event title
- Status badge
- Distance/time
- Run date
- Primary action

Secondary details should sit behind:

- `View Details`

## Desktop Behaviour

Desktop can use a card-table hybrid:

- Left: event and activity details
- Middle: status and review details
- Right: actions

## Accessibility

- Status should not rely on colour alone.
- Buttons must have clear labels.
- Filter controls need labels.
- Empty states should include next actions.
- Modals must trap focus if used.
- Keyboard navigation must work for filters, cards, proof viewing, and modal actions.

---

## Integration With Existing Pages

## Runner Dashboard

Add:

- `View Submitted Entries` CTA.
- Summary count link from approved/rejected/pending cards.
- Links from recent activity items to the submission detail page.

## My Registrations

Update registration cards:

- If submission exists:
  - show `View Entry`

- If rejected:
  - show `Resubmit Proof`

- If approved:
  - show `Download Certificate`

Payment actions should remain separate from result-proof actions.

## Notifications

Notification links should point to the detail route when possible.

Recommended notification targets:

- result approved -> `/runner/submissions/:submissionId`
- result rejected -> `/runner/submissions/:submissionId`
- certificate issued -> `/runner/submissions/:submissionId`

Payment-related notifications can continue pointing to registration/payment surfaces unless the submission detail is more relevant.

## Leaderboard

Approved entry detail page can link to:

- event leaderboard
- filtered leaderboard for event and distance if supported

---

## OCR Compatibility

This page should be ready for OCR Smart Activity Submission.

Initial version should support optional OCR metadata without requiring OCR to be fully complete.

## Current OCR/Integrity Behavior - Apr 29, 2026

The run-proof modal now submits richer OCR metadata and flag-only integrity signals that this page can display safely.

Current behavior:

- OCR metadata may include extracted distance, duration, elevation, steps, date, location, source app, activity type, athlete name, confidence, and mismatch flags.
- Runners can manually edit OCR-filled values before submitting.
- Edited values that strongly diverge from OCR are not blocked, but they are flagged for organizer/admin review.
- Suspicious submissions should be shown to runners with neutral wording such as `Needs additional review`.
- Detailed suspicious reasons and OCR-vs-submitted values are reviewer-facing only.
- Replacing or resubmitting another proof image clears stale editable fields such as `steps` before the new OCR result is applied.

Display states:

## OCR Used Successfully

Show:

- `Analysed from screenshot`
- source app
- confidence score
- extracted values
- final confirmed values

## Manual Fallback Used

Show:

- `Entered manually`
- final submitted values

## OCR Failed

Show:

- `Screenshot analysis was unavailable, so this entry was completed manually.`

## OCR Not Used

Show no OCR section unless useful.

## Needs Additional Review

Use this safer runner-facing label for duplicate or suspicious signals.

Avoid showing technical fraud labels to runners.

---

## Suggested Page Copy

## Header

`Submitted Entries`

`Check the status of your uploaded run proofs, review feedback, and certificates in one place.`

## Primary CTA

`Submit Run Proof`

## Secondary CTA

`View My Registrations`

## Pending Review Message

`Your entry has been received and is waiting for review.`

## Approved Message

`Your entry has been approved. You may now view your certificate if it has been issued.`

## Rejected Message

`This entry needs correction. Review the organiser’s feedback and submit an updated proof.`

## OCR Label

`Analysed from screenshot`

## Manual Label

`Entered manually`

## Certificate Label

`Certificate Ready`

## View Proof Button

`View Proof`

## Resubmission Button

`Resubmit Proof`

---

## Development Tasks

## Task 1: Route Planning

Add runner routes:

- `GET /runner/submissions`
- `GET /runner/submissions/:submissionId`

Do not create a duplicate resubmission form for the first version.

Rejected entries should trigger the existing run-proof modal.

---

## Task 2: Controller

Create or extend runner controller methods:

- `getRunnerSubmissionsPage`
- `getRunnerSubmissionDetailPage`

Responsibilities:

- Validate authenticated runner.
- Parse filters.
- Query runner-owned submissions.
- Populate event and registration data.
- Compute summary counts.
- Build pagination data.
- Render page with safe metadata.

---

## Task 3: Service Layer

Create or extend:

- `src/services/runner-submissions.service.js`

Recommended functions:

- `listRunnerSubmissions(userId, filters)`
- `getRunnerSubmissionDetail(userId, submissionId)`
- `getRunnerSubmissionSummary(userId)`
- `buildSubmissionFilters(query)`
- `formatSubmissionStatus(submission)`
- `buildSubmissionActions(submission)`

---

## Task 4: Views

Create:

- `src/views/runner/submissions.ejs`
- `src/views/runner/submission-detail.ejs`

Reuse:

- existing layout
- runner dashboard visual language
- status badge patterns
- reusable confirmation dialog
- existing run-proof modal trigger pattern

---

## Task 5: Styling

Create:

- `src/public/css/runner-submissions.css`

Page sections:

- page header
- summary cards
- filter bar
- submission cards/list
- status badges
- detail page panels
- empty states
- mobile layout
- proof viewing state

---

## Task 6: Dashboard Link Integration

Update runner dashboard template.

Add CTA:

- `View Submitted Entries`

Recommended locations:

- Progress Statistics
- Certificates
- Recent Activity
- Run-proof modal success state

---

## Task 7: My Registrations Integration

Update registration cards:

- show submission-aware actions
- link to submitted entry detail
- keep payment actions separate from result-proof actions
- show rejected-entry `Resubmit Proof` action where applicable

---

## Task 8: Notification Link Integration

Update notification payloads so result-related notifications point to the submission detail page.

Recommended notification types:

- result approved
- result rejected
- certificate issued

Optional:

- result submitted

---

## Task 9: Tests

Create:

- `tests/runner-submissions-routes.test.js`

Recommended tests:

- unauthenticated user cannot access `/runner/submissions`
- non-runner cannot access `/runner/submissions`
- runner sees only own submissions
- status filter works
- activity type filter works
- search by event title works
- rejected submission shows resubmit action
- approved submission shows certificate action when certificate exists
- pending submission does not show resubmit action
- detail route blocks access to another runner’s submission
- empty state renders for runner with no submissions
- `View Proof` action appears only when proof exists
- submission detail shows OCR/manual metadata when available

Optional source-contract test:

- runner dashboard contains `View Submitted Entries` CTA

---

## Acceptance Criteria

The feature is complete when:

- Runner can open `/runner/submissions`.
- Runner sees all owned event-based submitted entries.
- Runner cannot see submissions owned by another user.
- Summary cards show accurate counts.
- Filters work without dropping other query params.
- Rejected entries clearly show feedback and resubmission action.
- Rejected entries reuse the existing run-proof modal.
- Approved entries show certificate action when available.
- Pending entries show review-waiting status.
- Submission detail page shows event, activity, proof, review, OCR/manual, and certificate details.
- Proof screenshot is accessed through `View Proof`, not displayed by default on every card.
- Page works on mobile and desktop.
- Runner dashboard links to the submitted entries page.
- My Registrations links to relevant submitted entries.
- Tests pass for access, ownership, filters, and action visibility.

---

## Manual QA Checklist

## Desktop

- Open page with no submissions.
- Open page with pending, approved, and rejected submissions.
- Test filters.
- Test search.
- Test pagination.
- Open submission detail.
- Check certificate action.
- Check resubmission action.
- Check rejected feedback display.
- Click `View Proof`.
- Trigger resubmission modal from rejected entry.

## Mobile

- Check card readability.
- Check filter stacking.
- Check tap targets.
- Check action buttons.
- Check long event titles.
- Check `View Proof` behaviour.
- Check modal behaviour when resubmitting.

## Security

- Try another runner’s submission detail URL.
- Try non-runner access.
- Try logged-out access.
- Try resubmitting approved entry.
- Try downloading certificate for unapproved entry.
- Try viewing another runner’s proof image.
- Try unsafe `returnTo` values if return navigation is added.

---

## Recommended Implementation Order

1. Add route and controller for `/runner/submissions`.
2. Add service query for runner-owned submissions.
3. Build basic list page without filters.
4. Add summary counts.
5. Add filters and pagination.
6. Add detail page.
7. Add proof viewing through `View Proof`.
8. Add action visibility for rejected, approved, and pending states.
9. Reuse existing run-proof modal for rejected-entry resubmission.
10. Link dashboard and My Registrations to the new page.
11. Add notification detail links.
12. Add tests.
13. Run desktop and mobile QA.
14. Update PRD with a short reference to this document.

---

## PRD Update Snippet

Add this to `PRD.md` under the active runner/dashboard, Phase 5, or Phase 12-adjacent planning section.

```md
### Runner Submitted Entries Page [DRAFT]

Goal: Add a dedicated runner page where users can review submitted run/activity entries, track review status, view rejection feedback, resubmit corrected proofs, and access certificates from one place.

Planned route:

- `/runner/submissions`

Locked decisions:

- Proof screenshots are accessed through a `View Proof` action instead of being displayed on every card.
- Rejected-entry resubmission reuses the existing run-proof modal.
- Scope includes runner-owned event submissions and personal-record submissions.

Core scope:

- submission history
- status summary cards
- search and filters
- runner-owned submission detail page
- rejected-entry resubmission entry point
- approved-entry certificate access
- OCR/manual-entry metadata display when available
- dashboard and My Registrations links

Detailed planning:

- See `docs/runner_submitted_entries.md`
