# Admin Workflow and Mobile UX Analysis

> Code- and documentation-based expert review of the live HelloRun administration experience as of July 2026. Admin work is treated as a high-trust operational role: efficiency matters, but authorization clarity, traceability, and prevention of irreversible mistakes take precedence.

Implementation order is maintained in the [cross-role priority index](README.md).

## 1. Role definition and experience goals

Admins keep the platform safe, accurate, available, and governable across organizers, runners, events, submissions, communications, content, policies, analytics, and commerce:

`triage -> investigate -> decide -> communicate -> verify outcome -> audit`

The experience should make urgent work obvious, distinguish platform health from routine moderation, expose sufficient evidence for fair decisions, and clearly separate reversible actions from privileged or destructive operations.

### Permissions and boundaries

- `requireAdmin` protects the administration surface.
- `requireFullAdmin` further protects exports, destructive account/event actions, platform settings, policy publication, promotion sends, and other sensitive operations.
- Rate limiters constrain account actions, moderation, exports, content settings, test email, promotion, and autosave workloads.
- Admins can review organizer applications, manage users/events, inspect or correct submissions, manage badge definitions, view audit data, operate communication recovery, moderate blog/community content, publish policies, configure public platform surfaces, and oversee platform/event commerce.
- Shared organizer review views may be reused in an admin context, so admin-specific back links and elevated capabilities must remain clear.

### Primary usage context

Most admin work is desktop-oriented and data dense, but urgent moderation, communication failures, approvals, and order exceptions may be handled on a phone. Mobile support should enable safe triage and bounded decisions; large exports, complex policy editing, and broad configuration can appropriately recommend desktop without becoming inaccessible.

## 2. Current information architecture

### Navigation model

The global header exposes one Admin entry. The Admin Dashboard then acts as the directory into queue panels, metrics, shortcuts, analytics, users, applications, events, reviews, submissions, badges, audit, communications, content/settings, promotion, blog moderation, and shop operations. Individual admin pages use their own header actions, filters, tables, tabs, and return links.

### Functional map

```text
Admin Dashboard
  +-- People: organizer applications, users, account controls
  +-- Events: event review, editing, approval, archive/delete
  +-- Evidence: review queue, submissions, corrections, bulk rejection
  +-- Trust: badges, critical audit trail, communication failures/retries
  +-- Insights: analytics and CSV/XLSX exports
  +-- Content: blog queue/reports/comments, policies, homepage, ads, promotion
  +-- Commerce: products/approvals, orders, payments, fulfillment, reports, settings
```

### Information-architecture finding

The Dashboard has recently been organized into priority bands, queue panels, metric sections, and shortcuts (`admin.css`), which is a sound direction. The overall surface nevertheless has many peer destinations and no persistent admin application shell or role-specific mobile navigation. Administrators must remember where a control lives and whether it requires full-admin privileges.

## 3. Current-state workflows

### 3.1 Dashboard triage

Dashboard presents platform metrics, pending organizer applications, events/review queues, shortcuts, and roadmap/operational groupings. Queue panels link into specialized list/detail surfaces.

**Strengths:** priority and muted bands separate workload from informational metrics; compact tables and empty states support scanning; protected links keep unauthorized users out.

**Friction:** a static hierarchy cannot fully express urgency. Pending counts, delivery failures, approaching event dates, disputed submissions, and commerce exceptions need a shared severity/age model. Metrics can occupy attention without indicating action. Limited admins may discover privilege boundaries only after opening a control.

### 3.2 Organizer application review

```text
Dashboard / Applications
  -> filter/list applications
  -> inspect applicant identity, profile, documents and history
  -> approve OR reject with reason
  -> organizer status/access changes
  -> communication and audit outcome
```

**Strengths:** application detail centralizes decision evidence; approve/reject actions are rate limited; organizers can edit and resubmit rejected or in-review applications.

