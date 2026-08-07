'use strict';

// Foundation for guest registration: letting a registration exist without an account,
// without weakening the guarantee that account registrations still have one.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const Registration = require('../src/models/Registration');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const model = read('src/models/Registration.js');
const indexMigration = read('src/scripts/migrate-guest-registration-index.js');
const sqlMigration = read('src/db/migrations/024_guest_registration_columns.sql');

function buildRegistration(overrides = {}) {
  return new Registration({
    eventId: new mongoose.Types.ObjectId(),
    participant: { firstName: 'Ana', lastName: 'Reyes', email: 'ana@example.com' },
    participationMode: 'onsite',
    raceDistance: '10K',
    confirmationCode: 'HR-ABC123',
    waiver: {
      accepted: true,
      version: 1,
      signature: 'Ana Reyes',
      templateSnapshot: 'waiver text',
      renderedSnapshot: '<p>waiver text</p>'
    },
    ...overrides
  });
}

test('an account registration still requires a user', () => {
  // This is the invariant 46 code paths depend on; relaxing it wholesale would let a
  // missing user slip through silently instead of failing loudly.
  const error = buildRegistration({ userId: null }).validateSync();
  assert.ok(error, 'a registration with no user and no guest marker must not validate');
  assert.ok(error.errors.userId, 'the failure should name userId');
});

test('a registration defaults to being an account registration', () => {
  assert.equal(buildRegistration().participantType, 'account');
});

test('a guest registration validates without a user', () => {
  const error = buildRegistration({ participantType: 'guest', userId: null }).validateSync();
  assert.equal(error, undefined, 'a guest registration should not require a user');
});

test('participantType is an allowlist', () => {
  const error = buildRegistration({ participantType: 'anonymous', userId: null }).validateSync();
  assert.ok(error, 'an unknown participant type must be refused');
});

test('the unique index is partial, so guests do not collide on a null user', () => {
  assert.match(model, /partialFilterExpression: \{ userId: \{ \$type: 'objectId' \} \}/);
  assert.match(model, /unique: true/);
});

test('the new index is explicitly named, so autoIndex cannot conflict on boot', () => {
  // Mongoose derives eventId_1_userId_1 from this key — the same name the old index
  // already uses. Declaring both under one name makes index creation fail at startup.
  assert.match(model, /name: 'eventId_1_userId_1_account_unique'/);
  assert.match(model, /options conflict/);
});

test('the index migration refuses to run before its replacement exists', () => {
  // Dropping first would leave nothing enforcing one registration per account.
  assert.match(indexMigration, /does not exist yet/);
  assert.match(indexMigration, /nothing would/);
  assert.match(indexMigration, /--dry-run/);
});

test('the SQL migration only relaxes constraints, never drops data', () => {
  assert.match(sqlMigration, /ALTER COLUMN runner_user_id DROP NOT NULL/);
  assert.match(sqlMigration, /ALTER COLUMN mongo_user_id  DROP NOT NULL/);
  assert.doesNotMatch(sqlMigration, /DROP TABLE|DROP COLUMN|DELETE FROM/i);
  // A value that is present must still be checked.
  assert.match(sqlMigration, /stay foreign keys/);
});
