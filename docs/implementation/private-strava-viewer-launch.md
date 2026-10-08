# Private Strava Viewer Launch

**Status:** Implemented; production/live verification pending
**Last reconciled:** October 9, 2026
**Supersedes:** the former event-submission MVP and `docs/to do/HELLoRUN_STRAVA_INTEGRATION_PLAN.md`

## Delivered behavior

- Strava is an optional, authenticated-runner-only, on-demand activity viewer.
- OAuth state is short-lived and account-bound; tokens are encrypted and refreshed server-side.
- Activity responses are request-scoped and are not saved as event evidence or cached locally.
- Connected activity data cannot enter submissions, organizer views, results, leaderboards, certificates, achievements, or analytics. The legacy event-submission endpoint returns `403 external_use_blocked`.
- `STRAVA_PRIVATE_VIEWER_ENABLED` defaults to `false`. New connections, status/activity APIs, and the guided COROS bridge remain unavailable until enabled. Existing users retain a disconnect path.
- Disconnect revokes the provider token, removes local connection and COROS guide state, creates a deletion receipt, and sends durable in-app and email confirmation. Failed remote revocation is retried through an expiring, crash-recoverable queue.
- Webhook events are idempotent, atomically claimed, retried with bounded backoff, and recovered after an interrupted worker lease. Activity events do not fetch or persist activity data; athlete deauthorization removes local access.
- The runner UI contains the required data-use, withdrawal, and deletion disclosures and uses the official Strava connection asset.

## Operator launch gate

Keep the feature flag disabled until all items are recorded:

1. Verify the Strava application tier, athlete capacity, support contact, callback domain, scopes, and production credentials.
2. Run `npm run strava:remediate:dry`. If historical Strava submissions exist, inventory copies and backups, approve the exact count and target fingerprint, then run `npm run strava:remediate:apply` in a maintenance window.
3. Publish and verify the current Privacy and Data Usage policies.
4. Deploy with the feature disabled and verify `/healthz` and `/readyz`.
5. Create and verify the single webhook subscription with `npm run strava:webhook:create` and `npm run strava:webhook:verify`.
6. Enable `STRAVA_PRIVATE_VIEWER_ENABLED=true`, restart HelloRun, and perform the supervised athlete smoke test below.

The webhook callback defaults to `${APP_URL}/api/integrations/strava/webhook`; use `STRAVA_WEBHOOK_CALLBACK_URL` only when an explicit override is required. The operator command never prints the client secret or verification token.

## Production acceptance

- Connect a designated runner, view only that runner's recent activities, and verify no activity payload is persisted.
- Confirm a second runner and every organizer/admin surface cannot access those activities.
- Confirm connected activities cannot be submitted and manual screenshot proof still works.
- Disconnect, verify the durable confirmation and deletion receipt, and confirm connection, COROS guide state, and any completed revocation job are gone.
- Reconnect, trigger provider deauthorization, and confirm the webhook removes local access.
- Observe OAuth failures, 401/429/503 responses, webhook failures, revocation retries, and deletion receipts without tokens, authorization codes, or secrets in logs.

## Deferred boundary

Official Strava submissions and every cross-user or derived use remain blocked unless future written Strava authorization and a separate implementation review explicitly permit them. Direct COROS API integration also remains disabled.
