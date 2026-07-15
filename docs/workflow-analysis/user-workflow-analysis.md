# User/Runner Workflow and Mobile UX Analysis

> Code- and documentation-based expert review of the live HelloRun experience as of July 2026. In this document, **user** means the runner/customer role. This is not a substitute for production analytics or observed usability testing.

Implementation order is maintained in the [cross-role priority index](README.md).

## 1. Role definition and experience goals

The runner is a mobile-aware participant with varying technical confidence. Their main job is not to administer data; it is to move confidently through a race lifecycle:

`discover -> decide -> register -> pay -> participate -> submit proof -> receive a decision -> celebrate/share`

The experience should make the next required action unmistakable, preserve trust during payment and proof review, and celebrate participation regardless of pace. The runner can also maintain a profile, join running groups, shop, interact with blog content, collect badges, and manage account security.

### Permissions and boundaries

- Public visitors can browse events, event leaderboards, the global leaderboard, blog content, public runner profiles, badges, certificate verification, and shops.
- Authentication is required for registration, registrations, proof submission, notifications, profile/account actions, groups, checkout/orders, and blog interactions.
- A runner can act only on their own registrations, submissions, notifications, profile, group membership, and orders.
- Payment approval and run-result approval are organizer/admin decisions. Runner-facing copy intentionally avoids exposing internal suspicion reasons before review.
- Organizer accounts may also participate as runners, but the global navigation currently treats role modes as mutually exclusive.

## 2. Current information architecture

### Primary navigation

The shared header exposes Home, Events, Blog, Leaderboard, My Registrations, Submitted Entries, Dashboard, Notifications, and Logout. On screens at or below 768 px, runners also receive a persistent bottom navigation with Dashboard, Events, Registrations, and Submissions (`src/views/layouts/nav.ejs`, `src/public/css/mobile-nav.css`). Notifications and profile/account functions remain in the hamburger/header experience.

### Main runner surfaces

| User intent | Primary surface | Supporting surfaces |
|---|---|---|
| Find an event | `/events`, `/events/:slug` | Home, saved events, event leaderboard, badges |
| Register | `/events/:slug/register` | Quick-profile modal, policy/waiver content |
| Pay and track entry | `/my-registrations` | Notifications, event contact action |
| Submit a run | Global run-proof shortcut/modal | My Registrations, Dashboard, Submitted Entries |
| Understand a decision | `/runner/submissions/:id` | Notifications, Submitted Entries |
| Track progress | `/runner/dashboard` | Badges, certificates, activity, groups |
| Maintain identity | `/runner/profile` | Password settings, Google unlink, notification preferences |
| Buy merchandise | `/shop`, event shop, cart, checkout | Orders, order payment |

### Information-architecture finding

The application offers strong access to core tasks, but one registration lifecycle is represented across three high-level destinations: Dashboard, My Registrations, and Submitted Entries. Each is useful, yet their boundaries are learned rather than self-evident. The bottom navigation reinforces all three as peers without explaining when to use each.

## 3. Current-state workflows

### 3.1 Account creation, verification, and recovery

| Stage | Current behavior | Success/recovery state |
|---|---|---|
| Entry | Email signup or Google authentication | Existing authenticated users are redirected away from auth pages |
| Signup | Role, identity, credentials, consent, and bot/rate-limit controls are processed | Validation returns the signup form with specific errors |
| Verification | Email accounts proceed through verification-sent, resend, and token verification | Unverified login provides a resend path |
| Profile readiness | Registration can invoke a quick-profile update when required fields are missing | Full profile remains available under `/runner/profile` |
| Recovery | Forgot-password email -> reset token -> new password | Invalid/expired tokens return an error and restart path |

**Strengths:** login preserves return intent, verification errors are specific, Google sign-in reduces onboarding work, and registration can repair an incomplete profile in context.

**Friction:** identity/profile data is split between signup, quick profile, and the full profile. The user can understand that a field is missing without understanding why it matters later for certificates, emergency contact, or registration. Browser-default/plain-text authorization and rate-limit responses documented in `docs/review-2026-07/04-ux-intuitivity.md` can abruptly remove navigation and recovery context.