**Friction:** confidential document inspection, account history, application fields, and decision controls require a clear evidence hierarchy. Admins need to know what has changed since a resubmission. Rejection quality directly affects organizer recovery, yet reason structure and preview can depend on free text. The list-to-detail-to-next-item rhythm should preserve filters and position.

### 3.3 User and account administration

Admins can list, filter, inspect, edit, annotate, resend verification, override email verification, update account status, and delete users. Full-admin protection applies to deletion and exports; self-delete protection and password confirmation are present. Test-fixture purge is separately protected.

```text
Users -> search/filter -> user detail
  -> inspect identity, role, status, activity and admin notes
  -> bounded support action (note/resend/verify/status/edit)
  -> high-risk action (delete/purge/export) with full-admin gate
  -> feedback + audit
```

**Strengths:** user detail supports support-oriented actions and notes; sensitive actions receive stronger authorization/rate limiting; self-deletion is blocked.

**Friction:** several actions sit close together despite very different consequences. “Edit,” “verify,” “suspend,” and “delete” need explicit outcome previews and reason requirements. Admin notes should be visibly distinct from system audit records. Password confirmation proves presence but does not by itself prevent wrong-target action.

### 3.4 Event moderation and lifecycle control

Admins can list/export events; inspect and edit event data/media; approve, archive, delete, or exclude an event from the sitemap; and purge test data. Event detail links to organizer/public context and shared operational surfaces.

**Friction:** admin edit can bypass the organizer’s normal configuration rhythm, so the interface must expose impact on registrations, payments, submission windows, public URLs, certificates, and active users. Approval needs a readiness summary and organizer feedback loop. Archive, delete, and sitemap exclusion are different concepts but can appear as similar status actions.

### 3.5 Review queue, submissions, and corrections

The admin review queue can aggregate payment/result review types, while `/admin/submissions` provides broad submission inspection, bulk rejection, and full-admin correction. Shared organizer review screens expose proof, OCR/submitted comparisons, flags, and decision context.

```text
Dashboard / Review Queue / Submissions
  -> select queue type and filters
  -> inspect event ownership, runner, evidence, prior decisions and flags
  -> resolve as organizer-equivalent review, correct with elevated privilege,
     bulk reject eligible cases, or leave/escalate
  -> notification, downstream result/certificate effect, audit
```

**Strengths:** detailed evidence and separate elevated correction controls support exceptional cases; critical mutations are rate limited and audited.

**Friction:** the boundary between routine organizer-owned review and admin intervention is not always self-explanatory. Admin correction is especially consequential and should show before/after values and downstream effects. Bulk rejection across organizers/events risks inconsistent runner communication. Queue ownership and escalation reason are not represented as a unified case workflow.

### 3.6 Badge governance

Admins can list badge definitions, recalculate awards, activate/deactivate definitions, configure email notification level, and revoke individual user badges. Event organizers manage event badge configuration separately.

**Friction:** recalculation and revocation can have wide or emotionally sensitive impact. Administrators need affected-count previews, reason capture, job progress, idempotency, notification consequences, and post-operation reconciliation. Definition status and email behavior are distinct settings and should not appear as one generic toggle family.

### 3.7 Audit trail and exports

The critical audit surface supports list/filter and full-admin CSV/XLSX export. Event-specific audit exists for organizers. Analytics, users, events, and other domains also expose exports.

**Strengths:** critical mutations have a dedicated traceability surface, and exports are privilege-protected/rate-limited.

**Friction:** audit records are most useful when reachable from the object under investigation and when they describe actor, reason, before/after state, correlation, and result. A flat audit search can force manual correlation. Exports need visible data scope, generation time, sensitivity warning, and success/failure state.

### 3.8 Communications and recovery

Admins can inspect communication logs, retry queue, and failure detail; manually retry delivery; configure communication settings and event-level delivery behavior; and send test email. A background retry worker handles recoverable deliveries.

```text
Dashboard alert / Communications
  -> inspect failure volume and event key
  -> open failure detail (recipient/context/attempt history)
  -> retry individual item OR adjust authorized settings
  -> verify delivery result
  -> audit and close incident
```

