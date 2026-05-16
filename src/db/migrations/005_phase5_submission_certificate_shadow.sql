-- Phase 5: Submission, OCR, and Certificate Split
-- Separates official submission state from flexible OCR/review payloads
-- MongoDB remains source for OCR details, suspicious flags, review notes

-- submissions_core: official submission records split from MongoDB Submission/AccumulatedActivitySubmission
CREATE TABLE IF NOT EXISTS submissions_core (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_submission_id text NOT NULL UNIQUE,
  registration_id uuid NOT NULL REFERENCES registrations(id),
  runner_user_id uuid NOT NULL REFERENCES app_users(id),
  event_id uuid NOT NULL REFERENCES events_core(id),
  distance_km numeric(8, 2) NOT NULL,
  elapsed_ms bigint NOT NULL CHECK (elapsed_ms > 0),
  run_date date NOT NULL,
  participation_mode text NOT NULL CHECK (participation_mode IN ('virtual', 'onsite')),
  run_type text NOT NULL CHECK (run_type IN ('run', 'walk', 'hike', 'trail_run')),
  proof_type text NOT NULL CHECK (proof_type IN ('gps', 'photo', 'manual')),
  proof_url text DEFAULT '',
  proof_key text DEFAULT '',
  proof_mime_type text DEFAULT '',
  submission_status text NOT NULL CHECK (submission_status IN ('submitted', 'approved', 'rejected')),
  is_personal_record boolean DEFAULT false,
  submitted_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES app_users(id),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_core_event_status ON submissions_core(event_id, submission_status);
CREATE INDEX idx_submissions_core_runner_status ON submissions_core(runner_user_id, submission_status);
CREATE INDEX idx_submissions_core_event_runner ON submissions_core(event_id, runner_user_id);
CREATE INDEX idx_submissions_core_submitted_at ON submissions_core(submitted_at DESC);

-- certificates: official certificate issue records for approved submissions
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_certificate_id text UNIQUE,
  submission_id uuid NOT NULL REFERENCES submissions_core(id),
  runner_user_id uuid NOT NULL REFERENCES app_users(id),
  event_id uuid NOT NULL REFERENCES events_core(id),
  certificate_url text DEFAULT '',
  certificate_key text DEFAULT '',
  issued_at timestamptz NOT NULL,
  issued_by uuid REFERENCES app_users(id),
  certificate_type text DEFAULT 'finisher',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certificates_submission ON certificates(submission_id);
CREATE INDEX idx_certificates_runner_event ON certificates(runner_user_id, event_id);
CREATE INDEX idx_certificates_runner_issued_at ON certificates(runner_user_id, issued_at DESC);
CREATE INDEX idx_certificates_event_issued_at ON certificates(event_id, issued_at DESC);

-- Update migration_records table schema if needed (already created in Phase 1)
ALTER TABLE IF EXISTS migration_records ADD COLUMN IF NOT EXISTS checksum text;
