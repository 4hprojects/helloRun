const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('communication retry queue captures failed critical notifications and runs a worker', () => {
  const model = readSource('src/models/CommunicationRetry.js');
  const service = readSource('src/services/reliable-communication.service.js');
  const communicationService = readSource('src/services/communication.service.js');
  const worker = readSource('src/workers/communication-retry-worker.js');
  const server = readSource('src/server.js');

  assert.match(model, /CommunicationRetry/);
  assert.match(model, /queued/);
  assert.match(model, /dead/);
  assert.match(service, /notifyWithRetry/);
  assert.match(service, /enqueueCommunicationRetry/);
  assert.match(service, /processCommunicationRetryBatch/);
  assert.match(service, /runCommunicationRetryHygiene/);
  assert.match(service, /getCommunicationRetryHealth/);
  assert.match(service, /buildCommunicationRetryAlerts/);
  assert.match(service, /throwOnEmailFailure: true/);
  assert.match(service, /throwOnInAppFailure: true/);
  assert.match(communicationService, /throwOnInAppFailure/);
  assert.match(worker, /startCommunicationRetryWorker/);
  assert.match(worker, /runCommunicationRetryCycle/);
  assert.match(worker, /runCommunicationRetryHygiene\(\)/);
  assert.match(server, /startCommunicationRetryWorker\(\)/);
});

test('high-impact organizer workflow notifications use retry-backed delivery', () => {
  const organizerRoutes = readSource('src/routes/organizer.routes.js');
  const organizerShopController = readSource('src/controllers/organizer-shop.controller.js');
  const submissionService = readSource('src/services/submission.service.js');
  const accumulatedActivityService = readSource('src/services/accumulated-activity.service.js');

  assert.match(organizerRoutes, /notifyWithRetryInBackground\('payment\.approved'/);
  assert.match(organizerRoutes, /notifyWithRetryInBackground\('organiser\.payment_reminder'/);
  assert.match(organizerRoutes, /await notifyWithRetry\('payment\.approved'/);
  assert.match(organizerRoutes, /await notifyWithRetry\('payment\.rejected'/);
  assert.match(organizerShopController, /await notifyWithRetry\('payment\.approved'/);
  assert.match(organizerShopController, /await notifyWithRetry\('payment\.rejected'/);
  assert.match(submissionService, /notifyWithRetry\('result\.approved'/);
  assert.match(submissionService, /await notifyWithRetry\('result\.rejected'/);
  assert.match(accumulatedActivityService, /await notifyWithRetry\(approved \? 'result\.approved' : 'result\.rejected'/);
});

test('admin communications exposes retry queue inspection and manual retry', () => {
  const adminRoutes = readSource('src/routes/admin.routes.js');
  const adminController = readSource('src/controllers/admin.controller.js');
  const retryAuditModel = readSource('src/models/CommunicationRetryAudit.js');
  const retryService = readSource('src/services/reliable-communication.service.js');
  const communicationService = readSource('src/services/communication.service.js');
  const communicationsView = readSource('src/views/admin/communications.ejs');
  const detailView = readSource('src/views/admin/communication-failure-detail.ejs');
  const retriesView = readSource('src/views/admin/communication-retries.ejs');

  assert.match(adminRoutes, /\/communications\/retries'[\s\S]*renderCommunicationRetries/);
  assert.match(adminRoutes, /\/communications\/failures\/:eventKey'[\s\S]*renderCommunicationFailureDetail/);
  assert.match(adminRoutes, /\/communications\/retries\/:retryId\/retry'[\s\S]*retryCommunicationDelivery/);
  assert.match(adminController, /renderCommunicationRetries/);
  assert.match(adminController, /renderCommunicationFailureDetail/);
  assert.match(adminController, /buildCommunicationFailureDetailHref/);
  assert.match(adminController, /retryCommunicationDelivery/);
  assert.match(adminController, /listCommunicationRetryAudit/);
  assert.match(adminController, /actorUserId: req\.session\?\.userId/);
  assert.match(adminController, /getCommunicationRetryHealth/);
  assert.match(retryAuditModel, /CommunicationRetryAudit/);
  assert.match(retryAuditModel, /manual_retry/);
  assert.match(retryAuditModel, /hygiene_cleanup/);
  assert.match(retryService, /listCommunicationRetries/);
  assert.match(retryService, /recordCommunicationRetryAudit/);
  assert.match(retryService, /recordCommunicationRetryHygieneAudit/);
  assert.match(retryService, /listCommunicationRetryAudit/);
  assert.match(retryService, /auto_dead_letter/);
  assert.match(retryService, /retryCommunicationNow/);
  assert.match(retryService, /STALE_RETRY_DEAD_LETTER_MS/);
  assert.match(retryService, /SENT_RETRY_RETENTION_MS/);
  assert.match(retryService, /DEAD_RETRY_RETENTION_MS/);
  assert.match(retryService, /DEAD_RETRY_ALERT_WINDOW_MS/);
  assert.match(retryService, /DUE_RETRY_BACKLOG_MS/);
  assert.match(retryService, /dead_letters_increased/);
  assert.match(retryService, /retry_worker_backlog/);
  assert.match(communicationService, /getCommunicationDeliveryDigest/);
  assert.match(communicationService, /buildDeliveryDigestWindow/);
  assert.match(communicationService, /CommunicationLog\.aggregate/);
  assert.match(communicationService, /CommunicationRetry\.aggregate/);
  assert.match(communicationService, /getCommunicationFailureDetail/);
  assert.match(communicationService, /failedLogQuery/);
  assert.match(communicationService, /retryWindowQuery/);
  assert.match(communicationsView, /\/admin\/communications\/retries/);
  assert.match(communicationsView, /deliveryAlerts/);
  assert.match(communicationsView, /communication-delivery-alert/);
  assert.match(communicationsView, /Delivery Digest/);
  assert.match(communicationsView, /communication-digest-table/);
  assert.match(communicationsView, /buildFailureDetailHref/);
  assert.match(communicationsView, /queueHealth\.dueNow/);
  assert.match(communicationsView, /queueHealth\.overdueDue/);
  assert.match(communicationsView, /dead-lettered/);
  assert.match(detailView, /Notification Failure Detail/);
  assert.match(detailView, /Recent Failed Logs/);
  assert.match(detailView, /Recent Retry Jobs/);
  assert.match(retriesView, /Notification Retry Queue/);
  assert.match(retriesView, /Retry Action Trail/);
  assert.match(retriesView, /communication-retry-audit-table/);
  assert.match(retriesView, /Inspect payload/);
  assert.match(retriesView, /Retry now/);
});
