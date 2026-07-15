# Organizer Workflow and Mobile UX Analysis

> Code- and documentation-based expert review of the live HelloRun organizer experience as of July 2026. The persisted role value uses British `organiser`; product copy and `/organizer/*` URLs generally use American `organizer`. This review preserves that compatibility boundary.

Implementation order is maintained in the [cross-role priority index](README.md).

## 1. Role definition and experience goals

Organizers are small-to-medium community event operators. Their core job is to turn an event idea into a trustworthy participant experience while keeping queues, payments, proofs, results, and communications under control:

`qualify -> create -> publish -> acquire -> verify -> operate -> review -> close out`

They need operational clarity without enterprise complexity. The experience should emphasize workload and exceptions, make risky actions deliberate, support repetitive review efficiently, and preserve a clear audit trail.

### Permissions and boundaries

- An organizer account must complete a profile/application and receive approval before unrestricted event creation and management.
- `requireCanCreateEvents`, ownership middleware, and event access middleware protect event-scoped operations.
- Organizers manage only events they own or have explicitly authorized access to; admins can enter some shared review/event surfaces with elevated context.
- Organizers decide event payment and run-proof outcomes, issue/publish event outputs through supported flows, communicate with registrants, and manage event-specific commerce.
- Full platform controls, cross-organizer user administration, policy publishing, and platform shop settings remain admin-only.
- An organizer can also be a runner, but the primary navigation prioritizes organizer mode and hides the runner-specific bottom navigation and runner links.

## 2. Current information architecture

### Navigation model

Approved and pending organizers receive a single global Dashboard entry in the shared header. Organizer tasks then branch through Dashboard, My Events, individual event detail/management pages, and local header actions. Unlike runners, organizers receive no role-specific mobile bottom navigation (`src/views/layouts/nav.ejs`).

### Operational hierarchy

```text
Organizer Dashboard
  +-- Application status / profile readiness
  +-- Create event
  +-- My Events
       +-- Event overview and settings
       +-- Registrants
       |    +-- Payment review
       |    +-- Run-proof review
       +-- Badges and certificate setup
       +-- Audit history
       +-- Promotion
       +-- Onsite operations / results
       +-- Event shop / orders / reports
```

### Information-architecture finding

The event is an appropriate organizing object, but queues are reachable through multiple event-local surfaces and the Dashboard. Page headers frequently contain icon-only or tightly packed actions for Back to Event, My Events, Registrants, exports, reviews, and Admin Dashboard. This preserves access but creates a learned, page-specific navigation grammar—especially on mobile.

## 3. Current-state workflows

### 3.1 Signup, profile completion, and application approval

```text
Choose organizer role at signup
  -> verify email
  -> complete organizer profile and upload verification documents
  -> submit application
  -> dashboard/application status
     -> pending / under review: view or edit allowed fields
     -> rejected: review reason, edit, resubmit
     -> approved: event creation and management unlocked
```

The Organizer Dashboard is the post-login landing surface even before approval, with application state and next actions available. Verification documents are treated as confidential and purged after verification according to the product changelog.

**Strengths:** the workflow supports editable pending/under-review/rejected applications; approval gates are explicit; status remains accessible without forcing the organizer onto an isolated status page.

**Friction:** the difference between organizer account, approved organizer, and permission to create events is conceptually subtle. A generic 403 can still replace a useful explanation when a guarded link is reached. The application’s wait state needs clear ownership, expected next action, last update, and resubmission history to maintain confidence.

### 3.2 Dashboard triage

Dashboard aggregates event counts, registration/payment/submission metrics, recent events, pending work, trend data, and shortcuts. It also handles the event-creation acknowledgement/terms gate.

**Strengths:** operational counts and queue shortcuts give organizers a starting point; responsive CSS provides phone, tablet, reduced-motion, and event-creation modal handling.

**Friction:** dashboard metrics, analytics, event lists, setup prompts, and queues compete for attention. Counts answer “how much,” but the most urgent “what must I do next?” is distributed across cards. A first-time organizer and an experienced operator see the same conceptual surface despite very different needs.

### 3.3 Event creation, readiness, preview, and publication

The live event-creation route family supports new and cloned events, readiness checks, preview, media uploads, waiver content, payment configuration, participation modes, event dates, distances/categories, and final creation. A creation acknowledgement must be accepted before access.

```text
Dashboard / My Events -> Create Event
  -> accept creation responsibilities if first use
  -> configure event identity, modes, dates, registration, payment,
     rules/waiver, media, categories and operational details
  -> readiness validation
  -> preview
  -> correct blockers/warnings
  -> create
  -> My Events / event record
  -> admin approval/public lifecycle where applicable
```

