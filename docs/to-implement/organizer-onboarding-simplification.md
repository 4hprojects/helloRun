# Organizer Onboarding Simplification

## Document Role

- **Purpose:** Design proposal for simplifying organizer registration, automating
  application approval, and making the onboarding flow intuitive — based on a full
  code-path analysis of the current workflow.
- **Status:** **In implementation — started July 5, 2026.** See the Implementation
  Tracker below for per-phase status and timestamps.
- **Source:** July 5, 2026 session analysis; every `file:line` reference below was
  verified against the code as of that date.

---

## Implementation Tracker

Priorities were set July 5, 2026 (product decision): risk-based gating first, UX second,
trusted auto-publish third, OCR-assist last. Timestamps are filled in as each phase
starts/completes.

| Phase | Priority | Scope | Status | Started | Completed |
|-------|----------|-------|--------|---------|-----------|
| 1 — Risk-based gating | P1 | Free virtual events without application; ID = "unlock paid events"; per-type form fields; route-guard rationalization | **Done** | July 5, 2026 | July 6, 2026 |
| 2 — UX + validation fixes | P2 | Status-page capabilities panel; stepped form; form/server validation mismatches | **Done** | July 6, 2026 | July 6, 2026 |
| 3 — Graduated auto-publish | P3 | v2 trusted-organizer rule: ≥3 completed events → paid-event auto-publish (onsite/hybrid stays manual) | **Done** | July 6, 2026 | July 6, 2026 |
| 4 — OCR-assist review | P4 | Server-side Tesseract name-match verdict shown to admin; `under_review` triage lane; duplicate-phone flag; **no auto-decision** | In progress | July 6, 2026 | — |

### Decisions (July 5, 2026 — resolve the Open Questions below)

- **Scope:** all 4 phases, implemented in priority order above.
- **OCR mode:** OCR **assists** the admin (pre-computed verdict); no auto-approval until
  accuracy on Philippine IDs is proven in the manual queue.
- **Phase 3 threshold:** N = **3** completed events
  (env `EVENT_AUTO_APPROVAL_TRUSTED_MIN_COMPLETED_EVENTS`, default 3).
- **Safety net:** free virtual events from organizers who never submitted an application
  still pass through the existing `pending_review` admin queue — event auto-publish
  remains exclusive to approved organizers (until Phase 3 broadens it for trusted ones).

---

## Feature Summary

Today a would-be organizer must fill a single long business form and upload a
government-ID document before anything happens, then wait up to 3 days for a manual admin
review — yet a *pending* organizer can already create events by signing an e-signature
acknowledgement, and the event-level auto-approval rule already draws a clean risk
boundary (free + virtual = low risk). The proposal aligns the two layers: **free virtual
events require no application at all; identity documents become a "verify to unlock paid
events" step; clean individual applications auto-approve via OCR name-matching; and
proven organizers graduate to paid-event auto-publish.**

---

## Current Workflow (as implemented)

1. **Signup** — user picks `runner` or `organiser` at registration
   (`src/routes/authRoutes.js:373,460`), must verify email, then is routed to
   `/organizer/complete-profile`.
2. **Application form** — `src/views/organizer/complete-profile.ejs`, handled by
   `src/routes/organiser/profile.js` (GET/POST `/complete-profile`, GET
   `/application-status`). Files go to Cloudflare R2 via
   `uploadService.uploadOrganizerDocsToR2`.
3. **Model** — `src/models/OrganiserApplication.js`: business info + two document URLs,
   status enum `pending / under_review / approved / rejected`, auto-generated
   `APP######` id, one application per user (`userId` unique).
4. **Admin review** — `src/controllers/admin/applications.controller.js`:
   list/search, approve, reject (reason 15–500 chars,
   `MIN/MAX_REJECTION_REASON_LENGTH` in `src/controllers/admin/_shared.js:72`).
   On **either** decision, `purgeApplicationDocuments` (`_shared.js:199`) permanently
   deletes both documents from R2 and blanks the URLs — good privacy hygiene, keep it.
   Approval sets `User.role = 'organiser'`, `organizerStatus = 'approved'`; both
   decisions send email via `communicationService.notify` and write a critical audit
   event.
5. **Provisional access (already exists)** — `User.canCreateEvents()`
   (`src/models/User.js:358`) returns true for a *pending* organizer who has signed the
   event-creation acknowledgement (typed name must match account name; e-sign route at
   `src/routes/organiser/dashboard.js:402`, stored with IP/UA in
   `organizerEventCreationAcknowledgement`). So the ID review does **not** actually gate
   event creation.
6. **Second gate: event approval** — every event starts `pending_review`.
   `src/services/event-approval.service.js` auto-publishes
   (`AUTO_APPROVAL_RULE_VERSION = 'event_auto_approval_v1_free_virtual'`) only when the
   event is free + virtual-only + has zero payment/physical-reward/delivery/onsite setup
   **and** the organizer is already approved with a verified email. Everything else —
   every paid event, forever — waits for manual admin review.
7. **Review SLA** — `ORGANIZER_REVIEW_TIME_DAYS` env var, default 3 days, shown on the
   status page.

## Documents & Fields Required Today

