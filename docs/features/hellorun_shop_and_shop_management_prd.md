# HelloRun Shop and Shop Management Feature PRD

## Document Purpose

This document defines the proposed **Shop and Shop Management** feature for HelloRun. It is written as an implementation-ready reference for Codex or any development agent working on the HelloRun codebase.

The goal is to add commerce support to HelloRun without turning the platform into a general online marketplace too early.

HelloRun should first support event-related commerce:

- Registration add-ons
- Event merchandise
- Optional virtual run items
- Race kit products
- Delivery or pickup fees
- Donations
- Sponsor bundles
- HelloRun-owned products
- Organiser-owned products

This feature should support both HelloRun-organised events and small-to-medium organisers using HelloRun as their running event platform.

## Current Alignment Snapshot (HelloRun Today)

The codebase already includes related foundations:

- Event registration and manual payment proof upload for registrations
- Existing event-level optional pricing and package fields
- Existing Supabase migration file for commerce foundation (`008_phase8_shop_commerce.sql`)
- Admin dashboard roadmap placeholder for Shop Management

Important:

- Shop routes are not yet wired in Express route registration.
- Dedicated shop EJS pages are not yet present.
- Registration currently creates registration records only, not commerce order records.

---

## External References and Rationale

The design is based on patterns from established event and commerce platforms:

1. RunSignup separates **registration add-ons** from a **race store**. Add-ons are useful during or after registration, while a race store is better for items that may be sold separately from race registration.
   - Reference: https://help.runsignup.com/support/solutions/articles/17000063181-setup-add-ons
   - Reference: https://help.runsignup.com/support/solutions/articles/17000063182-setup-a-race-store
   - Reference: https://info.runsignup.com/2025/12/22/store-vs-add-ons/

2. Race Roster supports participant store configuration from the event dashboard and allows products to be purchased outside the original registration flow.
   - Reference: https://help.raceroster.com/en-us/knowledge-base/how-to-configure-the-participant-store
   - Reference: https://help.raceroster.com/en-us/knowledge-base/create-a-product-using-products
   - Reference: https://raceroster.com/articles/offer-products-outside-of-registration-with-the-participant-store

3. Shopify’s product variant model is a useful reference for managing product options such as shirt size, colour, SKU, price, and inventory.
   - Reference: https://shopify.dev/docs/api/admin-graphql/latest/queries/productVariants
   - Reference: https://help.shopify.com/en/manual/products/variants
   - Reference: https://help.shopify.com/en/manual/products/inventory

4. PayMongo supports payment splitting for platform accounts. This is relevant for later phases if HelloRun collects platform fees while remitting organiser earnings.
   - Reference: https://developers.paymongo.com/docs/payment-splitting
   - Reference: https://www.paymongo.com/products/platform

---

## Feature Name

**HelloRun Commerce**

The feature should be presented to users as:

- **Shop** for runner-facing purchasing
- **Registration Add-ons** for merchandise or extras shown during registration
- **Shop Management** for organiser and admin operations

---

## High-Level Feature Structure

```text
HelloRun Commerce
├── Registration Add-ons
├── Event Shop
├── Cart and Checkout
├── Orders
├── Payment Review
├── Inventory Management
├── Fulfilment Management
├── Reports and Exports
└── Admin Governance
```

---

## Main Recommendation

Start with **Registration Add-ons**, then build the **Event Shop**, then expand into full **Shop Management**.

Recommended implementation order:

1. Phase 0: PRD and Architecture Lock
2. Phase 1A: Commerce Data Foundation
3. Phase 1B: Registration Add-ons MVP
4. Phase 2: Organizer Shop Management
5. Phase 3: Runner Event Shop and Cart/Checkout
6. Phase 4: Admin Governance
7. Phase 5: Automated Payments and Payment Splitting

Reason:

Registration add-ons provide immediate value because runners already make purchase decisions during registration. The event shop can come next to support purchases after registration and merchandise sales for supporters.

---

## Architecture Alignment Notes

Use these constraints when implementing to avoid mismatches with the current app:

- Stack and rendering: Express + EJS + existing CSS patterns (not Tailwind-first).
- Router mount pattern: public/runner routes mounted at `/`, organizer routes mounted at `/organizer`, admin routes mounted at `/admin`.
- Existing role naming in code uses `organiser` for role values and `/organizer` for URL paths.
- CSRF is already enforced in existing route patterns and should be applied consistently to new shop POST/PATCH/DELETE routes.
- Existing payment flow for registration uses manual proof upload and review; shop MVP should follow the same pattern first.

---

## Business Goals

The feature should help HelloRun:

- Increase revenue per event
- Support event shirt, medal, and race kit sales
- Help organisers manage event-related merchandise
- Support free virtual events with optional paid items
- Reduce manual tracking through spreadsheets and chat messages
- Make order and payment status visible to runners
- Prepare the platform for future automated payment processing

---

## Non-Goals for MVP

Do not build these in the first version:

- General running marketplace
- Product reviews
- Multi-seller onboarding outside event organisers
- Courier API integration
- Promo codes
- Automated refund processing
- Advanced tax handling
- Installment payments
- Product recommendation engine
- Shopee/Lazada-style public marketplace

HelloRun should focus first on event-linked commerce.

---

## User Roles

### Runner

A runner can:

- View available event products
- Select add-ons during registration
- Buy event shop items after registration
- Select variants such as shirt size
- Upload payment proof
- View order status
- View fulfilment status
- Cancel unpaid orders, if allowed
- Download or view order summary

A runner cannot:

- Create products
- Edit inventory
- Approve payments
- Update fulfilment status
- Access organiser reports

---

### Organiser

An organiser can:

