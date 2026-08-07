-- Onsite operations: enforce one check-in and one live bib per registration
-- Created: 2026-08-07
-- Purpose: Close two correctness defects in the Phase 7 onsite tables before the
--          organiser check-in console is built on top of them.
--
--   1. check_ins had no uniqueness on (event_core_id, registration_id), so scanning
--      the same runner twice inserted a second row and inflated
--      v_event_checkin_summary.checked_in_count.
--   2. bib_assignments only guarded UNIQUE(event_core_id, bib_number). Its
--      ON CONFLICT (mongo_bib_assignment_id) DO UPDATE never fired, because the
--      INSERT omits that column and Postgres does not treat NULLs as conflicting,
--      so a registration could accumulate several live bibs.
--
-- Additive and idempotent: no columns are dropped or retyped. Pre-existing
-- duplicates are reconciled first, keeping the earliest row in each group.

-- 1. Collapse duplicate check-ins, keeping the earliest row per registration.
DELETE FROM check_ins ci
USING (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY event_core_id, registration_id
      ORDER BY COALESCE(checked_in_at, created_at) ASC, created_at ASC, id ASC
    ) AS row_rank
  FROM check_ins
) ranked
WHERE ci.id = ranked.id
  AND ranked.row_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS check_ins_event_registration_unique
  ON check_ins (event_core_id, registration_id);

-- 2. Void surplus live bib assignments, keeping the earliest per registration.
--    Voiding rather than deleting preserves the assignment history.
UPDATE bib_assignments ba
SET assignment_status = 'voided',
    notes = COALESCE(ba.notes || ' | ', '')
            || 'Voided by migration 023: duplicate live bib for this registration.',
    updated_at = CURRENT_TIMESTAMP
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY event_core_id, registration_id
      ORDER BY assigned_at ASC, created_at ASC, id ASC
    ) AS row_rank
  FROM bib_assignments
  WHERE assignment_status <> 'voided'
) ranked
WHERE ba.id = ranked.id
  AND ranked.row_rank > 1;

-- Partial index so a voided bib still allows a fresh assignment.
CREATE UNIQUE INDEX IF NOT EXISTS bib_assignments_event_registration_live_unique
  ON bib_assignments (event_core_id, registration_id)
  WHERE assignment_status <> 'voided';
