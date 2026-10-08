'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Window } = require('happy-dom');

const CorosStravaBridge = require('../src/models/CorosStravaBridge');
const StravaConnection = require('../src/models/StravaConnection');
const bridgeService = require('../src/services/coros-strava-bridge.service');

const ROOT = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

function patch(target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  return () => { target[key] = original; };
}

function queryResult(value) {
  return { lean: async () => value };
}

test('bridge schema stores only HelloRun-owned setup state', () => {
  const paths = Object.keys(CorosStravaBridge.schema.paths);
  for (const required of ['userId', 'status', 'guideVersion', 'startedAt', 'confirmedAt', 'createdAt', 'updatedAt']) {
    assert.ok(paths.includes(required), `missing ${required}`);
  }
  for (const forbidden of ['athleteId', 'activityId', 'accessToken', 'refreshToken', 'distance', 'duration', 'metrics', 'device']) {
    assert.equal(paths.some((field) => field.toLowerCase().includes(forbidden.toLowerCase())), false, `must not store ${forbidden}`);
  }
  assert.deepEqual(CorosStravaBridge.schema.path('status').enumValues, ['setup_started', 'user_confirmed']);
  assert.equal(CorosStravaBridge.schema.path('userId').options.unique, true);
});

test('status is owner-scoped and reports Strava validation availability', async () => {
  const userId = '507f191e810c19729de860ea';
  const restores = [
    patch(CorosStravaBridge, 'findOne', (query) => {
      assert.equal(query.userId, userId);
      return queryResult({ status: 'setup_started', guideVersion: 'coros-strava-v1', startedAt: new Date('2026-10-08T00:00:00Z') });
    }),
    patch(StravaConnection, 'exists', async (query) => {
      assert.deepEqual(query, { userId, status: 'connected' });
      return { _id: 'connection-id' };
    })
  ];
  try {
    const result = await bridgeService.getStatus(userId);
    assert.equal(result.status, 'setup_started');
    assert.equal(result.stravaConnected, true);
    assert.equal(result.canValidate, true);
  } finally { restores.forEach((restore) => restore()); }
});

test('starting twice preserves one existing bridge and confirmation cannot be downgraded', async () => {
  let creates = 0;
  const existing = { status: 'user_confirmed', guideVersion: bridgeService.GUIDE_VERSION, confirmedAt: new Date() };
  const restores = [
    patch(CorosStravaBridge, 'findOne', async () => existing),
    patch(CorosStravaBridge, 'create', async () => { creates += 1; }),
    patch(StravaConnection, 'exists', async () => ({ _id: 'connected' }))
  ];
  try {
    const first = await bridgeService.startSetup('user-1');
    const second = await bridgeService.startSetup('user-1');
    assert.equal(first.status, 'user_confirmed');
    assert.equal(second.status, 'user_confirmed');
    assert.equal(creates, 0);
  } finally { restores.forEach((restore) => restore()); }
});

test('confirmation requires an active Strava connection before any bridge write', async () => {
  let writes = 0;
  const restores = [
    patch(StravaConnection, 'exists', async () => null),
    patch(CorosStravaBridge, 'findOneAndUpdate', async () => { writes += 1; })
  ];
  try {
    await assert.rejects(
      () => bridgeService.confirmSetup('user-1'),
      (error) => error.status === 409 && error.code === 'strava_connection_required'
    );
    assert.equal(writes, 0);
  } finally { restores.forEach((restore) => restore()); }
});

test('confirmation is idempotent and reset deletes only the owner bridge', async () => {
  const confirmed = { status: 'user_confirmed', guideVersion: bridgeService.GUIDE_VERSION, confirmedAt: new Date() };
  let updates = 0;
  let deleteQuery = null;
  const restores = [
    patch(StravaConnection, 'exists', async () => ({ _id: 'connected' })),
    patch(CorosStravaBridge, 'findOne', async () => confirmed),
    patch(CorosStravaBridge, 'findOneAndUpdate', async () => { updates += 1; }),
    patch(CorosStravaBridge, 'deleteOne', async (query) => { deleteQuery = query; return { deletedCount: 1 }; })
  ];
  try {
    const result = await bridgeService.confirmSetup('user-1');
    assert.equal(result.status, 'user_confirmed');
    assert.equal(updates, 0);
    const reset = await bridgeService.resetSetup('user-1');
    assert.deepEqual(deleteQuery, { userId: 'user-1' });
    assert.equal(reset.status, 'not_started');
  } finally { restores.forEach((restore) => restore()); }
});

