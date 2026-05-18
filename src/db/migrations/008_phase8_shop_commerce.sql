-- Phase 8: Shop and Merchandise
-- Purpose: Structured commerce, inventory, and order management.

-- 1. Products Core
CREATE TABLE IF NOT EXISTS products_core (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organiser_id UUID REFERENCES organisers(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events_core(id) ON DELETE SET NULL, -- Nullable if generic shop item
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT,
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT DEFAULT 'PHP',
    status TEXT NOT NULL DEFAULT 'draft', -- draft, active, archived
    is_featured BOOLEAN DEFAULT FALSE,
    content_doc_id TEXT, -- References MongoDB product_content
    media_doc_id TEXT,   -- References MongoDB product_media
    created_by UUID REFERENCES app_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Product Variants (Size, Color, etc.)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products_core(id) ON DELETE CASCADE,
    size TEXT,
    colour TEXT,
    sku TEXT UNIQUE,
    price_override NUMERIC(12, 2),
    stock_quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Inventory Movements (Audit Trail for Stock)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES product_variants(id),
    change_amount INTEGER NOT NULL, -- positive for restock, negative for sale/loss
    reason TEXT, -- 'sale', 'restock', 'return', 'adjustment'
    reference_id UUID, -- Could link to order_id
    created_by UUID REFERENCES app_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    buyer_user_id UUID REFERENCES app_users(id) ON DELETE RESTRICT,
    subtotal NUMERIC(12, 2) NOT NULL,
    shipping_fee NUMERIC(12, 2) DEFAULT 0.00,
    service_fee NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid, paid, failed, refunded
    order_status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
    shipping_address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Order Items (Snapshotted data)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products_core(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    name_snapshot TEXT NOT NULL,
    variant_snapshot JSONB, -- Stores size/colour at time of purchase
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL
);

-- 6. Achievement Merchandise Rules
CREATE TABLE IF NOT EXISTS achievement_merchandise_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products_core(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events_core(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL, -- finisher, top_rank, distance_goal
    rule_config JSONB, -- { "min_distance": 50, "rank_limit": 3 }
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_products_organiser ON products_core(organiser_id);
CREATE INDEX idx_products_event ON products_core(event_id);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_user_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_inventory_variant ON inventory_movements(variant_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products_core FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- View for Inventory Status
CREATE OR REPLACE VIEW v_inventory_status AS
SELECT 
    p.name as product_name,
    v.sku,
    v.size,
    v.colour,
    v.stock_quantity
FROM product_variants v
JOIN products_core p ON v.product_id = p.id;