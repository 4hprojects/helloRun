# CNS Wellness In Motion 2026
## HelloRun Update Implementation Brief

## 1. Purpose

Update the existing HelloRun event page so it aligns with the official Benguet State University College of Natural Sciences Employees’ Activity Design.

Existing event page:

`https://hellorun.online/events/cns-move-more-challenge-2026`

This document is an update specification only. Do not rebuild the event from scratch unless required by the current codebase.

---

## 2. Source of Truth

Use the official BSU Employees’ Activity Design as the primary source of truth for:

- Event title
- Registration dates
- Activity dates
- Event duration
- Main challenge target
- Eligible activities
- Submission requirements
- Certificate rules
- Awarding date
- Awarding venue
- Monitoring process
- Collaborators

Where the current HelloRun implementation conflicts with the official activity design, update HelloRun to match the official activity design.

Do not retain unsupported mechanics unless they are explicitly approved by the Sports and Wellness Coordinator.

---

## 3. Official Event Identity

### Official Title

**College of Natural Sciences Wellness In Motion – Every Step is a Step Toward a Healthier You**

### Short Display Name

The current shorter name may still be retained for navigation, cards, slugs, or compact UI:

**CNS Move More Challenge 2026**

### Organizer

**College of Natural Sciences, Benguet State University**

### Participants

**CNS Faculty and Staff**

### Target Participants

**48 faculty members and staff**

---

## 4. Official Event Dates

Replace the current event dates with:

### Registration Period

- September 9, 2026
- September 13, 2026

### Wellness Activity Period

- September 14, 2026
- November 3, 2026

### Duration

**50 days**

### Finalization of Winners

- November 4 to November 8, 2026

### Awarding

- November 9, 2026

### Awarding Venue

**CAS Little Theater**

---

## 5. Main Challenge

Replace the current multi-category challenge structure with the official challenge:

### 50-Kilometer Challenge

Participants must accumulate at least:

**50 kilometers in 50 days**

Participants may:

- Walk
- Run
- Hike

Participants may complete activities at their preferred location and pace.

The event is virtual and self-paced.

---

## 6. Remove or Disable Unsupported Challenge Categories

The current HelloRun page includes challenge types that are not stated in the official activity design.

Remove or disable the following unless the Sports and Wellness Coordinator separately approves them:

- 25-Kilometer Challenge
- 120,000-Step Challenge
- 25-Kilometer + Steps
- 50-Kilometer + Steps
- Step-only registration
- Dual Challenge Finisher
- Step Finisher
- 25K Finisher

The registration flow should no longer require participants to select between these categories.

### Replacement Registration Logic

All registered participants join the same official challenge:

**50 km in 50 days**

---

## 7. Eligible Activity Types

Allow the following activity types:

- Walk
- Run
- Hike

These are the activities explicitly supported by the official event design.

### Do Not Include by Default

Do not advertise or automatically accept the following unless approved later:

- Cycling
- Swimming
- General step accumulation
- Other unrelated activity types

### Treadmill

The official activity design does not explicitly mention treadmill activities.

Keep treadmill support configurable.

Recommended implementation:

- Do not feature treadmill as an official activity type on the public page.
- If the Sports Coordinator later confirms treadmill activities are valid, enable it through admin configuration.

---

## 8. Tracking Applications and Devices

Participants may use:

- Strava
- Garmin Watch
- Other sports tracking applications
- Other sports tracking devices capable of measuring distance and elevation

Do not require Strava exclusively.

### Public Copy

Use wording similar to:

> Participants may use Strava or another sports tracking application or device that can record distance and elevation.

---

## 9. Screenshot Submission

The official activity design requires a screenshot of each completed activity to be uploaded to HelloRun.

Update the submission workflow to support this.

### Required Submission Evidence

Each submitted activity should include:

- Screenshot
- Activity date
- Distance
- Activity type
- Elevation gain, when available
- Fitness application or sports device used

### Preferred Submission Model

Use individual activity submissions rather than relying only on a monthly or weekly summary.

