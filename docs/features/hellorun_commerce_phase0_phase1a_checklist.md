# HelloRun Commerce: Phase 0 and Phase 1A Engineering Checklist

This checklist maps implementation work to exact files in the current repository.

## Scope

- Phase 0: PRD and architecture lock
- Phase 1A: commerce data foundation (no event shop/cart UI yet)

## Phase 0: Architecture Lock

- [x] Confirm schema strategy in PRD decision log:
  - Target: docs/features/hellorun_shop_and_shop_management_prd.md
- [x] Confirm canonical naming policy (table names, enum values, route spelling):
  - Target: docs/features/hellorun_shop_and_shop_management_prd.md
- [x] Confirm manual payment proof as MVP payment mode:
  - Target: docs/features/hellorun_shop_and_shop_management_prd.md
- [x] Confirm additive migration rule (no edits to applied migrations):
  - Reference: src/scripts/run-supabase-migrations.js

## Phase 1A: Data and Service Foundation

### A. PostgreSQL Migrations

- [x] Add migration file for missing/adjusted commerce tables and indexes:
  - New file: src/db/migrations/010_phase10_shop_foundation_alignment.sql
- [x] Add migration file for follow-up constraints or performance indexes:
  - New file: src/db/migrations/011_phase10_shop_foundation_hardening.sql
- [x] Ensure migration order and execution compatibility:
  - Reference: src/scripts/run-supabase-migrations.js
  - Reference: src/db/migrations/008_phase8_shop_commerce.sql

### B. Mongo Models (Flexible Content)

- [x] Add product content model:
  - New file: src/models/ShopProductContent.js
- [x] Add media metadata model:
  - New file: src/models/ShopMediaMetadata.js
- [x] Add order notes model:
  - New file: src/models/ShopOrderNotes.js
- [x] Add policy snapshot model:
  - New file: src/models/ShopPolicySnapshot.js

### C. Shop Services

- [x] Add product service:
  - New file: src/services/shop/product.service.js
- [x] Add variant service:
  - New file: src/services/shop/variant.service.js
- [x] Add order service with server-side total recalculation:
  - New file: src/services/shop/order.service.js
- [x] Add payment review service for manual proof flow:
  - New file: src/services/shop/payment-review.service.js
- [x] Add inventory movement service:
  - New file: src/services/shop/inventory.service.js

### D. Access Control and Validation

- [x] Add shop policy middleware and ownership guards:
  - New file: src/middleware/shop-access.middleware.js
- [x] Add shop request validators:
  - New file: src/middleware/shop-validation.middleware.js
- [x] Integrate with existing auth middleware:
  - Reference: src/middleware/auth.middleware.js

### E. Routing Skeleton (No Full UI Yet)

- [x] Add public/runner shop route module:
  - New file: src/routes/shop.routes.js
- [x] Add organizer shop route module:
  - New file: src/routes/organizer-shop.routes.js
- [x] Add admin shop route module:
  - New file: src/routes/admin-shop.routes.js
- [x] Mount new route modules in server bootstrap:
  - Target: src/server.js
  - Reference: src/routes/pageRoutes.js
  - Reference: src/routes/organizer.routes.js
  - Reference: src/routes/admin.routes.js

### F. Minimal Controller Stubs

- [x] Add shop controller (public/runner endpoints):
  - New file: src/controllers/shop.controller.js
- [x] Add organizer shop controller:
  - New file: src/controllers/organizer-shop.controller.js
- [x] Add admin shop controller:
  - New file: src/controllers/admin-shop.controller.js

### G. Testing Baseline

- [x] Add migration/schema smoke tests (table existence and essential constraints):
  - Implemented in: tests/shop-schema.test.js
- [x] Add service-level product, variant, order total, and payment review transition tests:
  - Implemented in: tests/shop-services.test.js
- [x] Add route guard/access control and validation tests:
  - Implemented in: tests/shop-validation.middleware.test.js
  - Implemented in: tests/shop-readonly-routes.test.js
- [x] Add organizer payment review action integration tests (approve/reject flow):
  - Implemented in: tests/organizer-shop-payment-review-actions.test.js
- [x] Add registration add-on to order/payment bridge tests:
  - Implemented in: tests/registration-addons-read.test.js

## Exit Criteria

- [x] Decision log is fully completed in PRD.
- [x] New migrations apply successfully via migration runner.
- [x] Core shop services pass unit tests.
- [x] Route skeleton compiles and is mounted without regressions.
- [x] Access control and validation middleware are wired and covered by tests.
- [x] No existing registration/payment workflows are broken.

## May 18 Alignment Note

Phase 1A is complete, but most route modules beyond read-only JSON are still scaffolds that intentionally return 501.

Live backend surfaces:

- [x] Public event shop product list JSON.
- [x] Runner order list JSON.
- [x] Organiser product list JSON.
- [x] Organiser variant list JSON.
- [x] Organiser payment-review list JSON.
- [x] Organiser payment-review approve/reject action.
- [x] Registration add-on to linked shop order/payment bridge.

Still scaffolded:

- [ ] Event product detail page.
- [ ] Cart and checkout.
- [ ] Runner order detail/payment/cancel pages.
- [ ] Organiser shop dashboard UI.
- [ ] Organiser product/variant write UI and endpoints.
- [ ] Organiser fulfilment/report/export UI.
- [ ] Admin shop dashboard and product/order/payment management.
- [ ] Global `/shop` catalog.

Recommended Phase 1B start:

1. Render `GET /events/:eventSlug/shop` as an HTML page for browser requests while preserving JSON.
2. Render `GET /events/:eventSlug/shop/:productSlug` using the existing product/variant services.
3. Render runner order history and order detail pages for registration add-on orders that already exist.

## May 19 Release-Readiness Note

The latest split regression sweep included the shop-adjacent release paths:

- `tests/organizer-shop-payment-review-actions.test.js`
- `tests/registration-addons-read.test.js`
- `tests/shop-readonly-routes.test.js`
- `tests/shop-services.test.js`
- `tests/shop-validation.middleware.test.js`

Result: 19/19 passing.

No change to Phase 1B priority: build the event-scoped shop listing page, product detail page, and runner order detail pages next.

## Out of Scope for This Checklist

- Event shop product discovery UI
- Cart and checkout UI flows
- Full organizer dashboard pages for products/orders/fulfilment
- Admin approval queue UI
- Payment gateway automation and webhooks
