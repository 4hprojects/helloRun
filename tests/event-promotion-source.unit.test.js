const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('runner notification settings expose event promotion opt-out', () => {
  const controller = read('src/controllers/runner.controller.js');
  const profile = read('src/views/runner/profile.ejs');

  assert.match(controller, /'event\.promotion'/);
  assert.match(profile, /key:\s*'event\.promotion'/);
  assert.match(profile, /Event promotions/);
});

test('email unsubscribe route handles event promotion preference', () => {
  const routes = read('src/routes/pageRoutes.js');

  assert.match(routes, /router\.get\('\/unsubscribe', requireAuth/);
  assert.match(routes, /key !== 'event\.promotion'/);
  assert.match(routes, /\$addToSet:\s*\{\s*'notificationPreferences\.emailOptOut': key\s*\}/);
});

test('promotion recipient service filters event promotion opt-outs', () => {
  const service = read('src/services/event-promotion.service.js');
  const adminController = read('src/controllers/admin/events.controller.js');
  const organizerRoutes = read('src/routes/organiser/event-management.js');
  const model = read('src/models/EventPromotion.js');

  assert.match(service, /EVENT_PROMOTION_KEY = 'event\.promotion'/);
  assert.match(service, /filterEventPromotionOptOutRecipients/);
  assert.match(service, /'notificationPreferences\.emailOptOut': EVENT_PROMOTION_KEY/);
  assert.match(adminController, /resolveAdminPromotionRecipients/);
  assert.match(organizerRoutes, /resolveOrganizerPromotionRecipients/);
  assert.match(model, /sentCount/);
  assert.match(model, /queuedCount/);
  assert.match(model, /partial/);
});

test('promotion sends record outcome summaries instead of immediate background completion', () => {
  const service = read('src/services/event-promotion.service.js');
  const adminController = read('src/controllers/admin/events.controller.js');
  const organizerRoutes = read('src/routes/organiser/event-management.js');

  assert.match(service, /notifyWithRetry/);
  assert.match(service, /dispatchEventPromotionCampaign/);
  assert.match(adminController, /dispatchEventPromotionCampaign/);
  assert.match(adminController, /campaign\.sentCount = summary\.sentCount/);
  assert.match(organizerRoutes, /dispatchEventPromotionCampaign/);
  assert.match(organizerRoutes, /campaign\.sentCount = summary\.sentCount/);
  assert.doesNotMatch(adminController, /notifyWithRetryInBackground\('event\.promotion'/);
  assert.doesNotMatch(organizerRoutes, /notifyWithRetryInBackground\('event\.promotion'/);
});
