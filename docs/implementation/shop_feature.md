# Shop Feature Draft

## Document Role
- Purpose: Dedicated planning document for the HelloRun shop and merchandise feature.
- Status: Living draft (implementation-aligned).
- PRD reference: See `docs/PRD.md` Phase 11.

## Current Alignment Snapshot (June 7, 2026 — updated)

This document is now implementation-aligned for the current workspace. The May 19 snapshot below was significantly stale — a code/test audit on June 7 found that most "scaffolded" organiser/admin write flows were already implemented, wired, and covered by passing tests. **Since that audit, the UI-polish gap it identified has been closed**: every organiser/admin/runner page that previously rendered through hand-rolled inline-HTML-string helpers now renders through a proper EJS view matching the site's layout, nav, and design-system styling, and a "Shop" navigation link has been added to the organiser event workspace. **The runner standalone order payment-proof flow and order cancellation are also now live** — `GET /orders/:orderNumber/payment` renders `pages/order-payment.ejs` with status-aware messaging, `POST /orders/:orderNumber/payment-proof` uploads to R2 and bridges into `shop_payments` via the new `submitPaymentProofForOrder` service function (mirroring the registration-proof bridge), and `POST /orders/:orderNumber/cancel` reuses `orderService.updateFulfilment` to mark eligible orders cancelled with an audit log entry. **The standalone runner cart is now live too** — built session-based (`req.session.shopCart`), with `pages/shop-cart.ejs`, `GET /shop/cart`, `POST /shop/cart/add` (wired from a new "Add to Cart" form on `product-detail.ejs`), and `PATCH`/`DELETE /shop/cart/items/:itemId`, all gated by stock and single-event guards. **The global `/shop` catalog is now live too** — `GET /shop` lets visitors browse, search, and filter merchandise across every publicly visible event, with event badges linking through to each product's canonical `/events/:eventSlug/shop/:productSlug` detail page and a "Shop" link added to the main site nav.

**Checkout and platform-sold ("HelloRun Shop") merchandise — closed June 7, 2026 (same day, follow-on slice):** standalone checkout (`GET`/`POST /shop/checkout`, `pages/shop-checkout.ejs`, `orderService.createOrderFromCart`) now creates real `orders`/`order_items`/`shop_payments` rows from the session cart and clears it on success — the last true gap from the snapshot above. Riding on top of that, the platform can now author and sell its **own** merchandise with no owning event or organiser (`owner_type = 'hellorun'`, `event_id = NULL`, `organiser_id = NULL` — columns the schema always supported but nothing produced): admins author platform products at `/admin/shop/products*` (`admin/shop-product-form.ejs`, guarded by the new `canManagePlatformProduct` middleware), runners discover them at the standalone `GET /shop/:productSlug` route and in the global `/shop` catalog (both rendering with no event badge), the cart gained a `'platform'` bucket sentinel alongside per-event Mongo-id buckets (still one bucket per cart — mixing event and platform items returns the existing 409), and admins fulfil/review them through new parallel dashboards at `/admin/shop/platform-orders*` and `/admin/shop/platform-payment-reviews*` (mirroring the organiser order-detail/fulfilment and payment-review patterns, since there is no organiser to own these). See `docs/to-implement/organiser-vs-platform-shop-products.md` for the original gap analysis. Eight new tests were added in `tests/shop-platform-merch.integration.test.js` covering admin-only authoring, the standalone detail route, global-catalog surfacing, cross-bucket cart rejection, full add-to-cart→checkout→order creation, and admin order/payment-review flows for platform orders. `npm run test:shop` is now **69/69 passing** (61 prior + 8 new platform-merch tests). See the "Remaining UI and Product Gaps" section for the *true* remaining gap, which is now purely reports/exports and admin settings.

Implemented and live:

