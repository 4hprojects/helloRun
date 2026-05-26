# HelloRun Leaderboard Improvement Specification

## Purpose

Improve the HelloRun leaderboard into a user-friendly results, progress, and verification system.

This update should support:

- Competitive race results
- Accumulated virtual run challenges
- Team or club challenges
- Completion-only events
- Custom organiser ranking
- Runner-friendly personal standing
- Admin-friendly verification and review controls

The leaderboard should not behave like a plain spreadsheet.

It should help three users:

- Runners who want to know if their result counted
- Organisers who need to validate submissions
- Public viewers who want to browse results clearly

---

## Benchmark Findings

The following product patterns should guide the implementation.

### RunSignup

RunSignup supports searchable race results. Participants can search by bib number or name after finish data is uploaded. It also supports race result publishing, result sets, custom fields, live leaderboard links, and CSV-based result uploads.

Implementation lesson for HelloRun:

- Add strong search.
- Support custom visible fields.
- Support organiser-controlled result publishing.
- Prepare for future import from timing providers.

Sources:

- https://info.runsignup.com/products/raceday/runsignup-raceday-results/
- https://help.runsignup.com/support/solutions/articles/17000067119-use-results-and-live-leaderboard-links
- https://help.runsignup.com/support/solutions/articles/17000064294--upload-individual-results-recommended-

### Race Roster

Race Roster Results V3 focuses on mobile-first results, centralised participant search, modernised stats, awards search, wider desktop leaderboards, and an accessible results inquiry button.

Implementation lesson for HelloRun:

- Prioritise mobile display.
- Put search near the top.
- Add awards view.
- Add a visible inquiry or correction request action.
- Make desktop tables adapt to wider screens.

Sources:

- https://raceroster.com/major-releases/introducing-race-roster-results-v3
- https://raceroster.com/articles/results-v3-has-arrived
- https://raceroster.com/articles/whats-new-for-results-v3
- https://help.raceroster.com/en-us/knowledge-base/what-are-default-columns-in-results

### Strava

Strava segment leaderboards support segmented filtering by activity type, gender, age group, weight, clubs, followers, and personal efforts. Privacy settings also affect leaderboard visibility.

Implementation lesson for HelloRun:

- Use filtered leaderboard views.
- Separate personal standing from global ranking.
- Respect privacy settings.
- Do not show every participant in one unfiltered list by default.

Sources:

- https://support.strava.com/hc/en-us/articles/360030851772-Segment-Leaderboard-Filters
- https://support.strava.com/hc/en-us/articles/4424254689805-Gender-Settings-and-Leaderboard-Filters
- https://support.strava.com/hc/en-us/articles/216919507-Segment-Leaderboard-Guidelines
- https://communityhub.strava.com/insider-journal-9/explore-and-compete-with-segment-leaderboards-1496

### ChallengeRunner

ChallengeRunner supports challenge leaderboards, nearby participants, team leaderboards, milestones, awards, anonymous leaderboards, admin reports, sortable milestone progress, and real-time participant review.

Implementation lesson for HelloRun:

- Add personal standing with nearby runners.
- Add milestones for accumulated challenges.
- Add team views.
- Add anonymous display mode.
- Add admin reports for verification and awards.

Sources:

- https://www.challengerunner.com/Features/Fitness-Challenge-Leaderboard
- https://www.challengerunner.com/Admin-Manual/Fitness-Challenge-Milestones
- https://www.challengerunner.com/Admin-Manual/challenge-reporting

---

## Core Design Direction

The HelloRun leaderboard should be divided into five major views.

```text
Leaderboard Page
├── Event Summary Header
├── My Standing Card
├── Filter and Search Bar
├── Leaderboard Tabs
│   ├── Overall
│   ├── Category
│   ├── Gender
│   ├── Age Group
│   ├── Team
│   ├── Awards
│   └── My Standing
├── Leaderboard Results
└── Status Legend
```

---

## Leaderboard Types

Codex should implement leaderboard logic based on the event leaderboard type.

### Supported Types