test('API source enforces runner auth, CSRF, rate limiting, and explicit confirmation', () => {
  const routes = read('src/routes/strava.routes.js');
  assert.match(routes, /\/api\/integrations\/coros-strava\/status', requireAuthJson, requireRunnerWorkspaceJson/);
  assert.match(routes, /\/api\/integrations\/coros-strava\/setup\/start'[\s\S]*corosStravaBridgeLimiter, requireCsrfProtection/);
  assert.match(routes, /\/api\/integrations\/coros-strava\/setup\/confirm'[\s\S]*corosStravaBridgeLimiter, requireCsrfProtection/);
  assert.match(routes, /req\.body\?\.confirmed !== true/);
  assert.match(routes, /error instanceof corosStravaBridgeService\.CorosStravaBridgeError/);
  assert.match(routes, /isExpectedError \? error\.message : 'Unable to confirm COROS setup\.'/);
  assert.match(routes, /router\.delete\('\/api\/integrations\/coros-strava\/setup'[\s\S]*corosStravaBridgeLimiter, requireCsrfProtection/);
});

test('Strava lifecycle and account deletion remove bridge state without provider calls', () => {
  const stravaService = read('src/services/strava.service.js');
  const adminUsers = read('src/controllers/admin/users.controller.js');
  const cleanup = read('src/services/test-user-cleanup.service.js');
  assert.match(stravaService, /CorosStravaBridge\.deleteOne\(\{ userId \}\)/);
  assert.match(stravaService, /disconnectByAthleteId[\s\S]*CorosStravaBridge\.deleteOne\(\{ userId \}\)/);
  assert.match(adminUsers, /CorosStravaBridge\.deleteMany\(\{ userId: \{ \$in: deletableIds \} \}\)[\s\S]*User\.deleteMany/);
  assert.match(cleanup, /CorosStravaBridge\.deleteMany\(\{ userId: \{ \$in: userIds \} \}\)/);
});

test('profile wizard opens accessibly, requires a checkbox, confirms, and restores focus', async () => {
  const window = new Window({ url: 'https://hellorun.test/runner/profile#integrations' });
  window.document.body.innerHTML = `
    <input type="hidden" name="_csrf" value="csrf-token">
    <article data-coros-strava-card data-bridge-status="not_started">
      <span data-coros-strava-state>Optional</span><p data-coros-strava-summary>Not set up</p>
      <p data-coros-confirmed-copy hidden></p><p data-coros-strava-status></p>
      <button data-open-coros-strava-wizard>Set up</button><button data-reset-coros-strava hidden>Reset</button>
    </article>
    <div id="corosStravaSetupModal" hidden aria-hidden="true"><div class="modal-dialog" tabindex="-1">
      <button data-close-coros-strava-wizard>Close</button><input type="checkbox" data-coros-strava-confirm-check>
      <button data-confirm-coros-strava disabled>Confirm</button><p data-coros-wizard-status></p>
    </div></div>`;
  const calls = [];
  window.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const confirmed = String(url).endsWith('/confirm');
    return {
      ok: true,
      json: async () => ({
        success: true,
        bridge: confirmed
          ? { status: 'user_confirmed', confirmedAt: '2026-10-08T00:00:00Z' }
          : { status: 'setup_started' }
      })
    };
  };
  window.setTimeout = (callback) => { callback(); return 1; };
  window.eval(read('src/public/js/runner-profile.js'));

  const trigger = window.document.querySelector('[data-open-coros-strava-wizard]');
  const modal = window.document.getElementById('corosStravaSetupModal');
  trigger.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(modal.hidden, false);
  assert.equal(modal.getAttribute('aria-hidden'), 'false');
  assert.equal(calls[0].url, '/api/integrations/coros-strava/setup/start');
  assert.equal(calls[0].options.headers['x-csrf-token'], 'csrf-token');

  const checkbox = modal.querySelector('[data-coros-strava-confirm-check]');
  const confirm = modal.querySelector('[data-confirm-coros-strava]');
  assert.equal(confirm.disabled, true);
  checkbox.click();
  assert.equal(confirm.disabled, false);
  confirm.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls[1].url, '/api/integrations/coros-strava/setup/confirm');
  assert.equal(JSON.parse(calls[1].options.body).confirmed, true);
  assert.equal(modal.hidden, true);
  assert.equal(window.document.activeElement, trigger);
  assert.equal(window.document.querySelector('[data-coros-strava-state]').textContent, 'Confirmed by you');
});

test('direct COROS integration remains hard-disabled and has no OAuth implementation', () => {
  const envExample = read('.env.example');
  assert.match(envExample, /COROS_DIRECT_INTEGRATION_ENABLED=false/);
  const sourceFiles = [read('src/routes/strava.routes.js'), read('src/services/coros-strava-bridge.service.js')].join('\n');
  assert.doesNotMatch(sourceFiles, /open\.coros\.com|mcp\.coros\.com|COROS_CLIENT_SECRET|COROS_CLIENT_ID/);
});
