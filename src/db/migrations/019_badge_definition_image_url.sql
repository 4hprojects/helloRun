-- Migration 019: Badge definition image URL
-- Purpose: Add image_url to badge_definitions so platform can set type-level defaults.
-- Per-event overrides remain in event_badges.badge_image_url and take precedence.

ALTER TABLE badge_definitions
  ADD COLUMN IF NOT EXISTS image_url TEXT;
