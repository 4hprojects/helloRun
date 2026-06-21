# HelloRun Strava Integration Instructions for Codex

## Goal

Implement a Strava integration for HelloRun that lets a logged-in HelloRun user connect their Strava account, fetch recent Strava activities, manually select one activity, and submit it as run proof for a HelloRun event.

HelloRun must remain the main account system. Strava is only an optional connected activity source.

---

## Recommended MVP Scope

Build this first:

1. Connect Strava through OAuth.
2. Save the user's Strava connection securely.
3. Fetch recent activities only when the user clicks "Import from Strava".
4. Let the user manually select an activity.
5. Validate the activity against event rules.
6. Save the selected activity as a HelloRun run submission.
7. Use the saved HelloRun submission for progress, leaderboard, certificates, and organiser review.

Do not build automatic full sync for MVP.

---

## Strava App Requirements

The Strava API application should use:

```text
Application Name: HelloRun
Website: https://hellorun.online
Authorization Callback Domain: hellorun.online
```

Environment variables:

```env
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=https://hellorun.online/integrations/strava/callback
STRAVA_ENCRYPTION_KEY=
```

For local development:

```env
STRAVA_REDIRECT_URI=http://localhost:3000/integrations/strava/callback
```

The `STRAVA_CLIENT_SECRET`, access tokens, and refresh tokens must never be exposed to the frontend.

---

## OAuth Scopes

Start with:

```text
read
activity:read
```

Avoid `activity:read_all` in the first version unless HelloRun needs to import private activities.

---

## User Flow

### Account Settings Flow

1. User logs in to HelloRun.
2. User goes to Account Settings or Run Submission page.
3. User clicks `Connect Strava`.
4. HelloRun redirects user to Strava OAuth.
5. User approves permission.
6. Strava redirects back to HelloRun.
7. HelloRun exchanges the code for tokens.
8. HelloRun stores the Strava connection.
9. User sees `Strava Connected`.

### Run Submission Flow

1. User opens an event page.
2. User clicks `Submit from Strava`.
3. HelloRun fetches recent activities from Strava.
4. User selects one activity.
5. HelloRun validates the activity against event rules.
6. User confirms submission.
7. HelloRun saves the activity as a run submission.
8. Submission status becomes `submitted`, `approved`, `rejected`, or `flagged`.

---

## Backend Routes

Create these routes:

```text
GET  /integrations/strava/connect
GET  /integrations/strava/callback
POST /integrations/strava/disconnect

GET  /api/strava/activities
POST /api/events/:eventId/submissions/strava
```

### GET /integrations/strava/connect

Purpose:

Redirect the logged-in user to Strava OAuth.

Requirements:

- User must be authenticated.
- Generate a `state` value to prevent CSRF.
- Store `state` in session.
- Redirect to Strava authorization URL.

Example OAuth URL structure:

```text
https://www.strava.com/oauth/authorize
  ?client_id=STRAVA_CLIENT_ID
  &redirect_uri=STRAVA_REDIRECT_URI
  &response_type=code
  &approval_prompt=auto
  &scope=read,activity:read
  &state=secure_random_state
```

### GET /integrations/strava/callback

Purpose:

Receive the Strava OAuth code and exchange it for tokens.

Requirements:

- Verify the returned `state`.
- Read `code` from query params.
- Exchange code with Strava token endpoint.
- Save or update the user's Strava connection.
- Redirect user back to HelloRun account settings or submission page.

Token response should include:

```text
access_token
refresh_token
expires_at
athlete.id
scope
```

### POST /integrations/strava/disconnect

Purpose:

Disconnect Strava from the user's HelloRun account.

Requirements:

- User must be authenticated.
- Mark connection as disconnected.
- Remove or clear encrypted tokens if preferred.
- Do not delete submitted run records by default.
- Provide a separate deletion workflow if the user requests data deletion.

### GET /api/strava/activities

Purpose:

Fetch recent activities for the logged-in user.

Requirements:

- User must be authenticated.
- User must have an active Strava connection.
- Refresh token first if access token is expired or close to expiry.
- Fetch recent activities from Strava.
- Return only the fields needed by the frontend.
- Do not save all activities automatically.

Recommended query options:

```text
after
before
page
per_page
```

### POST /api/events/:eventId/submissions/strava

Purpose:

