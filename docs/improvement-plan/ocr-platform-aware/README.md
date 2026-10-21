# HelloRun Platform-Aware OCR and Activity Verification

Status: **Implemented and repository-verified on `main`; production/live
verification pending.** Phases 0–6 and the notice-and-objection/backfill
follow-up are merged at `0c1fd86`. Every feature flag defaults off; the legal,
data, infrastructure, measurement, deployment, and rollback gates remain open.
Progress: [IMPLEMENTATION-PROGRESS.md](IMPLEMENTATION-PROGRESS.md) · Deploy:
[DEPLOYMENT-AND-ROLLBACK.md](DEPLOYMENT-AND-ROLLBACK.md) · Priority:
[`DEC-06`, `REL-01`, and `REL-03`](../../ROADMAP.md)
Plan version: 1.0  
Approved: 2026-10-17  
Audience: Claude Code, maintainers, reviewers, and research stakeholders

## Mission

Extend the existing HelloRun application to process running-activity screenshots with source-aware Tesseract OCR, optional activity URLs, reliable human verification, reusable ground truth, manually initiated model training, administrative email reminders, versioned model activation/rollback, and measurable evaluation. Preserve existing submission, event, and proof-review behavior.

## Start here

1. Read [IMPLEMENTATION-PROGRESS.md](IMPLEMENTATION-PROGRESS.md) for the
   implemented architecture, tests, measurements, and unresolved gates.
2. Follow [DEPLOYMENT-AND-ROLLBACK.md](DEPLOYMENT-AND-ROLLBACK.md) for the
   flags-off deploy, policy/data prerequisites, staged rollout, monitoring, and
   rollback sequence.
3. Use documents `02`–`09` as the approved design and acceptance reference.
   `00` and `01` preserve the instructions and discovery work that produced the
   implementation; do not restart those phases.
4. Use [ROADMAP.md](../../ROADMAP.md) for priority and dependency decisions.

## Principles and non-goals

- A screenshot is OCR evidence, not automatic proof of genuine activity.
- A supplied activity URL is optional corroboration, not proof of ownership or authenticity.
- A corrected activity field is **not** automatically a Tesseract training label. Training requires verified image/transcription pairs.
- No user submission triggers model retraining. An authorized admin starts each training run.
- No candidate model reaches production without explicit authorized approval and evaluation.
- Never fabricate screenshots, metrics, baseline results, integrations, provider permissions, or completed tests.
- Reuse the current HelloRun stack and patterns where reasonable. Node.js/Python/Redis/MongoDB mentioned in the proposal are proposed, **not verified existing dependencies**.
- Do not implement scraping that violates provider terms or makes arbitrary URL fetches.
- No live secrets, personal screenshots, model binaries, or downloaded training data in Git.
- These specifications are implementation guidance. If a source-code constraint conflicts with a proposed design, document the discrepancy before making changes.

## Proposed routes

`/admin/ocr-training`, `/admin/ocr-training/samples`, `/admin/ocr-training/platforms`, `/admin/ocr-training/jobs`, `/admin/ocr-training/models`, `/admin/ocr-training/analytics`, `/admin/ocr-training/settings`.

## Definition of success

Baseline measurements exist; platform-aware extraction and generic fallback work; optional URL does not block submission; reviewer decisions are traceable; training crops have verifiable ground truth; manual jobs are recoverable; production model stays stable through failures; activation and rollback are auditable; reminders do not duplicate; existing submission functionality passes regression tests; research exports protect privacy.

## Initial effort estimate (not a commitment)

Phase 0: 2–4 developer-days; phase 1: 5–10; phase 2: 4–8; phase 3: 5–10; phase 4: 6–12; phase 5: 4–8; phase 6: 5–10. Total **31–62 developer-days**, excluding time spent waiting to accumulate a sufficient, representative dataset or obtain external provider access. Revise after discovery.

## Approval boundaries

The implementation has been merged. That merge does **not** authorize deployment,
policy publication, production backfill, host package installation, feature-flag
enablement, or model activation. Those actions retain the separate approvals and
gates in the deployment runbook.
