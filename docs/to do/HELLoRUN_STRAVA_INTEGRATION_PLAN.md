# HelloRun Activity Integration Module

## Decision
Implement a provider-independent activity integration module inside the existing HelloRun application. Ship Strava first. COROS users may sync COROS -> Strava -> HelloRun. Do not build a new standalone service or direct COROS connector in phase 1.

## Critical policy gate
The Strava API Agreement and Policy effective June 1, 2026 limit disclosure/display of one user's Strava data to anyone other than that authenticated user, and place restrictions on storage and use. The API must not feed organizer review screens, public leaderboards, other participant profiles, research exports or shared event progress derived from Strava data unless Strava provides written authorization and the use is lawful. Do not assume that participant consent alone overrides API restrictions. Obtain written clarification from Strava before enabling any third-party verification workflow. Do not copy raw Strava data into HelloRun's permanent activity table. Implement private prototype first.

References:
- https://www.strava.com/legal/api
- https://www.strava.com/legal/api_policy
- https://developers.strava.com/docs/getting-started/
- https://developers.strava.com/docs/rate-limits/
- https://support.coros.com/hc/en-us/articles/30913889113492-Connecting-Strava-with-COROS

## Phase 0: audit and prerequisites
- Inspect existing HelloRun repository: stack, auth, database, registration/activity/event rules, manual verification, deployment.
- Identify existing user and activity IDs. Avoid schema changes without migrations.
- Register a Strava developer application and configure allowed OAuth callback domain for staging and production.
- Confirm exact OAuth scopes needed; request minimum sufficient scope.
- Ask Strava to confirm the use cases: participant-to-organizer verification, event progress/leaderboards, durable evidence and aggregate statistics. Treat those as blocked pending approval.
- Configure secrets only in server environments: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN, TOKEN_ENCRYPTION_KEY. Do not expose any secret in frontend bundles.

## Phase 1: secure account connection
### Participant UI
- Settings > Connected Apps
- Strava: Connect, Connected status, Last sync, Disconnect
- Explain permissions, data visibility, retention, and deletion before linking.
- Do not show a direct COROS connector in phase 1. Show short COROS-to-Strava setup instructions instead.

### Backend
- GET /api/integrations/strava/connect: start OAuth with unpredictable state bound to logged-in user and short expiration.
- GET /api/integrations/strava/callback: validate state and exchange code server-side.
- GET /api/integrations/strava/status: authenticated user's connection status, no tokens.
- DELETE /api/integrations/strava/connection: revoke where supported, delete local token/data, record completion.
- Use encrypted token storage and refresh before expiry. Never log tokens, codes or secrets.
- Ensure one external athlete ID is not silently associated with multiple HelloRun accounts.

### Suggested internal interface
```ts
interface ActivityProvider {
  name: 'strava' | 'coros' | 'garmin';
  authorize(userId: string): Promise<string>;
  exchangeCallback(params: unknown): Promise<void>;
  listOwnActivities(userId: string, cursor?: string): Promise<ProviderActivity[]>;
  disconnect(userId: string): Promise<void>;
}
```

## Phase 2: private activity import (no organizer/public display)
- Show imported activity list exclusively to the connected athlete.
- Ask athlete to select an activity and the event(s) to which they intend to submit.
- Mark selections as 'pending external-use approval' and do not automatically include them in official event totals.
- Keep only fields authorized by Strava and necessary for permitted functions, with retention/deletion policy reviewed against the live API policy. Limit cache to 7 days or less where relevant.
- Track provider and activity IDs for duplicate imports. When multiple providers are supported, additionally flag probable duplicates by user, time window, distance, duration and route fingerprint when legitimately available.
- Store technical synchronization metadata separately from manually supplied or independently verified event submissions.

## Phase 3: webhook-driven sync
- Verify webhook subscription challenge and event origin using Strava-prescribed mechanisms.
- Acknowledge quickly, enqueue processing, fetch only required details under token permissions.
- Handle activity creation, update, deletion, and athlete authorization deactivation.
- Idempotent jobs keyed by provider + provider activity ID + event update ID.
- Observe both short-window and daily rate limits, backoff on 429, and support retries.
- Run a reconciliation job for missed events, respecting limits.

## Phase 4: official submission integration (BLOCKED until policy approval)
Enable only after Strava confirms HelloRun's intended verification, data storage and leaderboard use is permitted.
- Apply event dates, allowed sports, distance, duration, duplicate rules, manual review cases and event-specific sharing choices.
- Provide staff verification queue only to the extent approved.
- Handle edited/deleted activities and retroactively correct event totals.
- Distinguish source-record existence from independent verification. GPS files and sport types can be manipulated, so do not call them fraud-proof.
- Maintain manually uploaded evidence as an alternative path.

## Suggested data design (adapt to existing stack)
- `integration_connections`: userId, provider, providerAthleteId, encryptedTokens, scopes, expiresAt, status, createdAt, updatedAt.
- `integration_sync_jobs`: userId, provider, cursor, status, retryAt, errorCode, updatedAt.
- `integration_activity_index`: userId, provider, providerActivityId, fetchedAt, expiresAt, deletionStatus; only minimum metadata permitted by policy.
- `activity_match_candidates`: userId, candidate references, matchScore, status; create only from lawfully available fields.
- Add unique indexes on (provider, providerAthleteId) and (provider, providerActivityId) as appropriate; ensure user scoping and tenant checks.
- Do not persist full activities indefinitely without explicit platform permission.

## Quality and security acceptance checks
1. An athlete can connect and disconnect Strava securely.
2. No API token or secret is available in the browser or application logs.
3. One athlete cannot see another athlete's imported activities.
4. Imported activities cannot alter public rankings or organizer views while policy gate is closed.
5. Repeated webhook events do not produce duplicate imports.
6. Activity deletion/disconnection removes cached personal data according to policy.
7. OAuth error, expired token, revoked scope, 429 and webhook replay are handled safely.
8. Existing manual submissions work exactly as before.
9. Mobile/PWA layouts support connect, sync status, privacy controls and disconnection.

## Recommended development sequence for Codex/Claude Code
1. Read repository and produce a concrete integration map, existing file locations and migration plan.
2. Implement phase 1 against existing tech stack with tests.
3. Implement phase 2 private-only interface with privacy protections.
4. Implement phase 3 only after basic OAuth/import works.
5. Hold phase 4 until documented third-party permission review is passed.
6. Add direct COROS/Garmin connectors only if separate developer access is approved and business demand justifies it.

## Developer execution instruction
Inspect the current HelloRun repository before coding. Do not assume database, framework, naming conventions, or file structure. Preserve current manual evidence and verification flows. Implement phases 0-2 first. Do not publish imported Strava data or use it in organizer verification, event rankings or cross-user analytics pending written policy clarification. Create migrations, tests, security documentation, environment variable example entries, and developer setup instructions. Do not commit credentials.
