# Shop Feature Draft

## Document Role
- Purpose: Dedicated planning document for the HelloRun shop and merchandise feature.
- Status: Living draft (implementation-aligned).
- PRD reference: See `docs/PRD.md` Phase 11.

## Current Alignment Snapshot (May 19, 2026)

This document is now implementation-aligned for the current workspace.

Implemented and live enough for backend validation:

- Commerce database foundation exists across `008_phase8_shop_commerce.sql`, `010_phase10_shop_foundation_alignment.sql`, and `011_phase10_shop_foundation_hardening.sql`.
- MongoDB flexible-content models exist for product content, media metadata, order notes, and policy snapshots.
- Shop services exist for products, variants, orders, inventory movements, and manual payment review.
- Access-control and validation middleware are wired for shop route families.
- Public event shop listing returns JSON at `GET /events/:eventSlug/shop`.
- Runner order list returns JSON at `GET /orders`.
- Organiser event product list, variant list, and payment-review list return JSON.
- Organiser payment review approve/reject flow is implemented and syncs registration payment status, notifications, critical audit logs, and badge participant-award evaluation.
- Registration add-ons can create linked shop orders and shop payment records during paid-event registration/payment proof flows.
- Release-readiness regression includes shop read/payment-review paths and passed in the latest split sweep.

Scaffolded but not live yet:

- Product detail page.
- Cart page and cart mutation endpoints.
- Checkout page and standalone shop checkout.
- Runner order detail, order payment proof page, order payment proof upload, and order cancellation.
- Organiser product create/edit/archive/hide and variant write endpoints.
- Organiser order, fulfilment, report, and export pages.
- Admin shop dashboard, product approval, order, payment, reports, and settings pages/actions.
- Global `/shop` catalog page is still planned; current implemented public catalog is event-scoped.

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
- Planned global `/shop` catalog page.
- Current implemented read path is event-scoped: `GET /events/:eventSlug/shop`.
- Product cards with image, name, price, category, and availability.
- Filters for category, event collection, price range, and availability.
- Search by product name or event name.

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

## Current Route Status (May 18, 2026)

### Public
- `[LIVE JSON] GET /events/:eventSlug/shop`
- `[SCAFFOLD 501] GET /events/:eventSlug/shop/:productSlug`
- `[SCAFFOLD 501] GET /shop/cart`
- `[SCAFFOLD 501] POST /shop/cart/add`
- `[SCAFFOLD 501] PATCH /shop/cart/items/:itemId`
- `[SCAFFOLD 501] DELETE /shop/cart/items/:itemId`
- `[SCAFFOLD 501] GET /shop/checkout`
- `[SCAFFOLD 501] POST /shop/checkout`
- `[LIVE JSON] GET /orders`
- `[SCAFFOLD 501] GET /orders/:orderNumber`
- `[SCAFFOLD 501] GET /orders/:orderNumber/payment`
- `[SCAFFOLD 501] POST /orders/:orderNumber/payment-proof`
- `[SCAFFOLD 501] POST /orders/:orderNumber/cancel`

### Organizer
- `[SCAFFOLD 501] GET /organizer/events/:eventId/shop`
- `[LIVE JSON] GET /organizer/events/:eventId/shop/products`
- `[SCAFFOLD 501] Product create/edit/archive/hide endpoints`
- `[LIVE JSON] GET /organizer/events/:eventId/shop/products/:productId/variants`
- `[SCAFFOLD 501] Variant create/update/delete endpoints`
- `[SCAFFOLD 501] Order list/detail and fulfilment endpoints`
- `[LIVE JSON] GET /organizer/events/:eventId/shop/payment-reviews`
- `[LIVE JSON] PATCH /organizer/events/:eventId/shop/payment-reviews/:paymentId`
- `[SCAFFOLD 501] Reports and exports`

### Admin
- `[SCAFFOLD 501] GET /admin/shop`
- `[SCAFFOLD 501] GET /admin/shop/products`
- `[SCAFFOLD 501] GET /admin/shop/product-approvals`
- `[SCAFFOLD 501] PATCH /admin/shop/product-approvals/:productId`
- `[SCAFFOLD 501] GET /admin/shop/orders`
- `[SCAFFOLD 501] GET /admin/shop/payments`
- `[SCAFFOLD 501] GET /admin/shop/reports`
- `[SCAFFOLD 501] GET /admin/shop/settings`
- `[SCAFFOLD 501] PATCH /admin/shop/settings`

