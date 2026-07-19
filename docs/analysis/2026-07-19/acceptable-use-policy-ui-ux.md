# Acceptable Use Policy UI/UX Audit

Date: 19 July 2026
Page: `/acceptable-use-policy`
Primary perspectives: runner, organizer, community contributor, visitor

## Runner and organizer POV

A runner needs to know whether an account, registration, payment, activity, comment, or message is fair before taking action. An organizer needs the same clarity for event claims, participant information, exported records, approvals, promotions, and communication. Both need to understand how a concern is reviewed and where to report it without exposing more sensitive data.

The previous page was a short legal list. It described prohibited conduct, but it did not connect rules to real HelloRun tasks, distinguish lower-risk correction from immediate safety intervention, or explain which reporting channel to use.

## Severity-ranked findings

| Severity | Finding | Runner or organizer impact | Resolution |
| --- | --- | --- | --- |
| High | Rules were organized as legal prohibitions rather than platform tasks. | Visitors had to infer how generic clauses applied to proof, payments, rankings, organizer claims, messages, and participant exports. | Added a task-oriented expected/not-allowed/response matrix before the complete policy. |
| High | Enforcement listed possible penalties without review context or proportionality. | A minor correctable mistake appeared equivalent to fraud, threats, or malware. | Added a five-stage review journey and explicit severity-based enforcement guidance. |
| High | The draft source was also the live file fallback. | Editing policy source could unintentionally change the public policy before admin publication. | Preserved the legacy copy in an immutable fallback and separated the corrected draft source. |
| Medium | Reporting was reduced to email addresses. | Visitors could send sensitive evidence to the wrong place or miss the existing reason-based blog reporting flow. | Mapped blog reports, Contact support, and emergency situations to their appropriate channels. |
| Medium | Policy metadata and navigation were embedded in content. | Version status, reading effort, and section discovery were unclear, especially on mobile. | Added presentation-owned metadata, reading time, print support, and server-rendered desktop/mobile contents. |
| Medium | Technical rules did not explain responsible stopping behavior. | A visitor might interpret “report vulnerabilities” as permission to continue testing. | Clarified that reporting grants no testing authorization or legal safe harbor. |

## Design rationale

- The rules matrix supports the first decision: what is expected for the task currently being performed.
- Neutral borders, icons, headings, and copy carry meaning without status-colored edge accents.
- The serious-risk notice is visible but restrained; it does not imply every policy concern is an emergency.
- The complete policy remains authoritative and readable at 68–72 characters per line.
- Existing blog reporting and Contact remain the operational channels, avoiding a competing moderation workflow.
- The current public copy is recorded as v1.0 without a notice; corrected v1.1 remains an unpublished review draft.

## Responsive verification

Capture references for final visual review:

- `screenshots/acceptable-use-policy-1440.png`: desktop matrix, review journey, reporting cards, sticky contents, and legal column.
- `screenshots/acceptable-use-policy-768.png`: responsive task cards and native contents transition.
- `screenshots/acceptable-use-policy-390.png`: compact single-column task and reporting flow.
- `screenshots/acceptable-use-policy-320.png`: shallow padding, readable policy text, and no horizontal overflow.

The page uses an accessible table on desktop and labeled cards below 780px. Controls retain a 44px target, contents remain available without JavaScript, print removes navigation and orientation modules, and reduced-motion preferences disable transitions.

## Acceptance criteria

- [x] One page `h1`, compact metadata header, reading time, and Print policy action.
- [x] Seven task areas explain expected use, prohibited use, and response or recovery.
- [x] Serious safety risks and proportionate enforcement are distinct and understandable.
- [x] Existing blog reports and Contact are the only platform reporting workflows introduced.
- [x] Server-generated, collision-safe anchors power desktop and mobile contents navigation.
- [x] Complete policy is readable in a `70ch` column with related policy links.
- [x] Legacy v1.0 fallback is separated from corrected draft source.
- [x] Draft preparation is idempotent, does not publish v1.1, and does not notify for baseline creation.
- [x] Future publication queues a deduplicated, non-blocking in-app notice.
- [x] No advertisements, run-proof modal, forced acceptance, or new abuse-report persistence.