```js
const LEADERBOARD_TYPES = {
  RACE_RESULT: "race_result",
  ACCUMULATED_CHALLENGE: "accumulated_challenge",
  TEAM_CHALLENGE: "team_challenge",
  COMPLETION_ONLY: "completion_only",
  CUSTOM_RANKING: "custom_ranking"
};
```

### Type Behaviour

| Type | Best for | Ranking basis |
|---|---|---|
| race_result | One-time virtual race or imported onsite result | Fastest valid time |
| accumulated_challenge | Monthly virtual run, mileage challenge | Highest verified distance or completion percentage |
| team_challenge | Club, school, company, group event | Team total or team average |
| completion_only | Charity run, finisher event, non-competitive event | Completed or not completed |
| custom_ranking | Special organiser event | Organiser-defined ranking |

---

## Creator POV

Add a `Leaderboard Settings` section to the event creation and edit flow.

### Section Title

```text
Leaderboard Settings
```

### Field Group 1: Leaderboard Type

```text
How should runners be ranked?

[ ] Race Result
    Best for one-time runs. Runners are ranked by fastest verified time.

[ ] Accumulated Challenge
    Best for virtual challenges. Runners are ranked by total verified distance or progress.

[ ] Team Challenge
    Best for schools, companies, clubs, or groups.

[ ] Completion Only
    Best for charity runs or non-competitive events.

[ ] Custom Ranking
    Best when organiser wants manual or special ranking rules.
```

### Field Group 2: Ranking Basis

Show options based on selected leaderboard type.

#### Race Result

```text
Ranking Basis
[ ] Fastest verified time
[ ] Best verified pace
[ ] Manual organiser ranking
```

#### Accumulated Challenge

```text
Ranking Basis
[ ] Highest verified distance
[ ] Completion percentage
[ ] Most verified activities
[ ] Earliest completion date
```

#### Team Challenge

```text
Ranking Basis
[ ] Team total distance
[ ] Team average distance
[ ] Team completion percentage
[ ] Team activity count
```

#### Completion Only

```text
Ranking Basis
[ ] Show finishers alphabetically
[ ] Show finishers by completion date
[ ] Show finishers by registration date
```

#### Custom Ranking

```text
Ranking Basis
[ ] Manual organiser order
[ ] Imported ranking value
[ ] Custom points
```

### Field Group 3: Visible Columns

```text
Show on leaderboard:

[ ] Overall rank
[ ] Category rank
[ ] Gender rank
[ ] Age group rank
[ ] Team rank
[ ] Distance
[ ] Time
[ ] Pace
[ ] Activity count
[ ] Completion percentage
[ ] Verification status
[ ] Submission date
[ ] Certificate status
```

### Field Group 4: Privacy

```text
Runner name display:

[ ] Full name
[ ] First name + last initial
[ ] Display name
[ ] Anonymous runner ID
```

### Field Group 5: Review Visibility

```text
Before appearing on leaderboard:

[ ] Show only approved submissions
[ ] Show pending submissions with Pending Review label
[ ] Hide flagged submissions
[ ] Allow organiser override
```

### Field Group 6: Public Access

```text
Leaderboard visibility:

[ ] Public
[ ] Registered runners only
[ ] Organiser and admins only until published
```

---

## Runner POV

The runner should see personal standing first when logged in.

### My Standing Card

```text
My Standing

Overall Rank: 14
Category Rank: 5
Gender Rank: 8
Status: Verified
Submitted Distance: 10.04 km
Submitted Time: 58:42
Pace: 5:51/km

[View Proof]
[Update Submission]
[Ask for Result Review]
```

### Nearby Runners

Show 2 runners above and 2 runners below the logged-in runner.

```text
Nearby Runners

#12  Maria C.      57:48
#13  Arman D.      58:21
#14  You           58:42
#15  Kevin R.      59:10
#16  Trisha P.     59:44
```

This helps casual runners because they do not need to scroll through a long leaderboard.

---

## Public Viewer POV

For public viewers, show:

- Event name
- Event status
- Category filter
- Search bar
- Overall leaderboard
- Status legend
- Last updated timestamp

Do not show proof images publicly unless event settings explicitly allow it.

---

## Admin and Organiser POV

Admins and organisers need verification controls.