## Remaining UI and Product Gaps
- Event-scoped product detail page backed by `product.service` and `variant.service`.
- Event-scoped shop page UI that renders products instead of only JSON.
- Runner order history page and order detail page backed by `order.service`.
- Standalone cart and checkout implementation. Current cart/checkout routes are placeholders.
- Runner standalone order payment proof upload and cancellation. Registration payment proof bridge already exists.
- Organiser shop dashboard page with product list, payment-review queue, and order summary.
- Organiser product/variant write flows.
- Organiser fulfilment, reports, and exports.
- Admin shop dashboard and approval queue.
- Global `/shop` catalog.
- Gateway automation and webhook-based payment reconciliation.

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

### Phase 11A: Catalog Foundation
- Status: backend read foundation partially complete.
- Product model and migrations implemented.
- Product/variant service and access-control foundations implemented.
- Event-scoped public product list JSON implemented.
- Organiser product and variant list JSON implemented.
- Route/controller modules wired for public, organizer, and admin surfaces, but many write/UI routes intentionally return 501.
- Remaining work: event shop UI, product detail UI, and organizer product write flow.

### Phase 11B: Cart and Orders
- Status: registration add-on order creation is implemented; standalone cart/checkout is not live.
- Runner order list JSON is implemented.
- Cart, checkout, order detail, order payment page, order payment proof upload, and cancellation are scaffolded as 501 responses.
- Remaining work: standalone shopping cart and order UX.

### Phase 11C: Payment and Fulfillment
- Status: manual proof MVP path is implemented for registration add-on linked orders.
- Payment review queue and approve/reject actions are live for organisers as JSON.
- Fulfilment update endpoints are scaffolded but not live.
- Remaining work: organiser payment dashboard UI, fulfilment actions, notifications polish, and optional gateway/webhooks.

### Phase 11D: Event Merch
- Event-specific product collections.
- Event detail page merch block.
- Optional merch upsell during registration.

## Success Criteria
- `[PARTIAL]` Visitors can read event shop product lists through JSON.
- `[PENDING]` Visitors can browse rendered shop pages and view product details.
- `[PENDING]` Customers can place standalone shop orders with selected variants and quantities.
- `[PARTIAL]` Registration add-ons create linked shop orders without blocking registration.
- `[PENDING]` Admin can publish merchandise products through UI.
- `[PARTIAL]` Organisers can review linked manual payment proof through JSON action flow.
- `[PENDING]` Admin/organisers can update product/order/fulfilment status through production UI.
- `[DONE]` Shop does not block or complicate the existing event registration flow in covered tests.

## Current Validation Snapshot
- Schema coverage: `tests/shop-schema.test.js`.
- Service coverage: `tests/shop-services.test.js`.
- Middleware/validation coverage: `tests/shop-validation.middleware.test.js`.
- Read-only route coverage: `tests/shop-readonly-routes.test.js`.
- Registration add-on bridge coverage: `tests/registration-addons-read.test.js`.
- Organiser payment-review action coverage: `tests/organizer-shop-payment-review-actions.test.js`.
- Latest related release-readiness run:
  - `tests/organizer-shop-payment-review-actions.test.js`
  - `tests/registration-addons-read.test.js`
  - `tests/shop-readonly-routes.test.js`
  - `tests/shop-services.test.js`
  - `tests/shop-validation.middleware.test.js`
  - Result: 19/19 passing.

## Recommended Next Implementation Queue

1. Build the event-scoped shop listing page for `GET /events/:eventSlug/shop`.
   - Convert the current JSON-only response into browser HTML when `Accept: text/html`.
   - Keep JSON behavior for tests/API callers.
   - Add product cards, empty states, and a link from the public event details page.

2. Build product detail for `GET /events/:eventSlug/shop/:productSlug`.
   - Use existing product and variant services.
   - Show images/content, price, variants, stock state, and a disabled or staged cart action if cart remains deferred.

3. Build runner order history and order detail pages.
   - Keep `GET /orders` JSON support.
   - Add HTML rendering for browser requests.
   - Implement `GET /orders/:orderNumber` before standalone cart, because registration add-on orders already exist.

4. Build organiser shop dashboard read UI.
   - Render existing product list and payment-review JSON data as a proper organiser page.
   - Add links from organiser event workspace.

5. Implement standalone cart and checkout only after product listing/detail pages are usable.

6. Implement organiser product/variant writes, fulfilment, admin dashboard, and global `/shop` catalog after the event-scoped read experience is stable.
