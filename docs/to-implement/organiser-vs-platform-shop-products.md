# Organiser-Sold vs. Platform-Sold Shop Products — Analysis & Gap Plan

> **Status: RESOLVED — June 7, 2026.** Everything described as missing below ("admin sells merch", steps 1–4 in the Recommendation) has now been built end to end: `productService.createPlatformProduct` + `/admin/shop/products*` authoring (`admin/shop-product-form.ejs`, `canManagePlatformProduct`), the standalone `GET /shop/:productSlug` detail route, `listPublicProductsAcrossEvents` extended to surface `owner_type = 'hellorun'`/`event_id IS NULL` rows in the global catalog with no event badge, a `'platform'` cart-bucket sentinel, checkout creating orders with `event_id = NULL`/`organiser_id = NULL`, and parallel admin fulfilment/payment-review dashboards (`/admin/shop/platform-orders*`, `/admin/shop/platform-payment-reviews*`) since there's no organiser to own these orders — exactly the design this doc anticipated would be needed. Covered by 8 new tests in `tests/shop-platform-merch.integration.test.js` (`npm run test:shop` now 69/69 passing). See `docs/shop_feature.md` for the live-feature writeup. The analysis below is kept as the original gap rationale/design record.

## Context

A question came up while reviewing the global `/shop` catalog (see [`shop_feature.md`](../shop_feature.md)): *"Organisers can sell merch on HelloRun — can the admin (HelloRun itself) sell merch too?"*

Short answer: **not today**. Organisers have a full event-scoped product authoring flow; admins only have a moderation/oversight surface (approve/reject, view orders/payments, dashboards). But the database schema was clearly designed with platform-owned ("HelloRun") products in mind — the feature is half-built at the data layer and entirely missing at the application layer. This doc lays out exactly where the line sits today and what closing the gap would take.

## How organiser-sold merch works today (fully live)

