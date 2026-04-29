# HelloRun OCR Smart Activity Submission

## Document Role

This document defines the planned OCR-based smart activity submission system for HelloRun.

It is a dedicated planning and implementation reference for screenshot-based activity proof uploads, auto-filled activity details, confidence scoring, and review support.

## Implementation Status - Apr 29, 2026

The current implementation has moved the run-proof OCR flow from draft planning into an MVP trust layer for the existing result submission modal.

Implemented:

- Browser-side OCR is integrated into the shared run-proof modal.
- OCR can auto-fill distance, duration, run date, location, elevation gain, steps, and activity type when those values are detected.
- Runners can edit OCR-filled values before submission.
- OCR metadata is submitted and stored with the final confirmed values.
- The frontend comparison helper lives in `src/public/js/run-proof-integrity.js`.
- The backend suspicious-entry helper lives in `src/utils/submission-integrity.js`.
- Suspicious conditions are flag-only: submissions are saved, but flagged submissions are held for organizer/admin review and are not auto-approved.
- Organizer/admin review surfaces show detailed suspicious reasons and OCR-vs-submitted values.
- Runner-facing pages use neutral wording for suspicious or duplicate proof states.

Recent OCR parser recovery:

- Compact Strava duration formats are supported: `27m 48s`, `31m38s`, `1h47m`, and OCR-noisy `1h47/m`.
- Pace values such as `5:33/km` are excluded from elapsed-time parsing.
- Strava location extraction ignores `Strava App` and looks for nearby real place text.
- Strava layout signals can override Garmin device labels, so a Strava activity that mentions a Garmin watch is still treated as Strava.
- Replacing, dropping, removing, or resubmitting a different screenshot clears stale editable fields such as `steps` before the new OCR result is applied.

Current validation commands recorded:

- `node --test --test-concurrency=1 tests/ocr-proof-reader.test.js`
- `node --test --test-concurrency=1 tests/run-proof-integrity.test.js`
- `node --test --test-concurrency=1 tests/runner-dashboard-modal.test.js`
- `node --test --test-concurrency=1 tests/submission-routes.test.js`

---

Main PRD reference: `docs/PRD.md`

Recommended file path:

```text
/docs/ocr_smart_submission.md
```

---

## Purpose

HelloRun currently supports activity proof submission through user-entered details and uploaded evidence.

The OCR Smart Activity Submission feature improves this process by allowing users to upload screenshots from fitness and health apps. The system reads the screenshot, extracts activity details, auto-fills the submission form, and lets the user review or correct the values before submitting.

This feature supports HelloRun’s broader direction as a movement platform, not only a running event platform.

---

## Product Goal

Allow users to submit activity proof faster and with fewer manual steps.

The system should:

- read uploaded screenshots
- identify the source app when possible
- extract activity data from the image
- auto-fill the activity submission form
- allow the user to correct detected values
- store the original screenshot and OCR metadata
- support organizer/admin review
- flag suspicious or low-confidence entries

---

## Supported Activity Types

HelloRun should support OCR-based uploads for the following activity types:

- Run
- Walk
- Trail Run
- Hike
- Steps

This is important because HelloRun is not limited to traditional road running. Some users may submit walking activity, hiking proof, trail runs, or daily step counts.

---

## Target Users

### Runners

Users who participate in virtual races or running events and need to submit distance, time, and proof.

### Walkers

Users who join walking challenges or wellness events.

### Trail Runners

Users who submit activity from trail routes where elevation, duration, and GPS proof may matter.

### Hikers

Users who join hiking-based activities, outdoor challenges, or community events.

### Step Challenge Users

Users who do not necessarily record workouts but track steps through health apps.

This includes office workers, students, beginners, and casual users.

---

## Target Screenshot Sources

### Phase 1 Priority

These sources should be prioritised first because they are likely to be relevant to users in the Philippines and are common among runners, walkers, and mobile-first fitness users.

- Strava
- Samsung Health
- Google Fit
- Nike Run Club
- Garmin Connect

### Phase 2 Priority

These can be added after Phase 1 patterns are stable.

- adidas Running
- Map My Run
- Huawei Health
- Xiaomi / Mi Fitness
- Apple Fitness

### Future Sources

- Coros
- Polar Flow
- Fitbit
- Suunto
- Amazfit / Zepp
- Other local or device-specific health apps

---

## Why This Feature Matters

Manual activity entry creates friction.

Users may need to type:

- distance
- duration
- pace
- step count
- calories
- date
- source app

This is repetitive, especially for mobile users.

OCR smart upload reduces effort by reading the screenshot and auto-filling fields.

This can improve:

- submission completion rate
- user experience
- mobile usability
- event participation
- trust and auditability
- future leaderboard accuracy

---

## Product Positioning

The feature supports this broader product direction:

```text
HelloRun is a movement platform for recording, recognising, ranking, and rewarding run, walk, trail, hike, and step-based activities.
```

It should not position HelloRun as a replacement for Strava, Garmin, Samsung Health, or Google Fit.

Instead, HelloRun should act as a local participation, challenge, ranking, and rewards platform that can accept proof from apps users already use.

---

## Recommended OCR Approach

### Frontend-First OCR

Use browser-side OCR as the first implementation approach.

Recommended library:

- Tesseract.js

Tesseract.js is a JavaScript and WebAssembly OCR library that can run in the browser and Node.js.

Reference:

```text
https://github.com/naptha/tesseract.js
```

### Why Frontend-First Works

Frontend OCR is suitable for the first version because:

- it reduces server processing cost
- it gives faster feedback to users
- it avoids sending the image for OCR before user confirmation
- it works well for a prototype and MVP
- it can run directly in the browser

### Limitations

Frontend OCR may be slower on older phones.

Accuracy may be affected by:

- low-resolution screenshots
- dark mode screenshots
- cropped screenshots
- screenshots with overlays
- unusual layouts
- small fonts
- mixed languages
- app UI redesigns

Because of this, users must always be allowed to review and edit extracted values.

---

## Alternative OCR Options

### PaddleOCR Browser-Based Implementation

Potential future option for better OCR accuracy.

Reference:

```text
https://github.com/xulihang/paddleocr-browser
```

### Ocrad.js

A lighter JavaScript OCR experiment that may be useful for comparison or simple proof-of-concept tests.

Reference:

```text
https://github.com/antimatter15/ocrad.js
```

### Backend OCR

A future version may process screenshots on the backend using:

- Python OCR services
- cloud OCR APIs
- AI-based image understanding
- server-side PaddleOCR
- document/image parsing services

Backend OCR should only be considered if frontend OCR cannot meet accuracy or performance needs.

---

## Proposed User Flow

1. User opens the activity submission modal.
2. User selects activity type:
   - Run
   - Walk
   - Trail Run
   - Hike
   - Steps
