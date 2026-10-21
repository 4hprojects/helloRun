# Platform-Aware OCR — Implementation Progress

**Repository state:** merged to `main` through `0c1fd86`; original phase reports
retain their feature-branch commit references for traceability
**Last updated:** October 19, 2026
**Delivery status owner:** [../../STATUS.md](../../STATUS.md). This file records phase reports and evidence.

States: NOT STARTED · IN PROGRESS · COMPLETED · BLOCKED. "Completed" means implemented and tested
on this branch. Gates that need data or infrastructure the repository cannot supply are listed
separately as BLOCKED and are not counted as passed.

| Phase | State | Commit | Blocked gate items |
|---|---|---|---|
| 0 Repository assessment and baseline | COMPLETED | fd700ad | Image baseline N/A (no consented samples) |
| 1 Platform-aware OCR | COMPLETED | dfac7bf | Accuracy validation on labelled screenshots |
| 2 Optional activity URL | COMPLETED | 6e37c6f | `authorized_api` verification (no provider API access) |
| 3 Reviewer corrections and datasets | COMPLETED | 2854d93 | Real samples need consent wording published + consented screenshots |
| 4 Manual training and model registry | COMPLETED | cc710ad | Real tesstrain run on the Ubuntu host; staging rollback rehearsal |
| 5 Reminders, analytics, exports | COMPLETED | fe7bbd2 | — (digest set to Friday 16:00 by owner) |
| 6 QA and production readiness | COMPLETED | see git log | Staging rehearsal (no staging tier); real-screenshot accuracy; owner sign-off |

## Resume checkpoint

If a session is interrupted, resume from the first phase above that is not COMPLETED.
Test commands used on this branch:

```bash
export PATH=$HOME/.nvm/versions/node/v22.23.1/bin:$PATH        # Node 22 (the default v20 is too old)
node src/scripts/run-test-group.js --parallel tests/*.unit.test.js   # DB-free
# Local, disposable MongoDB for OCR integration tests (never the .env databases):
docker run -d --name hellorun-ocr-test-mongo --ulimit nofile=64000:64000 -p 127.0.0.1:27018:27017 --tmpfs /data/db mongo:7.0
MONGODB_URI=mongodb://127.0.0.1:27018/hellorun_ocr_guard DATABASE_URL= REDIS_URL= RESEND_API_KEY= \
  R2_BUCKET= R2_ACCESS_KEY_ID= R2_SECRET_ACCESS_KEY= R2_ENDPOINT= CLOUDFLARE_ACCOUNT_ID= R2_PUBLIC_BASE_URL= \
  OCR_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/hellorun_ocr_test \
  node src/scripts/run-test-group.js tests/ocr-*.integration.test.js
```

---

## Phase 0 report

```text
PHASE: 0 — Repository assessment and baseline
BRANCH / COMMIT(S): feature/platform-aware-ocr-training, "Phase 0: OCR repository assessment and benchmark harness"
FILES ADDED: src/utils/ocr/benchmark-metrics.js, src/utils/ocr/browser-parser-loader.js,
  src/scripts/ocr-benchmark.js, tests/ocr-benchmark.unit.test.js,
  benchmarks/ocr/{manifest,labels}.example.json, this file
FILES MODIFIED: package.json (ocr:benchmark script), .gitignore (benchmarks/ocr/local/),
  docs package moved from docs/hellorun-ocr-claude-code-plan-v1/ to here, STATUS/ROADMAP/changelog
FUNCTIONAL BEHAVIOR: none changed. The harness is offline tooling only.
API / DATA CHANGES: none
MIGRATIONS / ROLLBACK: none; revert the commit
SECURITY & PRIVACY CHECKS: harness refuses images outside the manifest dir, skips samples
  without consentBasis, keeps images/labels/reports in a git-ignored folder, makes no network or DB calls
TESTS RUN: npm run test:unit on Node v22.23.1 — baseline 2363/2363 pass before changes;
  tests/ocr-benchmark.unit.test.js 9/9 pass
BASELINE OR MEASURED METRICS: 0 consented labeled screenshots → every image metric N/A
RESOURCES USED / LIMITS OBSERVED: unit suite 584 s single-threaded on the dev box
KNOWN ISSUES / BLOCKERS: see "Blockers" below
NEXT PHASE DEPENDENCIES: owner review of this report; consented screenshots for the Phase 1 gate
READY FOR REVIEW: yes
```

### 1. Actual architecture (verified)

| Area | Reality |
|---|---|
| Runtime | `engines.node >=22`. The dev box defaults to v20.20.2, and v22.23.1 is available through nvm; all results here use v22. Express 4.22, EJS, Mongoose 8.24, `postgres` (Supabase shadow), ioredis, Resend, sharp 0.35, tesseract.js 5.1.1, multer 2 |
| Hosting | HelloDeploy-managed Node container on the Ubuntu host behind nginx and a Cloudflare Tunnel; Render is the unverified backup. The earlier direct PM2 topology is historical. Repository CI and syntax/format/documentation gates were added October 20; there is still no ecosystem file or Dockerfile. Redis is not configured in production |
| Workers | Nine in-process `setInterval` workers started from `src/server.js`. No queue library. Event promotion and both scheduled-blog publisher entry points now claim work atomically with stale-claim recovery |
| Auth/RBAC | `User.role` is runner, organiser or admin. `adminTier` is full or support (`requireAdmin`, `requireFullAdmin` in `auth.middleware.js`). Event scope comes from `resolveEventAccess` (admin, owner, co_organizer). There is no OCR-admin or model-deploy permission |
| Audit | Postgres `audit_critical` (`critical-audit.service.js`; background failures recorded after October 20 retain an idempotent replay payload) plus the Mongo `ReviewDecision` (append-only). Older sparse failure rows cannot be reconstructed and remain dead letters |
| Storage | R2. Proofs are stored at `results/proofs/<userId>/…webp`. JPEG and PNG are re-encoded with `sharp.rotate().webp(82)`, which removes EXIF. Proof URLs are public; only the runner's own viewer uses signed URLs |
| Email | Resend through `communication.service.js` `notify()`: a 34-event registry, an email budget, opt-out, and `CommunicationRetry` idempotency keys with backoff. There are no admin-recipient resolver and no admin-audience events |
| Tests | `node:test` through `run-test-group.js`: 315 unit, 60 integration and 6 smoke files. `test-db-guard.js` blocks non-unit groups against remote databases. The local `.env` points at production MongoDB and Supabase |

