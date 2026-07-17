# How It Works connected journey audit

Date: July 17, 2026  
Surface: `/how-it-works`  
Primary audiences: runners joining events and organizers operating them

## Runner point of view

“I need to understand what I must do, what the organizer checks, and why my payment, activity, and result can show different statuses. Give me a short path I can follow, then let me continue to an event or my registrations.”

The redesigned page begins with a runner perspective anchor and follows one five-stage event lifecycle. At every stage, the runner instruction sits beside the corresponding organizer responsibility, so the next state is understandable without reading separate policy-style articles.

## Organizer point of view

“I need runners to submit the right evidence, but I also need a clear reminder of what I must publish, review, protect, and communicate. Payment approval and result approval cannot be treated as the same decision.”

The organizer receives equal space and a direct anchor into the first organizer lane. The lifecycle makes publishing complete rules, managing registration, explaining evidence, reviewing consistently, and exposing safe public results part of the same workflow.

## Severity-ranked findings and resolution

| Severity | Finding | User impact | Implemented resolution |
| --- | --- | --- | --- |
| High | The original page separated runner, organizer, payment, result, privacy, and recognition guidance into a long sequence of generic cards. | Users had to reconstruct the event lifecycle and could not tell what followed each action. | Replace the document with one five-stage lifecycle containing adjacent Stage, Runner, and Organizer columns. |
| High | Payment review and activity-proof review were described far apart. | A runner could reasonably assume that approved payment meant an official result, or that a pending result blocked registration. | Add a prominent two-check explanation immediately after the submission checklist and repeat the separation in the registration stage. |
| High | Runner and organizer next actions were static and did not account for existing access. | Returning users were sent toward discovery or signup instead of their current work. | Move rendering to the controller and deterministically resolve guest, runner, organizer, and administrator actions. |
| Medium | Seven runner steps and multiple standalone explainers repeated event-page rules. | The page became a second source of operational truth and increased time to comprehension. | Reduce the shared journey to Publish, Register, Complete, Review, and Recognize; keep event pages authoritative for dates and requirements. |
| Medium | Single-result and accumulated behavior appeared as disconnected sections. | Users could miss the one meaningful difference: one accepted result versus several approved activities contributing to a total. | Present both models in one balanced comparison immediately after the proof checklist. |
| Medium | Review outcomes did not provide an equally scannable action for every status. | Pending and rejected users had to search the page to decide whether to wait or correct proof. | Add compact Pending, Approved, Rejected, and Resubmission cards with explicit runner actions. |
| Medium | Proof mistakes, privacy, safety, standings, certificates, and badges consumed several full sections. | Important boundaries were diluted by page length. | Condense them into three guidance cards and link detailed policy questions to Privacy, Data Usage, FAQ, and Contact. |
| Low | The generic shared static-page stylesheet forced centered headings and large section spacing. | The information read like an article rather than an operational journey, especially on mobile. | Add a dedicated, scoped stylesheet with left-aligned icon headings, compact spacing, mobile lane labels, and 44px controls. |

## Responsive evidence

- [Guest desktop, 1440 px](assets/how-it-works-desktop.png)
- [Guest tablet, 768 px](assets/how-it-works-tablet.png)
- [Guest mobile, 390 px](assets/how-it-works-mobile.png)
- [Guest narrow mobile, 320 px](assets/how-it-works-mobile-320.png)

Desktop renders each stage as three columns: a compact stage marker and equal runner and organizer lanes. Tablet moves the stage marker above two retained lanes. Mobile stacks the stage marker, labeled Runner card, and labeled Organizer card in reading order. Perspective links, final actions, and all primary interactive targets remain at least 44px, and the layout does not depend on client-side state.

## Rationale

- One lifecycle demonstrates cause and effect more clearly than separate runner and organizer documents.
- The page teaches the platform workflow; each event page remains authoritative for dates, pricing, accepted activities, proof, ranking, and recognition.
- Payment evidence and activity evidence remain independent because they are separate records and review decisions.
- Pending submissions do not become official standings or accumulated progress until approval.
- Leaderboards, certificates, and badges are described conditionally because organizers control their availability and presentation.
- Proof privacy remains explicit: review files are not public unless a configured workflow deliberately publishes safe information.
- Anchors are native links, status content is server-rendered, and the page contains no tabs, advertisements, or proof-submission modal.

## Acceptance criteria

- [x] The page has one `h1`, compact orientation copy, and equal runner and organizer perspective actions.
- [x] Perspective actions work without JavaScript and target the first corresponding lane.
- [x] Virtual, on-site, hybrid, single-result, and accumulated-distance formats remain visible.
- [x] Five stages render in Stage, Runner, and Organizer columns on desktop.
- [x] Mobile stages stack with explicit Runner and Organizer labels.
- [x] The pre-submission checklist covers name, window, category, date, duration, source, and readable proof.
- [x] Payment approval and activity-proof approval are clearly distinguished.
- [x] Single-result and accumulated-distance behavior share one comparison module.
- [x] Pending, Approved, Rejected, and Resubmission states explain the runner’s next action.
- [x] Recognition is conditional on event settings and approved records.
- [x] Privacy, Data Usage, FAQ, and Contact routes remain directly available.
- [x] Guests, runners, organizers, and administrators receive deterministic next actions.
- [x] SEO describes virtual, on-site, hybrid, runner, and organizer workflows.
- [x] The page uses an isolated stylesheet and contains no ads, tabs, or run-proof modal.
- [x] Keyboard focus is visible, motion is reducible, controls meet 44px, and 320px has no horizontal page scrolling.