**Strengths:** preview and readiness are explicit, a clone path reduces repeated setup, nontechnical rich waiver editing is available, and media handling is integrated.

**Friction:** this is a large configuration workflow with dependencies across dates, participation modes, fees, proof windows, certificates, and onsite behavior. A long page or wizard can still make prerequisites, optionality, and draft completeness difficult to judge. Preview and readiness use POST/GET variants that are technically sound but should feel like one continuous workspace. Loss of scroll position or uploaded-file state on validation is particularly costly on mobile.

### 3.4 Event portfolio and event management

My Events provides organizer-owned event filtering/listing. Event detail becomes the control center for edit, status/media management, public page, registrants, badges, certificate setup, audit, promotion, onsite operations, and shop.

**Friction:** navigation is mostly action collections rather than a stable event workspace. Similar concepts appear as “event details,” “manage,” “edit,” and local back actions. The organizer must repeatedly reconstruct where they are in the event hierarchy. Destructive or state-changing actions such as publish/archive/delete/media removal require consistent impact previews and confirmation patterns.

### 3.5 Registrants and payment review

The registrants view supports search, multiple filters, configurable columns, pagination, CSV/XLSX exports, email to unpaid runners, payment actions, result actions, and drill-down. A dedicated payment-proof review queue supports filter/reset, pagination, individual approval/rejection, and bulk approval.

```text
Event -> Registrants / Payment queue
  -> filter pending payment proofs
  -> inspect runner, registration, amount, receipt and context
  -> approve selected/individual OR reject with reason
  -> runner notification and state transition
  -> next queued item / filtered queue
```

**Strengths:** dedicated queue and bulk approval reduce repetitive work; rejection is explicit; exports and email-unpaid actions support off-platform operations; column selection helps desktop density.

**Friction:** a desktop table with configurable columns does not translate naturally to a phone. Row actions, proof inspection, selection checkboxes, filters, exports, and pagination compete. Bulk selection carries high risk if context disappears while scrolling. The registrants page also mixes payment, registration, and result operations, which can obscure the current queue goal.

### 3.6 Run-proof review and decision

Dedicated run-proof queues and submission-review detail expose activity proof, runner-entered values, OCR/source data, mismatch and suspicious-review signals, runner context, event rules, and approval/rejection controls. Accumulated challenges support activity-level decisions and progress.

```text
Dashboard / Event -> pending run proofs
  -> apply event/status/risk filters
  -> open review
  -> compare proof, submitted metrics, OCR/Strava data, identity and event rules
  -> approve (possibly confirm official values)
     OR reject with runner-actionable reason
  -> audit/notification/certificate-result consequences
  -> next item
```

**Strengths:** reviewer-only detail can expose risk signals while runner copy stays neutral; proof, extracted values, submitted values, and context are visible; the approval modal and rejection flow make decisions deliberate.

**Friction:** cognitive load is high because the reviewer must compare several truth sources and infer which discrepancy matters. Approval/rejection may send the reviewer back to a queue rather than guarantee an uninterrupted “next item” rhythm. Free-text rejection can be inconsistent. On a phone, proof zooming and data comparison compete with fixed action space.

### 3.7 Communications and participant support

Organizers can contact or email relevant participant groups through event workflows, including unpaid-runner outreach. Runners can contact the organizer from the public event page. Delivery reliability and global communication retry tooling are primarily admin concerns.

**Friction:** communication is attached to individual operational screens rather than a unified event communication history. Before sending a bulk message, the organizer needs a reliable audience preview, exclusion rules, send count, and result. The runner’s incoming question should preserve event/registration context.

### 3.8 Badges, certificates, promotion, audit, and reports

- Event badges can be configured, enabled, and supplied with images; global badge definitions remain admin-controlled.
- Certificate setup configures event templates and supports the approval-to-certificate outcome.
- Promotion supports campaign setup, quota visibility, preview, and campaign history.
- Event audit records provide decision traceability.
- Event and shop reports/exports support operational reconciliation.

**Friction:** these are lifecycle-dependent features but can appear as parallel management destinations. The system should state prerequisite order: for example, certificate setup should be completed before approvals start. Audit is valuable for disputes but should link directly back to the affected registration/submission and explain actor, before/after state, and reason.

### 3.9 Onsite operations

Live JSON route families support bib assignment and QR generation/decoding, check-in recording and dashboard polling, race-kit creation, result-import logging, onsite result recording, and onsite result approval. The richer file mapping/validation/publish UI described in `docs/PRD.md` remains draft work and is not treated here as a live organizer screen. Hybrid events must keep virtual proof review and onsite result operations distinct while producing coherent public outcomes.

