# Active Quest: Master Implementation Plan

Version: 1.0 | Planning baseline: 2026-10-28 | Status: Approved for implementation planning, subject to repository audit

## Mission
Build a permanent monthly virtual accumulated-distance event series called **Active Quest** inside HelloRun. Use **Active Quest <Year>** for annual series and **<Month> Active Quest <Year>** for monthly editions. Reuse existing HelloRun events, registrations, submissions, OCR, review, leaderboard, badge, and certificate systems. Do not build a parallel event stack.

## Fixed business rules
- Organizer: HelloRun. Public event. Free registration. Asia/Manila timezone.
- Challenge begins local 00:00 on the first day and ends at 23:59:59.999 on the last day.
- Registration opens seven calendar days before the first day; closes on the 22nd of the event month at 23:59:59.999 local time. Existing registrants may continue to submit eligible activities after registration closes.
- Submission window ends on the 14th calendar day after the challenge month at 23:59:59.999 local time. Review target: three calendar days after submission deadline, not a guarantee. Recognition only after qualifying evidence is finalized.
- Distances: 25, 50, 75, 100, 150, 200 KM. Category identities remain stable. Monthly edition stores a snapshot of category and policy configuration.
- Allowed activities: walking, running, jogging, hiking, trail running, treadmill where eligible proof exists; minimum eligible activity distance 1 KM. Do not imply GPS proof exists for treadmill activities.
- One category per participant per edition. Overachieving doesn't upgrade category rewards. Approved distances count; pending do not.
- Screenshot-based submission requires screenshot; activity URL is optional. Unreachable URL is unverified, not an automatic rejection. Functional device integrations may submit via authenticated provider evidence; unavailable integrations visibly say Coming Soon. Conflicting evidence requires resolution before final submission, with audit trail.
- Digital category badge and finisher certificate only after completed approved target; no promise of unconfigured assets. Maintain participant privacy preferences in lists and leaderboards.
- Retain historical names and URLs, including Active Run and Active Quest events. Relate past editions to the series through explicit opt-in migration after audit, never silently rewrite.
- Auto-create drafts may be enabled later; automatic publication is disabled by default. Authorized human publishes after validation.

## Scope boundaries
In scope: series and template modeling, monthly draft generation, validated date/rules/content, publishing workflow, configurable rewards, public series page, analytics, long-term achievements, scheduler controls, auditability.
Out of scope for MVP: shipping new LLM/OCR models, real provider integrations, charging fees, auto-enrollment, migrating past event metadata, publicly enabling auto-publication, researching human subjects without approved methodology.

## Implementation sequence and gates
0. Audit repository and record verified behavior. Gate: architecture map and gaps approved.
1. Add versioned template and immutable edition configuration snapshots. Gate: schema, migration and tests.
2. Draft generation, slug uniqueness, deterministic dates. Gate: idempotent generator tested.
3. Rendering content from structured settings. Gate: no contradictory event copy.
4. Admin UI, authorization, prepublication checks. Gate: cannot publish broken draft.
5. Rewards configuration and issuance gating. Gate: all six assets present.
6. Public landing and archives. Gate: historical URLs preserved.
7. Program analytics, with privacy guardrails. Gate: reconciled against source events.
8. Multi-month achievements. Gate: correct re-evaluation/revocation behavior.
9. Scheduled drafts, disabled by default. Gate: duplicate-free recovery.
10. Optional publish automation, separately approved and feature-flagged. Gate: tested rollback.
11. November edition via existing admin UI as soon as possible; do not depend on phases 1–10.

## Architecture constraints
Do not assume exact MongoDB collection names or Express/EJS routes. Audit first. Persist UTC instants derived from Asia/Manila local-date business rules; use half-open query intervals (`>= start, < endExclusive`). Store template version, policy snapshot, generated-from identity, creator, editor, time stamps and audit event IDs. Avoid overwriting manually edited monthly event fields on re-generation.

## Rollout / safety
Use feature flags `activeQuestSeriesEnabled`, `activeQuestDraftGenerationEnabled`, `activeQuestSchedulerEnabled`, `activeQuestAutoPublishEnabled` (all new public or write behavior off initially). Deny access if missing flags/permissions. Stage, verify, enable limited admins, then public. Preserve existing event functionality and include rollback migration guidance.

## Definition of done
Monthly edition generated once, previewed, published with six valid categories and reward assets; approved activity proof accumulates correctly; prior months remain unchanged; scheduler and admin controls safe; automated tests and a manually validated November edition pass.

## Developer operating instructions
Implement **one phase per PR**. Begin each phase by inspecting repository conventions, confirming model/route names, and writing a short impact list. Do not claim tests passed without executing them. Never drop existing records or modify existing event URLs. Report changed files, migration/rollback steps, test commands/results, open risks and next gate.