- Create products for their own events
- Add product variants
- Upload product images
- Set product prices
- Set inventory per variant
- Enable product as registration add-on
- Enable product in the event shop
- View orders for their own events
- Review payment proofs, if permitted
- Update fulfilment status
- Export product and order reports

An organiser cannot:

- Edit products from other organisers
- Edit HelloRun platform fees
- Approve products globally unless admin role is granted
- Access global sales data outside their events

---

### Admin

An admin can:

- View all shop products
- Approve or reject organiser products
- Hide inappropriate or incomplete products
- Manage HelloRun-owned products
- Configure platform fees
- Review all orders
- Review payment proofs
- Override fulfilment status
- Export global commerce reports
- Manage shop feature settings

---

## Product Ownership Model

Products should support two ownership types:

```text
owner_type = hellorun | organiser
```

### HelloRun-Owned Product

Used when HelloRun directly organises or manages the product.

Examples:

- HelloRun 2026K Challenge shirt
- HelloRun finisher medal
- HelloRun completion patch
- HelloRun sponsor bundle

### Organiser-Owned Product

Used when an event organiser manages their own merchandise.

Examples:

- Event shirt
- Club merchandise
- Race kit
- Optional medal
- Hydration voucher
- Event donation add-on

---

## Product Types

Use the following product types:

```text
product_type = registration_addon | event_shop_item | digital_item | delivery_fee | donation | sponsor_item
```

| Product Type | Description | Example | Appears During Registration | Appears in Event Shop |
|---|---|---|---:|---:|
| registration_addon | Extra item selected during event registration | Event shirt | Yes | Optional |
| event_shop_item | Product sold from the event shop | Extra event shirt | Optional | Yes |
| digital_item | Digital product or digital upgrade | Premium certificate | Optional | Yes |
| delivery_fee | Fee for mailing physical items | Shipping fee | Yes | Yes |
| donation | Optional charity or cause support | Donation to partner beneficiary | Yes | Optional |
| sponsor_item | Sponsor-provided product or bundle | Sponsor race kit | Optional | Yes |

---

## Core User Flows

## Flow 1: Runner Buys Add-on During Registration

```text
Runner opens event page
↓
Runner clicks Register
↓
Runner selects distance and participation mode
↓
System displays available registration add-ons
↓
Runner selects shirt size, medal option, delivery option, or donation
↓
System calculates total amount
↓
Runner submits registration
↓
System creates registration record
↓
System creates order record
↓
Runner uploads payment proof
↓
Organiser or admin reviews payment proof
↓
Payment is approved or rejected
↓
Runner sees updated order status
```

---

## Flow 2: Runner Buys Product After Registration

```text
Runner opens event shop
↓
Runner selects product
↓
Runner selects variant
↓
Runner adds item to cart
↓
Runner checks out
↓
System creates order record
↓
Runner uploads payment proof
↓
Organiser or admin reviews payment proof
↓
System updates payment status
↓
Organiser prepares item
↓
Runner sees fulfilment status
```

---

## Flow 3: Organiser Creates Product

```text
Organiser opens event dashboard
↓
Organiser opens Shop Management
↓
Organiser clicks Add Product
↓
Organiser enters product details
↓
Organiser uploads image
↓
Organiser adds variants
↓
Organiser sets inventory
↓
Organiser chooses where product appears
↓
Organiser saves product
↓
Product is saved as draft or pending review
↓
Admin approves product if approval is required
↓
Product becomes active
```

---

## Flow 4: Payment Review

```text
Runner uploads proof of payment
↓
System creates payment review entry
↓
Organiser or admin opens Payment Review queue
↓
Reviewer checks proof image, expected amount, and submitted reference
↓
Reviewer approves, rejects, or requests correction
↓
System updates order payment status
↓
Runner receives app notification
```

---

## Flow 5: Fulfilment

```text
Payment is approved
↓
Order appears in fulfilment queue
↓
Organiser prepares item
↓
Organiser marks order as ready for pickup or shipped
↓
Runner receives app notification
↓
Runner claims item or receives delivery
↓
Organiser marks order as completed
```

---

## Runner-Facing Pages

### 1. Event Shop Page

Suggested route:

```text
GET /events/:eventSlug/shop
```

Purpose:

- Display products linked to a specific event
- Allow runners and supporters to buy event-related items

Page sections:

- Event shop header
- Product grid
- Filter by product type
- Product availability notice
- Order cut-off notice
- Pickup or delivery notice

Required product card details:

- Product image
- Product name
- Price
- Variant availability
- Stock status
- Add to cart button

---

### 2. Product Detail Page

Suggested route:

```text
GET /events/:eventSlug/shop/:productSlug
```

Purpose:

- Show full product details
- Allow variant selection
- Show pickup or delivery instructions

Required sections:

- Product image gallery
- Product name
- Product price
- Description
- Variant selector
- Quantity selector
- Stock status
- Availability deadline
- Delivery or pickup instructions
- Add to cart button

---

### 3. Cart Page

Suggested route:

```text
GET /shop/cart
```

Purpose:

- Review selected items before checkout

Required sections:

- Cart items
- Product snapshot
- Variant snapshot
- Quantity
- Unit price
- Line total
- Subtotal
- Delivery fee
- Total amount
- Checkout button

---

### 4. Checkout Page

Suggested route:

```text
GET /shop/checkout
POST /shop/checkout
```

Purpose:

- Create order
- Capture delivery or pickup preference
- Prepare payment instruction

Required fields:

- Buyer name
- Buyer email
- Buyer contact number
- Delivery or pickup option
- Delivery address, if delivery is selected
- Order notes, optional

---

### 5. Payment Proof Upload Page

Suggested route:

