'use strict';

// Notice + objection training basis (owner decision 2026-10-18): eligibility rule, legal
// gates, objection controls and backfill surfaces. DB-free.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const { isEntryUsableForTraining, isKnownMinor } = require('../src/services/ocr/training-sample.service');
const { validateTrainingBasis, buildSettingsUpdate } = require('../src/services/ocr/ocr-settings.service');
const { checkGates, manilaDateKey } = require('../src/services/ocr/ocr-backfill.service');

const NOW = new Date('2026-12-01T00:00:00Z');
const notice = { training: { basis: 'notice_opt_out', noticePublishedAt: new Date('2026-10-20T00:00:00Z'), noticePolicyVersion: '1.6', noticePrivacyPolicyVersion: '1.6', noticeDataUsagePolicyVersion: '1.2', legitimateInterestAssessmentVersion: 'OCR-LIA-1', legalReviewApprovedAt: new Date('2026-10-19T00:00:00Z'), legalReviewReference: 'COUNSEL-2026-10', backfillNotBefore: new Date('2026-11-19T00:00:00Z') } };
const optIn = { training: { basis: 'opt_in' } };
const runner = { _id: 'r1', accountStatus: 'active', dateOfBirth: new Date('1990-01-01'), ocrTrainingOptOut: { optedOut: false } };
const entry = (overrides = {}) => ({ runnerId: 'r1', status: 'approved', proof: { key: 'k', mimeType: 'image/webp' }, ...overrides });

test('accepted and rejected entries are treated the same', () => {
  for (const status of ['approved', 'rejected', 'submitted']) {
    assert.deepEqual(isEntryUsableForTraining(entry({ status }), runner, notice, NOW), { usable: true, consentBasis: 'notice_legitimate_interest', reason: '' });
  }
});

test('eligibility truth table', () => {
  const cases = [
    ['opt-in basis, no tick', entry(), runner, optIn, false, 'no_basis'],
    ['opt-in basis, ticked', entry({ ocrTrainingConsent: { granted: true } }), runner, optIn, true, ''],
    ['notice not yet published', entry(), runner, { training: { ...notice.training, noticePublishedAt: new Date('2027-01-01') } }, false, 'no_basis'],
    ['runner objected', entry(), { ...runner, ocrTrainingOptOut: { optedOut: true } }, notice, false, 'runner_objected'],
    ['objection beats an earlier tick', entry({ ocrTrainingConsent: { granted: true } }), { ...runner, ocrTrainingOptOut: { optedOut: true } }, notice, false, 'runner_objected'],
    ['known minor', entry(), { ...runner, dateOfBirth: new Date('2010-06-01') }, notice, false, 'known_minor'],
    ['unknown birth date', entry(), { ...runner, dateOfBirth: null }, notice, true, ''],
    ['closed account', entry(), { ...runner, accountStatus: 'closed' }, notice, false, 'account_inactive'],
    ['suspended account', entry(), { ...runner, accountStatus: 'suspended' }, notice, false, 'account_inactive'],
    ['guest entry', entry({ runnerId: null }), null, notice, false, 'no_runner_account'],
    ['runner missing', entry(), null, notice, false, 'no_runner_account'],
    ['entry withdrawn', entry({ ocrTrainingConsent: { granted: false, withdrawnAt: new Date() } }), runner, notice, false, 'entry_withdrawn'],
    ['pdf proof', entry({ proof: { key: 'k', mimeType: 'application/pdf' } }), runner, notice, false, 'not_an_image'],
    ['no proof', entry({ proof: {} }), runner, notice, false, 'no_proof']
  ];
  for (const [name, item, who, settings, usable, reason] of cases) {
    const verdict = isEntryUsableForTraining(item, who, settings, NOW);
    assert.equal(verdict.usable, usable, name);
    assert.equal(verdict.reason, reason, name);
  }
  assert.equal(isEntryUsableForTraining(entry({ ocrTrainingConsent: { granted: true } }), runner, notice, NOW).consentBasis, 'participant_opt_in');
});

