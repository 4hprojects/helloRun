create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  mongo_user_id text not null unique,
  email text not null unique,
  role_snapshot text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_role_snapshot_check check (role_snapshot in ('runner', 'organiser', 'admin'))
);

create index if not exists app_users_role_snapshot_idx on app_users(role_snapshot);
create index if not exists app_users_created_at_idx on app_users(created_at);

create table if not exists migration_records (
  id uuid primary key default gen_random_uuid(),
  phase text not null,
  source_system text not null,
  source_collection text not null,
  source_id text not null,
  target_system text not null,
  target_table text not null,
  target_id text,
  operation text not null,
  status text not null,
  checksum text,
  error_code text not null default '',
  error_message text not null default '',
  attempted_at timestamptz,
  synced_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint migration_records_operation_check check (operation in ('backfill', 'live_sync', 'verify', 'repair')),
  constraint migration_records_status_check check (status in ('pending', 'synced', 'skipped', 'failed')),
  constraint migration_records_unique_source_target unique (
    source_system,
    source_collection,
    source_id,
    target_system,
    target_table
  )
);

create index if not exists migration_records_phase_status_idx on migration_records(phase, status);
create index if not exists migration_records_target_idx on migration_records(target_system, target_table, target_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_users_set_updated_at on app_users;
create trigger app_users_set_updated_at
before update on app_users
for each row
execute function set_updated_at();

drop trigger if exists migration_records_set_updated_at on migration_records;
create trigger migration_records_set_updated_at
before update on migration_records
for each row
execute function set_updated_at();
