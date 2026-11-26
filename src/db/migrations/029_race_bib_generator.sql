-- Shared race bib ledger and hybrid number policies (migration 029).
-- Additive: old application versions ignore these fields and continue assigning onsite bibs.

ALTER TABLE bib_assignments
  ADD COLUMN IF NOT EXISTS bib_kind TEXT NOT NULL DEFAULT 'onsite';

-- Guest registrations have no app_users row until claim. The registration remains the
-- owner of the assignment; claim fills this audit/lookup column without changing IDs.
ALTER TABLE bib_assignments
  ALTER COLUMN runner_user_id DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE bib_assignments
    ADD CONSTRAINT bib_assignments_kind_check CHECK (bib_kind IN ('virtual', 'onsite'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS event_bib_number_policies (
  event_core_id UUID PRIMARY KEY REFERENCES events_core(id) ON DELETE CASCADE,
  virtual_start INTEGER NOT NULL DEFAULT 1 CHECK (virtual_start > 0),
  virtual_end INTEGER NOT NULL DEFAULT 999999 CHECK (virtual_end >= virtual_start),
  virtual_next INTEGER NOT NULL DEFAULT 1 CHECK (virtual_next > 0),
  onsite_start INTEGER CHECK (onsite_start > 0),
  onsite_end INTEGER,
  hybrid_enforced BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (onsite_end IS NULL OR onsite_start IS NOT NULL),
  CHECK (onsite_end IS NULL OR onsite_end >= onsite_start),
  CHECK (
    hybrid_enforced = FALSE OR
    (onsite_start IS NOT NULL AND onsite_end IS NOT NULL AND
      (virtual_end < onsite_start OR onsite_end < virtual_start))
  )
);

-- Migration 027 closed the public schema to Supabase Data API roles. Preserve that
-- boundary for every table added later; the application connection bypasses RLS.
ALTER TABLE public.event_bib_number_policies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION enforce_event_bib_number_policy()
RETURNS TRIGGER AS $$
DECLARE
  policy event_bib_number_policies%ROWTYPE;
  numeric_bib INTEGER;
  registration_mode TEXT;
BEGIN
  IF NEW.assignment_status = 'voided' THEN RETURN NEW; END IF;
  SELECT * INTO policy FROM event_bib_number_policies WHERE event_core_id = NEW.event_core_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT participation_mode INTO registration_mode FROM registrations WHERE id = NEW.registration_id;
  IF registration_mode IS DISTINCT FROM NEW.bib_kind THEN
    RAISE EXCEPTION 'Bib kind % does not match registration mode %', NEW.bib_kind, registration_mode;
  END IF;
  IF NEW.bib_number !~ '^[0-9]+$' THEN
    IF policy.hybrid_enforced OR NEW.bib_kind = 'virtual' THEN
      RAISE EXCEPTION 'Bib number must be an integer for this event';
    END IF;
    RETURN NEW;
  END IF;
  numeric_bib := NEW.bib_number::INTEGER;
  IF NEW.bib_kind = 'virtual' AND numeric_bib NOT BETWEEN policy.virtual_start AND policy.virtual_end THEN
    RAISE EXCEPTION 'Virtual bib number is outside the configured range';
  END IF;
  IF policy.hybrid_enforced AND NEW.bib_kind = 'onsite'
     AND numeric_bib NOT BETWEEN policy.onsite_start AND policy.onsite_end THEN
    RAISE EXCEPTION 'Onsite bib number is outside the configured range';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bib_assignments_number_policy ON bib_assignments;
CREATE TRIGGER bib_assignments_number_policy
BEFORE INSERT OR UPDATE OF bib_number, bib_kind, assignment_status ON bib_assignments
FOR EACH ROW EXECUTE FUNCTION enforce_event_bib_number_policy();
