# HelloRun Auto-Approved Run Proof Criteria

This document is the implementation reference for OCR-based run proof auto-approval in HelloRun.

It intentionally separates the behavior that exists in the current web app from planned implementation requirements. Current behavior should be preserved unless a future task explicitly changes it.

## Implementation Summary

The auto-approval implementation is now complete for the planned OCR and first synced-source slices:

- Standard one-time submissions now block auto-approval when the detected proof distance is below the resolved category minimum distance.
- The runner submit-review overlay now warns when a standard event proof is below the minimum distance and confirms that the proof will go to organiser review.
- Standard submissions persist structured `validation` metadata for method, eligibility, review requirement, review reason, submission mode, detected distance, and minimum required distance.
- Admin and organiser review surfaces show readable labels and descriptions for `validation.reviewReason`.
- Accumulated activity submissions can auto-approve when clean OCR criteria pass.
- Accumulated challenge certificates are issued only when approved accumulated progress reaches the runner's selected registration target distance.
- Strava submissions use a separate synced-source validation path and can auto-approve when source validation and event rules pass.

Verification completed:

- `node --test tests/submission.service.test.js`
- `node --test tests/submission-review-labels.test.js tests/submission.service.test.js`
- `node --test tests/submission.service.test.js tests/strava-integration.test.js`
- `node --test tests/runner-dashboard-modal.test.js tests/run-proof-integrity.test.js`
- `node --check src/public/js/run-proof-modal.js`
- `node --check src/services/submission.service.js`
- `node --check src/services/accumulated-activity.service.js`
- `node --check src/models/Submission.js`
- `node --check src/utils/submission-review-labels.js`
- `node --check src/controllers/admin.controller.js`
- `node --check src/routes/organizer.routes.js`

## Current App Behavior

Auto-approval currently applies only to standard `Submission` records and personal record submissions created through the standard submission service.

Implemented behavior:

- Standard event submissions can be auto-approved during create or rejected-result resubmit flows.
- Personal record submissions can be auto-approved through the same OCR path.
- `AccumulatedActivitySubmission` records can be auto-approved when clean OCR criteria pass.
- Auto-approved submissions use `reviewedBy = null` to indicate system approval.
- Auto-approved submissions use `reviewNotes = "Auto-approved from OCR name match."`
- Normal event auto-approval issues a certificate.
- Personal record auto-approval does not issue a certificate.
- Standard one-time event submissions are blocked from auto-approval when the detected proof distance is below the derived category minimum distance.
- Standard submissions persist structured `validation` metadata with method, auto-approval eligibility, review requirement, review reason, submission mode, detected distance, and minimum required distance.
- Admin and organiser review surfaces display readable labels for `validation.reviewReason`.
- Strava submissions follow a separate synced-source validation path and can auto-approve without OCR name matching when source validation passes.

Current code references:

- `src/services/submission.service.js`
- `src/utils/submission-integrity.js`
- `src/services/accumulated-activity.service.js`

## Current Auto-Approval Criteria

A standard or personal record submission is auto-approved only when all of these conditions are true:

```text
status === "submitted"
ocrData.nameMatchStatus === "matched"
ocrData.extractedDistanceKm > 0
ocrData.extractedTimeMs > 0
ocrData.confidence >= 0.7
ocrData.distanceMismatch === false
ocrData.timeMismatch === false
ocrData.elevationMismatch === false
ocrData.stepsMismatch === false
ocrData.dateMismatch === false
ocrData.locationMismatch === false
ocrData.runTypeMismatch === false
suspiciousFlag === false
```

When any condition fails, the submission remains `submitted` for organiser or admin review.

## OCR Field Meanings

Current OCR data is stored on `ocrData`:

- `ocrData.extractedDistanceKm`: distance extracted from the uploaded proof screenshot.
- `ocrData.extractedTimeMs`: duration extracted from the uploaded proof screenshot.
- `ocrData.confidence`: OCR confidence score from `0` to `1`.
- `ocrData.detectedSource`: detected app/source label, such as `strava`, `nike`, `garmin`, `apple`, `google`, `unknown`, or blank.
- `ocrData.extractedName`: name candidate extracted from the proof.
- `ocrData.nameMatchStatus`: one of `matched`, `mismatched`, `not_detected`, or `not_checked`.
- `ocrData.nameMismatchAcknowledged`: whether the runner acknowledged a detected name mismatch in the UI.

