const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  ID_NAME_MATCH_STATUSES,
  matchAccountNameInText,
  extractIdNameMatch
} = require('../src/services/id-ocr.service');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

// Representative of noisy Tesseract output from a Philippine ID.
const SAMPLE_ID_TEXT = `
REPUBLIKA NG PILIPINAS
Republic of the Philippines
DRIVER'S LICENSE
Last Name, First Name, Middle Name
DELA CRUZ, JUAN MIGUEL
Nationality PHL  Sex M  Date of Birth 1990-03-15
License No. N01-23-456789  Expiration Date 2027-03-15
`;

test('account name present in OCR text is matched', () => {
  const result = matchAccountNameInText(SAMPLE_ID_TEXT, 'Juan Dela Cruz');
  assert.equal(result.status, 'matched');
  assert.ok(result.detectedName.includes('juan'));
});

test('minor OCR character noise still matches via per-part similarity', () => {
  // "DELA CRU2, JUAN" — one character misread, common Tesseract behavior.
  const noisy = SAMPLE_ID_TEXT.replace('DELA CRUZ, JUAN', 'DELA CRU2, JUAN');
  const result = matchAccountNameInText(noisy, 'Juan Dela Cruz');
  assert.equal(result.status, 'matched');
});

test('a different name on the ID reports not_detected, never mismatched', () => {
  const result = matchAccountNameInText(SAMPLE_ID_TEXT, 'Maria Santos');
  assert.equal(result.status, 'not_detected');
  assert.equal(result.detectedName, '');
});

test('empty OCR text reports not_detected; missing account name is not_checked', () => {
  assert.equal(matchAccountNameInText('', 'Juan Dela Cruz').status, 'not_detected');
  assert.equal(matchAccountNameInText(SAMPLE_ID_TEXT, '').status, 'not_checked');
});

test('extractIdNameMatch uses the injected recognizer and matches', async () => {
  const result = await extractIdNameMatch(
    { buffer: Buffer.from('fake-image'), mimetype: 'image/jpeg', accountName: 'Juan Dela Cruz' },
    { recognize: async () => SAMPLE_ID_TEXT }
  );
  assert.equal(result.status, 'matched');
});

test('OCR engine failure degrades to not_checked instead of throwing', async () => {
  const result = await extractIdNameMatch(
    { buffer: Buffer.from('fake-image'), mimetype: 'image/jpeg', accountName: 'Juan Dela Cruz' },
    { recognize: async () => { throw new Error('tesseract exploded'); } }
  );
  assert.equal(result.status, 'not_checked');
  assert.equal(result.reason, 'ocr_error');
});

test('PDF uploads are not OCR-checked', async () => {
  const result = await extractIdNameMatch(
    { buffer: Buffer.from('%PDF-1.4'), mimetype: 'application/pdf', accountName: 'Juan Dela Cruz' },
    { recognize: async () => { throw new Error('should not be called'); } }
  );
  assert.equal(result.status, 'not_checked');
  assert.equal(result.reason, 'pdf_not_supported');
});

test('slow OCR times out into not_checked', async () => {
  const result = await extractIdNameMatch(
    { buffer: Buffer.from('fake-image'), mimetype: 'image/jpeg', accountName: 'Juan Dela Cruz' },
    { recognize: () => new Promise(() => {}), timeoutMs: 20 }
  );
  assert.equal(result.status, 'not_checked');
});

test('every emitted status is in the declared vocabulary', () => {
  assert.deepEqual(ID_NAME_MATCH_STATUSES, ['matched', 'not_detected', 'not_checked']);
});

test('application submission wires the OCR assist end to end', () => {
  const profile = read('src/routes/organiser/profile.js');
  const model = read('src/models/OrganiserApplication.js');
  const adminView = read('src/views/admin/application-details.ejs');

  assert.match(profile, /extractIdNameMatch/);
  assert.match(profile, /duplicatePhoneCount/);
  // not_detected routes to the under_review triage lane; OCR failure never blocks.
  assert.match(profile, /idNameMatchStatus === 'not_detected' \? 'under_review' : 'pending'/);
  assert.match(model, /idNameMatchStatus/);
  assert.match(model, /idDetectedName/);
  assert.match(model, /duplicatePhoneCount/);
  assert.match(adminView, /ID Name Check \(OCR assist\)/);
  assert.match(adminView, /Duplicate signal/);
});
