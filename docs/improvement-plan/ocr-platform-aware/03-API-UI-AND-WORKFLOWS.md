# UI, API and workflow contracts

## Participant submission

- Preserve existing upload requirements, file size limits and event validation.
- Add optional Activity URL field with explanatory copy: helps reviewers compare activity data; not required; private links may be inaccessible.
- After screenshot processing, show extracted fields with source platform and uncertainty. Do not force users to accept invented values.
- Do not block screenshot-only or unknown-platform submissions.
- Present visible distinction between `recognition`, `URL review`, and `event approval` status.

## Proposed admin routes

- `/admin/ocr-training` overview: pending samples, review due, ready samples, active model, accuracy by provider and current job status.
- `/admin/ocr-training/samples`: filter by platform/layout/confidence; inspect original screenshot and cropped region; edit **literal transcription**, separate from normalized activity value; approve/exclude with reason.
- `/admin/ocr-training/platforms`: tested platform/layout profiles and version history; test extraction; enable profile after regression checks.
- `/admin/ocr-training/jobs`: prepare dataset; preflight; start, poll, cancel and inspect durable jobs/logs.
- `/admin/ocr-training/models`: baseline/candidate comparison; guardrailed approve/activate; rollback with reason and audit.
- `/admin/ocr-training/analytics`: source detection, extraction accuracy, corrections, review times, job failure and latency by platform/layout.
- `/admin/ocr-training/settings`: recipients, notification frequency, new-sample threshold, resource limits, retention and model policies.

All admin pages: responsive, accessible, with empty/error/loading states and clear irreversible-action confirmations.

## Illustrative REST contract (adapt to existing API conventions)

| Method | Route | Authorization | Behavior |
|---|---|---|---|
| POST | `/api/activities/:id/ocr/reprocess` | reviewer/admin | Queue extraction with chosen or auto profile; return job ID |
| GET | `/api/activities/:id/ocr` | owner or scoped reviewer | Return provenance and extraction revisions (redact private fields) |
| POST | `/api/activities/:id/activity-url` | owner before lock or reviewer | Validate and store optional provider link |
| POST | `/api/activities/:id/url-verification` | reviewer/admin | Queue safe provider verification, return status |
| POST | `/api/activities/:id/review` | scoped reviewer | Persist activity decision and corrections |
| GET | `/api/admin/ocr/samples` | OCR admin | Filtered sample queue |
| PATCH | `/api/admin/ocr/samples/:id` | OCR admin | Correct literal transcription, approve/exclude with reason |
| GET | `/api/admin/ocr/profiles` | OCR admin | Profile versions and performance |
| POST | `/api/admin/ocr/profiles/:id/test` | OCR admin | Run nonproduction profile test |
| POST | `/api/admin/ocr/datasets` | OCR admin | Create immutable dataset snapshot after checks |
| POST | `/api/admin/ocr/jobs` | OCR admin | Queue manual training, require idempotency key |
| GET | `/api/admin/ocr/jobs/:id` | OCR admin | Status, logs pointer and metrics |
| POST | `/api/admin/ocr/jobs/:id/cancel` | OCR admin | Request safe cancellation |
| GET | `/api/admin/ocr/models` | OCR admin | Model registry and evaluation results |
| POST | `/api/admin/ocr/models/:id/activate` | super admin / explicit deployment permission | Validate gates and atomic switch |
| POST | `/api/admin/ocr/models/:id/rollback` | super admin | Restore approved previous model |
| GET/PATCH | `/api/admin/ocr/notifications/settings` | authorized admin | Configure safe reminders |
| GET | `/api/admin/ocr/analytics` | OCR admin | Aggregated metrics only |

## Request/response behaviors

- 400 malformed fields; 401 authentication required; 403 permission denied; 404 nonexistent or non-visible resource; 409 conflict/duplicate job/locked review; 413 oversized media; 422 invalid dataset/preflight; 429 rate-limited; 503 worker unavailable.
- Return stable machine-readable errors and a correlation ID; avoid raw model or Python stack traces in client responses.
- Long jobs return 202 Accepted with job ID; clients poll or subscribe using existing conventions.
- Use optimistic concurrency/version checks on reviewer edits and model activation.
- Limit pagination and never leak unrelated participant submissions.

## End-to-end review statuses

Submission: `submitted`, `processing`, `needs_review`, `accepted`, `rejected` (map to existing). OCR: `not_run`, `complete`, `partial`, `failed`. URL: `not_provided`, `unchecked`, `inaccessible`, `matched`, `mismatched`, `authorized_verified`, `needs_review`. These are orthogonal state machines, not one overloaded approval status.

## Duplicate detection

- Compare provider activity IDs when available, scoped by provider; retain normalized URL reference.
- Compare screenshot hashes and perceptual hashes with conservative thresholds; flag rather than auto-reject ambiguous matches.
- Check event-specific reuse rules; different events may legitimately use a single activity unless event rules prohibit it.

## Cross-field comparison

Normalize units, running time type (moving vs elapsed), date/timezone, pace units and rounding. Identify which value came from OCR, user correction, URL manual inspection or authorized API. A URL/source disagreement triggers review, never an automatic claim of fraud.
