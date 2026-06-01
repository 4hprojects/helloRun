# Submit Run Proof Process Refinement Plan

## Document Role

This is a planning and implementation guide for refining the HelloRun submit run proof process.

Use this file before changing code. The first implementation pass should preserve the existing submission, review, certificate, badge, payment, and registration contracts unless this plan explicitly calls out a scoped change.

This file is not the master PRD. It is a focused Codex task file for the run result proof flow.

Related references:

- `docs/PRD.md`
- `docs/ocr_smart_submission.md`
- `docs/submission_review_page.md`
- `docs/create_event/create_event_wizard_codex_implementation.md`

## Current Status

The current submit run proof flow is already functional and has several mature pieces:

- Runner modal for screenshot upload, OCR-assisted extraction, manual correction, Strava import, multi-event selection, and confirmation.
- Backend routes for `/my-registrations/:registrationId/submit-result` and `/my-registrations/:registrationId/resubmit-result`.
- JSON Strava submission route at `/api/events/:eventId/submissions/strava`.
- `Submission` records for single-result events and personal records.
- `AccumulatedActivitySubmission` records for accumulated-distance events.
- R2-backed proof upload for screenshots.
- Duplicate screenshot checks through proof hash.
- Suspicious activity detection from OCR mismatch, unrealistic pace, unusually high distance/elevation, steps anomalies, and name mismatch.
- Organizer/admin review page for both standard and accumulated submissions.
- Certificate, badge, leaderboard, audit, notification, and shadow-sync hooks after review.

## Implementation Log

### 2026-05-24 Phase 1 Modal Clarity Slice

Implemented:

- Clarified the shared run-proof modal description so the flow is framed as proof source, details review, and target selection.
- Renamed Step 1 from activity source to proof source.
- Split the visible source labels into `Activity Screenshot` and `Strava Activity`.
- Updated screenshot helper copy to make OCR analysis assistive and runner-confirmed.
- Updated Strava helper copy to state that Strava submissions currently target one HelloRun event or Personal Record.
- Updated event-selection helper copy to distinguish screenshot multi-target submission from Strava single-target submission.
- Changed Personal Record card copy from default event-style wording to personal log wording.
- Added frontend target labels for event cards:
  - `Event Result` for standard event submissions.
  - `Resubmission` for rejected standard submissions.
  - `Challenge Activity` for accumulated-distance activities.
  - `Personal log` for Personal Record.
- Added frontend target metadata explaining single result, rejected replacement, or accumulated-distance approval behavior.
- Added safe eligibility metadata from `getRunnerEligibleSubmissionRegistrations()`:
  - `submissionMode`
  - `virtualCompletionMode`
- Kept existing submit/resubmit route paths, form field names, CSRF handling, upload handling, OCR hidden fields, duplicate checks, and backend write behavior unchanged.
- Kept Strava backend behavior single-target and added frontend enforcement so multiple selected targets collapse to one when a Strava activity is selected.
- Updated focused modal regression assertions.

Verified:

```bash
node --check src/public/js/run-proof-modal.js
node --check src/services/submission.service.js
node --test --test-concurrency=1 tests/runner-dashboard-modal.test.js
node --test --test-concurrency=1 tests/submission.service.test.js
```

Notes:

- `tests/submission.service.test.js` passed. The test run emitted existing non-fatal submission shadow-sync lookup errors from background hooks in the test environment.
- Backend submission semantics were intentionally not refactored in this slice.
- Remaining planned phases still apply: deeper frontend state normalization, richer eligibility/exclusion messaging, optional Strava multi-target contract, backend multi-write orchestration hardening, and review surface polish.

### 2026-06-01 Conservative Auto-Approval Visibility Slice

Implemented:

- Preserved existing route contracts, statuses, auto-approval thresholds, badge/certificate hooks, and Strava single-target behavior.
- Added source-aware auto-approval notes:
  - OCR: `Auto-approved from OCR name match.`
  - Strava: `Auto-approved from verified Strava activity.`
