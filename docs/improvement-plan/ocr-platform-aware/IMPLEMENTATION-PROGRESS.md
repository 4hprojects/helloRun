# Platform-Aware OCR — Implementation Progress

**Branch:** `feature/platform-aware-ocr-training` (from `review-decision-history` @ 1753047)
**Last updated:** October 17, 2026
**Delivery status owner:** [../../STATUS.md](../../STATUS.md). This file records phase reports and evidence.

States: NOT STARTED · IN PROGRESS · COMPLETED · BLOCKED. "Completed" means implemented and tested
on this branch. Gates that need data or infrastructure the repository cannot supply are listed
separately as BLOCKED and are not counted as passed.

| Phase | State | Commit | Blocked gate items |
|---|---|---|---|
| 0 Repository assessment and baseline | COMPLETED | fd700ad | Image baseline N/A (no consented samples) |
| 1 Platform-aware OCR | COMPLETED | dfac7bf | Accuracy validation on labelled screenshots |
| 2 Optional activity URL | COMPLETED | see Phase 2 report | `authorized_api` verification (no provider API access) |
| 3 Reviewer corrections and datasets | NOT STARTED | | |
| 4 Manual training and model registry | NOT STARTED | | |
| 5 Reminders, analytics, exports | NOT STARTED | | |
| 6 QA and production readiness | NOT STARTED | | |

## Resume checkpoint

If a session is interrupted, resume from the first phase above that is not COMPLETED.
Test commands used on this branch:

```bash
export PATH=$HOME/.nvm/versions/node/v22.23.1/bin:$PATH        # Node 22 (the default v20 is too old)
node src/scripts/run-test-group.js --parallel tests/*.unit.test.js   # DB-free
# Local, disposable MongoDB for OCR integration tests (never the .env databases):
docker run -d --name hellorun-ocr-test-mongo -p 127.0.0.1:27018:27017 --tmpfs /data/db mongo:7.0
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
| Hosting | One PM2 fork process on the Ubuntu host behind a Cloudflare tunnel; Render is the backup. The repo has no ecosystem file, Dockerfile or CI, and no lint or typecheck. Redis is not configured in production |
| Workers | Nine in-process `setInterval` workers started from `src/server.js`. No queue library. Only `event-promotion-worker.js` claims work atomically (`findOneAndUpdate` with a stale-claim retake) |
| Auth/RBAC | `User.role` is runner, organiser or admin. `adminTier` is full or support (`requireAdmin`, `requireFullAdmin` in `auth.middleware.js`). Event scope comes from `resolveEventAccess` (admin, owner, co_organizer). There is no OCR-admin or model-deploy permission |
| Audit | Postgres `audit_critical` (`critical-audit.service.js`; fire-and-forget, and failures go to a dead letter without retry) plus the Mongo `ReviewDecision` (append-only) |
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
- **C4:** training runs on the Ubuntu host as a separate PM2 process at low CPU and IO priority (owner decision). The host's resources still need a survey, and installing the training tools there is a production infrastructure change that needs approval at Phase 4.
- **C5:** the model registry needs versioned tessdata paths, an active pointer and checksum verification.
- **C6:** 13 real user screenshots are committed under `docs/image_test/`. The owner decided not to use them and to leave them in place; untracking them is still an open item.
- **C7:** the current policies do not cover using screenshots to improve the model. Training-sample eligibility in Phase 3 depends on a consent and policy update.
- **C8, observed:** source detection over-claims Strava. A synthetic, unbranded card containing only "Moving Time … Avg Pace" was detected as `strava`, because the Strava cue regex in `ocr-source-detector.js` matches generic metric labels. This breaks the requirement that unknown layouts must not get confident platform labels. Phase 1 will separate brand evidence from layout cues and add an `uncertain` outcome.
- **C9:** tesseract.js in Node caches language data into the working directory by default: a 23 MB `eng.traineddata` written to the repo root. The benchmark disables this with `cacheMethod: 'none'`. `id-ocr.service.js` uses the default, so production may hold the same file in the app directory. Phase 1's server worker will set an explicit cache path.
- Defects found outside this scope (logged only):
  - `honorSystemConfirmed` is missing from the `Submission` schema, so it is dropped.
  - `ocrData.extractedRunType` does not allow `treadmill`.
  - Admin bulk-reject falls back on any error.
  - `critical_audit` writes are never retried.
  - Two scheduled blog publishers run without claiming posts.

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
mkdir -p benchmarks/ocr/local/images        # git-ignored
cp benchmarks/ocr/manifest.example.json benchmarks/ocr/local/manifest.json
cp benchmarks/ocr/labels.example.json   benchmarks/ocr/local/labels.json
# add consented images + verified labels, then:
npm run ocr:benchmark -- --out benchmarks/ocr/local/report.json
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

