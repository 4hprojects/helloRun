-- Phase 7: Onsite Operations
-- Created: 2026-05-17
-- Purpose: Add tables for onsite event management: bibs, race kits, check-ins, result imports

-- Race kits: Define what's included in a race kit package for an event
CREATE TABLE race_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_race_kit_id TEXT UNIQUE NOT NULL,
  event_core_id UUID NOT NULL REFERENCES events_core(id) ON DELETE CASCADE,
  kit_name TEXT NOT NULL,
  kit_description TEXT,
  included_items JSONB NOT NULL DEFAULT '{}', -- {"items": ["bib", "timing_chip", "medal", ...]}
  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  cost_per_kit DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX race_kits_event_id ON race_kits(event_core_id);
CREATE INDEX race_kits_mongo_id ON race_kits(mongo_race_kit_id);

-- Bib assignments: Assign bib numbers to registrations
CREATE TABLE bib_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_bib_assignment_id TEXT UNIQUE,
  event_core_id UUID NOT NULL REFERENCES events_core(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  runner_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  bib_number TEXT NOT NULL,
  category TEXT, -- e.g. "5K", "10K", "half_marathon", "marathon"
  race_kit_id UUID REFERENCES race_kits(id) ON DELETE SET NULL,
  assignment_status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned', 'printed', 'picked_up', 'voided'
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  printed_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_core_id, bib_number) -- One bib number per event
);

CREATE INDEX bib_assignments_event_registration ON bib_assignments(event_core_id, registration_id);
CREATE INDEX bib_assignments_runner_id ON bib_assignments(runner_user_id);
CREATE INDEX bib_assignments_status ON bib_assignments(assignment_status);
CREATE INDEX bib_assignments_mongo_id ON bib_assignments(mongo_bib_assignment_id);