Save a selected Strava activity as a HelloRun event submission.

Request body:

```json
{
  "stravaActivityId": 123456789
}
```

Requirements:

- User must be authenticated.
- User must be registered for the event if registration is required.
- Fetch the activity details from Strava or validate from a trusted recent fetch.
- Validate event rules.
- Prevent duplicate submission of the same Strava activity.
- Save a local HelloRun submission record.

---

## Suggested MongoDB Schema

### strava_connections

```js
{
  userId: ObjectId,
  stravaAthleteId: Number,

  accessTokenEncrypted: String,
  refreshTokenEncrypted: String,
  expiresAt: Number,

  scope: String,

  connectedAt: Date,
  updatedAt: Date,
  disconnectedAt: Date,

  status: {
    type: String,
    enum: ["connected", "disconnected", "revoked"],
    default: "connected"
  }
}
```

Recommended indexes:

```js
{ userId: 1 }
{ stravaAthleteId: 1 }
{ userId: 1, status: 1 }
```

### run_submissions

If this already exists, extend it.

```js
{
  userId: ObjectId,
  eventId: ObjectId,

  source: {
    type: String,
    enum: ["manual_upload", "strava"],
    default: "manual_upload"
  },

  stravaActivityId: Number,
  stravaAthleteId: Number,

  activityName: String,
  activityType: String,

  distanceMeters: Number,
  distanceKm: Number,

  movingTimeSeconds: Number,
  elapsedTimeSeconds: Number,

  startDate: Date,
  timezone: String,

  elevationGain: Number,
  averageSpeed: Number,

  status: {
    type: String,
    enum: ["submitted", "approved", "rejected", "flagged"],
    default: "submitted"
  },

  validationFlags: [String],

  submittedAt: Date,
  reviewedAt: Date,
  reviewerId: ObjectId
}
```

Recommended unique index:

```js
{ userId: 1, eventId: 1, stravaActivityId: 1 }
```

This prevents the same user from submitting the same Strava activity twice to the same event.

---

## Token Handling

Before every Strava API request:

```js
const now = Math.floor(Date.now() / 1000);

if (connection.expiresAt <= now + 300) {
  await refreshStravaToken(connection);
}
```

When refreshing tokens:

1. Send refresh request to Strava.
2. Receive new `access_token`, `refresh_token`, and `expires_at`.
3. Save the new encrypted tokens.
4. Use the new access token for the API request.

Important:

Always save the latest refresh token returned by Strava.

---

## Encryption Requirement

Encrypt these before saving:

```text
access_token
refresh_token
```

Suggested implementation:

- Use Node.js `crypto`.
- Use AES-256-GCM.
- Store IV and auth tag with the encrypted value.
- Keep encryption key in `STRAVA_ENCRYPTION_KEY`.
- Do not commit encryption key to GitHub.

---

## Activity Validation Rules

When submitting a Strava activity to a HelloRun event, validate:

1. The activity belongs to the connected Strava athlete.
2. The activity date is within the event period.
3. The activity type is allowed by the event.
4. The activity distance is greater than zero.
5. The activity has not already been submitted for the same event.
6. The event accepts Strava submissions.
7. The user is allowed to submit to the event.
8. The activity is not obviously invalid or suspicious.

Example allowed activity types:

```text
Run
Walk
Hike
TrailRun
```

For the 2026K Challenge:

```text
Allowed activities: Run, Walk, Hike, Trail Run
Start date: 2026-01-01
End date: 2026-12-31
Goal: accumulated 2026 km
```

---

## Suggested Validation Flags

Use flags instead of immediate rejection when uncertain.

```js
[
  "outside_event_date",
  "unsupported_activity_type",
  "duplicate_activity",
  "zero_distance",
  "very_fast_pace",
  "missing_required_fields"
]
```

This lets organisers review suspicious submissions.

---

## Frontend UI Requirements

### Account Settings

Show:

```text
Strava: Not Connected
[Connect Strava]
```

After connection:

```text
Strava: Connected
Connected as: [Strava athlete name if available]
[Disconnect Strava]
```

### Event Submission Page

Show:

```text
Submit Run Proof
[Upload Screenshot]
[Submit from Strava]
```

When user clicks `Submit from Strava`:

1. Open modal.
2. Fetch recent activities.
3. Show activity list.
4. Let user select one.
5. Show preview.
6. Show validation result.
7. Confirm submission.

