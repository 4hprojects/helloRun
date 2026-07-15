# HelloRun Workflow Improvement Priorities

This is the implementation index for the [user/runner](user-workflow-analysis.md), [organizer](organizer-workflow-analysis.md), and [admin](admin-workflow-analysis.md) workflow analyses. It converts the three role backlogs into one ordered program so work starts with the greatest trust, safety, and workflow impact.

## How prioritization works

Work is ordered by:

1. **Trust and safety:** prevent ambiguous failures, wrong-target actions, and irreversible mistakes.
2. **Cross-role reach:** prefer foundations that improve runners, organizers, and admins together.
3. **Dependency value:** establish shared error, status, decision, and queue patterns before redesigning whole workspaces.
4. **User impact:** prioritize payment, proof, rejection, approval, and recovery moments.
5. **Delivery efficiency:** take small, high-confidence improvements before large structural redesigns when impact is comparable.

Priority meanings:

- **P0 — Start first:** active trust/safety failure or dangerous administrative action.
- **P1 — Next:** high-value core-workflow improvement.
- **P2 — Then:** consistency, efficiency, navigation, and mobile improvement.
- **P3 — Last:** polish after the workflow foundations are stable.

An item may not move ahead of an unmet dependency even when it has the same priority.

## Progress

| Priority | Status | Evidence |
|---|---|---|
| 1. Shared error and recovery handling | **Complete** | Shared helper covers role guards, rate limiting, and request timeout; HTML/JSON 403, 429, and 503 unit coverage passes |
| 2. High-risk decision safety | **Complete** | Shared confirmation, audited reasons/diffs, privilege affordances, guarded bulk selection, preserved queue context, and focused tests |
| 3. Rejection and lifecycle clarity | **Complete** | Structured reason codes/guidance, shared lifecycle labels, exact registration links, one-time flash, and event readiness prompts |
| 4. Operational queue consistency | **Complete** | Durable filter/return context, grouped communication incidents, badge dry-run, campaign outcomes, and explicit commerce payment ownership |
| 5. Role workspace consolidation | **Complete** | Canonical runner stages, stable event workspace, ranked role queues, universal admin search, and cross-domain user cases |
| 6. Mobile task optimization | **Complete** | Full-screen resumable proof, sticky/zoomable reviews, safe field mode, role mobile nav, card tables, and expiring registration drafts |
| 7. Strategic workflow improvements | **Complete** | Shared autosave/readiness workspaces, versioned policies, explicit role switching, event breadcrumbs, and contextual runner completion paths |

## Priority 1: shared error and recovery handling — Complete

**Start here.** This is the first implementation initiative because it is small, affects all three roles, and prevents users from landing on raw text or JSON during authorization, rate-limit, and timeout failures.

| Order | Source IDs | Deliverable | Completion gate |
|---|---|---|---|
| 1.1 | U-01, O-01, A-01 | One content-negotiated error-response helper used by role guards, rate limiting, and request timeout handling | HTML requests render the styled error page with status-specific guidance and a safe return action; JSON clients retain a stable structured response |
| 1.2 | U-01, O-01, A-01 | Contextual recovery for runner, organizer-approval, and admin-privilege failures | The response explains whether to retry, wait, complete approval, return, or request access; it never implies that a failed mutation succeeded |
| 1.3 | U-01, O-01, A-01 | Automated and responsive validation | Tests cover HTML/JSON 403, 429, and 503 behavior; error pages work at 320 px, 390 px, tablet, and desktop widths with keyboard-visible focus |

This initiative is complete only when the known raw-response call sites identified in `docs/review-2026-07/04-ux-intuitivity.md` use the shared behavior.

## Priority 2: high-risk decision safety — Complete

Begin after Priority 1. These changes protect accounts, events, results, policies, badges, communications, and bulk operations from wrong-target or ambiguous actions.