**Strengths:** retry and failure-detail surfaces exist; manual retry and settings are separately authorized; test email supports configuration verification.

**Friction:** logs, retries, failures, configuration, and test sending occupy one operational domain but can feel like separate pages rather than an incident workflow. A retry action needs explicit in-progress and final delivery state. Repeated failures should group by root cause and affected workflow, not only by event key.

### 3.9 Analytics and reporting

Analytics supports date/range exploration, platform breakdowns, and full-admin CSV/XLSX export. Commerce and event domains provide additional reports.

**Friction:** analytics and operational queues should cross-link: a metric anomaly should lead to the filtered records behind it. Export controls are useful but should not become the only path to answer common questions. Mobile should prioritize headline health and exceptions, not shrink desktop charts and tables indiscriminately.

### 3.10 Blog and community moderation

Admins can review pending posts, preview, upload assets, approve, reject, archive, and autosave edits. They can also remove/restore comments and resolve/dismiss post/comment reports.

**Strengths:** moderation separates queue, review, and public preview; comments can be restored; reports have resolve/dismiss semantics rather than destructive-only handling.

**Friction:** review evidence, author history, report context, edited content, and action history should be visible together. Approve/reject/archive actions need consistent reasons and author-facing previews. Autosave state must remain unmistakable when an admin edits content before approval.

### 3.11 Policy and public-content management

Privacy, terms, cookie, and other policy documents follow a versioned workflow: list -> new/clone -> format -> preview -> edit/save -> publish -> archive. Full-admin privilege is required for publish. Homepage carousel, ad settings, and promotion sends are also full-admin-controlled where appropriate.

```text
Policy list -> create or clone draft -> edit/format -> preview
  -> save draft -> full-admin publish -> public version
  -> later clone/revise/archive with history retained
```

**Strengths:** policies use draft/version/preview/publish semantics; publication receives higher privilege; cloning supports safe revision rather than editing live content.

**Friction:** multiple policy types repeat the same page family, increasing navigation and consistency risk. Publish needs a diff, effective-date/affected-user summary where relevant, and confirmation of public path. Promotion and homepage/ads settings similarly need preview, audience/surface scope, scheduling state, and rollback clarity.

### 3.12 Platform and event commerce oversight

Admin shop routes cover platform products and variants, organizer product approvals, all orders, platform orders/fulfillment, payments, platform payment review, reports, and global settings. Several mutations use PATCH/DELETE with CSRF and UUID/payload validation.

**Friction:** platform-owned products, organizer products, event orders, and platform orders are related but operationally distinct. Queue names such as Orders, Platform Orders, Payments, and Payment Reviews require clear scope. Inventory/variant edits, payment decisions, fulfillment updates, and settings have different risk levels. Mobile triage should lead with exceptions and order identity, not full table parity.

## 4. Cross-role dependencies and case handling

| Case | Admin role | Current risk | Required outcome |
|---|---|---|---|
| Organizer application | Verify legitimacy and communicate decision | Resubmission changes are hard to compare | Decision with structured reason, changed-field view, audit, and organizer next step |
| Event approval/intervention | Protect public quality without taking ownership from organizer | Admin edit silently changes live operations | Impact preview, organizer notification, before/after audit, safe publish state |
| Payment/run-proof escalation | Resolve exception or dispute | Admin duplicates routine organizer work or loses context | Case owner, escalation reason, complete evidence and prior decision history |
| User enforcement | Protect platform while preserving due process | Wrong-target or unexplained suspension/deletion | Target confirmation, reason, duration where relevant, communication, audit |
| Communication incident | Restore delivery and assess affected users | Blind retries duplicate messages or mask root cause | Attempt history, idempotency, root-cause grouping, verified resolution |
| Badge correction | Repair incorrect awards | Mass recalculation/revocation surprises runners | Impact count, dry-run preview, progress, reason, notifications, reconciliation |
| Policy publication | Maintain legal/content truth | Wrong version or incomplete public rollout | Diff/preview, full-admin confirmation, effective state, public verification |
| Commerce exception | Resolve payment/order/product issue | Confusion between platform and organizer responsibility | Explicit owner/scope, order/payment linkage, action history, customer outcome |