```text
GET /orders/:orderNumber/payment
POST /orders/:orderNumber/payment-proof
```

Purpose:

- Allow runner to upload proof of payment

Required fields:

- Payment method
- Payment reference number
- Amount paid
- Proof image upload
- Optional payment notes

---

### 6. Runner Orders Page

Suggested route:

```text
GET /orders
GET /orders/:orderNumber
```

Purpose:

- Allow runner to track orders

Required details:

- Order number
- Event
- Product items
- Total amount
- Payment status
- Fulfilment status
- Pickup or delivery instructions
- Created date

---

## Organiser Shop Management Pages

### 1. Product List

Suggested route:

```text
GET /organizer/events/:eventId/shop/products
```

Required columns:

- Product image
- Product name
- Product type
- Price range
- Total stock
- Sold count
- Visibility
- Status
- Actions

Actions:

- View
- Edit
- Duplicate
- Hide
- Archive

---

### 2. Create Product

Suggested route:

```text
GET /organizer/events/:eventId/shop/products/new
POST /organizer/events/:eventId/shop/products
```

Required fields:

- Product name
- Product type
- Product description
- Product image
- Base price
- Currency
- Product visibility
- Show during registration
- Show in event shop
- Available from
- Available until
- Pickup allowed
- Delivery allowed
- Delivery fee
- Product status

---

### 3. Edit Product

Suggested route:

```text
GET /organizer/events/:eventId/shop/products/:productId/edit
PATCH /organizer/events/:eventId/shop/products/:productId
```

Editable fields:

- Product name
- Product description
- Product image
- Product visibility
- Product availability dates
- Product type
- Product placement
- Pickup or delivery options
- Status

Important rule:

If a product already has orders, do not overwrite historical order item data. Use snapshots in order items.

---

### 4. Product Variants

Suggested route:

```text
GET /organizer/events/:eventId/shop/products/:productId/variants
POST /organizer/events/:eventId/shop/products/:productId/variants
PATCH /organizer/events/:eventId/shop/products/:productId/variants/:variantId
```

Variant fields:

- Variant name
- SKU
- Size
- Colour
- Price
- Stock quantity
- Low stock threshold
- Is active

Example variants:

```text
Small / Black
Medium / Black
Large / Black
XL / Black
```

---

### 5. Orders Dashboard

Suggested route:

```text
GET /organizer/events/:eventId/shop/orders
```

Required columns:

- Order number
- Buyer
- Product count
- Total amount
- Payment status
- Fulfilment status
- Created date
- Action needed

Filters:

- Payment pending
- Payment approved
- Payment rejected
- Ready for fulfilment
- Ready for pickup
- Shipped
- Claimed
- Cancelled

---

### 6. Payment Review Queue

Suggested route:

```text
GET /organizer/events/:eventId/shop/payment-reviews
PATCH /organizer/events/:eventId/shop/payment-reviews/:paymentId
```

Reviewer should see:

- Order number
- Buyer name
- Expected amount
- Submitted amount
- Payment method
- Payment reference
- Proof image
- Submitted date

Actions:

- Approve payment
- Reject payment
- Request correction
- Add internal note

---

### 7. Fulfilment Queue

Suggested route:

```text
GET /organizer/events/:eventId/shop/fulfilment
PATCH /organizer/events/:eventId/shop/orders/:orderId/fulfilment
```

Required columns:

- Order number
- Buyer
- Items
- Pickup or delivery
- Fulfilment status
- Claim code or QR code
- Action

Actions:

- Mark as preparing
- Mark as ready for pickup
- Mark as shipped
- Mark as claimed
- Mark as completed

---

### 8. Reports

Suggested route:

```text
GET /organizer/events/:eventId/shop/reports
GET /organizer/events/:eventId/shop/reports/export.csv
GET /organizer/events/:eventId/shop/reports/export.xlsx
```

Reports:

- Sales by product
- Sales by variant
- Shirt size breakdown
- Payment status report
- Fulfilment status report
- Claimed vs unclaimed items
- Delivery list
- Pickup list

---

## Admin Shop Management Pages

### 1. Global Product Management

Suggested route:

```text
GET /admin/shop/products
```

Admin can:

- View all products
- Filter by organiser
- Filter by event
- Filter by status
- Approve product
- Reject product
- Hide product
- Archive product

---

### 2. Product Approval Queue

Suggested route:

```text
GET /admin/shop/product-approvals
PATCH /admin/shop/product-approvals/:productId
```

Approval statuses:

```text
draft
pending_review
approved
rejected
hidden
archived
```

Admin actions:

- Approve
- Reject with reason
- Hide
- Return to organiser for revision

---

### 3. Global Orders

Suggested route:

```text
GET /admin/shop/orders
```

Admin can:

- View all orders
- Filter by event
- Filter by organiser
- Filter by payment status
- Filter by fulfilment status
- Export data

---

### 4. Shop Settings

Suggested route:

```text
GET /admin/shop/settings
PATCH /admin/shop/settings
```

Settings:

- Enable or disable shop globally
- Enable organiser-created products
- Require admin approval for organiser products
- Enable manual payment proof
- Enable automated payment gateway
- Platform fee type
- Platform fee value
- Maximum product images
- Maximum variants per product
- Default currency

---

## Status Definitions

## Product Status

```text
draft
pending_review
active
hidden
archived
rejected
```

Meaning:

- `draft`: Product is saved but not visible.
- `pending_review`: Product is waiting for admin approval.
- `active`: Product is visible based on placement settings.
- `hidden`: Product is not visible but preserved.
- `archived`: Product is retired and should not be edited for new sales.
- `rejected`: Product was not approved.

---

## Payment Status

```text
unpaid
pending_review
paid
rejected
correction_required
refunded
cancelled
```

