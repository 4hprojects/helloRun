# End-to-End Testing and Release Gates

## Mandatory suites
1. Unit: naming, 6-category template, PHT time boundaries, 28/29/30/31-day months, 22nd registration deadline, 14-day submission cutoff, year rollover.
2. Integration: create series/version, draft from template, event registration and category locking, proof submission/review, accumulated approved distance, badges/certificates, leaderboard, public event rendering.
3. Concurrency: concurrent generator requests, publish race, duplicate activities, single award, retries.
4. Authorization: nonadmin series edits blocked, unauthenticated published/draft visibility, CSRF/XSS/upload constraints preserved, fail-closed flags.
5. Regression: existing standalone events, Active Run historical URLs, existing submission tabs, prior certificates and leaderboard behavior.
6. Accessibility: keyboard controls, focus/labels, text contrast, mobile layout, screen reader status.

## Representative fixtures
November 2026 (30 days), February 2027 (28), February 2028 (29), December 2026 into January 2027, registration on day 22/day 23, submission on day 14/day 15 next month, conflicting screenshot/URL metrics, unavailable URL, OCR low-confidence, valid provider sync vs Coming Soon.

## Manual acceptance walkthrough
- Authorized admin creates November draft, sees correct dates and copy, attaches six badges + certificate, previews, publishes.
- Participant registers free, chooses 50KM, uploads proof dated inside event window, gets pending then approved distance; crossing 50KM issues correct category reward after allowed finalization.
- Same activity resubmitted to edition is flagged or blocked; privacy settings work.
- Event closes registration after Nov 22 but allows existing participant proof until Dec 14 inclusive.
- Historical pages remain unchanged.
- Turn off scheduler, see no new drafts; resume and safely backfill.

## Gate per PR
Include test command output, lint/typecheck/build output where applicable, migration/rollback plan, before-after screenshots for UI, known limitations, manual QA sign-off. Never equate generated code with verified deployment.
