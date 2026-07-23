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
  const profilePresentation = read('src/services/runner-profile-presentation.service.js');
  const profileMain = read('src/views/runner/partials/profile-main.ejs');

  assert.match(controller, /'event\.promotion'/);
  assert.match(profilePresentation, /key:\s*'event\.promotion'/);
  assert.match(profilePresentation, /Event promotions/);
  assert.match(profileMain, /p\.notificationPreferences\.groups/);
  assert.match(profile, /partials\/profile-main/);
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
  assert.match(model, /selected_emails/);
});

test('promotion sends record outcome summaries instead of immediate background completion', () => {
  const service = read('src/services/event-promotion.service.js');
  const adminController = read('src/controllers/admin/events.controller.js');
  const organizerRoutes = read('src/routes/organiser/event-management.js');

  assert.match(service, /notifyWithRetry/);
  assert.match(service, /dispatchEventPromotionCampaign/);
  assert.match(service, /dispatchAndFinalizeEventPromotionCampaign/);
  assert.match(service, /campaign\.sentCount = summary\.sentCount/);
  assert.match(adminController, /dispatchEventPromotionCampaignInBackground/);
  assert.match(organizerRoutes, /dispatchEventPromotionCampaignInBackground/);
  assert.doesNotMatch(adminController, /notifyWithRetryInBackground\('event\.promotion'/);
  assert.doesNotMatch(organizerRoutes, /notifyWithRetryInBackground\('event\.promotion'/);
});

test('promotion dispatch is throttled and campaigns count toward quota at creation', () => {
  const service = read('src/services/event-promotion.service.js');
  const retryService = read('src/services/reliable-communication.service.js');
  const adminController = read('src/controllers/admin/events.controller.js');
  const organizerRoutes = read('src/routes/organiser/event-management.js');

  // Sequential throttled sends — a concurrent Promise.allSettled dispatch trips the
  // email provider's requests-per-second limit and queues most of the campaign.
  assert.match(service, /EVENT_PROMOTION_SEND_INTERVAL_MS/);
  assert.doesNotMatch(service, /Promise\.allSettled/);

  // Retry idempotency keys must be campaign-scoped, otherwise a re-send campaign
  // collides with the previous campaign's finished retry job and never delivers.
  assert.match(retryService, /campaignId: String\(metadata\.campaignId \|\| ''\)/);

  // recipientCount is written at campaign creation so daily-quota sums see
  // in-flight background campaigns.
  assert.match(adminController, /recipientCount: recipients\.length/);
  assert.match(organizerRoutes, /recipientCount: recipients\.length/);
});

test('admin promotion supports selected pasted email recipients', () => {
  const service = read('src/services/event-promotion.service.js');
  const adminController = read('src/controllers/admin/events.controller.js');
  const adminView = read('src/views/admin/promote.ejs');

  assert.match(service, /parseSelectedPromotionEmails/);
  assert.match(service, /hydrateSelectedPromotionRecipients/);
  assert.match(service, /ADMIN_SELECTED_EMAILS_CAP = 500/);
  assert.match(adminController, /selected_emails/);
  assert.match(adminController, /selectedEmails/);
  assert.match(adminView, /Selected Emails/);
  assert.match(adminView, /name="selectedEmails"/);
});

test('organizer basic promotion quota is 25 emails per day', () => {
  const organizerRoutes = read('src/routes/organiser/event-management.js');
  const tracker = read('docs/to-implement/event-promotion.md');

  assert.match(organizerRoutes, /const PROMO_DAILY_LIMIT = 25;/);
  assert.match(tracker, /Daily cap: 25 emails\/day/);
});

test('event forms can schedule one consent-aware promotion for the public posting date', () => {
  const model = read('src/models/Event.js');
  const formService = read('src/services/event-form.service.js');
  const createView = read('src/views/organizer/create-event.ejs');
  const editView = read('src/views/organizer/edit-event.ejs');
  const creationRoutes = read('src/routes/organiser/event-creation.js');

  assert.match(model, /autoEmailPromotionEnabled/);
  assert.match(model, /autoEmailPromotionScheduledAt/);
  assert.match(formService, /applyAutoEmailPromotionSettings/);
  assert.match(formService, /autoEmailPromotionStatus = 'pending'/);
  assert.match(createView, /name="autoEmailPromotionEnabled"/);
  assert.match(createView, /Runners who opted out are excluded/);
  assert.match(editView, /autoEmailPromotionStatus/);
  assert.match(creationRoutes, /formData\.autoEmailPromotionEnabled = false/);
});

test('automatic publish promotions are claimed once and use eligible opted-in runners', () => {
  const worker = read('src/workers/event-promotion-worker.js');
  const service = read('src/services/event-promotion.service.js');
  const promotionModel = read('src/models/EventPromotion.js');
  const server = read('src/server.js');

  assert.match(worker, /autoEmailPromotionStatus: 'pending'/);
  assert.match(worker, /findOneAndUpdate/);
  assert.match(worker, /event-publish:/);
  assert.match(worker, /source: 'automatic_publish'/);
  assert.match(worker, /generateDefaultEventBadges/);
  assert.match(service, /resolveAutomaticPublishPromotionRecipients/);
  assert.match(service, /emailVerified: true/);
  assert.match(service, /accountStatus: 'active'/);
  assert.match(promotionModel, /automaticKey/);
  assert.match(promotionModel, /unique: true/);
  assert.match(server, /startEventPromotionWorker/);
});
