# Phase 11 Shop — Reports, Exports & Admin Settings

**Completed:** June 21, 2026
**Status:** ✅ Live — closes out Phase 11 Shop

---

## What Was Built

Three sets of 501-stub routes are now fully implemented:

### Organiser Shop Reports
| Route | Description |
|-------|-------------|
| `GET /organizer/events/:eventId/shop/reports` | HTML report page — order totals, payment/fulfilment status breakdown |
| `GET /organizer/events/:eventId/shop/reports/export.csv` | CSV download of all shop orders for the event |
| `GET /organizer/events/:eventId/shop/reports/export.xlsx` | XLSX download (ExcelJS) of all shop orders |

### Admin Shop Reports
| Route | Description |
|-------|-------------|
| `GET /admin/shop/reports` | HTML report page — platform-wide totals, status breakdowns, top events by order count & revenue |

### Admin Shop Settings
| Route | Description |
|-------|-------------|
| `GET /admin/shop/settings` | Settings form — payment methods, fulfilment defaults, global shop enable/disable |
| `PATCH /admin/shop/settings` | JSON endpoint — saves settings to `shop_platform_config` table |

---

## Files Changed

### New files
| File | Purpose |
|------|---------|
| `src/db/migrations/017_shop_platform_settings.sql` | Creates `shop_platform_config` table (single `platform` row) |
| `src/views/organizer/shop-reports.ejs` | Organiser reports HTML view |
| `src/views/admin/shop-reports.ejs` | Admin reports HTML view |
| `src/views/admin/shop-settings.ejs` | Admin settings form (JS fetch PATCH) |
| `tests/shop-reports-settings.integration.test.js` | 8 integration tests covering all new routes |
| `docs/implementation/phase-11-shop-reports-settings.md` | This document |

### Modified files
| File | Change |
|------|--------|
| `src/controllers/organizer-shop.controller.js` | Added ExcelJS import; replaced 3 stubs; added `computeOrderStats`, `getOrderExportData`, `csvEscape` helpers |
| `src/controllers/admin-shop.controller.js` | Replaced 3 stubs (`getReports`, `getSettings`, `patchSettings`) |
| `src/views/organizer/event-shop-dashboard.ejs` | Reports section now links to reports page with CSV/XLSX buttons |
| `src/views/admin/shop-dashboard.ejs` | Reports & Settings section now links to reports and settings pages |
| `docs/STATUS.md` | Marked Phase 11 as completed |

---

## Architecture Decisions

### Report data source
Reports use `listOrdersByMongoEventId()` / `listOrdersForAdmin()` from `order.service.js` — both already return the fields needed for stats (payment_status, fulfilment_status, total_amount, event_title). Stats are computed in-memory (no new SQL aggregation queries). This keeps the service layer unchanged.

### CSV/XLSX export pattern
Follows the existing registrant export pattern in `organizer.routes.js` (lines 2044–2163):
- CSV: custom `csvEscape()` helper, `Content-Disposition: attachment`
- XLSX: ExcelJS workbook, auto-width columns, bold header row

ExcelJS was already in `package.json` (v3.10.0).

### Admin settings persistence
A new `shop_platform_config` table (migration 017) stores a single `platform` row with:
- `payment_methods TEXT[]` — accepted payment methods
- `fulfilment_defaults JSONB` — optional defaults object
- `shop_enabled BOOLEAN` — platform-wide on/off switch
- `updated_at TIMESTAMPTZ` — last change timestamp

`getPostgresClient()` was already imported in `admin-shop.controller.js`.

### Settings form submission
HTML forms only support GET/POST. Since the route is `PATCH /admin/shop/settings` and the project has no `method-override` middleware, the settings form uses JavaScript `fetch` to send the PATCH request with JSON body, following the same pattern as `shop-platform-order-detail.ejs`. The response is JSON `{ success, message }`.

---

## Test Coverage
`tests/shop-reports-settings.integration.test.js` — 8 tests:
1. Organiser reports page returns 200
2. Organiser CSV export returns 200 with `text/csv` content-type
3. Organiser XLSX export returns 200 with XLSX content-type + non-empty buffer
4. Admin reports page returns 200
5. Admin settings page returns 200
6. Admin can PATCH settings and gets JSON success
7. Unauthenticated access to organiser reports redirects to login
8. Unauthenticated access to admin reports redirects

Run with: `npm run test:shop` (glob `*shop*.test.js` picks up all shop tests)

---

## Migration

Migration file: `src/db/migrations/017_shop_platform_settings.sql`

Apply with:
```bash
npm run supabase:migrate
```

The migration uses `CREATE TABLE IF NOT EXISTS` and `INSERT ... ON CONFLICT DO NOTHING` — safe to run multiple times.

---

## What's Next (Phase 11 fully closed)

Phase 11 is now ✅ complete. Next priorities per `docs/STATUS.md`:
1. **Runner Experience UX gaps** — `docs/to-implement/runner-experience.md`
2. **Organiser Experience UX gaps** — `docs/to-implement/organiser-experience.md`
3. **Admin Governance** — `docs/to-implement/admin-governance.md`
