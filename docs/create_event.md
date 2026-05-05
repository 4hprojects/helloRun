# Create Event Tracking

## Purpose and Ownership

This document is the dedicated planning and tracking source for the organizer create-event workflow at `/organizer/create-event`.

`docs/PRD.md` remains the master roadmap. This file should hold the route-level, field-level, UI-level, and testing details for create-event work, including example-driven gaps discovered from event setup references.

Primary implementation surfaces:

- Route and persistence: `src/routes/organizer.routes.js`
- Create view: `src/views/organizer/create-event.ejs`
- Shared create/edit styling: `src/public/css/create-event.css`
- Event model: `src/models/Event.js`
- Submission model constraint relevant to accumulated virtual runs: `src/models/Submission.js`
- Example reference: `docs/example/100k-progress-run-event-reference.md`

## Current `/organizer/create-event` Capabilities

The current create-event flow supports approved organizers creating draft or published events.

Implemented capabilities:

- Dedicated page at `/organizer/create-event`
- `canCreateEvents()` route guard, including verified approved organizer requirements
- Core event details:
  - event title
  - organizer name
  - description
  - event type: virtual, onsite, hybrid
  - race distances, including custom distance text such as `100K`
- Waiver editor:
  - Quill rich-text editor
  - default waiver reset
  - organizer and event title placeholders
  - live preview
  - server-side sanitization and minimum text validation
- Schedule:
  - registration open
  - registration close
  - event start
  - event end
- Conditional onsite/hybrid location fields:
  - venue name
  - venue address
  - city
  - province/state
  - country
  - optional latitude/longitude
- Conditional virtual/hybrid rules:
  - virtual window start
  - virtual window end
  - proof types allowed: GPS, photo, manual
- Branding and media:
  - logo upload or URL
  - banner upload or URL
  - poster upload or URL
  - gallery uploads or URLs
- Preview route at `/organizer/preview-event`
- Save Draft and Publish Event actions
- Success redirect to `/organizer/events`
- Unique slug generation
- Unique event reference code generation
- Create/edit event panel sequence:
  - Core Details
  - Schedule
  - Virtual Rules / virtual window
  - Branding and Media
  - Waiver
- Core Details panel receives initial focus when create/edit event pages load.

## Current Field Inventory

Current first-class create-event fields:

| Area | Current Fields |
|---|---|
| Core details | title, organiserName, description, eventType, raceDistancePresets, raceDistanceCustom |
| Waiver | waiverTemplate |
| Schedule | registrationOpenAt, registrationCloseAt, eventStartAt, eventEndAt |
| Location | venueName, venueAddress, city, province, country, geoLat, geoLng |
| Virtual rules | virtualStartAt, virtualEndAt, proofTypesAllowed |
| Media | logoFile, logoUrl, bannerImageFile, bannerImageUrl, posterImageFile, posterImageUrl, galleryImageFiles, galleryImageUrlsText |
| Actions | actionType: draft or publish |

Persisted event model fields currently used:

| Area | Event Fields |
|---|---|
| Identity | organizerId, slug, referenceCode |
| Core details | title, organiserName, description, status, eventType, eventTypesAllowed, raceDistances |
| Dates | registrationOpenAt, registrationCloseAt, eventStartAt, eventEndAt |
| Location | venueName, venueAddress, city, province, country, geo |
| Virtual rules | virtualWindow, proofTypesAllowed |
| Media | logoUrl, bannerImageUrl, posterImageUrl, galleryImageUrls |
| Waiver | waiverTemplate, waiverVersion |

## Known Gaps and UX Issues

Implementation update:

- Partial draft behavior is now the chosen direction: drafts require only a valid title, while publishing requires full event validation.
- Accumulated virtual run setup is modeled as a virtual/hybrid event format, not a new top-level event type.
- Accumulated-distance events may be saved as drafts, but publishing remains blocked until activity-level submission and progress tracking are implemented.
- Create/edit event UI now opens with focus on the Core Details panel and uses the shared panel sequence: Core Details, Schedule, Virtual Rules, Branding and Media, Waiver.

