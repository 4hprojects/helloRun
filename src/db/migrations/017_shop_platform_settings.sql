-- Phase 17: Shop Platform Settings
-- Purpose: Platform-level shop configuration — payment methods, fulfillment defaults, global enable/disable.

CREATE TABLE IF NOT EXISTS shop_platform_config (
  id TEXT PRIMARY KEY DEFAULT 'platform',
  payment_methods TEXT[] NOT NULL DEFAULT ARRAY['gcash', 'bank_transfer'],
  fulfilment_defaults JSONB NOT NULL DEFAULT '{}',
  shop_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO shop_platform_config (id) VALUES ('platform') ON CONFLICT DO NOTHING;