- Added structured `validation` metadata to accumulated activity submissions, with `submissionMode = accumulated`.
- Improved organiser/admin review visibility for proof source, target type, validation method, review reason, suspicious reason, OCR analysis, and Strava snapshot details.
- Normalized runner modal state around proof source and target kind while keeping existing hidden fields and endpoints.
- Updated Strava completion copy so it no longer always implies manual review.

Production smoke checklist:

- Screenshot standard submission auto-approves when clean.
- Screenshot below-minimum submission remains pending and shows organiser-review copy.
- Suspicious OCR submission remains pending with review signals.
- Accumulated activity auto-approves and updates progress.
- Accumulated completion issues one certificate only after target progress is reached.
- Valid Strava activity auto-approves with the Strava-specific review note.
- Duplicate screenshot and duplicate Strava activity are blocked.
- Organiser/admin can approve and reject pending standard and accumulated records.

Primary implementation files:

- `src/views/partials/run-proof-modal.ejs`
- `src/public/js/run-proof-modal.js`
- `src/public/js/run-proof-integrity.js`
- `src/routes/pageRoutes.js`
- `src/routes/runner.routes.js`
- `src/routes/strava.routes.js`
- `src/controllers/page.controller.js`
- `src/controllers/runner.controller.js`
- `src/services/submission.service.js`
- `src/services/accumulated-activity.service.js`
- `src/services/strava-submission.service.js`
- `src/services/upload.service.js`
- `src/utils/submission-integrity.js`
- `src/models/Submission.js`
- `src/models/AccumulatedActivitySubmission.js`

Key test files:

- `tests/submission-routes.test.js`
- `tests/submission.service.test.js`
- `tests/runner-dashboard-modal.test.js`
- `tests/run-proof-integrity.test.js`
- `tests/ocr-proof-reader.test.js`
- `tests/upload-validation.test.js`
- `tests/strava-integration.test.js`
- `tests/submission-review-route-guards.test.js`

## Current Process Map

### Screenshot Upload Path

1. Runner opens the shared run-proof modal.
2. Modal checks whether the runner is authenticated.
3. Runner uploads a screenshot.
4. Frontend validates image type and size.
5. Frontend computes a screenshot hash and runs OCR.
6. OCR can auto-fill distance, duration, date, location, run type, elevation, and steps.
7. Runner reviews and edits the extracted values.
8. Runner selects one or more eligible event registrations. Personal Record is always available as a fallback option.
9. Runner confirms the summary.
10. `POST /my-registrations/:registrationId/submit-result` or `/resubmit-result` receives multipart form data.
11. Backend revalidates file, CSRF, auth, registration ownership, payment status, event status, submission window, distance, duration, run date, location, run type, proof type, OCR metadata, and duplicate screenshot hash.
12. Backend uploads the proof image to R2.
13. Backend writes one or more records:
    - `Submission` for single-result events.
    - `AccumulatedActivitySubmission` for accumulated-distance events.
    - Personal record through `Submission` with a hidden personal-record event and registration.
14. Backend deletes replaced proof objects when a rejected result is resubmitted.
15. Runner sees a success state and can view submitted entries.

### Strava Path

1. Runner opens the modal.
2. Runner syncs recent Strava activities.
3. Runner selects one activity.
4. Modal maps Strava fields into the visible review fields.
5. Runner selects the target event or Personal Record.
6. Frontend posts to `/api/events/:eventId/submissions/strava`.
7. Backend fetches the activity from Strava by ID, verifies ownership, validates activity shape, validates event window and accepted activity type, checks duplicates, and creates/resubmits a `Submission` or creates an accumulated activity record.

### Review Path

1. Pending results appear in organizer/admin review surfaces.
2. Reviewer opens the standalone submission review page.
3. Reviewer sees participant, registration, activity metrics, proof, OCR metadata, suspicious flags, and Strava metadata when present.
4. Reviewer approves or rejects.
5. Approval can issue certificates, update achievements, update accumulated progress, update global distance badges, send notifications, and write audit events.
6. Rejection stores feedback and lets the runner resubmit for standard single-result events. Accumulated challenges accept additional activity submissions instead of replacing the rejected one.

## Problems To Refine

### 1. The Modal Mixes Source Selection, Proof Extraction, Event Selection, and Final Review

