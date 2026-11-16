# Event Experience v2 Implementation Report

## Outcome

Event Experience v2 modernizes `/events/:slug` without changing event identifiers, URLs, storage schemas, registration, payment, proof, leaderboard, badge, certificate, organizer, or participant business rules. The page remains EJS-based and uses the existing `event-public-view.js`, stylesheet, and event workflows.

## Phase delivery

### Phase 0: source-of-truth audit

- Traced create, edit, preview, public, registration, and participant flows.
- Recorded the field-to-display contract, lifecycle matrix, duplication map, risks, and revised implementation plan in [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md).
- Baseline DB-free event tests passed: 100 tests, 0 failures.

### Phase 1: decision-first presentation

- Added a responsive event overview for period, venue/access, categories/goals, fee, and registration deadline.
- Reduced repeated hero actions and removed the repeated signup/stat blocks.
- Added event-type-specific onsite, virtual, and hybrid participation language.
- Kept one dominant registration action and preserved share, save, leaderboard, shop, waitlist, and participant actions.
- Hid repeated hero/sidebar price panels below the desktop layout because the overview and contextual action already carry those facts.

### Phase 2: organizer and preview alignment

- Updated create/edit guidance to explain which structured settings appear automatically.
- Public and preview views use the same event presentation builder.
- Strava activity import appears only when `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and `STRAVA_REDIRECT_URI` are configured.
- Existing stored Strava selections remain preserved during edits when the integration is unavailable.
- Historic `gps` proof values remain readable. No stored records were rewritten.
- Purely virtual events without a venue show `Anywhere`; hybrid events without venue data no longer do.

### Phase 3: pricing, capacity, rewards, lifecycle, and SEO

- Period prices show only the active checkout price. An event outside an active pricing window shows `Not currently available` instead of a historical minimum.
- Category availability uses the same `slots` and `reserved` fields as registration and waitlist logic.
- Reward descriptions, claiming instructions, delivery details, and special benefits now map through the public view model.
- Future, open, closed, ended, unavailable, and defensive cancelled states produce distinct registration presentation.
- Onsite and hybrid events with valid dates and physical locations emit hardened Schema.org `Event` JSON-LD.
- Fully virtual events do not emit physical Event structured data.
- Variable-price events omit an SEO offer instead of publishing a misleading single price.

### Phase 4: hardening and verification

- Added a valid `main-content` skip-link target.
- Added explicit XSS allowlist coverage for server-hardened event JSON-LD.
- Added a reproducible browser fixture for viewport and visual checks.
- Completed syntax, format, documentation, focused unit, focused integration, responsive browser, XSS, schema, lifecycle, and state checks.

## Important decisions

- No database migration or frontend framework was needed.
- The existing Event schema does not support a persisted `cancelled` status. The public builder handles it defensively, but no schema enum or lifecycle mutation was added.
- Stored organizer descriptions were not rewritten. Structured facts are presented as authoritative above optional rich content.
- Effective Strava capability is runtime-derived. Manual details and screenshot proof remain available independently.
- SEO offers are emitted only for free events or unambiguous fixed-price events.

## Verification evidence

Commands were run from the feature branch with remote database variables removed where applicable.

- `npm run lint:check`: passed; 1,114 JavaScript files and 183 EJS templates checked.
- `npm run format:check`: passed; 2 JSON files and 101 automation files checked.
- `npm run docs:check`: passed before this report; rerun required after documentation changes.
- Focused event, XSS, registration, waitlist, proof, participant-state, and step suites: 151 passed, 0 failed.
- Create-form and registration-price integration suites: 35 passed, 0 failed.
- Full unit suite: 2,650 passed, 2 failed. Both failures are in concurrent uncommitted OCR work (`ocr-admin-ui.unit.test.js` and `ocr-platform-aware.unit.test.js`) and do not touch Event Experience v2 files.
- Chromium 156 rendered widths 320, 360, 375, 390, 430, 768, 1024, 1280, and 1440 CSS pixels.
- Browser DOM checks at 390 pixels reported one H1, no horizontal overflow, a visible status, a primary action, and a valid skip-link target.
- Representative screenshots at 320, 390, 768, and 1440 pixels were visually inspected. Hero, overview, sticky action, desktop sidebar, and responsive layering showed no overlap in the inspected captures.

## Known limitations

- Local Node is `v20.20.2`; `package.json` requires Node `>=22.0.0`. Verification passed under Node 20, but CI and deployment review must rerun on Node 22 or newer.
- No field Core Web Vitals data or Lighthouse environment was available. No LCP, INP, or CLS score is claimed.
- Chromium command-line checks covered rendering and layout. Gallery/poster keyboard behavior remains covered by existing source-level interaction tests, not an automated browser driver.
- Full repository unit status is not clean because the shared worktree contains unrelated, uncommitted OCR implementation and two associated failing tests.

## Deployment handoff

1. Review the feature-branch commits and this report.
2. Run CI with Node 22 or newer and isolated test services.
3. Verify representative published, preview, free, paid, virtual, onsite, hybrid, accumulated, full-category, and ended events in staging.
4. Validate production Strava configuration before expecting activity import to appear.
5. Deploy through the normal release process only after review. No production data migration is required.

Rollback is code-only: revert the four Event Experience v2 feature commits in reverse order. No stored data requires rollback.