### 3.2 Discovery and registration

```text
Home / Events / shared link
  -> filter and inspect event
  -> event details (mode, dates, fee, distance, organizer, rules)
  -> Register
     -> authenticate if needed, preserving return intent
     -> complete required profile data
     -> choose registration options and accept waiver/policies
     -> submit
        -> free event: confirmed/paid-equivalent path
        -> paid event: registration awaits payment proof
  -> My Registrations
```

The event detail page provides the acquisition context and a mobile sticky registration CTA. The registration layout shifts from a content-plus-summary grid to one column below 980 px, and the quick-profile modal becomes single-column below 700 px (`event-register.css`).

**Friction:** the handoff from event details to registration to payment uses multiple page concepts and status labels. Users must interpret both registration status and payment status. Long waivers, profile repair, option selection, and consent create a high-cognitive-load mobile session with limited progress indication or save/resume support.

### 3.3 Payment proof and registration tracking

On `/my-registrations`, each registration card combines event details, registration status, payment status, proof upload, review timestamps/notes, result state, and certificate actions. Paid events can move through `unpaid -> proof_submitted -> paid` or `proof_rejected -> resubmit`; other terminal states include failed/refunded/cancelled where applicable.

```text
Registration created
  -> show amount, payee, and organizer instructions
  -> runner pays outside HelloRun
  -> upload JPG/PNG/PDF receipt (up to 5 MB)
  -> proof submitted / waiting for organizer
     -> approved: result submission becomes eligible
     -> rejected: reason + re-upload action
```

**Strengths:** the UI distinguishes payment receipts from activity screenshots, exposes the rejection reason, supports re-upload, and records submitted/reviewed timestamps.

**Friction:** dense registration cards require scanning many states to find the one next action. Payment is an external action, so returning users need especially clear continuity. Query-string flash messages can persist after refresh. The card is both a history record and task surface, producing visual competition between metadata, statuses, and CTAs.

### 3.4 Run-proof/OCR or Strava submission

The global plus-circle shortcut opens the shared run-proof modal. Eligibility is loaded inside the modal and requires a paid, confirmed event currently accepting submissions. The user can upload an activity screenshot for browser-side OCR assistance or use an eligible Strava activity. Extracted values remain reviewable/editable for image submissions; warnings are non-blocking; name mismatch can trigger explicit confirmation and manual review.

```text
Open Run Proof
  -> load eligible registrations
  -> choose event/activity
  -> screenshot path                 -> Strava path
     upload proof                       select synced activity
     analyze screenshot                 accept source-locked values
     review/edit extracted fields       review activity
  -> see warnings and confirm declarations
  -> submit
  -> Submitted Entries / detail
     -> pending review
     -> approved -> leaderboard/certificate/badges
     -> rejected -> reason/guidance -> replace proof and resubmit
```

**Strengths:** manual entry remains available, stale OCR values clear when an image changes, live status regions communicate analysis, warnings do not strand the runner, and rejection detail maps common reasons to actionable guidance.

**Friction:** this is the highest-trust, highest-complexity runner flow and occurs in a modal with several concepts: eligibility, source selection, OCR, editable data, warnings, consent, and submission. A phone keyboard, image picker, and modal height can obscure context. Eligibility failure is only discovered after opening the action. The same task is launched or described from multiple surfaces with slightly different context.

### 3.5 Review, results, certificates, and badges

Submitted Entries lists and filters submissions; detail pages show proof, activity metrics, review status, organizer feedback, fraud/OCR-related runner-safe signals, resubmission, certificate download/verification/sharing, and badges. Dashboard also summarizes approved/rejected totals, certificates, recent activity, badge collection, and challenge progress. Notifications provide lifecycle updates and deep links.

**Friction:** status information is comprehensive but distributed. A runner can receive an alert, land on a detail page, then return to one of three lifecycle hubs. Raw internal enum values still appear in some badges (for example, direct rendering of `registration.status` or `submission.status`), reducing consistency with friendly phrases such as “Pending Review.” Celebration is present but can be visually secondary to operational metadata.

### 3.6 Groups, profile, security, and notification settings

