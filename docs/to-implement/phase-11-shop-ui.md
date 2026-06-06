# Phase 11 Shop UI

## Document Role
- Purpose: Spec for all remaining Phase 11 shop UI surfaces — the backend is fully built; only the browser-facing views are missing.
- Status: Active backlog — Priority 1.
- PRD reference: See `docs/PRD.md` Phase 11 and `docs/shop_feature.md` for full backend context.

## Current Alignment Snapshot (June 2026)

Backend services, models, middleware, and JSON endpoints are production-ready. Every route below that is marked `[SCAFFOLD 501]` returns HTTP 501 — the route and access control exist but no view has been wired.

What is live:
- `GET /events/:eventSlug/shop` — public product list (JSON only)
- `GET /orders` — runner order list (JSON only)
- `GET /organizer/events/:eventId/shop/products` — organiser product list (JSON only)
- `GET /organizer/events/:eventId/shop/products/:productId/variants` — variant list (JSON only)
- `GET /organizer/events/:eventId/shop/payment-reviews` + `PATCH` action — live and tested
- Organiser/admin payment-proof review page for registration-linked orders — live

What is scaffolded as 501 (all need UI):
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

## Suggested Build Order

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
