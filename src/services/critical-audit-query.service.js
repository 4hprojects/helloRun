const { getPostgresClient } = require('../db/postgres');

const AUDIT_PAGE_SIZE = 50;
const MAX_AUDIT_PAGE_SIZE = 100;
const EXPORT_VOLUME_THRESHOLD_24H = 5;
const REJECTION_VOLUME_THRESHOLD_24H = 8;
const RAPID_ACTION_THRESHOLD_15M = 15;

const AUDIT_ACTION_GROUPS = Object.freeze({
  payments: [
    'payment.receipt_submitted',
    'shop.payment_receipt_submitted',
    'payment.approved',
    'payment.rejected'
  ],
  submissions: [
    'submission.approved',
    'submission.rejected',
    'approve',
    'reject',
    'submission.auto_approved'
  ],
  exports: [
    'organiser.registrants_exported',
    'organiser.shop_orders_exported',
    'admin.users_exported',
    'admin.audit_exported',
    'admin.analytics_exported'
  ],
  reminders: [
    'organiser.payment_reminder_sent'
  ],
  admin: [
    'admin.user.deleted',
    'admin.user.role_changed',
    'admin.user.organiser_status_changed',
    'admin.user.note_added',
    'admin.user.verification_resent',
    'admin.user.email_verified_override',
    'admin.user.account_status_changed',
    'admin.user.admin_tier_changed',
    'admin.running_group.updated',
    'admin.running_group.archived',
    'admin.running_group.reactivated',
    'admin.running_group.member_removed',
    'admin.running_group.creator_transferred',
    'admin.running_group.member_count_reconciled',
    'admin.running_group.deleted'
  ],
  events: [
    'event.published',
    'event.archived',
    'event.deleted',
    'organiser.application.approved',
    'organiser.application.rejected'
  ],
  certificates: [
    'certificate.issued',
    'certificate.regenerated',
    'certificate.revoked'
  ]
});

const AUDIT_GROUP_OPTIONS = Object.freeze([
  { value: '', label: 'All actions' },
  { value: 'payments', label: 'Payments' },
  { value: 'submissions', label: 'Run reviews' },
  { value: 'exports', label: 'Exports' },
  { value: 'reminders', label: 'Reminders' },
  { value: 'admin', label: 'Admin actions' },
  { value: 'events', label: 'Events and organiser applications' },
  { value: 'certificates', label: 'Certificates' }
]);

const AUDIT_TARGET_TYPE_OPTIONS = Object.freeze([
  { value: '', label: 'All targets' },
  { value: 'event', label: 'Events' },
  { value: 'registration', label: 'Registrations' },
  { value: 'submission', label: 'Submissions' },
  { value: 'accumulated_activity_submission', label: 'Accumulated submissions' },
  { value: 'shop_order', label: 'Shop orders' },
  { value: 'user', label: 'Users' },
  { value: 'running_group', label: 'Running groups' },
  { value: 'certificate', label: 'Certificates' }
]);

function normalizeCriticalAuditFilters(query = {}, options = {}) {
  const pageSize = normalizePositiveInt(query.perPage, options.pageSize || AUDIT_PAGE_SIZE, MAX_AUDIT_PAGE_SIZE);
  const requestedPage = normalizePositiveInt(query.page, 1, Number.MAX_SAFE_INTEGER);
  const group = Object.prototype.hasOwnProperty.call(AUDIT_ACTION_GROUPS, String(query.group || '').trim())
    ? String(query.group).trim()
    : '';
  const targetType = AUDIT_TARGET_TYPE_OPTIONS.some((item) => item.value === String(query.targetType || '').trim())
    ? String(query.targetType || '').trim()
    : '';

  return {
    group,
    action: String(query.action || '').trim().slice(0, 120),
    targetType,
    targetId: String(query.targetId || '').trim().slice(0, 120),
    actorMongoUserId: String(query.actorMongoUserId || '').trim().slice(0, 120),
    q: String(query.q || '').trim().slice(0, 120),
    dateFrom: normalizeDateInput(query.dateFrom),
    dateTo: normalizeDateInput(query.dateTo),
    page: requestedPage,
    pageSize
  };
}