| Requirement | Enforced |
|---|---|
| Business name (min 2 chars) | Required — even for `individual` type |
| Business type (`individual` / `company` / `ngo` / `sports_club`) | Required |
| Contact phone | Required |
| Business address | Required in the form (`required` attr, `complete-profile.ejs:366`) but **not server-side**; view `maxlength=200` vs schema 500 |
| Terms checkbox | Required |
| **ID proof** (PDF/JPG/PNG/WebP, ≤5 MB) | **Required — the only mandatory document** |
| Business proof | Optional, even for company/NGO |
| Business registration number | Optional, even for company/NGO |

## Risk Model

Registration payments go **directly to the organiser's QR code** — HelloRun is not the
merchant of record. The ID proof therefore exists for *scam-event accountability*, not
regulatory compliance. It is only load-bearing where money or physical fulfilment is
involved — which is exactly the boundary `getAutoApprovalEligibility` already draws for
events. The application layer and the event layer are managing the same risk with
different (misaligned) gates.

## Findings / Friction Points

1. **The document wall is decorative for free events** — the acknowledgement path
   already lets pending organizers create events, but the full business form + ID upload
   must still be submitted first just to reach `pending`.
2. **Individuals must invent a "business name"** and (per the form) a business address.
3. **`company`/`ngo`/`sports_club` carry no extra evidence** — business proof and
   registration number are optional for everyone.
4. **`under_review` status exists but nothing ever sets it** — no triage lane.
5. **Form/server validation mismatches** — address required client-side only;
   `maxlength=200` (view) vs 500 (schema).
6. **Paid events are manually reviewed forever**, regardless of organizer track record —
   a 50-event veteran queues behind a first-timer.
7. **The status page doesn't tell pending organizers what they can already do** — the
   acknowledgement path to a free event is invisible unless they stumble on the
   dashboard prompt.

---

## Proposed Design

### Phase 1 — Risk-based gating (highest leverage)

- A verified-email organizer can create **free virtual events with no application at
  all**: formalize the acknowledgement path as *the* entry point (keep the e-signature),
  and stop requiring the business form/ID first.
- Request the ID document only when the organizer first enables **paid registration or
  physical rewards** — reframe the application as **"verify to unlock paid events"** at
  the moment of need (event wizard payment step links to it).
- Per-type form fields: for `individual`, drop business name/address (use account name);
  for `company`/`ngo`/`sports_club`, make business proof + registration number
  **required** — they should carry more evidence than an individual, not the same.
- Touchpoints: `canCreateEvents()` in `src/models/User.js`, the complete-profile
  form/route, the event wizard's payment step, `requireApprovedOrganizer` usages in
  `src/routes/organiser/*`.

### Phase 2 — OCR-assisted application auto-approval

- Name-match the uploaded ID against the account name, reusing the run-proof pattern:
  statuses `matched / mismatched / not_detected` (see
  `src/services/submission.service.js:1163,1388` — `not_detected` now auto-approves,
  `mismatched` blocks). `matched` on an `individual` application → auto-approve;
  `mismatched`/unreadable → set the currently-unused **`under_review`** status and queue
  for manual review.
- Note: run-proof OCR runs **client-side** (Tesseract, `src/public/js/ocr/`) with
  server-side status validation. For identity documents the OCR must run **server-side**
  (client-reported results are trivially forgeable for an approval decision) — a small
  server-side Tesseract step at upload time, before the R2 purge-on-decision.
- Fraud signals flag, never auto-reject: duplicate contact phone across applications,
  same account previously rejected.
- Keep `purgeApplicationDocuments` semantics: auto-approval purges documents exactly
  like manual approval.

### Phase 3 — Graduated event auto-approval

- Add a v2 rule to `getAutoApprovalEligibility`
  (`src/services/event-approval.service.js`), versioned via the existing
  `autoApprovalRuleVersion` field: an organizer with **N completed events** (suggest
  N=3), verified identity (Phase 1/2), and clean `accountStatus` gets **paid-event
  auto-publish**. Keep manual review for first paid events and for onsite/hybrid.
- The audit trail already distinguishes `approvalSource: 'auto'` — no new plumbing.

### Phase 4 — Intuitive UX

- `/organizer/application-status` lists what the organizer **can already do now**
  (create a free virtual event via the acknowledgement) alongside what approval unlocks.
- Replace the single long form with a 2–3-step checklist (account → details →
  verification), showing capabilities unlocked at each step.
- Fix the validation mismatches (address requiredness + maxlength) while in the file.

## Open Questions

All resolved July 5, 2026 — see **Decisions** in the Implementation Tracker above.

- ~~**N for Phase 3**~~ — resolved: 3 completed events, env-overridable.
- ~~**PH ID feasibility**~~ — resolved: ship OCR-assist (admin sees the verdict, decides
  manually); revisit full auto-approval once real-queue accuracy data exists.
- ~~**Grandfathering**~~ — resolved by construction: Phase 1 only *widens*
  `canCreateEvents()` and relaxes form requirements; existing `pending` applications keep
  working unchanged and are reviewed as before.

## Out of Scope

- Payment-provider integration / escrow (would change the risk model entirely).
- Changing the document purge-on-decision behavior (deliberately kept).
- Admin review-UI improvements beyond the `under_review` triage lane.