1. **Authoring**: An approved organiser manages products at `POST/PATCH /organizer/events/:eventId/shop/products(/:productId)` and variants at `.../variants*` (`organizer-shop.controller.js`, `organizer/shop-product-form.ejs`).
2. **Ownership check**: `canManageEventShop` ([shop-access.middleware.js:32-55](../../src/middleware/shop-access.middleware.js#L32-L55)) requires `user.role === 'organiser'` **and** `event.organizerId === user._id` — i.e. you must own the specific Mongo `Event` the product is being attached to. Admins are explicitly excluded from this path (`if (user.role !== 'organiser') return renderAccessDenied(...)`).
3. **Persistence**: `productService.createProductForMongoEvent(mongoEventId, payload, actorAppUserId)` ([product.service.js:154-199](../../src/services/shop/product.service.js#L154-L199)) resolves the Postgres `events_core` row for that Mongo event and inserts with **`owner_type` hardcoded to `'organiser'`** and `requires_admin_approval = true`.
4. **Moderation**: Admins review pending products via `GET /admin/shop/product-approvals` → `PATCH /admin/shop/product-approvals/:productId` (approve/reject), but never author them.
5. **Discovery**: Every public read path — event-scoped shop (`GET /events/:eventSlug/shop`), product detail, and the new global catalog (`GET /shop`) — joins `products_core p JOIN events_core ec ON ec.id = p.event_id`. A product is only ever reachable through its parent event.

In short: **organiser merch is event-scoped by construction**, end to end — schema, service, access control, and every read surface assume a product belongs to exactly one event owned by exactly one organiser.

## What the schema already anticipates for platform merch (dormant, unused)

Two pieces of evidence show platform-owned/event-less products were part of the original design, not an afterthought:

1. **`products_core.event_id` is nullable with an explicit comment**:
   ```sql
   -- migrations/008_phase8_shop_commerce.sql
   event_id UUID REFERENCES events_core(id) ON DELETE SET NULL, -- Nullable if generic shop item
   ```
   No later migration tightened this to `NOT NULL`.

2. **`owner_type` has a check constraint allowing `'hellorun'` as well as `'organiser'`**:
   ```sql
   -- migrations/010_phase10_shop_foundation_alignment.sql
   alter table products_core
     add constraint products_core_owner_type_check
     check (owner_type in ('hellorun', 'organiser'));
   ```

So the data model already supports a row that means *"a HelloRun-owned product, not tied to any specific event"* — `owner_type = 'hellorun'`, `event_id = NULL`, `organiser_id = NULL`. **Nothing in the application ever creates such a row.** `createProductForMongoEvent` is the only product-creation function, and it always writes `'organiser'` and always requires a resolvable `mongoEventId`.

## The gap, precisely

| Layer | Organiser merch | Platform ("hellorun") merch |
|---|---|---|
| Authoring UI/route | `organizer/shop-product-form.ejs`, `POST/PATCH /organizer/events/:eventId/shop/products` | **None** — no admin product-create form or route exists |
| Service function | `createProductForMongoEvent` (always `owner_type='organiser'`, requires event) | **None** — no `createPlatformProduct`-equivalent |
| Access control | `canManageEventShop` (organiser + event-ownership check) | **None** — admin shop routes have no write/create middleware for products |
| Persistence | `event_id` = resolved Postgres event row, `organiser_id = null`, `owner_type = 'organiser'` | Schema supports `event_id = NULL`, `owner_type = 'hellorun'`, but no code path produces it |
| Discovery (public reads) | Every public query **inner-joins** `events_core` — product only visible via its event | An `event_id IS NULL` row would be **invisible everywhere public** (event shop, product detail, global `/shop` catalog all use `JOIN events_core`) |
| Admin-side reads | N/A | `listProductsForAdmin`/`listPendingProductApprovals` already use **`LEFT JOIN events_core`** ([product.service.js:284](../../src/services/shop/product.service.js#L284), [:297](../../src/services/shop/product.service.js#L297)) — these would actually display an event-less row correctly today, by accident of using LEFT JOIN |

The single most important finding: **even if you manually inserted a `hellorun`/event-less product right now, no runner-facing page would ever show it.** Every public catalog query (`getEventShop`, `getProductDetail`, the new `getGlobalShop`) is an inner join to `events_core`, so a `NULL event_id` row silently disappears from all customer-facing surfaces. Only the admin-side list/approval queries (which happen to use `LEFT JOIN`) would render it — and even there, the product-detail page has no route that doesn't require an `:eventSlug`.

## What building "admin sells merch" would actually require

This is **not** a small follow-on to the global catalog — it touches the read layer, the write layer, and access control:

1. **A platform product-creation flow for admins**
   - New controller actions (e.g. `admin-shop.controller.getNewProduct`/`postProduct`/`getEditProduct`/`patchProduct`) and a form view, mirroring `organizer/shop-product-form.ejs`.
   - New routes under `/admin/shop/products/*`, gated by `requireAdmin` (already used on all `admin-shop.routes.js`).
   - A new service function — e.g. `productService.createPlatformProduct(payload, actorAppUserId)` — that inserts with `owner_type = 'hellorun'`, `organiser_id = null`, and either `event_id = null` (true platform merch) or an optional event association (for HelloRun-branded event collabs). Unlike `createProductForMongoEvent`, it should **not** require resolving a Mongo event first when `event_id` is meant to be null, and should presumably set `requires_admin_approval = false` (admins don't need to approve their own listings).

2. **A public discovery surface for event-less products**
   - The event-scoped shop (`/events/:eventSlug/shop`) structurally cannot show them — they have no event.
   - The global `/shop` catalog (`getGlobalShop`/`listPublicProductsAcrossEvents`) currently scopes to `mongoEventIds` resolved from visible Mongo events and inner-joins `events_core`; it would need a parallel branch (or a `LEFT JOIN` plus an `OR p.event_id IS NULL` clause) to also surface `owner_type = 'hellorun'` rows with no event — and the view (`pages/shop.ejs`) would need to handle a product card with no `eventTitle`/`eventSlug` (the `.shop-event-badge` is currently rendered conditionally on `product.eventTitle`, so this is a small EJS change, but `detailUrl` currently always assumes `/events/:eventSlug/shop/:productSlug`).

3. **A product-detail route that doesn't require an event slug**
   - Today the only product-detail route is `GET /events/:eventSlug/shop/:productSlug`. Platform merch needs either a new top-level route (e.g. `GET /shop/:productSlug`) or to be folded under a synthetic "HelloRun Shop" event — the latter is a hack that would pollute the events collection; the former is cleaner but means duplicating/abstracting `getProductDetail`'s logic to work with or without an event context.

4. **Cart / checkout / fulfilment implications**
   - `req.session.shopCart` is explicitly single-event (`cross-event rejection` is a tested guard — see [shop_feature.md](../shop_feature.md) cart section). Platform products with `event_id = null` would need either their own "virtual event" bucket in the cart model, or the single-event constraint would need to become "single-event-or-platform" — a real design decision, not a trivial tweak.
   - Order/fulfilment flows (`orders.event_id`, organiser fulfilment dashboards, payment review queues) are all scoped by event; platform orders would need a parallel admin-side fulfilment view since there's no "organiser" to assign them to.

5. **Access control**
   - `canManageEventShop` is fundamentally event-ownership-based and inapplicable here. A new `requireAdmin`-based guard (no event-ownership check needed — admin owns the platform) would replace it for these routes. `canManageShopProduct` (organiser-product-ownership check) would similarly need a platform-product equivalent (e.g. "must be `owner_type = 'hellorun'`" rather than "must belong to an event you own").

## Recommendation

This is a genuinely new, cross-cutting feature — not a UI gap like the global catalog was. If there's real demand for HelloRun-branded merch (the docs already list "HelloRun branded shirts, singlets, hoodies" as a merch idea in [`shop_feature.md`](../shop_feature.md#L44)), the lowest-risk slice to build first would be:

1. `createPlatformProduct` service function + admin authoring routes/views (write path, fully isolated — nothing public depends on it yet).
2. A standalone `GET /shop/:productSlug` product-detail route that works without an event (needed regardless of catalog changes, since the global catalog can't link anywhere otherwise).
3. Extend `getGlobalShop`/`listPublicProductsAcrossEvents` to also surface `owner_type = 'hellorun'` / `event_id IS NULL` rows, and update `pages/shop.ejs` to render cards without an event badge.
4. Only then tackle cart/checkout/fulfilment — likely the largest piece, since it requires deciding how a "platform order" is modeled without an owning organiser or event.

Steps 1–3 alone would let HelloRun *list* and *showcase* platform merch (read-only, browsable, linkable) without touching the cart/checkout/fulfilment machinery — a reasonable MVP slice that defers the hardest design questions.