async function listCriticalAuditEvents(options = {}) {
  if (!process.env.DATABASE_URL) {
    return emptyAuditResult(options.filters, { unavailable: true });
  }

  const sql = options.sql || getPostgresClient();
  const filters = normalizeCriticalAuditFilters(options.filters || {}, { pageSize: options.pageSize });
  const scopedTargetIds = normalizeStringArray(options.targetIds);
  const scopedTargetTypes = normalizeStringArray(options.targetTypes);
  const actionValues = getActionValues(filters);
  const hasActionValues = actionValues.length > 0;
  const hasScopedTargetIds = scopedTargetIds.length > 0;
  const hasScopedTargetTypes = scopedTargetTypes.length > 0;
  const hasQ = Boolean(filters.q);
  const hasDateFrom = Boolean(filters.dateFrom);
  const hasDateTo = Boolean(filters.dateTo);
  const hasTargetId = Boolean(filters.targetId);
  const hasTargetType = Boolean(filters.targetType);
  const hasActor = Boolean(filters.actorMongoUserId);
  const qPattern = `%${filters.q}%`;
  const targetIdPattern = `%${filters.targetId}%`;
  const dateFrom = hasDateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`) : new Date(0);
  const dateTo = hasDateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : new Date('9999-12-31T23:59:59.999Z');

  const countRows = await sql`
    select count(*)::int as count
    from audit_critical ac
    left join app_users au on au.id = ac.actor_user_id
    where (${hasActionValues} = false or ac.action = any(${hasActionValues ? actionValues : ['__none__']}))
      and (${hasScopedTargetTypes} = false or ac.target_type = any(${hasScopedTargetTypes ? scopedTargetTypes : ['__none__']}))
      and (${hasScopedTargetIds} = false or ac.target_id = any(${hasScopedTargetIds ? scopedTargetIds : ['__none__']}))
      and (${hasTargetType} = false or ac.target_type = ${filters.targetType})
      and (${hasTargetId} = false or ac.target_id ilike ${targetIdPattern})
      and (${hasActor} = false or ac.actor_mongo_user_id = ${filters.actorMongoUserId})
      and (${hasDateFrom} = false or ac.created_at >= ${dateFrom})
      and (${hasDateTo} = false or ac.created_at <= ${dateTo})
      and (
        ${hasQ} = false
        or ac.action ilike ${qPattern}
        or ac.target_type ilike ${qPattern}
        or ac.target_id ilike ${qPattern}
        or coalesce(ac.notes, '') ilike ${qPattern}
        or coalesce(au.display_name, '') ilike ${qPattern}
        or coalesce(au.email, '') ilike ${qPattern}
        or coalesce(ac.actor_mongo_user_id, '') ilike ${qPattern}
      )
  `;

  const totalItems = Number(countRows[0]?.count || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const offset = (page - 1) * filters.pageSize;
  filters.page = page;

  const entries = totalItems > 0
    ? await sql`
      select ac.action, ac.target_type, ac.target_id, ac.status_from, ac.status_to, ac.notes,
             ac.ip_address, ac.user_agent, ac.actor_mongo_user_id, ac.created_at,
             au.display_name as actor_display_name, au.email as actor_email
      from audit_critical ac
      left join app_users au on au.id = ac.actor_user_id
      where (${hasActionValues} = false or ac.action = any(${hasActionValues ? actionValues : ['__none__']}))
        and (${hasScopedTargetTypes} = false or ac.target_type = any(${hasScopedTargetTypes ? scopedTargetTypes : ['__none__']}))
        and (${hasScopedTargetIds} = false or ac.target_id = any(${hasScopedTargetIds ? scopedTargetIds : ['__none__']}))
        and (${hasTargetType} = false or ac.target_type = ${filters.targetType})
        and (${hasTargetId} = false or ac.target_id ilike ${targetIdPattern})
        and (${hasActor} = false or ac.actor_mongo_user_id = ${filters.actorMongoUserId})
        and (${hasDateFrom} = false or ac.created_at >= ${dateFrom})
        and (${hasDateTo} = false or ac.created_at <= ${dateTo})
        and (
          ${hasQ} = false
          or ac.action ilike ${qPattern}
          or ac.target_type ilike ${qPattern}
          or ac.target_id ilike ${qPattern}
          or coalesce(ac.notes, '') ilike ${qPattern}
          or coalesce(au.display_name, '') ilike ${qPattern}
          or coalesce(au.email, '') ilike ${qPattern}
          or coalesce(ac.actor_mongo_user_id, '') ilike ${qPattern}
        )
      order by ac.created_at desc
      limit ${filters.pageSize}
      offset ${offset}
    `
    : [];

  return {
    entries,
    filters,
    totalItems,
    totalPages,
    page,
    pageSize: filters.pageSize,
    unavailable: false
  };
}

const MAX_AUDIT_EXPORT_ROWS = 10000;

async function listCriticalAuditEventsForExport(options = {}) {
  if (!process.env.DATABASE_URL) {
    return { entries: [], unavailable: true };
  }

  const sql = options.sql || getPostgresClient();
  const filters = normalizeCriticalAuditFilters(options.filters || {});
  const actionValues = getActionValues(filters);
  const hasActionValues = actionValues.length > 0;
  const hasQ = Boolean(filters.q);
  const hasDateFrom = Boolean(filters.dateFrom);
  const hasDateTo = Boolean(filters.dateTo);
  const hasTargetId = Boolean(filters.targetId);
  const hasTargetType = Boolean(filters.targetType);
  const hasActor = Boolean(filters.actorMongoUserId);
  const qPattern = `%${filters.q}%`;
  const targetIdPattern = `%${filters.targetId}%`;
  const dateFrom = hasDateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`) : new Date(0);
  const dateTo = hasDateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : new Date('9999-12-31T23:59:59.999Z');

  const entries = await sql`
    select ac.action, ac.target_type, ac.target_id, ac.status_from, ac.status_to, ac.notes,
           ac.ip_address, ac.user_agent, ac.actor_mongo_user_id, ac.created_at,
           au.display_name as actor_display_name, au.email as actor_email
    from audit_critical ac
    left join app_users au on au.id = ac.actor_user_id
    where (${hasActionValues} = false or ac.action = any(${hasActionValues ? actionValues : ['__none__']}))
      and (${hasTargetType} = false or ac.target_type = ${filters.targetType})
      and (${hasTargetId} = false or ac.target_id ilike ${targetIdPattern})
      and (${hasActor} = false or ac.actor_mongo_user_id = ${filters.actorMongoUserId})
      and (${hasDateFrom} = false or ac.created_at >= ${dateFrom})
      and (${hasDateTo} = false or ac.created_at <= ${dateTo})
      and (
        ${hasQ} = false
        or ac.action ilike ${qPattern}
        or ac.target_type ilike ${qPattern}
        or ac.target_id ilike ${qPattern}
        or coalesce(ac.notes, '') ilike ${qPattern}
        or coalesce(au.display_name, '') ilike ${qPattern}
        or coalesce(au.email, '') ilike ${qPattern}
        or coalesce(ac.actor_mongo_user_id, '') ilike ${qPattern}
      )
    order by ac.created_at desc
    limit ${MAX_AUDIT_EXPORT_ROWS}
  `;

  return { entries, unavailable: false, capped: entries.length >= MAX_AUDIT_EXPORT_ROWS };
}