Meaning:

- `unpaid`: Order exists but no payment proof has been submitted.
- `pending_review`: Runner uploaded payment proof.
- `paid`: Payment has been approved.
- `rejected`: Payment proof was rejected.
- `correction_required`: More payment information is needed.
- `refunded`: Payment was refunded manually or externally.
- `cancelled`: Order was cancelled.

---

## Fulfilment Status

```text
not_started
preparing
ready_for_pickup
shipped
claimed
completed
cancelled
```

Meaning:

- `not_started`: Payment is not yet approved or item preparation has not started.
- `preparing`: Organiser is preparing the item.
- `ready_for_pickup`: Runner can claim the item.
- `shipped`: Item has been sent for delivery.
- `claimed`: Runner has claimed the item.
- `completed`: Order is fully closed.
- `cancelled`: Fulfilment was cancelled.

---

## Database Design

HelloRun uses a hybrid database design. Use PostgreSQL/Supabase for transactional data and MongoDB for flexible content.

### Schema Decision Required Before Implementation

The repository already contains `src/db/migrations/008_phase8_shop_commerce.sql` with initial commerce tables (`products_core`, `product_variants`, `orders`, `order_items`, `inventory_movements`).

Before coding, pick one strategy and document it in implementation notes:

- Option A (recommended): evolve existing Phase 8 tables through additive migrations.
- Option B: introduce `shop_*` v2 tables and add bridge/backfill logic from legacy Phase 8 tables.

Migration safety rule:

- Do not modify already-applied migration files.
- Add new migration files only.

### Decision Log

| Decision Area | Selected Option | Date | Owner | Notes |
|---|---|---|---|---|
| Schema strategy | Option A: evolve Phase 8 tables through additive migrations | 2026-05-18 | Codex | Keep `008_phase8_shop_commerce.sql` immutable. Add changes through `010_phase10_shop_foundation_alignment.sql` and later migrations. |
| Canonical table names | Existing `products_core`, `product_variants`, `orders`, `order_items`, `inventory_movements` family, plus additive `shop_payments`, `shop_fulfilment_logs`, and `shop_platform_fees` | 2026-05-18 | Codex | Avoid duplicate parallel `shop_products_core` / `shop_orders` v2 tables during Phase 1A. |
| Status mapping policy | Additive unified commerce values on existing tables | 2026-05-18 | Codex | Product status supports `draft`, `pending_review`, `active`, `hidden`, `archived`, `rejected`; order payment status uses manual-proof states; fulfilment status is stored separately from legacy `order_status`. |
| Route rollout strategy | Mounted skeleton routes with no full shop UI yet | 2026-05-18 | Codex | Public, organizer, and admin route modules are mounted, but storefront and dashboard UI polish remain later phases. |
| Payment MVP mode | Manual proof only | 2026-05-18 | Codex | Aligns with existing registration payment proof flow. No automated gateway, payment splitting, or webhook integration in Phase 1A. |
| Route spelling policy | URL paths use `/organizer`; role values keep `organiser` | 2026-05-18 | Codex | Matches current HelloRun conventions and existing auth middleware. |
| Additive migration policy | New migrations only after a file has been applied | 2026-05-18 | Codex | Migration runner records filenames in `schema_migrations`; applied SQL files must not be edited for follow-up changes. |

Decision outcome guidance:

- If Option A is selected, extend Phase 8 tables with additive migrations and avoid parallel `shop_*` duplicates.
- If Option B is selected, define explicit bridge/backfill and deprecation timeline for Phase 8 tables.

---

# PostgreSQL / Supabase Tables

## 1. `shop_products_core`

Purpose:

Stores the stable product record used for ownership, price, visibility, and status.

Suggested fields:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
event_id UUID NULL,
organiser_id UUID NULL,
owner_type VARCHAR(30) NOT NULL CHECK (owner_type IN ('hellorun', 'organiser')),
product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('registration_addon', 'event_shop_item', 'digital_item', 'delivery_fee', 'donation', 'sponsor_item')),
base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
currency VARCHAR(10) NOT NULL DEFAULT 'PHP',
status VARCHAR(30) NOT NULL DEFAULT 'draft',
is_visible BOOLEAN NOT NULL DEFAULT false,
show_during_registration BOOLEAN NOT NULL DEFAULT false,
show_in_event_shop BOOLEAN NOT NULL DEFAULT false,
is_featured BOOLEAN NOT NULL DEFAULT false,
requires_admin_approval BOOLEAN NOT NULL DEFAULT true,
available_from TIMESTAMPTZ NULL,
available_until TIMESTAMPTZ NULL,
allow_pickup BOOLEAN NOT NULL DEFAULT true,
allow_delivery BOOLEAN NOT NULL DEFAULT false,
delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
created_by UUID NULL,
updated_by UUID NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Indexes:

```sql
CREATE INDEX idx_shop_products_event_id ON shop_products_core(event_id);
CREATE INDEX idx_shop_products_organiser_id ON shop_products_core(organiser_id);
CREATE INDEX idx_shop_products_status ON shop_products_core(status);
CREATE INDEX idx_shop_products_visibility ON shop_products_core(is_visible, show_in_event_shop, show_during_registration);
```

---

## 2. `shop_product_variants`

Purpose:

Stores purchasable variants such as shirt sizes, colour options, and SKU-level inventory.

Suggested fields:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
product_id UUID NOT NULL REFERENCES shop_products_core(id),
sku VARCHAR(100) NULL,
variant_name VARCHAR(150) NOT NULL,
size VARCHAR(50) NULL,
colour VARCHAR(50) NULL,
price NUMERIC(12,2) NOT NULL,
stock_quantity INTEGER NOT NULL DEFAULT 0,
reserved_quantity INTEGER NOT NULL DEFAULT 0,
sold_quantity INTEGER NOT NULL DEFAULT 0,
low_stock_threshold INTEGER NOT NULL DEFAULT 5,
is_active BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Indexes:

```sql
CREATE INDEX idx_shop_variants_product_id ON shop_product_variants(product_id);
CREATE INDEX idx_shop_variants_sku ON shop_product_variants(sku);
```

Inventory rule:

```text
available_quantity = stock_quantity - reserved_quantity - sold_quantity
```

---

## 3. `shop_orders`

Purpose:

Stores order-level transaction data.

Suggested fields:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
order_number VARCHAR(50) UNIQUE NOT NULL,
user_id UUID NOT NULL,
event_id UUID NULL,
organiser_id UUID NULL,
registration_id UUID NULL,
order_source VARCHAR(50) NOT NULL CHECK (order_source IN ('registration_checkout', 'event_shop', 'global_shop', 'admin_created')),
subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
currency VARCHAR(10) NOT NULL DEFAULT 'PHP',
payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
fulfilment_status VARCHAR(50) NOT NULL DEFAULT 'not_started',
delivery_method VARCHAR(50) NULL CHECK (delivery_method IN ('pickup', 'delivery')),
delivery_address_snapshot TEXT NULL,
pickup_instruction_snapshot TEXT NULL,
customer_note TEXT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Indexes:

```sql
CREATE INDEX idx_shop_orders_user_id ON shop_orders(user_id);
CREATE INDEX idx_shop_orders_event_id ON shop_orders(event_id);
CREATE INDEX idx_shop_orders_organiser_id ON shop_orders(organiser_id);
CREATE INDEX idx_shop_orders_payment_status ON shop_orders(payment_status);
CREATE INDEX idx_shop_orders_fulfilment_status ON shop_orders(fulfilment_status);
```

Order number format:

```text
HR-SHOP-YYYYMMDD-XXXXXX
```

Example:

```text
HR-SHOP-20260518-A8K42P
```

---

## 4. `shop_order_items`

Purpose:

Stores product line items. Use snapshots to preserve historical order details even if product data changes later.

Suggested fields:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
order_id UUID NOT NULL REFERENCES shop_orders(id),
product_id UUID NOT NULL REFERENCES shop_products_core(id),
variant_id UUID NULL REFERENCES shop_product_variants(id),
product_name_snapshot VARCHAR(255) NOT NULL,
variant_name_snapshot VARCHAR(255) NULL,
sku_snapshot VARCHAR(100) NULL,
quantity INTEGER NOT NULL DEFAULT 1,
unit_price NUMERIC(12,2) NOT NULL,
line_total NUMERIC(12,2) NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Indexes:

```sql
CREATE INDEX idx_shop_order_items_order_id ON shop_order_items(order_id);
CREATE INDEX idx_shop_order_items_product_id ON shop_order_items(product_id);
CREATE INDEX idx_shop_order_items_variant_id ON shop_order_items(variant_id);
```

---

## 5. `shop_payments`

Purpose:

Stores payment proof and payment review information.

Suggested fields:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
order_id UUID NOT NULL REFERENCES shop_orders(id),
payment_method VARCHAR(50) NOT NULL,
payment_reference VARCHAR(150) NULL,
proof_image_url TEXT NULL,
amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
reviewed_by UUID NULL,
reviewed_at TIMESTAMPTZ NULL,
rejection_reason TEXT NULL,
review_note TEXT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Indexes:

```sql
CREATE INDEX idx_shop_payments_order_id ON shop_payments(order_id);
CREATE INDEX idx_shop_payments_status ON shop_payments(status);
```

---

## 6. `shop_inventory_movements`

Purpose:

Tracks inventory changes for auditability.

Suggested fields:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
product_id UUID NOT NULL REFERENCES shop_products_core(id),
variant_id UUID NOT NULL REFERENCES shop_product_variants(id),
movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('stock_added', 'stock_removed', 'reserved', 'reservation_released', 'sold', 'returned', 'manual_adjustment')),
quantity INTEGER NOT NULL,
reason TEXT NULL,
related_order_id UUID NULL REFERENCES shop_orders(id),
created_by UUID NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Indexes:

```sql
CREATE INDEX idx_shop_inventory_variant_id ON shop_inventory_movements(variant_id);
CREATE INDEX idx_shop_inventory_product_id ON shop_inventory_movements(product_id);
CREATE INDEX idx_shop_inventory_order_id ON shop_inventory_movements(related_order_id);
```

---

## 7. `shop_fulfilment_logs`

Purpose:

Tracks fulfilment status changes.

Suggested fields:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
order_id UUID NOT NULL REFERENCES shop_orders(id),
old_status VARCHAR(50) NULL,
new_status VARCHAR(50) NOT NULL,
note TEXT NULL,
updated_by UUID NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Indexes:

```sql
CREATE INDEX idx_shop_fulfilment_logs_order_id ON shop_fulfilment_logs(order_id);
```

---

## 8. `shop_platform_fees`

Purpose:

Stores platform fee rules.

Suggested fields:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
fee_name VARCHAR(100) NOT NULL,
fee_type VARCHAR(30) NOT NULL CHECK (fee_type IN ('fixed', 'percentage')),
fee_value NUMERIC(12,2) NOT NULL,
applies_to VARCHAR(50) NOT NULL CHECK (applies_to IN ('all', 'organiser_products', 'hellorun_products')),
is_active BOOLEAN NOT NULL DEFAULT true,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# MongoDB Collections

## 1. `shop_product_content`

Purpose:

Stores flexible display content for products.

