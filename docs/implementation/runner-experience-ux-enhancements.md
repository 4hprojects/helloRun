# Runner Experience UX Enhancements

**Created:** June 22, 2026
**Status:** ✅ Implemented — June 22, 2026
**Spec source:** `docs/to-implement/runner-experience.md`

---

## Overview

Two tiers of improvements targeting the most-used runner paths: paying for a registration, seeing pricing, sharing certificates, and navigating on mobile. No new backend routes or services — all changes are view-layer or lightweight JS, with one exception (adding certificate data to the dashboard query).

---

## Tier A — Documented Gaps (Spec-Required)

### A1 & B1. Payment Amount Snapshot + Free Event Confirmation

**Problem:** `event-register.ejs` only shows payment amount if `> 0`. Free events show nothing. `my-registrations.ejs` buries the amount owed in a field list.

**Changes:**
- `src/views/pages/event-register.ejs` — always show registration fee row: paid → "PHP X.XX", free → "Free — no payment required"
- `src/views/pages/my-registrations.ejs` — add prominent "Amount Due" banner at top of payment section

---

### A2. Live Price Resolution on Registration Form

**Infrastructure already exists:** `event-register.ejs` renders `<div id="raceDistancePricePreview">` with `#raceDistancePriceValue` and `#raceDistancePricePeriod` spans when `showRaceDistancePricePreview` is true. Server passes `raceDistancePricingPreview` data. Only JS wiring is missing.

**Changes:**
- `src/views/pages/event-register.ejs` — add `<script>` block at bottom that reads race distance select changes and updates the preview div from inline JSON data
- On page load: fire once for the initially selected distance
- Fallback text if no price data: "Price varies — see event details"

---

### A3. Certificate Verify & Share CTAs

**Data gap:** `cards.certificates` items currently include `submissionId` but not `certificateNumber` or `verifyUrl`. Must be added to the dashboard query.

**Changes:**
- Runner dashboard controller/route — add `certificateNumber` + `verifyUrl` to certificates data
- `src/views/runner/partials/dashboard-certificates.ejs` — add per-certificate:
  - **Verify** → `<a href="<%= item.verifyUrl %>" target="_blank">Verify</a>`
  - **Copy Link** → `<button data-copy-url="<%= item.verifyUrl %>">Copy Link</button>` with clipboard JS + fallback

---

### A4. Mobile Bottom Navigation Bar

**Changes:**
- `src/views/layouts/nav.ejs` — add `<nav class="mobile-bottom-nav">` at end, runners only (hidden for admin/organiser)
- `src/public/css/mobile-nav.css` — **new file**: `position: fixed; bottom: 0`, `display: none` default, `display: flex` at `≤768px`, safe area inset, body padding-bottom to prevent content overlap
- `src/views/layouts/head.ejs` — add mobile-nav.css link

**4 tabs:**
| Icon | Label | Route |
|------|-------|-------|
| `layout-dashboard` | Dashboard | `/runner/dashboard` |
| `calendar-days` | Events | `/events` |
| `clipboard-list` | Registrations | `/my-registrations` |
| `file-check` | Submissions | `/runner/submissions` |

Active tab uses existing `isCurrent()` helper from `nav.ejs`.

---

## Tier B — High-Impact Additions (Discovered in Audit)

### B2. Dashboard Certificates Visible by Default

- `src/views/runner/partials/dashboard-certificates.ejs` — remove `hidden` attribute from `id="certificatesPanel"` (currently hidden by default)

### B3. Rejection Reason Inline in Submissions List

- `src/views/runner/submissions.ejs` — verify rejection reason visible in list tile/table view (already in dashboard card; confirm it's also in the full list)

### B4. Toast / Success Message After Payment Proof Upload

- Payment proof upload route handler — add `?msg=Payment+proof+uploaded+successfully.&type=success` to redirect
- `src/views/pages/my-registrations.ejs` — confirm `pageMessage` is rendered

### B5. "What to Do Next" CTA for Unpaid Registrations

- `src/views/pages/my-registrations.ejs` — add callout when `paymentStatus === 'unpaid'`: "Upload your payment proof to complete registration →"

---

## Files Changed

| File | Change |
|------|--------|
| `src/views/pages/event-register.ejs` | Always show fee; add JS price resolver |
| `src/views/pages/my-registrations.ejs` | Amount due banner; unpaid CTA; pageMessage confirm |
| `src/views/runner/partials/dashboard-certificates.ejs` | Verify + Copy Link CTAs; remove hidden attr |
| `src/views/layouts/nav.ejs` | Add mobile bottom nav block |
| `src/public/css/mobile-nav.css` | **New** — bottom nav styles |
| `src/views/layouts/head.ejs` | Add mobile-nav.css link |
| Runner dashboard controller/route | Add certificateNumber + verifyUrl to certs query |
| `src/views/runner/submissions.ejs` | Add rejection reason to list view if missing |
| Payment proof upload route | Add success redirect message |

---

## Out of Scope (This Round)

Profile completeness hints, OCR explanation text, group leave confirmation, bulk export, dark mode, avatar upload — deferred to a later polish pass.

---

## Verification Checklist

- [ ] Race distance select → fee updates live, no page reload
- [ ] Free event registration → "Free — no payment required" shown (not blank)
- [ ] Paid registration → "Amount Due: PHP X.XX" prominent in payment section
- [ ] Unpaid registration → shows CTA to upload proof
- [ ] Certificates panel visible by default on dashboard
- [ ] Each certificate has Verify link + Copy Link button
- [ ] Copy Link → clipboard gets URL → button briefly shows "Copied!"
- [ ] Mobile bottom nav visible ≤768px, hidden on admin/organiser pages
- [ ] Active tab highlighted on bottom nav
- [ ] Page content not overlapped by bottom nav bar
- [ ] Rejection reason visible inline in submissions list view
- [ ] Payment proof upload → success message shown on return to my-registrations
- [ ] `npm run test:auth` → 44/44 passing
