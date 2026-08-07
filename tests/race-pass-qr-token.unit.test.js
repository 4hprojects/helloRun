'use strict';

// The bib QR token and the runner-facing race pass.
//
// The previous QR payload was `EVENT:{mongoId}|BIB:{n}|TIME:{ts}` in plaintext: anyone who
// photographed a bib learned a live database id, and nothing stopped them editing it into
// someone else's bib. The token below is encrypted and authenticated instead.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'unit-test-session-secret';

const {
  createBibToken,
  readBibToken,
  resolveScannedQr,
  decodeQRData
} = require('../src/services/qr-code.service');
const {
  encryptForPurpose,
  decryptForPurpose,
  deriveKeyForPurpose
} = require('../src/services/token-encryption.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const racePassView = read('src/views/pages/race-pass.ejs');
const cardView = read('src/views/partials/my-registration-card.ejs');

const EVENT_ID = '64b7f0000000000000000001';

test('a bib token round-trips without carrying the event id in the clear', () => {
  const token = createBibToken(EVENT_ID, '204');

  assert.ok(!token.includes(EVENT_ID), 'the raw event id must not appear in the token');
  assert.ok(!token.includes('EVENT:'), 'the legacy plaintext shape must be gone');

  const decoded = readBibToken(token);
  assert.equal(decoded.success, true);
  assert.equal(decoded.eventId, EVENT_ID);
  assert.equal(decoded.bibNumber, '204');
  assert.equal(decoded.format, 'token');
});

test('a tampered token is refused', () => {
  const token = createBibToken(EVENT_ID, '204');
  const tampered = `${token.slice(0, -4)}AAAA`;
  assert.equal(readBibToken(tampered).success, false);

  // Truncation and prefix stripping must fail too.
  assert.equal(readBibToken(token.slice(0, 20)).success, false);
  assert.equal(readBibToken(token.replace('HRQ1:', '')).success, false);
  ['', null, undefined, 'HRQ1:not-a-token'].forEach((value) => {
    assert.equal(readBibToken(value).success, false, `${JSON.stringify(value)} should not read`);
  });
});

test('keys are separated by purpose, so a token cannot cross uses', () => {
  const secret = 'shared-secret';
  const forA = deriveKeyForPurpose(secret, 'purpose.a');
  const forB = deriveKeyForPurpose(secret, 'purpose.b');
  assert.notEqual(forA.toString('hex'), forB.toString('hex'));

  const minted = encryptForPurpose('payload', { secret, purpose: 'purpose.a' });
  assert.throws(() => decryptForPurpose(minted, { secret, purpose: 'purpose.b' }));
  assert.equal(decryptForPurpose(minted, { secret, purpose: 'purpose.a' }), 'payload');
});

test('deriving a key requires both a secret and a purpose', () => {
  assert.throws(() => deriveKeyForPurpose('', 'purpose'), /secret is not configured/);
  assert.throws(() => deriveKeyForPurpose('secret', ''), /purpose is required/);
});

test('scanning accepts both formats and labels which one it saw', () => {
  const token = createBibToken(EVENT_ID, '204');
  assert.equal(resolveScannedQr(token).format, 'token');

  // Codes printed before the token format are still in circulation.
  const legacy = resolveScannedQr('EVENT:abc123|BIB:9|TIME:1000');
  assert.equal(legacy.success, true);
  assert.equal(legacy.format, 'legacy');
  assert.equal(legacy.bibNumber, '9');

  assert.equal(resolveScannedQr('nonsense').success, false);
  assert.equal(resolveScannedQr('').success, false);
});

test('the legacy decoder is untouched for already-printed codes', () => {
  const decoded = decodeQRData('EVENT:abc123|BIB:204|TIME:1000');
  assert.equal(decoded.success, true);
  assert.equal(decoded.eventId, 'abc123');
});

test('the race pass renders a bib, a pending state, and a QR failure state', () => {
  const file = path.join(ROOT, 'src/views/pages/race-pass.ejs');
  const base = {
    title: 'Race pass',
    registration: {
      confirmationCode: 'HR-ABC123',
      raceDistance: '10K',
      paymentStatus: 'paid',
      participant: { firstName: 'Ana', lastName: 'Reyes' }
    },
    event: { title: 'Test Run', venueName: 'Rizal Park' }
  };

  assert.doesNotThrow(() => ejs.compile(racePassView, { filename: file }));

  const withBib = ejs.render(racePassView, { ...base, onsite: { bibNumber: '204', isCheckedIn: false }, qrDataUrl: 'data:image/png;base64,AAA' }, { filename: file });
  assert.match(withBib, />204</);
  assert.match(withBib, /Not checked in yet/);

  const pending = ejs.render(racePassView, { ...base, onsite: null, qrDataUrl: '' }, { filename: file });
  assert.match(pending, /Not assigned yet/);

  // A QR that could not be generated must still leave a usable pass.
  const qrFailed = ejs.render(racePassView, { ...base, onsite: { bibNumber: '204', isCheckedIn: true }, qrDataUrl: '' }, { filename: file });
  assert.match(qrFailed, /could not be generated/);
  assert.match(qrFailed, /Checked in/);
});

test('scanning covers the outcomes staff actually hit', () => {
  const routes = read('src/routes/organiser/onsite-operations.js');
  ['invalid', 'wrong_event', 'unknown_bib', 'cancelled', 'already_checked_in', 'checked_in'].forEach(
    (outcome) => {
      assert.match(routes, new RegExp(`'${outcome}'`), `${outcome} should be a scan outcome`);
    }
  );
  // Payment is a warning, not a refusal — many events settle at the desk.
  assert.match(routes, /warnings\.push\(`Payment is/);
  assert.match(routes, /findRegistrationByExactBib/);
});

test('the scanner degrades to manual entry where the browser cannot scan', () => {
  const script = read('src/public/js/organizer-check-in-scan.js');
  assert.match(script, /typeof window\.BarcodeDetector === 'function'/);
  assert.match(script, /manual\.hidden = false/);
  // Both paths post to the same endpoint so they cannot behave differently.
  assert.match(script, /check-in\/scan/);
  assert.match(script, /'x-csrf-token': csrfToken/);
  // A code sits in frame for many frames; the same bib must not post repeatedly.
  assert.match(script, /now - lastScannedAt < 4000/);
  // The camera must be released, or it keeps running after the page goes away.
  assert.match(script, /getTracks\(\)\.forEach/);
  assert.match(script, /pagehide/);
});

test('the race-pass link appears only on onsite registrations', () => {
  assert.match(cardView, /registration\.participationMode === 'onsite'/);
  assert.match(cardView, /\/race-pass/);
  assert.doesNotMatch(racePassView, /<%-\s*registration/);
});
