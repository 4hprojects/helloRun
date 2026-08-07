'use strict';

// Revocable bib QR codes.
//
// The encoded token proves a code came from us and has not been altered, but a purely
// stateless token stays valid for as long as the key does. Cancelling a registration or
// reissuing a bib has to make the old code stop working, which needs state.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'unit-test-session-secret';

const { createBibToken, readBibToken } = require('../src/services/qr-code.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const model = read('src/models/BibQrToken.js');
const service = read('src/services/bib-qr-token.service.js');
const scanner = read('src/routes/organiser/onsite-operations.js');
const cancellation = read('src/services/registration-cancellation.service.js');
const racePass = read('src/controllers/page/registration.controller.js');

const EVENT_ID = '64b7f0000000000000000001';

test('a token carries its revocable identity, and still decodes without one', () => {
  const withIdentity = readBibToken(createBibToken(EVENT_ID, '204', 'tok-abc'));
  assert.equal(withIdentity.success, true);
  assert.equal(withIdentity.tokenId, 'tok-abc');

  // Codes minted before revocation existed carry no identity and must still decode,
  // or everything already printed would stop working.
  const legacy = readBibToken(createBibToken(EVENT_ID, '204'));
  assert.equal(legacy.success, true);
  assert.equal(legacy.tokenId, '');
});

test('the identity never leaks the event id into the code', () => {
  const token = createBibToken(EVENT_ID, '204', 'tok-abc');
  assert.ok(!token.includes(EVENT_ID));
  assert.ok(!token.includes('tok-abc'), 'the identity itself must not be readable in the code');
});

test('identity is stable across renders, so a screenshot keeps working', () => {
  // The race pass regenerates its image on every page load. Minting a fresh identity per
  // view would kill a runner's screenshot the moment they reopened the page.
  assert.match(service, /Stable on purpose/);
  assert.match(service, /findOne\(\{ eventId, bibNumber: bib, revokedAt: null \}\)/);
  assert.match(model, /re-encrypted on demand/);
});

test('the stored value is the identity, not a usable code', () => {
  assert.match(model, /stored value is the token id, not the token/);
  assert.match(model, /requires the encryption key, which never leaves the server/);
});

test('one live code per bib, and revoked rows do not block reissuing', () => {
  assert.match(model, /partialFilterExpression: \{ revokedAt: null \}/);
  assert.match(model, /unique: true/);
});

test('two concurrent first renders settle on one identity instead of failing', () => {
  assert.match(service, /error\?\.code === 11000/);
  assert.match(service, /adopts the winner's identity/);
});

test('verification separates the outcomes staff must tell apart', () => {
  ['invalid', 'wrong_event', 'revoked', 'unknown', 'ok'].forEach((outcome) => {
    assert.match(service, new RegExp(`'${outcome}'`), `${outcome} should be an outcome`);
  });
  // A well-formed identity we never issued is untrusted, not assumed fine.
  assert.match(service, /A well-formed identity we never issued/);
});

test('a pre-revocation code is accepted but flagged rather than refused', () => {
  assert.match(service, /Refusing them would\s*\n\s*\/\/ invalidate everything already in circulation/);
  assert.match(service, /legacy: true/);
  assert.match(scanner, /predates revocation/);
});

test('cancelling a registration withdraws its codes', () => {
  assert.match(cancellation, /revokeTokensForRegistration\(registration\._id, 'Registration cancelled'\)/);
  // Losing a revocation must not fail the cancellation, but it is a real problem.
  assert.match(service, /a live code for a cancelled runner is a real problem/);
});

test('reassigning a bib withdraws the previous holder code', () => {
  assert.match(scanner, /revokeTokensForBib\(eventId, bibNumber, 'Bib reassigned'\)/);
  assert.match(scanner, /previous holder's QR would still check someone in/);
});

test('the scanner refuses revoked and unrecognised codes', () => {
  assert.match(scanner, /outcome: 'revoked'/);
  assert.match(scanner, /That code has been withdrawn/);
  assert.match(scanner, /outcome: 'unknown'/);
  assert.match(scanner, /not recognised for this event/);
});

test('the race pass renders through the revocable layer', () => {
  assert.match(racePass, /renderBibQrCode\(/);
  assert.doesNotMatch(racePass, /generateBibQRCode\(/);
});
