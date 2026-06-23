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
