# P15 — Platform Analytics for Admins

**Priority:** P15  
**Effort:** ~1 week  
**Status:** Implemented — June 24, 2026

---

## Problem

The admin dashboard shows a handful of scalar counts (total users, events in queue, etc.) but has no visibility into platform health metrics: approval rates, time-to-review, growth trends, top performing events/organisers, or revenue. Admins must run ad-hoc database queries to answer basic operational questions.

---

## Solution

A new `/admin/analytics` page with six metric sections, all sourced from Postgres aggregate queries via a dedicated `platform-analytics.service.js`. The page reuses existing admin CSS and degrades gracefully when Postgres is unavailable.

---

## Sections

| # | Section | Key Metrics |
|---|---------|-------------|
| 1 | Platform Totals | Runners, approved organisers, published events, certificates issued |
| 2 | Run Lifecycle Funnel | Registrations → paid → submissions → approved; approval rate %; avg review time |
| 3 | Growth (last 12 months) | Monthly new user signups, broken down by runner vs organiser |
| 4 | Top 10 Events | By registration count with paid breakdown |
| 5 | Top 10 Organisers | By published event count with total registrations |
| 6 | Revenue (conditional) | Total shop orders + revenue; monthly breakdown (only shown if orders exist) |

---

## Files Created/Modified

| File | Change |
|------|--------|
| `src/services/platform-analytics.service.js` | New — all 6 query functions + `getPlatformAnalytics()` |
| `src/routes/admin.routes.js` | Add `GET /analytics` route |
| `src/controllers/admin.controller.js` | Add `analyticsPage` handler |
| `src/views/admin/analytics.ejs` | New — full analytics page |
| `src/views/admin/dashboard.ejs` | Add Analytics shortcut card |

---

## Data Sources

All queries run against Postgres (Supabase) using `getPostgresClient()`:
- `app_users` — user totals and growth
- `events_core` — event counts
- `registrations` — registration and payment funnel
- `submissions_core` — submission approval funnel and review times
- `orders` — shop revenue (conditional)

---

## Graceful Degradation

If `DATABASE_URL` is not set or Postgres is unreachable, `getPlatformAnalytics()` returns `null`. The view renders a single informational card rather than crashing.

---

## Access Control

Route protected by `requireAdmin` middleware, consistent with all other admin routes.