Current gaps:

- Preview is GET-query based and cannot preview local uploaded files.
- Preview can become fragile with long rich-text waiver content because form data is serialized into the URL.
- Client-side validation is lighter than backend validation, especially for date ordering, URL validity, conditional virtual/onsite requirements, and waiver length.
- Create-event tests cover the focused draft/publish/access/accumulated-groundwork paths, but media upload and richer preview coverage are still needed.

## Accumulated Virtual Run Requirements

Accumulated virtual runs should be treated as a distinct virtual event format, not only as a long race distance.

The current implementation is built around one final run-proof submission per registration. `Submission.registrationId` is unique, and `createSubmission` rejects a second submission for the same registration unless using the rejected-resubmission path. That model fits a single-activity virtual run, but not a challenge where a participant completes 100 km across multiple activities.

Required future event configuration:

- `virtualCompletionMode`: `single_activity` or `accumulated_distance` [groundwork added]
- `targetDistanceKm`, for example `100` [draft setup added]
- `minimumActivityDistanceKm`, for example `1` [draft setup added]
- `acceptedRunTypes`, for example run, walk, hike, trail run [draft setup added]
- `finalSubmissionDeadlineAt`, separate from event end when needed [draft setup added]
- optional milestone distances, for example `25`, `50`, `75`, `100` [draft setup added]
- recognition mode, for example completion-based finisher recognition [draft setup added]
- leaderboard mode, for example finishers plus optional top total distance [draft setup added]

Required future submission behavior:

- Add activity-level submission support for accumulated events.
- Allow multiple activity proofs per registration when the event uses accumulated distance.
- Count approved activity distance only.
- Keep pending and rejected activities out of official progress.
- Mark completion when approved total reaches the target distance.
- Unlock certificates only after completion.
- Support progress displays such as `24.3 km / 100 km`.

Recommended future model direction:

- Keep the existing single-submission path for standard virtual runs.
- Add an activity-level model or equivalent persistence layer for accumulated virtual run activities.
- Use a rollup helper to calculate approved distance, pending distance, rejected distance, completion status, and completion timestamp.

## 100K Progress Run Field-Mapping Analysis

Reference: `docs/example/100k-progress-run-event-reference.md`

The 100K Progress Run can partially be encoded today, but several important rules would need to be placed inside the description or waiver instead of first-class fields.

Already supported:

| 100K Reference Need | Current Support |
|---|---|
| Event title | Supported by title |
| Virtual event mode | Supported by eventType = virtual |
| Description and overview | Supported by description |
| 100K distance label | Supported by custom race distance |
| Registration open and close | Supported |
| Challenge start and end | Supported by eventStartAt/eventEndAt and virtualWindow |
| Screenshot proof | Partially supported by proofTypesAllowed |
| Waiver and rules copy | Supported as rich text |
| Event media | Supported by logo/banner/poster/gallery |

Not first-class yet:

| 100K Reference Need | Current Gap |
|---|---|
| Accumulated distance challenge | No event format field |
| Target distance: 100 km | Only possible as distance text, not completion logic |
| Minimum distance per submission: 1 km | No event-level minimum activity distance |
| Multiple submissions per participant | Blocked by current one-submission-per-registration model |
| Approved-distance progress tracking | Not supported as accumulated rollup |
| Final submission deadline | No separate field from event end/virtual window |
| Review period | No structured review-period field |
| Certificate release date | No structured certificate-release field |
| Accepted activity types | Current runType exists on submissions, but not event-configurable from create-event |
| Milestones: 25K, 50K, 75K, 100K | No milestone configuration |
| Completion-based recognition | No structured recognition mode |
| Secondary leaderboard: top distance finishers | No event-level leaderboard mode |
| Merchandise packages | Deferred shop/merchandise scope |
| Participant-facing FAQ/rules sections | Must be placed in description for now |
| Encoding cleanup | Reference text contains mojibake apostrophe artifacts, for example participant plus a garbled apostrophe sequence |