Each walk, run, or hike may be submitted separately.

### Submission Rules

A screenshot should be accepted when it clearly shows enough information to validate the activity.

The screenshot should ideally display:

- Activity date
- Distance
- Elevation gain
- Fitness application or device
- Participant profile or identity, when available

Do not require every app to show the exact same interface.

---

## 10. Submission Status

Retain or implement the following statuses:

- Pending
- Approved
- Rejected
- Needs Clarification

Only approved activity submissions should count toward official totals.

---

## 11. Participant Totals

For each participant, calculate:

- Total approved distance
- Total approved elevation gain
- Number of approved activities

### Distance Goal

Participant becomes a finisher when:

`approved_distance_km >= 50`

Distance may exceed 50 km.

Do not cap totals at 50 km.

Examples:

- 50 km = Finisher
- 63.4 km = Finisher
- 84.2 km = Finisher

---

## 12. Elevation Tracking

Elevation is explicitly included in the official activity design.

Store and calculate:

- Elevation gain per approved activity
- Total elevation gain per participant

Use elevation gain only.

Do not combine elevation gain and elevation loss.

Recommended storage unit:

**meters**

---

## 13. Leaderboard Update

The current event includes multiple leaderboards that are not all supported by the official activity design.

### Remove or Disable

Unless separately approved:

- Highest Steps
- Most Consistent Participant
- Step Leaderboard
- Active Days Leaderboard

### Retain

A distance leaderboard may be retained because participant distance is explicitly monitored and consolidated.

Suggested fields:

- Rank
- Participant
- Department or unit
- Total approved distance
- Total approved elevation gain
- Finisher status

### Elevation Leaderboard

The activity design explicitly tracks elevation but does not clearly state that highest elevation is an award category.

Implementation recommendation:

- Keep elevation totals visible in the admin dashboard.
- Make the public Highest Elevation leaderboard configurable.
- Default it to hidden until confirmed by the Sports and Wellness Coordinator.

---

## 14. Awards

The official activity design states:

- Special tokens will be awarded to the top three finishers.
- Participants who complete 50 km receive a Finisher's Certificate.
- Participants who participate but do not reach 50 km receive a Certificate of Participation.

### Required Certificate Logic

#### Finisher's Certificate

Issue when:

`approved_distance_km >= 50`

#### Certificate of Participation

Issue when:

- Participant is registered
- Participant has participated in the activity
- Participant does not reach 50 km

### Top Three

The exact definition of "top three finishers" is not clearly defined in the official document.

Do not hard-code the award criteria until confirmed.

Make the ranking basis configurable.

Suggested admin options:

- Highest total distance
- Highest total elevation
- First to complete 50 km
- Manual selection by event coordinator

Default recommendation:

**Do not auto-award until the coordinator confirms the ranking basis.**

---

## 15. Awarding Information

Display the following on the event page:

### Awarding Date

**November 9, 2026**

### Venue

**CAS Little Theater**

The awarding will be held in conjunction with the CNS Foundation Day celebration.

---

## 16. Registration Flow Update

Remove challenge-category selection.

### Registration Form

Collect:

- Full name
- Department or office
- Position or designation
- Email address
- Contact number
- Preferred fitness tracking application or device
- Consent to participate
- Consent to leaderboard display, if applicable
- Agreement to event rules

### Registration Period Validation

Registration should be open only from:

**September 9 to September 13, 2026**

Admin must be able to override or edit these dates.

---

## 17. Public Event Page Update

The event page should clearly show the following near the top:

- Official event title
- CNS Faculty and Staff
- Registration: September 9 to 13, 2026
- Challenge period: September 14 to November 3, 2026
- 50 km in 50 days
- Walk, run, or hike
- Virtual and self-paced
- Use Strava or another sports tracking app/device
- Upload screenshots of completed activities to HelloRun
- Distance and elevation are monitored
- Awarding: November 9, 2026
- Venue: CAS Little Theater

### Suggested Introductory Copy