### Admin Leaderboard View

Add admin-only tabs:

```text
Approved
Pending Review
Flagged
Rejected
Award Candidates
Manual Overrides
```

### Admin Row Actions

Each row should support:

```text
[View Submission]
[Approve]
[Reject]
[Flag]
[Edit Ranking]
[Mark as Award Winner]
[Add Internal Note]
```

### Admin Columns

```text
Rank
Runner
Category
Submitted Distance
OCR Distance
Submitted Time
OCR Time
OCR Confidence
Status
Suspicious Flag
Mismatch Flags
Reviewer
Updated At
Actions
```

---

## Submission Status Rules

Use these public-facing labels.

```js
const LEADERBOARD_STATUS = {
  VERIFIED: "verified",
  PENDING_REVIEW: "pending_review",
  FLAGGED: "flagged",
  INCOMPLETE: "incomplete",
  REJECTED: "rejected",
  DISQUALIFIED: "disqualified"
};
```

### Status Display

| Status | Public label | Should count in ranking? |
|---|---|---|
| verified | Verified | Yes |
| pending_review | Pending Review | No by default |
| flagged | Flagged for Review | No |
| incomplete | Incomplete | No |
| rejected | Rejected | No |
| disqualified | Disqualified | No |

### Default Rule

Only verified submissions should affect official rank.

Pending submissions may be shown if organiser enables the setting.

---

## OCR and Fraud Integration

The leaderboard should use existing OCR and suspicious flag logic.

### Auto-Approved Submission Eligibility

A submission can be eligible for leaderboard ranking only when:

```text
status is approved or verified
OCR name match is matched
OCR distance exists and is greater than 0
OCR time exists and is greater than 0
OCR confidence is at least 0.7
No mismatch flags are true
suspiciousFlag is false
```

### Mismatch Flags

Treat these as review blockers:

```js
const OCR_REVIEW_BLOCKERS = [
  "distanceMismatch",
  "timeMismatch",
  "elevationMismatch",
  "stepsMismatch",
  "dateMismatch",
  "locationMismatch",
  "runTypeMismatch"
];
```

### Accumulated Run Exception

For accumulated challenges, distance mismatch may be acceptable if:

- The event allows multiple submissions.
- The submitted proof is part of accumulated progress.
- The proof distance is greater than 0.
- The accumulated total still follows event rules.

For one-time submissions, distance mismatch should trigger pending review if the submitted distance does not meet the minimum category requirement.

---

## Ranking Logic

Create a central service.

Suggested file:

```text
src/services/leaderboard.service.js
```

### Function List

```js
getLeaderboardForEvent(eventId, options)
getMyStanding(eventId, userId, options)
getNearbyRunners(eventId, userId, options)
calculateRaceResultRanks(entries, settings)
calculateAccumulatedChallengeRanks(entries, settings)
calculateTeamRanks(entries, settings)
calculateCompletionOnlyResults(entries, settings)
applyTieBreakers(entries, settings)
formatLeaderboardEntry(entry, settings)
getAwardCandidates(eventId, settings)
```

---

## Rank Calculation Rules

### Race Result Ranking

Use this order:

```text
1. Submission must be verified.
2. Submitted or OCR-confirmed distance must meet category minimum.
3. Sort by fastest verified time.
4. If tied, sort by earliest verified submission date.
5. If still tied, sort by earliest registration date.
```

Example comparator:

```js
function compareRaceResults(a, b) {
  if (a.timeSeconds !== b.timeSeconds) {
    return a.timeSeconds - b.timeSeconds;
  }

  if (a.verifiedAt && b.verifiedAt) {
    return new Date(a.verifiedAt) - new Date(b.verifiedAt);
  }

  return new Date(a.registeredAt) - new Date(b.registeredAt);
}
```

### Accumulated Challenge Ranking

Use this order:

```text
1. Submission must be verified.
2. Sum verified distances.
3. Sort by highest total distance.
4. If tied, sort by earliest completion date.
5. If still tied, sort by fewer activity count only if organiser enables this tie-breaker.
6. If still tied, sort by earliest registration date.
```

Example comparator:

