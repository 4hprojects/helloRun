# Organiser Experience UX Enhancements

**Created:** June 22, 2026
**Status:** ✅ Implemented — June 22, 2026
**Spec source:** `docs/to-implement/organiser-experience.md`

---

## Overview

Three documented gaps assessed; two implemented (one was already done). Four high-impact additions from codebase audit included.

---

## Key Finding: Preview Parity Was Already Done

`GET /organizer/preview-event` (`src/routes/organizer.routes.js:763`) already renders `pages/event-details` with `previewMode: true` for both saved events and unsaved create-event flow. The public template handles `previewMode` with preview banner, "Back to Editor" link, and error display. `organizer/event-preview.ejs` was dead code — deleted.

---

## What Was Implemented

### A1. Reward/Pricing Conflict Validation

**New function** `validateRewardPricingConsistency(formData)` in `src/services/event-form.service.js`:

| Check | Severity | Behaviour |
|-------|----------|-----------|
| Duplicate `categoryId` in `raceCategories` | Error | Blocks publish; returned as `errors.raceCategories` |
| `distancePricing` references non-existent `categoryId` | Error | Blocks publish; returned as `errors.distancePricing` |
| Delivery fee enabled, physical rewards disabled | Warning | Non-blocking; shown in step 12 as yellow callout |
| Free event with delivery fee configured | Warning | Non-blocking; shown in step 12 as yellow callout |

Called from `validateCreateEventForm()` — errors merged into existing error object. Warnings surfaced separately in the wizard review step via `consistencyWarnings` view variable.

The `event-readiness` POST endpoint also returns `consistencyWarnings` so the JS-driven checklist refresh picks them up dynamically.

**Test:** `tests/event-reward-pricing-validation.unit.test.js` — 6/6 passing

---

### A2. Wizard 4-Phase Grouping

**Phase bar** added above the wizard content in `src/views/organizer/create-event.ejs`:

| Phase | Label | Steps |
|-------|-------|-------|
| 1 | Basic Info | 1 Event Type, 2 Core Details |
| 2 | Schedule & Format | 3 Schedule, 4 Location/Virtual, 5 Race Categories |
| 3 | Pricing & Rewards | 6 Rewards, 7 Pricing, 8 Payment Setup |
| 4 | Presentation & Publish | 9 Event Details, 10 Media, 11 Waiver, 12 Submit |

- Phase is derived from the current step in `WIZARD_STEP_DATA` (added `phase` field to each entry)
- `setActiveWizardStep()` extended to update `.is-active` and `.is-done` classes on phase segments
- Mobile: phase labels hidden at ≤600px (phase numbers still visible)
- CSS added to `src/public/css/create-event.css`

---

### ~~A2: Preview Parity~~ — Already Done
`event-preview.ejs` deleted. No implementation needed.

---

### B1. Dead Code Removal
`src/views/organizer/event-preview.ejs` deleted — never rendered by any route.

---

### B2. Filter Persistence — Already Done
The organiser submissions hub (`GET /organizer/submissions`) already reads all filters from `req.query` and pre-selects them in the view via `hub.filters`. No changes needed.

---

### B3. "Time Pending" Indicator in Review Queues

Added amber `Waiting X days` badge to:
- **Payment proof review** (`src/views/organizer/payment-proof-review.ejs`) — shown for items where `isPending === true`; raw `proofUploadedAt` date added to item data in `organizer.routes.js`
- **Submissions hub** (`src/views/organizer/submissions.ejs`) — shown for items where `status === 'submitted'`; uses existing `submittedAt` field already in data

CSS added to `src/public/css/event-manage.css` (`.waiting-label` — amber badge).

---

### B4. Warnings Display in Wizard Review Step

Step 12 of the create-event wizard now shows a yellow warning block (`#wizardConsistencyWarnings`) listing configuration warnings when the page loads. The `refreshReadinessFromServer()` async function also updates this block dynamically when the organiser edits the form.

---

## Files Changed

| File | Change |
|------|--------|
| `src/services/event-form.service.js` | Added `validateRewardPricingConsistency()`; called from `validateCreateEventForm()`; exported |
| `src/routes/organizer.routes.js` | Added `getConsistencyWarnings()` helper; passed to create-event render and readiness endpoint; added `proofUploadedAt` to payment review item data |
| `src/views/organizer/create-event.ejs` | Phase bar HTML; phase tracking in `setActiveWizardStep()`; warnings section in step 12; dynamic warnings refresh |
| `src/public/css/create-event.css` | Phase bar styles + consistency warnings styles |
| `src/views/organizer/submissions.ejs` | "Waiting X days" badge for pending submissions |
| `src/views/organizer/payment-proof-review.ejs` | "Waiting X days" badge for pending payment proofs |
| `src/public/css/event-manage.css` | `.waiting-label` amber badge styles |
| `src/views/organizer/event-preview.ejs` | **Deleted** — dead code |
| `tests/event-reward-pricing-validation.unit.test.js` | **New** — 6 unit tests, all passing |

---

## Out of Scope (This Round)

Bulk approve/reject submissions, submission/payment export reports, bib number assignment, organiser onboarding wizard, registrant messaging, leaderboard preview sandbox.

---

## Verification Checklist

- [x] `validateRewardPricingConsistency` unit tests: 6/6 passing
- [x] Duplicate category IDs → `errors.raceCategories` returned
- [x] Missing distancePricing categoryId reference → `errors.distancePricing` returned
- [x] Delivery fee without rewards → warning only (save still works)
- [x] Free event + delivery fee → warning only (save still works)
- [x] Phase bar visible in wizard; updates as user scrolls through steps
- [x] Mobile: phase labels hidden at ≤600px; numbers visible
- [x] "Waiting X days" shown on pending payment proofs
- [x] "Waiting X days" shown on pending submissions
- [x] `event-preview.ejs` deleted; no route references it
