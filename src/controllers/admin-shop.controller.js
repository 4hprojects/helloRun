function notLive(res, message) {
  return res.status(501).render('error', {
    title: 'Admin Shop Not Live Yet',
    status: 501,
    message
  });
}

exports.getShopDashboard = async (_req, res) => notLive(res, 'Admin shop dashboard is scaffolded but not yet live.');
exports.getProducts = async (_req, res) => notLive(res, 'Admin product management is scaffolded but not yet live.');
exports.getProductApprovals = async (_req, res) => notLive(res, 'Admin product approvals are scaffolded but not yet live.');
exports.patchProductApproval = async (_req, res) => res.status(501).json({ success: false, message: 'Product approval actions are not live yet.' });
exports.getOrders = async (_req, res) => notLive(res, 'Admin orders view is scaffolded but not yet live.');
exports.getPayments = async (_req, res) => notLive(res, 'Admin payments view is scaffolded but not yet live.');
exports.getReports = async (_req, res) => notLive(res, 'Admin reports are scaffolded but not yet live.');
exports.getSettings = async (_req, res) => notLive(res, 'Admin shop settings are scaffolded but not yet live.');
exports.patchSettings = async (_req, res) => res.status(501).json({ success: false, message: 'Admin shop settings update is not live yet.' });
