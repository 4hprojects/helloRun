# November 2026 Active Quest Release Runbook

Last updated: 2026-10-29

## Release state

Target is a private November 2026 production draft. Publication is not authorized.

Local environment inventory on October 29, 2026 found no Active Quest series, published template, November edition, or conflicting November slug. This local result does not establish production state.

Authorized read-only production inventory found no November edition or slug conflict. It also found that Active Quest code is not deployed, production Postgres is unreachable through the configured hostname, and six category badge assets are absent. Complete those gates before draft generation.

Expected edition identity:

- Title: `November Active Quest 2026`
- Slug: `november-active-quest-2026`
- Series identity: `active-quest`, year `2026`, month `11`
- Registration: October 25 through November 22, 2026, PHT
- Activity: November 1 through November 30, 2026, PHT
- Proof submission: through December 14, 2026, PHT
- Review target: December 17, 2026, PHT
- Reward target: December 18, 2026, PHT

## Required release inputs

Confirm all items before production generation:

- Production migration 028 is applied through the normal migration process.
- Henson M. Sagorsor (`698f1cb67748262281092639`) is the confirmed owner and full administrator.
- No event already owns the expected slug or series/month identity.
- The published template contains approved rules, privacy copy, and provider wording.
- The committed ten-file asset manifest passes checksum, dimension, MIME, and alpha validation.
- Generated artwork receives visual approval before R2 upload.
- All six category badge URLs and the certificate background return HTTP 200 after upload.
- Series and draft-generation flags are enabled with an audited reason.
- Scheduler and auto-publication flags remain off for the first release.

## Draft generation

1. Open the full-admin Active Quest control surface.
2. Preview the November 2026 schedule and content.
3. Generate the edition once. Generation must return a private draft.
4. If generation reports a slug collision, stop. Do not rename or overwrite the existing event.
5. Record the generated event ID and template version in the release ticket.

Stop after the private-draft gates pass. Do not approve or publish the event.

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

## Controlled commands

Run asset validation without secrets or mutation:

```bash
npm run active-quest:assets
```

After visual approval, upload with a new absolute rollback-manifest path:

```bash
npm run active-quest:assets -- --apply --rollback-manifest=/absolute/private/path/active-quest-r2-rollback.json
```

Verify the replacement database before migration 028:

```bash
npm run active-quest:verify-database
```

Apply only the additive migration through the normal transactional runner:

```bash
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

## Private-draft acceptance

- Confirm `/active-quest` returns HTTP 200 while the November draft stays hidden.
- Confirm November dates, six categories, frozen provenance, reward URLs, and certificate preview.
- Confirm all four flags start disabled, then enable only series and draft generation with audited reasons.
- Confirm scheduler and auto-publication remain disabled.
- Confirm no registration, sitemap listing, or publication exists for the private draft.