- Commerce database foundation exists across `008_phase8_shop_commerce.sql`, `010_phase10_shop_foundation_alignment.sql`, and `011_phase10_shop_foundation_hardening.sql`.
- MongoDB flexible-content models exist for product content, media metadata, order notes, and policy snapshots.
- Shop services exist for products, variants, orders, inventory movements, and manual payment review.
- Access-control and validation middleware are wired for shop route families.
- Public event shop listing page (HTML + JSON) at `GET /events/:eventSlug/shop`, with proper EJS view (`event-shop.ejs`), empty state, and a link from the public event detail page.
- Public product detail page (HTML + JSON) at `GET /events/:eventSlug/shop/:productSlug`, with proper EJS view (`product-detail.ejs`).
- Runner order list (JSON) at `GET /orders`, and runner order detail (HTML + JSON) at `GET /orders/:orderNumber`, now rendering through `pages/order-detail.ejs` (status badges, item list, order summary, plus conditional "Upload Payment Proof" / "Cancel Order" actions).
- Runner order payment-proof page at `GET /orders/:orderNumber/payment` (`pages/order-payment.ejs`, status-aware: shows the upload form for `unpaid`/`awaiting_payment`/`proof_rejected` orders, or a status note for orders already under review, paid, or otherwise ineligible) and submission at `POST /orders/:orderNumber/payment-proof` (uploads to Cloudflare R2, then upserts a `shop_payments` row and sets `orders.payment_status = 'proof_submitted'` via the new `submitPaymentProofForOrder` service function).
- Runner order cancellation at `POST /orders/:orderNumber/cancel` — allowed only while `fulfilment_status = 'not_started'` and `payment_status` is pre-paid/pre-refund; reuses `orderService.updateFulfilment` so the cancellation is logged in `shop_fulfilment_logs` like any other status change.
- Runner cart at `GET /shop/cart` (`pages/shop-cart.ejs`: line items, quantity update/remove, empty state, order summary), `POST /shop/cart/add` (wired from a new "Add to Cart" form on `product-detail.ejs`, gated to signed-in runners with variant/stock/cross-event validation), and `PATCH`/`DELETE /shop/cart/items/:itemId` — built session-based (`req.session.shopCart = { mongoEventId, items: [{ itemId, productId, variantId, quantity }] }`), with live product/variant/price/stock lookups resolved on every read via `loadCartLines` (auto-pruning stale, hidden, archived, or out-of-stock lines). The cart bucket key is now either a Mongo event-id hex string or the `'platform'` sentinel (see platform-merch entry below) — `getCartBucketKeyForProduct` resolves which, and the existing cross-bucket 409 guard compares against whichever key is active.
- Standalone checkout at `GET`/`POST /shop/checkout` (`pages/shop-checkout.ejs`) — consumes the session cart, collects delivery method/address/customer note, and calls the new `orderService.createOrderFromCart` to insert `orders` + `order_items` (+ an initial `awaiting_payment` `shop_payments` row), then clears the cart and redirects to `GET /orders/:orderNumber`. Works for both event-owned and platform-owned carts (platform carts create orders with `event_id = NULL`/`organiser_id = NULL`).
- **Platform-sold merchandise ("HelloRun Shop")** — the platform itself can now author and sell merch with no owning event or organiser (`owner_type = 'hellorun'`, `event_id = NULL`, `organiser_id = NULL`): admin authoring at `/admin/shop/products*` (`admin/shop-product-form.ejs`, `productService.createPlatformProduct`, guarded by `canManagePlatformProduct`), standalone discovery at `GET /shop/:productSlug` (`shopController.getPlatformProductDetail`, reuses `pages/product-detail.ejs` with the event badge/back-link hidden), surfacing in the global `/shop` catalog with no event badge (`listPublicProductsAcrossEvents` now `LEFT JOIN`s `events_core` and unions in `event_id IS NULL AND owner_type = 'hellorun'` rows), and admin fulfilment/payment-review dashboards at `/admin/shop/platform-orders*` and `/admin/shop/platform-payment-reviews*` (`admin/shop-platform-orders.ejs`, `admin/shop-platform-order-detail.ejs`, `admin/shop-platform-payment-reviews.ejs`, backed by new `orderService.listPlatformOrders`/`getPlatformOrderById` and `paymentReviewService.listPendingPlatformPaymentReviews` queries scoped on `event_id IS NULL`).
- Organiser product list/create/edit/archive/hide, variant CRUD, order list/detail, and fulfilment-status update are all implemented, route-wired, and rendering through proper EJS views (`organizer/event-shop-dashboard.ejs`, `organizer/shop-product-form.ejs`, `organizer/shop-order-detail.ejs`) matching the rest of the organiser workspace (e.g. `organizer/event-badges.ejs`). A "Manage Shop" link is now on the organiser event details page.
- Organiser payment review approve/reject flow is implemented and syncs registration payment status, notifications, critical audit logs, and badge participant-award evaluation.
- Admin shop dashboard, product list, product-approval queue + approve/reject, order list, and payment list are all implemented, route-wired, and the dashboard now renders through `admin/shop-dashboard.ejs` matching `admin/dashboard.ejs` conventions.
- Event registration payment-proof review has a dedicated organizer/admin page at `GET /organizer/events/:eventId/payment-proofs/review`.
- Registration add-ons can create linked shop orders and shop payment records during paid-event registration/payment proof flows.
- Release-readiness regression includes shop read/payment-review/write/checkout/platform-merch paths plus render checks for every converted view; latest full `npm run test:shop` run is 69/69 passing.