### 2. Current run-proof flow

1. The browser runs OCR in the modal (`run-proof-modal.js` with `ocr-proof-reader.js` and the vendored tesseract.js WASM). It writes the results into 22 hidden `ocr*` inputs.
2. `POST /my-registrations/:id/submit-result` passes through multer (memory storage, 5 MB, jpeg/png/webp) and CSRF.
3. `handleRunnerSubmissionWrite` does the following:
   - checks for a duplicate SHA-256 per runner;
   - takes an idempotency lock;
   - uploads the proof to R2 once;
   - writes one entry per target, at most 10, sharing one `submissionAttemptId`.
4. `buildSubmissionPayload` runs, together with `detectSuspiciousActivity`.
5. `applyAutoApprovalIfEligible` runs.
6. If the entry is not auto-approved, organisers review it. Corrections go through `submission-correction.service.js`. A `ReviewDecision` is recorded, and the decision cascades to linked entries.

The existing browser OCR:
- runs up to four canvas passes, with PSM 11 and `eng` only;
- detects the source app with regex for strava, nike, garmin, apple, google, coros or unknown;
- extracts distance, time, pace, date, elevation, steps, activity type, location and name;
- computes a heuristic confidence;
- is stored in `Submission.ocrData`, which stays in Mongo only.

The only server-side Tesseract is `id-ocr.service.js` (organiser IDs, inside the request). The OCR unit tests (about 85) use hand-written text and no image fixtures. Event submissions from Strava are blocked on purpose (`external_use_blocked`). COROS exists only as a readiness doc, and Garmin has no integration.

### 3. Gap table

| Plan item | Status | Notes |
|---|---|---|
| Strava/COROS/Garmin/generic detection | Existing, partial | Text regex only. No layout id, no versioning, and no uncertain/abstain result |
| Platform preprocessing / extraction | Existing (browser) | Reuse the parser; it also has to run on the server |
| Server OCR pipeline / worker | Missing | |
| Immutable OCR extraction revisions | Missing | `ocrData` is a single mutable subdocument |
| Optional activity URL | Missing | |
| URL `authorized_api` verification | Incompatible | Strava use is blocked by policy, and there is no Garmin or COROS API access |
| Duplicate detection | Partial | Exact SHA-256 per runner only |
| Reviewer corrections | Existing | `organizerCorrections[]` plus `ReviewDecision`; the admin correction path writes no correction entry |
| Crops, literal transcription, datasets | Missing | |
| Training (tesstrain) | Missing, blocked | Native training tools are not installed anywhere, and tesseract.js cannot train |
| Model registry / activation / rollback | Missing | The browser loads a static `eng.traineddata.gz` |
| Durable jobs | Missing | Will use the Mongo claim pattern; no BullMQ, because production has no Redis |
| Admin reminders | Partial | The communication service can be reused |
| Analytics / research export | Missing | Reuse the existing CSV/XLSX export pattern |

### 4. Conflicts and security findings

- **C1 (high, existing):** auto-approval trusts client-sent OCR values. `isAutoApprovableOcrPayload` requires confidence ≥ 0.7 plus a distance and a time, and all three come from hidden form fields. Owner decision: a server worker re-reads the stored proof, and with `OCR_SERVER_AUTO_APPROVAL_ENABLED` on, auto-approval uses only the server values. (Phase 1)
- **C2 (medium, existing):** proof URLs are public. OCR crops will go under a private prefix and be read through signed URLs. Making existing proofs private is a separate decision.
- **C3:** URL verification is limited to `format_only` and `manual_open`. The server never fetches a submitted URL, so there is no SSRF surface. `authorized_api` stays a stub behind a disabled flag.
- **C4:** if approved, training runs on the Ubuntu host as a separate low-priority process with CPU and IO limits. The service manager must be reconciled with the current HelloDeploy host before installation. The host's resources still need a survey, and installing the training tools there is a production infrastructure change that needs approval at Phase 4.
- **C5:** the model registry needs versioned tessdata paths, an active pointer and checksum verification.
- **C6:** 13 real user screenshots are committed under `docs/image_test/`. The owner decided not to use them and to leave them in place; untracking them is still an open item.
- **C7:** the current policies do not cover using screenshots to improve the model. Training-sample eligibility in Phase 3 depends on a consent and policy update.
- **C8, observed:** source detection over-claims Strava. A synthetic, unbranded card containing only "Moving Time … Avg Pace" was detected as `strava`, because the Strava cue regex in `ocr-source-detector.js` matches generic metric labels. This breaks the requirement that unknown layouts must not get confident platform labels. Phase 1 will separate brand evidence from layout cues and add an `uncertain` outcome.
- **C9:** tesseract.js in Node caches language data into the working directory by default: a 23 MB `eng.traineddata` written to the repo root. The benchmark disables this with `cacheMethod: 'none'`. `id-ocr.service.js` uses the default, so production may hold the same file in the app directory. Phase 1's server worker will set an explicit cache path.
- Defects found outside this scope were resolved under `BUG-01` on October 20:
  - `honorSystemConfirmed` now persists on standard submissions and resubmissions.
  - `ocrData.extractedRunType` accepts and preserves `treadmill`.
  - Admin bulk reject falls back to accumulated activity only for the explicit
    standard-submission-not-found code.
  - New `critical_audit` failures retain their original timestamp and
    idempotency key for worker replay; legacy sparse rows remain unrecoverable.
  - The in-process and cron scheduled-blog publishers share an atomic leased
    claim with stale-claim recovery.