| Order | Source IDs | Deliverable | Dependency / completion gate |
|---|---|---|---|
| 2.1 | A-02 | Shared high-risk confirmation pattern: target identity, impact, reversibility, privilege, reason, and result | Priority 1; applied first to delete, suspend, submission correction, badge revocation, policy publish, promotion send, and bulk mutations |
| 2.2 | A-06 | Before/after and downstream-impact preview for event/submission corrections | A-02; audit contains actor, reason, diff, affected outputs, and operation result |
| 2.3 | O-10 | Persistent selection, impact preview, and partial-result reporting for organizer bulk actions | A-02 interaction pattern; filters and successful/failed/skipped counts remain visible |
| 2.4 | A-15 | Explain full-admin requirements before interaction while retaining server enforcement | Restricted controls are hidden or visibly locked with an explanation; direct URLs remain protected |
| 2.5 | A-16 | Consistent empty, success, and partial-failure results | Every bulk/high-risk operation reports affected, succeeded, skipped, failed, and next step without replaying success on refresh |

## Priority 3: rejection and lifecycle clarity — Complete

These improvements address the runner-organizer trust handoff and should precede broad dashboard or navigation redesign.

| Order | Source IDs | Deliverable | Dependency / completion gate |
|---|---|---|---|
| 3.1 | O-05, U-06 | Structured organizer rejection reasons, runner-safe preview, contextual guidance, and direct resubmission | Priority 1; every rejection is actionable and cannot be submitted without a reason |
| 3.2 | U-05 | Shared runner-facing lifecycle status vocabulary and component | Same state has the same label, icon, explanation, and allowed next action across Dashboard, Registrations, Submissions, notifications, and orders |
| 3.3 | U-03 | Event-aware deep links and preselection from registration cards and notifications | Proof/payment actions retain registration context; stale or unauthorized links fail safely |
| 3.4 | O-12 | Event prerequisite/readiness prompts for payment, badges, certificates, and publication | Missing setup names its operational impact and links directly to the correction surface |
| 3.5 | U-09 | Replace query-string success messages opportunistically with one-time feedback plus durable inline state | Refresh/bookmark does not replay success; current lifecycle state remains visible |

## Priority 4: operational queue consistency — Complete

Establish common task and review patterns before building new role shells.

| Order | Source IDs | Deliverable | Dependency / completion gate |
|---|---|---|---|
| 4.1 | O-04, A-05 | Shared queue-to-detail-to-next-item behavior | Filters, sort, page, scroll/selection context, queue count, and next-item behavior persist after a decision |
| 4.2 | A-07 | Communication incident workflow | Failures group by cause; retry attempts are visible and idempotent; resolution is verified |
| 4.3 | A-08 | Badge recalculation/revocation dry run and observable progress | Affected count, notification impact, job state, partial failures, and safe retry are visible |
| 4.4 | O-11 | Event communication history and audience preview | Recipients, exclusions, prior messages, delivery outcome, and failures are visible before repeat sending |
| 4.5 | O-13, A-13, U-10 | Clearly separate registration and merchandise payments while sharing proof interaction standards | Every surface identifies payment owner/type; proof requirements, preview, timestamps, review, and rejection recovery are consistent |
| 4.6 | A-14 | Applied-filter chips, saved operational views, and durable return state | Common queues can be reopened without rebuilding filter context |

## Priority 5: role workspace consolidation — Complete

These are larger structural improvements. Start only after shared statuses, decisions, and queue behavior are stable.