async function listCriticalAuditSignals(options = {}) {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  const sql = options.sql || getPostgresClient();
  const scopedTargetIds = normalizeStringArray(options.targetIds);
  const scopedTargetTypes = normalizeStringArray(options.targetTypes);
  const hasScopedTargetIds = scopedTargetIds.length > 0;
  const hasScopedTargetTypes = scopedTargetTypes.length > 0;
  const scopeTargetIds = hasScopedTargetIds ? scopedTargetIds : ['__none__'];
  const scopeTargetTypes = hasScopedTargetTypes ? scopedTargetTypes : ['__none__'];
  const exportActions = AUDIT_ACTION_GROUPS.exports;
  const rejectionActions = ['payment.rejected', 'submission.rejected', 'reject'];
  const rapidActions = [
    ...AUDIT_ACTION_GROUPS.exports,
    'payment.approved',
    'payment.rejected',
    'submission.approved',
    'submission.rejected',
    'approve',
    'reject'
  ];

  const [exportRows, rejectionRows, rapidRows] = await Promise.all([
    sql`
      select coalesce(nullif(ac.actor_mongo_user_id, ''), 'system') as actor_key,
             coalesce(au.display_name, au.email, nullif(ac.actor_mongo_user_id, ''), 'System') as actor_label,
             count(*)::int as count,
             max(ac.created_at) as latest_at
      from audit_critical ac
      left join app_users au on au.id = ac.actor_user_id
      where ac.action = any(${exportActions})
        and ac.created_at >= now() - interval '24 hours'
        and (${hasScopedTargetTypes} = false or ac.target_type = any(${scopeTargetTypes}))
        and (${hasScopedTargetIds} = false or ac.target_id = any(${scopeTargetIds}))
      group by 1, 2
      having count(*) >= ${EXPORT_VOLUME_THRESHOLD_24H}
      order by count desc, latest_at desc
      limit 5
    `,
    sql`
      select coalesce(nullif(ac.actor_mongo_user_id, ''), 'system') as actor_key,
             coalesce(au.display_name, au.email, nullif(ac.actor_mongo_user_id, ''), 'System') as actor_label,
             count(*)::int as count,
             max(ac.created_at) as latest_at
      from audit_critical ac
      left join app_users au on au.id = ac.actor_user_id
      where ac.action = any(${rejectionActions})
        and ac.created_at >= now() - interval '24 hours'
        and (${hasScopedTargetTypes} = false or ac.target_type = any(${scopeTargetTypes}))
        and (${hasScopedTargetIds} = false or ac.target_id = any(${scopeTargetIds}))
      group by 1, 2
      having count(*) >= ${REJECTION_VOLUME_THRESHOLD_24H}
      order by count desc, latest_at desc
      limit 5
    `,
    sql`
      select coalesce(nullif(ac.actor_mongo_user_id, ''), 'system') as actor_key,
             coalesce(au.display_name, au.email, nullif(ac.actor_mongo_user_id, ''), 'System') as actor_label,
             count(*)::int as count,
             max(ac.created_at) as latest_at
      from audit_critical ac
      left join app_users au on au.id = ac.actor_user_id
      where ac.action = any(${rapidActions})
        and ac.created_at >= now() - interval '15 minutes'
        and (${hasScopedTargetTypes} = false or ac.target_type = any(${scopeTargetTypes}))
        and (${hasScopedTargetIds} = false or ac.target_id = any(${scopeTargetIds}))
      group by 1, 2
      having count(*) >= ${RAPID_ACTION_THRESHOLD_15M}
      order by count desc, latest_at desc
      limit 5
    `
  ]);

  return [
    ...exportRows.map((row) => buildAuditSignal({
      type: 'high_export_volume',
      severity: 'warning',
      title: 'High export volume',
      actorLabel: row.actor_label,
      actorKey: row.actor_key,
      count: row.count,
      latestAt: row.latest_at,
      details: `${row.count} export action(s) in the last 24 hours.`
    })),
    ...rejectionRows.map((row) => buildAuditSignal({
      type: 'many_rejections',
      severity: 'warning',
      title: 'Many rejected actions',
      actorLabel: row.actor_label,
      actorKey: row.actor_key,
      count: row.count,
      latestAt: row.latest_at,
      details: `${row.count} rejection action(s) in the last 24 hours.`
    })),
    ...rapidRows.map((row) => buildAuditSignal({
      type: 'rapid_activity',
      severity: 'critical',
      title: 'Rapid review/export activity',
      actorLabel: row.actor_label,
      actorKey: row.actor_key,
      count: row.count,
      latestAt: row.latest_at,
      details: `${row.count} review/export action(s) in the last 15 minutes.`
    }))
  ].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return b.count - a.count;
  });
}

