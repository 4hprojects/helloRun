const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('high-impact runner and organizer workflows emit critical audit events', () => {
  const pageController = readSource('src/controllers/page.controller.js');
  const shopController = readSource('src/controllers/shop.controller.js');
  const organizerRoutes = readSource('src/routes/organizer.routes.js');
  const organizerShopController = readSource('src/controllers/organizer-shop.controller.js');

  assert.match(pageController, /payment\.receipt_submitted/);
  assert.match(shopController, /shop\.payment_receipt_submitted/);
  assert.match(organizerRoutes, /organiser\.registrants_exported/);
  assert.match(organizerRoutes, /organiser\.payment_reminder_sent/);
  assert.match(organizerShopController, /organiser\.shop_orders_exported/);
});

test('admin and organizer audit consoles expose filtered critical audit views', () => {
  const adminRoutes = readSource('src/routes/admin.routes.js');
  const organizerRoutes = readSource('src/routes/organizer.routes.js');
  const auditService = readSource('src/services/critical-audit-query.service.js');
  const adminAuditView = readSource('src/views/admin/audit-trail.ejs');
  const organizerAuditView = readSource('src/views/organizer/event-audit.ejs');
  const organizerEventDetailView = readSource('src/views/organizer/event-details.ejs');

  assert.match(adminRoutes, /\/audit'[\s\S]*adminAuditController\.listCriticalAudit/);
  assert.match(organizerRoutes, /\/events\/:id\/audit'[\s\S]*listCriticalAuditEvents/);
  assert.match(organizerRoutes, /getEventAuditTargetIds/);
  assert.match(organizerRoutes, /accumulated_activity_submission/);
  assert.match(auditService, /AUDIT_ACTION_GROUPS/);
  assert.match(auditService, /payment\.receipt_submitted/);
  assert.match(auditService, /organiser\.registrants_exported/);
  assert.match(auditService, /submission\.approved/);
  assert.match(adminAuditView, /Critical Audit Trail/);
  assert.match(adminAuditView, /Exact Action/);
  assert.match(organizerAuditView, /Event Audit/);
  assert.match(organizerEventDetailView, /\/organizer\/events\/<%= event\._id %>\/audit/);
});

test('critical audit consoles surface anomaly signals', () => {
  const auditService = readSource('src/services/critical-audit-query.service.js');
  const adminAuditController = readSource('src/controllers/admin-audit.controller.js');
  const organizerRoutes = readSource('src/routes/organizer.routes.js');
  const adminAuditView = readSource('src/views/admin/audit-trail.ejs');
  const organizerAuditView = readSource('src/views/organizer/event-audit.ejs');

  assert.match(auditService, /listCriticalAuditSignals/);
  assert.match(auditService, /high_export_volume/);
  assert.match(auditService, /many_rejections/);
  assert.match(auditService, /rapid_activity/);
  assert.match(adminAuditController, /listCriticalAuditSignals/);
  assert.match(organizerRoutes, /listCriticalAuditSignals\(auditScope\)/);
  assert.match(adminAuditView, /Audit Signals/);
  assert.match(organizerAuditView, /Audit Signals/);
});