Example document:

```json
{
  "productId": "uuid-from-postgres",
  "slug": "2026k-finisher-shirt",
  "name": "2026K Challenge Finisher Shirt",
  "shortDescription": "Optional event shirt for the 2026K Challenge.",
  "fullDescription": "A lightweight event shirt for participants of the 2026K Challenge.",
  "careInstructions": "Wash inside out. Do not bleach.",
  "pickupInstructions": "Claiming instructions will be sent through app notification.",
  "deliveryInstructions": "Make sure your profile has the correct mailing address.",
  "seoTitle": "2026K Challenge Finisher Shirt | HelloRun",
  "seoDescription": "Buy the optional 2026K Challenge finisher shirt from HelloRun.",
  "createdAt": "2026-05-18T00:00:00.000Z",
  "updatedAt": "2026-05-18T00:00:00.000Z"
}
```

---

## 2. `shop_media_metadata`

Purpose:

Stores product image metadata and Cloudflare R2 references.

Example document:

```json
{
  "productId": "uuid-from-postgres",
  "images": [
    {
      "url": "https://cdn.hellorun.online/shop/2026k-shirt.webp",
      "alt": "2026K Challenge finisher shirt",
      "sortOrder": 1,
      "isPrimary": true,
      "mimeType": "image/webp",
      "sizeBytes": 128000
    }
  ],
  "createdAt": "2026-05-18T00:00:00.000Z",
  "updatedAt": "2026-05-18T00:00:00.000Z"
}
```

---

## 3. `shop_order_notes`

Purpose:

Stores flexible notes related to order review, fulfilment, or support.

Example document:

```json
{
  "orderId": "uuid-from-postgres",
  "notes": [
    {
      "type": "internal",
      "message": "Runner requested size change from Medium to Large before fulfilment.",
      "createdBy": "admin-user-id",
      "createdAt": "2026-05-18T00:00:00.000Z"
    }
  ]
}
```

---

## 4. `shop_policy_snapshots`

Purpose:

Stores the policy version accepted by the user at checkout.

Example document:

```json
{
  "orderId": "uuid-from-postgres",
  "acceptedPolicies": {
    "termsVersion": "1.0.0",
    "privacyVersion": "1.0.0",
    "refundPolicyVersion": "1.0.0"
  },
  "acceptedAt": "2026-05-18T00:00:00.000Z",
  "ipAddress": "masked-or-hashed-ip",
  "userAgent": "browser-user-agent"
}
```

---

## API Routes

The exact route style should follow the existing HelloRun Express/EJS conventions.

---

# Public / Runner Routes

```text
GET    /events/:eventSlug/shop
GET    /events/:eventSlug/shop/:productSlug
GET    /shop/cart
POST   /shop/cart/add
PATCH  /shop/cart/items/:itemId
DELETE /shop/cart/items/:itemId
GET    /shop/checkout
POST   /shop/checkout
GET    /orders
GET    /orders/:orderNumber
GET    /orders/:orderNumber/payment
POST   /orders/:orderNumber/payment-proof
POST   /orders/:orderNumber/cancel
```

---

# Organiser Routes

```text
GET    /organizer/events/:eventId/shop
GET    /organizer/events/:eventId/shop/products
GET    /organizer/events/:eventId/shop/products/new
POST   /organizer/events/:eventId/shop/products
GET    /organizer/events/:eventId/shop/products/:productId/edit
PATCH  /organizer/events/:eventId/shop/products/:productId
POST   /organizer/events/:eventId/shop/products/:productId/archive
POST   /organizer/events/:eventId/shop/products/:productId/hide

GET    /organizer/events/:eventId/shop/products/:productId/variants
POST   /organizer/events/:eventId/shop/products/:productId/variants
PATCH  /organizer/events/:eventId/shop/products/:productId/variants/:variantId
DELETE /organizer/events/:eventId/shop/products/:productId/variants/:variantId

GET    /organizer/events/:eventId/shop/orders
GET    /organizer/events/:eventId/shop/orders/:orderId
PATCH  /organizer/events/:eventId/shop/orders/:orderId/fulfilment

GET    /organizer/events/:eventId/shop/payment-reviews
PATCH  /organizer/events/:eventId/shop/payment-reviews/:paymentId

GET    /organizer/events/:eventId/shop/reports
GET    /organizer/events/:eventId/shop/reports/export.csv
GET    /organizer/events/:eventId/shop/reports/export.xlsx
```

---

# Admin Routes

```text
GET    /admin/shop
GET    /admin/shop/products
GET    /admin/shop/product-approvals
PATCH  /admin/shop/product-approvals/:productId
GET    /admin/shop/orders
GET    /admin/shop/payments
GET    /admin/shop/reports
GET    /admin/shop/settings
PATCH  /admin/shop/settings
```

---

## Services to Create

Suggested service files:

```text
services/shop/productService.js
services/shop/variantService.js
services/shop/cartService.js
services/shop/orderService.js
services/shop/paymentReviewService.js
services/shop/inventoryService.js
services/shop/fulfilmentService.js
services/shop/shopReportService.js
services/shop/shopSettingsService.js
services/shop/shopNotificationService.js
```

---

## Middleware and Access Control

Required checks:

```text
requireAuth
requireRunner
requireOrganizer
requireAdmin
canManageEventShop(eventId)
canReviewShopPayment(eventId)
canUpdateFulfilment(eventId)
canViewShopOrder(orderId)
canManageShopProduct(productId)
```

Current middleware baseline in code already includes:

- `requireAuth`
- `requireOrganizer`
- `requireApprovedOrganizer`
- `requireAdmin`

Add missing shop-specific guards as new middleware/util checks without breaking existing auth middleware behavior.

