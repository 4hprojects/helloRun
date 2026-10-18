'use strict';

// Phase 3 of docs/improvement-plan/ocr-platform-aware — ground truth, consent, dataset
// snapshots and export. DB-free.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const ejs = require('ejs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const { assignSplit, buildDatasetPlan, computeManifestHash, materializeDataset, verifyDatasetIntegrity } = require('../src/services/ocr/dataset.service');
const { computeIneligibleReasons, cropLine, formatNormalizedValue } = require('../src/services/ocr/training-sample.service');
const { buildSettingsUpdate, isValidTimezone } = require('../src/services/ocr/ocr-settings.service');
const { sanitizeTrainingConsent } = require('../src/utils/ocr/activity-evidence');

const THRESHOLDS = { minApprovedSamples: 4, minTestSamples: 1, minValidationSamples: 0, minSamplesPerPlatform: 0, thresholdsApprovedByOwner: true };

function sample(id, group, overrides = {}) {
  return {
    _id: id.padStart(24, '0'),
    activityGroupId: group,
    cropKey: `ocr-training/crops/${id}.png`,
    cropChecksum: crypto.createHash('sha256').update(`crop-${id}`).digest('hex'),
    transcribedText: `5.0${id} km`,
    platform: 'strava',
    layoutId: 'strava/tall-light',
    fieldKey: 'distance',
    ...overrides
  };
}

function findGroupsForEverySplit() {
  const found = {};
  for (let index = 0; index < 500 && Object.keys(found).length < 3; index += 1) {
    const split = assignSplit(`group-${index}`);
    if (!found[split]) found[split] = `group-${index}`;
  }
  return found;
}

test('split assignment is deterministic and per activity group', () => {
  assert.equal(assignSplit('proof-abc'), assignSplit('proof-abc'));
  const counts = { train: 0, validation: 0, test: 0 };
  for (let index = 0; index < 2000; index += 1) counts[assignSplit(`g${index}`)] += 1;
  assert.ok(counts.train > 1450 && counts.train < 1750, JSON.stringify(counts));
  assert.ok(counts.validation > 120 && counts.validation < 290, JSON.stringify(counts));
  assert.ok(counts.test > 120 && counts.test < 290, JSON.stringify(counts));
});

test('lines from one screenshot never cross splits, duplicates are dropped, and the hash is stable', () => {
  const groups = findGroupsForEverySplit();
  const rows = [
    sample('1', groups.train), sample('2', groups.train, { fieldKey: 'time' }),
    sample('3', groups.test), sample('4', groups.validation),
    sample('5', groups.train, { cropChecksum: sample('1', 'x').cropChecksum })
  ];
  const plan = buildDatasetPlan(rows, THRESHOLDS);
  assert.equal(plan.counts.total, 4);
  assert.deepEqual(plan.duplicates, [rows[4]._id]);
  assert.deepEqual(plan.leakingGroups, []);
  const bySample = new Map(plan.manifest.map((entry) => [entry.sampleId, entry.split]));
  assert.equal(bySample.get(rows[0]._id), bySample.get(rows[1]._id));
  assert.equal(plan.validationStatus, 'ready');
  const reordered = buildDatasetPlan(rows.slice().reverse(), THRESHOLDS);
  assert.equal(reordered.manifestHash, plan.manifestHash, 'input order does not change the snapshot');
  const edited = buildDatasetPlan(rows.map((row) => (row._id === rows[0]._id ? { ...row, transcribedText: '5.01 km.' } : row)), THRESHOLDS);
  assert.notEqual(edited.manifestHash, plan.manifestHash, 'any transcription change is a new version');
});

test('readiness fails closed until thresholds are met and owner-approved', () => {
  const groups = findGroupsForEverySplit();
  const rows = [sample('1', groups.train), sample('2', groups.test), sample('3', groups.train), sample('4', groups.validation)];
  const unapproved = buildDatasetPlan(rows, { ...THRESHOLDS, thresholdsApprovedByOwner: false });
  assert.equal(unapproved.validationStatus, 'not_ready');
  assert.ok(unapproved.notReadyReasons.some((reason) => reason.startsWith('thresholds_approved_by_owner')));
  const tooFew = buildDatasetPlan(rows.slice(0, 2), THRESHOLDS);
  assert.ok(tooFew.notReadyReasons.some((reason) => reason.startsWith('min_approved_samples')));
  const empty = buildDatasetPlan([], THRESHOLDS);
  assert.equal(empty.validationStatus, 'not_ready');
  assert.equal(empty.counts.total, 0);
});

