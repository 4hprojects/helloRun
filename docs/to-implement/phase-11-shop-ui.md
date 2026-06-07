# Phase 11 Shop UI

## Document Role
- Purpose: Spec for all remaining Phase 11 shop UI surfaces.
- Status: Active backlog — Priority 1.
- PRD reference: See `docs/PRD.md` Phase 11 and `docs/shop_feature.md` for full backend context.

## Current Alignment Snapshot (June 7, 2026 — updated, UI conversion + runner payment-proof/cancellation + cart + checkout + platform-merch complete)

**This snapshot replaces the June 2026 version below, which significantly understated progress.** A code/test audit on June 7, 2026 found that most organiser/admin write flows previously listed here as `[SCAFFOLD 501]` were actually implemented, route-wired, access-controlled, and covered by passing tests. That audit identified two kinds of remaining work — genuinely-missing features (true 501) and UI polish (implemented-but-ugly inline-HTML pages). **The UI-polish half of that work is now done**: every page that rendered through a hand-rolled inline-HTML-string helper (`renderManagementHtml`, `renderProductFormHtml`, `renderOrderHtml`, `renderAdminDashboardHtml`, `renderOrderDetailHtml`) has been converted to a proper EJS view, those helpers have been deleted, a "Manage Shop" nav link was added to the organiser event workspace. **The runner order payment-proof page/upload and order cancellation have also now been built** — `pages/order-payment.ejs` (status-aware upload form / status notes), `POST /orders/:orderNumber/payment-proof` (R2 upload + `shop_payments` bridge via `submitPaymentProofForOrder`), and `POST /orders/:orderNumber/cancel` (eligibility-gated, reuses `orderService.updateFulfilment`). **The standalone runner cart is now also live** — built session-based (chosen over a new Mongo `ShopCart` model to avoid adding a persistence layer for what is inherently per-session, ephemeral pre-checkout state): `GET /shop/cart` (`pages/shop-cart.ejs`, line items/quantity update/remove/empty state), `POST /shop/cart/add` (wired from a new "Add to Cart" form on `pages/product-detail.ejs`, with variant-selection, stock, and cross-event guards), and `PATCH`/`DELETE /shop/cart/items/:itemId`. **The global `/shop` catalog is now live too** — `GET /shop` (`pages/shop.ejs`) lets visitors browse, search (`?q=`), and filter by event (`?event=`) merchandise across every publicly visible event, with paginated results and an event badge on each card linking through to the canonical `/events/:eventSlug/shop/:productSlug` detail page; a "Shop" link was added to the main site nav.

**Checkout and platform-sold merchandise ("HelloRun Shop") are now also done — the same day, as a follow-on slice.** `GET`/`POST /shop/checkout` (`pages/shop-checkout.ejs`, `orderService.createOrderFromCart`) build real `orders`/`order_items`/`shop_payments` rows from the session cart, clear it, and redirect into the now-live order-detail page — closing the last true standalone-order gap. Riding on that, the platform itself can now author and sell merchandise with no owning event or organiser (`owner_type = 'hellorun'`): admin authoring at `/admin/shop/products*` (`admin/shop-product-form.ejs`), standalone discovery at `GET /shop/:productSlug` and in the global catalog (no event badge), a `'platform'` cart-bucket sentinel, and parallel admin fulfilment/payment-review dashboards at `/admin/shop/platform-orders*`/`/admin/shop/platform-payment-reviews*`. See `docs/shop_feature.md` and `docs/to-implement/organiser-vs-platform-shop-products.md` for full detail. `npm run test:shop` is now **69/69 passing** (61 prior + 8 new platform-merch/checkout tests in `tests/shop-platform-merch.integration.test.js`). Only lower-priority admin/reporting features remain:

**Genuinely missing (true 501):** organiser/admin reports & exports, and admin settings.

The admin dashboard's "Shop Management: Planned/Draft" roadmap card (`src/views/admin/dashboard.ejs`) was also stale and has been corrected to "Live".

