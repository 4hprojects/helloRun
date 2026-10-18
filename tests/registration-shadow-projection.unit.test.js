'use strict';

// Releasing a race kit used to blank the runner's Postgres shadow row.
//
// `race-kit-release.service.js` reads the registration with
// `.select('kitSize kitSizeReleased participant')`, sets the released size, and saves.
// `Registration`'s `post('save')` hook then syncs whatever document it is handed, and the
// upsert writes *every* column from `excluded` — so the fields the projection never loaded
// were not skipped, they were overwritten with defaults.
//
// The damage was invisible at the point of the write and showed up on the race-day
// console: `mongo_event_id` became '' and `event_core_id` became null, and the onsite
// roster joins `WHERE r.mongo_event_id = ${eventId}`, so the runner's bib and check-in
// state disappeared from the list while the kit desk saw a success.
//
// These tests drive the real sync with a captured SQL client.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  syncRegistrationPaymentShadow
} = require('../src/services/registration-payment-shadow.service');

const EVENT_ID = '6a786628078618bc59e0ba04';
const REG_ID = '6a78676b64bdf456da2205eb';

/**
 * A stand-in for the full document as stored, used both as the "reload" result and as the
 * baseline the projected document is a subset of.
 */
function buildFullDocument(overrides = {}) {
  const data = {
    _id: REG_ID,
    eventId: EVENT_ID,
    userId: null,
    confirmationCode: 'HR-0EMX4U',
    participationMode: 'onsite',
    raceDistance: '5K',
    status: 'confirmed',
    paymentStatus: 'paid',
    kitSize: 'M',
    kitSizeReleased: '',
    participant: {
      firstName: 'Desk',
      lastName: 'Walkin',
      email: 'desk@example.com',
      mobile: '09171234567',
      emergencyContactName: 'Kin',
      emergencyContactNumber: '09173334444'
    },
    waiver: { accepted: true, version: 1 },
    ...overrides
  };

  return {
    ...data,
    get(key) {
      return data[key];
    },
    set(key, value) {
      data[key] = value;
    },
    toObject() {
      return data;
    }
  };
}

/**
 * A document as Mongoose hands it back from `.select(...)`: the unselected paths are
 * simply absent, and `$__.selected` records the projection that was used.
 */
function buildProjectedDocument(projection, full) {
  const data = { _id: REG_ID };
  for (const key of Object.keys(projection)) {
    data[key] = full.get(key);
  }

  return {
    ...data,
    $__: { selected: projection },
    constructor: {
      findById: async (id) => (String(id) === REG_ID ? full : null)
    },
    get(key) {
      return data[key];
    },
    set(key, value) {
      data[key] = value;
    }
  };
}

/**
 * Capture what the sync would write. Returns the values bound to the `insert into
 * registrations` statement, which is the row the database ends up with.
 */
function captureSql() {
  const calls = [];

  const sql = (strings, ...values) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    calls.push({ text, values });

    if (/insert into registrations/i.test(text)) {
      return Promise.resolve([{ id: 'shadow-uuid' }]);
    }
    // Event and user lookups, and the migration record upsert.
    return Promise.resolve([]);
  };
  sql.unsafe = () => Promise.resolve([]);
  sql.begin = async (fn) => fn(sql);

  return {
    sql,
    registrationInsert() {
      return calls.find((call) => /insert into registrations/i.test(call.text));
    }
  };
}

test('a projected save no longer blanks the columns it never loaded', async () => {
  const full = buildFullDocument();
  // Exactly what race-kit-release.service.js selects.
  const projected = buildProjectedDocument(
    { kitSize: 1, kitSizeReleased: 1, participant: 1 },
    full
  );

  const { sql, registrationInsert } = captureSql();
  await syncRegistrationPaymentShadow(projected, { sql, operation: 'live_sync' });

  const insert = registrationInsert();
  assert.ok(insert, 'the sync must still write the row');

  assert.ok(
    insert.values.includes(EVENT_ID),
    'mongo_event_id must survive a projected save — blanking it is what hid the runner from the roster'
  );
  assert.ok(
    insert.values.includes('HR-0EMX4U'),
    'the confirmation code must survive a projected save'
  );
  assert.ok(
    insert.values.includes('onsite'),
    'participation_mode must not fall back to the schema default'
  );
  assert.ok(insert.values.includes('5K'), 'race_distance must survive a projected save');
});

test('the change the projected save made is still what gets written', async () => {
  // The reload must not discard the very edit that triggered the sync.
  const full = buildFullDocument();
  const projected = buildProjectedDocument(
    { kitSize: 1, kitSizeReleased: 1, participant: 1 },
    full
  );
  projected.set('kitSizeReleased', 'L');

  const { sql } = captureSql();
  await syncRegistrationPaymentShadow(projected, { sql, operation: 'live_sync' });

  assert.equal(
    full.get('kitSizeReleased'),
    'L',
    'the reloaded document should carry the caller\'s change forward'
  );
});

test('a fully-read document is written unchanged, with no reload', async () => {
  const full = buildFullDocument();
  let reloads = 0;
  full.constructor = {
    findById: async () => {
      reloads += 1;
      return full;
    }
  };

  const { sql, registrationInsert } = captureSql();
  await syncRegistrationPaymentShadow(full, { sql, operation: 'live_sync' });

  assert.equal(reloads, 0, 'a complete document must not cost an extra query');
  assert.ok(registrationInsert().values.includes(EVENT_ID));
});

test('a plain object still syncs, so backfills and scripts are unaffected', async () => {
  const plain = {
    _id: REG_ID,
    eventId: EVENT_ID,
    confirmationCode: 'HR-PLAIN1',
    participationMode: 'onsite',
    raceDistance: '10K',
    status: 'confirmed',
    paymentStatus: 'paid',
    participant: { firstName: 'Plain', lastName: 'Object', email: 'p@example.com' },
    waiver: { accepted: true, version: 1 }
  };

  const { sql, registrationInsert } = captureSql();
  await syncRegistrationPaymentShadow(plain, { sql, operation: 'backfill' });

  assert.ok(registrationInsert().values.includes(EVENT_ID));
  assert.ok(registrationInsert().values.includes('HR-PLAIN1'));
});