```js
function compareAccumulatedResults(a, b) {
  if (a.totalDistanceKm !== b.totalDistanceKm) {
    return b.totalDistanceKm - a.totalDistanceKm;
  }

  if (a.completedAt && b.completedAt) {
    return new Date(a.completedAt) - new Date(b.completedAt);
  }

  return new Date(a.registeredAt) - new Date(b.registeredAt);
}
```

### Team Challenge Ranking

Support two ranking modes:

```text
team_total_distance
team_average_distance
```

Team total distance:

```js
team.totalDistanceKm = sum(member.verifiedDistanceKm)
```

Team average distance:

```js
team.averageDistanceKm = team.totalDistanceKm / team.verifiedMemberCount
```

Suggested rule:

- Use total distance for public fun runs.
- Use average distance when team sizes are uneven.

### Completion Only Ranking

Use:

```text
1. Completed runners first.
2. Sort by completion date or name, depending on organiser setting.
3. Do not show competitive rank by default.
```

Instead of rank numbers, display:

```text
Finisher
Completed
Pending
Incomplete
```

### Custom Ranking

Custom ranking should use an organiser-supplied value.

```js
customRank
customPoints
manualOrder
```

If custom ranking is active, show a notice:

```text
Ranking is based on organiser-defined rules.
```

---

## Suggested Data Model Updates

Use the existing HelloRun data structure if already available. If not, add the following fields.

### Event Core

Add to event settings:

```js
leaderboardSettings: {
  enabled: true,
  type: "race_result",
  rankingBasis: "fastest_time",
  visibility: "public",
  showPending: false,
  hideFlagged: true,
  nameDisplayMode: "first_name_last_initial",
  visibleColumns: [
    "overallRank",
    "categoryRank",
    "distance",
    "time",
    "pace",
    "status"
  ],
  tieBreakers: [
    "verifiedAt",
    "registeredAt"
  ],
  allowResultInquiry: true,
  allowAwardsView: true,
  allowTeamLeaderboard: false,
  allowAgeGroupLeaderboard: false,
  allowGenderLeaderboard: true
}
```

### Leaderboard Entry Projection

Create a projected entry object for the UI.

```js
{
  eventId,
  registrationId,
  userId,
  runnerDisplayName,
  anonymousRunnerId,
  categoryId,
  categoryName,
  gender,
  ageGroup,
  teamId,
  teamName,

  overallRank,
  categoryRank,
  genderRank,
  ageGroupRank,
  teamRank,

  distanceKm,
  totalDistanceKm,
  timeSeconds,
  paceSecondsPerKm,
  activityCount,
  completionPercentage,

  status,
  proofStatus,
  ocrConfidence,
  suspiciousFlag,
  mismatchFlags,

  submittedAt,
  verifiedAt,
  completedAt,
  registeredAt
}
```

### Optional Cache Collection

For performance, create a cached leaderboard collection.

```js
leaderboard_cache: {
  eventId,
  viewType,
  filterHash,
  generatedAt,
  entries: [],
  metadata: {
    totalEntries,
    verifiedEntries,
    pendingEntries,
    flaggedEntries,
    lastUpdatedAt
  }
}
```

Use cache only after the basic service works.

---

## API Routes

Suggested routes:

```text
GET /events/:eventSlug/leaderboard
GET /events/:eventSlug/leaderboard/data
GET /events/:eventSlug/leaderboard/my-standing
GET /events/:eventSlug/leaderboard/awards
GET /events/:eventSlug/leaderboard/team
GET /events/:eventSlug/leaderboard/search

GET /organizer/events/:eventId/leaderboard/settings
POST /organizer/events/:eventId/leaderboard/settings

GET /organizer/events/:eventId/leaderboard/review
POST /organizer/events/:eventId/leaderboard/manual-override
POST /organizer/events/:eventId/leaderboard/publish
```

### Query Parameters

```text
?view=overall
?categoryId=5k
?gender=male
?ageGroup=18-29
?teamId=abc123
?status=verified
?search=henson
?page=1
?limit=25
?sort=rank
```

---

## Controller Behaviour

Suggested file:

```text
src/controllers/leaderboard.controller.js
```

