'use strict';

// The race-day console used to hide the one sentence a volunteer needed.
//
// Releasing a kit before a bib existed answered 500 "Something went wrong. Please try
// again." while the log held "Assign a bib first." Assigning a bib number already in use
// did the same. Both are states the desk resolves in seconds — if it is told.
//
// Two halves have to meet for that to work, so both are asserted here against real
// behaviour rather than by reading the source: the service must mark the error with a
// code, and the route must turn that code into a status and the service's own message.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const ROOT = path.resolve(__dirname, '..');

/**
 * Load the onsite service with a stubbed Postgres client.
 * `rows` is what every tagged-template query returns.
 */
function loadServiceWithSql(rows) {
  const servicePath = require.resolve('../src/services/onsite-operations.service');
  const pgPath = require.resolve('../src/db/postgres');
  const achievementsPath = require.resolve('../src/services/achievement.service');

  const saved = { service: require.cache[servicePath], pg: require.cache[pgPath] };
  delete require.cache[servicePath];

  const sql = () => Promise.resolve(rows);
  require.cache[pgPath] = {
    id: pgPath,
    filename: pgPath,
    loaded: true,
    exports: { getPostgresClient: () => sql, closePostgresClient: async () => {} }
  };
  // Not under test here, and it reaches for a database of its own.
  require.cache[achievementsPath] = require.cache[achievementsPath] || {
    id: achievementsPath,
    filename: achievementsPath,
    loaded: true,
    exports: { evaluateOnsiteResultAchievements: async () => ({}) }
  };

  const service = require('../src/services/onsite-operations.service');

  return {
    service,
    restore() {
      delete require.cache[servicePath];
      if (saved.service) require.cache[servicePath] = saved.service;
      if (saved.pg) require.cache[pgPath] = saved.pg;
      else delete require.cache[pgPath];
    }
  };
}

test('a kit asked for before a bib exists is a NO_BIB the desk can act on', async () => {
  const { service, restore } = loadServiceWithSql([]);
  try {
    await assert.rejects(
      () => service.markRaceKitReleased('event-1', 'reg-1'),
      (error) => {
        assert.equal(error.code, 'NO_BIB', 'must carry a code, or the route cannot tell it from a fault');
        assert.equal(error.isOperational, true);
        assert.match(error.message, /Assign a bib first/);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test('a bib number already in use is a BIB_TAKEN naming the number', async () => {
  // Every query answers with one row: the event lookup, the registration lookup, and
  // then the duplicate check — which is the one that must stop this.
  const { service, restore } = loadServiceWithSql([{ id: 'x', app_user_id: null }]);
  try {
    await assert.rejects(
      () => service.assignBib('event-1', 'reg-1', '501'),
      (error) => {
        assert.equal(error.code, 'BIB_TAKEN');
        assert.match(error.message, /501/, 'the number is the actionable part of the message');
        return true;
      }
    );
  } finally {
    restore();
  }
});

test('a missing event is a NOT_FOUND rather than a server fault', async () => {
  const { service, restore } = loadServiceWithSql([]);
  try {
    await assert.rejects(
      () => service.recordCheckIn('missing-event', 'reg-1'),
      (error) => {
        assert.equal(error.code, 'NOT_FOUND');
        return true;
      }
    );
  } finally {
    restore();
  }
});

// --- the other half: what the desk actually receives -------------------------------

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function loadRouteHelper() {
  // The router pulls in models and middleware; requiring it is enough here because the
  // helper is a pure function on the module.
  return require('../src/routes/organiser/onsite-operations');
}

test('each coded onsite error reaches the desk with its own message', () => {
  const { sendOnsiteError, ONSITE_OPERATIONAL_STATUS } = loadRouteHelper();

  const cases = [
    ['NO_BIB', 409, 'No live bib assignment found for this registration. Assign a bib first.'],
    ['BIB_TAKEN', 409, 'Bib number 501 already assigned for this event'],
    ['NO_STOCK', 409, 'No M left. Choose another size to hand over instead.'],
    ['ALREADY_RELEASED', 409, 'This kit has already been handed over.'],
    ['NOT_FOUND', 404, 'Registration not found for ID: reg-1 on this event'],
    ['INVALID_INPUT', 400, 'Race kit name is required'],
    ['RESULT_NOT_APPROVABLE', 409, 'Onsite result not found or cannot be approved']
  ];

  for (const [code, expectedStatus, message] of cases) {
    const error = new Error(message);
    error.code = code;

    const res = fakeRes();
    sendOnsiteError(res, 'log label:', error);

    assert.equal(res.statusCode, expectedStatus, `${code} should answer ${expectedStatus}`);
    assert.equal(
      res.body.error,
      message,
      `${code} must keep the service's message — replacing it is the defect this fixes`
    );
    assert.equal(res.body.success, false);
    assert.equal(ONSITE_OPERATIONAL_STATUS[code], expectedStatus);
  }
});

test('an unexpected fault still gets the generic 500, leaking nothing', () => {
  const { sendOnsiteError } = loadRouteHelper();

  const error = new Error('connection terminated: password authentication failed for user "app"');
  const res = fakeRes();
  sendOnsiteError(res, 'log label:', error);

  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(
    JSON.stringify(res.body),
    /password|authentication/i,
    'an uncoded error must not have its detail forwarded to the browser'
  );
});

test('the desk-facing onsite routes route their failures through the mapper', () => {
  // Guards the wiring: a route that still calls sendJsonServerError directly would
  // answer 500 for a coded error no matter how well the mapper works.
  const source = fs.readFileSync(
    path.join(ROOT, 'src/routes/organiser/onsite-operations.js'),
    'utf8'
  );

  const mustMap = [
    'Error assigning bib:',
    'Error releasing race kit:',
    'Error recording check-in:',
    'Error recording onsite result:',
    'Error approving onsite result:',
    'Error creating race kit:'
  ];

  for (const label of mustMap) {
    assert.ok(
      source.includes(`sendOnsiteError(res, '${label}'`),
      `${label} must go through sendOnsiteError`
    );
    assert.ok(
      !source.includes(`sendJsonServerError(res, '${label}'`),
      `${label} must no longer answer with the generic 500 handler`
    );
  }
});

test('the client renders the message it is sent', () => {
  // A correct payload nobody displays is the same defect wearing a different hat.
  for (const file of ['src/public/js/organizer-onsite-kits.js', 'src/public/js/organizer-onsite-bibs.js']) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.match(
      source,
      /payload\.error\s*\|\|/,
      `${file} should prefer the server's message over its own fallback`
    );
  }
});

// Keeps `Module` referenced for linters that flag unused requires.
assert.ok(typeof Module.createRequire === 'function');