-- Check-ins: Track runner check-in for event start
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_check_in_id TEXT UNIQUE,
  event_core_id UUID NOT NULL REFERENCES events_core(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  runner_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  bib_assignment_id UUID REFERENCES bib_assignments(id) ON DELETE SET NULL,
  participation_mode TEXT NOT NULL, -- 'virtual', 'onsite'
  check_in_status TEXT NOT NULL DEFAULT 'checked_in', -- 'checked_in', 'no_show', 'deferred', 'cancelled'
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES app_users(id) ON DELETE SET NULL, -- staff member who processed check-in
  verification_method TEXT, -- 'bib_scan', 'manual', 'app_self_check_in'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX check_ins_event_registration ON check_ins(event_core_id, registration_id);
CREATE INDEX check_ins_runner_id ON check_ins(runner_user_id);
CREATE INDEX check_ins_status ON check_ins(check_in_status);
CREATE INDEX check_ins_checked_in_at ON check_ins(checked_in_at);
CREATE INDEX check_ins_mongo_id ON check_ins(mongo_check_in_id);

-- Result imports: Track CSV/XLSX import files and metadata
CREATE TABLE result_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_result_import_id TEXT UNIQUE,
  event_core_id UUID NOT NULL REFERENCES events_core(id) ON DELETE CASCADE,
  import_source TEXT NOT NULL, -- 'csv_upload', 'xlsx_upload', 'timing_system', 'manual'
  file_name TEXT,
  file_key TEXT, -- R2 storage key for import file
  file_mime_type TEXT,
  file_size_bytes INTEGER,
  total_rows INTEGER,
  imported_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  import_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'partially_completed'
  import_errors JSONB DEFAULT '[]', -- Array of error objects: {row: N, column: X, error: "..."}
  import_started_at TIMESTAMPTZ,
  import_completed_at TIMESTAMPTZ,
  imported_by UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX result_imports_event_id ON result_imports(event_core_id);
CREATE INDEX result_imports_status ON result_imports(import_status);
CREATE INDEX result_imports_imported_by ON result_imports(imported_by);
CREATE INDEX result_imports_mongo_id ON result_imports(mongo_result_import_id);

-- Onsite results: Official results entered or imported during/after onsite events
CREATE TABLE onsite_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_onsite_result_id TEXT UNIQUE,
  event_core_id UUID NOT NULL REFERENCES events_core(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  runner_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  result_import_id UUID REFERENCES result_imports(id) ON DELETE SET NULL,
  bib_assignment_id UUID REFERENCES bib_assignments(id) ON DELETE SET NULL,
  race_category TEXT, -- e.g. "5K", "10K", "half_marathon", "marathon"
  participation_mode TEXT NOT NULL DEFAULT 'onsite', -- 'onsite' or 'virtual_onsite'
  race_distance_km DECIMAL(8, 2),
  elapsed_ms INTEGER,
  elapsed_time_display TEXT, -- e.g. "00:45:30"
  pace_per_km DECIMAL(6, 2),
  place_in_category INTEGER,
  place_overall INTEGER,
  result_status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'approved', 'disqualified'
  data_source TEXT NOT NULL, -- 'manual_entry', 'timing_system_import', 'csv_import'
  entered_by UUID REFERENCES app_users(id) ON DELETE SET NULL, -- who entered/imported the result
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX onsite_results_event_registration ON onsite_results(event_core_id, registration_id);
CREATE INDEX onsite_results_runner_id ON onsite_results(runner_user_id);
CREATE INDEX onsite_results_status ON onsite_results(result_status);
CREATE INDEX onsite_results_category ON onsite_results(event_core_id, race_category);
CREATE INDEX onsite_results_import_id ON onsite_results(result_import_id);
CREATE INDEX onsite_results_mongo_id ON onsite_results(mongo_onsite_result_id);

-- Report view: Event onsite check-in summary
CREATE VIEW v_event_checkin_summary AS
  SELECT
    e.id as event_id,
    e.title as event_title,
    COUNT(DISTINCT ci.id) as total_check_ins,
    COUNT(DISTINCT CASE WHEN ci.check_in_status = 'checked_in' THEN ci.id END) as checked_in_count,
    COUNT(DISTINCT CASE WHEN ci.check_in_status = 'no_show' THEN ci.id END) as no_show_count,
    COUNT(DISTINCT CASE WHEN ci.check_in_status = 'deferred' THEN ci.id END) as deferred_count,
    COUNT(DISTINCT CASE WHEN ci.check_in_status = 'cancelled' THEN ci.id END) as cancelled_count,
    MIN(ci.checked_in_at) as first_checkin_at,
    MAX(ci.checked_in_at) as last_checkin_at
  FROM events_core e
  LEFT JOIN check_ins ci ON e.id = ci.event_core_id
  GROUP BY e.id, e.title;

-- Report view: Onsite results summary by category
CREATE VIEW v_onsite_results_by_category AS
  SELECT
    e.id as event_id,
    e.title as event_title,
    ors.race_category,
    COUNT(DISTINCT ors.id) as total_results,
    COUNT(DISTINCT CASE WHEN ors.result_status = 'approved' THEN ors.id END) as approved_count,
    COUNT(DISTINCT CASE WHEN ors.result_status = 'disqualified' THEN ors.id END) as disqualified_count,
    ROUND(AVG(ors.elapsed_ms)::NUMERIC / 60000, 1) as avg_time_minutes,
    MIN(ors.elapsed_ms) as fastest_time_ms,
    MAX(ors.elapsed_ms) as slowest_time_ms
  FROM events_core e
  LEFT JOIN onsite_results ors ON e.id = ors.event_core_id
  GROUP BY e.id, e.title, ors.race_category;

-- Report view: Bib assignment status
CREATE VIEW v_bib_assignment_status AS
  SELECT
    e.id as event_id,
    e.title as event_title,
    COUNT(DISTINCT ba.id) as total_bibs_assigned,
    COUNT(DISTINCT CASE WHEN ba.assignment_status = 'assigned' THEN ba.id END) as assigned_count,
    COUNT(DISTINCT CASE WHEN ba.assignment_status = 'printed' THEN ba.id END) as printed_count,
    COUNT(DISTINCT CASE WHEN ba.assignment_status = 'picked_up' THEN ba.id END) as picked_up_count,
    COUNT(DISTINCT CASE WHEN ba.assignment_status = 'voided' THEN ba.id END) as voided_count
  FROM events_core e
  LEFT JOIN bib_assignments ba ON e.id = ba.event_core_id
  GROUP BY e.id, e.title;

-- Report view: Race kit inventory
CREATE VIEW v_race_kit_inventory AS
  SELECT
    e.id as event_id,
    e.title as event_title,
    rk.id as race_kit_id,
    rk.kit_name,
    rk.quantity_available,
    rk.quantity_reserved,
    (rk.quantity_available - rk.quantity_reserved) as quantity_available_for_assignment,
    rk.cost_per_kit
  FROM events_core e
  LEFT JOIN race_kits rk ON e.id = rk.event_core_id;