### Public Leaderboard Page

```js
async function renderLeaderboardPage(req, res) {
  const { eventSlug } = req.params;

  const event = await eventService.getPublicEventBySlug(eventSlug);
  const settings = event.leaderboardSettings;

  if (!settings?.enabled) {
    return res.status(404).render("errors/404");
  }

  return res.render("events/leaderboard", {
    event,
    settings,
    user: req.user || null
  });
}
```

### Leaderboard Data Endpoint

```js
async function getLeaderboardData(req, res) {
  const { eventSlug } = req.params;

  const event = await eventService.getPublicEventBySlug(eventSlug);

  const data = await leaderboardService.getLeaderboardForEvent(event.id, {
    view: req.query.view || "overall",
    categoryId: req.query.categoryId,
    gender: req.query.gender,
    ageGroup: req.query.ageGroup,
    teamId: req.query.teamId,
    status: req.query.status,
    search: req.query.search,
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 25),
    currentUserId: req.user?.id || null
  });

  return res.json(data);
}
```

---

## UI Requirements

### Public Page Layout

Suggested EJS file:

```text
views/events/leaderboard.ejs
```

Sections:

```text
1. Event Header
2. My Standing Card
3. Filters
4. Tabs
5. Leaderboard Results
6. Pagination
7. Status Legend
8. Result Inquiry Button
```

### Event Header

Show:

```text
Event name
Event date or challenge period
Leaderboard type
Last updated timestamp
```

Example:

```text
Baguio Virtual 10K
Race Result Leaderboard
Last updated: May 26, 2026, 10:30 AM
```

### Filter Bar

Desktop:

```text
[Search runner] [Category] [Gender] [Age Group] [Team] [Status]
```

Mobile:

```text
[Search runner]
[Filters Button]
```

The filters button should open a modal or drawer.

### Tabs

```text
Overall
Category
Gender
Age Group
Team
Awards
My Standing
```

Only show tabs enabled in event settings.

### Mobile Card

Use cards below `md` breakpoint.

```html
<article class="rounded-2xl border bg-white p-4 shadow-sm">
  <div class="flex items-start justify-between gap-3">
    <div>
      <p class="text-sm text-gray-500">#12 Overall</p>
      <h3 class="font-semibold text-gray-900">Henson S.</h3>
      <p class="text-sm text-gray-500">10K Virtual Run</p>
    </div>
    <span class="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
      Verified
    </span>
  </div>

  <dl class="mt-4 grid grid-cols-3 gap-3 text-sm">
    <div>
      <dt class="text-gray-500">Distance</dt>
      <dd class="font-medium">10.04 km</dd>
    </div>
    <div>
      <dt class="text-gray-500">Time</dt>
      <dd class="font-medium">58:42</dd>
    </div>
    <div>
      <dt class="text-gray-500">Pace</dt>
      <dd class="font-medium">5:51/km</dd>
    </div>
  </dl>
</article>
```

### Desktop Table

Use table from `md` breakpoint and above.

Columns should depend on `visibleColumns`.

Default columns:

```text
Rank
Runner
Category
Distance
Time
Pace
Status
```

### Empty State

```text
No leaderboard results yet.
Verified results will appear here once submissions are approved.
```

### Pending State

```text
Your submission is pending review.
It will appear in official rankings after verification.
```

### Flagged State

```text
This submission needs organiser review.
```

---

## Status Badge Design

Use consistent badge classes.

```js
const STATUS_BADGE_CLASSES = {
  verified: "bg-green-100 text-green-700",
  pending_review: "bg-yellow-100 text-yellow-700",
  flagged: "bg-orange-100 text-orange-700",
  incomplete: "bg-gray-100 text-gray-700",
  rejected: "bg-red-100 text-red-700",
  disqualified: "bg-red-100 text-red-700"
};
```

---

## Result Inquiry Feature

Add a `Request Result Review` action.

### Public Button

```text
Request Result Review
```

### When clicked

If logged in:

```text
Open inquiry modal.
```

If not logged in:

```text
Ask user to log in first.
```

### Inquiry Fields

```text
Reason
Expected result
Optional note
```