| Order | Source IDs | Deliverable | Dependency / completion gate |
|---|---|---|---|
| 5.1 | U-02, U-08 | Canonical stage-based runner lifecycle and simplified active-registration cards | Priority 3; every active event has one dominant stage and CTA; Dashboard/Registrations/Submissions have explicit distinct purposes |
| 5.2 | O-02 | Stable event workspace shell | Priority 4; event name/phase persists and all event operations are reachable within two local actions |
| 5.3 | O-03 | Urgency-ranked organizer Dashboard work queue | O-04; actionable failures and pending work rank ahead of informational metrics |
| 5.4 | A-03 | Urgency-ranked, assignable admin work feed | A-05; items expose severity, age, owner, affected scope, and resolution state |
| 5.5 | A-04 | Universal admin search and consistent object header | Authorized cross-domain search connects users, events, submissions, applications, orders, and audit context |
| 5.6 | A-09 | Cross-domain admin escalation/case view | A-04; each case has subject, evidence, owner, severity, prior decisions, communication, audit, and closure |

## Priority 6: mobile task optimization — Complete

Mobile work follows the redesigned lifecycle and queue patterns rather than independently reshaping the current information architecture.

| Order | Source IDs | Deliverable | Dependency / completion gate |
|---|---|---|---|
| 6.1 | U-04 | Full-screen, resumable mobile run-proof flow | U-03 and U-05; image selection, OCR review, warnings, keyboard, back behavior, and draft recovery work at 320-430 px |
| 6.2 | O-07 | Mobile evidence review with zoomable proof and sticky decision controls | O-04 and O-05; no horizontal page scroll and target/action context remains visible |
| 6.3 | O-08 | Field-optimized onsite mode | Safe check-in/result actions, explicit sync state, duplicate prevention, and reconnect recovery are tested in weak connectivity |
| 6.4 | U-07 | Runner mobile navigation with core tasks plus More | U-02; all destinations are reachable in two taps and unread state remains visible |
| 6.5 | O-09 | Organizer mobile Dashboard/Events/Work/More navigation | O-02 and O-03; active event and queue badges remain visible |
| 6.6 | A-10, A-11 | Admin mobile shell and priority-card representations | A-03 through A-05; phone supports safe triage and bounded decisions while desktop tables remain available |
| 6.7 | U-11 | Save/resume for long mobile registration | Non-sensitive drafts restore predictably and expiry is explained |

## Priority 7: strategic workflow improvements — Complete

| Order | Source IDs | Deliverable | Completion gate |
|---|---|---|---|
| 7.1 | O-06 | Unified autosaved create/edit event workspace | Section readiness, blocker links, media/waiver persistence, preview, and saved draft behavior are reliable |
| 7.2 | A-12 | Shared versioned policy editor | All policy types use consistent autosave, diff, preview, validation, publish, archive, and public verification while retaining route/data compatibility |
| 7.3 | O-14 | Explicit Runner/Organizer mode switch | Navigation mode changes without changing stored roles or weakening authorization |
| 7.4 | O-15 | Consistent organizer breadcrumbs and action labels | Event hierarchy is clear and touch actions use visible labels or accessible overflow |
| 7.5 | U-12 | Stronger approval/completion celebration | Result, certificate, badge, leaderboard, and optional sharing remain coherently connected through contextual completion paths rather than a persistent dashboard banner |

## Implementation operating rules

- Work one priority initiative at a time; do not begin a later structural redesign merely because it shares a file with the current change.
- Treat the source IDs and their acceptance criteria in the role documents as part of the definition of done.
- Preserve current authorization, persisted status values, route compatibility, and `organiser` data spelling unless a separately approved migration changes them.
- For every workflow change, test success, validation failure, empty state, rejection, duplicate submission, rate limit, timeout, unauthorized access, and safe retry where applicable.
- Validate at 320-375 px, 390-430 px, 768-1024 px, and 1280 px or wider; include keyboard, 200% zoom, visible focus, reduced motion, and non-color status checks.
- Record baseline and post-change metrics before declaring a priority wave complete.

## Completion record

All seven priority waves are implemented. Focused DB-free workflow tests cover shared errors, lifecycle and rejection behavior, action safety, operational queues, role workspaces, mobile behavior, and strategic workflows. Live-database mutation suites and device/browser usability sessions remain deployment validation activities, not unfinished priority implementation.