The current two-step modal works, but the runner mental model is overloaded:

- Screenshot upload and Strava sync are both in Step 1, but they behave differently.
- Event selection happens after proof selection even though event rules affect accepted activity types and minimum activity distance.
- Personal Record is always present, which is useful, but can visually compete with real event submissions.
- Multi-event selection exists for screenshot uploads, but Strava submission uses a single event endpoint.

Recommended direction:

- Keep the existing modal, but make the process contract explicit:
  - Source choice: screenshot or Strava.
  - Event target: one or more eligible events, plus optional Personal Record.
  - Activity details: extracted or manually entered.
  - Review and submit.
- Avoid a large rewrite until the backend service contract is clarified.

### 2. Screenshot Multi-Event Submission and Strava Submission Are Not Symmetric

Screenshot submissions can target multiple selected registrations from one upload.

Strava currently posts one selected activity to one selected event ID. This is acceptable for MVP, but the UI text says users can choose the HelloRun event after selecting a Strava activity, while the modal also supports selecting multiple events.

Recommended direction:

- Short term: make Strava UI explicitly single-target.
- Later: add a multi-target Strava endpoint if product requirements need one activity to count toward multiple events.

### 3. Accumulated Challenges Need Clearer Runner Feedback

Accumulated-distance events behave differently:

- Standard events have one active submission per registration, with rejected submissions replaced through resubmit.
- Accumulated events can collect multiple activity submissions.
- Approval, not submission, contributes to completion progress.

Recommended direction:

- In the modal, label accumulated events as "Adds activity toward challenge" instead of generic "New".
- After submission, tell the runner whether the activity is pending review and whether it contributes after approval.
- On My Registrations and dashboard surfaces, expose pending/approved/rejected accumulated distance in the same language used by organizer review.

### 4. Eligibility Is Backend-Correct But Not Fully Explained In UI

Backend eligibility requires:

- Runner owns the registration.
- Registration is confirmed.
- Payment status is paid.
- Event is published.
- Submission window is open.
- Existing standard submission is absent or rejected.

When no eligible event exists, the modal falls back to Personal Record. This prevents dead ends, but runners may not understand why a registered event is missing.

Recommended direction:

- Keep `/runner/submissions/eligible` as the primary eligibility endpoint.
- Add optional non-blocking exclusion reasons later, such as unpaid, outside submission window, already submitted, or pending review.
- Do not expose sensitive organizer or internal status details.

### 5. OCR Trust Signals Are Strong But Need A Cleaner Review Contract

The current system stores OCR metadata, suspicious flags, and structured validation metadata. Auto-approval exists for clean OCR name matches and no mismatch flags. Standard one-time submissions are held for review when the proof distance is below the resolved category minimum, accumulated activity submissions can auto-approve when clean OCR criteria pass, and Strava uses a separate synced-source validation path.

Refinement opportunities:

- Define which fields are official result data and which are evidence metadata in one service-level contract.
- Make OCR mismatch warnings consistent between frontend review overlay and backend suspicious flags.
- Ensure runner-facing copy never presents OCR as final authority.
- Keep suspicious submissions saveable and reviewable; do not block unless the input is invalid or duplicated.

### 6. File Handling Should Stay Atomic Around Multi-Submission Writes

The current route uploads one proof image and reuses the R2 object across selected targets. If later target creation fails, the catch block cleans up only when `uploadedProofKey` is still set.

Risk to inspect before implementation:

- Partial writes are possible if one target succeeds and a later target fails.
- Reusing the same proof object across multiple records is intentional, but deletion logic must never delete a shared proof object still referenced by another submission.

Recommended direction:

- Keep the current behavior in the first UI refinement.
- If backend refinement is needed, introduce a small write-orchestration helper that tracks saved targets and returns a clear partial-failure policy.

## Target Process

Recommended target flow:

```text
Open run proof modal
  -> choose proof source
      -> screenshot upload and OCR
      -> Strava activity import
  -> choose target
      -> event registration
      -> accumulated challenge activity
      -> personal record
  -> review normalized activity details
  -> confirm ownership and accuracy
  -> submit through a source-aware backend contract
  -> show pending/approved/resubmission next step
```