What is live (proper EJS views):
- `GET /shop` — global product catalog across all publicly visible events (HTML view + JSON, search/event filters, pagination) — `pages/shop.ejs`
- `GET /events/:eventSlug/shop` — public product list (HTML view + JSON) — `pages/event-shop.ejs`
- `GET /events/:eventSlug/shop/:productSlug` — public product detail (HTML view + JSON, with "Add to Cart" form for signed-in runners) — `pages/product-detail.ejs`
- `GET /shop/cart` — runner cart (line items, quantity update/remove, empty state) — `pages/shop-cart.ejs`
- `GET /orders/:orderNumber` — runner order detail (with conditional "Upload Payment Proof" / "Cancel Order" actions) — `pages/order-detail.ejs`
- `GET /orders/:orderNumber/payment` — runner payment-proof page (status-aware upload form / status notes) — `pages/order-payment.ejs`
- `GET /organizer/events/:eventId/shop` — organiser shop dashboard — `organizer/event-shop-dashboard.ejs` (linked from `organizer/event-details.ejs` via "Manage Shop")
- Organiser product create/edit forms (`getNewProduct`/`postProduct`/`getEditProduct`/`patchProduct`) — `organizer/shop-product-form.ejs`
- `GET /organizer/events/:eventId/shop/orders/:orderId` — organiser order detail (with fulfilment-status update form) — `organizer/shop-order-detail.ejs`
- `GET /admin/shop` — admin shop dashboard — `admin/shop-dashboard.ejs`
- `GET`/`POST /shop/checkout` — standalone checkout (delivery/customer details, order summary, creates the order from the cart) — `pages/shop-checkout.ejs`
- `GET /shop/:productSlug` — standalone platform-product detail (no owning event; reuses `pages/product-detail.ejs` with the event badge/back-link hidden)
- `GET /admin/shop/products/new`, `/admin/shop/products/:productId/edit` — platform product authoring forms (admin-only, `owner_type = 'hellorun'`) — `admin/shop-product-form.ejs`
- `GET /admin/shop/platform-orders`, `/admin/shop/platform-orders/:orderId` — admin platform-order list/detail (with fulfilment-update form) — `admin/shop-platform-orders.ejs`/`admin/shop-platform-order-detail.ejs`
- `GET /admin/shop/platform-payment-reviews` — admin platform-order payment-review queue — `admin/shop-platform-payment-reviews.ejs`

