'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('private viewer feature flag defaults off and reports missing enabled configuration', () => {
  const { isStravaPrivateViewerEnabled, getStravaPrivateViewerReadiness } = require('../src/utils/strava-private-viewer');
  assert.equal(isStravaPrivateViewerEnabled({}), false);
  assert.deepEqual(getStravaPrivateViewerReadiness({}), { enabled: false, ready: true, status: 'disabled', missing: [] });

  const partial = getStravaPrivateViewerReadiness({ STRAVA_PRIVATE_VIEWER_ENABLED: 'true' });
  assert.equal(partial.ready, false);
  assert.equal(partial.status, 'not_ready');
  assert.ok(partial.missing.includes('STRAVA_ENCRYPTION_KEY'));

  const complete = getStravaPrivateViewerReadiness({
    STRAVA_PRIVATE_VIEWER_ENABLED: 'true',
    STRAVA_CLIENT_ID: 'id',
    STRAVA_CLIENT_SECRET: 'secret',
    STRAVA_REDIRECT_URI: 'https://example.test/integrations/strava/callback',
    STRAVA_ENCRYPTION_KEY: 'key',
    STRAVA_WEBHOOK_VERIFY_TOKEN: 'verify'
  });
  assert.deepEqual(complete, { enabled: true, ready: true, status: 'ready', missing: [] });
});

test('disabled viewer returns integration_disabled while the event-submission block remains permanent', () => {
  const original = process.env.STRAVA_PRIVATE_VIEWER_ENABLED;
  process.env.STRAVA_PRIVATE_VIEWER_ENABLED = 'false';
  const routes = require('../src/routes/strava.routes');
  const response = {
    statusCode: 0,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
  let nextCalled = false;
  routes._private.requireStravaViewerJson({}, response, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 503);
  assert.equal(response.payload.code, 'integration_disabled');
  assert.match(read('src/routes/strava.routes.js'), /submissions\/strava'[\s\S]*status\(403\)[\s\S]*external_use_blocked/);
  if (original === undefined) delete process.env.STRAVA_PRIVATE_VIEWER_ENABLED;
  else process.env.STRAVA_PRIVATE_VIEWER_ENABLED = original;
});

test('profile uses the official Strava asset and discloses collection, withdrawal, and deletion', () => {
  const shell = read('src/views/runner/profile.ejs');
  const main = read('src/views/runner/partials/profile-main.ejs');
  const asset = read('src/public/images/integrations/btn_strava_connect_with_orange.svg');
  assert.match(asset, /fill="#FC5200"/);
  assert.match(main, /btn_strava_connect_with_orange\.svg/);
  assert.match(main, /viewerEnabled/);
  assert.match(shell, /fetch your public activity list only when you request it/);
  assert.match(shell, /withdraw authorization at any time/);
  assert.match(shell, /durable deletion confirmation/);
});

test('webhook events are deduplicated and a stale processing lease is recovered', async () => {
  const service = require('../src/services/strava-webhook.service');
  const filters = [];
  const dedupeModel = {
    async updateOne(filter) { filters.push(filter); }
  };
  const payload = { object_type: 'activity', aspect_type: 'update', owner_id: 12, object_id: 34, event_time: 56 };
  await service.enqueueWebhookEvent(payload, { JobModel: dedupeModel });
  await service.enqueueWebhookEvent(payload, { JobModel: dedupeModel });
  assert.equal(filters[0].eventKey, filters[1].eventKey);

  const now = new Date('2026-10-09T02:00:00Z');
  const job = {
    status: 'processing',
    lockedAt: new Date(now.getTime() - service._private.WEBHOOK_JOB_LEASE_MS - 1),
    expiresAt: new Date(now.getTime() + 60_000),
    objectType: 'athlete',
    aspectType: 'update',
    authorized: false,
    ownerId: 99,
    objectId: 99,
    attempts: 0,
    async save() {},
    async deleteOne() { this.deleted = true; }
  };
  const JobModel = {
    async updateMany() { job.status = 'failed'; job.lockedAt = null; job.retryAt = now; return { modifiedCount: 1 }; },
    async deleteMany() {},
    async findOneAndUpdate() {
      if (job.deleted || job.status === 'processing') return null;
      job.status = 'processing';
      job.lockedAt = now;
      return job;
    }
  };
  const disconnected = [];
  const result = await service.processWebhookEvents({ JobModel, now, disconnectByAthleteId: async (id) => disconnected.push(id) });
  assert.deepEqual(disconnected, [99]);
  assert.equal(result.recovered, 1);
  assert.equal(result.completed, 1);
  assert.equal(job.deleted, true);
});

test('revocation worker recovers stale leases and atomically completes the receipt', async () => {
  process.env.STRAVA_ENCRYPTION_KEY = 'test-strava-private-viewer-launch-key';
  const { encryptToken } = require('../src/services/token-encryption.service');
  const service = require('../src/services/strava.service');
  const now = new Date('2026-10-09T02:00:00Z');
  const job = {
    status: 'processing',
    lockedAt: new Date(now.getTime() - service._private.REVOCATION_JOB_LEASE_MS - 1),
    expiresAt: new Date(now.getTime() + 60_000),
    retryAt: now,
    attempts: 0,
    encryptedToken: encryptToken('refresh-token'),
    tokenType: 'refresh_token',
    deletionReceiptId: 'receipt-1',
    async save() {},
    async deleteOne() { this.deleted = true; }
  };
  const JobModel = {
    async updateMany() { job.status = 'failed'; job.lockedAt = null; return { modifiedCount: 1 }; },
    find() { return { limit: async () => [] }; },
    async findOneAndUpdate() {
      if (job.deleted || job.status === 'processing') return null;
      job.status = 'processing';
      return job;
    }
  };
  const receiptUpdates = [];
  const ReceiptModel = { async updateOne(filter, update) { receiptUpdates.push({ filter, update }); } };
  const revoked = [];
  const result = await service.processRevocationJobs({
    JobModel,
    ReceiptModel,
    now,
    revoke: async (token, type) => revoked.push([token, type])
  });
  assert.deepEqual(revoked, [['refresh-token', 'refresh_token']]);
  assert.equal(result.recovered, 1);
  assert.equal(result.completed, 1);
  assert.equal(receiptUpdates[0].update.$set.remoteRevocationStatus, 'completed');
});

test('webhook operator command is idempotent and never returns credentials', async () => {
  const manager = require('../src/scripts/manage-strava-webhook');
  const env = {
    APP_URL: 'https://hellorun.example',
    STRAVA_CLIENT_ID: 'client-id',
    STRAVA_CLIENT_SECRET: 'client-secret',
    STRAVA_WEBHOOK_VERIFY_TOKEN: 'verify-secret'
  };
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (!options.method) return response([]);
    return response({ id: 123 });
  };
  const created = await manager.run({ command: 'create', id: null }, { env, fetchImpl });
  assert.equal(created.action, 'created');
  assert.equal(created.subscription.id, 123);
  const output = JSON.stringify(created);
  assert.doesNotMatch(output, /client-secret|verify-secret|client-id/);
  assert.match(String(calls[1].options.body), /verify_token=verify-secret/);
  await assert.rejects(
    manager.run({ command: 'list', id: null }, { env, fetchImpl: async () => { throw new Error('https://strava.test/?client_secret=leak'); } }),
    (error) => !error.message.includes('leak')
  );
});

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; }
  };
}