Scaffolded but not live yet (the true remaining gap):

- Organiser order/fulfilment reports and CSV/XLSX export pages.
- Admin shop reports and settings pages/actions.

## Feature Intent
The shop should sell merchandise related to HelloRun, running events, and the runner community.

The first version should be practical and focused. It should help runners buy branded or event-related items without turning HelloRun into a full marketplace too early.

## Merchandise Ideas
- HelloRun branded shirts, singlets, and hoodies.
- Event finisher shirts.
- Event-specific merch bundles.
- Running caps, socks, towels, race belts, and bib holders.
- Stickers, medals, or souvenir items for virtual events.
- Optional digital add-ons such as printable certificates or event packs if needed later.

## Primary Users
- Runners who want HelloRun or event-related merch.
- Organizers who may want event-specific merch listed later.
- Admins who manage products, inventory, pricing, and order status.

## MVP Scope

### Public Shop
- `[LIVE]` Global `/shop` catalog page spanning all publicly visible events, plus the event-scoped `GET /events/:eventSlug/shop`.
- Product cards with image, name, price, category, and availability.
- `[LIVE]` Search by product/category name, with an optional event filter; price-range/availability filters remain a possible follow-up.

### Product Detail
- `/shop/:slug` product detail page.
- Product gallery.
- Description.
- Price.
- Variant selector, such as size or color.
- Stock status.
- Quantity selector.
- Add to cart or reserve/order action.

### Cart and Checkout
- Cart page with items, quantities, subtotal, and remove/update actions.
- Checkout page with customer details and delivery/pickup preference.
- Payment approach to decide:
  - Manual payment proof workflow, aligned with existing event payment proof flow.
  - Payment gateway integration after production readiness.

### Admin Product Management
- Product list.
- Create/edit product.
- Upload product images.
- Set product category.
- Set variants, price, and inventory count.
- Publish, unpublish, or archive product.
- Mark featured products.

### Orders
- Order model.
- Order confirmation page.
- Runner/customer order history.
- Admin order queue.
- Order statuses: `pending`, `awaiting_payment`, `paid`, `processing`, `ready_for_pickup`, `shipped`, `completed`, `cancelled`, `refunded`.

## Recommended MVP Data Models

### Product
- `productId`
- `slug`
- `name`
- `description`
- `category`
- `collectionType`: `general`, `event`, `organizer`
- `eventId`
- `organizerId`
- `images`
- `variants`
- `price`
- `currency`
- `inventoryStatus`
- `isFeatured`
- `status`: `draft`, `published`, `archived`
- `createdBy`
- `createdAt`
- `updatedAt`

### ProductVariant
- `variantId`
- `sku`
- `size`
- `color`
- `price`
- `stockQuantity`
- `status`

