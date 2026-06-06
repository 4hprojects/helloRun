# Runner Experience Improvements

## Document Role
- Purpose: Spec for targeted runner-facing UX gaps that are independent of the Phase 11 shop build.
- Status: Active backlog — Priority 2.
- PRD reference: See `docs/PRD.md` runner experience items and `docs/to-implement/phase-11-shop-ui.md` for shop-related runner items.

## Current Alignment Snapshot (June 2026)

Core runner flows (registration, submission, certificate, leaderboard, groups) are all working. The gaps below are polish and convenience improvements that do not require new backend services — most just need a view change or a small wiring fix.

What is working well:
- Registration flow including payment proof upload
- Submission flow with OCR, manual entry, and Strava import
- Certificate generation, email delivery, and public verification URL
- Leaderboard with distance-specific grouping (current branch)
- Running groups with member management
- Runner dashboard with accumulated progress and badge display

Gaps:
- Payment amount is not shown alongside the registration payment proof section, so runners must go back to the event listing to check what they owe
- Package and category selection during registration does not dynamically resolve and display the live price for the selected combination
- Certificate cards in the runner dashboard show the certificate but there is no direct "Verify" or "Share" CTA
- Mobile navigation relies on a hamburger menu with no bottom nav bar; the most-used runner actions require multiple taps to reach

## Feature Intent

Remove the small friction points that slow runners down on the paths they use most: paying for their registration, seeing their price, sharing their certificates, and navigating on mobile.

## Primary Users
- **Runners** — all improvements target the logged-in runner role

## MVP Scope

### 1. Payment Amount Snapshot on Registration

**Problem:** When a runner uploads a payment proof for a paid registration, the page does not show the amount they need to pay. They must open the event listing in a separate tab or remember the amount from when they signed up.

**Fix:** On the registration payment proof upload page and the pending-payment state in the runner dashboard, display a read-only "Amount Due" block drawn from the registration's stored price at the time of signup. The value should be:
- The package price (if a package was selected)
- The base registration fee (if no package)
- Currency and any applicable add-on totals

**Where to change:**
- `src/views/runner/registration-payment.ejs` (or equivalent payment proof page) — add amount block above the upload form
- `src/views/runner/dashboard.ejs` — payment pending card should show amount
- No service change needed; the value already exists on the Registration model

**Acceptance:**
- Runner can see the exact amount to pay without leaving the page
- Amount reflects the price at registration time, not a live recalculated value

### 2. Package and Category Selection with Live Price Resolution

**Problem:** During event registration, selecting a package or race category does not update the visible price in real time. Runners must infer what they will pay from static event description text.

**Fix:** On the event registration form, wire package and category selectors to a client-side price resolver:
- When a runner selects a package or category, the displayed "Registration Fee" updates immediately
- Price data should come from the event's category/package data already rendered in the page (no extra API call needed for static events; a lightweight endpoint can support dynamic pricing if needed)
- Show a clear "Fee: ₱X.XX" line that updates on selection change

**Where to change:**
- `src/views/events/register.ejs` (or equivalent) — add JS price-update handler on package/category select
- `src/public/js/` — small inline script or dedicated file for price resolution logic

**Acceptance:**
- Selecting a different package or category immediately updates the displayed fee
- The correct amount is confirmed in the review step before submission
- Works without a page reload

### 3. "Verify / Share" CTA on Certificate Cards

**Problem:** Runner dashboard shows a certificate section, but certificate cards do not have a direct action to share or open the public verification URL. Runners who want to post their certificate must manually copy the URL from elsewhere.

**Fix:** On each certificate card in the runner dashboard:
- Add a "Verify" button (external link icon) that opens `GET /certificates/:id/verify` in a new tab
- Add a "Copy Link" or "Share" button that copies the verification URL to the clipboard using the Web Clipboard API
- If the certificate has a QR code, show a small "QR" or "Download" icon that lets the runner download or view the QR image

**Where to change:**
- `src/views/runner/dashboard.ejs` — certificate card partial or section
- `src/public/js/` — clipboard copy handler (short inline script; no framework needed)

**Acceptance:**
- Runner can reach the public certificate verification page in one click from the dashboard
- "Copy Link" action works on desktop and mobile browsers that support the Clipboard API
- Falls back gracefully (shows the URL in a prompt or selectable text) if Clipboard API is unavailable

### 4. Mobile Bottom Navigation Bar

**Problem:** On mobile, the hamburger menu requires two taps (open menu → tap item) for every navigation action. The most-used runner flows — Submit Run, Browse Events, and Dashboard — are buried behind the menu every time.

**Fix:** Add a fixed bottom navigation bar for small screens that surfaces the 4–5 most-used runner actions:
- Dashboard (home icon)
- Browse Events
- Submit Run
- My Registrations or My Orders (once shop is live)
- Profile / Account

**Implementation notes:**
- CSS-only bottom nav bar using `position: fixed; bottom: 0` inside a `@media (max-width: 768px)` block
- Add to `design-system.css` or a dedicated `mobile-nav.css` under `src/public/css/`
- Include in the base layout partial (`src/views/partials/`) so it appears on all authenticated runner pages
- Hide on Organiser and Admin pages (use a body class or layout-level conditional)
- Ensure the bottom bar does not overlap page content — add `padding-bottom` to the page body equal to bar height

**Acceptance:**
- Bottom nav bar is visible on screens narrower than 768px
- Tapping any icon navigates to the correct route
- Active route is highlighted (current-page indicator)
- Bottom bar does not overlap content or form submit buttons
- Hamburger menu remains functional for less common actions

## Test Coverage Targets

- Price resolution: unit test for the price-update logic (if extracted to a server-side helper)
- Payment amount display: integration test asserts the registration payment page contains the expected amount
- Certificate CTA: integration test asserts certificate cards include a verify link with the correct URL
- Mobile nav: no automated test needed; verify manually in browser dev tools responsive mode and on a physical device if available