### 5. Revised approach and estimates

- **Inference** stays in the same runtime: tesseract.js plus sharp in a worker-thread pool of size 1. It runs in-process by default and can move to a separate PM2 process.
- **Job queue:** a Mongo `OcrJob` collection using the existing atomic-claim pattern.
- **New Mongo collections only** (no destructive migrations, Postgres untouched):
  - OcrExtraction, OcrProfile
  - TrainingSample, DatasetVersion, TrainingJob
  - OcrModelVersion, OcrDeploymentEvent
  - OcrNotificationSetting
- **Feature flags,** all off by default: `OCR_SERVER_PIPELINE_ENABLED`, `OCR_SERVER_AUTO_APPROVAL_ENABLED`, `ACTIVITY_URL_ENABLED`, `OCR_TRAINING_ENABLED`, `OCR_REMINDERS_ENABLED`.
- **RBAC:** OCR administration requires `role:admin`. Model activation and rollback require `adminTier:full`.
- **Revised estimates in developer-days:** P1 8–12, P2 3–5, P3 5–10, P4 6–12 plus host setup, P5 4–7, P6 5–10. Time spent waiting to collect consented samples is not included.

### 6. Baseline

| Measure | Value |
|---|---|
| Unit suite (Node v22.23.1, `npm run test:unit`) | 2363 pass, 0 fail, before any change |
| Consented labeled screenshots | 0 |
| Platform/layout detection accuracy | N/A |
| CER | N/A |
| Exact-field accuracy (distance, time, date, type) | N/A |
| Required-field completeness | N/A |
| OCR latency median / p95 | N/A |
| Correction rate, review time | N/A (not measured from production data in Phase 0) |

**Representativeness:** there are no samples, so no accuracy claim can be made. One synthetic rendered image was used only to check that the harness and tesseract.js engine run end to end in Node. It is not a measurement.

**Reproduce:**

```bash
mkdir -p benchmarks/ocr/local/images        # git-ignored; put consented screenshots here
npm run ocr:benchmark:init                   # writes manifest.json + labels.json with unverified suggestions
# edit benchmarks/ocr/local/manifest.json: set consentBasis (e.g. "owner-own-activity"), platform, layout
# edit benchmarks/ocr/local/labels.json: check each suggestion against the screenshot, copy correct values
#   to the top-level fields and lines[].text, then set "verified": true (unverified labels are not scored)
npm run ocr:benchmark -- --condition A --out benchmarks/ocr/local/report-a.json
npm run ocr:benchmark -- --condition B --out benchmarks/ocr/local/report-b.json
```

Only samples with a `consentBasis` are scored. Images listed with a path outside the manifest directory are refused. Labels hold what the screenshot shows, and the `lines[]` entries hold literal transcriptions of cropped text lines used for CER. Metric rules are versioned (`ocr-metrics-v1`): distance tolerance 0.01 km, time tolerance under 1 s.

### 7. Owner decisions (October 17, 2026)

- Server OCR re-reads the stored proof and becomes the source for auto-approval (behind a flag).
- Training host: the Ubuntu production host, a separate PM2 process at low CPU and IO priority with resource limits. Installing the tools there needs separate approval.
- `docs/image_test/` screenshots are not used.
- Branch from `review-decision-history`.

### Blockers and open owner items

1. **Phase 1 gate:** consented, labeled Strava, COROS and Garmin screenshots, for example the owner's own activities. Without them, Phase 1 profiles can only be validated against text fixtures.
2. **Phase 3:** a consent basis and policy update covering model-improvement use.
3. **Phase 4:** a read-only resource survey of the Ubuntu host, and approval to install Tesseract training tools there.
4. **Phase 5:** the weekly digest day and time (timezone defaults to Asia/Manila).
5. Optional: untrack `docs/image_test/`.

---

## Phase 1 report — platform-aware OCR