### Order
- `orderId`
- `userId`
- `customer`
- `items`
- `subtotal`
- `shippingFee`
- `total`
- `currency`
- `paymentStatus`
- `fulfillmentStatus`
- `deliveryMethod`
- `shippingAddress`
- `paymentProofUrl`
- `createdAt`
- `updatedAt`

## Current Route Status (June 7, 2026 — updated)

Status legend: `[LIVE]` = implemented, route-wired, tested, and rendering a real EJS page or JSON response; `[SCAFFOLD 501]` = route exists but returns HTTP 501, no implementation yet. (The earlier `[LIVE — needs EJS view]` tier has been retired — every page that carried it now renders through a proper EJS template.)

### Public
- `[LIVE] GET /shop` (global catalog HTML view `pages/shop.ejs` + JSON, search/event filters, pagination)
- `[LIVE] GET /events/:eventSlug/shop` (HTML view + JSON)
- `[LIVE] GET /events/:eventSlug/shop/:productSlug` (HTML view + JSON)
- `[LIVE] GET /shop/cart` (HTML view `pages/shop-cart.ejs` + JSON)
- `[LIVE] POST /shop/cart/add` (JSON, variant/stock/cross-event validated)
- `[LIVE] PATCH /shop/cart/items/:itemId` (JSON)
- `[LIVE] DELETE /shop/cart/items/:itemId` (JSON)
- `[LIVE] GET /shop/checkout` (HTML view `pages/shop-checkout.ejs`)
- `[LIVE] POST /shop/checkout` (creates `orders`/`order_items`/`shop_payments` via `createOrderFromCart`, clears cart, redirects to order detail)
- `[LIVE] GET /shop/:productSlug` (standalone platform-product detail — HTML view `pages/product-detail.ejs` + JSON; registered after `/shop/cart*`/`/shop/checkout*` to avoid shadowing)
- `[LIVE] GET /orders` (JSON)
- `[LIVE] GET /orders/:orderNumber` (HTML view `pages/order-detail.ejs` + JSON)
- `[LIVE] GET /orders/:orderNumber/payment` (HTML view `pages/order-payment.ejs`)
- `[LIVE] POST /orders/:orderNumber/payment-proof` (multipart upload to R2 + `shop_payments` bridge, JSON)
- `[LIVE] POST /orders/:orderNumber/cancel` (JSON, eligibility-gated)

### Organizer
- `[LIVE] GET /organizer/events/:eventId/shop` (dashboard renders `organizer/event-shop-dashboard.ejs`)
- `[LIVE] GET /organizer/events/:eventId/shop/products` (JSON)
- `[LIVE]` Product create/edit endpoints (getNewProduct/postProduct/getEditProduct/patchProduct render `organizer/shop-product-form.ejs`)
- `[LIVE]` Product archive/hide endpoints (JSON)
- `[LIVE] GET /organizer/events/:eventId/shop/products/:productId/variants` (JSON)
- `[LIVE]` Variant create/update/delete endpoints (JSON)
- `[LIVE]` Order list (JSON) / order detail (renders `organizer/shop-order-detail.ejs` with fulfilment-update form) / fulfilment update (JSON)
- `[LIVE] GET /organizer/events/:eventId/shop/payment-reviews` (JSON)
- `[LIVE] PATCH /organizer/events/:eventId/shop/payment-reviews/:paymentId` (JSON)
- `[SCAFFOLD 501] Reports and exports (CSV/XLSX)`