**Friction:** onsite work is especially mobile and time sensitive. Network quality, gloves/sunlight, queues of people, and rapid correction create requirements different from dashboard administration. Current web navigation and table patterns may be responsive but are not equivalent to a field-optimized workflow. Imported data failures need row-level correction, safe retry, and publish gating.

### 3.10 Event shop and orders

Event-scoped shop routes support product creation/editing, variants, order queues, fulfillment, payment review, dashboard, and reports. Platform administrators retain approval/oversight capabilities.

**Friction:** shop inventory, payment proof, fulfillment, and reporting add a second operational lifecycle alongside event participation. The event workspace needs distinct queue badges and terminology so merchandise payments are never confused with registration payments. Mobile fulfillment should favor scan/action cards over wide order tables.

### 3.11 Organizer-as-runner transition

The data model supports dual-role participation, but navigation branches on role and does not expose runner Dashboard, Submitted Entries, Notifications, or runner bottom navigation to organizers. My Registrations remains globally visible, offering partial runner access.

**Friction:** an organizer registering for another event can lose the expected runner lifecycle tools or be unsure which mode they occupy. This is a discoverability problem, not an authorization reason to merge roles.

## 4. Cross-role handoffs and operational risks

| Handoff | Organizer decision/support need | Risk | Required safeguard |
|---|---|---|---|
| Admin -> organizer application | Understand decision and permitted next step | Approval gate looks like broken access | Status-specific dashboard CTA and audit history |
| Organizer -> admin event approval | Know readiness and review state | Rework after long configuration | Preflight checklist, blockers vs warnings, review feedback |
| Runner -> organizer payment proof | Verify against event payment terms | Wrong receipt, duplicate, unreadable proof, bulk mistake | Context-rich review, duplicate hints, reasoned rejection, confirmation for bulk action |
| Runner -> organizer run proof | Compare evidence fairly | OCR mismatch over-trusted or reviewer inconsistency | Evidence hierarchy, structured reasons, calibrated risk signals |
| Organizer -> runner decision | Explain outcome and next action | Free-text reason is vague or accusatory | Runner-safe reason templates plus optional detail |
| Organizer -> admin escalation | Resolve exceptional/disputed cases | Context lost across screens | Escalation package containing event, runner, evidence, decisions, and audit |
| Organizer -> public result | Publish accurate final state | Premature publication/certificate issuance | Readiness summary, impact preview, reversible draft before publish |

Every mutation should define loading, duplicate-submit, partial-failure, unauthorized, rate-limit, timeout, and post-success behavior. Bulk operations must report selected, succeeded, skipped, and failed counts without losing the working filter.

## 5. Mobile UI/UX assessment

### Existing strengths

- Organizer Dashboard styles include breakpoints at 1024, 768, 640, 480, and 360 px plus reduced-motion support.
- Event/registrant/review layouts include extensive responsive grid collapse and mobile action sizing.
- Creation, event management, review queues, and modals have explicit phone layouts.
- Review tools provide semantic labels and some accessible confirmation/dialog behavior.

### Systemic mobile risks

| Dimension | Finding | Direction |
|---|---|---|
| Navigation | No persistent organizer mobile navigation; page-local back/actions vary | Introduce an organizer shell with Home, Events, Work Queue, and More; keep event context visible |
| Queue triage | Tables, filters, bulk actions, and pagination are desktop-shaped | Default to task cards on phones, with compact filters and persistent queue position |
| Evidence review | Proof image and comparison data cannot be comfortably seen together | Full-screen review with zoomable evidence, segmented details, and sticky decision bar |
| Event creation | Long configuration and media uploads are interruption-prone | Save drafts automatically, show section readiness, and use sticky Previous/Next/Save |
| Field operations | Responsive admin pages are not optimized for check-in speed or weak connectivity | Provide large-target field mode, optimistic/local queueing only where safe, and explicit sync state |
| Bulk actions | Selection context may be offscreen | Sticky selection summary, impact preview, secondary confirmation, and partial-result report |
| Icon controls | Tooltips are unavailable on touch; several headers use icon-dense controls | Keep visible short labels or accessible overflow menus on phones |
| Feedback | Redirect/query feedback and raw errors interrupt repetitive work | Preserve filters/scroll/queue position and display durable inline operation results |

### Breakpoint validation matrix

