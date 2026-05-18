-- Phase 10 (Part 2): Shop foundation hardening
-- Strategy: Hardening and operability improvements after alignment migration.

-- =====================================================
-- Data hygiene
-- =====================================================
update product_variants
set stock_quantity = greatest(coalesce(stock_quantity, 0), 0)
where stock_quantity is null or stock_quantity < 0;

update product_variants
set reserved_quantity = greatest(coalesce(reserved_quantity, 0), 0)
where reserved_quantity is null or reserved_quantity < 0;

update product_variants
set sold_quantity = greatest(coalesce(sold_quantity, 0), 0)
where sold_quantity is null or sold_quantity < 0;

update orders
set total_amount = coalesce(subtotal, 0) + coalesce(delivery_fee, 0) + coalesce(platform_fee, 0)
where total_amount is null;

update shop_payments
set amount_paid = greatest(coalesce(amount_paid, 0), 0)
where amount_paid is null or amount_paid < 0;

-- =====================================================
-- Additional indexes for queue operations
-- =====================================================
create index if not exists idx_products_core_event_status_visibility
  on products_core(event_id, status, is_visible);

create index if not exists idx_products_core_registration_visibility
  on products_core(event_id, show_during_registration, status, is_visible);

create index if not exists idx_products_core_shop_visibility
  on products_core(event_id, show_in_event_shop, status, is_visible);

create index if not exists idx_orders_payment_review_queue
  on orders(organiser_id, payment_status, created_at desc);

create index if not exists idx_orders_fulfilment_queue
  on orders(organiser_id, fulfilment_status, created_at desc);

create index if not exists idx_shop_payments_review_queue
  on shop_payments(status, created_at desc);

create index if not exists idx_inventory_movements_variant_created
  on inventory_movements(variant_id, created_at desc);

-- =====================================================
-- Check constraints for numeric consistency
-- =====================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_variants_stock_non_negative_check'
  ) then
    alter table product_variants
      add constraint product_variants_stock_non_negative_check
      check (stock_quantity >= 0 and reserved_quantity >= 0 and sold_quantity >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'product_variants_low_stock_threshold_non_negative_check'
  ) then
    alter table product_variants
      add constraint product_variants_low_stock_threshold_non_negative_check
      check (low_stock_threshold >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_amounts_non_negative_check'
  ) then
    alter table orders
      add constraint orders_amounts_non_negative_check
      check (
        subtotal >= 0
        and delivery_fee >= 0
        and platform_fee >= 0
        and total_amount >= 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'shop_payments_amount_paid_non_negative_check'
  ) then
    alter table shop_payments
      add constraint shop_payments_amount_paid_non_negative_check
      check (amount_paid >= 0);
  end if;
end $$;

-- =====================================================
-- Operational view: available inventory per variant
-- =====================================================
create or replace view v_shop_variant_inventory as
select
  pv.id as variant_id,
  pv.product_id,
  p.name as product_name,
  pv.variant_name,
  pv.sku,
  pv.size,
  pv.colour,
  pv.stock_quantity,
  pv.reserved_quantity,
  pv.sold_quantity,
  (pv.stock_quantity - pv.reserved_quantity - pv.sold_quantity) as available_quantity,
  pv.low_stock_threshold,
  pv.is_active,
  case
    when (pv.stock_quantity - pv.reserved_quantity - pv.sold_quantity) <= pv.low_stock_threshold then true
    else false
  end as is_low_stock
from product_variants pv
join products_core p on p.id = pv.product_id;

-- =====================================================
-- Optional helper view: organizer shop order queue snapshot
-- =====================================================
create or replace view v_shop_order_queue as
select
  o.id,
  o.order_number,
  o.organiser_id,
  o.event_id,
  o.payment_status,
  o.fulfilment_status,
  o.total_amount,
  o.currency,
  o.created_at,
  o.updated_at,
  case
    when o.payment_status in ('unpaid', 'pending_review') then 'payment_action'
    when o.fulfilment_status in ('not_started', 'preparing') then 'fulfilment_action'
    else 'monitor'
  end as action_needed
from orders o;