### Admin
- `[LIVE] GET /admin/shop` (dashboard renders `admin/shop-dashboard.ejs`)
- `[LIVE] GET /admin/shop/products` (JSON)
- `[LIVE] GET /admin/shop/product-approvals` (JSON)
- `[LIVE] PATCH /admin/shop/product-approvals/:productId` (JSON)
- `[LIVE] GET /admin/shop/orders` (JSON)
- `[LIVE] GET /admin/shop/payments` (JSON)
- `[LIVE]` Platform product authoring: `GET /admin/shop/products/new`, `POST /admin/shop/products`, `GET /admin/shop/products/:productId/edit`, `PATCH /admin/shop/products/:productId`, archive/hide actions, and variant CRUD — all `owner_type = 'hellorun'`-scoped, gated by `canManagePlatformProduct` (renders `admin/shop-product-form.ejs`)
- `[LIVE] GET /admin/shop/platform-orders`, `GET /admin/shop/platform-orders/:orderId`, `PATCH /admin/shop/platform-orders/:orderId/fulfilment` (admin-fulfilled platform orders, `event_id IS NULL`; renders `admin/shop-platform-orders.ejs`/`admin/shop-platform-order-detail.ejs`)
- `[LIVE] GET /admin/shop/platform-payment-reviews`, `PATCH /admin/shop/platform-payment-reviews/:paymentId` (manual payment-proof review queue for platform orders; renders `admin/shop-platform-payment-reviews.ejs`)
- `[SCAFFOLD 501] GET /admin/shop/reports`
- `[SCAFFOLD 501] GET /admin/shop/settings`
- `[SCAFFOLD 501] PATCH /admin/shop/settings`

## Remaining UI and Product Gaps
- Organiser fulfilment reports and exports (CSV/XLSX).
- Admin shop reports and settings.
- Gateway automation and webhook-based payment reconciliation.

**UI polish and navigation gap — closed June 7, 2026:** the organiser shop dashboard, organiser product create/edit form, organiser order detail, admin shop dashboard, and runner order detail were converted from hand-rolled inline-HTML-string helpers (`renderManagementHtml`, `renderProductFormHtml`, `renderOrderHtml`, `renderAdminDashboardHtml`, `renderOrderDetailHtml` — all now removed) to proper EJS views (`organizer/event-shop-dashboard.ejs`, `organizer/shop-product-form.ejs`, `organizer/shop-order-detail.ejs`, `admin/shop-dashboard.ejs`, `pages/order-detail.ejs`) following the conventions of `event-shop.ejs`/`product-detail.ejs` (public pages) and `organizer/event-badges.ejs` (organiser manage pages). A "Manage Shop" link was added to `organizer/event-details.ejs`, and three new render tests were added to `tests/shop-readonly-routes.smoke.test.js` (now 48/48 passing).

**Runner payment-proof and cancellation gap — closed June 7, 2026:** `GET /orders/:orderNumber/payment` now renders `pages/order-payment.ejs` (status-aware: upload form for eligible orders, read-only status notes for orders already under review/paid/ineligible), `POST /orders/:orderNumber/payment-proof` uploads to Cloudflare R2 and bridges into `shop_payments` via the new `payment-review.service.submitPaymentProofForOrder` (mirroring `upsertShopPaymentForRegistrationProof`), and `POST /orders/:orderNumber/cancel` reuses `orderService.updateFulfilment` to cancel eligible orders (gated to `fulfilment_status = 'not_started'` and pre-paid/pre-refund `payment_status`) with a `shop_fulfilment_logs` entry. The runner order-detail page now surfaces "Upload Payment Proof" / "Cancel Order" actions when eligible. Four new mutation tests were added in `tests/shop-runner-payment-actions.integration.test.js` (then 52/52 passing across `npm run test:shop`).