The target should preserve these existing product decisions:

- Runner can manually correct OCR values before submit.
- Screenshot duplicate detection uses proof hash.
- Strava duplicate detection uses Strava activity ID.
- Rejected standard submissions can be resubmitted.
- Approved standard submissions cannot be resubmitted.
- Accumulated activities are additive and approved distance counts toward completion.
- Personal Record remains available without a registered event.
- Organizer/admin review remains the human trust layer.

## Recommended Implementation Plan

### Phase 0: Documentation And Baseline Tests

Goal:

Lock the existing behavior before refinement.

Tasks:

- Keep this file as the task source.
- Run focused baseline tests before edits.
- Add missing test cases only where current behavior is unclear.

Suggested baseline commands:

```bash
node --test --test-concurrency=1 tests/submission-routes.test.js
node --test --test-concurrency=1 tests/submission.service.test.js
node --test --test-concurrency=1 tests/runner-dashboard-modal.test.js
node --test --test-concurrency=1 tests/run-proof-integrity.test.js
node --test --test-concurrency=1 tests/ocr-proof-reader.test.js
node --test --test-concurrency=1 tests/strava-integration.test.js
node --test --test-concurrency=1 tests/submission-review-route-guards.test.js
```

### Phase 1: Clarify Modal State And Copy Without Backend Contract Changes

Goal:

Make the process easier to understand while preserving current routes and data writes.

Tasks:

- Separate visible source choice labels for Screenshot and Strava.
- Make Step 1 communicate that screenshot OCR is optional assistance and final values must be reviewed.
- Make Strava selection copy explicitly single-target until backend supports multi-target Strava.
- Change accumulated event pills from generic "New" to a clearer "Challenge Activity" or "Adds to Challenge".
- Keep Personal Record visually secondary but available.
- Improve no-eligible-event messaging so the runner understands Personal Record is still available.
- Keep all existing field names, hidden inputs, and endpoints stable.

Files likely touched:

- `src/views/partials/run-proof-modal.ejs`
- `src/public/js/run-proof-modal.js`
- `src/public/css/run-proof-modal.css`
- `tests/runner-dashboard-modal.test.js`

Definition of done:

- Existing screenshot and Strava submissions still work.
- Modal tests prove key labels and hidden fields remain present.
- No backend route behavior changes.

### Phase 2: Normalize Frontend Submission State

Goal:

Reduce modal complexity by making one internal state object describe source, target, activity details, OCR metadata, and confirmation state.

Tasks:

- Add a source discriminator in frontend state: `screenshot` or `strava`.
- Add a target mode discriminator: `event_single`, `event_multi`, `accumulated`, `personal_record`.
- Centralize review summary construction from normalized state rather than reading directly from scattered DOM nodes where possible.
- Keep DOM field synchronization before submit for backward compatibility.
- Keep `selectedRegistrationIds` behavior for screenshot uploads.
- Keep Strava single-target behavior unless Phase 4 is selected.

Files likely touched:

- `src/public/js/run-proof-modal.js`
- `tests/runner-dashboard-modal.test.js`
- `tests/run-proof-integrity.test.js`

Definition of done:

- Review overlay consistently shows proof source, target, activity type, date, distance, duration, optional elevation/steps, and warning state.
- Replacing screenshot clears OCR and stale editable fields.
- Selecting Strava clears screenshot proof state and vice versa.

### Phase 3: Improve Eligibility Payloads

Goal:

Make event selection more informative without weakening backend checks.

Tasks:

- Extend `getRunnerEligibleSubmissionRegistrations()` output with safe labels:
  - `submissionMode`: `standard`, `accumulated`, or `personal_record`.
  - `targetDistanceKm` for accumulated challenges when available.
  - `minimumActivityDistanceKm` when configured.
  - `acceptedRunTypes` when configured.
- Keep sensitive or confusing exclusion details out of the first implementation.
- Render labels in the modal event cards.

Files likely touched:

- `src/services/submission.service.js`
- `src/controllers/runner.controller.js`
- `src/public/js/run-proof-modal.js`
- `tests/submission.service.test.js`
- `tests/runner-dashboard-modal.test.js`