```text
PHASE: 1 — Platform identification and platform-aware OCR extraction
STATE: COMPLETED (implementation and tests). Gate item BLOCKED: accuracy on labelled screenshots.
FUNCTIONAL BEHAVIOR (all behind flags, default off):
  - OCR_SERVER_PIPELINE_ENABLED: after a proof is stored, one OcrJob per stored proof is queued.
    The extraction worker reads the proof back from R2 with a byte ceiling, decodes it safely,
    runs up to 3 working-copy passes (processed / tall metric crop / dark enhanced / original),
    parses with the same parser the browser uses, detects platform from evidence, and writes
    an immutable OcrExtraction plus a serverOcr summary on every entry sharing the proof.
  - OCR_SERVER_AUTO_APPROVAL_ENABLED: OCR-path auto-approval uses only the server's reading of
    the entry's current proof. Browser-posted values (confidence, distance, time) can no longer
    approve anything (closes Phase 0 finding C1). The entry waits as "Server OCR pending" and is
    re-evaluated when the job completes; failures leave it on manual review ("server_ocr_failed").
  - Platform detection: brand text is required to confirm Strava/COROS/Garmin; layout anchors only
    support it; generic metric labels are not evidence (closes C8). Only profiles an admin has set
    to active may confirm; all ship as `test`. Unconfirmed → generic profile, `uncertain`/`unknown`.
  - Fields: distance, time (+ moving/elapsed/ambiguous kind), pace, date, activity type, elevation,
    steps, name, location; raw line text, line confidence and original-image bounding boxes for
    distance/time/pace (used for training crops in Phase 3); validation flags (missing fields,
    implausible pace, pace/time inconsistency, low resolution, platform uncertain, URL mismatch).
  - /admin/ocr-training (overview), /platforms (profile status with required note + history,
    Test OCR with no writes), /audit (append-only OcrAuditEvent), POST reprocess for an entry.
  - Organizer review page: "HelloRun server reading" panel beside the browser reading.
API / DATA CHANGES (additive only):
  - New collections: OcrJob, OcrExtraction (immutable), OcrProfileSetting, OcrAuditEvent (append-only).
  - New optional fields on Submission and AccumulatedActivitySubmission: serverOcr, proofDifferenceHash.
  - New review reasons: server_ocr_pending, server_ocr_failed. ocrData is unchanged.
  - Postgres untouched; serverOcr is not shadowed (ocr-payload-separation still passes).
MIGRATIONS / ROLLBACK: none required. Turning both flags off restores the previous behaviour
  exactly; new fields are ignored when absent. Rollback = flags off (or revert the commit).
SECURITY & PRIVACY: proof bytes read with a size ceiling; sharp pixel limit and format allowlist from
  decoded bytes; no image content or raw text in logs; Test OCR writes nothing and is rate-limited
  (10 / 10 min / admin), CSRF-checked after Multer, admin-only; OCR evidence escaped in views;
  tesseract.js language cache disabled (no 23 MB file in the app directory, C9).
RESOURCES: one tesseract.js worker thread per process, serialised, per-call timeout (45 s), job
  timeout (120 s), recycled after 50 jobs, terminated after 5 min idle; at most 3 jobs per 15 s
  cycle; OCR_WORKER_MODE=separate moves it to `npm run ocr:worker` under its own PM2 process.
TESTS RUN:
  - tests/ocr-platform-aware.unit.test.js 30/30 (detection, image validation, passes, dHash,
    pipeline with injected engine, engine serialisation/timeout/recycling, auto-approval gate
    on/off/stale proof, projection, queue no-op/failure, routes, views, escaping).
  - tests/ocr-engine-real.unit.test.js 2/2 (real tesseract.js on synthetic rendered cards).
  - tests/ocr-benchmark.unit.test.js 10/10 (adds condition B).
  - tests/ocr-server-pipeline.integration.test.js 10/10 against disposable local MongoDB, run
    through the repository DB guard (idempotent enqueue under concurrency, single claimant,
    lease reclaim, backoff, immutability, forged browser reading not approved, server reading
    approves, mismatch stays on review, stale proof ignored, unreadable proof fails safe, flags off).
  - Full unit suite: see commit message.
BASELINE OR MEASURED METRICS: none. 0 consented labelled screenshots; every accuracy metric N/A.
  `npm run ocr:benchmark -- --condition A|B` compares baseline and pipeline on the same manifest
  once samples exist. On one synthetic unbranded card A labelled it strava and B abstained —
  an illustration of C8, not a measurement.
KNOWN ISSUES / BLOCKERS:
  - BLOCKED: gate "tests pass on labelled sample sets across supported and unknown layouts" needs
    consented Strava/COROS/Garmin screenshots. Profile anchors are unvalidated until then, so
    profiles stay `test` and production confirms no platform.
  - Reprocess is admin-only; event-scoped reviewer reprocess was not added (reviewers see the panel).
  - Bounding boxes come from matching parsed values to OCR lines (`line-value-match-v1`), a heuristic
    that is recorded with each box.
NEXT PHASE DEPENDENCIES: none for Phase 2.
```

---

## Phase 2 report — optional activity URL and verification

