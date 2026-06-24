# HelloRun — Current Status

_Last updated: June 24, 2026_

---

## ✅ Completed / Ready to Deploy

| Feature | Completed | Tests |
|---------|-----------|-------|
| Event creation wizard (12-step) | Feb–Mar 2026 | — |
| Runner registration & submission flow | Mar 2026 | — |
| Leaderboard (distance-specific, private/public) | Apr 2026 | — |
| Certificate generation & email delivery | Apr 2026 | — |
| Organiser application & approval | Apr 2026 | — |
| Running groups | Apr 2026 | — |
| OCR run-proof reader (COROS support) | Apr 2026 | — |
| Strava OAuth integration | Apr 2026 | — |
| Phase 7 Extended — onsite operations (bulk bibs, QR check-in, webhooks) | May 17, 2026 | 16/16 |
| Payment & result split | May 14, 2026 | — |
| Achievement badges system (event/global/organiser) | May 19, 2026 | 101/101 |
| Policy pack (Privacy, Terms, Cookie, Refund, 9 canonical docs) | May 23, 2026 | — |
| Admin user management (search, filter, edit, guarded delete) | May–Jun 2026 | — |
| About page rebuild | June 3, 2026 | — |
| Auth abuse protection (Turnstile, rate limits, honeypot, form-age) | June 3, 2026 | 44/44 |
| Run proof review workflow | June 3, 2026 | — |
| Shop backend + cart/checkout/platform-merch | June 7, 2026 | 69/69 |
| Phase 11 — Shop reports, exports & admin settings | June 21, 2026 | 69/69 + 8 new |
| DB Priority 1 — Postgres pool (25), sync failure logging, `/healthz/sync` | June 22, 2026 | — |
| Runner Experience UX — payment snapshot, price resolver, certificate CTAs, mobile nav, unpaid CTA | June 22, 2026 | — |
| Organiser Experience UX — reward/pricing validation, wizard phase bar, time-pending indicators, warnings | June 22, 2026 | 6/6 unit |
| Badge system — profile imageUrl bug fix, type-specific placeholders, definition-level image, upload, earned count | June 22, 2026 | 44/44 auth |
| Admin Governance — audit trail, admin notes, resend/override verification, account suspension | June 22, 2026 | 10/10 + 44/44 |
| Quick Wins — console.error→logger, rate limiting (profile/groups), OG tags (cert verify), profile picture upload + nav avatar | June 22, 2026 | 44/44 |
| P2 Onboarding — firstLogin detection, welcome banner, profile nudge, welcome email, improved empty states | June 22, 2026 | 44/44 |
| P7 Bulk Organiser Actions — bulk submission approve, bulk payment approve, email unpaid registrants | June 22, 2026 | 44/44 |
| P6 Proof Rejection Guidance — contextual fix tips, metadata edit form (no new proof), Strava guard, button rename | June 22, 2026 | 44/44 |
| P3 DB Architecture Priority 2 — sync retry worker (migration 020), Postgres query timeout (8s), worker wired into server startup | June 22, 2026 | passing |
| Submission Review Workflow — AJAX panel (no iframe), inline approve/reject, quick-approve, auto-advance, OCR collapsed, lightbox, keyboard shortcuts | June 22, 2026 | passing |
| P10 Event Wishlist — save/unsave toggle, heart button on cards + detail page, saved events dashboard section | June 22, 2026 | 17/17 auth |
| P14 Related Events — Similar Events section on event detail page, 3-tier priority (organiser → distance → open), 3-column grid | June 23, 2026 | 17/17 auth |
| P12 Blog Scheduled Publishing — publishScheduledBlogs() worker, 5-min interval, startBlogSchedulerWorker() wired into server | June 23, 2026 | 17/17 auth |
| Full Refinement Pass — audit fix, safe JSON errors, ads.txt, public content expansion, 15-post AdSense seed inventory, safer ad loading, docs reconciliation | June 24, 2026 | focused unit/smoke assertions |
| Run completion workflow hardening — SQL injection fix (ranking.service), missing DB indexes (proof.hash, certificate.url, Strava PR), approval latency decoupled (cert+notify fire-and-forget), parallel notifications, atomic cert race-condition lock, Redis leaderboard cache (60s TTL), parallel multi-reg submissions, auto-sync Supabase rankings after approval | June 24, 2026 | `ranking.service.unit.test.js` passes |
| P4 Personal Leaderboard Rank — "Ranked #N of M verified runners" shown in My Standing card on event leaderboard page | June 24, 2026 | — |
| Organizer Workflow Phase 1A — CSRF protection added to organizer payment/run-proof review actions plus event status/media removal mutations; security route matrix updated | June 24, 2026 | `tests/csrf-route-guards.integration.test.js` |
| Organizer Workflow Phase 1B — payment approve/reject now use atomic status transitions and preserve registration shadow sync after non-save updates | June 24, 2026 | `tests/payment-route-guards.integration.test.js` |
| Organizer Workflow Phase 1C — standard and accumulated run-proof approve/reject writes now use exact-status stale-action guards | June 24, 2026 | `tests/submission-review-route-guards.integration.test.js` |
| Organizer Workflow Phase 2A — run-proof review queue now resolves search/counts in MongoDB and fetches bounded sorted windows before merging standard + accumulated proofs | June 24, 2026 | `tests/submission-review-route-guards.integration.test.js` |
| Organizer Workflow Phase 2B — payment-proof review queue now paginates exact filtered matches and fetches one bounded registration page at a time | June 24, 2026 | `tests/payment-route-guards.integration.test.js` |
| Organizer Workflow Phase 2C — registrants page now paginates filtered rows and narrows result-status filters before fetching registration details | June 24, 2026 | `tests/submission-review-route-guards.integration.test.js` |
| Organizer Workflow Phase 3A — organizer dashboard queue, range, and top-event metrics now use aggregate facets instead of many independent count queries | June 24, 2026 | `tests/organizer-dashboard-analytics.integration.test.js` |
| Organizer Workflow Phase 3B — registrants summary cards now use grouped aggregation counts instead of separate count queries per card | June 24, 2026 | `tests/submission-review-route-guards.integration.test.js` |
| Organizer Workflow Phase 3C — unpaid-payment reminder action now batches runner lookup before dispatching emails | June 24, 2026 | `tests/csrf-route-guards.integration.test.js` |
| Organizer Workflow Phase 4A — eligible run-result options now expose upload deadline and modal cards show it before submission | June 24, 2026 | `tests/submission.service.integration.test.js`, `tests/runner-dashboard-modal.integration.test.js` |
| Organizer Workflow Phase 4B — expired event upload windows now return context so the modal explains why only Personal Record is available | June 24, 2026 | `tests/submission.service.integration.test.js`, `tests/runner-dashboard-modal.integration.test.js` |
| Organizer Workflow Phase 5A — runner submission eligibility checks now have a shared Redis/in-memory rate limit for submission-rush protection | June 24, 2026 | `tests/runner-dashboard-modal.integration.test.js` |
| Organizer Workflow Phase 5B — Strava activity refresh and Strava result submission endpoints now have shared rate limits for external API and submission-rush protection | June 24, 2026 | `tests/strava-integration.integration.test.js` |
| Organizer Workflow Phase 5C — organizer registrant CSV/XLSX exports now have a shared rate limit for large-event download protection | June 24, 2026 | `tests/organizer-route-source.unit.test.js` |
| Organizer Workflow Phase 5D — organizer shop report CSV/XLSX exports now have a shared rate limit for large-order download protection | June 24, 2026 | `tests/organizer-route-source.unit.test.js` |
| Organizer Workflow Phase 5E — run-proof single and bulk review mutations now have a dedicated shared rate limit separate from payment review actions | June 24, 2026 | `tests/organizer-route-source.unit.test.js` |
| Runtime Stabilization Phase 6A — accumulated activity submissions no longer trigger submission-service circular dependency warnings or missing-helper failures | June 24, 2026 | `tests/submission.service.integration.test.js --test-name-pattern accumulated` |
| Runtime Stabilization Phase 6B — submission service integration tests now run certificate/notification background work inline when requested, making certificate/email assertions deterministic | June 24, 2026 | `tests/submission.service.integration.test.js` 46/46 |
| Runtime Stabilization Phase 6C — submission service integration tests now suppress shadow/ranking sync side effects, removing noisy background errors from the suite output | June 24, 2026 | `tests/submission.service.integration.test.js` 46/46 |
| Runtime Stabilization Phase 6D — runner screenshot and Strava result submissions now use short-lived Mongo idempotency locks to prevent concurrent duplicate organizer work | June 24, 2026 | `tests/submission-idempotency.service.integration.test.js`, `tests/submission-idempotency-source.unit.test.js`, `tests/submission-routes.integration.test.js` |
| Runtime Stabilization Phase 6E — payment receipt uploads now use short-lived Mongo idempotency locks to prevent concurrent duplicate payment review work | June 24, 2026 | `tests/submission-idempotency.service.integration.test.js`, `tests/submission-idempotency-source.unit.test.js`, `tests/page-controller-payment-proof-sync.unit.test.js` |
| Runtime Stabilization Phase 6F — shop order payment receipt uploads now use short-lived Mongo idempotency locks to prevent concurrent duplicate shop payment review work | June 24, 2026 | `tests/submission-idempotency-source.unit.test.js`, `tests/shop-runner-payment-actions.integration.test.js` |
| Runtime Stabilization Phase 7A — registration/shop payment proof submissions plus registrant/shop export downloads now write critical audit events | June 24, 2026 | `tests/audit-source.unit.test.js`, `tests/page-controller-payment-proof-sync.unit.test.js` |
| Runtime Stabilization Phase 7B — admins and organisers can filter critical audit history for payment proofs, exports, reminders, review actions, and account governance | June 24, 2026 | `tests/audit-source.unit.test.js` |
| Runtime Stabilization Phase 7C — audit consoles now show anomaly signals for export bursts, rejection bursts, and rapid review/export activity | June 24, 2026 | `tests/audit-source.unit.test.js` |
| Badge system refinement — early generation at event save, Badges wizard step (13-step wizard), event logo as badge image fallback, badge previews on public event detail page | June 24, 2026 | — |
| P5 Social sharing — certificate verify page share buttons + og:image; submission detail "Share your achievement" strip; badge detail page was already complete | June 24, 2026 | — |
| P8 Email notification settings — runner profile Notifications section with 5 opt-outable event types; user-level emailOptOut stored on User model; communication.service respects opt-out (email suppressed, in-app still fires) | June 24, 2026 | — |
| P4 Personal leaderboard rank — "Ranked #N of M verified runners" in My Standing card on event leaderboard page | June 24, 2026 | — |
| P11 Admin user management gaps — accountStatus filter on user list; lastLoginAt field tracked on login and shown in list + detail; earned badge list section on user detail page | June 24, 2026 | `tests/admin-governance.integration.test.js`, `tests/admin-users.integration.test.js` |