Definition of done:

- Eligible options include enough metadata for the modal to explain target rules.
- Backend still revalidates all rules on submit.

### Phase 4: Decide Whether Strava Needs Multi-Target Submission

Goal:

Resolve the current asymmetry deliberately.

Option A, recommended for first refinement:

- Keep Strava single-target.
- Disable or warn on multiple event selections when Strava is selected.
- Update copy and tests accordingly.

Option B, later enhancement:

- Add a Strava multi-target endpoint that accepts selected registration IDs.
- Reuse duplicate checks per target.
- Validate accumulated and standard targets separately.
- Return per-target success/failure details.

Files likely touched for Option B:

- `src/routes/strava.routes.js`
- `src/services/strava-submission.service.js`
- `src/public/js/run-proof-modal.js`
- `tests/strava-integration.test.js`
- `tests/submission-routes.test.js`

Definition of done:

- The UI and backend agree whether Strava is single-target or multi-target.

### Phase 5: Backend Write Orchestration Hardening

Goal:

Make screenshot multi-target writes easier to reason about.

Tasks:

- Extract multipart submission orchestration from `page.controller.js` into a dedicated service only if the change stays small.
- Define partial failure policy:
  - Prefer all-or-clear-error for validation failures before upload.
  - For post-upload multi-write errors, avoid deleting proof objects still referenced by successful saved records.
- Keep proof cleanup helper `deleteProofObjectIfUnused()` behavior intact.
- Add regression coverage for failure after first target write if practical.

Files likely touched:

- `src/controllers/page.controller.js`
- `src/services/submission.service.js` or a new focused orchestration service
- `tests/submission-routes.test.js`

Definition of done:

- No successful saved submission points to a deleted R2 proof object.
- Duplicate proof behavior remains unchanged.

### Phase 6: Review Surface Polish

Goal:

Make organizer/admin review reflect the refined runner process.

Tasks:

- Show source clearly: Screenshot OCR, manual screenshot entry, Strava.
- For accumulated activities, show target progress and pending contribution language.
- Show OCR mismatch and name mismatch with neutral review language.
- Keep approve/reject service behavior unchanged.

Files likely touched:

- `src/views/organizer/submission-review.ejs`
- `src/routes/organizer.routes.js`
- `tests/submission-review-route-guards.test.js`

Definition of done:

- Reviewers can quickly understand source, target type, official values, proof metadata, and warning reasons.

## Validation Rules To Preserve

Runner submission must continue to require:

- Authenticated runner session.
- CSRF validation.
- Valid uploaded proof file for screenshot submission.
- Supported proof MIME type.
- File size within configured upload limit.
- Confirmed, paid registration for event submissions.
- Published event.
- Open submission window.
- Valid distance between current model limits.
- Valid elapsed time.
- Run date not in the future.
- Supported run type.
- Duplicate screenshot blocking for screenshot path.
- Duplicate Strava activity blocking for Strava path.
- Rejection-only resubmission for standard submissions.
- No resubmission for approved standard submissions.

Accumulated submissions must continue to require:

- Accumulated-distance event.
- Minimum activity distance when configured.
- Accepted activity type when configured.
- Approval before distance counts toward completion.

## Data Contract

Official result data:

- `registrationId`
- `eventId`
- `runnerId`
- `distanceKm`
- `elapsedMs`
- `runDate`
- `runType`
- `proofType`
- `proof.url`
- `proof.key`
- `proof.hash`
- `status`
- `submittedAt`
- `reviewedAt`
- `reviewedBy`
- `certificate`

Evidence and review metadata:

- `source`
- `proof.mimeType`
- `proof.size`
- `proofNotes`
- `runLocation`
- `elevationGain`
- `steps`
- `ocrData`
- `stravaActivity`
- `suspiciousFlag`
- `suspiciousFlagReason`
- `reviewNotes`
- `rejectionReason`

Do not promote OCR fields to official result data unless a new requirement explicitly says so. OCR should remain evidence metadata that helps review the runner-confirmed values.

## Test Plan

