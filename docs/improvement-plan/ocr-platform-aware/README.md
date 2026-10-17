# HelloRun Platform-Aware OCR and Activity Verification

Status: APPROVED FUNCTIONAL PLAN. Phases 0–6 implemented on `feature/platform-aware-ocr-training`, not merged or deployed; data-dependent gates open. Progress: [IMPLEMENTATION-PROGRESS.md](IMPLEMENTATION-PROGRESS.md) · Deploy: [DEPLOYMENT-AND-ROLLBACK.md](DEPLOYMENT-AND-ROLLBACK.md)  
Plan version: 1.0  
Approved: 2026-10-17  
Audience: Claude Code, maintainers, reviewers, and research stakeholders

## Mission

Extend the existing HelloRun application to process running-activity screenshots with source-aware Tesseract OCR, optional activity URLs, reliable human verification, reusable ground truth, manually initiated model training, administrative email reminders, versioned model activation/rollback, and measurable evaluation. Preserve existing submission, event, and proof-review behavior.

## Start here

1. Read `00-CLAUDE-CODE-INSTRUCTIONS.md` for operating rules and required reports.
2. Execute `01-PHASE-0-DISCOVERY.md` before changing production code. Existing architecture is **not verified**.
3. Reconcile discovery findings against `02-ARCHITECTURE-AND-DATA.md` and `03-API-UI-AND-WORKFLOWS.md`.
4. Implement the independently reviewable phases in `04-IMPLEMENTATION-ROADMAP.md`.
5. Use `05-SECURITY-PRIVACY-OPERATIONS.md` and `06-TESTING-AND-RESEARCH.md` as mandatory release gates.
6. Follow `07-TRAINING-AND-PROFILE-SPEC.md` for OCR and fine-tuning particulars.
7. Use `08-NOTIFICATIONS-AND-SCHEDULING.md` for admin email behaviors.
9. Use `09-DECISION-LOG-AND-HANDOFF.md` for decisions, assumptions, and handoff checklists.

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

User approval of this plan authorizes creation of the implementation specification, **not immediate deployment** or irreversible production changes. Work on a feature branch, commit in small reviewable units, and require a separate merge/deploy decision.
