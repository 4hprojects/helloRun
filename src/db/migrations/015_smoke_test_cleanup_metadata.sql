-- Smoke test cleanup metadata
-- Adds a common tag set to rows that may be created by persistent staging/production smoke runs.

do $$
declare
  target_table text;
  index_name text;
begin
  foreach target_table in array array[
    'app_users',
    'organisers',
    'events_core',
    'event_distances',
    'event_categories',
    'registrations',
    'payments',
    'submissions_core',
    'certificates',
    'rankings',
    'race_kits',
    'bib_assignments',
    'check_ins',
    'result_imports',
    'onsite_results',
    'event_badges',
    'user_badges',
    'badge_audit_logs',
    'products_core',
    'product_variants',
    'inventory_movements',
    'orders',
    'order_items',
    'shop_payments',
    'shop_fulfilment_logs',
    'shop_platform_fees',
    'achievement_merchandise_rules',
    'policy_consents',
    'audit_critical',
    'migration_records'
  ]
  loop
    if to_regclass(target_table) is not null then
      execute format('alter table %I add column if not exists is_smoke_test boolean not null default false', target_table);
      execute format('alter table %I add column if not exists test_run_id text', target_table);
      execute format('alter table %I add column if not exists created_by_test text', target_table);
      execute format('alter table %I add column if not exists expires_at timestamptz', target_table);

      index_name := left('idx_' || target_table || '_smoke_cleanup', 63);
      execute format(
        'create index if not exists %I on %I (is_smoke_test, test_run_id, expires_at)',
        index_name,
        target_table
      );
    end if;
  end loop;
end;
$$;