### Route Tests

- Unauthenticated screenshot submission redirects to login.
- Missing screenshot is rejected.
- Invalid screenshot type is rejected.
- Invalid elapsed time is rejected.
- Out-of-range distance is rejected.
- Future run date is rejected.
- Duplicate screenshot is rejected.
- Multi-event screenshot submission creates expected records.
- Rejected standard submission can be resubmitted.
- Approved standard submission cannot be resubmitted.
- Personal record submission works without registered event.

### Service Tests

- Eligible registrations include only paid, confirmed, in-window published events.
- Rejected standard submissions are eligible for resubmission.
- Existing submitted/approved standard submissions are not eligible.
- Accumulated events remain eligible for additional activities.
- Suspicious OCR mismatches save with flags.
- Clean OCR matched submissions can auto-approve when existing criteria are met.
- Below-minimum one-time submissions remain submitted with a review reason.
- Clean accumulated activity submissions can auto-approve and only issue certificates when approved total progress reaches the event target.
- Strava source-validated submissions can auto-approve without OCR name matching when source validation, event rules, and integrity checks pass.

### Modal Tests

- Modal renders screenshot and Strava source choices.
- Hidden field names remain backward-compatible.
- Event card labels distinguish standard, accumulated, resubmission, and personal record targets.
- Strava selected state clears screenshot upload state.
- Screenshot upload clears Strava selected state.
- Review overlay shows the same normalized values that will be submitted.
- Name mismatch acknowledgement is required before final submit.

### Review Tests

- Organizer owner can review standard submission.
- Organizer owner can review accumulated activity.
- Non-owner organizer cannot access review page.
- Admin can review both types.
- Review page renders source, proof, OCR warnings, suspicious flags, and Strava metadata.
- Rejection still requires rejection reason.

## Risks

- Large modal rewrites can break a working flow. Prefer small refactors with tests.
- Strava and screenshot flows look similar in UI but have different backend contracts.
- Multi-target screenshot submissions can create partial writes if late errors occur.
- Shared proof object cleanup must not delete a proof still referenced by another saved record.
- OCR warnings can confuse runners if presented as accusations. Keep runner copy neutral and reserve final judgement for review.
- Personal Record fallback can hide why real event submissions are unavailable unless eligibility messaging is improved.

## Recommended First Implementation Slice

Start with Phase 1 only.

Do not change backend submission semantics in the first slice. The highest-value, lowest-risk improvement is to clarify the modal process, target labels, and Strava single-target behavior while preserving route contracts.

After Phase 1 is verified, move to Phase 3 eligibility metadata. Only consider Phase 5 backend orchestration after the UI contract is stable and tests prove the current behavior.

## Definition Of Done

The refined submit run proof process is complete when:

- Runner can clearly choose Screenshot or Strava.
- Runner can clearly see which target type they are submitting to.
- Standard result, accumulated challenge activity, and personal record behavior are distinguishable.
- Screenshot and Strava flows have explicit matching UI/backend contracts.
- OCR remains assistive and reviewable, not silently authoritative.
- Duplicate proof protection still works.
- Organizer/admin review still receives all evidence and warning signals.
- Certificate, badge, leaderboard, notification, audit, and shadow-sync behavior remains intact.
- Focused route, service, modal, OCR integrity, Strava, and review tests pass.

## Codex Implementation Prompt

Use this prompt when implementation begins:

```text
Read docs/codex/submit_run_proof_process_refinement.md and inspect the current run proof implementation.

Implement Phase 1 only.

Goals:
1. Clarify the shared run-proof modal without changing backend route contracts.
2. Make Screenshot and Strava source behavior clearer.
3. Make Strava explicitly single-target until a multi-target backend contract is added.
4. Improve event target labels for standard submissions, rejected resubmissions, accumulated challenges, and Personal Record.
5. Preserve existing form field names, route paths, CSRF behavior, upload behavior, OCR hidden fields, and successful submission flows.
6. Add or update focused modal tests only where existing patterns support it.

After implementation, summarize:
- Files changed
- Behavior changed
- Tests added or updated
- Verification commands run
- Follow-up phases still pending
```