---

## 🟡 In Progress / Follow-Up

- Production AdSense follow-up: deploy current main, run `npm run seed:adsense-blog` if needed, verify live `/robots.txt`, `/sitemap.xml`, `/ads.txt`, submit/refresh sitemap in Search Console, then request review after crawl stability.
- Test runtime follow-up: several server-spawning smoke/integration tests pass assertions locally but do not exit cleanly during teardown in this environment; investigate open handles separately.
- Documentation follow-up: keep `docs/to-implement/*` files as historical design records unless a new gap reopens.

---

## 🔲 Backlog (Not Started)

| Item | Priority | Spec |
|------|----------|------|
| Advanced analytics & reporting | — | PRD.md |
| Mobile app integration | — | PRD.md |

---

## Resolved / Historical

- `to-implement/organiser-vs-platform-shop-products.md` — fully implemented June 7, 2026 (kept as design record)
- `to-implement/admin-governance.md` — implemented June 22, 2026 (kept as design record)
- `to-implement/runner-experience.md` — core listed UX items implemented June 22, 2026 (kept as design record)
- `to-implement/organiser-experience.md` — core listed UX items implemented June 22, 2026 (kept as design record)
- `adsense-readiness/` — local code readiness implemented; production crawl/review remains operational
- `blog/` — core blog workflow implemented; AdSense seed inventory expanded June 24, 2026
