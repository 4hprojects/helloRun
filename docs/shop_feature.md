# Shop Feature Draft

## Document Role
- Purpose: Dedicated planning document for the HelloRun shop and merchandise feature.
- Status: Draft.
- PRD reference: See `docs/PRD.md` Phase 11.

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
- `/shop` catalog page.
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

## Routes Draft

### Public
- `GET /shop`
- `GET /shop/:slug`
- `GET /cart`
- `POST /cart/items`
- `POST /cart/items/:itemId`
- `POST /cart/items/:itemId/remove`
- `GET /checkout`
- `POST /checkout`
- `GET /orders/:orderId`

### Runner
- `GET /runner/orders`

### Admin
- `GET /admin/shop/products`
- `GET /admin/shop/products/new`
- `POST /admin/shop/products`
- `GET /admin/shop/products/:id/edit`
- `POST /admin/shop/products/:id`
- `POST /admin/shop/products/:id/archive`
- `GET /admin/shop/orders`
- `GET /admin/shop/orders/:id`
- `POST /admin/shop/orders/:id/status`

## Event Integration Ideas
- Add merch upsell during event registration.
- Let organizers request event shirt/product listings.
- Add event collection pages such as `/shop/collections/:eventSlug`.
- Show event merch on event detail pages.
- Bundle event registration and shirt order later.

## Open Decisions
- Should the first release use manual payment proof or a payment gateway?
- Should organizers be allowed to create merch directly, or should admins manage all products first?
- Should fulfillment support shipping, pickup, or both?
- Should merch be available to guests, logged-in users only, or both?
- Should shop launch before or after production deployment?

## Suggested Build Phases

### Phase 11A: Catalog Foundation
- Product model.
- Product image upload.
- Admin product CRUD.
- Public shop catalog.
- Product detail page.

### Phase 11B: Cart and Orders
- Cart/session handling.
- Checkout form.
- Order creation.
- Customer order confirmation.
- Admin order queue.

### Phase 11C: Payment and Fulfillment
- Manual payment proof or gateway integration.
- Payment review.
- Fulfillment status updates.
- Order emails.

### Phase 11D: Event Merch
- Event-specific product collections.
- Event detail page merch block.
- Optional merch upsell during registration.

## Success Criteria
- Admin can publish merchandise products.
- Visitors can browse the shop and view product details.
- Customers can place an order with selected variants and quantities.
- Admin can review and update order status.
- Shop does not block or complicate the existing event registration flow.