### Admin View

Add inquiry count to the organiser leaderboard review page.

---

## Awards View

Awards should be generated from verified entries only.

### Suggested Awards

```text
Overall Champion
Overall 2nd Place
Overall 3rd Place
Category Champion
Gender Category Champion
Age Group Champion
Team Champion
Finisher
```

### Award Candidate Object

```js
{
  awardKey,
  awardLabel,
  registrationId,
  runnerDisplayName,
  categoryName,
  basis,
  rank,
  value
}
```

### Award Rule

If the organiser enables awards:

```text
Generate award candidates from the current official leaderboard.
Allow organiser to confirm final awardees.
```

Do not auto-publish awardees without organiser review.

---

## Privacy Rules

### Name Formatting

```js
function formatRunnerName(user, mode) {
  if (mode === "full_name") {
    return `${user.firstName} ${user.lastName}`;
  }

  if (mode === "first_name_last_initial") {
    return `${user.firstName} ${user.lastName?.charAt(0) || ""}.`;
  }

  if (mode === "display_name") {
    return user.displayName || `${user.firstName} ${user.lastName?.charAt(0) || ""}.`;
  }

  if (mode === "anonymous_runner_id") {
    return `Runner #${user.runnerNumber}`;
  }

  return `${user.firstName} ${user.lastName?.charAt(0) || ""}.`;
}
```

### Proof Privacy

Public leaderboard should not expose:

- Payment proof
- Run screenshot
- OCR raw text
- IP address
- Email
- Phone number
- Internal notes
- Suspicious flag details

Only admins and organisers should see these.

---

## Accessibility Requirements

Implement:

- Proper table headers
- Visible focus states
- Clear badge text, not colour-only meaning
- Search input label
- Keyboard accessible filters
- Pagination buttons with labels
- Screen-reader-friendly status text

Example:

```html
<span class="sr-only">Submission status:</span>
<span class="badge">Verified</span>
```

---

## Performance Requirements

### Pagination

Default:

```text
25 rows per page
```

Options:

```text
25
50
100
```

### Search

Search should support:

```text
First name
Last name
Display name
Bib number
Registration ID
Team name
```

### Indexing

Add database indexes based on actual DB used.

Suggested indexes:

```text
eventId
eventId + status
eventId + categoryId
eventId + userId
eventId + teamId
eventId + submittedAt
eventId + verifiedAt
eventId + timeSeconds
eventId + totalDistanceKm
```

### Cache

Initial implementation can calculate live.

Add cache later if:

```text
Event has more than 500 participants
Leaderboard is public
Ranking calculation becomes slow
```

---

## Security Requirements

- Public route must only return public-safe fields.
- Admin route must require organiser or admin permissions.
- Manual override must be audit logged.
- Publish action must be audit logged.
- Review inquiry must be rate limited.
- Search should not expose private users outside the event.
- Rejected and disqualified entries should not appear publicly unless organiser explicitly enables this.

---

## Audit Logging

Log these actions:

```text
Leaderboard settings updated
Leaderboard published
Manual rank override added
Manual rank override removed
Submission approved from leaderboard review
Submission rejected from leaderboard review
Award candidate confirmed
Award candidate removed
Result inquiry submitted
Result inquiry resolved
```

Suggested audit object:

```js
{
  action,
  eventId,
  actorUserId,
  targetRegistrationId,
  before,
  after,
  createdAt
}
```

---

## Suggested Files to Add or Update

Codex should inspect the actual repository first, then adapt names to the existing structure.

### Add

```text
src/services/leaderboard.service.js
src/controllers/leaderboard.controller.js
src/routes/leaderboard.routes.js
src/utils/leaderboardRanking.js
src/utils/leaderboardFormatting.js
src/utils/leaderboardPrivacy.js
src/validators/leaderboardSettings.validator.js
views/events/leaderboard.ejs
views/partials/leaderboard/_filters.ejs
views/partials/leaderboard/_tabs.ejs
views/partials/leaderboard/_my-standing-card.ejs
views/partials/leaderboard/_mobile-card.ejs
views/partials/leaderboard/_desktop-table.ejs
views/partials/leaderboard/_status-badge.ejs
views/organizer/leaderboard-settings.ejs
views/organizer/leaderboard-review.ejs
tests/leaderboard.service.test.js
tests/leaderboard.routes.test.js
```

### Update

```text
src/routes/index.js
src/models/event.model.js
src/models/submission.model.js
src/models/registration.model.js
src/services/submission.service.js
views/events/show.ejs
views/organizer/event-edit.ejs
docs/PRD.md
```

---

## PRD Update Content

Add this to the HelloRun PRD.

```md
### Leaderboard and Results Experience

