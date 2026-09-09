-- Allow the application review workflow to preserve submissions that need a
-- participant clarification, and extend the generic activity vocabulary.

ALTER TABLE submissions_core
  DROP CONSTRAINT IF EXISTS submissions_core_submission_status_check;

ALTER TABLE submissions_core
  ADD CONSTRAINT submissions_core_submission_status_check
  CHECK (submission_status IN ('submitted', 'approved', 'rejected', 'needs_clarification'));

ALTER TABLE submissions_core
  DROP CONSTRAINT IF EXISTS submissions_core_run_type_check;

ALTER TABLE submissions_core
  ADD CONSTRAINT submissions_core_run_type_check
  CHECK (run_type IN ('run', 'walk', 'hike', 'trail_run', 'treadmill'));