> The College of Natural Sciences invites faculty and staff to join Wellness In Motion, a 50-day virtual walk, run, and hike challenge from September 14 to November 3, 2026.
>
> Participants may complete activities at their preferred location and pace while tracking their distance and elevation using Strava or another compatible sports tracking application or device.
>
> The goal is to accumulate at least 50 kilometers during the challenge period.
>
> Upload a screenshot of each completed walk, run, or hike to HelloRun for monitoring and consolidation.
>
> Participants who complete 50 kilometers will receive a Finisher's Certificate. Participants who join but do not complete the required distance will receive a Certificate of Participation.

---

## 18. Remove Outdated Public Copy

Search the event page and related event components for outdated text.

Remove or replace references to:

- September 1 to September 30
- 30-day challenge
- October 2 submission deadline
- 25 km
- 120,000 steps
- 4,000 steps per day
- Step challenge
- Dual challenge
- Highest Steps
- Most Consistent Participant
- 25K Finisher
- Step Finisher
- Dual Finisher

Also check:

- Event cards
- Registration confirmation page
- Participant dashboard
- Admin dashboard
- Email templates
- Certificates
- Leaderboards
- Event metadata
- Open Graph metadata
- SEO title and description
- Structured data
- API event response
- Database seed data
- Static fallback content

---

## 19. Participant Dashboard Update

Participant dashboard should show:

- Event title
- Challenge dates
- Total approved distance
- Total approved elevation gain
- Number of approved activities
- Pending submissions
- Rejected submissions
- Needs clarification submissions
- Progress toward 50 km
- Finisher status

### Progress Display

Example:

**34.8 km / 50 km**

or

**69.6% complete**

When completed:

**53.2 km / 50 km**

**Finisher**

Do not stop counting after 50 km.

---

## 20. Admin Dashboard Update

Admin should be able to:

- Edit registration dates
- Edit challenge dates
- Edit awarding date
- Edit awarding venue
- View all participants
- View all submissions
- Approve submissions
- Reject submissions
- Request clarification
- Review screenshots
- Edit submitted distance
- Edit submitted elevation gain
- Recalculate totals
- View top participants by distance
- View top participants by elevation
- Mark certificate eligibility
- Export participant totals
- Export submission data
- Configure award ranking basis
- Show or hide public leaderboards

---

## 21. Suggested Database Changes

If the existing implementation stores category-specific data, simplify or deprecate unsupported category fields.

### Event

Ensure the event supports:

- title
- short_title
- organizer
- registration_start
- registration_end
- activity_start
- activity_end
- awarding_date
- awarding_venue
- target_distance_km
- challenge_duration_days
- tracking_requirements
- allowed_activity_types
- status

### Participant

Recommended fields:

- id
- event_id
- full_name
- department
- position
- email
- contact_number
- preferred_tracking_app
- leaderboard_consent
- registration_status
- created_at
- updated_at

### Activity Submission

Recommended fields:

- id
- event_id
- participant_id
- activity_date
- activity_type
- distance_km
- elevation_gain_m
- duration_minutes
- tracking_app
- screenshot_url
- notes
- status
- validation_remarks
- reviewed_by
- reviewed_at
- created_at
- updated_at

### Participant Totals

Recommended fields:

- event_id
- participant_id
- approved_distance_km
- approved_elevation_gain_m
- approved_activity_count
- finisher_status
- certificate_type
- last_recalculated_at

---

## 22. Certificate Logic

### Finisher

If:

`approved_distance_km >= 50`

Set:

`certificate_type = finisher`

### Participant

If:

`approved_distance_km < 50`

and participant has at least one approved activity:

Set:

`certificate_type = participation`

### No Activity

If participant registered but has no approved activity:

Do not automatically issue a certificate unless the coordinator decides otherwise.

Keep this rule configurable.

---

## 23. Monitoring Workflow

The official program identifies HelloRun as the dashboard used for monitoring.

The system should support:

1. Participant registration
2. Activity screenshot upload
3. Validation
4. Distance consolidation
5. Elevation consolidation
6. Participant progress monitoring
7. Winner finalization
8. Certificate preparation
9. Final export for accomplishment reporting

---

## 24. Reporting Support

The admin dashboard should support exports for:

- Registered participants
- Active participants
- Finishers
- Non-finishers
- Activity submissions
- Total distance per participant
- Total elevation per participant
- Certificate type
- Top participants

CSV export is sufficient unless the current system already supports PDF or spreadsheet reports.

---

## 25. Items That Need Coordinator Confirmation

Do not assume these rules.

Keep them configurable or leave them disabled until confirmed:

### Top Three Finishers

Clarify whether ranking means:

- Highest accumulated distance
- Highest elevation
- Fastest completion
- Manual selection

### Highest Elevation Award

Elevation is monitored, but a separate elevation award is not explicitly stated.

### Treadmill Activities

Not explicitly mentioned in the activity design.

### Submission Deadline After November 3

The document specifies the activity period and winner finalization dates but does not state a separate final upload deadline.

### Late Submissions

Not defined.

### Public Leaderboard Visibility

Not defined.

### Certificate for Registered Participants With No Approved Activity

Not defined.

---

## 26. Migration Guidance

Do not delete existing participant or activity data without reviewing it first.

If the existing event already has registrations or submissions:

1. Back up current event data.
2. Identify participants registered under old categories.
3. Map all existing participants into the single 50 km challenge.
4. Preserve valid distance activities.
5. Preserve valid elevation data.
6. Ignore step totals for official challenge calculations.
7. Remove step-based finisher status.
8. Recalculate participant distance totals.
9. Recalculate finisher status using the 50 km threshold.
10. Review all existing submissions dated before September 14, 2026.
11. Do not count activities outside September 14 to November 3 unless manually approved by the coordinator.

---

## 27. Acceptance Criteria

The update is complete when:

- Registration shows September 9 to 13, 2026.
- Event period shows September 14 to November 3, 2026.
- The event is presented as a 50-day challenge.
- The main challenge is 50 km.
- 25 km and step challenges are removed or disabled.
- Walk, run, and hike are the official activity types.
- Participants can upload screenshots from Strava or another compatible sports app/device.
- Distance is recorded per activity.
- Elevation gain is recorded when available.
- Approved distance is accumulated correctly.
- Approved elevation is accumulated correctly.
- Participants may exceed 50 km.
- 50 km or more triggers Finisher status.
- Participants below 50 km with valid participation can receive a Certificate of Participation.
- The event page shows awarding on November 9, 2026.
- CAS Little Theater is shown as the awarding venue.
- Unsupported awards are removed or disabled.
- Admin can configure the top-three ranking rule later.
- HelloRun remains the monitoring and submission dashboard.
- Existing participant data is not unintentionally lost.

---

## 28. Recommended Implementation Order

### Phase 1: Event Configuration

- Update title
- Update dates
- Update venue
- Update 50 km target
- Remove old categories

### Phase 2: Registration

- Remove category selector
- Update registration date validation
- Retain participant information

### Phase 3: Submission

- Simplify to walk, run, and hike
- Require screenshot
- Capture distance
- Capture elevation
- Support Strava and other compatible apps/devices

### Phase 4: Dashboard

- Remove step progress
- Remove active-day consistency metrics
- Show distance progress
- Show elevation
- Show finisher status

### Phase 5: Leaderboards and Awards

- Retain distance ranking
- Keep elevation ranking configurable
- Disable unsupported awards
- Add configurable top-three logic

### Phase 6: Certificates and Reports

- Add Finisher's Certificate logic
- Add Certificate of Participation logic
- Add exports

### Phase 7: Final QA

Search the codebase and UI for any remaining references to:

- 30 days
- September 1
- September 30
- October 2
- 25 km
- 120,000 steps
- 4,000 steps/day
- step challenge
- dual challenge
- most consistent participant

No outdated event mechanics should remain visible unless intentionally preserved for historical data.
