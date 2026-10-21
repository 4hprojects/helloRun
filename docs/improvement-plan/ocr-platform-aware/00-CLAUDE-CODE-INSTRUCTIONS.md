# Claude Code: execution contract

> **Historical execution contract:** this governed the feature-branch implementation
> merged to `main` by October 19, 2026. Do not restart these phases from this checklist.
> Remaining deployment and rollout work is canonical in
> [ROADMAP](../../ROADMAP.md) (`REL-01`, `REL-03`).

## Non-negotiable order of work

1. Inspect the live checked-out HelloRun repository. Do not assume its language, framework, storage, auth, queue, hosting or existing OCR implementation.
2. Produce a Phase 0 architecture inventory and a gap analysis. Do not start large refactors until it is reviewed.
3. Create a dedicated feature branch following repo naming conventions, e.g. `feature/platform-aware-ocr`.
4. Implement phases in order. Small safe preparatory changes may be shared across phases but must be documented.
5. Stop after each phase, run tests, and present a completion report before proceeding if the operator requires phase-by-phase approval.
6. Never merge to production or deploy to production without explicit instruction.

## Before each change

- Locate relevant code, schema, routes, migrations and existing tests.
- Confirm whether a proposed dependency is already present. Prefer existing infrastructure.
- Check impact on submission/event flows, privacy, RBAC, SEO/public pages and app resource usage.
- Select minimum scope, including backwards-compatible migrations or feature flags.
- State uncertainties; no fabricated API provider availability, OCR accuracy or training success.

## Phase completion report template

```text
PHASE: number and title
BRANCH / COMMIT(S):
FILES ADDED / MODIFIED:
FUNCTIONAL BEHAVIOR:
API / DATA CHANGES:
MIGRATIONS / ROLLBACK:
SECURITY & PRIVACY CHECKS:
TESTS RUN (commands and results):
BASELINE OR MEASURED METRICS (real values only):
RESOURCES USED / LIMITS OBSERVED:
KNOWN ISSUES / BLOCKERS:
NEXT PHASE DEPENDENCIES:
READY FOR REVIEW: yes/no
```

## Engineering rules

- No duplicate training jobs if an admin double-clicks; API should accept idempotency keys.
- API authorizes actions server-side even if controls are hidden from unauthorized users.
- Async work must use durable queues, isolated workers, retry/backoff and observability.
- Never run costly training inside a synchronous HTTP request.
- Make dataset snapshots immutable once a training job starts.
- Version model binary, profile rules, test dataset and metrics independently.
- Do not promote a model on a better aggregate number alone. Verify platform-level regressions.
- All destructive actions (sample removal, model rollback, cancelling a job) must be audited.
- Preserve audit events but minimize sensitive payloads in logs.
- Use provider APIs only with appropriate authorization, scope and rate limiting.
- Users may submit screenshots without URL or recognized platform.
- Consider a feature flag and staged rollout for new OCR and URL checks.

## Repository-specific decisions to record

Actual backend framework, database, auth/RBAC, current OCR path, screenshot storage location, email provider, event verification rules, queue service, error-monitoring system, deployment method, CI/test commands, migration conventions, and supported runtime versions.

## Completion requirement

Deliver tested source changes, migrations, safe rollout/rollback steps, documentation, measured baseline and follow-up metrics, and a PR description. No automatic merge/deployment.