```text
PHASE: 2 — Optional activity URL and verification workflow
STATE: COMPLETED. BLOCKED item: `authorized_api` verification — HelloRun has no authorised
  provider API (Strava event use is blocked by policy; no Garmin/COROS partner access).
FUNCTIONAL BEHAVIOR:
  - ACTIVITY_URL_ENABLED shows an optional "Activity link" field in the run-proof modal with
    privacy copy. Empty is always accepted. A link that is not an exact HTTPS Strava, Garmin
    Connect or COROS activity URL gets a field error the runner can fix or clear, checked
    before the proof is uploaded.
  - Parsing is pure string handling (src/utils/ocr/activity-url.js): no DNS, socket or redirect,
    so there is no SSRF surface. Rejects other schemes, credentials, ports, IP/localhost/metadata
    hosts, lookalike and punycode hosts, shortlinks, traversal and control characters. The stored
    link is rebuilt from the provider id; tracking parameters and the raw paste are discarded.
  - COROS link format is unconfirmed (no real example in the repo): host-only trust, id from
    `labelId`, marked `unverified-format` in data and in the reviewer panel.
  - Verification methods: format_only (on submission), manual_open (reviewer opens the link in
    their own browser and records overall + per-field results; append-only history in
    ActivityUrlVerification; a field mismatch is never stored as a match), authorized_api
    (reported unavailable; nothing fetched).
  - Duplicate signals (flags, never rejections): same provider activity id on another entry
    (checked at submission), near-identical screenshot by 64-bit difference hash, Hamming ≤ 6
    (checked by the OCR worker, same event in 180 days or exact hash anywhere). Entries
    submitted together are never flagged against each other. Any signal blocks auto-approval.
  - Screenshot platform vs link provider disagreement is recorded as `url_provider_mismatch`
    and blocks server auto-approval.
  - Review page: "Activity link and duplicates" panel with the rebuilt link
    (noopener noreferrer nofollow, no referrer), status, signals and the check form.
API / DATA CHANGES (additive): Submission/AccumulatedActivitySubmission gain optional activityUrl,
  activityUrlVerification, duplicateSignals; partial indexes on provider id and difference hash;
  new ActivityUrlVerification collection; route POST
  /organizer/events/:id/submissions/:submissionId/activity-url-check (event-scoped, CSRF, rate-limited).
MIGRATIONS / ROLLBACK: none. With ACTIVITY_URL_ENABLED off nothing is added to entries
  (sanitizeActivityEvidence returns no fields). Near-duplicate flags need OCR_SERVER_PIPELINE_ENABLED.
TESTS RUN: tests/ocr-activity-url.unit.test.js 14/14 (26 SSRF/spoofing inputs, no network code in
  URL modules, normalisation, evidence shaping, auto-approval guards, panel, modal, controller order,
  route scoping); tests/ocr-activity-evidence.integration.test.js 4/4 and Phase 1 integration 10/10
  on local MongoDB through the DB guard; related UI/escaping suites green. Full unit suite: see
  Phase 2 commit follow-up below.
KNOWN ISSUES: provider id duplicates are flagged even across different events for the same runner
  (conservative; reviewers decide, per doc 03). COROS pattern needs confirming with a real link.
```

Phase 2 full unit suite (commit 6e37c6f, run in a separate git worktree so work could continue):
2417/2419. The two failures are worktree-only: `deploy-hygiene › the commit resolves … from .git`
(`.git` is a file in a worktree) and `thirty-day-running-challenge-blog-content › single-article
creator …` (needs MONGODB_URI from `.env`, absent in the worktree). Both pass in the main checkout.

---

## Phase 3 report — reviewer corrections and training dataset management

```text
PHASE: 3 — Reviewer corrections and training dataset management
STATE: COMPLETED. BLOCKED for real use: (1) publish privacy-policy wording for the opt-in before
  enabling OCR_TRAINING_CONSENT_PROMPT_ENABLED (Phase 0 finding C7, owner/legal decision);
  (2) consented screenshots to produce actual samples.
FUNCTIONAL BEHAVIOR:
  - Reviewer activity corrections stay where they were (organizerCorrections + ReviewDecision) and
    are never copied into training data (unit test asserts the correction code never references it).
  - Consent: OCR_TRAINING_CONSENT_PROMPT_ENABLED shows an unchecked opt-in in the run-proof modal;
    stored on the entry with the wording version (2026-10-v1). Runners withdraw from their submission
    page; withdrawal excludes that screenshot's samples from all future datasets (audited). Admins can
    exclude every sample of a participant on request.
  - Candidates: the OCR worker crops only the located distance / time / pace lines (padded, clamped)
    of opted-in proofs, stores them privately (`ocr-training/crops/<random>.png`, signed 5-minute reads,
    optional OCR_R2_BUCKET), dedupes by crop checksum, and creates `pending`, `ineligible` samples with
    an empty transcription. Admins can also add their own screenshots (consent basis + attestation);
    only line crops are kept, never the screenshot.
  - Review (/admin/ocr-training/samples): crop viewer, engine reading and activity value shown
    separately from the literal-transcription field; approve requires text + explicit alignment
    confirmation + consent basis; exclude requires a reason; optimistic concurrency (409 on stale
    version); every action audited.
  - Eligibility = approved + consent basis + literal text + alignment + crop present + retention not
    expired. Retention default 730 days (setting); expired samples are excluded and their crops deleted
    hourly by the extraction worker (and by the training worker).
  - Snapshots: immutable DatasetVersion with canonical manifest + SHA-256 hash (reproducible), split
    rule group-sha256-v1 (80/10/10 by screenshot, so no leakage), duplicate removal, quality report.
    Readiness fails closed until thresholds are met AND the owner marks them approved in settings.
    Manifest JSON download (no crop keys, no participant data).
  - Export: `npm run ocr:dataset:export -- --dataset <id> --out <dir>` writes tesstrain pairs
    (<id>.png + <id>.gt.txt) for train+validation and a separate held-out test directory; every crop
    checksum is verified.
DATA CHANGES (additive): TrainingSample, DatasetVersion, OcrSettings collections; optional
  ocrTrainingConsent on entries.
TESTS RUN: tests/ocr-training-data.unit.test.js 11/11; tests/ocr-training-data.integration.test.js 6/6
  on local MongoDB through the DB guard (consent required, pending/ineligible start, dedupe, approval
  rules, 409 conflict, exclusion reason, eligible-only immutable snapshots with reproducible hash,
  opt-in → worker candidates, withdrawal, cross-runner withdrawal refused, retention expiry).
KNOWN ISSUES: one consenting entry per proof supplies the consent for its crops (entries submitted
  together share one screenshot). Deleting a sample does not remove its influence on an already
  trained model (doc 05); this is stated in the UI.
```

