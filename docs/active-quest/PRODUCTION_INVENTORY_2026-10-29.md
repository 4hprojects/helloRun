# Active Quest Production Inventory

Inventory time: October 29, 2026, Asia/Manila

Scope: authorized read-only inspection of public endpoints, production MongoDB, production R2 object listings, and configured Postgres connectivity.

Production mutation: none.

## Public deployment

- `https://hellorun.online/healthz`: HTTP 200 through the HelloDeploy route.
- `https://hellorun.online/readyz`: HTTP 200; MongoDB ready, Redis not configured, private Strava viewer disabled.
- Served commit and short commit: `unknown`.
- `https://hellorun.online/active-quest`: HTTP 404.

Conclusion: the Active Quest implementation in this worktree is not deployed.

## MongoDB foundation

Database: `hellorun_db` on the configured Atlas cluster.

- `activequestseries` collection: absent.
- `activequesttemplateversions` collection: absent.
- Active Quest series document: absent.
- Published Active Quest template: absent.
- November 2026 series edition: absent.
- `november-active-quest-2026` slug owner: absent.

No historical event was modified or inferred into the new series.

## Historical continuity

The following published events matched exact Active Quest or Active Run naming:

- May: `may-active-quest-2`, organizer `69941482ab1333984de6c96c`.
- June: `june-active-quest-virtual-run`, organizer `69941482ab1333984de6c96c`.
- July: `july-active-quest-virtual-run`, organizer `69941482ab1333984de6c96c`.
- August: `august-active-quest`, organizer `69941482ab1333984de6c96c`.
- September: `september-active-run-2026`, organizer `698f1cb67748262281092639`.
- October: `october-active-run-2026`, organizer `698f1cb67748262281092639`.

Organizer candidates:

- `698f1cb67748262281092639`: Henson M. Sagorsor, full administrator, owner of the recent September and October editions.
- `69941482ab1333984de6c96c`: Henz Organizer, organiser, owner of May through August.

Release decision: Henson M. Sagorsor (`698f1cb67748262281092639`) owns November as full administrator.

## Reward assets

Production R2 contains these matching event badge objects:

- September Active Run event badge: one WebP object, reachable with HTTP 200.
- October Active Run event badge: one WebP object, reachable with HTTP 200.

No six-image November category set exists in production R2. Ten final local assets now exist under a strict checksum manifest. They remain unuploaded pending visual approval.

Mongo badge-content rows for September and October have empty category image URLs. Postgres event-badge overrides could not be checked because the configured Postgres hostname is unavailable.

## Certificate design candidates

September and October each have an active certificate template. Both use:

- an event logo and event artwork from the production CDN;
- A4 landscape layout;
- certificate number and QR verification;
- primary `#086534`, accent `#F05A0A`, and secondary accent `#F5C45E`;
- completion copy based on runner name, selected distance, and event title.

The October template is the newest reusable candidate. It is not automatically approved for November and must be reviewed after the new reusable-template implementation is deployed.

## Postgres and migration 028

The configured Supabase hostname returned `ENOTFOUND`. A read-only transaction could not start.

Therefore these items remain unverified:

- migration `028_active_quest_series_foundation.sql`;
- `events_core` series columns and indexes;
- event-badge definitions and image overrides;
- production shadow consistency.

Do not run migration 028 until the live Postgres project is identified, a restorable backup is verified, and migration authority is granted separately.

## Release blockers

1. Deploy and verify the Active Quest repository implementation.
2. Identify the live Postgres project and restore connectivity.
3. Verify a current Atlas and Postgres recovery point.
4. Review and apply migration 028 through the normal release process.
5. Approve the generated artwork and upload it through the rollback-controlled script.
6. Create a private November draft, run readiness, and complete manual browser and workflow QA.
7. Keep publication locked pending later explicit authority.