3. User uploads a screenshot.
4. Frontend previews the uploaded image.
5. OCR reads the screenshot.
6. Parser extracts possible values.
7. Form fields are auto-filled.
8. User reviews the detected details.
9. User edits incorrect or missing values.
10. User submits the activity proof.
11. Backend stores the final confirmed values.
12. Backend stores OCR metadata for audit.
13. Organizer/admin reviews the submission when required.
14. Approved submissions become eligible for certificates, badges, rankings, or rewards.

---

## Supported Submission Modes

### OCR Upload Mode

User uploads a screenshot and HelloRun attempts to auto-fill the activity details.

### Manual Entry Mode

User manually enters activity details if OCR fails or if the screenshot is unsupported.

### Hybrid Mode

OCR extracts some fields and the user manually completes missing fields.

This should be the default practical behaviour.

---

## Activity Classification Workflow

Before HelloRun extracts final values, the system should classify what kind of activity the screenshot represents.

The classification step prevents a walk, hike, trail activity, or step-count screenshot from being incorrectly treated as a standard run.

### Classification Goal

Classify the uploaded proof into one of these activity types:

- Run
- Walk
- Trail Run
- Hike
- Steps
- Unknown / Needs Manual Selection

### Classification Inputs

The system should use multiple signals instead of relying on one field only.

Inputs include:

- event or challenge type
- user-selected activity type
- OCR raw text
- detected source app
- detected keywords
- distance
- duration
- pace or speed
- step count
- elevation gain
- route or location text
- confidence score

### Classification Order

Use this order to avoid wrong assumptions.

1. Check event or challenge rules.
   - If the event only accepts runs, default classification is `Run`.
   - If the event only accepts steps, default classification is `Steps`.
   - If the event accepts multiple categories, continue to the next checks.

2. Check the user-selected activity type.
   - The form should ask the user to select Run, Walk, Trail Run, Hike, or Steps before or during upload.
   - OCR may suggest a correction, but the user should be able to confirm or change it.

3. Check source app labels.
   - Some apps show activity labels such as `Run`, `Walk`, `Trail Run`, `Hiking`, or `Steps`.
   - These labels should increase classification confidence.

4. Check OCR keywords.
   - Search the OCR raw text for activity-specific terms.

5. Check numerical patterns.
   - Use pace, speed, distance, duration, steps, and elevation to support classification.
   - Numerical patterns should not override clear app labels unless values are impossible or suspicious.

6. Check required fields.
   - If the screenshot mainly contains a step count, classify as `Steps`.
   - If it contains distance and time but no steps, classify as Run, Walk, Trail Run, or Hike depending on labels and pace.

7. Assign classification confidence.
   - High confidence means the system can auto-select the activity type.
   - Medium confidence means the system suggests the activity type.
   - Low confidence means the user must manually select the activity type.

8. Ask for user confirmation.
   - The final activity type must be visible before submission.
   - The user must be able to correct the classification.

---

## Activity Classification Rules

### Run Classification

Classify as `Run` when most of these signals are present:

- OCR text contains `run`, `running`, `morning run`, `evening run`, or similar labels
- source app is a running app such as Strava, Nike Run Club, Garmin Connect, or adidas Running
- screenshot contains distance and duration
- pace is shown in minutes per kilometre or minutes per mile
- pace is within a realistic running range
- no strong trail or hike keywords are present

Suggested keyword patterns:

```js
const runKeywords = [
  /\brun\b/i,
  /running/i,
  /morning run/i,
  /evening run/i,
  /race/i
];
```

Suggested supporting values:

- distance is greater than 0
- duration exists
- pace exists or can be computed
- computed pace is plausible for the event category

### Walk Classification

Classify as `Walk` when most of these signals are present:

- OCR text contains `walk`, `walking`, or `outdoor walk`
- screenshot contains distance and duration
- step count may also be present
- pace is slower than typical running pace
- event or challenge allows walking

Suggested keyword patterns:

```js
const walkKeywords = [
  /\bwalk\b/i,
  /walking/i,
  /outdoor walk/i,
  /brisk walk/i
];
```

### Trail Run Classification

Classify as `Trail Run` when most of these signals are present:

- OCR text contains `trail run`, `trail running`, or `trail`
- source app labels the activity as trail running
- screenshot includes distance and duration
- elevation gain is visible or unusually relevant
- route/location text suggests mountain, park, forest, trail, or off-road activity

Suggested keyword patterns:

```js
const trailRunKeywords = [
  /trail run/i,
  /trail running/i,
  /\btrail\b/i,
  /elevation gain/i,
  /vert/i
];
```

Important distinction:

- `Trail Run` should still require run-like movement data.
- If the screenshot shows hiking labels instead of running labels, classify as `Hike`.

### Hike Classification

Classify as `Hike` when most of these signals are present:

- OCR text contains `hike`, `hiking`, `trek`, or `mountain`
- screenshot includes elevation gain
- duration is long compared with distance
- route/location text suggests a mountain, trail, campsite, summit, or outdoor destination
- pace is slower than typical running pace

Suggested keyword patterns:

```js
const hikeKeywords = [
  /\bhike\b/i,
  /hiking/i,
  /trek/i,
  /mountain/i,
  /summit/i,
  /elevation gain/i
];
```

### Steps Classification

Classify as `Steps` when most of these signals are present:

- OCR text contains `steps`, `step count`, or `daily steps`
- screenshot mainly shows a step total
- screenshot may come from Samsung Health, Google Fit, Apple Fitness, Huawei Health, or Xiaomi / Mi Fitness
- distance and calories may exist, but duration and pace may be missing
- activity is tied to a day rather than a recorded workout session

Suggested keyword patterns:

```js
const stepKeywords = [
  /steps/i,
  /step count/i,
  /daily steps/i,
  /today/i
];
```

Important distinction:

- A step screenshot should not automatically qualify for a race result unless the event explicitly allows step-based submissions.
- Step submissions are better suited for wellness challenges, walking challenges, or daily movement challenges.

---

## Classification Confidence Scoring

Activity classification should have its own confidence score separate from OCR text confidence.

Suggested scoring factors:

| Signal | Suggested Weight | Example |
|---|---:|---|
| Exact activity keyword | 30 | `Trail Run`, `Hiking`, `Steps` |
| User-selected type matches OCR | 20 | User selected Run and OCR says Run |
| Source app supports detected type | 10 | Nike Run Club suggests Run |
| Required fields match type | 20 | Steps has step count, Run has distance and duration |
| Numerical pattern supports type | 10 | Walk pace is slower than run pace |
| Event/challenge accepts type | 10 | Step challenge accepts Steps |

Suggested interpretation:

| Score | Classification Behaviour |
|---|---|
| 85 to 100 | Auto-select type and show as high confidence |
| 65 to 84 | Suggest type and ask user to confirm |
| 40 to 64 | Show possible type but require manual confirmation |
| Below 40 | Set as Unknown and require user selection |

---