HelloRun will provide an improved leaderboard and results experience for virtual, onsite, and hybrid running events. The leaderboard will support race result rankings, accumulated virtual challenge progress, team-based rankings, completion-only events, and custom organiser ranking.

The leaderboard will prioritise runner clarity by showing personal standing, nearby runners, verification status, category ranking, and mobile-friendly result cards. For organisers, it will provide review-focused views for approved, pending, flagged, rejected, and award-candidate submissions.

Only verified submissions will affect official rankings by default. Pending or flagged submissions may be displayed depending on organiser settings, but they will be clearly labelled and excluded from official rank calculations unless manually approved.

The system will include privacy controls for runner name display, support for filtered leaderboard views, and organiser-controlled publishing. Future enhancements may include timing-provider imports, live leaderboard display links, and cached leaderboard generation for high-volume events.
```

---

## Test Cases

### Race Result Ranking

```text
Given three verified 10K submissions
When leaderboard type is race_result
Then entries are sorted by fastest verified time
```

```text
Given two runners with the same time
When tie-breaker is verifiedAt
Then the earlier verified submission ranks higher
```

```text
Given a pending submission with the fastest time
When official leaderboard is loaded
Then the pending submission does not receive official rank
```

### Accumulated Challenge Ranking

```text
Given multiple verified submissions per runner
When leaderboard type is accumulated_challenge
Then each runner's verified distance is summed
```

```text
Given one runner with 50 km and another with 45 km
When ranking by highest distance
Then the 50 km runner ranks higher
```

```text
Given an accumulated event
When a single activity distance does not match the full target
Then it is not automatically rejected only because it is below the full target
```

### Team Ranking

```text
Given runners assigned to teams
When team leaderboard is opened
Then verified distances are grouped by team
```

```text
Given team ranking basis is average distance
When teams have different member counts
Then team rank uses average verified distance
```

### Privacy

```text
Given name display mode is first_name_last_initial
When leaderboard is public
Then full last name is not shown
```

```text
Given name display mode is anonymous_runner_id
When leaderboard is public
Then runner names are replaced with Runner #ID
```

### Admin Review

```text
Given a flagged submission
When public leaderboard is loaded
Then the flagged submission is hidden by default
```

```text
Given organiser opens review leaderboard
When submission is flagged
Then organiser can view mismatch flags and proof details
```

### Search

```text
Given a participant named Henson Sagorsor
When user searches Henson
Then matching leaderboard entry is returned
```

```text
Given a participant has bib number 1042
When user searches 1042
Then matching leaderboard entry is returned
```

### Awards

```text
Given awards view is enabled
When leaderboard has verified results
Then award candidates are generated from verified entries only
```

```text
Given organiser confirms awardee
When awards tab is public
Then confirmed awardee appears in awards view
```

---

## Acceptance Criteria

The implementation is complete when:

- Public leaderboard page exists for each eligible event.
- Leaderboard supports race result and accumulated challenge modes.
- Search works by runner name and bib or registration number.
- Logged-in runner can see My Standing.
- Logged-in runner can see nearby runners.
- Official ranking excludes pending, flagged, rejected, and disqualified submissions by default.
- Organiser can configure leaderboard type.
- Organiser can configure visible columns.
- Organiser can configure name display privacy.
- Organiser can show or hide pending submissions.
- Admin or organiser can view pending and flagged submissions.
- Mobile layout uses cards.
- Desktop layout uses a table.
- Awards tab can show generated award candidates.
- Public API does not expose private proof data.
- Tests cover ranking, filtering, privacy, and status behaviour.
- PRD is updated with leaderboard scope.

---

## Suggested Implementation Order

### Phase 1: Core Public Leaderboard

- Add leaderboard settings to event model.
- Add leaderboard service.
- Add race result ranking.
- Add accumulated challenge ranking.
- Add public route and page.
- Add mobile card and desktop table.
- Add search.
- Add status badges.

### Phase 2: Runner Personalisation

- Add My Standing card.
- Add nearby runners.
- Add category rank.
- Add gender rank if event enables gender filter.
- Add result inquiry button.

### Phase 3: Creator Settings

- Add leaderboard settings form.
- Add visible column controls.
- Add privacy controls.
- Add pending visibility controls.

### Phase 4: Admin Review

- Add review leaderboard.
- Add pending and flagged tabs.
- Add manual override.
- Add audit logs.

### Phase 5: Awards and Teams

- Add awards tab.
- Add team ranking.
- Add award confirmation.
- Add export-ready result view.

### Phase 6: Optimisation

- Add caching for large events.
- Add database indexes.
- Add live leaderboard display route.
- Add import-friendly structure for future timing provider results.

---

## Codex Task Prompt

Use this prompt when asking Codex to apply the update.

```text
Implement the HelloRun leaderboard improvement based on docs/leaderboard_improvement_spec.md.