- Groups support browse/search, create, join, leave, and public group detail.
- Profile editing is divided into identity, contact, location, emergency contact, avatar, and featured badge operations.
- Security supports password management and safe Google unlink behavior.
- Notification preferences and mark-one/mark-all-read are supported.

**Friction:** these capabilities are not represented in mobile bottom navigation and compete inside the broader Dashboard experience. The navigation does not offer a clear mobile “More/Profile” destination, while the top header menu contains many links.

### 3.7 Shop, orders, and community content

The runner can browse the platform or an event shop, choose product variants, manage cart items, check out, view orders, submit payment proof, and cancel where allowed. Blog users can like, comment, delete their own comments, and report posts/comments. Public badge/profile and certificate verification surfaces support sharing and trust.

**Friction:** shop payment proof creates a second receipt workflow with its own order state, separate from event-registration payments. The distinction is structurally correct but needs consistent language, status components, and notification behavior. Blog and shop are globally visible, but order history is not a primary nav destination.

## 4. Cross-role handoffs and failure modes

| Handoff | Runner must understand | Current risk | Required recovery |
|---|---|---|---|
| Runner -> organizer: payment proof | Receipt was received; who reviews it; expected next state | “Submitted” can feel like “paid” | Persistent pending state, timestamp, organizer contact, actionable rejection |
| Organizer -> runner: payment decision | Approval unlocks run submission | Registration and payment statuses may conflict visually | One dominant lifecycle state and next action |
| Runner -> organizer: run proof | Data is saved and pending, warnings are not automatic rejection | OCR/suspicion language can feel accusatory | Neutral status, visible submitted data, safe resubmit path |
| Organizer/admin -> runner: rejection | Exact correctable issue | Free-text feedback quality varies | Structured reason plus optional detail and contextual resubmit |
| Approval -> achievement | Result, rank, certificate, badge availability | Outputs are scattered or delayed | One completion state with direct actions and notification |
| Request failure | Whether the action was saved | Plain-text/JSON timeout or rate-limit pages break continuity | Styled error, retry timing, return link, idempotent button behavior |

Empty, loading, validation, rejection, timeout, rate-limit, unauthorized, and completion states should all retain the user’s event or submission context. Mutations should disable repeat submission while pending and clearly report whether a retry is safe.

## 5. Mobile UI/UX assessment

### Existing strengths

- Persistent four-tab runner bottom navigation includes safe-area padding and reserves body space.
- Event registration, Dashboard, Submitted Entries, shop, and modals include phone/tablet breakpoints.
- The event page has a sticky registration CTA; proof upload does not require drag-and-drop.
- Many complex grids collapse to one column; certificate and submission actions receive mobile-specific layouts.
- Several dynamic messages use `aria-live`, and organizer feedback is readable without opening the original proof.

### Mobile risks by dimension

| Dimension | Finding | Direction |
|---|---|---|
| Navigation | Four core tabs are useful, but Notifications/Profile/Orders/Groups require the header menu | Replace one lower-frequency peer or add a clearly labeled More destination with badge support |
| Hierarchy | Registration cards mix history, status, instructions, upload, and result actions | Put one lifecycle summary and one primary next action above collapsible details |
| Forms | Registration and run proof can become long keyboard-heavy sessions | Use step progress, input-mode hints, sticky next/submit, preserved drafts, and keyboard-safe spacing |
| Uploads | File selection is available, but confidence depends on preview and requirements | Show file preview, readable requirement checklist, replace/remove controls, upload progress, and recovery |
| Tables | Responsive overflow still appears in data-heavy areas | Prefer labeled cards for runner-owned records; reserve horizontal tables for comparisons |
| Dialogs | Proof flow and quick-profile repair are high-work modals | Use a full-screen mobile sheet/page pattern with persistent header, progress, and back behavior |
| Touch | Icon shortcuts depend on tooltip/title in desktop contexts | Maintain at least 44x44 px targets and visible labels for irreversible or unfamiliar actions |
| Feedback | Query-string flashes and raw failure pages can outlive/interrupt tasks | Use transient session feedback plus persistent inline task state and retry actions |
| Accessibility | Strong live-region foundations, but dense status/color use needs verification | Never rely on color; preserve focus; trap/restore modal focus; test zoom and reduced motion |