test('minor detection turns adult on the 18th birthday', () => {
  assert.equal(isKnownMinor(new Date('2008-12-02T00:00:00Z'), NOW), true);
  assert.equal(isKnownMinor(new Date('2008-11-30T00:00:00Z'), NOW), false);
  assert.equal(isKnownMinor(null, NOW), false);
  assert.equal(isKnownMinor('not a date', NOW), false);
});

test('switching to the notice basis needs a published notice and holds a 30-day objection period', () => {
  const missing = validateTrainingBasis({ 'training.basis': 'notice_opt_out' }, {}, NOW);
  assert.equal(missing.errors.length, 6);
  const future = validateTrainingBasis({
    'training.basis': 'notice_opt_out',
    'training.noticePublishedAt': new Date('2027-01-01'),
    'training.noticePrivacyPolicyVersion': '1.6',
    'training.noticeDataUsagePolicyVersion': '1.2',
    'training.legitimateInterestAssessmentVersion': 'OCR-LIA-1',
    'training.legalReviewApprovedAt': new Date('2027-01-01'),
    'training.legalReviewReference': 'COUNSEL-1'
  }, {}, NOW);
  assert.match(future.errors.join(' '), /cannot be in the future/);
  const set = {
    'training.basis': 'notice_opt_out',
    'training.noticePublishedAt': new Date('2026-11-25T00:00:00Z'),
    'training.noticePrivacyPolicyVersion': '1.6',
    'training.noticeDataUsagePolicyVersion': '1.2',
    'training.legitimateInterestAssessmentVersion': 'OCR-LIA-1',
    'training.legalReviewApprovedAt': new Date('2026-11-20T00:00:00Z'),
    'training.legalReviewReference': 'COUNSEL-1',
    'training.backfillNotBefore': new Date('2026-11-26T00:00:00Z')
  };
  const ok = validateTrainingBasis(set, {}, NOW);
  assert.deepEqual(ok.errors, []);
  assert.equal(set['training.backfillNotBefore'].toISOString(), '2026-12-25T00:00:00.000Z', 'pushed to notice + 30 days');
  assert.deepEqual(validateTrainingBasis({ 'training.basis': 'opt_in' }, {}, NOW).errors, []);
  const parsed = buildSettingsUpdate({ 'training.basis': 'anything' });
  assert.match(parsed.errors.join(' '), /valid training basis/);
  assert.equal(buildSettingsUpdate({ 'training.noticePublishedAt': '2026-10-20' }).set['training.noticePublishedAt'].toISOString(), '2026-10-19T16:00:00.000Z');
});

test('backfill gates fail closed', () => {
  const previous = process.env.OCR_SERVER_PIPELINE_ENABLED;
  try {
    process.env.OCR_SERVER_PIPELINE_ENABLED = 'true';
    assert.match(checkGates(optIn, NOW), /not "notice and objection"/);
    assert.match(checkGates({ training: { ...notice.training, noticePrivacyPolicyVersion: '' } }, NOW), /both policy versions/);
    assert.match(checkGates({ training: { ...notice.training, legalReviewReference: '' } }, NOW), /legal approval date/);
    assert.match(checkGates({ training: { ...notice.training, backfillNotBefore: new Date('2027-01-01') } }, NOW), /objection period has not ended/);
    assert.equal(checkGates(notice, NOW), '');
    delete process.env.OCR_SERVER_PIPELINE_ENABLED;
    assert.match(checkGates(notice, NOW), /OCR_SERVER_PIPELINE_ENABLED/);
  } finally {
    if (previous === undefined) delete process.env.OCR_SERVER_PIPELINE_ENABLED;
    else process.env.OCR_SERVER_PIPELINE_ENABLED = previous;
  }
  assert.equal(manilaDateKey(new Date('2026-12-01T17:00:00Z')), '2026-12-02');
});