Rules:

- Runners can only view their own orders.
- Organisers can only manage products and orders for their own events.
- Admins can manage all products and orders.
- Payment proof review should be logged.
- Product changes after orders exist should not alter order snapshots.

---

## Validation Rules

## Product Validation

Required:

- Product name
- Product type
- Base price
- Placement setting
- Product status

Rules:

- Price must be greater than or equal to 0.
- Donation products may allow flexible amount only in a later phase.
- Product must have at least one active variant if inventory tracking is enabled.
- `available_until` must be later than `available_from`.
- Product cannot be visible if required content is missing.

---

## Variant Validation

Required:

- Variant name
- Price
- Stock quantity

Rules:

- Stock cannot be negative.
- Price cannot be negative.
- SKU should be unique per organiser or event if provided.
- Variant cannot be deleted if it has existing order items. It should be deactivated instead.

---

## Order Validation

Rules:

- Order total must be calculated server-side.
- Client-submitted prices must not be trusted.
- Product and variant snapshots must be saved at checkout.
- Do not allow checkout for inactive products.
- Do not allow checkout for unavailable products.
- Do not allow checkout when variant stock is insufficient.
- Reserve stock during checkout if payment proof is expected.

---

## Payment Proof Validation

Required:

- Payment method
- Amount paid
- Proof image

Rules:

- Payment proof image should be stored in Cloudflare R2.
- Only accepted file types should be allowed.
- File size limit should be enforced.
- Payment proof update should create or update a payment record.
- Re-upload should be allowed only if previous payment was rejected or correction is required.

---

## Inventory Rules

Use inventory movement logs for all stock changes.

Inventory movement types:

```text
stock_added
stock_removed
reserved
reservation_released
sold
returned
manual_adjustment
```

Recommended logic:

- When order is created, reserve stock.
- When payment is approved, convert reserved stock to sold stock.
- When payment is rejected and order is cancelled, release reserved stock.
- When organiser manually adjusts stock, create movement log.

Important:

Do not silently edit stock counts without a movement record.

---

## Notifications

Use app notifications first. Use email only for important events because email quota may be limited.

Recommended app notifications:

- Order created
- Payment proof submitted
- Payment approved
- Payment rejected
- Correction required
- Item ready for pickup
- Item shipped
- Order completed

Recommended email notifications:

- Payment approved
- Payment rejected
- Item ready for pickup
- Important fulfilment update

Do not email for every minor order status change.

---

## UI Placement

## Runner Navigation

Add:

```text
Shop
My Orders
```

Inside event page:

```text
Register
Event Details
Leaderboard
Shop
Results
```

---

## Organiser Dashboard Navigation

Add under event management:

```text
Shop Management
├── Products
├── Orders
├── Payment Review
├── Inventory
├── Fulfilment
└── Reports
```

---

## Admin Navigation

Add:

```text
Shop
├── Products
├── Product Approvals
├── Orders
├── Payments
├── Reports
└── Settings
```

---

## Registration Integration

During registration, show only products where:

```text
show_during_registration = true
status = active
is_visible = true
available_from <= now
available_until >= now OR available_until IS NULL
```

Do not show the full shop during registration.

Keep the registration form simple:

- Show shirt or core event add-ons only
- Use collapsible optional add-ons if needed
- Display total amount clearly
- Show variant availability

---

## Event Shop Integration

Event shop should show products where:

```text
show_in_event_shop = true
status = active
is_visible = true
available_from <= now
available_until >= now OR available_until IS NULL
```

The event shop can be visible even after registration closes if products are still available.

---

## Reporting Requirements

Organiser reports:

- Total shop sales
- Total add-on sales
- Sales by product
- Sales by variant
- Shirt size breakdown
- Pending payments
- Paid orders
- Unfulfilled orders
- Delivery list
- Pickup list

Admin reports:

- Global shop sales
- Sales by organiser
- Sales by event
- Platform fee totals
- Manual payment review volume
- Product approval queue size
- Pending fulfilment count

---

## Security Requirements

- Use CSRF protection on all POST, PATCH, and DELETE routes.
- Validate all IDs server-side.
- Do not trust client-submitted prices.
- Use server-side recalculation of totals.
- Restrict organiser access to owned events only.
- Restrict runner access to owned orders only.
- Log payment review decisions.
- Log inventory movements.
- Sanitize product content.
- Limit upload file size.
- Validate image MIME type.
- Store payment proof securely.
- Avoid exposing private payment proof URLs publicly.

---

## SEO Requirements

Event shop pages should have SEO metadata:

```text
<title>Event Shop | Event Name | HelloRun</title>
<meta name="description" content="Buy official event merchandise, shirts, medals, and add-ons for Event Name on HelloRun.">
```

Product detail pages should have:

```text
<title>Product Name | Event Name | HelloRun</title>
<meta name="description" content="Product short description">
```

Add structured data later if needed.

---

## Audit Trail Requirements

Log these events:

- Product created
- Product updated
- Product approved
- Product rejected
- Product hidden
- Product archived
- Variant created
- Variant updated
- Inventory adjusted
- Order created
- Payment proof uploaded
- Payment approved
- Payment rejected
- Fulfilment status updated

Audit fields:

```text
actor_id
action
entity_type
entity_id
old_value
new_value
ip_address
user_agent
created_at
```

---

## MVP Acceptance Criteria

The MVP is complete when:

- Organiser can create a product for an event.
- Organiser can add variants and stock.
- Organiser can mark product as registration add-on.
- Runner can select add-on during registration.
- System creates order records for selected add-ons.
- Runner can upload payment proof for an order.
- Organiser or admin can approve or reject payment proof.
- Inventory updates after payment approval.
- Runner can view order status.
- Organiser can export orders.
- Admin can view all shop orders.