### Breakpoint validation matrix

| Viewport | Required behavior |
|---|---|
| Compact phone: 320-375 px | No clipped CTA/status; one-column forms; full-screen proof flow; readable 200% zoom; safe-area bottom nav |
| Standard phone: 390-430 px | Primary action reachable one-handed; image preview and keyboard coexist; no nested horizontal scrolling |
| Tablet: 768-1024 px | Avoid stretched single-column forms and ambiguous icon-only controls; retain useful two-column summaries |
| Desktop: 1280 px+ | Preserve task hierarchy; do not let wide layouts turn lifecycle records into scanning-heavy dashboards |

## 6. Proposed ideal-state journey

Make **My Run Plan** (a redesigned lifecycle view, whether implemented within My Registrations or Dashboard) the canonical operational home:

1. Show each event as a stage-based timeline: Registered, Payment, Ready to Run, Proof Review, Completed.
2. Put exactly one primary next action on each active event: Pay/upload receipt, wait for review, submit result, correct submission, or view achievement.
3. Keep history, organizer instructions, and secondary actions behind progressive disclosure.
4. Route every notification to the relevant event stage rather than to a generic hub.
5. Open run submission with the event already selected when launched from its card; retain the global shortcut for experienced users.
6. On approval, replace operational messaging with a completion panel containing result, certificate, badges, leaderboard, and sharing.
7. Keep Submitted Entries as the detailed proof archive and Dashboard as progress/community/account overview, with those purposes stated in titles and navigation labels.

## 7. Prioritized recommendations

Priority meanings: **P0** critical blocker/trust failure, **P1** high-value workflow improvement, **P2** consistency/efficiency improvement, **P3** polish. Effort is relative: S, M, L.

| ID | Priority / effort | Recommendation and affected surfaces | Rationale | Acceptance criteria |
|---|---|---|---|---|
| U-01 | P0 / S | Replace plain-text/JSON navigation failures with the shared styled HTML error response; keep JSON for API requests | Current 403/429/timeout failures remove recovery context at payment/proof moments | HTML errors show cause, safe retry guidance, and a context-appropriate return action; JSON contracts remain stable |
| U-02 | P1 / L | Create one stage-based runner lifecycle summary across Dashboard/My Registrations | Three peer destinations make the next action harder to locate | Every active registration has one dominant stage and CTA; no contradictory labels across surfaces; usability participants find the next task without prompting |
| U-03 | P1 / M | Deep-link and preselect event context in payment/proof/notification actions | Re-selection and generic landing pages add work and errors | Event-launched proof opens with that registration selected; notifications land at the exact affected stage; invalid links degrade safely |
| U-04 | P1 / M | Convert the mobile run-proof modal into a full-screen, resumable step flow | Image picker, OCR, keyboard, warnings, and declarations overload a constrained modal | Progress and back behavior are visible; draft survives accidental close/reload for a defined period; replacement clears stale OCR; focus and scroll are restored |
| U-05 | P1 / M | Introduce a shared friendly lifecycle status vocabulary/component | Raw enums and dual status axes reduce comprehension | Runner surfaces use the same label, icon, explanation, and allowed next action for a given state; internal enums remain unchanged |
| U-06 | P1 / S | Put rejection reason, structured guidance, and Resubmit together | Recovery is the highest-impact trust moment | Every rejection includes a reason and one clear correction CTA; resubmission preserves event context and shows successful replacement |
| U-07 | P2 / M | Redesign mobile navigation around core tasks plus More | Notifications, profile, groups, orders, and settings are hidden in the header | At 320-430 px all runner destinations are reachable in two taps; unread state is visible; active state and labels meet accessibility requirements |
| U-08 | P2 / M | Simplify registration/payment cards with progressive disclosure | Current cards combine too many lifecycle and history elements | Above the fold shows event, dominant status, due date/instruction summary, and one CTA; details remain accessible without horizontal scrolling |
| U-09 | P2 / S | Replace query-string success messages when workflows are touched | Messages repeat on refresh/bookmarks and do not represent durable state | Success feedback appears once; durable state remains inline; refresh does not replay the toast |
| U-10 | P2 / M | Standardize registration-payment and shop-payment proof interaction patterns | Two legitimate receipt workflows should feel related without being confused | Both show order/registration identity, amount, file requirements, preview, submitted timestamp, review state, and contextual rejection recovery |
| U-11 | P2 / M | Add draft/save continuity to long registration forms | Mobile interruption can lose a high-effort session | Returning to an incomplete registration restores non-sensitive fields and identifies remaining requirements; expired drafts are explained |
| U-12 | P3 / S | Strengthen completion celebration and sharing hierarchy | Approval is the emotional payoff but competes with metadata | Approval first presents result and achievement actions; sharing is optional, accessible, and never blocks certificate access |