The server recomputes sensitive checks and does not blindly trust client-submitted mismatch values.

## Current Mismatch Checks

Auto-approval is blocked when any of these mismatch flags are true:

- `ocrData.distanceMismatch`
- `ocrData.timeMismatch`
- `ocrData.elevationMismatch`
- `ocrData.stepsMismatch`
- `ocrData.dateMismatch`
- `ocrData.locationMismatch`
- `ocrData.runTypeMismatch`

Current thresholds:

- Distance mismatch: OCR distance differs from submitted distance by more than `max(submittedDistance * 10%, 0.5 km)`.
- Time mismatch: OCR time differs from submitted elapsed time by more than `60 seconds`.
- Elevation mismatch: for strong OCR confidence, OCR elevation differs from submitted elevation by more than `max(ocrElevation * 50%, 100 m)`.
- Steps mismatch: for strong OCR confidence, OCR steps differ from submitted steps by more than `max(ocrSteps * 30%, 1000 steps)`.
- Date mismatch: OCR date and submitted date differ by more than one day.
- Location mismatch: for strong OCR confidence, OCR location and submitted location have no meaningful token overlap.
- Run type mismatch: OCR activity type differs from submitted run type.

Strong OCR confidence currently means `ocrData.confidence >= 0.7`.

## Current Suspicious Checks

A submission with `suspiciousFlag === true` is never auto-approved.

Current suspicious checks include:

- Distance over `200 km`.
- Pace faster than `2 min/km`.
- Duration over `24 hours`.
- High-confidence OCR distance mismatch.
- High-confidence OCR time mismatch.
- High-confidence OCR elevation mismatch.
- High-confidence OCR steps mismatch.
- OCR activity date mismatch.
- OCR activity location mismatch.
- OCR activity type mismatch.
- Unusually high elevation per kilometer:
  - more than `200 m/km` for `run` or `walk`
  - more than `300 m/km` for `hike` or `trail_run`
- Implausible steps per kilometer: less than `500` or more than `3000`.
- Implausible step cadence: less than `20` or more than `240` steps per minute.
- OCR name mismatch when an extracted name exists.

Suspicious does not mean the proof is automatically invalid. It means the system must keep the submission available for organiser or admin review.

## Current Distance Handling

The current standard auto-approval path verifies that OCR distance is present, positive, and not mismatched against the submitted form distance.

The current standard auto-approval path also compares the detected proof distance against the derived registered category minimum distance when one can be resolved.

Minimum distance resolution prefers:

```text
registration.pricingSnapshot.raceCategoryId -> matching event.raceCategories[].distanceKm
registration.pricingSnapshot.raceDistance or registration.raceDistance -> matching category distance
registration.pricingSnapshot.raceDistance or registration.raceDistance -> parsed distance label such as 5K or 10 km
event.targetDistanceKm fallback
```

If the detected OCR distance is available, it is used for this check. Otherwise the submitted form distance is used. When the detected/submitted distance is below the resolved minimum, the submission remains `submitted`, `suspiciousFlag` is set to true, and auto-approval is blocked.

For accumulated-distance events:

- `AccumulatedActivitySubmission` auto-approves when the same clean OCR criteria pass.
- Accumulated activities remain `submitted` when OCR is missing, below threshold, mismatched, or suspicious.
- Pending accumulated activities still require organiser or admin review.
- `minimumActivityDistanceKm` is enforced before save when configured.
- If `minimumActivityDistanceKm` is not configured, any valid positive activity distance can be submitted.
- Certificate generation for accumulated challenges happens only after approved total progress reaches the selected registration target distance.

## Current Auto-Approval Result

When all current criteria pass, HelloRun updates the submission:

```text
status = approved
reviewedAt = current date and time
reviewedBy = null
reviewNotes = "Auto-approved from OCR name match."
rejectionReason = ""
```

For normal event submissions, the system also attempts to issue a certificate.

For personal record submissions, the system auto-approves but does not issue an event certificate.

The system also records a critical audit event with:

```text
action = submission.auto_approved
statusFrom = submitted
statusTo = approved
```

## Implemented Requirements And Future Refinements

The following requirements are implemented unless a subsection explicitly marks remaining future refinement.