---

## Phase 4 report — manual training, evaluation, deployment controls and rollback

```text
PHASE: 4 — Manual Tesseract training, model evaluation, deployment controls, rollback
STATE: COMPLETED (control plane, worker, evaluation, registry, admin UI, tests).
  BLOCKED: (1) no real tesstrain run — tesseract/lstmtraining/tesstrain are not installed on any
  machine available to this work, and installing them on the Ubuntu production host is a production
  infrastructure change that needs owner approval (Phase 0 decision); (2) the doc-04 gate
  "rollback proven in staging" — there is no staging tier. Rollback is proven against a local
  MongoDB with injected storage; it has not been rehearsed against production-like infrastructure.
FUNCTIONAL BEHAVIOR:
  - Start (/admin/ocr-training/jobs): any admin, OCR_TRAINING_ENABLED on, a `ready` immutable dataset
    whose hash still verifies, a training worker seen in the last 3 min with a passing preflight.
    Idempotency key per page render (double-click → same job); a unique partial index on
    TrainingJob.activeLock allows one active job system-wide (409 otherwise). 503/422 per doc 03.
  - Worker (`npm run ocr:training-worker`, separate PM2 process, never in the web app): lowers its own
    priority, heartbeats + preflight every minute, marks jobs whose lease expired as `interrupted`
    (no silent resume), sweeps sample retention, runs one job at a time.
  - Preflight: tesseract, lstmtraining, make, tesstrain Makefile, tessdata_best eng.traineddata,
    a resource limiter (systemd-run scope or prlimit), nice, free disk ≥ setting, free memory.
  - Training: dataset materialised from the manifest (checksums verified; test split held apart),
    `make training` built as a fixed argument array (validated names/paths; no shell) wrapped in
    systemd-run --user --scope -p CPUQuota/-p MemoryMax (or prlimit --as), nice -n 19, ionice -c3,
    OMP_THREAD_LIMIT=1, wall-clock timeout; whole process group killed on cancel/timeout; log capped at
    5 MB and stored privately; peak RSS sampled from /proc.
  - Output: checksummed artifact stored once under a job-specific key → OcrModelVersion `candidate`.
  - Evaluation: candidate vs the currently active model on the held-out test lines (PSM 7, same engine);
    CER + exact-line accuracy overall and per platform/layout. Gates fail closed: owner-approved
    thresholds required, coverage per platform, no per-platform CER regression beyond the margin,
    overall not worse → `passed_gates` / `failed_gates`. Never auto-promoted.
  - Approve / Activate / Roll back (/admin/ocr-training/models): full admin tier only, reason ≥ 10
    chars, typed confirmation (APPROVE / ACTIVATE / ROLLBACK), rate-limited, audited. Activation needs
    `approved`, verifies the artifact checksum first, then compare-and-set on the registry version (a
    stale page or a concurrent activation gets 409). Rollback to previous, base, or another approved
    model. Every attempt (incl. failures) recorded in append-only OcrDeploymentEvent.
  - Inference: the engine resolves the active model through the registry (60 s cache) and loads a
    checksum-verified local copy; any failure falls back to the bundled base model and is counted
    on the Models page. Browser prefill keeps the base model (C5).
DATA CHANGES (additive): TrainingJob, OcrModelVersion, OcrModelRegistry, OcrDeploymentEvent,
  OcrTrainingWorkerStatus collections.
TESTS RUN: tests/ocr-training-models.unit.test.js 8/8 (argument-array command with limits and
  injection refusal, preflight fail-closed, real child-process stand-in: exit/timeout/cancel kill the
  process group with no orphans, spawn failure, log cap, gates incl. per-platform regression and
  unapproved thresholds, engine switching models, deployment routes require full tier, trainer never
  in the web app, views with/without deploy rights); tests/ocr-training-models.integration.test.js
  7/7 on local MongoDB (refusals 503/422, double-click idempotency, 409 single active job, cancel
  releases lock, failed trainer leaves production unchanged, interrupted recovery, completed job →
  passed_gates candidate, approval/activation rules, stale version 409, checksum-verified activation,
  tampered artifact → base fallback, rollback, concurrent activations, failed activation recorded).
RESOURCES: the training worker's own evaluation uses tesseract.js in its process at nice 19.
KNOWN ISSUES: CPU/memory limits rely on systemd user scopes or prlimit being usable on the host;
  preflight reports which. MemoryMax applies to the scope, prlimit to address space (coarser).
```

---

## Phase 5 report — administrator reminders, scheduling, analytics and reports