## 8. Delivery roadmap

### Phase 1: immediate trust and usability fixes

Implement U-01, U-03, U-05, U-06, and U-09. These improve failure recovery, status comprehension, and rejection handling without changing authorization or lifecycle rules.

### Phase 2: workflow consolidation

Implement U-02 and U-08. Establish the canonical event lifecycle model, content hierarchy, and deep-link contract before broad visual redesign.

### Phase 3: mobile optimization

Implement U-04, U-07, U-10, and U-11. Validate on real iOS/Android devices with camera/gallery selection, keyboard display, slow network, interrupted uploads, and safe-area insets.

### Phase 4: strategic improvement

Implement U-12, then use analytics and moderated research to tune Dashboard/community/shop discoverability without weakening the core event workflow.

## 9. Success metrics and validation scenarios

### Suggested metrics

- Event-detail-to-registration-start and registration-completion rates.
- Median time and abandonment by registration step.
- Payment-proof first-attempt completion, rejection, and resubmission rates.
- Run-proof start-to-submit rate, OCR correction rate, and time to submit.
- Median organizer review time as perceived by the runner and notification-to-action conversion.
- Rejection-to-successful-resubmission rate.
- Percentage of active runners who find the correct next action without visiting multiple hubs.
- Mobile error/retry rate, duplicate-submit rate, and support contacts per lifecycle stage.
- Certificate download/share and badge-view rates after approval.

### Usability scenarios

1. On a 360 px phone, a new email user follows a shared event link, verifies, repairs missing profile fields, and registers.
2. A returning runner finds payment instructions, uploads the wrong receipt, understands rejection, and replaces it.
3. A runner uploads an activity screenshot, corrects OCR values, handles a name warning, and confirms pending review.
4. A runner whose proof is rejected identifies the exact correction and resubmits without searching another page.
5. A runner receives approval, finds their certificate and badge, verifies the certificate, and shares it.
6. A Google-authenticated runner manages security without accidentally losing access.
7. A runner purchases event merchandise, submits order payment proof, and distinguishes that state from race registration payment.
8. At 200% zoom with keyboard-only navigation, the user completes registration and proof submission with visible focus and announced errors.

## 10. Evidence and coverage map

- Product goals and accessibility: `PRODUCT.md`.
- Authentication: `src/routes/authRoutes.js` and associated auth views/styles.
- Discovery/registration/payment/certificate/public profiles: `src/routes/pageRoutes.js`, `src/controllers/page/`, `src/views/pages/`.
- Runner dashboard, profile, notifications, groups, submissions: `src/routes/runner.routes.js`, `src/controllers/runner.controller.js`, `src/views/runner/`.
- Run proof/OCR: `src/views/partials/run-proof-modal.ejs`, `src/public/css/run-proof-modal.css`, submission services/controllers.
- Runner mobile navigation: `src/views/layouts/nav.ejs`, `src/public/css/mobile-nav.css`.
- Commerce: `src/routes/shop.routes.js`, `src/controllers/shop.controller.js`, shop/order views and `shop.css`.
- Blog/community: `src/routes/pageRoutes.js`, `src/controllers/blog-interaction.controller.js`.
- Known error-surface issues: `docs/review-2026-07/04-ux-intuitivity.md`.

All live runner route families are represented above; closely related GET/POST endpoints are intentionally grouped by user goal rather than enumerated individually.
