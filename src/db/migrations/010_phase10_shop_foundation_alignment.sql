-- Phase 10 (Part 1): Shop foundation alignment (Option A)
-- Strategy: Additive changes only. Do not rewrite prior migrations.

-- =====================================================
-- products_core alignment
-- =====================================================
alter table if exists products_core
  add column if not exists owner_type text,
  add column if not exists product_type text,
  add column if not exists is_visible boolean not null default false,
  add column if not exists show_during_registration boolean not null default false,
  add column if not exists show_in_event_shop boolean not null default false,
  add column if not exists requires_admin_approval boolean not null default true,
  add column if not exists available_from timestamptz,
  add column if not exists available_until timestamptz,
  add column if not exists allow_pickup boolean not null default true,
  add column if not exists allow_delivery boolean not null default false,
  add column if not exists delivery_fee numeric(12,2) not null default 0,
  add column if not exists updated_by uuid references app_users(id);

update products_core
set owner_type = coalesce(nullif(owner_type, ''), 'organiser')
where owner_type is null or owner_type = '';

update products_core
set product_type = coalesce(nullif(product_type, ''), 'event_shop_item')
where product_type is null or product_type = '';

-- Compatibility mapping from older status vocabulary.
update products_core
set status = case status
  when 'active' then 'active'
  when 'draft' then 'draft'
  when 'archived' then 'archived'
  else coalesce(status, 'draft')
end;

-- =====================================================
-- product_variants alignment
-- =====================================================
alter table if exists product_variants
  add column if not exists variant_name text,
  add column if not exists reserved_quantity integer not null default 0,
  add column if not exists sold_quantity integer not null default 0,
  add column if not exists low_stock_threshold integer not null default 5,
  add column if not exists is_active boolean not null default true;

update product_variants
set variant_name = trim(concat_ws(' / ', nullif(size, ''), nullif(colour, '')))
where (variant_name is null or variant_name = '')
  and (coalesce(size, '') <> '' or coalesce(colour, '') <> '');

update product_variants
set variant_name = coalesce(nullif(variant_name, ''), 'Default')
where variant_name is null or variant_name = '';

-- =====================================================
-- orders alignment
-- =====================================================
alter table if exists orders
  add column if not exists event_id uuid references events_core(id) on delete set null,
  add column if not exists organiser_id uuid references organisers(id) on delete set null,
  add column if not exists registration_id uuid references registrations(id) on delete set null,
  add column if not exists order_source text,
  add column if not exists currency text not null default 'PHP',
  add column if not exists delivery_fee numeric(12,2) not null default 0,
  add column if not exists platform_fee numeric(12,2) not null default 0,
  add column if not exists fulfilment_status text,
  add column if not exists delivery_method text,
  add column if not exists delivery_address_snapshot text,
  add column if not exists pickup_instruction_snapshot text,
  add column if not exists customer_note text;

-- Backfill additive fields from older naming where possible.
update orders
set order_source = coalesce(nullif(order_source, ''), 'event_shop')
where order_source is null or order_source = '';

update orders
set delivery_fee = coalesce(delivery_fee, shipping_fee, 0)
where delivery_fee is null or delivery_fee = 0;

update orders
set platform_fee = coalesce(platform_fee, service_fee, 0)
where platform_fee is null;

update orders
set fulfilment_status = case
  when order_status in ('pending', 'processing') then 'not_started'
  when order_status = 'shipped' then 'shipped'
  when order_status = 'delivered' then 'completed'
  when order_status = 'cancelled' then 'cancelled'
  else coalesce(fulfilment_status, 'not_started')
end
where fulfilment_status is null or fulfilment_status = '';

update orders
set delivery_address_snapshot = coalesce(delivery_address_snapshot, shipping_address::text)
where delivery_address_snapshot is null and shipping_address is not null;

-- =====================================================
-- inventory_movements alignment
-- =====================================================
alter table if exists inventory_movements
  add column if not exists product_id uuid references products_core(id) on delete cascade,
  add column if not exists movement_type text,
  add column if not exists quantity integer,
  add column if not exists related_order_id uuid references orders(id) on delete set null;

update inventory_movements
set quantity = coalesce(quantity, change_amount, 0)
where quantity is null;