First, inspect the existing repository structure and identify the current event, registration, submission, user, and organiser/admin route patterns.

Then implement the smallest safe version first:

1. Add leaderboardSettings to the event model or equivalent event settings structure.
2. Add a leaderboard service that supports:
   - race_result ranking
   - accumulated_challenge ranking
   - verified-only official ranking by default
   - My Standing
   - nearby runners
   - basic search
3. Add public leaderboard routes:
   - GET /events/:eventSlug/leaderboard
   - GET /events/:eventSlug/leaderboard/data
   - GET /events/:eventSlug/leaderboard/my-standing
4. Add EJS views and partials:
   - mobile card layout
   - desktop table layout
   - filters
   - tabs
   - status badges
   - My Standing card
5. Add organiser leaderboard settings form if an organiser event edit page already exists.
6. Add admin or organiser review view only if compatible with the current permission structure.
7. Add tests for ranking, privacy, search, and status filtering.
8. Update docs/PRD.md with the leaderboard and results experience section.

Do not expose payment proof, run proof screenshot, OCR raw text, internal notes, IP address, email address, or phone number on public leaderboard endpoints.

Keep the implementation consistent with the existing HelloRun architecture, naming conventions, authentication middleware, route style, and EJS/Tailwind conventions.

After implementation, run the relevant tests and document any skipped items with reasons.
```

---

## Developer Notes

### Do not overbuild first

Start with:

```text
race_result
accumulated_challenge
search
my standing
nearby runners
status badges
privacy name display
```

Then add:

```text
team
awards
manual override
cache
live display
```

### Keep ranking explainable

Every leaderboard should show a small explanation.

Examples:

```text
Ranked by fastest verified time.
```

```text
Ranked by highest verified accumulated distance.
```

```text
Only verified submissions are included in official rankings.
```

### Avoid confusing casual runners

Do not show suspicious flags publicly.

Use public labels only:

```text
Pending Review
Verified
Incomplete
```

Keep detailed review reasons for organisers only.

---

## Suggested UI Copy

### Leaderboard Intro

```text
View verified results for this event. Use the filters to check category, team, or personal standing.
```

### Pending Message

```text
Your proof was submitted and is waiting for review. It will appear in official rankings after verification.
```

### No Results

```text
No verified results yet. Results will appear here once submissions are approved.
```

### Ranking Explanation

```text
Official rankings include verified submissions only.
```

### Result Inquiry

```text
Think your result needs correction? Submit a result review request.
```

---

## Final Recommendation

Build the leaderboard as a results experience, not a table.

The first version should answer these questions clearly:

```text
Did my run count?
What is my rank?
What is my category rank?
Who is near me?
Is my proof verified?
Why am I not on the leaderboard yet?
Who won each category?
```

If the leaderboard answers those questions, it will feel useful to runners and manageable for organisers.