## Classification Pseudocode

```js
function classifyActivity({
  eventRules,
  userSelectedType,
  sourceApp,
  ocrText,
  parsedValues
}) {
  const text = String(ocrText || '').toLowerCase();

  const signals = {
    run: 0,
    walk: 0,
    trailRun: 0,
    hike: 0,
    steps: 0
  };

  if (/steps|step count|daily steps/.test(text)) signals.steps += 30;
  if (/trail run|trail running/.test(text)) signals.trailRun += 35;
  if (/hike|hiking|trek|summit/.test(text)) signals.hike += 30;
  if (/\brun\b|running|morning run|evening run/.test(text)) signals.run += 30;
  if (/\bwalk\b|walking|outdoor walk/.test(text)) signals.walk += 30;

  if (parsedValues.steps) signals.steps += 20;
  if (parsedValues.distanceKm && parsedValues.duration) {
    signals.run += 10;
    signals.walk += 10;
    signals.trailRun += 10;
    signals.hike += 10;
  }

  if (parsedValues.elevationGain) {
    signals.trailRun += 10;
    signals.hike += 15;
  }

  if (userSelectedType && signals[userSelectedType] !== undefined) {
    signals[userSelectedType] += 20;
  }

  for (const type of Object.keys(signals)) {
    if (!eventRules.allowedActivityTypes.includes(type)) {
      signals[type] -= 50;
    }
  }

  const sorted = Object.entries(signals).sort((a, b) => b[1] - a[1]);
  const [bestType, score] = sorted[0];

  return {
    suggestedType: score >= 40 ? bestType : 'unknown',
    classificationConfidence: Math.max(0, Math.min(100, score)),
    requiresUserConfirmation: score < 85
  };
}
```

---

## Classification UI Behaviour

### High Confidence

Show:

```text
Detected activity type: Run
```

Allow the user to change it.

### Medium Confidence

Show:

```text
This looks like a Walk. Please confirm before submitting.
```

### Low Confidence

Show:

```text
We could not confidently identify the activity type. Please select one.
```

### Conflict Case

Example:

- user selected `Run`
- OCR detects `Walk`

Show:

```text
Your selected activity type is Run, but the screenshot appears to show Walk. Please confirm the correct type.
```

---

## Fields to Extract

### Common Fields

These fields may apply to all activity types:

- source app
- activity type
- activity date
- distance
- duration
- calories
- screenshot hash
- OCR confidence
- parser confidence

### Run / Walk / Trail Run / Hike Fields

- distance
- elapsed time
- moving time
- pace
- elevation gain
- route or location if visible
- calories
- date

### Step-Based Fields

- step count
- estimated distance
- calories
- date
- source app

---

## Example OCR Output

### Raw OCR Text Example

```text
STRAVA
Morning Run
5.02 km
29:44
5:55 /km
Apr 27, 2026
```

### Parsed Result Example

```json
{
  "sourceApp": "Strava",
  "activityType": "run",
  "distanceKm": 5.02,
  "duration": "29:44",
  "pace": "5:55/km",
  "activityDate": "2026-04-27"
}
```

---

## Step Count OCR Example

### Raw OCR Text Example

```text
Samsung Health
Today
8,421 steps
6.1 km
312 kcal
```

### Parsed Result Example

```json
{
  "sourceApp": "Samsung Health",
  "activityType": "steps",
  "steps": 8421,
  "distanceKm": 6.1,
  "calories": 312,
  "activityDate": "2026-04-27"
}
```

---

## Parsing Rules

OCR output is usually messy.

The parser should use pattern matching, keyword matching, and value validation.

### Distance Pattern

```js
/(\d+(\.\d+)?)\s?(km|kilometers|kilometres|mi|miles)/i
```

### Duration Pattern

```js
/(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})/
```

### Pace Pattern

```js
/(\d{1,2}:\d{2})\s?\/?\s?(km|mi)/i
```

### Steps Pattern

```js
/(\d{1,3}(,\d{3})+|\d+)\s?(steps|step)/i
```

### Calories Pattern

```js
/(\d+)\s?(cal|kcal|calories)/i
```

### Elevation Pattern

```js
/(\d+(\.\d+)?)\s?(m|meters|metres|ft|feet)\s?(gain|elevation|elev)/i
```

---

## Source App Detection

The system should detect the source app using keywords in the OCR text.

Example logic:

```js
const sourcePatterns = [
  { app: "Strava", patterns: [/strava/i] },
  { app: "Samsung Health", patterns: [/samsung health/i] },
  { app: "Google Fit", patterns: [/google fit/i, /\bfit\b/i] },
  { app: "Nike Run Club", patterns: [/nike run club/i, /\bnrc\b/i] },
  { app: "Garmin Connect", patterns: [/garmin/i, /garmin connect/i] },
  { app: "adidas Running", patterns: [/adidas running/i, /runtastic/i] },
  { app: "Map My Run", patterns: [/map my run/i, /under armour/i] }
];
```

---

## Confidence Scoring

Confidence should not depend only on OCR engine confidence.

Use combined scoring based on:

- OCR engine confidence
- source app detection
- required field completeness
- value sanity checks
- duplicate screenshot result
- user corrections

### Suggested Confidence Levels

| Score | Meaning | System Behaviour |
|---|---|---|
| 90 to 100 | High confidence | Auto-fill trusted, normal user review |
| 70 to 89 | Medium confidence | Auto-fill allowed, user confirmation required |
| 50 to 69 | Low confidence | Manual correction required |
| Below 50 | Very low confidence | Manual entry recommended |

---

## Required Fields by Activity Type

### Run

Required:

- distance
- duration
- activity date
- screenshot proof

Optional:

- pace
- calories
- elevation gain
- source app

### Walk

Required:

- distance or steps
- duration or activity date
- screenshot proof

Optional:

- pace
- calories
- source app

### Trail Run

Required:

- distance
- duration
- activity date
- screenshot proof

Recommended:

- elevation gain
- source app

### Hike

Required:

- distance or duration
- activity date
- screenshot proof

Recommended:

- elevation gain
- route/location if available
- calories

### Steps

Required:

- step count
- activity date
- screenshot proof

Optional:

- distance
- calories
- source app

---

## Validation Rules

### Distance Validation

- Must be greater than 0.
- Must not exceed event/category limit unless the event allows over-distance submissions.
- Must match the registered distance if the event requires a fixed distance.
- Miles should be converted to kilometres for storage consistency.

### Duration Validation

- Must use a valid time format.
- Accepted formats:
  - `MM:SS`
  - `HH:MM:SS`
- Must not create impossible pace.

### Pace Validation

Flag suspicious values when:

- road run pace is faster than realistic human performance
- walk pace is unrealistically fast
- hike speed is unrealistic given elevation or distance
- pace does not match distance and duration

### Steps Validation