```text
PHASE: 5 — Administrator email reminders, scheduling, analytics, reports
STATE: COMPLETED. Open owner input: the digest day and hour (doc 08 forbids inventing one; until set,
  the digest is "not scheduled"). Timezone defaults to Asia/Manila.
FUNCTIONAL BEHAVIOR:
  - Switches: OCR_REMINDERS_ENABLED (operator) and Settings › "Send OCR reminders" (admin). Both off
    by default. Reminders never start training or change models.
  - Events: ocr.review_digest (scheduled; only if samples are pending or new eligible samples ≥
    threshold), ocr.dataset_ready (threshold crossed since the last completed training; wording says it
    is not a scientific minimum), ocr.training_completed / ocr.training_failed (from the training
    worker; initiator included), ocr.model_approval_needed and ocr.model_activated (full admins only),
    ocr.quality_regression (server-vs-entry disagreement for a platform up ≥ 15 points over the 28-day
    baseline with ≥ 20 readings in both windows; daily check). Per-event subscriptions in settings.
  - Recipients: resolved from RBAC each time (active admins; optional selected list; mute list).
  - Scheduling: weekly / fortnightly / monthly at the admin's day and hour in their IANA timezone
    (Intl; DST-correct); one period key per period, so late or restarted schedulers send once.
  - Dedupe: unique (eventKey, recipient) row. Delivery claims the row (lease), respects the shared
    daily email budget and maintenance mode, retries 5 min / 30 min / 2 h / 12 h, stops at 5 attempts
    (failed), suppresses recipients who lost admin rights, stores the provider message id.
  - Email content: counts and authenticated admin links only (sendOcrAdminNotificationEmail).
  - Settings page (/admin/ocr-training/settings, edit = full admin): reminders, recipients, mute,
    event subscriptions, dataset thresholds + owner approval, evaluation gates + owner approval,
    retention, training limits, test email, delivery history.
  - Analytics (/admin/ocr-training/analytics, 7/30/90/365 days): extraction completeness and latency
    (median/p95) by detected platform, detection distribution (confirmed/uncertain/unknown), server-vs-
    entry disagreement, manual review count, correction rate (distance/time corrections), auto-approved
    count, review time median/p95, accuracy on reviewed ground truth (CER, exact lines), job failures,
    training history with resource use, held-out evaluations. N/A wherever nothing was measured.
  - Research export (full admin, rate-limited, audited): long-format CSV of aggregates with experiment
    id, window, metric-rules version, model/dataset as short hashes; no participant, entry, event, URL,
    name, location or image identifiers; formula injection neutralised.
DATA CHANGES (additive): OcrNotificationEvent collection. In-process ocr-maintenance-worker (5 min,
  flag-gated).
TESTS RUN: tests/ocr-notifications.unit.test.js 11/11 (schedule, DST in America/New_York, fortnight
  and month periods, ISO week edge, event keys, email content, CSV injection, export source has no
  identifiers, tier gating, worker gating, views); tests/ocr-notifications.integration.test.js 7/7 on
  local MongoDB (both switches, RBAC recipients incl. full-tier-only, three concurrent emits → one row
  per recipient, retry/backoff to the limit, budget wait, suppression, digest actionability + once per
  period across restart, analytics values and an identifier-free export).
```

---

## Phase 6 report — QA, security validation, production readiness

```text
PHASE: 6 — Quality assurance, security validation, production readiness
STATE: COMPLETED for everything the repository and a local machine can verify. Not verifiable here:
  staging rehearsal of migration/flags/rollback (no staging tier exists), accuracy on real
  screenshots (none consented yet), production resource use (measured on the dev box only).
WORK DONE:
  - Full regression: final sequential unit run 2458/2459 on the finished code; the one failure was
    my own Phase 2 source-assertion made stale by Phase 3 (payload property order). Fixed; all OCR
    unit files 172/172; full rerun after the fix: 2459/2459 (Node 22.23.1, sequential).
  - Integration: all six OCR suites, 39/39, on a disposable local MongoDB through the repo DB guard.
  - End to end (tests/ocr-admin-e2e.integration.test.js): boots the real app with every OCR flag on
    and all external services blanked; /healthz and /readyz 200; anonymous → login; runner 403 on
    every OCR admin route; support admin can read all eight pages but gets 403 on settings, rollback
    and research export and sees no deploy controls; full admin: all pages 200, missing CSRF → 403,
    settings saved and invalid timezone rejected, profile enable requires a note and is audited, a
    real Test OCR upload through Multer + engine returns the reading (≈4.9 s), a GIF is refused.
  - Security regression suite (tests/ocr-security-regression.unit.test.js): flags default off; OCR
    evidence preserved in ReviewDecision snapshots; no OCR text/crops/tokens in logs; no outbound
    HTTP or shell in OCR modules; all 14 mutating admin routes behind admin + CSRF, deploy/settings/
    export behind the full tier (route count pinned); organiser/runner routes CSRF + scoped; admin
    redirects confined; new views escape output; no OCR data in the Supabase shadow; trainer never
    reachable from a request.
  - Fix found by review: ReviewDecision evidence snapshots now include serverOcr, activityUrl,
    activityUrlVerification and duplicateSignals, so an auto-approval records the server reading it
    relied on (absent fields are not copied; older entries record exactly as before).
  - Resource: real engine measured on synthetic 1080×2400 cards: 3.3–5.5 s wall, 3.4–7.6 s CPU,
    peak RSS ≈ 350 MB per process. Added an early stop (distance + time found by two passes), which
    cut per-proof time by about a third (previously 5.0–7.3 s, always three passes).
  - Responsive/accessibility (headless Chromium, 375×812): all eight admin pages render with no
    horizontal overflow, no unlabelled inputs/selects, no console errors. Fixed a settings-page
    overflow (fieldset min-width) and oversized checkboxes found this way.
  - Test environment note: the disposable MongoDB needs `--ulimit nofile=64000:64000`; without it
    WiredTiger aborted with EMFILE when all suites ran together (documented in the commands).
  - Deployment, staged rollout, rollback, training-host setup and monitoring:
    DEPLOYMENT-AND-ROLLBACK.md.
```

