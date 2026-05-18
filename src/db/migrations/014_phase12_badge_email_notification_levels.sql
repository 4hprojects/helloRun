-- Phase 12: Badge Email Notification Levels
-- Purpose: Allow badge definitions to opt into email decisions without enabling badge email by default.

ALTER TABLE badge_definitions
  DROP CONSTRAINT IF EXISTS badge_definitions_email_notification_level_check;

ALTER TABLE badge_definitions
  ADD CONSTRAINT badge_definitions_email_notification_level_check
  CHECK (email_notification_level IN ('none', 'major', 'all'));
