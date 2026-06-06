# Organiser Experience Improvements

## Document Role
- Purpose: Spec for organiser-facing UX gaps in event management — separate from the Phase 11 shop organiser surfaces.
- Status: Active backlog — Priority 3.
- PRD reference: See `docs/PRD.md` organiser experience items and `docs/to-implement/phase-11-shop-ui.md` for shop-specific organiser items.

## Current Alignment Snapshot (June 2026)

The organiser event management flow covers the full event lifecycle: create → publish → manage registrations → review run proofs → run on-site check-in → generate reports. The gaps below are in validation robustness, preview fidelity, and creation workflow usability.

What is working well:
- 12-step event creation wizard with category, pricing, reward, and gallery steps
- Organiser dashboard with event list, registration counts, and payment-review queue
- On-site check-in and QR scanner
- Payment proof review with approve/reject, audit log, and badge evaluation
- Run proof (submission) review with bulk actions
- Gallery image upload with individual image removal (added June 1 2026)

Gaps:
- Reward/pricing configuration can be saved in a conflicting state (e.g. a reward threshold that references a category that no longer exists, or a free event with a payment-required reward)
- The organiser event preview page does not render identically to the public event detail page — organisers see a different layout and miss information
- The 12-step linear wizard has no grouping or collapsible structure, which makes the creation flow feel daunting for new organisers

## Feature Intent

Make organiser event management more reliable (catch configuration errors before publish), more transparent (preview exactly what runners will see), and less daunting (reduce the cognitive load of the creation wizard).

## Primary Users
- **Organisers** — all improvements target the logged-in organiser role

## MVP Scope

### 1. Reward/Pricing Conflict Pre-Save Validation

**Problem:** An organiser can save an event configuration where reward rules conflict with pricing rules. Examples:
- A reward references a race category that has been deleted or renamed
- A free event has a reward that requires payment verification before awarding
- A distance-based reward threshold is set below the minimum category distance, making it unreachable
- Multiple categories share the same name or category ID due to stale hidden fields (a bug fixed June 1, but pre-existing data may still be inconsistent)

**Fix:** Add server-side validation in the event save/update service that checks for these conflicts before persisting:
1. Every reward's linked `categoryId` must exist in the event's current `categories` array
2. If `registrationFee === 0` (free event), rewards requiring `paymentVerified` status should be flagged as a warning (not a hard block — allow saving with a warning message)
3. Race category distances must be positive numbers; distance-based reward thresholds must be within the range of at least one category distance
4. Category IDs must be unique within the event (normalisation guard, extends the June 1 fix)

**Where to change:**
- `src/services/event.service.js` (or the relevant update service) — add a `validateRewardPricingConsistency(eventData)` helper called before save
- Return structured validation errors to the controller
- Surface errors in the organiser wizard step that owns the conflicting field (reward step and pricing step)
- Add a validation summary block at the top of the edit form listing all conflicts when the organiser tries to publish

**Acceptance:**
- Saving an event with a reward referencing a non-existent category returns a 400 with a descriptive error listing the offending reward name and the missing category
- Free events with payment-gated rewards show a warning banner but can still be saved as draft
- Valid events save without any new validation overhead visible to the organiser
- Add `tests/event-reward-pricing-validation.unit.test.js` covering the validation helper in isolation

### 2. Event Preview Parity with Public Template

**Problem:** The organiser event preview page (`/organizer/events/:eventId/preview`) renders a different EJS template than the public event detail page (`/events/:eventSlug`). Organisers cannot accurately judge what runners will see — especially for new layout additions, gallery sections, or leaderboard blocks.

**Fix:** Refactor the preview route to render the same EJS partial as the public event detail page, with a non-destructive "preview banner" overlay that communicates:
- "You are viewing this event as a runner would see it"
- A link back to the organiser edit view
- Publication status badge (Draft / Scheduled / Live)

**Implementation approach:**
- Extract the main body of `src/views/events/event-details.ejs` into a shared partial: `src/views/partials/event-detail-body.ejs`
- Include that partial in both `event-details.ejs` and the organiser preview template
- The preview template adds a fixed top banner with the "preview mode" notice
- Pass an `isPreview: true` flag so conditional blocks (e.g. registration CTA) can render appropriately (show a disabled register button rather than a live one)

**Where to change:**
- `src/views/events/event-details.ejs` — extract body to partial
- `src/views/organizer/event-preview.ejs` — replace current content with partial include + preview banner
- `src/routes/organizer.routes.js` + `src/controllers/organizer.controller.js` — ensure preview controller loads the same data shape as the public event detail controller

**Acceptance:**
- Organiser preview and public event detail render identically for the same event data
- Preview banner is visible and links back to the edit view
- Registration CTA in preview is disabled or marked "Registration disabled in preview"
- Existing organiser preview tests continue to pass

### 3. Event Creation Wizard — 4-Phase Grouping

**Problem:** The 12-step linear event creation wizard presents every configuration option in sequence without any sense of progress phases or logical grouping. New organisers frequently lose track of where they are or abandon the form mid-way. Steps that belong to the same concern (e.g. all pricing and category steps) are far apart in the sequence.

**Fix:** Reorganise the 12 steps into 4 named phases displayed as a segmented progress indicator:

| Phase | Label | Steps |
|-------|-------|-------|
| 1 | Basic Info | Event name, description, type, tags |
| 2 | Schedule & Format | Dates, location, distances/categories, race format |
| 3 | Pricing & Rewards | Registration fee, packages, badges, certificates |
| 4 | Presentation & Publish | Banner image, gallery, visibility, publish |

**Implementation approach:**
- The underlying step sequence does not need to change — only the progress indicator UI changes
- Replace the current linear step dots/numbers at the top of the wizard with a 4-segment phase bar, where each segment label is bold when any of its steps are active
- Within each phase, the existing per-step sub-indicator (e.g. "Step 4 of 12") can remain or be replaced with "Step 2 of 3 in Schedule & Format"
- No step logic or validation changes required for the first version

**Where to change:**
- `src/views/organizer/event-wizard.ejs` (or the wizard layout partial) — update the progress indicator markup
- `src/public/css/` — add phase bar styles; reuse existing wizard CSS variables where possible
- `src/public/js/` — update any JS that tracks `currentStep` to also compute `currentPhase` for the phase bar highlight

**Acceptance:**
- Phase bar is visible at the top of every wizard step
- Active phase segment is visually distinct from inactive segments
- Clicking a phase segment navigates to the first step of that phase (or is a non-interactive indicator — either is acceptable for MVP)
- All existing wizard step navigation (Next, Back, Save Draft) continues to work unchanged
- Responsive: phase bar is readable on mobile (abbreviate labels if needed)

## Test Coverage Targets

- Reward/pricing validation: unit tests in a new `tests/event-reward-pricing-validation.unit.test.js`
- Preview parity: integration test asserts that the same event renders the same key content in both the public detail route and the organiser preview route
- Wizard phase bar: no automated test needed; verify visually across step transitions and screen sizes
