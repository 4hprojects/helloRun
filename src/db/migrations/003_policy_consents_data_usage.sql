alter table if exists policy_consents
  drop constraint if exists policy_consents_policy_type_check;

alter table if exists policy_consents
  add constraint policy_consents_policy_type_check
  check (policy_type in ('privacy_policy', 'terms_policy', 'cookie_policy', 'data_usage_policy'));