test('eligibility requires approval, consent, literal text, alignment, a crop and unexpired retention', () => {
  const ok = { status: 'approved', consentBasis: 'participant_opt_in', transcribedText: '5.02 km', alignmentConfirmed: true, cropDeletedAt: null, retentionExpiry: new Date(Date.now() + 60_000) };
  assert.deepEqual(computeIneligibleReasons(ok), []);
  assert.deepEqual(computeIneligibleReasons({ ...ok, status: 'pending' }), ['not_approved']);
  assert.deepEqual(computeIneligibleReasons({ ...ok, consentBasis: '' }), ['no_consent_basis']);
  assert.deepEqual(computeIneligibleReasons({ ...ok, transcribedText: '  ' }), ['empty_transcription']);
  assert.deepEqual(computeIneligibleReasons({ ...ok, alignmentConfirmed: false }), ['alignment_not_confirmed']);
  assert.deepEqual(computeIneligibleReasons({ ...ok, cropDeletedAt: new Date() }), ['crop_deleted']);
  assert.deepEqual(computeIneligibleReasons({ ...ok, retentionExpiry: new Date(Date.now() - 1) }), ['retention_expired']);
});

test('line crops are padded, clamped to the image, and refuse degenerate boxes', async () => {
  const image = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#fff' } }).png().toBuffer();
  const { crop, box } = await cropLine(image, { left: 2, top: 2, width: 50, height: 20 });
  assert.equal(box.left, 0);
  assert.equal(box.top, 0);
  const meta = await sharp(crop).metadata();
  assert.equal(meta.width, 58);
  const edge = await cropLine(image, { left: 190, top: 90, width: 30, height: 30 });
  assert.equal(edge.box.left + edge.box.width, 200);
  await assert.rejects(cropLine(image, { left: 300, top: 300, width: 5, height: 5 }), { code: 'crop_too_small' });
  assert.equal(formatNormalizedValue('time', { totalMs: 1_710_000 }), '0:28:30');
  assert.equal(formatNormalizedValue('distance', { valueKm: 5 }), '5.00 km');
});