Suggested current manual encoding for the 100K example:

- Event Title: `100K Progress Run by HelloRun`
- Event Type: `Virtual`
- Race Distance Custom: `100K`
- Registration Open: May 5, 2026
- Registration Close: May 12, 2026
- Event Start: May 13, 2026
- Event End: May 31, 2026
- Virtual Window Start: May 13, 2026
- Virtual Window End: May 31, 2026 at 11:59 PM
- Proof Types: GPS and Photo
- Description: include the overview, challenge goal, accepted activities, completion rule, submission rules, progress tracking explanation, recognition, and FAQ.

This is acceptable for a static event page, but it does not implement real accumulated progress.

## Proposed Create-Event Roadmap

Near-term documentation and form polish:

- [DONE] Clean create/edit-event encoding artifacts.
- [DONE] Add create-event-specific regression coverage for the focused route and static view checks.
- [DONE] Improve draft-vs-publish expectations in product copy.
- [DONE] Allow incomplete draft saves with title-only minimum.
- [DONE] Reorder create/edit event panels so Core Details comes first, followed by Schedule, Virtual Rules, Branding and Media, and Waiver.
- [DONE] Focus the Core Details panel on create/edit event page load.
- Improve preview so it is a realistic event preview and not only a validation summary.

Create-event field expansion:

- [DONE] Add structured virtual completion settings.
- [DONE] Add accumulated distance draft setup settings.
- [DONE] Add accepted activity type draft setup settings.
- [DONE] Add final submission deadline draft setup.
- [TODO] Add optional review and certificate release dates.
- [DONE] Add milestone configuration draft setup.
- [DONE] Add recognition and leaderboard mode draft setup.

Backend feature expansion for accumulated virtual runs:

- Add activity-level submission persistence.
- Add progress rollup helpers.
- Add runner progress UI.
- Add organizer review queue support for activity-level proofs.
- Add certificate eligibility logic based on approved accumulated distance.
- Add leaderboard views for finishers and top total distance.

Deferred or separate roadmap items:

- Merchandise packages should remain aligned with the shop/merchandise phase.
- Payment gateway support should remain aligned with payment gateway planning.
- Onsite result import, bib, race kit, and check-in fields should remain in onsite operations planning.

## Acceptance Checklist

Documentation acceptance:

- [x] `docs/create_event.md` exists and is linked from `docs/PRD.md`.
- [x] Current create-event behavior is summarized.
- [x] Existing route, view, model, and test surfaces are referenced.
- [x] 100K Progress Run requirements are mapped to supported and missing fields.
- [x] Accumulated virtual run is documented as a feature gap requiring backend changes.

Future implementation acceptance:

- [ ] Organizer can configure a standard single-activity virtual run.
- [ ] Organizer can configure an accumulated-distance virtual challenge.
- [ ] Runner can submit multiple activity proofs for accumulated events.
- [ ] Pending and rejected activities do not count toward progress.
- [ ] Approved activity distance controls progress and completion.
- [ ] Certificate eligibility is based on approved total distance reaching the target.
- [ ] Leaderboard can show completion-based finishers and optional total-distance ranking.
- [ ] 100K Progress Run can be represented without placing core rules only in free-text fields.

## Open Product Decisions

- [DECIDED] Draft events may be incomplete, with title as the minimum required field.
- [DECIDED] Accumulated virtual run is represented by a separate virtual event format field.
- Should final submission deadline default to `virtualWindow.endAt`, `eventEndAt`, or be a required separate field for accumulated events?
- Should activities above the target distance continue to count in total-distance leaderboards?
- Should certificates issue immediately on completion or only after an event-level certificate release date?
- Should milestones be purely display/progress markers, or should they generate notifications/badges?
- Should accepted activity types be organizer-configurable per event, or platform-fixed for virtual runs?