| Viewport | Required behavior |
|---|---|
| Compact phone: 320-375 px | No icon-only mystery actions; one dominant queue action; proof can zoom without page zoom; sticky actions clear safe area |
| Standard phone: 390-430 px | Filters fit a bottom sheet; review decisions remain visible; event identity and queue position persist |
| Tablet: 768-1024 px | Split evidence/detail review is usable; tables do not hide critical actions; creation sections use space efficiently |
| Desktop: 1280 px+ | Dense queues retain scanning speed, keyboard support, column controls, and bulk operations |

## 6. Proposed ideal-state workflows

### Organizer command center

1. Dashboard opens with **Needs attention**, ordered by operational urgency: failed actions, payment proofs, run proofs, approaching deadlines, participant questions, and setup blockers.
2. Secondary analytics and portfolio health follow the task queue rather than competing above it.
3. Every queue opens in a consistent review shell that preserves event, filters, total/remaining count, and next-item navigation.

### Event workspace

1. Use a stable event-level shell: Overview, Setup, Participants, Reviews, Results, Communications, Shop, Reports, and More.
2. Show event phase and readiness at all times; surface only actions valid in that phase.
3. Treat create/edit as the same draft workspace with autosave, section completeness, preview, and explicit publish/submit-for-review.
4. Make prerequisites visible—for example, payment setup before registration opens and certificate setup before result approval.

### Review workspace

1. Queue filters select the work cohort.
2. Review detail places original evidence first, normalized comparison second, and risk signals third.
3. Approval uses safe defaults; rejection begins with a structured runner-facing reason and permits reviewer detail.
4. After the decision, show a brief undo/escalation affordance where policy permits and advance to the next item while retaining filters.
5. Bulk actions are limited to low-risk homogeneous cases and always preview impact.

### Mode switching

Add an explicit Runner mode / Organizer mode switch for dual-role accounts. It changes navigation and landing context, not permissions or persisted role values.

## 7. Prioritized recommendations

Priority meanings: **P0** critical blocker/trust failure, **P1** high-value workflow improvement, **P2** consistency/efficiency improvement, **P3** polish. Effort is relative: S, M, L.

| ID | Priority / effort | Recommendation and affected surfaces | Rationale | Acceptance criteria |
|---|---|---|---|---|
| O-01 | P0 / S | Render role/approval/rate-limit/timeout failures in the shared error view with organizer-specific recovery | A raw denial makes a valid approval gate look like a broken product | Guard failures explain required status, retain event/dashboard return path, and preserve JSON behavior for APIs |
| O-02 | P1 / L | Introduce a stable event workspace navigation shell | Current local header actions create inconsistent wayfinding | All event operations are reachable within two event-local actions; event name/phase persists; mobile uses labeled tabs/overflow without clipping |
| O-03 | P1 / L | Make Dashboard an urgency-ranked work queue | Metrics do not reliably answer what to do next | Pending counts link to prefiltered queues; overdue/failure states sort first; zero states suggest relevant setup or monitoring action |
| O-04 | P1 / M | Standardize payment and run-proof queue/review shells | Repetitive operations use different navigation and decision rhythms | Filters, queue count, evidence, decision actions, keyboard shortcuts, and next-item behavior are consistent; filter/scroll state survives decisions |
| O-05 | P1 / M | Add structured rejection reasons with runner-safe copy | Free text causes inconsistent recovery and trust | Reviewer selects a reason, sees runner preview, may add detail, and cannot submit an empty/non-actionable rejection |
| O-06 | P1 / L | Unify create/edit into autosaved section-based event setup | Long configuration is interruption- and validation-prone | Draft state and section completeness persist; blockers link to fields; preview reflects saved draft; media/waiver state survives validation |
| O-07 | P1 / M | Build mobile evidence review with sticky decisions and proof zoom | Current comparison density is poorly suited to phones | On 360-430 px, proof, values, reasons, and decision controls are usable without horizontal page scroll; destructive actions require confirmation |
| O-08 | P1 / M | Add a field-optimized onsite operations mode | Event-day use prioritizes speed, clarity, and connectivity | Check-in/result tasks have 44x44 px targets, search/scan/manual fallback, explicit sync state, duplicate prevention, and recovery after reconnect |
| O-09 | P2 / M | Add organizer mobile primary navigation | Hamburger/local actions increase navigation cost | Dashboard, Events, Work, and More are reachable in one tap; active event context and queue badges are visible |
| O-10 | P2 / M | Safeguard bulk actions with persistent selection and partial-result reporting | Offscreen selection can produce costly errors | Selection count/audience stays visible; confirmation summarizes impact; result lists success/skipped/failed and retains filters |
| O-11 | P2 / M | Create an event communication history and audience preview | Messages are fragmented across operational pages | Organizer sees recipient rules/count, template/subject, send status, failures, and prior event messages before resending |
| O-12 | P2 / S | Add prerequisite/readiness prompts for badges, certificates, payments, and publication | Parallel tools hide lifecycle dependencies | Event overview names incomplete prerequisites, their impact, and direct fix action; valid existing flows remain available |
| O-13 | P2 / M | Separate registration-payment and merchandise-payment queue language | Similar proof workflows can be confused | Page title, event/order identity, filters, notifications, and audit entries always identify payment type |
| O-14 | P2 / M | Add explicit Runner/Organizer mode switching | Dual-role access is supported but poorly surfaced | Organizer can enter runner navigation in one action and return without reauthentication; authorization and role storage are unchanged |
| O-15 | P3 / S | Normalize event-page back/breadcrumb/action labels | Icon-dense local headers require memorization | Touch layouts use visible labels/overflow; desktop tooltips are supplemental; breadcrumb reflects Dashboard > Event > Task |