- Must be a positive number.
- Must match the challenge period.
- Must not duplicate the same screenshot/date entry.
- Should not be accepted for a race category unless the event allows step-based participation.

### Date Validation

- Activity date must fall within the event or challenge window.
- Future activity dates should be rejected.
- Very old activity dates should be flagged unless the event allows backdated submissions.

---

## Anti-Cheat Checks

### MVP Checks

The first version should include these checks:

- duplicate screenshot hash
- duplicate OCR raw text
- same user submitting identical distance/time/date repeatedly
- impossible pace
- screenshot date outside event/challenge window
- missing source app
- low OCR confidence
- required fields missing

### Future Checks

Future versions may include:

- image metadata review
- screenshot tampering signals
- AI-assisted suspicious entry review
- pattern-based user risk score
- device/app consistency tracking
- repeated screenshot layout reuse
- pixel-level image similarity matching

---

## Screenshot Hashing

Each uploaded screenshot should generate a hash.

Purpose:

- detect exact duplicate uploads
- prevent the same image from being reused
- support review audit

Recommended storage field:

```text
screenshotHash
```

If the same hash already exists for the same event or challenge, flag the submission.

Possible flag:

```text
duplicate_screenshot
```

---

## Review Flags

Suggested review flags:

```text
duplicate_screenshot
low_confidence
missing_required_fields
impossible_pace
date_outside_window
source_app_unknown
manual_edit_after_ocr
ocr_failed
steps_outside_challenge_window
unsupported_screenshot_source
```

These flags should help organizers and admins decide whether to approve, reject, or request correction.

---

## Data Model Draft

### ActivitySubmission

```json
{
  "userId": "",
  "eventId": "",
  "registrationId": "",
  "activityType": "run",
  "sourceApp": "Strava",
  "distanceKm": 5.02,
  "duration": "29:44",
  "pace": "5:55/km",
  "steps": null,
  "calories": 320,
  "elevationGain": null,
  "activityDate": "2026-04-27",
  "screenshotUrl": "",
  "screenshotHash": "",
  "ocrRawText": "",
  "ocrConfidence": 92,
  "parserConfidence": 88,
  "verificationStatus": "submitted",
  "reviewFlags": [],
  "userCorrectedFields": [],
  "submittedAt": "",
  "reviewedAt": "",
  "reviewedBy": ""
}
```

---

## Possible Model Strategy

HelloRun already has a `Submission` model.

There are two possible implementation approaches.

### Option A: Extend Existing Submission Model

Add OCR fields to the existing `Submission` model.

Best when OCR is only used for event result proof submission.

Pros:

- fewer models
- easier integration with existing Phase 5 workflow
- less controller restructuring

Cons:

- may become overloaded when step challenges, hikes, and non-event activities expand

### Option B: Add ActivitySubmission Model

Create a dedicated model for all activity submissions.

Best when HelloRun expands beyond event results into daily steps, group challenges, hike logs, and wellness challenges.

Pros:

- cleaner long-term structure
- supports activity ecosystem direction
- better for future analytics and leaderboards

Cons:

- needs integration work with existing submission and leaderboard flows

### Recommendation

Use Option A for the first implementation if the goal is fast integration with the current result submission flow.

Move to Option B when HelloRun formally supports independent activity logs, step challenges, and non-event challenges.

---

## Status Values

Suggested status values:

```text
draft
submitted
needs_correction
approved
rejected
flagged
```

### Status Meaning

| Status | Meaning |
|---|---|
| draft | User has uploaded or started OCR but has not submitted |
| submitted | User submitted the activity for review |
| needs_correction | Submission needs user correction |
| approved | Organizer/admin approved the activity |
| rejected | Organizer/admin rejected the activity |
| flagged | System marked the submission as suspicious or low-confidence |

---

## UI Placement

### Runner Dashboard

Add a button or card action:

```text
Submit Activity Proof
```

### My Registrations

Upgrade the current proof submission flow:

```text
Upload Screenshot or Enter Manually
```

### Event Detail Page

For logged-in registered users:

```text
Submit Proof
```

### Challenge Page

For future step or wellness challenges:

```text
Upload Step Screenshot
```

---

## Activity Submission Modal Structure

The modal should include these sections:

1. Activity type selector
2. Screenshot upload
3. Image preview
4. OCR processing state
5. Detected details
6. Manual correction fields
7. Review flags or confidence message
8. Submit button

---

## Recommended UI Wireframe

```text
--------------------------------------------------
Submit Activity Proof
--------------------------------------------------
Activity Type
[ Run v ]

Upload Screenshot
[ Select Image ]

Preview
[ Uploaded screenshot preview ]

Detected Details
Source App      [ Strava              ]
Distance        [ 5.02 km             ]
Duration        [ 29:44               ]
Pace            [ 5:55/km             ]
Steps           [ N/A                 ]
Calories        [ 320                 ]
Activity Date   [ 2026-04-27          ]

Scan Confidence: 88%
Please review the detected details before submitting.

[ Submit Activity ]
--------------------------------------------------
```

---

## Recommended UI Copy

### Upload State

```text
Upload a screenshot from your fitness or health app.
HelloRun will try to read your activity details automatically.
```

### Processing State

```text
Reading your screenshot...
This may take a few seconds on older phones.
```

### Review State

```text
Please review the detected details before submitting.
You can edit any field if the scan is not accurate.
```

### Low Confidence State

```text
We could not confidently read all details.
Please complete the missing fields manually.
```

### OCR Failed State

```text
We could not read this screenshot clearly.
You can still enter your activity details manually.
```

### Duplicate Warning State

```text
This screenshot looks like it may have already been submitted.
Your entry may require review.
```

---

## Frontend Responsibilities

The frontend should:

- allow screenshot upload
- show image preview
- run OCR when supported
- show OCR progress
- parse raw OCR text
- auto-fill fields
- show confidence level
- show missing or suspicious fields
- allow manual correction
- submit final confirmed values

---

## Backend Responsibilities

The backend should:

- accept final confirmed submission
- validate submitted values
- upload screenshot to Cloudflare R2
- store screenshot URL
- generate and store screenshot hash
- store OCR raw text
- store OCR confidence
- store parser confidence
- store user-corrected fields
- assign review flags
- enforce event/challenge validation rules
- connect submission to existing organizer/admin review queues

---

## Security and Privacy

### File Restrictions

Allowed file types:

- JPG
- JPEG
- PNG
- WEBP

Recommended maximum file size:

```text
5MB
```

This can be adjusted based on current HelloRun upload limits.

### Privacy Rules

- Do not expose screenshots publicly by default.
- Restrict screenshot viewing to the submitting user, organizer, and admin.
- Store only necessary OCR text for audit.
- Avoid displaying unrelated extracted personal information.
- Keep OCR raw text private in admin/organizer review views.
- Apply role-based access checks to all proof images.

### Risk Considerations

Screenshots may contain:

- profile names
- location data
- map previews
- usernames
- phone status bar details
- health-related activity data

The system should treat uploaded screenshots as private proof documents.

---

## Integration With Existing HelloRun Features

### Registration System

OCR submissions should link to registration records when submitted for a specific event.

### Result Submission

OCR should upgrade the existing result submission flow.

Existing manual submission should remain available.

### Review Queue

Organizer and admin review queues should show OCR-assisted submissions with:

- extracted fields
- final user-confirmed values
- screenshot proof
- confidence score
- review flags

### Leaderboard

Only approved submissions should affect leaderboard rankings.

Future leaderboard categories may include:

- top runners
- top walkers
- top hikers
- top trail runners
- top step count users
- group rankings
- city/barangay rankings
- challenge-specific rankings

### Certificates and Badges

Approved OCR submissions can trigger:

- certificate issuance
- digital badge awards
- challenge completion
- merchandise eligibility

### Shop / Merchandise

OCR-approved activity achievements can support achievement-based merchandise.

Examples:

- 10K Steps Club shirt
- 100KM Monthly Finisher shirt
- Trail Finisher patch
- Hike Achievement badge
- Walk Challenge certificate

---

## MVP Scope

### Included in MVP

- Upload screenshot
- Browser OCR using Tesseract.js
- Extract distance, duration, pace, steps, calories, and date
- Source app detection
- Manual correction before submit
- Store screenshot and OCR metadata
- Basic confidence score
- Duplicate screenshot hash check
- Organizer/admin review compatibility

### Not Included in MVP

- Direct API sync with Strava or Garmin
- AI fraud detection
- Full image tamper detection
- Automatic approval for all submissions
- Wearable integration
- Native mobile app integration
- GPS route validation

---

## Suggested Implementation Phases

### Phase OCR-1: Prototype

Goal: Prove that OCR can read real user screenshots.

Tasks:

- Add OCR test component or test page
- Add screenshot upload input
- Add image preview
- Run Tesseract.js in browser
- Display raw OCR text
- Test real screenshots from target apps

Validation:

- Raw text is extracted from common screenshot examples
- UI remains usable on mobile
- Manual fallback is available

---

### Phase OCR-2: Parser

Goal: Convert raw OCR text into structured activity data.

Tasks:

- Create parser utility
- Extract distance
- Extract duration
- Extract pace
- Extract steps
- Extract calories
- Extract date
- Detect source app
- Add parser confidence score

Validation:

- Parser handles common formats
- Parser does not overwrite user corrections
- Parser safely handles missing fields

---

### Phase OCR-3: Submission Integration

Goal: Integrate OCR into the actual result submission flow.

Tasks:

- [DONE] Add OCR upload option to current submission modal
- [DONE] Auto-fill existing form fields
- [DONE] Allow user correction
- [DONE] Submit final confirmed values
- [DONE] Store OCR metadata for source app, raw text, confidence, extracted values, and mismatch flags
- [DONE] Keep manual submission path working
- [DONE] Clear stale editable fields when a new screenshot replaces the previous one

Validation:

- Existing result submission tests remain green
- Manual entry still works
- OCR-assisted submission reaches review queue
- Replacing an image does not retain stale OCR/manual values such as steps

---

### Phase OCR-4: Review and Trust Layer

Goal: Add basic anti-cheat and review support.

Tasks:

- [DONE] Add screenshot hash
- [DONE] Flag duplicate screenshots
- [DONE] Add impossible pace checks
- [DONE] Add flag-only impossible/suspicious checks for distance, duration, elevation, steps, OCR mismatches, name mismatch, date mismatch, run type mismatch, and location mismatch
- [DONE] Show OCR metadata and mismatch fields in organizer/admin review surfaces
- [PARTIAL] Low-confidence and unknown-source handling remain review signals, but thresholds may still be tuned from real screenshots

Validation:

- Duplicate screenshots are flagged
- Suspicious submissions require review instead of being blocked
- Suspicious submissions do not auto-approve
- Approved submissions remain leaderboard-eligible only after review

---

### Phase OCR-5: Ecosystem Expansion

Goal: Expand OCR beyond run result proof.

Tasks:

- Add walk support
- Add trail run support
- Add hike support
- Add step challenge support
- Add category-specific validation
- Add leaderboard support for steps and activity categories

Validation:

- Step challenges can accept step screenshots
- Walk/hike/trail activities store correct fields
- Category leaderboards do not mix incompatible metrics

---

## Acceptance Criteria

The OCR Smart Activity Submission feature is acceptable when:

- User can upload a screenshot from supported apps.
- OCR raw text appears during internal testing.
- Detected fields auto-fill the submission form.
- User can edit incorrect values before submission.
- Manual entry still works if OCR fails.
- Screenshot and final confirmed values are stored.
- OCR raw text and confidence score are stored for audit.
- Duplicate screenshot submissions are flagged.
- Low-confidence OCR does not auto-approve.
- Existing result submission and review workflows remain stable.
- Approved submissions can still feed certificates and leaderboards.

---

## Automated Test Plan

### Parser Tests

- Extract distance from `5.02 km`
- Extract distance from `3.10 mi`
- Convert miles to kilometres
- Extract duration from `29:44`
- Extract duration from `1:02:30`
- Extract duration from compact Strava text such as `27m 48s`, `31m38s`, and `1h47m`
- Do not parse pace text such as `5:33/km` as elapsed time
- Extract pace from `5:55/km`
- Extract steps from `8,421 steps`
- Extract calories from `312 kcal`
- Detect source app from keyword
- Detect Strava when Strava layout text includes a Garmin device label
- Avoid using `Strava App` as the extracted location
- Return missing fields safely

### Validation Tests

- Reject invalid distance
- Reject future activity date
- Reject impossible pace
- Flag duplicate screenshot hash
- Flag missing required fields
- Flag low confidence
- Allow manual correction

### Route / Integration Tests

- OCR metadata can be submitted with result proof
- Manual result submission still works
- Runner cannot submit for another user’s registration
- Organizer can view OCR-assisted submission for owned event
- Admin can view OCR-assisted submission
- Public users cannot access proof screenshots

---

## Manual Test Plan

Test using real screenshots from:

- Strava run
- Strava walk
- Samsung Health steps
- Google Fit walk
- Garmin activity
- Nike Run Club run
- Low-resolution screenshot
- Cropped screenshot
- Dark mode screenshot
- Screenshot with unrelated visible text
- Mobile Chrome upload flow
- Android phone camera gallery upload
- Desktop browser upload

---

## Technical File Plan

Possible files to add:

```text
src/public/js/ocr-submission.js
src/public/js/activity-parser.js
src/public/css/ocr-submission.css
src/services/screenshot-hash.service.js
src/services/activity-validation.service.js
src/services/activity-parser.service.js
src/models/ActivitySubmission.js
```

Possible existing files to update:

```text
src/models/Submission.js
src/controllers/submission.controller.js
src/routes/submission.routes.js
src/views/pages/my-registrations.ejs
src/views/partials/submission-modal.ejs
src/views/admin/reviews.ejs
src/views/organizer/registrants.ejs
```

Exact file names should follow the current repository structure during implementation.

---

## Suggested Environment / Package Additions

Possible frontend package:

```bash
npm install tesseract.js
```

Possible hashing support:

```text
Use browser crypto API or backend crypto module for screenshot hash generation.
```

Backend hashing can use Node.js built-in `crypto` module.

---

## Risks and Mitigations

### Risk: OCR Accuracy Is Inconsistent

Mitigation:

- Always allow manual correction.
- Store confidence score.
- Flag low-confidence submissions.

### Risk: Users Upload Edited Screenshots

Mitigation:

- Use duplicate hash checks.
- Add suspicious pace checks.
- Keep organizer/admin review.
- Add future tamper detection.

### Risk: Screenshots Contain Private Information

Mitigation:

- Keep screenshots private.
- Limit role-based access.
- Avoid public display of proof images.

### Risk: Browser OCR Is Slow on Older Phones

Mitigation:

- Show progress state.
- Allow manual entry.
- Consider backend OCR later.

### Risk: Fitness Apps Change Their Layout

Mitigation:

- Keep parser flexible.
- Use multiple patterns.
- Add source-specific parser rules over time.

---

## Open Questions

- Should OCR be available only after payment approval?
- Should steps have separate challenges from race events?
- Should manually corrected OCR fields reduce trust score?
- Should leaderboard entries require organizer approval before ranking?
- Should screenshots be retained permanently or archived after review?
- Should users be allowed to submit multiple screenshots for one activity?
- Should OCR raw text be visible to organizers or admin only?
- Should event organizers be allowed to disable OCR submissions per event?
- Should events define allowed proof sources?

---

## Recommended PRD Reference Entry

Add this to `docs/PRD.md` instead of placing the full OCR plan there.

```md
[DRAFT] Phase 12: OCR Smart Activity Submission

Goal: Add smart screenshot-based activity submission for run, walk, trail run, hike, and step-based entries.

This phase will allow users to upload screenshots from fitness and health apps, auto-read activity details through OCR, and review/edit extracted values before submission.

Detailed planning source: `docs/ocr_smart_submission.md`

Planned scope:
- screenshot OCR upload
- auto-fill activity fields
- support run, walk, trail run, hike, and steps
- source app detection
- OCR confidence scoring
- duplicate screenshot checks
- suspicious activity flags
- organizer/admin review compatibility
```

---

## Recommended Phase 5 Reference Entry

Add this line under Phase 5 in `docs/PRD.md`:

```md
Future enhancement: Smart OCR-based activity submission is planned under Phase 12. See `docs/ocr_smart_submission.md`.
```

---

## Current Status

```text
Status: Draft
Priority: Post-launch or early post-launch enhancement
Recommended phase: Phase 12
Depends on: Phase 9 release hardening and Phase 10 production deployment
Related future phase: Phase 11 Shop / Merchandise Feature
```

---

## Final Product Direction

OCR Smart Activity Submission should help HelloRun become easier to use for both serious and casual users.

It should support the platform’s shift from a runner-only system into a broader activity ecosystem covering:

- run
- walk
- trail run
- hike
- steps
- rankings
- challenges
- digital achievements
- merchandise rewards

---

# Dedicated Frontend OCR JavaScript Strategy

## Purpose

HelloRun should have its own dedicated frontend JavaScript file for OCR-based activity submission.

Recommended file:

```text
public/js/ocr-smart-submission.js
```

This file should contain HelloRun-specific logic for:

- screenshot upload handling
- image preview
- image preprocessing
- OCR execution
- raw OCR text handling
- activity field extraction
- source app detection
- activity classification
- confidence scoring
- form auto-fill
- validation messages
- fallback to manual entry

The dedicated JavaScript file should not copy or extract internal source code from an OCR library.

---

## Important Decision

HelloRun should not directly extract internal Tesseract.js code into its own frontend file.

Instead:

```text
Tesseract.js = OCR engine
ocr-smart-submission.js = HelloRun OCR workflow and activity intelligence
```

This keeps the system easier to maintain.

---

## Why Not Extract Tesseract.js Internals?

Tesseract.js is not a simple OCR function that can be copied into one small frontend file.

It commonly depends on:

- Web Workers
- WebAssembly OCR core
- language data files
- trained OCR data
- browser-specific loading behavior

Copying internal OCR code would create maintenance problems.

HelloRun would become responsible for:

- OCR engine bugs
- browser compatibility
- WebAssembly loading
- language file loading
- future updates
- security patches
- licence compliance

The safer and cleaner approach is to keep the OCR engine as a dependency, then build HelloRun’s own parser and classification layer around it.

---

## Recommended File Structure

For the MVP:

```text
src/
public/
  js/
    ocr-smart-submission.js
  vendor/
    tesseract/
      tesseract.min.js
      worker.min.js
      tesseract-core.wasm.js
      eng.traineddata.gz
```

For a later cleaner structure:

```text
public/
  js/
    ocr/
      ocr-engine.js
      ocr-parser.js
      ocr-classifier.js
      ocr-validation.js
      ocr-autofill.js
```

Start with one file first.

Recommended MVP file:

```text
public/js/ocr-smart-submission.js
```

Split it only after the OCR workflow becomes stable.

---

## Local Hosting Recommendation

Avoid relying on a CDN for production.

Host OCR dependency files locally under:

```text
public/vendor/tesseract/
```

This gives HelloRun:

- better reliability
- better version control
- fewer third-party loading issues
- easier production debugging
- predictable asset paths

---

## Frontend Script Loading Example

Example EJS or HTML placement:

```html
<script src="/vendor/tesseract/tesseract.min.js"></script>
<script src="/js/ocr-smart-submission.js"></script>
```

The first script loads the OCR engine.

The second script loads HelloRun’s OCR workflow.

---

## Responsibility Split

| Layer | Responsibility |
|---|---|
| Tesseract.js | Read visible text from uploaded screenshot |
| ocr-smart-submission.js | Manage upload, parse text, classify activity, fill form |
| Backend | Store screenshot, confirmed fields, OCR metadata, review flags |
| Organizer/Admin Review | Approve, reject, or flag suspicious submissions |

---

## What `ocr-smart-submission.js` Should Do

The dedicated file should follow this process:

1. Listen for screenshot upload.
2. Validate file type and size.
3. Show screenshot preview.
4. Optionally preprocess image using canvas.
5. Run OCR engine.
6. Receive raw OCR text.
7. Detect source app.
8. Extract activity values.
9. Classify the activity type.
10. Score OCR confidence.
11. Auto-fill the form.
12. Show warnings for uncertain values.
13. Allow user correction.
14. Submit final confirmed values to backend.