A mature admin workflow should treat exceptional cross-role work as a **case**: object, reporter/source, owner, severity, evidence, prior actions, decision, communication, and closure. This does not require changing current domain records immediately; it is the target information model for admin UX.

## 5. Mobile UI/UX assessment

### Existing strengths

- `admin.css` includes extensive responsive rules, compact dashboard tables, mobile filter/action adaptations, and reusable card/grid patterns.
- Many lists expose filters, pagination, column controls, and explicit action labels.
- Destructive controls use authorization and server-side validation rather than relying on hidden UI.
- Shared dialogs and detail pages provide foundations for accessible confirmations.

### Systemic mobile risks

| Dimension | Finding | Direction |
|---|---|---|
| Navigation | Admin has no persistent app shell/mobile task navigation | Add role shell with Overview, Work, Search, and More; show full-admin badge/context |
| Tables | Admin data density relies on wide tables and configurable columns | Use priority cards and detail drill-down on phones; retain tables for tablet/desktop |
| Filters | Large filter sets consume the viewport and lose current scope | Use a filter sheet with applied-filter chips, result count, clear-all, and saved views |
| Destructive actions | Dense row actions increase wrong-target risk | Move sensitive actions to detail, repeat target identity, summarize impact, require reason |
| Review evidence | Documents/proofs/content plus metadata compete for space | Full-screen evidence viewer, segmented facts/history, sticky bounded decision controls |
| Editing | Policy/product/event forms are large and precision-heavy | Preserve autosave/drafts; allow safe mobile edits but recommend desktop for complex layout work |
| Feedback | Redirects can lose filter/scroll position; raw failures remove shell | Return to the same queue state and show durable operation result with retry/escalation |
| Accessibility | Icon-only/compact controls and status color require verification | Visible touch labels, 44x44 px targets, non-color status, focus restore, 200% zoom support |

### Breakpoint validation matrix

| Viewport | Required behavior |
|---|---|
| Compact phone: 320-375 px | Safe read/triage; no accidental destructive action; target identity and privilege level always visible |
| Standard phone: 390-430 px | Review one case and make a bounded decision without horizontal page scrolling |
| Tablet: 768-1024 px | Split evidence/detail layouts and moderate-density tables remain usable with touch |
| Desktop: 1280 px+ | High-throughput keyboard/table workflows, bulk actions, comparison, and multi-column context remain available |

## 6. Proposed ideal-state workflows

### Admin command center

1. Open with an urgency-ranked **Work** feed: security/availability incidents, communication failures, overdue escalations, applications, event approvals, moderation, and commerce exceptions.
2. Show age, severity, owner, affected scope, and SLA/target for every actionable queue item.
3. Keep analytics in a secondary Health area, with anomaly cards linking to filtered records.
4. Personalize available actions by admin privilege before entry; never advertise a control that ends in an unexplained denial.

### Universal admin search and object context

Provide one search entry across user/email, event/reference, registration, submission, order, application, and communication event. Results identify object type and lead to a consistent detail header containing status, owner, related objects, audit, and permitted actions.

### Decision pattern

1. Open an item from a preserved queue/filter context.
2. Present evidence and changes since the last review.
3. Show the proposed action’s target, downstream effects, reversibility, communication, and required privilege.
4. Require structured reason where the action affects access, money, results, achievements, publication, or content ownership.
5. Confirm success from server state, write/display audit correlation, and move to the next item or return to the same queue position.

### Policy/content pattern

Use one versioned-editor shell for all policies: metadata, draft editor, autosave state, diff, preview, validation, publish confirmation, version history, and public verification. Reuse the same preview/impact concepts for homepage, ads, promotion, and high-impact communication settings.

## 7. Prioritized recommendations

