const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SERVICE_PATH = require.resolve('../src/services/event-promotion.service');
const RELIABLE_PATH = require.resolve('../src/services/reliable-communication.service');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

function loadServiceWithNotifier(notifyWithRetry) {
  const originalReliable = require.cache[RELIABLE_PATH];
  delete require.cache[SERVICE_PATH];
  require.cache[RELIABLE_PATH] = {
    id: RELIABLE_PATH,
    filename: RELIABLE_PATH,
    loaded: true,
    exports: { notifyWithRetry }
  };
  try {
    return require(SERVICE_PATH);
  } finally {
    delete require.cache[SERVICE_PATH];
    if (originalReliable) require.cache[RELIABLE_PATH] = originalReliable;
    else delete require.cache[RELIABLE_PATH];
  }
}

function createSpyTracker({ failWith = null } = {}) {
  const calls = { start: [], record: [] };
  return {
    calls,
    async start(recipients) {
      calls.start.push(recipients.map((r) => r.email));
      if (failWith) throw failWith;
    },
    async record(index, outcome, summary) {
      calls.record.push({ index, outcome, sentCount: summary.sentCount });
    }
  };
}

const event = { _id: 'event-1', slug: 'october-run', title: 'October Run' };
const campaign = { _id: 'campaign-1' };

test('buildDeliveryEntries marks every tracked recipient pending and flags truncation', () => {
  const { buildDeliveryEntries } = require('../src/services/event-promotion.service');
  const recipients = [{ email: 'A@Example.com' }, { email: 'b@example.com' }, { email: 'c@example.com' }];

  const full = buildDeliveryEntries(recipients, 5);
  assert.equal(full.truncated, false);
  assert.deepEqual(full.deliveries.map((d) => [d.email, d.status]), [
    ['a@example.com', 'pending'],
    ['b@example.com', 'pending'],
    ['c@example.com', 'pending']
  ]);

  const capped = buildDeliveryEntries(recipients, 2);
  assert.equal(capped.truncated, true);
  assert.equal(capped.deliveries.length, 2);
});

test('resolveDeliveryOutcome maps notifier results to delivery statuses', () => {
  const { resolveDeliveryOutcome } = require('../src/services/event-promotion.service');

  assert.equal(resolveDeliveryOutcome({ email: { status: 'sent' } }).status, 'sent');
  assert.equal(resolveDeliveryOutcome({ queued: true }).status, 'queued');
  assert.deepEqual(
    resolveDeliveryOutcome({ email: { status: 'suppressed', reason: 'user_opt_out' } }),
    { status: 'suppressed', reason: 'user_opt_out' }
  );
  assert.equal(resolveDeliveryOutcome({ email: { status: 'skipped' } }).status, 'skipped');
  assert.deepEqual(
    resolveDeliveryOutcome({ email: { status: 'failed', error: new Error('429 rate limited') } }),
    { status: 'failed', reason: '429 rate limited' }
  );
  assert.equal(resolveDeliveryOutcome(null).status, 'skipped');
  assert.deepEqual(resolveDeliveryOutcome(null, new Error('boom')), { status: 'failed', reason: 'boom' });
});

test('isCampaignStalled only flags sending campaigns without recent progress', () => {
  const { isCampaignStalled, PROMOTION_STALL_THRESHOLD_MS } = require('../src/services/event-promotion.service');
  const now = new Date('2026-10-03T10:00:00Z');
  const old = new Date(now.getTime() - PROMOTION_STALL_THRESHOLD_MS - 1000);
  const recent = new Date(now.getTime() - 5000);

  assert.equal(isCampaignStalled({ status: 'sending', lastProgressAt: old }, now), true);
  assert.equal(isCampaignStalled({ status: 'sending', lastProgressAt: recent }, now), false);
  assert.equal(isCampaignStalled({ status: 'completed', lastProgressAt: old }, now), false);
});

test('dispatch reports per-recipient progress to the tracker in send order', async () => {
  const results = {
    'a@example.com': { email: { status: 'sent' } },
    'b@example.com': { email: { status: 'failed', error: new Error('provider down') } },
    'c@example.com': { queued: true }
  };
  const service = loadServiceWithNotifier(async (_key, payload) => {
    if (payload.email.to === 'd@example.com') throw new Error('network');
    return results[payload.email.to];
  });
  const tracker = createSpyTracker();

  const summary = await service.dispatchEventPromotionCampaign({
    campaign,
    event,
    organiserName: 'Org',
    recipients: [
      { email: 'a@example.com' },
      { email: 'b@example.com' },
      { email: 'c@example.com' },
      { email: 'd@example.com' }
    ],
    sendIntervalMs: 0,
    progressTracker: tracker
  });

  assert.deepEqual(tracker.calls.start, [['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com']]);
  assert.deepEqual(tracker.calls.record.map((r) => [r.index, r.outcome.status]), [
    [0, 'sent'],
    [1, 'failed'],
    [2, 'queued'],
    [3, 'failed']
  ]);
  assert.equal(tracker.calls.record[0].sentCount, 1);
  assert.equal(summary.sentCount, 1);
  assert.equal(summary.failedCount, 2);
  assert.equal(summary.queuedCount, 1);
  assert.equal(summary.status, 'partial');
});

test('default progress tracker swallows write failures so sends continue', async () => {
  const service = loadServiceWithNotifier(async () => ({ email: { status: 'sent' } }));
  const EventPromotion = require('../src/models/EventPromotion');
  const originalUpdateOne = EventPromotion.updateOne;
  const writes = [];
  EventPromotion.updateOne = async (filter, update) => {
    writes.push(update.$set);
    throw new Error('mongo unavailable');
  };
  try {
    const tracker = service.createCampaignProgressTracker(campaign);
    const summary = await service.dispatchEventPromotionCampaign({
      campaign,
      event,
      organiserName: 'Org',
      recipients: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
      sendIntervalMs: 0,
      progressTracker: tracker
    });

    assert.equal(summary.sentCount, 2);
    assert.equal(writes.length, 3);
    assert.equal(writes[0].deliveries[0].status, 'sending');
    assert.equal(writes[1]['deliveries.0.status'], 'sent');
    assert.equal(writes[1]['deliveries.1.status'], 'sending');
    assert.equal(writes[2].processedCount, 2);
    assert.equal(writes[2]['deliveries.2.status'], undefined);
  } finally {
    EventPromotion.updateOne = originalUpdateOne;
  }
});

test('admin promote page exposes a full-admin live send status card', () => {
  const routes = read('src/routes/admin.routes.js');
  const controller = read('src/controllers/admin/events.controller.js');
  const view = read('src/views/admin/promote.ejs');
  const model = read('src/models/EventPromotion.js');

  assert.match(routes, /router\.get\('\/promote\/live', requireAdmin, requireFullAdmin, adminController\.promoteLive\)/);
  assert.match(controller, /exports\.promoteLive/);
  assert.match(controller, /campaign: String\(campaign\._id\)/);
  assert.match(model, /deliveries:/);
  assert.match(model, /processedCount/);

  assert.match(view, /id="live-status-card"/);
  assert.match(view, /Live Send Status/);
  assert.match(view, /\/admin\/promote\/live\?/);
  assert.match(view, /data-campaign-id="<%= c\._id %>"/);
  assert.doesNotMatch(view, /\.innerHTML\s*=/);
  const rawOutputs = view.match(/<%-[^%]*%>/g) || [];
  assert.ok(rawOutputs.every((tag) => /include\(/.test(tag)), 'only includes may use raw EJS output');
});
