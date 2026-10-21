# PR: Platform-aware OCR, activity verification and manual training

**Historical PR description:** merged to `main` through `0c1fd86` on October 19,
2026. **Do not deploy or enable flags without the separate approvals in
`DEPLOYMENT-AND-ROLLBACK.md`.**

## Why

Run-proof OCR runs only in the runner's browser, and auto-approval trusted the confidence, distance
and time the browser posts in hidden fields, so a crafted request could auto-approve itself. The
approved plan also asks for platform-aware extraction, an optional activity link, reviewed ground
truth, manual model training with controlled deployment, admin reminders and research reporting.

## What changes (all behind flags that default off)

| Flag | Behaviour |
|---|---|
| `OCR_SERVER_PIPELINE_ENABLED` | Background worker re-reads each stored proof: sharp passes, one serialised tesseract.js worker, shared browser parser, evidence-based platform detection, immutable `OcrExtraction`, `serverOcr` summary on the entry, near-duplicate screenshot flags |
| `OCR_SERVER_AUTO_APPROVAL_ENABLED` | OCR auto-approval uses only the server reading of the entry's current proof |
| `ACTIVITY_URL_ENABLED` | Optional Strava/Garmin Connect/COROS link; string parsing only (no fetch); reviewer link checks; duplicate-activity flags |
| `OCR_TRAINING_CONSENT_PROMPT_ENABLED` | Unchecked opt-in for keeping cropped text lines for training; runner withdrawal |
| `OCR_TRAINING_ENABLED` | Admin-started training in `npm run ocr:training-worker` (separate process, resource-limited) |
| `OCR_REMINDERS_ENABLED` | OCR admin emails (digest, readiness, training, model, regression) |

New admin area `/admin/ocr-training` (overview, samples, platforms with Test OCR, jobs, models,
analytics, settings, audit). Organiser review page shows the server reading and the link panel.

## Data

Additive only: 14 new Mongo collections, optional fields on submissions and accumulated activities,
three partial indexes per submission collection. No Postgres change, no back-fill, nothing
destructive. Old code ignores the new data, so reverting is safe.

## Review focus

- `src/services/submission-validation.service.js`: the auto-approval gate (server reading, current
  proof only, duplicate and provider-mismatch guards).
- `src/controllers/page/submission.controller.js`: link validation before upload; queueing after
  writes (never throws into the request).
- `src/services/ocr/training-runner.service.js`: argument-array command, limits, process-group kill.
- `src/services/ocr/model-registry.service.js`: checksum verification, compare-and-set activation,
  base-model fallback.
- `src/routes/admin-ocr-training.routes.js`: auth, CSRF, full-tier gates, rate limits.

## Testing

- Unit: full suite 2459/2459, sequential, Node 22.23.1 (baseline before this work: 2363/2363).
- Integration: six suites, 39/39, against a disposable local MongoDB through the repo DB guard
  (command in IMPLEMENTATION-PROGRESS.md "Resume checkpoint").
- End to end: real app boot with every flag on, RBAC/CSRF over HTTP, real Test OCR upload.
- Headless browser at 375px: no overflow, no unlabelled inputs, no console errors on all OCR pages.
- No production database, R2, email or Postgres was touched by any test.

## Not done / known limits

- No accuracy figures: no consented, labelled screenshots exist yet. Profiles ship as `test`, so
  production confirms no platform until an admin enables one after a regression check.
- No real tesstrain run: tools are not installed; installing them on the production host needs approval.
- No staging rehearsal: there is no staging tier.
- Privacy-policy wording for the training opt-in must be published before enabling that flag.
- The weekly digest defaults to Friday 16:00 Asia/Manila (owner choice); admins can change it.

## Rollout and rollback

See `docs/improvement-plan/ocr-platform-aware/DEPLOYMENT-AND-ROLLBACK.md`: deploy with flags off,
then enable one flag at a time; each step reverts by turning its flag off.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