### Activity Card Fields

Show:

```text
Activity name
Activity type
Distance
Duration
Date
Elevation gain, if available
```

### User-Facing Copy

Use this:

```text
Connect your Strava account to import your own activities. HelloRun will only submit the activity you choose.
```

For confirmation:

```text
This activity will be submitted to the selected HelloRun event. Please check the details before continuing.
```

---

## Privacy and Data Handling

Requirements:

- Do not submit all Strava activities automatically.
- Do not publicly display raw Strava data without user action.
- Do not use Strava data for AI training or unrelated analytics.
- Allow users to disconnect Strava.
- Allow users to request deletion of imported Strava-related data.
- Store only the activity fields needed for HelloRun submissions.
- Use HelloRun's local submission record for leaderboard and certificates.

---

## Rate Limit Strategy

For MVP:

- Fetch activities only when the user clicks `Submit from Strava`.
- Cache recent fetched activities briefly if needed.
- Do not poll Strava repeatedly.
- Avoid background sync during MVP.
- Add webhooks later to reduce unnecessary API calls.

---

## Future Version: Webhooks

Not required for MVP.

Add webhooks later for:

```text
activity created
activity updated
activity deleted
athlete deauthorization
```

Webhook behavior:

- Do not auto-submit activities.
- Notify the user that a new Strava activity is available for submission.
- If the user revokes access, mark the Strava connection as `revoked`.

---

## Implementation Order

Follow this order:

1. Add environment variables.
2. Create `StravaConnection` model.
3. Create token encryption helpers.
4. Create Strava API service.
5. Implement `/integrations/strava/connect`.
6. Implement `/integrations/strava/callback`.
7. Implement token refresh.
8. Implement `/api/strava/activities`.
9. Extend `run_submissions` schema.
10. Implement `/api/events/:eventId/submissions/strava`.
11. Add frontend `Connect Strava` UI.
12. Add frontend `Submit from Strava` modal.
13. Add validation and duplicate checks.
14. Add disconnect flow.
15. Add tests.

---

## Suggested File Structure

Adjust based on the existing HelloRun structure.

```text
src/
  models/
    StravaConnection.js
    RunSubmission.js

  services/
    stravaService.js
    tokenEncryptionService.js

  routes/
    stravaIntegrationRoutes.js
    stravaApiRoutes.js

  controllers/
    stravaIntegrationController.js
    stravaSubmissionController.js

  middleware/
    requireAuth.js

  views/
    account/
      integrations.ejs

    events/
      submit-run-proof.ejs

  public/
    js/
      strava-submit-modal.js
```

---

## Testing Checklist

### OAuth

- User can connect Strava.
- Invalid `state` is rejected.
- Missing `code` is handled.
- Failed token exchange is handled.
- Existing Strava connection is updated instead of duplicated.

### Token Refresh

- Expired token refreshes before API call.
- New refresh token is saved.
- Failed refresh marks connection as needing reconnection.

### Activities

- User can fetch recent activities.
- Activities are filtered correctly.
- API errors are handled gracefully.
- Rate-limit response is handled.

### Submission

- User can submit a valid Strava activity.
- Duplicate Strava activity cannot be submitted twice to the same event.
- Outside-date activity is rejected or flagged.
- Unsupported activity type is rejected or flagged.
- Submission is linked to the correct user and event.

### Disconnect

- User can disconnect Strava.
- Future imports are blocked after disconnect.
- Existing HelloRun submissions remain unless deleted through a separate data deletion flow.

---

## Acceptance Criteria

The integration is complete when:

1. A logged-in user can connect Strava.
2. Tokens are stored securely.
3. Expired tokens refresh automatically.
4. The user can fetch recent Strava activities.
5. The user can manually submit one activity to an event.
6. HelloRun validates the activity against event rules.
7. Duplicate submissions are blocked.
8. Submitted Strava activities appear in HelloRun's submission system.
9. The user can disconnect Strava.
10. No Strava secret or token is exposed on the frontend.

---

## Important Codex Instruction

Do not implement automatic background syncing in the MVP.

Prioritise a user-controlled import flow:

```text
Connect Strava
Fetch activities
User selects one
Validate
Submit to HelloRun
```

This is safer for privacy, easier to test, and easier to explain in the HelloRun documentation and final project presentation.