test('backfill and basis changes need the full tier; objection route is CSRF-protected', () => {
  const routes = fs.readFileSync(path.join(ROOT, 'src/routes/admin-ocr-training.routes.js'), 'utf8');
  for (const pathname of ["'/backfill/plan'", "'/backfill'", "'/backfill/:runId/pause'", "'/backfill/:runId/resume'", "'/backfill/:runId/cancel'"]) {
    assert.match(routes, new RegExp(`router\\.post\\(${pathname.replace(/[/:]/g, (c) => `\\${c}`)}, requireFullAdmin`), pathname);
  }
  const insights = fs.readFileSync(path.join(ROOT, 'src/controllers/admin/ocr-training-insights.controller.js'), 'utf8');
  assert.match(insights, /'CHANGE BASIS'/);
  assert.match(insights, /validateTrainingBasis\(set, before\)/);
  const runnerRoutes = fs.readFileSync(path.join(ROOT, 'src/routes/runner.routes.js'), 'utf8');
  assert.match(runnerRoutes, /'\/runner\/profile\/ocr-training', requireAuth, profileUpdateLimiter/);
});

test('the run-proof modal shows a notice under the notice basis and the opt-in box otherwise', () => {
  const modal = fs.readFileSync(path.join(ROOT, 'src/views/partials/run-proof-modal.ejs'), 'utf8');
  assert.match(modal, /locals\.ocrTrainingBasis === 'notice_opt_out'/);
  assert.match(modal, /You can object any time in your <a href="\/runner\/profile#ocr-training">profile<\/a>/);
  assert.ok(modal.indexOf("ocrTrainingBasis === 'notice_opt_out'") < modal.indexOf('name="ocrTrainingConsent"'));
});

test('profile shows the objection control in both states', () => {
  const file = path.join(ROOT, 'src/views/runner/partials/profile-main.ejs');
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf('<article class="runner-profile-card" id="ocr-training"');
  const card = source.slice(start, source.indexOf('</article>', start) + '</article>'.length);
  const allowed = ejs.render(card, { ocrTrainingOptedOut: false, _csrfToken: 'tok' });
  assert.match(allowed, /Don’t use my screenshots/);
  assert.match(allowed, /name="optedOut" value="1"/);
  const objected = ejs.render(card, { ocrTrainingOptedOut: true, _csrfToken: 'tok' });
  assert.match(objected, /Allow use again/);
  assert.match(objected, /None of your screenshots, past or future/);
});

test('jobs page shows backfill gate, plan and controls only to full admins', () => {
  const file = path.join(ROOT, 'src/views/admin/ocr-training/jobs.ejs');
  const source = fs.readFileSync(file, 'utf8').replace(/<%-\s*include\('\.\.\/\.\.\/layouts\/[^%]+%>/g, '');
  const common = {
    title: 't', section: 'jobs', message: null, flags: [], formatDateTime: String, csrfToken: 'tok',
    worker: { online: false, preflightPassed: false, row: null }, datasets: [], readyDatasets: [], jobs: [], active: null, trainingEnabled: false, idempotencyKey: 'k'.repeat(24),
    backfillRuns: [{ _id: 'b'.repeat(24), createdAt: new Date(), status: 'running', counts: { scanned: 10, queued: 4, reused: 2, candidates: 5, excluded: { runner_objected: 3, known_minor: 1 } }, today: { processed: 6 }, dailyCap: 500 }],
    backfillPlan: { plannedAt: new Date().toISOString(), total: 20, usable: 12, alreadySampled: 2, byStatus: { approved: 8, rejected: 4 }, excluded: { runner_objected: 6 } },
    backfillGate: 'The objection period has not ended.', trainingBasis: 'notice_opt_out'
  };
  const full = ejs.render(source, { ...common, canDeploy: true }, { filename: file });
  assert.match(full, /Not startable yet: The objection period has not ended/);
  assert.match(full, /<strong>12<\/strong> of 20 entries would be used/);
  assert.match(full, /approved 8, rejected 4/);
  assert.match(full, /backfill\/b{24}\/pause/);
  assert.match(full, /6 \/ 500/);
  const support = ejs.render(source, { ...common, canDeploy: false }, { filename: file });
  assert.doesNotMatch(support, /START BACKFILL/);
  assert.match(support, /A full administrator runs the backfill/);
});
