# HelloRun OCR Smart Activity Submission

## Document Role

This document defines the planned OCR-based smart activity submission system for HelloRun.

It is a dedicated planning and implementation reference for screenshot-based activity proof uploads, auto-filled activity details, confidence scoring, and review support.

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

- Add OCR upload option to current submission modal
- Auto-fill existing form fields
- Allow user correction
- Submit final confirmed values
- Store OCR metadata
- Keep manual submission path working

Validation:

- Existing result submission tests remain green
- Manual entry still works
- OCR-assisted submission reaches review queue

---

### Phase OCR-4: Review and Trust Layer

Goal: Add basic anti-cheat and review support.

Tasks:

- Add screenshot hash
- Flag duplicate screenshots
- Add impossible pace checks
- Add low-confidence flag
- Add source unknown flag
- Show OCR metadata in review queue

Validation:

- Duplicate screenshots are flagged
- Suspicious submissions require review
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
- Extract pace from `5:55/km`
- Extract steps from `8,421 steps`
- Extract calories from `312 kcal`
- Detect source app from keyword
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
