# HelloRun — Current Status

_Last updated: June 22, 2026_

---

## ✅ Completed & Deployed

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

---

## 🟡 In Progress (Live but Incomplete)

### Runner Experience UX Gaps
**Spec:** `to-implement/runner-experience.md`

**Remaining:**
- [ ] Payment amount snapshot on registration confirmation
- [ ] Price resolution UI (show which price tier applies)
- [ ] Certificate share / download CTAs
- [ ] Mobile bottom navigation bar

---

### Organiser Experience UX Gaps
**Spec:** `to-implement/organiser-experience.md`

**Remaining:**
- [ ] Reward/pricing validation in event wizard
- [ ] Event preview parity with live event page
- [ ] Wizard phase grouping / step consolidation

---

## 🔲 Backlog (Not Started)

| Item | Priority | Spec |
|------|----------|------|
| Admin Governance (audit trail, suspension, notes, verification override) | 4 | `to-implement/admin-governance.md` |
| AdSense Readiness (8-phase roadmap: indexing → content → audit) | — | `adsense-readiness/` |
| Blog Feature (phased: submission, moderation, SEO, recommendations) | — | `blog/` |
| Advanced analytics & reporting | — | PRD.md |
| Mobile app integration | — | PRD.md |

---

## Resolved / Historical

- `to-implement/organiser-vs-platform-shop-products.md` — fully implemented June 7, 2026 (kept as design record)