What is live as JSON only (read endpoints plus mutation endpoints with no dedicated HTML view needed beyond what's listed above):
- `GET /orders`, organiser product/variant lists, archive/hide, variant CRUD, organiser order list + fulfilment update, payment-review list + `PATCH` action, admin product/approval/order/payment lists + approval `PATCH`
- `POST /orders/:orderNumber/payment-proof` (multipart upload), `POST /orders/:orderNumber/cancel`
- `POST /shop/cart/add`, `PATCH /shop/cart/items/:itemId`, `DELETE /shop/cart/items/:itemId`
- `POST /admin/shop/products`, `PATCH /admin/shop/products/:productId`, archive/hide, variant CRUD, `PATCH /admin/shop/platform-orders/:orderId/fulfilment`, `PATCH /admin/shop/platform-payment-reviews/:paymentId`

What is genuinely scaffolded as 501 (all need building from scratch):
- Organiser reports + CSV/XLSX export
- Admin reports and settings

---

## Original Snapshot (June 2026 — superseded, kept for history)

Backend services, models, middleware, and JSON endpoints are production-ready. Every route below that is marked `[SCAFFOLD 501]` returns HTTP 501 — the route and access control exist but no view has been wired.

> **Note (June 7, 2026): This list is stale.** Most of the organiser/admin items below marked `[SCAFFOLD 501]` are actually implemented and tested — see the corrected snapshot above for accurate status.

What is live:
- `GET /events/:eventSlug/shop` — public product list (JSON only)
- `GET /orders` — runner order list (JSON only)
- `GET /organizer/events/:eventId/shop/products` — organiser product list (JSON only)
- `GET /organizer/events/:eventId/shop/products/:productId/variants` — variant list (JSON only)
- `GET /organizer/events/:eventId/shop/payment-reviews` + `PATCH` action — live and tested
- Organiser/admin payment-proof review page for registration-linked orders — live

What is scaffolded as 501 (all need UI) — superseded, see corrected snapshot above:
- Product detail, cart, checkout, runner order detail, runner order payment
- Organiser product write flows, order list, fulfillment, reports
- Admin shop dashboard, product approval queue, orders, payments, reports, settings

## Feature Intent

Connect the existing shop backend to actual browser pages so runners can browse event merchandise, add items to a cart, and pay; so organisers can manage their event's products and review orders; and so admins can approve products and monitor shop activity platform-wide.

## Primary Users
- **Runners** — browse products, select variants, place orders, upload payment proof
- **Organisers** — create/edit/archive event products, review orders, mark fulfillment, export reports
- **Public (unauthenticated)** — browse event shop and product detail (read-only)
- **Admins** — approve products, view platform-wide order/payment queue, configure shop settings

## MVP Scope

### Phase 11A — Event Shop Catalog and Product Detail (Public)

**Event shop listing page**
Route: `GET /events/:eventSlug/shop`
- Render product cards: image, name, price, category, availability badge
- Empty state when no products published
- Filter bar: category, price range, availability
- Link from the public event detail page
- Keep JSON response when `Accept: application/json` for test compatibility

**Product detail page**
Route: `GET /events/:eventSlug/shop/:productSlug`
- Product image gallery with thumbnail strip
- Full description
- Variant selector (size, colour) with live price update
- Stock status indicator
- Quantity selector
- "Add to Cart" — disabled or links to login if unauthenticated; disabled with note if out of stock
- Link back to event shop listing

### Phase 11B — Runner Cart and Checkout

**Cart page**
Route: `GET /shop/cart`
- Line items: image, name, variant, quantity, unit price, subtotal
- Update quantity inline or remove item
- Order subtotal, shipping fee (if applicable), total
- "Proceed to Checkout" CTA
- Empty cart state with link back to shop

**Checkout page**
Route: `GET /shop/checkout`
Submitted: `POST /shop/checkout`
- Customer details: name, email, phone
- Delivery method selector: pickup vs shipping
- Shipping address form (conditional on delivery method)
- Order summary sidebar
- Payment instruction block (manual proof workflow aligned with existing payment proof flow)
- Place Order CTA

**Runner order detail page**
Route: `GET /orders/:orderNumber`
- Order summary: number, date, status, items, totals
- Fulfillment status badge
- Payment status badge
- Payment proof upload section (links to payment proof page if status is `awaiting_payment`)
- Cancellation action (if status allows)

**Runner order payment proof page**
Route: `GET /orders/:orderNumber/payment`
Submitted: `POST /orders/:orderNumber/payment-proof`
- Upload proof image or PDF
- Reference number input
- Submit button
- Confirm once submitted (no re-upload until rejected)

**Runner order list page** (upgrade existing JSON endpoint)
Route: `GET /orders`
- Table or card list of orders with status badges
- Link to order detail
- Empty state with link to shop

### Phase 11C — Organiser Shop Management

**Organiser shop dashboard**
Route: `GET /organizer/events/:eventId/shop`
- Product count, published/draft/archived breakdown
- Pending payment-review count
- Recent orders summary
- Links to product list, payment reviews, order list, reports

**Product create/edit form**
Route: `GET /organizer/events/:eventId/shop/products/new` + `POST`
Route: `GET /organizer/events/:eventId/shop/products/:productId/edit` + `PATCH`
- Name, description (rich text or textarea)
- Category selector
- Images upload (up to 5, Cloudflare R2)
- Status selector: draft / published / archived
- Variant section: add/edit/remove variants (size, colour, price, SKU, stock quantity)
- Save as Draft / Publish actions

**Product archive/hide**
- Archive action from product list or edit page
- Confirm modal before archiving

**Organiser product list**
Route: upgrade existing JSON to HTML
- Table with name, status badge, variant count, stock, created date
- Quick actions: Edit, Archive
- New Product button

**Organiser order list**
Route: `GET /organizer/events/:eventId/shop/orders`
- Table: order number, runner name, items, total, payment status, fulfillment status, date
- Filter by status
- Link to order detail

**Fulfillment actions**
Route: `PATCH /organizer/events/:eventId/shop/orders/:orderId/fulfillment`
- Mark as Processing / Ready for Pickup / Shipped / Completed from order detail
- Tracking number input (optional)

**Reports and export**
Route: `GET /organizer/events/:eventId/shop/reports`
- Revenue summary by product/variant
- Order volume over time
- Export to CSV button

### Phase 11D — Admin Shop

**Admin shop dashboard**
Route: `GET /admin/shop`
- Platform-wide: total revenue, orders, pending approvals
- Quick links to approval queue, orders, payments, reports, settings

**Product approval queue**
Route: `GET /admin/shop/product-approvals`
Action: `PATCH /admin/shop/product-approvals/:productId`
- List of products pending admin approval before publishing
- Approve / Reject with optional rejection reason

**Admin order and payment views**
Routes: `GET /admin/shop/orders`, `GET /admin/shop/payments`
- Platform-wide order list with cross-event filtering
- Payment status overview and manual reconciliation actions

**Admin reports**
Route: `GET /admin/shop/reports`
- Revenue by event, organiser, product category
- Refund/cancellation rates
- Export options

**Admin shop settings**
Route: `GET /admin/shop/settings` + `PATCH`
- Payment method configuration
- Fulfillment defaults
- Global shop status (enable/disable)

## Suggested Build Order (updated June 7, 2026 — UI conversion + runner payment-proof/cancellation + cart + global catalog + checkout + platform-merch complete)

Items 1–6 of the original order are **done** — the underlying flows (public catalog/detail, runner order list/detail, organiser dashboard read data, organiser product/variant write flow, fulfilment update, payment-review approve/reject, admin approval) are all implemented, route-wired, and covered by passing tests in `npm run test:shop`. **Converting inline-HTML pages to proper EJS views and adding the organiser nav link is done.** **Runner order payment-proof page + cancellation is also done** — `pages/order-payment.ejs`, `submitPaymentProofForOrder`, and cancellation via `orderService.updateFulfilment` are implemented, route-wired, and covered by tests. **The runner cart is now also done** — built session-based (`req.session.shopCart`), with `pages/shop-cart.ejs`, `GET /shop/cart`, `POST /shop/cart/add`, `PATCH`/`DELETE /shop/cart/items/:itemId`, "Add to Cart" wiring on `product-detail.ejs`, and stock/cross-event guards, covered by 5 new tests. **The global `/shop` catalog is now also done** — `GET /shop` (`pages/shop.ejs`) resolves publicly visible events from Mongo (`getPublicEventVisibilityQuery`) and scopes a new cross-event Postgres query (`product.service.listPublicProductsAcrossEvents`) to them, with search/event filters, pagination, event badges, and a "Shop" nav link, covered by 4 new tests (61/61 passing).

**Checkout is now also done** — `GET`/`POST /shop/checkout` (`pages/shop-checkout.ejs`, `orderService.createOrderFromCart`) build `orders`/`order_items`/`shop_payments` rows from the cart, clear it, and redirect to order detail; this was a true from-scratch build (`getCheckout`/`postCheckout` were pure 501 stubs and no `createOrder` function existed anywhere). **Platform-sold merchandise ("HelloRun Shop") is now also done** — admin product authoring (`/admin/shop/products*`, `admin/shop-product-form.ejs`, `canManagePlatformProduct`), standalone discovery (`GET /shop/:productSlug`, global-catalog surfacing with no event badge), a `'platform'` cart-bucket sentinel, and parallel admin fulfilment/payment-review dashboards (`/admin/shop/platform-orders*`, `/admin/shop/platform-payment-reviews*`) for orders with `event_id IS NULL`/`organiser_id IS NULL`. Eight new tests cover the full slice in `tests/shop-platform-merch.integration.test.js` (now 69/69 passing). The active build order is now purely the genuinely-missing reporting/settings features:

1. **Organiser reports/exports and admin reports/settings** — lowest urgency; nothing user-facing depends on these yet.

---

## Original Suggested Build Order (June 2026 — superseded)

> Superseded June 7, 2026: items 1–5 below are already done; see the corrected build order above.

1. Public event shop listing page (HTML for existing JSON endpoint) — lowest risk, no writes
2. Product detail page (read-only, uses existing product + variant services)
3. Runner order list + order detail pages (registration add-on orders already exist so there is real data)
4. Organiser shop dashboard read UI (renders existing product list and payment-review data)
5. Organiser product create/edit write flow and variant management
6. Runner cart and checkout (standalone shop orders)
7. Runner order payment proof page
8. Organiser order list, fulfillment actions, and reports
9. Admin product approval queue and shop dashboard
10. Admin reports, settings, and global `/shop` catalog

## Test Coverage Targets

- Existing shop tests must continue to pass after each UI addition (no behaviour regression)
- Add view-render tests for each new EJS template (GET returns 200 + expected content)
- Add mutation tests for each new write endpoint (organiser product create/edit, fulfillment, admin approval)
- Cover empty-state and error-state rendering
- Re-run `npm run test:shop` after each phase step