**Runner cart gap — closed June 7, 2026:** built session-based per explicit instruction (storage shape `req.session.shopCart = { mongoEventId, items: [{ itemId, productId, variantId, quantity }] }`, item IDs generated as Mongo ObjectId strings to satisfy the existing `validateObjectIdParam('itemId')` route guard). `GET /shop/cart` renders `pages/shop-cart.ejs` (line items with quantity-update/remove controls, order summary, empty state, "Checkout is coming soon" note rather than a dead-end link to the still-501 checkout route), `POST /shop/cart/add` is wired from a new "Add to Cart" form on `product-detail.ejs` (gated to signed-in runners via `canAddToCart`, with variant-selection, live stock, and single-event-per-cart validation returning 409 on cross-event attempts), and `PATCH`/`DELETE /shop/cart/items/:itemId` update/remove lines. A new `loadCartLines` helper resolves live product/variant/price/stock data on every read (via the new `product.service.getProductWithEventById`), clamping quantities to current availability and pruning lines that have gone stale (archived, hidden, deactivated variant, or out of stock), then persists the cleaned list back to the session. Five new mutation tests were added in `tests/shop-runner-cart-actions.integration.test.js` covering empty-cart state, variant-selection requirement, out-of-stock rejection, full add/view/update/remove lifecycle, and cross-event rejection (now 57/57 passing across `npm run test:shop`); a pre-existing smoke-test assertion in `tests/shop-readonly-routes.smoke.test.js` that expected the product-detail page to lack an "Add to Cart" section was also updated to reflect the live feature (now asserting a sign-in prompt for unauthenticated visitors).

