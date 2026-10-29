# November 2026 Active Quest Release Runbook

Last updated: 2026-10-30

## Release state

Target is an immediate public launch of November Active Quest 2026 after every
production gate passes. Public launch authority was granted on October 29, 2026.
The production run is authorized after the backup gate passes. HelloDeploy and
authenticated full-admin actions remain human-operated hold points.

Local environment inventory on October 29, 2026 found no Active Quest series, published template, November edition, or conflicting November slug. This local result does not establish production state.

October 30 read-only verification connected to the HelloRun Supabase project
through the IPv4-compatible session pooler. Production is migrated through 026;
security migration 027 and Active Quest migration 028 remain pending. All 11 real
Mongo events have Postgres shadows. One real event needs a targeted date refresh.
Legacy integration fixtures remain isolated and will not be deleted during launch.

Expected edition identity:

- Title: `November Active Quest 2026`
- Slug: `november-active-quest-2026`
- Series identity: `active-quest`, year `2026`, month `11`
- Registration: October 25 through November 22, 2026, PHT
- Activity: November 1 through November 30, 2026, PHT
- Proof submission: through December 14, 2026, PHT
- Review target: December 17, 2026, PHT
- Reward target: December 18, 2026, PHT

Registration opens at the actual publication time. Do not backdate the live
opening to October 25.

## Required release inputs

Confirm all items before any production write:

- The correct HelloRun Supabase project is connected and its identity matches the
  HelloRun production environment.
- A restorable production Postgres backup exists and its restore path is verified.
- The read-only pre-migration verifier passes against the replacement production
  connection.
- Migrations 027 and 028 are separately reviewed and ready for the normal migration process.
- Henson M. Sagorsor (`698f1cb67748262281092639`) is the confirmed owner and full administrator.
- No event already owns the expected slug or series/month identity.
- The published template contains approved rules, privacy copy, and provider wording.
- The committed ten-file asset manifest passes checksum, dimension, MIME, and alpha validation.
- The committed logo, banner, poster, certificate background, and six category badges are visually approved.
- All six category badge URLs and the certificate background return HTTP 200 after upload.
- Series and draft-generation flags are enabled with an audited reason.
- Scheduler, auto-publication, and automatic email promotion remain disabled.

## Human-operated hold points

Stop for the operator to verify the Supabase backup before applying migration
027. Stop again for HelloDeploy activation and authenticated full-admin actions
because this environment has no HelloDeploy connector or reusable administrator
session.

## Draft generation

1. Open the full-admin Active Quest control surface.
2. Preview the November 2026 schedule and content.
3. Generate the edition once. Generation must return a private draft.
4. If generation reports a slug collision, stop. Do not rename or overwrite the existing event.
5. Record the generated event ID and template version in the release ticket.

Keep the generated edition private until every manual readiness check passes.

## Manual readiness review

Verify:

- title, slug, series identity, and frozen template provenance;
- exact PHT registration, activity, proof, review, and reward boundaries;
- free accumulated-distance mode and exactly 25K, 50K, 75K, 100K, 150K, and 200K;
- screenshot requirement and optional corroborating activity URL wording;
- registration privacy and leaderboard preference wording;
- all badge images and certificate preview;
- public landing-page card, registration CTA, mobile layout, keyboard flow, and screen-reader labels;
- organizer review queue, approval, correction, rejection, leaderboard, badge, and certificate smoke paths.

## Public approval and launch

After the private draft passes manual review:

1. Submit the draft for review without changing its frozen series provenance.
2. Approve it explicitly as a full administrator. Organizer auto-approval must remain blocked.
3. Confirm publication time becomes the actual registration opening time.
4. Confirm registration closes at the end of November 22, 2026, PHT.
5. Confirm automatic email promotion, scheduler, and auto-publication remain disabled.
6. Record event ID, template version, approval actor, approval time, and public URL.

## Controlled commands

Run asset validation without secrets or mutation:

```bash
npm run active-quest:assets
```

After visual approval, upload with a new absolute rollback-manifest path:

```bash
npm run active-quest:assets -- --apply --rollback-manifest=/absolute/private/path/active-quest-r2-rollback.json
```

Verify the database before migration:

```bash
npm run active-quest:verify-database
```

Apply migrations in order through the normal transactional runner:

```bash
npm run supabase:migrate -- --only=027_public_schema_rls_lockdown.sql
npm run active-quest:verify-database
npm run supabase:migrate -- --only=028_active_quest_series_foundation.sql
npm run active-quest:verify-database -- --post-migration
```

Verify the exact deployed SHA:

```bash
npm run active-quest:verify-deployment -- --base-url=https://hellorun.online --expected-sha=<40-character-main-sha>
```

Supply `DATABASE_URL` only through HelloDeploy secrets. Never place it in chat, shell history, logs, or repository files.

## Rollback

If configuration fails, disable `activeQuestSeriesEnabled` and `activeQuestDraftGenerationEnabled`. Preserve generated drafts and audit history.

Migration 028 remains in place during rollback because it is additive and compatible. Replace a bad frozen template with a new version.

Remove only objects recorded as created by the R2 rollback manifest:

```bash
npm run active-quest:assets -- --rollback=/absolute/private/path/active-quest-r2-rollback.json
```

Do not delete the event, rewrite historical slugs, revoke unrelated rewards, or run a destructive backfill.

After registrations exist, stop new registration through the existing lifecycle and follow incident procedures. Preserve registrations, submissions, review history, badges, and certificates.

## Public-launch acceptance

- Confirm `/active-quest` and `/events/november-active-quest-2026` return HTTP 200 after publication.
- Confirm November dates, six categories, frozen provenance, reward URLs, and certificate preview.
- Confirm all four flags start disabled, then enable only series and draft generation with audited reasons.
- Confirm scheduler and auto-publication remain disabled.
- Confirm registration is open, the event is discoverable in the sitemap, and no automatic email promotion was enabled.