### One-Time Minimum Distance Gate

The first implementation slice is complete at service level: standard one-time submissions now block auto-approval when the detected proof distance is below the resolved category minimum.

Remaining future refinements:

- Add an explicit tolerance policy instead of requiring `detectedDistanceKm >= minimumRequiredDistanceKm`.

Current implemented behavior:

```text
IF submissionMode = one_time
AND ocrData.extractedDistanceKm >= minimumRequiredDistanceKm
AND all current OCR and suspicious checks pass
THEN auto-approval may proceed
```

If the OCR distance is below the minimum required distance, the submission must not be auto-approved.

### Below-Minimum Confirmation Modal

If a one-time submission appears below the minimum required distance, the runner should see a confirmation modal before submission.

The modal should explain:

- The event uses one-time submission rules.
- The detected distance is below the required minimum.
- The proof will not be auto-approved.
- The proof will be sent for organiser review.
- The runner can cancel and upload another proof.

Suggested modal title:

```text
Run proof does not meet the minimum distance
```

Suggested modal actions:

```text
Cancel and Upload Another Proof
Submit for Review
```

The first runner UI slice is complete: the existing submit-review modal changes its title, description, warning row, and actions when a selected standard event is below the minimum distance.

If the runner confirms, the submission is saved as `submitted` and kept out of auto-approval by server-side validation.

Recommended review reason:

```text
below_minimum_distance_one_time_submission
```

Recommended review note:

```text
Submitted for organiser review because the OCR-detected distance is below the minimum required distance for a one-time submission.
```

### Structured Validation Metadata

The standard submission implementation now persists structured validation metadata instead of relying only on `ocrData`, `suspiciousFlag`, and free-form review notes.

Current shape:

```js
{
  validation: {
    method: "ocr",
    autoApprovalEligible: false,
    reviewRequired: true,
    reviewReason: "below_minimum_distance_one_time_submission",
    submissionMode: "one_time",
    detectedDistanceKm: 7.8,
    minimumRequiredDistanceKm: 9.95
  }
}
```

Current `validation.reviewReason` values include:

```text
below_minimum_distance_one_time_submission
suspicious_activity
strava_review_required
strava_auto_approval_criteria_not_met
manual_upload_review_required
ocr_name_not_matched
ocr_distance_missing
ocr_time_missing
ocr_confidence_below_threshold
ocr_auto_approval_criteria_not_met
```

This metadata is currently stored on `Submission`. It is not yet implemented for `AccumulatedActivitySubmission`.

Readable review reason labels are shown in:

```text
Admin review queue
Organiser registrants table
Standalone organiser/admin submission review page
```

### Accumulated Activity Auto-Approval

Accumulated activity auto-approval is implemented for clean OCR submissions.

Current behavior:

```text
IF submissionMode = accumulated
AND ocrData.extractedDistanceKm > 0
AND minimumActivityDistanceKm passes when configured
AND OCR confidence passes
AND OCR name match passes
AND OCR time is valid
AND mismatch flags are false
AND suspiciousFlag is false
THEN the activity may be auto-approved as partial progress
```

Certificate behavior for accumulated events remains completion-based:

- Do not issue a certificate for every approved partial activity.
- Issue the certificate only when approved accumulated progress reaches the target distance and event rules allow certificate issuance.

### Synced Source Validation

Synced sources now follow a separate validation path. Strava is implemented first.

Current hierarchy:

```text
Synced source validation
OCR-based validation
Manual organiser review
```

Current Strava validation checks:

- The Strava activity must belong to the runner's connected Strava account.
- The activity must have positive distance.
- The activity must have positive elapsed or moving time.
- The activity type must map to a supported HelloRun run type.
- The activity date must be inside the event activity window.
- The activity type must be allowed by the event when accepted run types are configured.
- The activity must meet `minimumActivityDistanceKm` when configured.
- Duplicate Strava activity submissions are rejected.
- Standard one-time submissions still use the resolved category minimum-distance auto-approval gate.

When those source checks pass and no integrity or minimum-distance flags are raised, Strava submissions can auto-approve even when `ocrData.nameMatchStatus` is `not_checked`.

This applies to:

```text
standard event submissions
personal record submissions
accumulated activity submissions
```

