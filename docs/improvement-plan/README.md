# HelloRun Improvement Plan Index

**Status:** Supporting plans for active ROADMAP tasks
**Last reconciled:** October 19, 2026
**Priority owner:** [ROADMAP.md](../ROADMAP.md)
**Delivery state:** [STATUS.md](../STATUS.md)

This directory contains the detailed analysis, implementation guidance, and
rollout procedures behind the canonical backlog. It is not a second priority
list. If an unchecked item here is still active, ROADMAP names its owning task
and phase.

## Active supporting plans

| Plan | Current role | ROADMAP owner |
|---|---|---|
| [Phase 0 — pre-deploy security](phase-0-pre-deploy-security.md) | Session regeneration, trusted client IP, and vendored third-party assets remain open; the original assessment also contains completed historical findings. | `SEC-01`–`SEC-03` |
| [Phase 1 — process safety net](phase-1-process-safety-net.md) | CI, dependency automation, and lint/format gates remain open. Safe remote-database guards, Node pinning, and graceful shutdown are already implemented. | `PRC-01` |
| [Phase 2 — environments and data safety](phase-2-environments-and-data-safety.md) | Staging, Redis/proxy verification, restore rehearsal, deferred integration suites, and controlled cleanup decisions. | `DEC-04`, `OPS-02`–`OPS-06` |
| [Phase 3 — efficiency](phase-3-efficiency.md) | Measurement-first request, OCR, asset, caching, and compression work. | `EFF-01`, `EFF-02` |
| [Phase 4 — intuitivity and UX](phase-4-intuitivity-ux.md) | Deployed, real-device, and cross-journey verification that remains after the October responsive pass. | `REL-05`, `REL-07`, `UX-01` |
| [Phase 5 — strategic debt](phase-5-strategic-debt.md) | CSP, organiser authorization, dependency majors, and externally constrained database cleanup. | `DEC-05`, `SEC-03`, `SEC-04`, `DEBT-02`, `DEBT-03` |
| [Platform-aware OCR](ocr-platform-aware/README.md) | Repository-complete and merged with flags off; legal, data, infrastructure, deployment, measurement, and rollback gates remain. | `DEC-06`, `REL-01`, `REL-03` |
| [UI and PWA follow-ups](ui-pwa-follow-ups.md) | Real-device install checks, staging-only responsive coverage, and custom-dialog consolidation. | `REL-05`, `UX-01` |
| [Event-promotion follow-ups](event-promotion-follow-ups.md) | Consent, audience, dispatch-state, safety-control, escaping, and route-coverage refinements. | `COM-01` |

## Reading older phase documents

The phase documents were written from July 2026 evidence and preserve their
original findings, estimates, and implementation sketches. Later code may have
closed individual findings without rewriting those historical sections. Use the
table above and ROADMAP for current state; use the phase document for rationale
and acceptance detail.

Repository completion does not imply deployment or live verification. Work
that needs production access, provider accounts, legal approval, destructive
data handling, or a non-production database stays blocked or verification
pending until its ROADMAP evidence is recorded.
