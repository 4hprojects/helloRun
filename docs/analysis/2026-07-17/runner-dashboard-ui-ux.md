# Runner dashboard canonical journey audit

Date: July 17, 2026  
Surface: `/runner/dashboard`  
Primary audience: authenticated runners managing registrations, evidence, progress, and recognition

## Runner point of view

“Tell me which event needs me first, why it needs me, and the one action I should take. Keep my other active events visible without making me scan the same registration in several sections. Once that is clear, let me check progress, recent activity, recognition, and the rest of my runner tools.”

The redesigned dashboard makes one registration the canonical event journey. The primary card is selected from the same runner-state data used by My Registrations, owns the event CTA, and excludes that registration from the compact remaining-event list.

## Severity-ranked findings and resolution

| Severity | Finding | Runner impact | Implemented resolution |
| --- | --- | --- | --- |
| High | The hero, urgent alerts, next-action panel, upcoming card, and active-event cards could all represent the same registration. | Runners had to reconcile repeated status, deadline, and action messages before knowing what to do. | Select one canonical registration with a deterministic correction-to-upcoming priority and render one state-aware journey card. |
| High | Dashboard task priority was constructed separately from registration-management state. | The dashboard and My Registrations could describe the same payment, activity, deadline, or progress differently. | Build dashboard presentation from the shared runner event-progress cards and expose one normalized presentation object. |
| High | Rejected payment and rejected activity competed with generic event notices. | Corrective work was easy to miss and could block participation. | Prioritize rejected payment, rejected activity, unpaid registration, and urgent actionable deadlines before ordinary active states. |
| Medium | Completed, missed, cancelled, refunded, and unavailable records occupied active dashboard space. | Historical records diluted the current task scan. | Exclude history states from the active journey and link to the authoritative registration history. |
| Medium | Saved events, discovery, upcoming events, missed submissions, and registration progress repeated adjacent navigation and content. | The dashboard became a collection page instead of a useful starting point. | Replace expanded secondary panels with five compact runner-tool destinations and useful existing counts. |
| Medium | Performance, recent activity, and achievements used uneven vertical sections. | Supporting information pushed navigation far below the first event task. | Use a three-metric snapshot and a balanced two-column activity/achievement row that stacks on mobile. |
| Medium | The first-time banner and profile nudge relied on separate interface state. | New runners could receive several setup prompts at once. | Resolve one server-determined setup journey; profile completion appears only when it is the next useful task. |
| Low | Refresh responses replaced many unmounted legacy sections. | Refresh work was larger than necessary and could disturb focused or expanded controls. | Refresh only the canonical journey, snapshot, recent activity, and latest achievement, skipping a fragment while it owns focus or an open interaction. |

## Canonical priority and tie-breaking

The runner-data resolver selects the primary journey in this order:

1. Rejected payment proof.
2. Rejected activity.
3. Unpaid registration.
4. Urgent actionable submission deadline.
5. Ready activity submission.
6. Certificate ready.
7. Accumulated challenge in progress.
8. Payment or activity under review.
9. Upcoming confirmed registration.

Equal-priority records use the nearest submission deadline or event start, latest registration/activity update, and stable registration ID. A completed accumulated challenge remains actionable only when its certificate is ready; otherwise it moves to history.

## Responsive evidence

- [Desktop, 1440 px](assets/runner-dashboard-desktop.png)
- [Tablet, 768 px](assets/runner-dashboard-tablet.png)
- [Mobile, 390 px](assets/runner-dashboard-mobile.png)
- [Narrow mobile, 320 px](assets/runner-dashboard-mobile-320.png)

The captures use deterministic runner-safe fixtures and the production dashboard stylesheet. They exercise accumulated progress, a secondary active registration, summary metrics, recent activity, certificate recognition, and tool counts without using real runner data.

## Rationale

- The canonical journey remains the authoritative task presentation; the established header also exposes the same contextual action for immediate access.
- Account restriction remains the sole global alert because it affects every event. Event-level payment, result, and deadline states stay with their event.
- Official approved progress is visually distinct from pending distance, and the progress bar has a precise accessible label.
- Secondary registrations retain event identity, state, deadline or concise accumulated progress, and a details link without repeating full forms or all facts.
- Current Snapshot emphasizes active events, approved distance, and pending review. Completion, certificates, and points remain accessible as quieter linked metrics.
- Recent Activity and Latest Achievement preserve their existing certificate view, verification, sharing, and copy hooks.
- The dashboard remains server-rendered. JavaScript refresh is a progressive enhancement and does not own the state resolver.

## Acceptance criteria

- [x] The established dashboard hero remains state aware and restores its contextual event action beside My Registrations.
- [x] Account restriction is the only separate global alert.
- [x] One deterministic primary registration owns state, helper text, deadline, goal/mode, progress, and contextual action.
- [x] Payment rejection, result rejection, unpaid, urgent, ready, certificate, accumulated, review, and upcoming priorities are unit tested.
- [x] Deadline, recent activity, and registration ID provide deterministic tie-breaking.
- [x] The primary registration is excluded from compact remaining-event rows.
- [x] Completed and historical registrations are excluded from the active journey and linked through Registration History.
- [x] A no-registration runner receives one contextual setup journey; the local-storage welcome banner and separate profile nudge are absent.
- [x] The snapshot contains Active Events, Approved Distance, and Pending Review with subdued completion, certificate, and points links.
- [x] Recent Activity and Latest Achievement share one desktop row and stack on mobile.
- [x] Expanded Upcoming, Discover, Saved Events, and missed-submission panels are absent.
- [x] Runner tools link to Submission History, Achievements, Running Groups, Saved/Browse Events, and Registration History.
- [x] Refresh returns only mounted canonical fragments and preserves focused controls and open certificate/disclosure interactions.
- [x] Run-proof modal hooks, result-submission endpoint, and certificate actions remain compatible.
- [x] Controls meet 44px targets, keyboard focus is visible, reduced motion is respected, broken images fall back safely, and 320px does not scroll horizontally.