Future synced providers such as Garmin or COROS should use the same source-validation pattern before being allowed into auto-approval.

## Examples

### Current Standard Submission That Auto-Approves

```text
Submission status: submitted
OCR name match: matched
OCR distance: 10.02 km
Submitted form distance: 10.00 km
OCR time: 56:12
Submitted form time: 56:12
OCR confidence: 0.84
Mismatch flags: none
Suspicious flag: false
```

Result:

```text
status = approved
reviewedBy = null
reviewNotes = "Auto-approved from OCR name match."
certificate = issued
```

### Current Personal Record That Auto-Approves

```text
Submission type: personal_record
Submission status: submitted
OCR name match: matched
OCR distance: 10.02 km
OCR time: 56:12
OCR confidence: 0.84
Mismatch flags: none
Suspicious flag: false
```

Result:

```text
status = approved
reviewedBy = null
reviewNotes = "Auto-approved from OCR name match."
certificate = not issued
```

### Current Accumulated Activity Pending Review

```text
Event mode: accumulated_distance
OCR name match: matched
OCR distance: 8.20 km
OCR time: 52:30
OCR confidence: 0.83
Mismatch flags: none
Suspicious flag: false
```

Current result:

```text
status = submitted
certificate = not issued
organiser/admin review required
```

### Current Accumulated Activity Auto-Approval

```text
Event mode: accumulated_distance
OCR name match: matched
OCR distance: 8.20 km
OCR time: 52:30
OCR confidence: 0.83
Mismatch flags: none
Suspicious flag: false
```

Current result:

```text
status = approved
distance added to accumulated total
certificate issued only if approved total reaches target distance
```

### Current One-Time Below-Minimum Submission

```text
Event category: 10K
Submission mode: one_time
Minimum required distance: 9.95 km
OCR detected distance: 7.80 km
OCR confidence: 0.86
OCR name match: matched
Suspicious flag: false
```

Current result:

```text
Show confirmation modal
Do not auto-approve
Allow runner to submit for organiser review
reviewReason = below_minimum_distance_one_time_submission
certificate = not issued
```

## Documentation-Ready Summary

HelloRun currently supports OCR-based and Strava synced-source auto-approval for standard event submissions, personal record submissions, and accumulated activity submissions. OCR submissions may be auto-approved only when they remain in `submitted` status, the OCR name match status is exactly `matched`, OCR extracted distance and time are present and greater than zero, OCR confidence is at least `0.7`, all OCR mismatch flags are false, and `suspiciousFlag` is false. Strava submissions may be auto-approved when the connected-account source validation passes, the activity has valid distance and duration, event rules pass, duplicate checks pass, and no integrity or minimum-distance flags are raised.

The current mismatch checks include distance, time, elevation, steps, date, location, and run type mismatches. The current suspicious checks include distance over `200 km`, pace faster than `2 min/km`, duration over `24 hours`, high-confidence OCR mismatches, unusually high elevation per kilometer, implausible steps per kilometer, implausible steps per minute, and OCR name mismatch.

Current standard auto-approval compares proof distance against the resolved registered category minimum distance when available, persists structured validation metadata, and displays readable review reason labels to reviewers. Accumulated activity submissions can now auto-approve when clean OCR or valid Strava source criteria pass. Configured `minimumActivityDistanceKm` is still enforced before save, and accumulated certificates are issued only when approved total progress reaches the target distance.

When all current criteria pass, HelloRun sets the submission status to `approved`, records `reviewedAt`, leaves `reviewedBy` as `null`, and stores the review note `Auto-approved from OCR name match.` Normal event submissions receive certificates after auto-approval. Personal record submissions can be auto-approved but do not receive event certificates.

Future synced providers such as Garmin or COROS should follow the Strava source-validation pattern before being allowed into auto-approval.

## Test Plan For Future Implementation

When extending this area further, add or update tests for:

- Standard one-time submission below required distance remains `submitted`.
- Standard one-time submission meeting required distance can auto-approve.
- Below-minimum modal fields are submitted and persisted.
- Accumulated activity auto-approves when clean OCR criteria pass.
- Accumulated completion issues a certificate only when approved total reaches the target distance.
- Existing OCR auto-approval tests remain green.

For this documentation alignment, verification is manual review of this file plus a scan for broken encoding and outdated field names.
