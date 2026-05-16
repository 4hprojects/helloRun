create table if not exists organisers (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid references app_users(id) on delete set null,
  mongo_user_id text not null unique,
  mongo_application_id text,
  application_reference text,
  business_name text not null default '',
  business_type text not null default '',
  contact_phone text not null default '',
  business_registration_number text not null default '',
  business_address text not null default '',
  status text not null default 'approved',
  reviewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organisers_status_check check (status in ('pending', 'under_review', 'approved', 'rejected', 'active'))
);

create index if not exists organisers_app_user_idx on organisers(app_user_id);
create index if not exists organisers_status_idx on organisers(status);

drop trigger if exists organisers_set_updated_at on organisers;
create trigger organisers_set_updated_at
before update on organisers
for each row
execute function set_updated_at();

create table if not exists events_core (
  id uuid primary key default gen_random_uuid(),
  organiser_id uuid references organisers(id) on delete set null,
  mongo_event_id text not null unique,
  mongo_organizer_user_id text,
  slug text not null,
  reference_code text,
  title text not null,
  organiser_name text not null default '',
  status text not null,
  event_type text,
  virtual_completion_mode text not null default 'single_activity',
  registration_open_at timestamptz,
  registration_close_at timestamptz,
  event_start_at timestamptz,
  event_end_at timestamptz,
  final_submission_deadline_at timestamptz,
  venue_name text not null default '',
  venue_address text not null default '',
  city text not null default '',
  province text not null default '',
  country text not null default '',
  fee_mode text not null default 'free',
  fee_amount numeric(12,2),
  fee_currency text not null default 'PHP',
  pricing_mode text not null default 'free',
  target_distance_km numeric(10,3),
  minimum_activity_distance_km numeric(10,3),
  recognition_mode text not null default 'completion_only',
  leaderboard_mode text not null default 'finishers',
  digital_certificate_enabled boolean not null default true,
  leaderboard_recognition_enabled boolean not null default true,
  physical_rewards_enabled boolean not null default false,
  is_personal_record boolean not null default false,
  is_deleted boolean not null default false,
  submitted_for_review_at timestamptz,
  approved_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  mongo_created_at timestamptz,
  mongo_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_core_status_check check (status in ('draft', 'pending_review', 'published', 'closed', 'archived')),
  constraint events_core_event_type_check check (event_type is null or event_type in ('virtual', 'onsite', 'hybrid')),
  constraint events_core_virtual_completion_mode_check check (virtual_completion_mode in ('single_activity', 'accumulated_distance'))
);

create index if not exists events_core_organiser_idx on events_core(organiser_id);
create index if not exists events_core_mongo_organizer_idx on events_core(mongo_organizer_user_id);
create index if not exists events_core_status_idx on events_core(status);
create index if not exists events_core_slug_idx on events_core(slug);
create index if not exists events_core_start_idx on events_core(event_start_at);
create index if not exists events_core_deleted_idx on events_core(is_deleted);

drop trigger if exists events_core_set_updated_at on events_core;
create trigger events_core_set_updated_at
before update on events_core
for each row
execute function set_updated_at();

create table if not exists event_distances (
  id uuid primary key default gen_random_uuid(),
  event_core_id uuid not null references events_core(id) on delete cascade,
  mongo_event_id text not null,
  distance_label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_distances_unique_event_label unique (event_core_id, distance_label)
);

create index if not exists event_distances_mongo_event_idx on event_distances(mongo_event_id);

drop trigger if exists event_distances_set_updated_at on event_distances;
create trigger event_distances_set_updated_at
before update on event_distances
for each row
execute function set_updated_at();

create table if not exists event_categories (
  id uuid primary key default gen_random_uuid(),
  event_core_id uuid not null references events_core(id) on delete cascade,
  mongo_event_id text not null,
  category_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_categories_unique_event_name unique (event_core_id, category_name)
);

create index if not exists event_categories_mongo_event_idx on event_categories(mongo_event_id);

drop trigger if exists event_categories_set_updated_at on event_categories;
create trigger event_categories_set_updated_at
before update on event_categories
for each row
execute function set_updated_at();
