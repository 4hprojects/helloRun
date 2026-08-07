-- Allow onsite records to exist without a HelloRun account.
-- Created: 2026-08-07
-- Purpose: unblock guest registration.
--
-- runner_user_id was NOT NULL on every onsite table, and registrations.mongo_user_id was
-- NOT NULL on the shadow, so a registration with no account could not be represented at
-- all. Relaxing them is additive: every existing row keeps its value, and nothing that
-- writes a user today stops doing so.
--
-- The columns stay foreign keys, so a value that is present is still checked.

ALTER TABLE bib_assignments  ALTER COLUMN runner_user_id DROP NOT NULL;
ALTER TABLE check_ins        ALTER COLUMN runner_user_id DROP NOT NULL;
ALTER TABLE onsite_results   ALTER COLUMN runner_user_id DROP NOT NULL;

ALTER TABLE registrations    ALTER COLUMN mongo_user_id  DROP NOT NULL;