## Final acceptance checklist (doc 09)

| Item | State | Evidence / blocker |
|---|---|---|
| Phase 0 source audit complete, assumptions reconciled | COMPLETED | Phase 0 report |
| Existing submissions regression tested | COMPLETED | Full unit suite; flags-off integration test; review-decision and auto-approval suites |
| Platform-aware profiles and generic fallback validated | BLOCKED (partly) | Logic tested on text and synthetic images; validation on consented, labelled real screenshots pending |
| Optional activity URL validated safely without arbitrary network fetches | COMPLETED | 26 SSRF/spoofing cases; no network code in URL modules |
| Reviewer verification and activity corrections audited | COMPLETED | ReviewDecision (now with OCR evidence), ActivityUrlVerification, OcrAuditEvent |
| Ground truth samples correctly paired, dataset splits leak-free | COMPLETED | Export checksum verification; group split tests |
| Training worker and resource guardrails proven | COMPLETED (stand-in) / BLOCKED (real) | Process-group kill, timeout, cancel, limits argv tested; no real tesstrain run (tools not installed; host change needs approval) |
| Candidate metrics measured on holdout; per-platform comparison reviewed | BLOCKED | Mechanism tested with injected recognisers; no real candidate exists |
| Model activation and rollback proven in staging | BLOCKED | Proven on local MongoDB; no staging tier |
| Admin email reminders opt-in/preferences, dedupe and failures tested | COMPLETED | Notification unit + integration suites |
| Security, privacy, RBAC and data retention tested | COMPLETED | Security regression suite, e2e RBAC/CSRF, retention tests |
| Research reports reproducible and privacy-minimised | COMPLETED | Identifier-free export test; metric rules versioned |
| Owner grants separate authorization for deployment | NOT STARTED | Merge completed October 19; deployment remains separately gated |

## Owner actions before production use

1. Review the merged change and deploy with all OCR flags off under `REL-01`.
2. After deploying with flags off, run authorized Strava/COROS/Garmin screenshots through
   *Platforms › Test OCR* in the live admin and report misreads; then set dataset and gate
   thresholds and approve them in Settings. (Decision 2026-10-18: no local folder; existing
   database entries are not used, because their runners did not consent. Training data comes only
   from new opted-in submissions.)
3. Training material from all entries (decision 2026-10-18): legal review, publish the revised
   wording (notice + right to object; drafts in `docs/policy-markdown-pack/`), record basis, date and
   version in Settings, wait 30 days, then run *Jobs › Backfill past entries*
   (DEPLOYMENT-AND-ROLLBACK.md §4 step 6).
4. Training host: run `deploy/ocr-training/survey.sh` (read-only), pick the two commit pins, preview
   `install-training-tools.sh` (dry run), then apply with approval. Steps in DEPLOYMENT-AND-ROLLBACK.md §6.
5. ~~Choose the weekly digest day and hour~~ — done: Friday 16:00 Asia/Manila (2026-10-18).
6. ~~Untrack `docs/image_test/`~~ — done (5a59804); still present in git history.
7. Deploy and roll out by flags only after the applicable ROADMAP dependencies
   and DEPLOYMENT-AND-ROLLBACK.md §4 gates are satisfied.

---

## Follow-up — training basis: notice and objection (2026-10-18)

```text
DECISION: Henz — use all run-proof entries (past and future, accepted and rejected) as OCR training
  material, under a published notice with a right to object, instead of opt-in only.
STATE: COMPLETED and merged to main in 0c1fd86. Nothing is processed until the owner
  records the legal prerequisites; the code enforces them.
BEHAVIOR:
  - Settings: training basis opt_in (default) | notice_opt_out. Switching needs the notice date and
    policy version, typed CHANGE BASIS, full admin; audited. Backfill date held ≥ 30 days after notice.
  - One rule, isEntryUsableForTraining: image proof, existing active account, not objected, not a known
    minor, entry not withdrawn, and (opt-in tick OR published notice basis). Review status is ignored.
  - Objection: Profile › Screenshot reader improvement (account-wide, past and future, audited);
    excludes existing samples. Per-entry withdrawal unchanged. Modal shows a notice under the new basis.
  - Backfill: full-admin dry run (counts and exclusion reasons, read-only), START BACKFILL, pause,
    resume, cancel. Runs in the extraction worker only when no submission job waits, ≤ 5 entries per
    cycle, ≤ 5 outstanding jobs, daily cap (default 500), resumable cursor; reuses current server
    readings; pauses itself if the basis is withdrawn or the pipeline is turned off.
  - Policy drafts revised to notice + objection wording (still for legal review).
DATA (additive): User.ocrTrainingOptOut; OcrSettings.training.{basis, noticePublishedAt,
  noticePolicyVersion, backfillNotBefore, backfillDailyCap}; OcrBackfillRun collection; new sample
  basis notice_legitimate_interest and sources submission_notice / backfill; extraction source backfill.
TESTS: tests/ocr-training-notice.unit.test.js 9/9 (eligibility truth table incl. approved = rejected,
  minors on the 18th birthday, gates, UI); tests/ocr-backfill.integration.test.js 7/7 (gates, dry-run
  counts, yielding, daily cap + resume, objection afterwards, reuse of existing readings, basis
  withdrawal pauses); all OCR integration suites 46/46; full unit suite: see commit.
NOT DONE: legal review and publication (owner); no production data was read for this work.
```

