create table if not exists policy_consents (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid references app_users(id) on delete set null,
  mongo_user_id text not null,
  policy_type text not null,
  mongo_policy_id text,
  version text not null,
  accepted_at timestamptz not null,
  ip_address text not null default '',
  user_agent text not null default '',
  source text not null default 'live_sync',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint policy_consents_policy_type_check check (policy_type in ('privacy_policy', 'terms_policy', 'cookie_policy')),
  constraint policy_consents_source_check check (source in ('backfill', 'live_sync', 'repair'))
);

create unique index if not exists policy_consents_mongo_user_policy_version_idx
  on policy_consents(mongo_user_id, policy_type, version);

create index if not exists policy_consents_app_user_idx on policy_consents(app_user_id);
create index if not exists policy_consents_policy_type_version_idx on policy_consents(policy_type, version);
create index if not exists policy_consents_accepted_at_idx on policy_consents(accepted_at);

drop trigger if exists policy_consents_set_updated_at on policy_consents;
create trigger policy_consents_set_updated_at
before update on policy_consents
for each row
execute function set_updated_at();

create table if not exists audit_critical (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app_users(id) on delete set null,
  actor_mongo_user_id text,
  action text not null,
  target_type text not null,
  target_id text not null,
  status_from text,
  status_to text,
  notes text,
  ip_address text,
  user_agent text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists audit_critical_action_created_at_idx on audit_critical(action, created_at desc);
create index if not exists audit_critical_target_idx on audit_critical(target_type, target_id, created_at desc);
create index if not exists audit_critical_actor_idx on audit_critical(actor_user_id, created_at desc);
