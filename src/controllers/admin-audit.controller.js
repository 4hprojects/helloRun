const {
  AUDIT_GROUP_OPTIONS,
  AUDIT_TARGET_TYPE_OPTIONS,
  buildCriticalAuditPath,
  listCriticalAuditEvents,
  listCriticalAuditSignals,
  normalizeCriticalAuditFilters
} = require('../services/critical-audit-query.service');

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