function buildCriticalAuditPath(basePath, filters = {}, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  ['group', 'action', 'targetType', 'targetId', 'actorMongoUserId', 'q', 'dateFrom', 'dateTo'].forEach((key) => {
    if (next[key]) params.set(key, String(next[key]));
  });
  if (Number(next.perPage || next.pageSize || AUDIT_PAGE_SIZE) !== AUDIT_PAGE_SIZE) {
    params.set('perPage', String(next.perPage || next.pageSize));
  }
  if (Number(next.page || 1) > 1) params.set('page', String(next.page));
  const query = params.toString();
  return `${basePath}${query ? `?${query}` : ''}`;
}

function emptyAuditResult(filters = {}, extra = {}) {
  const normalized = normalizeCriticalAuditFilters(filters);
  return {
    entries: [],
    filters: normalized,
    totalItems: 0,
    totalPages: 1,
    page: 1,
    pageSize: normalized.pageSize,
    unavailable: false,
    ...extra
  };
}

function getActionValues(filters) {
  if (filters.action) return [filters.action];
  return AUDIT_ACTION_GROUPS[filters.group] || [];
}

function buildAuditSignal(input) {
  return {
    type: input.type,
    severity: input.severity,
    title: input.title,
    actorLabel: input.actorLabel,
    actorKey: input.actorKey,
    count: Number(input.count || 0),
    latestAt: input.latestAt || null,
    details: input.details
  };
}

function normalizeDateInput(value) {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

function normalizePositiveInt(value, fallback, max) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value || '').trim()).filter(Boolean);
}

module.exports = {
  AUDIT_ACTION_GROUPS,
  AUDIT_GROUP_OPTIONS,
  AUDIT_TARGET_TYPE_OPTIONS,
  AUDIT_PAGE_SIZE,
  buildCriticalAuditPath,
  listCriticalAuditEvents,
  listCriticalAuditEventsForExport,
  listCriticalAuditSignals,
  normalizeCriticalAuditFilters
};