---

## Phase 1 Implementation Tasks

### Phase 0: PRD and Architecture Lock

- Confirm schema strategy (evolve Phase 8 tables vs `shop_*` v2 tables).
- Confirm status enum mapping between existing registration payment statuses and shop order/payment statuses.
- Confirm naming standards (`organizer` path spelling, `organiser` role values, table naming policy).
- Freeze initial MVP scope to manual payment proof only.

### Phase 1A: Commerce Data Foundation

### Backend

- Create additive PostgreSQL migrations for missing shop tables/columns based on selected schema strategy.
- Create MongoDB models for product content and media metadata.
- Create product service.
- Create variant service.
- Create order service.
- Create payment proof service.
- Create inventory service.
- Add route guards and permission checks.
- Add validation middleware.
- Add CSRF protection to shop forms.

### Testing

- Test product creation service.
- Test variant creation service.
- Test order total server-side recalculation.
- Test inventory movement logging integrity.
- Test access control guard behavior.

### Phase 1B: Registration Add-ons MVP

### Frontend / EJS

- Add registration add-ons section to event registration form.
- Create runner order page (registration-sourced orders first).
- Create payment proof upload page for orders.
- Create organizer payment review page for orders.

### Testing

- Test add-on visibility during registration.
- Test order creation.
- Test payment proof upload.
- Test payment approval.
- Test organiser access restrictions.
- Test runner order privacy.

---

## Phase 2 Implementation Tasks

- Create organizer shop management pages (products, variants, orders, payment reviews, inventory, fulfilment, reports).
- Add organizer product create/edit/archive/hide flows.
- Add organizer order filtering and exports.
- Add organizer fulfilment queue and status transitions.
- Add app notifications for payment review and fulfilment milestones.

---

## Phase 3 Implementation Tasks

- Create event shop page.
- Create product detail page.
- Create cart functionality.
- Create checkout page.
- Support post-registration product orders.
- Add runner My Orders pages for shop orders.
- Add SEO metadata for event shop and product pages.

---

## Phase 4 Implementation Tasks

- Add admin product approval.
- Add global shop settings.
- Add platform fee rules.
- Add global shop reports.
- Add product moderation.
- Add product approval notifications.

---

## Phase 5 Implementation Tasks

- Add automated payment gateway support.
- Add webhook handling.
- Add payment reconciliation.
- Add optional payment splitting.
- Add refund tracking.

---

## Suggested File Structure

```text
routes/
├── shop.routes.js
├── organizerShop.routes.js
└── adminShop.routes.js

controllers/
├── shopController.js
├── organizerShopController.js
└── adminShopController.js

services/
└── shop/
    ├── productService.js
    ├── variantService.js
    ├── cartService.js
    ├── orderService.js
    ├── paymentReviewService.js
    ├── inventoryService.js
    ├── fulfilmentService.js
    ├── shopReportService.js
    └── shopNotificationService.js

models/
├── mongo/
│   ├── ShopProductContent.js
│   ├── ShopMediaMetadata.js
│   ├── ShopOrderNotes.js
│   └── ShopPolicySnapshot.js
└── postgres/
    └── shop.sql

views/
├── shop/
│   ├── event-shop.ejs
│   ├── product-detail.ejs
│   ├── cart.ejs
│   ├── checkout.ejs
│   ├── orders.ejs
│   └── order-detail.ejs
├── organizer/
│   └── shop/
│       ├── dashboard.ejs
│       ├── products.ejs
│       ├── product-form.ejs
│       ├── variants.ejs
│       ├── orders.ejs
│       ├── payment-reviews.ejs
│       ├── fulfilment.ejs
│       └── reports.ejs
└── admin/
    └── shop/
        ├── dashboard.ejs
        ├── products.ejs
        ├── approvals.ejs
        ├── orders.ejs
        ├── payments.ejs
        ├── reports.ejs
        └── settings.ejs
```

---

## Suggested Codex Prompt

Use this prompt when asking Codex to implement the feature:

```text
Implement the HelloRun Shop and Shop Management feature based on docs/hellorun_shop_and_shop_management_prd.md.

Start with Phase 1 only:

1. Add database migrations for shop products, variants, orders, order items, payments, inventory movements, fulfilment logs, and platform fees.
2. Add MongoDB models for shop product content, media metadata, order notes, and policy snapshots.
3. Add organiser product management routes and views.
4. Add variant management.
5. Add registration add-ons integration in the event registration flow.
6. Add order creation for selected add-ons.
7. Add payment proof upload and review.
8. Add inventory movement logging.
9. Add role-based access control for runner, organiser, and admin.
10. Add tests for product creation, variant creation, order creation, payment review, inventory movement, and access control.

Follow the existing HelloRun architecture, route style, EJS layout patterns, current CSS system, CSRF protection, and existing authentication middleware. Do not implement automated payment gateway integration yet. Manual payment proof is the MVP payment method.
```

---

## Implementation Priority

Build in this order:

1. Phase 0 architecture and schema lock
2. Additive database migrations and models
3. Product and variant services
4. Registration add-on integration
5. Order creation and snapshots
6. Payment proof upload and review
7. Inventory movement logs
8. Organizer shop management UI
9. Runner order tracking and event shop
10. Reports and exports
11. Admin approval and governance

---

## Final Recommendation

HelloRun should implement commerce as an event-linked feature first.

The best MVP is not a general shop. The best MVP is:

```text
Registration Add-ons + Event Shop + Shop Management
```

This gives organisers a practical way to sell event shirts, medals, race kits, and delivery options while keeping HelloRun aligned with its main purpose: running event management.