## 8. Delivery roadmap

### Phase 1: immediate usability and safety

Implement O-01, O-05, O-10, O-12, and O-15. These reduce decision risk and clarify recovery without changing the event or authorization model.

### Phase 2: workflow consolidation

Implement O-02, O-03, O-04, O-11, and O-13. Establish the common workspace and queue patterns before deeper mobile redesign.

### Phase 3: mobile optimization

Implement O-07, O-08, and O-09. Validate with real event-day scenarios, sunlight/large-text settings, camera/gallery usage, weak connectivity, and one-handed operation.

### Phase 4: strategic improvements

Implement O-06 and O-14. Measure configuration time, review throughput, and dual-role task success before expanding automation.

## 9. Success metrics and validation scenarios

### Suggested metrics

- Organizer application completion, resubmission, approval time, and approval-gate support contacts.
- Time to first valid event preview and first publishable event; validation errors per setup section.
- Percentage of events with payment/certificate/badge prerequisites completed before registrations or reviews begin.
- Median payment- and run-proof decision time, decisions per session, and queue abandonment.
- Rejection reason distribution and runner successful-resubmission rate by reason.
- Bulk-action correction/reversal and partial-failure rates.
- Time to locate a specific registrant and resolve their issue on phone/tablet/desktop.
- Onsite check-in/result throughput, duplicate prevention rate, and reconnect recovery success.
- Communication delivery/failure/retry rates and repeated-send incidents.

### Usability scenarios

1. A new organizer submits an application, understands the pending state, corrects a rejection, and confirms approval capabilities.
2. On a phone, an organizer creates a hybrid paid event, leaves midway, resumes, resolves readiness blockers, previews, and submits/publishes.
3. An organizer filters 50 payment proofs, safely bulk-approves homogeneous receipts, rejects one with actionable feedback, and verifies partial results.
4. On a 390 px phone, an organizer compares an activity screenshot with OCR values, rejects it, and proceeds to the next item without losing filters.
5. An organizer sets certificate/badge prerequisites before approving a result and verifies the runner receives the outputs.
6. At an onsite venue with intermittent connectivity, staff locate a runner, prevent duplicate check-in, and recover a queued action.
7. An organizer fulfills a merchandise order without mistaking its payment proof for event registration payment.
8. A dual-role organizer switches to runner mode, submits proof for another organizer’s event, and returns to their work queue.

## 10. Evidence and coverage map

- Role, approval, and event access: `src/middleware/auth.middleware.js`, `src/middleware/role.middleware.js`, `src/middleware/organizer-event-access.middleware.js`.
- Application/profile: `src/routes/organiser/profile.js`, organizer profile/status views.
- Dashboard: `src/routes/organiser/dashboard.js`, `src/views/organizer/dashboard.ejs`, `organizer-dashboard.css`.
- Creation/readiness/preview: `src/routes/organiser/event-creation.js`, create/edit event views and `create-event.css`.
- Event management, badges, audit, certificates, promotion: `src/routes/organiser/event-management.js`, related organizer views.
- Registrants/payment/review: `src/routes/organiser/registrants.js`, `review.js`, registrant and review views, `organizer-events.css`.
- Onsite operations: `src/routes/organiser/onsite-operations.js`, QR/dashboard route families, supporting services/views.
- Event commerce: `src/routes/organizer-shop.routes.js`, `src/controllers/organizer-shop.controller.js`, organizer shop views.
- Shared navigation and mobile asymmetry: `src/views/layouts/nav.ejs`, `src/public/css/mobile-nav.css`.
- Product lifecycle and planned/live distinctions: `PRODUCT.md`, `docs/PRD.md`.

All live organizer route families are represented above; related GET/POST/PATCH endpoints are intentionally grouped by operational goal rather than listed individually.
