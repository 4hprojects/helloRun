-- Phase 16: Certificate templates, certificate numbers, verification, and audit trail
-- Extends the existing Phase 5 certificates table. Do not recreate certificates.

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES registrations(id),
  ADD COLUMN IF NOT EXISTS organizer_user_id uuid REFERENCES app_users(id),
  ADD COLUMN IF NOT EXISTS certificate_template_id text,
  ADD COLUMN IF NOT EXISTS certificate_number text,
  ADD COLUMN IF NOT EXISTS verification_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS regenerated_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoke_reason text,
  ADD COLUMN IF NOT EXISTS generation_error text;

UPDATE certificates
SET generated_at = issued_at
WHERE generated_at IS NULL
  AND issued_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_certificate_number_uidx
  ON certificates(certificate_number)
  WHERE certificate_number IS NOT NULL AND certificate_number <> '';

CREATE INDEX IF NOT EXISTS certificates_registration_id_idx ON certificates(registration_id);
CREATE INDEX IF NOT EXISTS certificates_status_idx ON certificates(status);

CREATE TABLE IF NOT EXISTS certificate_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid REFERENCES certificates(id),
  event_id uuid REFERENCES events_core(id),
  actor_user_id uuid REFERENCES app_users(id),
  actor_role text,
  action text NOT NULL,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS certificate_audit_logs_certificate_id_idx
  ON certificate_audit_logs(certificate_id);

CREATE INDEX IF NOT EXISTS certificate_audit_logs_event_id_idx
  ON certificate_audit_logs(event_id);