---

## Frontend OCR Workflow

```text
User uploads screenshot
        ↓
Validate file
        ↓
Preview image
        ↓
Run OCR engine
        ↓
Get raw text
        ↓
Parse fields
        ↓
Classify activity
        ↓
Calculate confidence
        ↓
Auto-fill form
        ↓
User reviews / edits
        ↓
Submit final data
```

---

## Activity Classification Requirement

Activity classification should not depend only on OCR text.

The system should consider:

- user-selected activity type
- detected keywords
- source app
- distance
- duration
- pace
- step count
- elevation terms
- event or challenge type

The user-selected activity type should have the highest priority because OCR can misread app labels.

---

## Classification Priority

Use this order:

1. User-selected activity type
2. Event or challenge required activity type
3. Strong OCR keyword match
4. Step count-only pattern
5. Distance/time/pace pattern
6. Source app hints
7. Manual confirmation required

---

## Classification Rules

### Run

Classify as `run` when:

- selected activity type is Run, or
- OCR text contains `run`, `running`, `morning run`, `evening run`, or similar, or
- screenshot contains distance + duration + pace without step-only pattern

Example:

```text
Morning Run
5.02 km
29:44
5:55 /km
```

Detected classification:

```json
{
  "activityType": "run",
  "classificationConfidence": 85,
  "reason": "Running keyword and pace detected"
}
```

---

### Walk

Classify as `walk` when:

- selected activity type is Walk, or
- OCR text contains `walk`, `walking`, `morning walk`, or similar, or
- pace/speed appears slower and source app indicates walking

Example:

```text
Afternoon Walk
3.21 km
45:10
14:04 /km
```

Detected classification:

```json
{
  "activityType": "walk",
  "classificationConfidence": 85,
  "reason": "Walking keyword detected"
}
```

---

### Trail Run

Classify as `trail_run` when:

- selected activity type is Trail Run, or
- OCR text contains `trail run`, `trail running`, or similar, or
- running data includes elevation/trail terms

Example:

```text
Trail Run
8.40 km
1:12:33
Elevation Gain 430 m
```

Detected classification:

```json
{
  "activityType": "trail_run",
  "classificationConfidence": 90,
  "reason": "Trail run keyword and elevation detected"
}
```

---

### Hike

Classify as `hike` when:

- selected activity type is Hike, or
- OCR text contains `hike`, `hiking`, `trek`, `ascent`, or similar, or
- elevation gain is present and pace is closer to hiking pace

Example:

```text
Hiking
6.80 km
2:41:20
Elevation Gain 510 m
```

Detected classification:

```json
{
  "activityType": "hike",
  "classificationConfidence": 88,
  "reason": "Hiking keyword and elevation detected"
}
```

---

### Steps

Classify as `steps` when:

- selected activity type is Steps, or
- OCR text contains a step count, or
- screenshot mostly shows daily steps without route/duration details

Example:

```text
Today
8,421 steps
6.1 km
312 calories
```

Detected classification:

```json
{
  "activityType": "steps",
  "classificationConfidence": 90,
  "reason": "Step count detected"
}
```

---

## Classification Conflict Handling

Conflicts can happen.

Example:

- user selects Walk
- OCR text says Run

In that case, do not silently override the user.

Show a message:

```text
The screenshot appears to show a Run, but you selected Walk. Please confirm the correct activity type before submitting.
```

Recommended behavior:

- keep user-selected value
- show warning
- add review flag: `activity_type_conflict`
- allow submission only after confirmation

---

## Classification Confidence Scoring

Suggested scoring:

| Signal | Points |
|---|---:|
| User-selected activity type | 40 |
| Exact activity keyword detected | 25 |
| Source app detected | 10 |
| Distance detected | 10 |
| Duration detected | 10 |
| Pace detected | 5 |
| Steps detected | 20 |
| Elevation detected for trail/hike | 10 |

The score should be capped at 100.

---

## Dedicated JavaScript MVP Example

