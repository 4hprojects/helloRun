# Platform-Aware OCR — Implementation Progress

**Branch:** `feature/platform-aware-ocr-training` (from `review-decision-history` @ 1753047)
**Last updated:** October 17, 2026
**Delivery status owner:** [../../STATUS.md](../../STATUS.md). This file records phase reports and evidence.

| Phase | State |
|---|---|
| 0 Repository assessment and baseline | Complete, awaiting owner review |
| 1 Platform-aware OCR | Not started |
| 2 Optional activity URL | Not started |
| 3 Reviewer corrections and datasets | Not started |
| 4 Manual training and model registry | Not started |
| 5 Reminders, analytics, exports | Not started |
| 6 QA and production readiness | Not started |

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