test('export writes tesstrain pairs, holds the test split apart and verifies every crop', async () => {
  const groups = findGroupsForEverySplit();
  const crops = new Map();
  const rows = ['1', '2', '3'].map((id, index) => {
    const buffer = Buffer.from(`png-bytes-${id}`);
    const key = `ocr-training/crops/${id}.png`;
    crops.set(key, buffer);
    return sample(id, [groups.train, groups.validation, groups.test][index], { cropKey: key, cropChecksum: crypto.createHash('sha256').update(buffer).digest('hex') });
  });
  const plan = buildDatasetPlan(rows, { ...THRESHOLDS, minApprovedSamples: 1 });
  const dataset = { _id: 'd1', name: 'unit', manifestHash: plan.manifestHash, splitRule: 'group-sha256-v1', counts: plan.counts, manifest: plan.manifest };
  assert.equal(verifyDatasetIntegrity(dataset), true);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-export-'));
  try {
    const result = await materializeDataset(dataset, out, { readObject: async (key) => crops.get(key) });
    assert.deepEqual(result.written, { train: 1, validation: 1, test: 1 });
    const gtFiles = fs.readdirSync(result.groundTruthDir).sort();
    assert.equal(gtFiles.filter((file) => file.endsWith('.gt.txt')).length, 2);
    assert.equal(gtFiles.filter((file) => file.endsWith('.png')).length, 2);
    const testFiles = fs.readdirSync(result.testDir);
    assert.equal(testFiles.length, 2);
    const gt = testFiles.find((file) => file.endsWith('.gt.txt'));
    assert.equal(fs.readFileSync(path.join(result.testDir, gt), 'utf8'), `${rows[2].transcribedText}\n`);
    await assert.rejects(
      materializeDataset(dataset, path.join(out, 'again'), { readObject: async () => Buffer.from('tampered') }),
      { code: 'checksum_mismatch' }
    );
    assert.equal(verifyDatasetIntegrity({ ...dataset, manifest: dataset.manifest.map((entry, index) => (index ? entry : { ...entry, transcribedText: 'x' })) }), false);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('consent is recorded only when the prompt was shown, and never defaults to granted', () => {
  assert.deepEqual(sanitizeTrainingConsent(undefined), {});
  assert.equal(sanitizeTrainingConsent({ granted: 'yes' }).ocrTrainingConsent.granted, false);
  const granted = sanitizeTrainingConsent({ granted: true, noticeVersion: '2026-10-v1' });
  assert.equal(granted.ocrTrainingConsent.granted, true);
  assert.equal(granted.ocrTrainingConsent.noticeVersion, '2026-10-v1');
  assert.equal(granted.ocrTrainingConsent.withdrawnAt, null);
});

test('settings updates are validated and partial', () => {
  const ok = buildSettingsUpdate({ 'dataset.minTestSamples': '12', 'notifications.timezone': 'Asia/Manila', 'notifications.dayOfWeek': '1', 'notifications.hour': '8', 'notifications.frequency': 'weekly' });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.set['dataset.minTestSamples'], 12);
  assert.equal(ok.set['notifications.hour'], 8);
  const bad = buildSettingsUpdate({ 'dataset.minTestSamples': '0', 'notifications.timezone': 'Mars/Olympus', 'notifications.hour': '24', 'notifications.frequency': 'daily' });
  assert.equal(bad.errors.length, 4);
  assert.equal(isValidTimezone('America/New_York'), true);
  const cleared = buildSettingsUpdate({ 'notifications.dayOfWeek': '' });
  assert.equal(cleared.set['notifications.dayOfWeek'], null);
});

test('reviewer activity corrections never write training ground truth', () => {
  for (const file of ['src/services/submission-correction.service.js', 'src/services/submission.service.js', 'src/routes/organiser/registrant-submissions.js']) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotMatch(source, /TrainingSample|training-sample\.service/, file);
  }
});

test('samples page renders review controls, escapes OCR text and keeps CSRF', () => {
  const file = path.join(ROOT, 'src/views/admin/ocr-training/samples.ejs');
  const source = fs.readFileSync(file, 'utf8').replace(/<%-\s*include\('\.\.\/\.\.\/layouts\/[^%]+%>/g, '');
  const html = ejs.render(source, {
    title: 't', section: 'samples', message: null, flags: [], formatDateTime: String, csrfToken: 'tok',
    filters: { status: 'pending', platform: '', fieldKey: '', eligibility: '' },
    counts: { pending: 1, approved: 0, eligible: 0, excluded: 0 },
    page: { items: [{ _id: 'a'.repeat(24), __v: 3, fieldKey: 'distance', platform: 'strava', status: 'pending', eligibility: 'ineligible', ineligibleReasons: ['not_approved'], cropUrl: 'https://r2.example/x.png', ocrText: '<b>5.02 km</b>', normalizedValue: '5.02 km', consentBasis: 'participant_opt_in', cropWidth: 100, cropHeight: 20 }], page: 1, pages: 1 },
    datasets: [], consentBases: []
  }, { filename: file });
  assert.match(html, /name="version" value="3"/);
  assert.match(html, /exactly the text visible in the crop/);
  assert.match(html, /name="_csrf" value="tok"/);
  assert.doesNotMatch(html, /<b>5\.02 km<\/b>/);
  assert.match(html, /Add your own screenshot/);
});

test('Phase 3 routes sit behind the admin router; runner withdrawal is CSRF-protected and owner-scoped', () => {
  const routes = fs.readFileSync(path.join(ROOT, 'src/routes/admin-ocr-training.routes.js'), 'utf8');
  assert.match(routes, /'\/samples\/upload', ocrTestLimiter, uploadService\.uploadOcrTestImage, requireCsrfProtection/);
  assert.match(routes, /'\/samples\/:sampleId\/review', ocrMutationLimiter/);
  const runnerRoutes = fs.readFileSync(path.join(ROOT, 'src/routes/runner.routes.js'), 'utf8');
  assert.match(runnerRoutes, /ocr-training-consent\/withdraw', requireAuth/);
  const withdraw = fs.readFileSync(path.join(ROOT, 'src/controllers/runner-ocr-consent.controller.js'), 'utf8');
  assert.match(withdraw, /runnerId, 'ocrTrainingConsent\.granted': true/);
  const modal = fs.readFileSync(path.join(ROOT, 'src/views/partials/run-proof-modal.ejs'), 'utf8');
  assert.match(modal, /locals\.ocrTrainingConsentPromptEnabled/);
  assert.doesNotMatch(modal, /name="ocrTrainingConsent" value="1" checked/);
});
