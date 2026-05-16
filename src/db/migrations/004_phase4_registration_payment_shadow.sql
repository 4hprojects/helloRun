create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  event_core_id uuid references events_core(id) on delete set null,
  app_user_id uuid references app_users(id) on delete set null,
  mongo_registration_id text not null unique,
  mongo_event_id text not null,
  mongo_user_id text not null,
  confirmation_code text not null unique,
  participant_first_name text not null default '',
  participant_last_name text not null default '',
  participant_email text not null default '',
  participant_mobile text not null default '',
  participant_country text not null default '',
  participant_gender text not null default '',
  emergency_contact_name text not null default '',
  emergency_contact_number text not null default '',
  running_group text not null default '',
  participation_mode text not null,
  race_distance text not null,
  status text not null,
  payment_status_snapshot text not null,
  waiver_accepted boolean not null default true,
  waiver_version integer not null default 1,
  waiver_signature text not null default '',
  waiver_accepted_at timestamptz,
  registered_at timestamptz,
  mongo_created_at timestamptz,
  mongo_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registrations_status_check check (status in ('pending_payment', 'paid', 'confirmed', 'cancelled', 'refunded')),
  constraint registrations_payment_status_snapshot_check check (payment_status_snapshot in ('unpaid', 'proof_submitted', 'proof_rejected', 'paid', 'failed', 'refunded')),
  constraint registrations_participation_mode_check check (participation_mode in ('virtual', 'onsite'))
);

create index if not exists registrations_event_core_idx on registrations(event_core_id);
create index if not exists registrations_app_user_idx on registrations(app_user_id);
create index if not exists registrations_mongo_event_idx on registrations(mongo_event_id);
create index if not exists registrations_mongo_user_idx on registrations(mongo_user_id);
create index if not exists registrations_status_idx on registrations(status);
create index if not exists registrations_payment_status_idx on registrations(payment_status_snapshot);
create unique index if not exists registrations_unique_mongo_event_user_idx
  on registrations(mongo_event_id, mongo_user_id);

drop trigger if exists registrations_set_updated_at on registrations;
create trigger registrations_set_updated_at
before update on registrations
for each row
execute function set_updated_at();

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  mongo_registration_id text not null unique,
  status text not null,
  proof_url text not null default '',
  proof_key text not null default '',
  proof_mime_type text not null default '',
  proof_size bigint not null default 0,
  proof_uploaded_at timestamptz,
  proof_submitted_by_mongo_user_id text,
  proof_submitted_by_user_id uuid references app_users(id) on delete set null,
  submission_count integer not null default 0,
  reviewed_at timestamptz,
  reviewed_by_mongo_user_id text,
  reviewed_by_user_id uuid references app_users(id) on delete set null,
  review_notes text not null default '',
  rejection_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_status_check check (status in ('unpaid', 'proof_submitted', 'proof_rejected', 'paid', 'failed', 'refunded'))
);

create index if not exists payments_registration_idx on payments(registration_id);
create index if not exists payments_status_idx on payments(status);
create index if not exists payments_reviewed_by_idx on payments(reviewed_by_user_id);
create index if not exists payments_proof_submitted_by_idx on payments(proof_submitted_by_user_id);

drop trigger if exists payments_set_updated_at on payments;
create trigger payments_set_updated_at
before update on payments
for each row
execute function set_updated_at();
