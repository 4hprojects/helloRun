# Phased implementation roadmap and review gates

> **Historical implementation plan:** Phases 0–6 were implemented on the dedicated
> feature branch and merged to `main` by October 19, 2026. The branch instructions and
> phase gates below preserve the implementation record; they are not an active backlog.
> Deployment, legal, data, and rollout work is tracked only in
> [ROADMAP](../../ROADMAP.md) under `REL-01` and `REL-03`.

The implementation required a dedicated feature branch. Each phase produced code,
tests, documentation and a completion report described in
`00-CLAUDE-CODE-INSTRUCTIONS.md`. Deployment still requires explicit approval.
Estimates below are the original preliminary developer-days.

## Phase 0: repo inspection and baseline (2–4 days)

**Build** no major features yet. Map submission, current OCR (if any), RBAC, review, storage, scheduler, email, deployment and tests. Build verified benchmark and measure baseline.
**Gate:** current architecture inventory, requirements gap analysis, security findings, baseline metrics, revised architecture and estimates reviewed.

## Phase 1: platform-aware OCR (5–10 days)

- Ingest validated images via existing upload path; safely preprocess images.
- Identify platform from screenshot evidence; use URL as separate provider signal.
- Support named Strava, COROS and Garmin profile families backed by actual test images, not invented fixed crop coordinates.
- Implement generic fallback and explicit `unknown/uncertain` outcomes.
- Extract distance, duration, pace, date and activity type where visible; preserve raw text, bounds, profile version and confidence.
- Normalize units, parse formats, detect contradictions; preserve originals and do not overwrite reviewer corrections.
- Provide admin Test OCR with sanitized diagnostics and no production writes.
**Gate:** tests pass on labeled sample sets across supported and unknown layouts; baseline comparisons reported; legacy submission regression passes.

## Phase 2: optional activity URL and verification (4–8 days)

- Add optional URL to submission with privacy copy and validation.
- Implement provider allowlist and URL parsing; no arbitrary server-side requests, redirects, or internal IP access.
- Define manual-open, format-only and approved API adapter verification methods with provenance.
- Detect duplicate provider activity IDs and near-identical screenshots, flag ambiguous cases.
- Add review view comparing OCR, manual and authorized source data; require human decision for conflicting values.
**Gate:** no URL still works; private/expired/unknown links gracefully degrade; security SSRF tests and event rules pass.

## Phase 3: sample review and dataset governance (5–10 days)

- Admin sample queue and crop viewer with literal transcription separate from activity correction.
- Approve/reject training sample with retention/consent basis and reviewer audit.
- Hash/deduplicate, track platform/layout and versioned crops, create immutable dataset manifests.
- Partition at screenshot/activity group level into train/validation/test; freeze final benchmark set.
- Build export of Tesseract-compatible line images and matching `.gt.txt` data.
**Gate:** reproducible dataset creation, no split leakage, verified image-text alignment, access control, exclusion/retention tests.

## Phase 4: manually controlled training and model registry (6–12 days)

- Add training-service packaging, dependency checks, preflight CPU/memory/disk constraints, worker isolation.
- Add manual Train button to queue one job, unique idempotency key, cancel/status/logs/restart behavior.
- Fine-tune with supported Tesseract `tesstrain` process using approved verified data.
- Capture checkpoint, config, source base model, dataset hash, metrics and artifact checksum.
- Evaluate holdout CER and exact-field accuracy by platform/layout; compare baseline and candidate, apply regression gates.
- Add approval, atomic activation, prior-model retention and audited rollback.
**Gate:** successful sandbox training and intentionally failed/interrupted job show production unaffected; rollback proven in staging. Training may remain disabled if representative data is insufficient.

## Phase 5: reminders, admin reporting, research exports (4–8 days)

- Weekly default actionable reminder and configurable admin recipients/timezone/threshold.
- Completion/failure/approval alerts, delivery status, suppression and deduplication.
- Show per-platform OCR and reviewer metrics, training history, held-out evaluation and job resource usage.
- Export privacy-minimized aggregate metrics with dataset/model/profile versions for research reproducibility.
**Gate:** deterministic reminder tests including restart, multi-instance, failed delivery, opt-out and dedupe; metrics traceable to approved ground truth.

## Phase 6: QA, rollout and handoff (5–10 days)

- End-to-end regression, security, load/resource limits, failure injection, data migration, accessibility and responsive UI.
- Document commands, environment, safe backups, migration order, deployment toggles and rollback.
- Stage rollout with feature flag: admin tests -> reviewer beta -> limited participant events -> broader rollout.
- Review real evaluation metrics and operational health before any merge/deploy.
**Gate:** signed acceptance checklist, test artifacts and branch ready for PR. Deployment requires new explicit owner approval.

## Dependencies and sequencing

- Phase 0 gates all implementation. Phase 1 can begin before training data is large enough.
- Phase 3 must produce reliable ground truth before Phase 4 fine-tuning.
- Phase 2 may depend on provider documentation and API authorization; ship manual-only comparison first if needed.
- Phase 5 reminders may be built in parallel with training job management after queue and RBAC patterns are verified.
- No accuracy claims or scheduled deployment deadlines without measured data.