**Global `/shop` catalog gap — closed June 7, 2026:** built `GET /shop` as a discovery surface spanning every publicly visible event. Because event public-visibility rules (`status: 'published'`, `isDeleted`, `isPersonalRecord`, `publicListingAvailableAt`) live only on the Mongo `Event` model and are not mirrored into `events_core`, the controller (`shop.controller.getGlobalShop`) first resolves visible events via `getPublicEventVisibilityQuery` (capped at 500, with a comment noting that mirroring visibility flags into `events_core` would let this collapse to a single SQL query if event volume grows), then scopes a new cross-event Postgres query — `product.service.listPublicProductsAcrossEvents` (joins `products_core`/`events_core`, reuses a composable `sql` `whereClause` fragment across the row and count queries, and uses `sql(mongoEventIds)` for the `IN (...)` list) — to those event ids. The page (`pages/shop.ejs`) supports search-by-product/category-name (`?q=`) and an optional event filter (`?event=`), real offset-based pagination via the existing `validateShopPagination` middleware (mirroring `events.ejs` prev/numbered/next markup with new `.shop-pagination*`/`.shop-filter-bar`/`.shop-event-badge` classes added to `shop.css`, since shop pages don't load `events.css`), and an event badge on each product card linking to that event's shop and to the canonical `/events/:eventSlug/shop/:productSlug` detail page. A "Shop" link was added to the main site nav (`layouts/nav.ejs`, between "Events" and "Blog"). Four new render/JSON/filter tests were added to `tests/shop-readonly-routes.smoke.test.js` covering the HTML/JSON catalog responses, search filtering (including the no-match empty state), and the event filter (then 61/61 passing across `npm run test:shop`).

**Checkout and platform-sold merchandise ("HelloRun Shop") gap — closed June 7, 2026:** `getCheckout`/`postCheckout` had been pure 501 stubs with no `createOrder` function anywhere in the codebase — checkout had to be built from scratch for *any* shop order (event or platform) before platform-merch could be end-to-end testable. `GET`/`POST /shop/checkout` now render `pages/shop-checkout.ejs` and call the new `orderService.createOrderFromCart(cart, runnerContext, deliveryDetails)`, which inserts `orders` + `order_items` (+ an initial `awaiting_payment` `shop_payments` row), clears `req.session.shopCart`, and redirects to `GET /orders/:orderNumber`; `validateCheckoutPayload` now validates delivery-method/customer-detail fields. On top of that, the platform can now author and sell its own merchandise with **no owning event or organiser** — `owner_type = 'hellorun'`, `event_id = NULL`, `organiser_id = NULL` (columns the schema always supported per migrations 008/010, but nothing ever produced such a row, and every public read path inner-joined `events_core`, hiding event-less rows even if they existed; full gap analysis in `docs/to-implement/organiser-vs-platform-shop-products.md`). New pieces: `productService.createPlatformProduct`/`getPublicPlatformProductBySlug`, the `canManagePlatformProduct` admin-ownership-check middleware, `admin/shop-product-form.ejs` authoring UI at `/admin/shop/products*`, the standalone `GET /shop/:productSlug` detail route (`shopController.getPlatformProductDetail`, reusing `pages/product-detail.ejs` with the event badge/back-link conditionally hidden), a `'platform'` cart-bucket sentinel (`getCartBucketKeyForProduct` resolves a Mongo event-id hex string vs. `'platform'`; the existing cross-bucket 409 guard needed no structural change, just comparison against whichever key is active), `listPublicProductsAcrossEvents` extended with a `LEFT JOIN events_core` + `event_id IS NULL AND owner_type = 'hellorun'` union branch so platform products surface in the global catalog with no event badge, and parallel admin dashboards `admin/shop-platform-orders.ejs`/`admin/shop-platform-order-detail.ejs`/`admin/shop-platform-payment-reviews.ejs` at `/admin/shop/platform-orders*` and `/admin/shop/platform-payment-reviews*` (backed by new `orderService.listPlatformOrders`/`getPlatformOrderById` and `paymentReviewService.listPendingPlatformPaymentReviews`, both scoped on `event_id IS NULL` so organiser-side queries — which still inner-join `events_core` — never see them). One subtle production bug surfaced and was fixed during testing of the add-to-cart→checkout path: `addToCart` now explicitly `await`s `req.session.save()` before responding, eliminating an intermittent (~50% reproduction rate) race where the MongoDB-Atlas-backed session store hadn't durably persisted the cart write before the client's immediate follow-up `GET /shop/cart` read back a stale, empty session. Eight new tests were added in `tests/shop-platform-merch.integration.test.js` covering admin-only platform-product authoring, the standalone detail route, global-catalog surfacing, cross-bucket cart rejection, the full add-to-cart→checkout→order-creation path, and admin platform order/payment-review flows (now **69/69 passing** across `npm run test:shop`).

## Event Integration Ideas
- Add merch upsell during event registration.
- Let organizers request event shirt/product listings.
- Add event collection pages such as `/shop/collections/:eventSlug`.
- Show event merch on event detail pages.
- Bundle event registration and shirt order later.

## Open Decisions
- Should organizers be allowed to create merch directly, or should admins manage all products first?
- Should fulfillment support shipping, pickup, or both?
- Should merch be available to guests, logged-in users only, or both?
- Should shop launch before or after production deployment?

## Suggested Build Phases

### Phase 11A: Catalog Foundation — DONE
- Product model and migrations implemented.
- Product/variant service and access-control foundations implemented.
- Event-scoped public product list and product detail pages implemented with proper EJS views, empty states, and a link from the public event details page.
- Organiser product/variant list, create/edit/archive/hide, and variant CRUD implemented and route-wired.

### Phase 11B: Cart and Orders — DONE
- Status: registration add-on order creation, runner order list/detail, payment-proof page/upload, order cancellation, the standalone runner cart, and standalone checkout are all implemented and tested (`pages/order-detail.ejs`, `pages/order-payment.ejs`, `pages/shop-cart.ejs`, `pages/shop-checkout.ejs`, `orderService.createOrderFromCart`).
- No remaining work in this phase.

### Phase 11C: Payment and Fulfillment — MOSTLY DONE
- Manual proof MVP path is implemented for registration add-on linked orders, and now also for standalone shop orders (`submitPaymentProofForOrder`).
- Payment review queue and approve/reject actions are live and tested for organisers.
- Organiser fulfilment-status update is implemented, route-wired, and the order-detail page (`organizer/shop-order-detail.ejs`) now includes a working status-update form.
- Runner-side payment-proof upload (`pages/order-payment.ejs`) and order cancellation are implemented, route-wired, and tested.
- Registration payment-proof tracking and verification is live as a focused organizer/admin page.
- Remaining work: organiser/admin reports and exports, admin shop settings, and optional gateway/webhooks.

### Phase 11D: Event Merch — PARTLY DONE
- Event-specific product collections: not started.
- Event detail page merch block: not started.
- Optional merch upsell during registration: not started.
- `[DONE]` Global `/shop` catalog page (`GET /shop`, `pages/shop.ejs`) spanning all publicly visible events with search/event filters and pagination.
- `[DONE]` Platform-sold merchandise ("HelloRun Shop") — admin can author, list, sell, and fulfil its own merch end-to-end with no owning event or organiser (`owner_type = 'hellorun'`): authoring at `/admin/shop/products*`, standalone discovery at `GET /shop/:productSlug` and the global catalog, a `'platform'` cart bucket, checkout into orders with `event_id = NULL`, and admin fulfilment/payment-review dashboards at `/admin/shop/platform-orders*`/`/admin/shop/platform-payment-reviews*`.

## Success Criteria
- `[DONE]` Visitors can browse rendered shop pages and view product details, both event-scoped (`GET /events/:eventSlug/shop`), platform-scoped (`GET /shop/:productSlug`), and across all events via the global catalog (`GET /shop`, search/event filters, pagination).
- `[DONE]` Registration add-ons create linked shop orders without blocking registration, and standalone shop checkout (`GET`/`POST /shop/checkout`) creates real `orders`/`order_items`/`shop_payments` rows from the cart for both event and platform purchases.
- `[DONE]` Admin/organisers can publish merchandise products and update fulfilment status through live, tested endpoints rendered with proper EJS views matching the rest of the admin/organiser workspace — including admin-authored platform products with no owning event.
- `[DONE]` Organisers can review payment proof (both registration-linked and shop-order-linked) and approve/reject through a live, tested flow; admins have a parallel queue for platform-order payment proofs.
- `[DONE]` Runners can browse products, select a variant, and add items to a session-based cart (with a `'platform'` bucket alongside per-event buckets) with live stock/price/availability checks (`pages/shop-cart.ejs`, `GET /shop/cart`, `POST /shop/cart/add`, `PATCH`/`DELETE /shop/cart/items/:itemId`).
- `[DONE]` Customers can place standalone shop orders with selected variants and quantities, for both event-owned and platform-owned products, via the live checkout flow.
- `[DONE]` Runners can upload payment proof and cancel orders for standalone shop purchases through live, tested endpoints (`pages/order-payment.ejs`, `POST /orders/:orderNumber/payment-proof`, `POST /orders/:orderNumber/cancel`).
- `[PENDING]` Organisers/admins can view shop reports and admins can configure shop settings through UI.
- `[DONE]` Shop does not block or complicate the existing event registration flow in covered tests.

## Current Validation Snapshot
- Schema coverage: `tests/shop-schema.integration.test.js`.
- Service coverage: `tests/shop-services.integration.test.js`.
- Middleware/validation coverage: `tests/shop-validation.middleware.integration.test.js`.
- Read-only route coverage: `tests/shop-readonly-routes.smoke.test.js`.
- Registration add-on bridge coverage: `tests/registration-addons-read.integration.test.js`.
- Organiser payment-review action coverage: `tests/organizer-shop-payment-review-actions.integration.test.js`.
- Runner payment-proof submission and order cancellation coverage: `tests/shop-runner-payment-actions.integration.test.js`.
- Runner cart lifecycle and validation coverage: `tests/shop-runner-cart-actions.integration.test.js`.
- Checkout, platform-merch authoring/discovery/cart/fulfilment, and admin platform order/payment-review coverage: `tests/shop-platform-merch.integration.test.js`.
- Registration payment-proof review page coverage: `tests/payment-route-guards.test.js`.
- Latest full `npm run test:shop` run (June 7, 2026, post-platform-merch): **69/69 passing** — the prior 61 plus 8 new tests covering checkout and platform-sold ("HelloRun Shop") merchandise end-to-end.

## Recommended Next Implementation Queue

Items 1–9 of the original queue (organiser/admin write flows, the EJS conversion and navigation wiring, the runner payment-proof/cancellation flows, the runner cart, the global `/shop` catalog, checkout, and platform-sold merchandise) are now complete. The active queue is the remaining true-501 gap list:

1. **Build organiser/admin reports and exports, and admin shop settings** — lowest urgency; no live user-facing demand yet.