update inventory_movements
set movement_type = case
  when lower(coalesce(reason, '')) in ('sale', 'sold') then 'sold'
  when lower(coalesce(reason, '')) in ('restock', 'stock_added') then 'stock_added'
  when lower(coalesce(reason, '')) in ('return', 'returned') then 'returned'
  when lower(coalesce(reason, '')) in ('adjustment', 'manual_adjustment') then 'manual_adjustment'
  else coalesce(movement_type, 'manual_adjustment')
end
where movement_type is null or movement_type = '';

update inventory_movements im
set product_id = pv.product_id
from product_variants pv
where im.product_id is null
  and im.variant_id = pv.id;

update inventory_movements
set related_order_id = coalesce(related_order_id, reference_id)
where related_order_id is null and reference_id is not null;

-- =====================================================
-- New tables required for manual payment review and fulfilment audit
-- =====================================================
create table if not exists shop_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  payment_method text not null,
  payment_reference text,
  proof_image_url text,
  amount_paid numeric(12,2) not null default 0,
  status text not null default 'pending_review',
  reviewed_by uuid references app_users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shop_fulfilment_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  note text,
  updated_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists shop_platform_fees (
  id uuid primary key default gen_random_uuid(),
  fee_name text not null,
  fee_type text not null,
  fee_value numeric(12,2) not null,
  applies_to text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- Indexes
-- =====================================================
create index if not exists idx_products_core_visibility
  on products_core(is_visible, show_in_event_shop, show_during_registration);

create index if not exists idx_products_core_owner_type
  on products_core(owner_type);

create index if not exists idx_products_core_product_type
  on products_core(product_type);

create index if not exists idx_product_variants_active
  on product_variants(product_id, is_active);

create index if not exists idx_orders_event_id
  on orders(event_id);

create index if not exists idx_orders_organiser_id
  on orders(organiser_id);

create index if not exists idx_orders_payment_status
  on orders(payment_status);

create index if not exists idx_orders_fulfilment_status
  on orders(fulfilment_status);

create index if not exists idx_shop_payments_order_id
  on shop_payments(order_id);

create index if not exists idx_shop_payments_status
  on shop_payments(status);

create index if not exists idx_shop_fulfilment_logs_order_id
  on shop_fulfilment_logs(order_id);

-- =====================================================
-- Triggers for updated_at
-- =====================================================
drop trigger if exists shop_payments_set_updated_at on shop_payments;
create trigger shop_payments_set_updated_at
before update on shop_payments
for each row
execute function set_updated_at();

drop trigger if exists shop_platform_fees_set_updated_at on shop_platform_fees;
create trigger shop_platform_fees_set_updated_at
before update on shop_platform_fees
for each row
execute function set_updated_at();

-- =====================================================
-- Constraints (idempotent via pg_constraint checks)
-- =====================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_core_owner_type_check'
  ) then
    alter table products_core
      add constraint products_core_owner_type_check
      check (owner_type in ('hellorun', 'organiser'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_core_product_type_check'
  ) then
    alter table products_core
      add constraint products_core_product_type_check
      check (product_type in ('registration_addon', 'event_shop_item', 'digital_item', 'delivery_fee', 'donation', 'sponsor_item'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_order_source_check'
  ) then
    alter table orders
      add constraint orders_order_source_check
      check (order_source in ('registration_checkout', 'event_shop', 'global_shop', 'admin_created'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_fulfilment_status_check'
  ) then
    alter table orders
      add constraint orders_fulfilment_status_check
      check (fulfilment_status in ('not_started', 'preparing', 'ready_for_pickup', 'shipped', 'claimed', 'completed', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_delivery_method_check'
  ) then
    alter table orders
      add constraint orders_delivery_method_check
      check (delivery_method in ('pickup', 'delivery') or delivery_method is null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'shop_payments_status_check'
  ) then
    alter table shop_payments
      add constraint shop_payments_status_check
      check (status in ('pending_review', 'paid', 'rejected', 'correction_required', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_movements_movement_type_check'
  ) then
    alter table inventory_movements
      add constraint inventory_movements_movement_type_check
      check (movement_type in ('stock_added', 'stock_removed', 'reserved', 'reservation_released', 'sold', 'returned', 'manual_adjustment'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'shop_platform_fees_type_check'
  ) then
    alter table shop_platform_fees
      add constraint shop_platform_fees_type_check
      check (fee_type in ('fixed', 'percentage'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'shop_platform_fees_applies_to_check'
  ) then
    alter table shop_platform_fees
      add constraint shop_platform_fees_applies_to_check
      check (applies_to in ('all', 'organiser_products', 'hellorun_products'));
  end if;
end $$;
