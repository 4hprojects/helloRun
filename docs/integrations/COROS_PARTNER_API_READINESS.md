# COROS Partner API Readiness

Status: **not approved; direct integration disabled**

HelloRun's current COROS feature is a guided native COROS-to-Strava setup. It
does not authenticate with COROS, receive COROS credentials, or request COROS
activity data. `COROS_DIRECT_INTEGRATION_ENABLED` must remain `false` until all
approval gates below are complete.

## Application packet

- Platform: HelloRun, operated by Henson M. Sagorsor / 4HProjects, Benguet,
  Philippines
- Product URL: <https://hellorun.online>
- Privacy contact: `4hprojects@proton.me`
- Intended use: an authenticated-user-only, on-demand private activity viewer
- Prohibited use: event evidence, organizer access, rankings, certificates,
  achievements, analytics, advertising profiles, or automatic activity sync
- Proposed OAuth return path: `https://hellorun.online/integrations/coros/callback`
- Security baseline: OAuth state binding, encrypted tokens, least privilege,
  rate limits, revocation/deauthorization handling, deletion confirmation, and
  no activity-payload persistence

## Approval gates

1. Submit the official COROS Partner API application and the required company,
   technical-contact, security, and redirect-URI details to `api@coros.com`.
2. Store the written approval and the applicable API terms outside the source
   repository in the controlled compliance record.
3. Review permitted fields, scopes, retention, deletion, webhook, and display
   rules against HelloRun's owner-only design.
4. Produce a separate implementation and threat-model review. Do not reuse the
   Strava token model or enable official event submissions.
5. Issue credentials through the production secret manager only after review;
   never commit them or place them in documentation.
6. Enable the feature flag only after DB-free, non-production integration,
   deletion, webhook, quota, and authorization tests pass.

Official references:

- <https://support.coros.com/hc/en-us/articles/53181766856724-Partner-API-Access>
- <https://support.coros.com/hc/en-us/articles/17085887816340-Submit-an-API-Application>
- <https://support.coros.com/hc/en-us/articles/53181619102996-Build-on-COROS-MCP>
