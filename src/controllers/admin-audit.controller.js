const logger = require('../utils/logger');
const {
  AUDIT_GROUP_OPTIONS,
  AUDIT_TARGET_TYPE_OPTIONS,
  buildCriticalAuditPath,
  listCriticalAuditEvents,
  listCriticalAuditEventsForExport,
  listCriticalAuditSignals,
  normalizeCriticalAuditFilters
} = require('../services/critical-audit-query.service');
const { recordCriticalAuditEventInBackground } = require('../services/critical-audit.service');
const {
  buildCsvContent,
  buildXlsxBuffer,
  buildExportFilename
} = require('../utils/tabular-export');

const AUDIT_EXPORT_HEADERS = [
  'Action',
  'Target Type',
  'Target ID',
  'Status From',
  'Status To',
  'Notes',
  'IP Address',
  'User Agent',
  'Actor Mongo User ID',
  'Actor Display Name',
  'Actor Email',
  'Created At'
];

function getRequestIpAddress(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const directIp = String(req.ip || '').trim();
  return (forwardedFor || directIp).slice(0, 120);
}

function getRequestUserAgent(req) {
  return String(req.get('user-agent') || '').trim().slice(0, 500);
}

function mapAuditEntryToRow(entry) {
  return [
    entry.action || '',
    entry.target_type || '',
    entry.target_id || '',
    entry.status_from || '',
    entry.status_to || '',
    entry.notes || '',
    entry.ip_address || '',
    entry.user_agent || '',
    entry.actor_mongo_user_id || '',
    entry.actor_display_name || '',
    entry.actor_email || '',
    entry.created_at ? new Date(entry.created_at).toISOString() : ''
  ];
}

exports.listCriticalAudit = async (req, res) => {
  const filters = normalizeCriticalAuditFilters(req.query);

  try {
    const [result, signals] = await Promise.all([
      listCriticalAuditEvents({ filters }),
      listCriticalAuditSignals()
    ]);

    return res.render('admin/audit-trail', {
      title: 'Critical Audit Trail - HelloRun Admin',
      filters: result.filters,
      entries: result.entries,
      signals,
      unavailable: result.unavailable,
      groupOptions: AUDIT_GROUP_OPTIONS,
      targetTypeOptions: AUDIT_TARGET_TYPE_OPTIONS,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        pageSize: result.pageSize,
        prevHref: result.page > 1 ? buildCriticalAuditPath('/admin/audit', result.filters, { page: result.page - 1 }) : '',
        nextHref: result.page < result.totalPages ? buildCriticalAuditPath('/admin/audit', result.filters, { page: result.page + 1 }) : ''
      }
    });
  } catch (error) {
    logger.error('Error loading critical audit trail:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the critical audit trail.'
    });
  }
};

exports.exportCriticalAuditCsv = async (req, res) => {
  try {
    const filters = normalizeCriticalAuditFilters(req.query);
    const { entries } = await listCriticalAuditEventsForExport({ filters });
    const rows = entries.map(mapAuditEntryToRow);
    const csvContent = buildCsvContent(AUDIT_EXPORT_HEADERS, rows);
    const filename = buildExportFilename('audit-trail', 'csv');

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'admin.audit_exported',
      targetType: 'audit',
      targetId: 'admin.audit',
      notes: `CSV audit export generated with ${rows.length} row(s).`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    logger.error('Error exporting critical audit trail CSV:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while exporting the critical audit trail.'
    });
  }
};

exports.exportCriticalAuditXlsx = async (req, res) => {
  try {
    const filters = normalizeCriticalAuditFilters(req.query);
    const { entries } = await listCriticalAuditEventsForExport({ filters });
    const rows = entries.map(mapAuditEntryToRow);
    const buffer = await buildXlsxBuffer({
      sheetName: 'Audit Trail',
      headers: AUDIT_EXPORT_HEADERS,
      rows
    });
    const filename = buildExportFilename('audit-trail', 'xlsx');

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'admin.audit_exported',
      targetType: 'audit',
      targetId: 'admin.audit',
      notes: `XLSX audit export generated with ${rows.length} row(s).`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    logger.error('Error exporting critical audit trail XLSX:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while exporting the critical audit trail.'
    });
  }
};