Priority meanings: **P0** critical blocker/trust failure, **P1** high-value workflow improvement, **P2** consistency/efficiency improvement, **P3** polish. Effort is relative: S, M, L.

| ID | Priority / effort | Recommendation and affected surfaces | Rationale | Acceptance criteria |
|---|---|---|---|---|
| A-01 | P0 / S | Replace raw 403/429/timeout responses with a styled admin-shell error and privilege-specific recovery | Admin failures must not obscure whether an action ran | HTML response states status, action result/unknown state, retry rules, and return path; JSON callers retain structured JSON; no mutation is silently retried |
| A-02 | P0 / M | Standardize high-risk action confirmation with target, impact, reason, privilege, and result | Password confirmation alone does not prevent wrong-target decisions | Delete/suspend/correct/revoke/publish/send/bulk actions show target and consequences, require reason where defined, prevent double submit, and expose audit reference |
| A-03 | P1 / L | Build an urgency-ranked, assigned admin work feed | Domain-specific queues do not provide one operational priority model | Items show type, severity, age, owner and affected scope; counts deep-link to preserved filters; resolved items leave the active feed |
| A-04 | P1 / L | Add universal admin search and consistent object headers | Investigation currently requires knowing the correct subsystem | Search returns authorized users/events/submissions/orders/applications; detail identifies object type/status/relations and links to audit/actions |
| A-05 | P1 / M | Standardize queue-to-detail-to-next-item behavior | Application, review, blog, and commerce queues repeat navigation inconsistently | Filter/sort/page persist after decision; next-item action is predictable; empty/changed queues explain why; keyboard navigation works on desktop |
| A-06 | P1 / M | Add before/after and downstream impact preview to admin event/submission corrections | Elevated edits can affect results, certificates, leaderboards, and active participants | Confirmation shows changed values and affected outputs; successful action records actor/reason/diff and identifies recalculation/notification result |
| A-07 | P1 / M | Turn communication recovery into an incident-oriented workflow | Logs/retries/settings do not by themselves express root cause or closure | Failures group by cause/workflow; attempts and recipients are visible; retry is idempotent; resolution verifies delivery or records remaining failure |
| A-08 | P1 / M | Add dry-run impact and progress reporting to badge recalculation/revocation | Badge changes can affect many users and trust | Admin sees estimated affected awards and notifications; job is idempotent/observable; partial failures can be retried; individual revocation records reason |
| A-09 | P1 / L | Introduce a cross-domain escalation/case view | Exceptional disputes lose ownership and context across roles | Case view links subject, evidence, prior decisions, owner, severity, communication, audit, and closure; existing domain authorization remains authoritative |
| A-10 | P2 / L | Add a persistent admin shell with mobile Overview/Work/Search/More navigation | One header link plus page-local navigation scales poorly | All admin domains are reachable predictably; active section and privilege level are visible; 320-430 px navigation has labeled 44x44 px targets |
| A-11 | P2 / M | Create responsive card representations for priority tables | Horizontal tables are weak for phone triage | Users/applications/reviews/failures/orders show identity, dominant status, age, and primary safe action without horizontal scroll; desktop tables remain available |
| A-12 | P2 / M | Consolidate policy types into one versioned editing UX | Repeated page families create drift and publication risk | Every policy uses the same autosave, diff, preview, validation, publish, archive, and public-verification states; routes/data compatibility is preserved |
| A-13 | P2 / M | Clarify commerce scope and responsibility in navigation/queues | Platform versus organizer products/orders/payments are easy to conflate | Titles, filters, object headers, and audit entries identify owner and scope; global settings are visually separated from order operations |
| A-14 | P2 / S | Add applied-filter chips, saved operational views, and durable return state | Complex filters slow repeated triage | Admin can see/remove active filters, save common views locally/account-wide per implementation policy, and return after detail without reconstruction |
| A-15 | P2 / S | Show full-admin requirements before interaction | Late 403s create false affordances | Restricted controls are absent or clearly locked with explanation; direct URLs still enforce server authorization; privilege changes update UI on next request |
| A-16 | P3 / S | Normalize success, empty, and partial-failure messaging | Generic flashes do not explain durable operational state | Each operation reports affected/succeeded/skipped/failed counts and next step; refresh does not replay transient success; empty queues distinguish “none” from filters |