```js
// public/js/ocr-smart-submission.js

const HelloRunOCR = (() => {
  const sourcePatterns = [
    { app: "Strava", patterns: [/strava/i] },
    { app: "Samsung Health", patterns: [/samsung health/i] },
    { app: "Google Fit", patterns: [/google fit/i, /google\s?fit/i] },
    { app: "Nike Run Club", patterns: [/nike run club/i, /\bnrc\b/i] },
    { app: "Garmin Connect", patterns: [/garmin/i, /garmin connect/i] },
    { app: "adidas Running", patterns: [/adidas running/i, /runtastic/i] },
    { app: "Map My Run", patterns: [/map my run/i, /under armour/i] }
  ];

  function detectSourceApp(text) {
    for (const source of sourcePatterns) {
      if (source.patterns.some((pattern) => pattern.test(text))) {
        return source.app;
      }
    }

    return "Unknown";
  }

  function extractDistance(text) {
    const match = text.match(/(\d+(\.\d+)?)\s?(km|kilometers|mi|miles)/i);

    if (!match) return null;

    return {
      value: Number(match[1]),
      unit: match[3].toLowerCase()
    };
  }

  function extractDuration(text) {
    const match = text.match(/(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})/);

    return match ? match[1] : null;
  }

  function extractPace(text) {
    const match = text.match(/(\d{1,2}:\d{2})\s?\/?\s?(km|mi)/i);

    if (!match) return null;

    return `${match[1]}/${match[2].toLowerCase()}`;
  }

  function extractSteps(text) {
    const match = text.match(/(\d{1,3}(,\d{3})+|\d+)\s?(steps|step)/i);

    if (!match) return null;

    return Number(match[1].replace(/,/g, ""));
  }

  function extractCalories(text) {
    const match = text.match(/(\d+)\s?(cal|kcal|calories)/i);

    return match ? Number(match[1]) : null;
  }

  function extractElevation(text) {
    const match = text.match(/(\d+)\s?(m|meter|meters|ft|feet)\s?(elevation|gain|ascent)?/i);

    if (!match) return null;

    return {
      value: Number(match[1]),
      unit: match[2].toLowerCase()
    };
  }

  function classifyActivity(parsed, rawText, selectedActivityType = "", requiredActivityType = "") {
    const text = rawText.toLowerCase();

    if (requiredActivityType) {
      return {
        activityType: requiredActivityType,
        confidence: 100,
        reason: "Event or challenge requires this activity type"
      };
    }

    if (selectedActivityType) {
      return {
        activityType: selectedActivityType,
        confidence: 95,
        reason: "User-selected activity type"
      };
    }

    if (/trail run|trail running/i.test(rawText)) {
      return {
        activityType: "trail_run",
        confidence: 90,
        reason: "Trail running keyword detected"
      };
    }

    if (/hike|hiking|trek|trekking|ascent/i.test(rawText)) {
      return {
        activityType: "hike",
        confidence: 88,
        reason: "Hiking keyword detected"
      };
    }

    if (/walk|walking/i.test(rawText)) {
      return {
        activityType: "walk",
        confidence: 85,
        reason: "Walking keyword detected"
      };
    }

    if (/run|running/i.test(rawText)) {
      return {
        activityType: "run",
        confidence: 85,
        reason: "Running keyword detected"
      };
    }

    if (parsed.steps && !parsed.duration) {
      return {
        activityType: "steps",
        confidence: 85,
        reason: "Step count detected without clear timed activity"
      };
    }

    if (parsed.steps && !parsed.distance) {
      return {
        activityType: "steps",
        confidence: 80,
        reason: "Step count detected without distance"
      };
    }

    if (parsed.distance && parsed.duration && parsed.pace) {
      return {
        activityType: "run",
        confidence: 70,
        reason: "Distance, duration, and pace detected"
      };
    }

    return {
      activityType: "unknown",
      confidence: 40,
      reason: "No clear activity type detected"
    };
  }

  function detectClassificationConflict(selectedActivityType, classification) {
    if (!selectedActivityType) return null;

    if (selectedActivityType !== classification.activityType && classification.activityType !== "unknown") {
      return {
        flag: "activity_type_conflict",
        message: `The screenshot appears to show ${classification.activityType}, but the selected activity is ${selectedActivityType}.`
      };
    }

    return null;
  }

  function calculateConfidence(parsed, classification, ocrConfidence = 0) {
    let score = 0;

    if (ocrConfidence) score += Math.min(ocrConfidence * 0.35, 35);
    if (parsed.sourceApp !== "Unknown") score += 10;
    if (parsed.distance) score += 10;
    if (parsed.duration) score += 10;
    if (parsed.pace) score += 5;
    if (parsed.steps) score += 15;
    if (parsed.calories) score += 5;
    if (parsed.elevationGain) score += 5;
    if (classification.activityType !== "unknown") score += 15;

    return Math.min(Math.round(score), 100);
  }

  async function readImage(file, options = {}) {
    if (!window.Tesseract) {
      throw new Error("Tesseract.js is not loaded.");
    }

    const result = await Tesseract.recognize(file, "eng", {
      logger: options.onProgress || (() => {})
    });

    const rawText = result.data.text || "";
    const ocrConfidence = result.data.confidence || 0;

    const parsed = {
      sourceApp: detectSourceApp(rawText),
      distance: extractDistance(rawText),
      duration: extractDuration(rawText),
      pace: extractPace(rawText),
      steps: extractSteps(rawText),
      calories: extractCalories(rawText),
      elevationGain: extractElevation(rawText)
    };

    const classification = classifyActivity(
      parsed,
      rawText,
      options.selectedActivityType || "",
      options.requiredActivityType || ""
    );

    const conflict = detectClassificationConflict(
      options.selectedActivityType || "",
      classification
    );

    const confidence = calculateConfidence(parsed, classification, ocrConfidence);

    const reviewFlags = [];

    if (conflict) reviewFlags.push(conflict.flag);
    if (confidence < 70) reviewFlags.push("low_confidence");
    if (parsed.sourceApp === "Unknown") reviewFlags.push("source_app_unknown");

    return {
      rawText,
      ocrConfidence,
      parsed,
      classification,
      confidence,
      conflict,
      reviewFlags
    };
  }

  return {
    readImage,
    detectSourceApp,
    extractDistance,
    extractDuration,
    extractPace,
    extractSteps,
    extractCalories,
    extractElevation,
    classifyActivity,
    detectClassificationConflict
  };
})();
```

---

## Example Form Integration

```html
<input
  type="file"
  id="activityScreenshot"
  accept="image/png,image/jpeg,image/webp"
>

<select id="activityType" name="activityType">
  <option value="">Auto detect</option>
  <option value="run">Run</option>
  <option value="walk">Walk</option>
  <option value="trail_run">Trail Run</option>
  <option value="hike">Hike</option>
  <option value="steps">Steps</option>
</select>

<input id="sourceApp" name="sourceApp">
<input id="distance" name="distance">
<input id="duration" name="duration">
<input id="pace" name="pace">
<input id="steps" name="steps">
<input id="calories" name="calories">

<div id="ocrStatus"></div>
<div id="ocrWarning"></div>
```

```js
document.getElementById("activityScreenshot").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  const status = document.getElementById("ocrStatus");
  const warning = document.getElementById("ocrWarning");

  if (!file) return;

  status.textContent = "Reading screenshot...";
  warning.textContent = "";

  try {
    const selectedActivityType = document.getElementById("activityType").value;

    const result = await HelloRunOCR.readImage(file, {
      selectedActivityType,
      onProgress: (progress) => {
        if (progress.status) {
          const percentage = Math.round((progress.progress || 0) * 100);
          status.textContent = `${progress.status} ${percentage}%`;
        }
      }
    });

    document.getElementById("sourceApp").value = result.parsed.sourceApp || "";
    document.getElementById("distance").value = result.parsed.distance?.value || "";
    document.getElementById("duration").value = result.parsed.duration || "";
    document.getElementById("pace").value = result.parsed.pace || "";
    document.getElementById("steps").value = result.parsed.steps || "";
    document.getElementById("calories").value = result.parsed.calories || "";

    if (result.conflict) {
      warning.textContent = result.conflict.message;
    }

    status.textContent = `Scan complete. Confidence: ${result.confidence}%`;
  } catch (error) {
    status.textContent = "OCR failed. Please enter details manually.";
    console.error(error);
  }
});
```

---

## Backend Data to Store From Frontend OCR

The frontend should submit final user-confirmed values.

It should also send OCR audit metadata:

```json
{
  "sourceApp": "Strava",
  "activityType": "run",
  "distanceKm": 5.02,
  "duration": "29:44",
  "pace": "5:55/km",
  "steps": null,
  "calories": 320,
  "elevationGain": null,
  "ocrRawText": "STRAVA Morning Run 5.02 km 29:44 5:55 /km",
  "ocrConfidence": 92,
  "parserConfidence": 88,
  "classificationConfidence": 85,
  "reviewFlags": []
}
```

---

## MVP Decision

For the first version, HelloRun should use:

```text
Frontend OCR engine: Tesseract.js
HelloRun OCR controller: public/js/ocr-smart-submission.js
Manual correction: Required before final submit
Backend review: Keep existing organizer/admin approval flow
```

---

## Acceptance Criteria for Dedicated JS Strategy

- HelloRun has a dedicated frontend file named `ocr-smart-submission.js`.
- OCR dependency is loaded separately.
- The dedicated file does not copy internal OCR engine source code.
- The file handles upload, parsing, classification, confidence scoring, and form auto-fill.
- User can manually correct OCR results before submission.
- OCR failure does not block manual entry.
- Review flags are generated for low-confidence or conflicting entries.
- Existing submission and review workflows remain compatible.
