'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  classifyCommunicationFailure,
  groupCommunicationFailureCauses
} = require('../src/services/communication.service');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('communication incidents classify and group actionable root causes', () => {
  assert.equal(classifyCommunicationFailure('Provider returned 429 quota exceeded').key, 'quota');
  assert.equal(classifyCommunicationFailure('Connection timed out').key, 'network');
  assert.equal(classifyCommunicationFailure('Invalid recipient email address').key, 'recipient');
  const groups = groupCommunicationFailureCauses(
    [{ statusReason: 'Connection timed out' }, { statusReason: 'socket reset' }],
    [{ lastError: '429 rate limit' }]
  );
  assert.deepEqual(groups.map((item) => [item.key, item.count]), [['network', 2], ['quota', 1]]);
});

test('badge preview is a non-mutating path and runs before reason enforcement', () => {
  const controller = read('src/controllers/admin/badges.controller.js');
  const recalculation = controller.slice(controller.indexOf('exports.recalculateBadges'));
  assert.ok(recalculation.indexOf('req.body.previewOnly') < recalculation.indexOf('reason.length < 10'));
  assert.match(read('src/services/achievement.service.js'), /Preview counts eligible source records/);
  assert.match(read('src/views/admin/badges.ejs'), /data-skip-high-risk-confirm/);
});

test('operational queues preserve filters, saved views, return state, and scroll', () => {
  const client = read('src/public/js/main.js');
  assert.match(client, /operationalView/);
  assert.match(client, /queueScroll/);
  assert.match(client, /searchParams\.set\('returnTo'/);
  assert.match(read('src/controllers/admin/_shared.js'), /normalizeApplicationQueueReturn/);
});

test('commerce screens explicitly identify payment scope and reviewer', () => {
  assert.match(read('src/views/pages/order-payment.ejs'), /not event registration/);
  assert.match(read('src/views/admin/shop-platform-payment-reviews.ejs'), /HelloRun merchandise only/);
  assert.match(read('src/views/organizer/event-shop-dashboard.ejs'), /separate from event registrations/);
});
