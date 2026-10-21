# Decisions, unresolved details and handoff

> **Historical decision record:** the implementation handoff below predates the merged
> Phases 0–6. Its open questions preserve context rather than define current tasks;
> unresolved owner, legal, deployment, and rollout gates are canonical in
> [ROADMAP](../../ROADMAP.md).

## Approved product decisions (2026-10-17)

- Keep the activity screenshot submission workflow.
- Add an **optional** original activity URL as secondary evidence.
- Prioritize Strava, COROS and Garmin Connect with a generic fallback for other/unknown sources.
- Detect source platform and layout before selecting image processing, field extraction and validation profile.
- Offer reviewer correction, duplicate/mismatch flags and an administrative sample approval process.
- Store OCR training-ready image crop + literal text ground truth after appropriate verification.
- Enable **manual** training only from `/admin/ocr-training`; training uses queue/isolated worker.
- Provide weekly configurable action-driven admin email reminders and job/event alerts.
- Require held-out evaluation, manual model approval, audited activation and rollback.
- Expose platform-specific analytics and de-identified evaluation reports useful for MIT capstone research.
- Preserve separate states for OCR, link comparison, reviewer decision and activity legitimacy.
- Work on a branch, report after each phase, and do not deploy until separately instructed.

## Pending technical decisions (Phase 0 owner/developer verification)

1. Which frameworks/database, OCR solution and queue already exist in HelloRun?
2. Which email sender/provider and admin recipient settings are in use?
3. Which platform screenshot variants and how many consented labeled images exist?
4. What are existing reviewer roles, event-scoped activity requirements and duplicate rules?
5. Where are images stored and what retention/consent terms govern model improvement?
6. What hosting resources, disk quotas and deployment mechanism are actually available?
7. Which provider API or share URL parsing use is lawful, permitted and technically reliable?
8. What day/time should weekly reminder digests run? (Timezone defaults to Asia/Manila.)
9. What dataset readiness rules and acceptable per-platform non-regression margins can the project owner approve after baseline results?

These are verification tasks, not license to invent missing values. Raise only genuine blockers; otherwise document a safe default or feature flag.

## Post-approval Claude Code execution prompt

```text
Implement the approved HelloRun platform-aware OCR and activity verification plan from this documentation package. Start by reading README.md and 00-CLAUDE-CODE-INSTRUCTIONS.md, then execute Phase 0 discovery against the actual checked-out repository. Do not assume the stack, prior OCR, Redis, mail provider or training service exists. Produce the architecture inventory, gap analysis, initial baseline and revised technical approach before large code changes. Use a dedicated feature branch. Implement and test phases only after prerequisites are met, reporting files changed, tests run, resource impacts, known issues and pending decisions at the end of each phase. Keep screenshot-only activity submissions supported, make activity URLs optional, and require manual training plus separately approved production model activation. Do not merge or deploy without explicit authorization.
```

## Final acceptance sign-off checklist

- [ ] Phase 0 source audit complete, assumptions reconciled
- [ ] Existing submissions regression tested
- [ ] Platform-aware profiles and generic fallback validated
- [ ] Optional activity URL validated safely without arbitrary network fetches
- [ ] Reviewer verification and activity corrections audited
- [ ] Ground truth samples correctly paired, dataset splits leak-free
- [ ] Training worker and resource guardrails proven
- [ ] Candidate metrics measured on holdout; per-platform comparison reviewed
- [ ] Model activation and rollback proven in staging
- [ ] Admin email reminders opt-in/preferences, dedupe and failures tested
- [ ] Security, privacy, RBAC and data retention tested
- [ ] Research reports reproducible and privacy-minimized
- [ ] Owner grants separate authorization for merge/deployment