## 8. Delivery roadmap

### Phase 1: immediate process safety

Implement A-01, A-02, A-06, A-15, and A-16. These improve confidence in critical mutations and failure recovery without changing domain permissions.

### Phase 2: workflow consolidation

Implement A-05, A-07, A-08, A-13, and A-14. Establish common queue, incident, impact, and scope patterns across existing domains.

### Phase 3: mobile and navigation

Implement A-10 and A-11. Validate safe triage and bounded decisions on phones while preserving high-throughput desktop tables and keyboard operation.

### Phase 4: strategic operations

Implement A-03, A-04, A-09, and A-12. These require shared information models and should follow measurement of current queue age, escalation volume, search behavior, and policy workload.

## 9. Success metrics and validation scenarios

### Suggested metrics

- Queue age by domain/severity and percentage resolved within target.
- Time from Dashboard entry to first correct action.
- Wrong-target, reversal/correction, duplicate-submit, and partial-failure rates for privileged actions.
- Application/event/blog review throughput and inter-review navigation time.
- Percentage of admin investigations using universal search versus manual subsystem navigation.
- Communication incidents grouped, time to root cause, retry success, and duplicate-delivery rate.
- Badge recalculation duration, affected-count accuracy, and partial failure/retry rate.
- Audit completeness: actor, target, reason, diff, outcome, and correlation coverage.
- Mobile triage completion and deferral-to-desktop rates by task type.
- Support/escalation case reopen rate and time without an owner.

### Usability scenarios

1. A limited admin opens Dashboard, understands which work they can perform, and does not encounter a surprise privilege denial.
2. On a tablet, an admin reviews a resubmitted organizer application, identifies changed fields, rejects with actionable copy, and advances without losing filters.
3. An admin suspends the correct user, confirms target and impact, records a reason, and locates the resulting audit entry.
4. A full admin corrects an approved submission and understands effects on leaderboard, certificate, badge, notification, and audit before confirming.
5. An admin diagnoses a burst of failed result emails, retries only safe deliveries, and verifies resolution without duplicate messages.
6. An admin previews a badge recalculation, monitors completion, and retries only failed items.
7. On a 390 px phone, an admin safely triages an urgent commerce payment exception and defers a complex product edit.
8. A full admin clones, edits, diffs, previews, publishes, and publicly verifies a policy version.
9. An admin searches a runner email, follows linked registration/submission/order objects, and opens a single escalation record with complete context.

## 10. Evidence and coverage map

- Authorization and privilege boundaries: `src/middleware/auth.middleware.js`, admin route guards/rate limiters.
- Admin route inventory: `src/routes/admin.routes.js`, `src/routes/admin-shop.routes.js`.
- Dashboard and admin presentation: `src/views/admin/dashboard.ejs`, `src/views/admin/`, `src/public/css/admin.css`.
- Applications/users/events/submissions/policies/badges: `src/controllers/admin/` and related admin views.
- Audit and exports: `src/controllers/admin-audit.controller.js`, audit view/routes.
- Communications/retries: admin communication views/controllers and `src/workers/communication-retry-worker.js`.
- Blog moderation: admin blog routes/controllers, queue/review/report views.
- Commerce: `src/controllers/admin-shop.controller.js`, admin shop views, shop validation/access middleware.
- Shared organizer review context: organizer review views and admin review/submission controllers.
- Known error-surface issues and process risks: `docs/review-2026-07/04-ux-intuitivity.md`, `docs/review-2026-07/03-process-dx.md`.

All live admin route families are represented above; repeated policy endpoints and related GET/POST/PATCH/DELETE actions are intentionally grouped by administrator goal rather than enumerated individually.
