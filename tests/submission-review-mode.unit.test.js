'use strict';

// DB-free tests for the per-event submission review mode: "system" (default; entries that
// pass HelloRun's checks are auto-approved) or "manual" (the organizer reviews everything).
//
// The default must reproduce today's behaviour exactly, and manual must reach every place an
// entry could otherwise be approved without a person: OCR proofs, Strava syncs and
// accumulated activities.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const mode = require('../src/utils/submission-review-mode');
const Event = require('../src/models/Event');
const eventForm = require('../src/services/event-form.service');

test('unknown, missing and mixed-case values normalize safely, defaulting to system validation', () => {
  assert.equal(mode.DEFAULT_SUBMISSION_REVIEW_MODE, 'system');
  for (const value of [undefined, null, '', 'weird', 'AUTO', 0, {}]) {
    assert.equal(mode.normalizeSubmissionReviewMode(value), 'system', JSON.stringify(value));
  }
  assert.equal(mode.normalizeSubmissionReviewMode('manual'), 'manual');
  assert.equal(mode.normalizeSubmissionReviewMode('  MANUAL '), 'manual');
  assert.equal(mode.normalizeSubmissionReviewMode('system'), 'system');
});

test('only an explicit manual setting counts as organizer review; legacy events are not manual', () => {
  assert.equal(mode.isManualSubmissionReview({ submissionReviewMode: 'manual' }), true);
  assert.equal(mode.isManualSubmissionReview({ submissionReviewMode: 'system' }), false);
  assert.equal(mode.isManualSubmissionReview({}), false);
  assert.equal(mode.isManualSubmissionReview(null), false);
  assert.equal(mode.isManualSubmissionReview(undefined), false);
});

test('the two options are defined once, with the system option recommended', () => {
  assert.deepEqual(mode.SUBMISSION_REVIEW_MODE_OPTIONS.map((o) => o.value), ['system', 'manual']);
  assert.equal(mode.SUBMISSION_REVIEW_MODE_OPTIONS[0].badge, 'Recommended');
  assert.match(mode.SUBMISSION_REVIEW_MODE_OPTIONS[1].description, /including Strava syncs/i);
  assert.equal(mode.getSubmissionReviewModeLabel('manual'), 'Organizer reviews all');
  assert.equal(mode.getSubmissionReviewModeLabel(undefined), 'System validation');
});

test('the Event model stores the mode, restricted to the two values, defaulting to system', () => {
  const field = Event.schema.path('submissionReviewMode');
  assert.equal(field.options.default, 'system');
  assert.deepEqual(field.options.enum, ['system', 'manual']);
  assert.equal(new Event({}).submissionReviewMode, 'system');
});

test('form data: default create, posted values, junk and the edit fallback', () => {
  assert.equal(eventForm.getCreateEventFormData().submissionReviewMode, 'system');
  assert.equal(eventForm.getCreateEventFormData({ title: 'x', submissionReviewMode: 'manual' }).submissionReviewMode, 'manual');
  assert.equal(eventForm.getCreateEventFormData({ title: 'x', submissionReviewMode: 'weird' }).submissionReviewMode, 'system');
});

test('an edit that does not post the field keeps the saved mode instead of silently resetting it', () => {
  const edit = (body, existingEvent) => eventForm.getCreateEventFormData(body, { existingEvent }).submissionReviewMode;
  assert.equal(edit({ title: 'x' }, { submissionReviewMode: 'manual' }), 'manual');
  assert.equal(edit({ title: 'x' }, {}), 'system');
  // An explicit choice always wins over the saved value, in both directions.
  assert.equal(edit({ title: 'x', submissionReviewMode: 'system' }, { submissionReviewMode: 'manual' }), 'system');
  assert.equal(edit({ title: 'x', submissionReviewMode: 'manual' }, { submissionReviewMode: 'system' }), 'manual');
});

test('the saved mode round-trips through the edit form and back onto the event', () => {
  assert.equal(eventForm.getCreateEventFormDataFromEvent({ submissionReviewMode: 'manual' }).submissionReviewMode, 'manual');
  assert.equal(eventForm.getCreateEventFormDataFromEvent({}).submissionReviewMode, 'system');

  const source = read('src/services/event-form.service.js');
  assert.match(source, /event\.submissionReviewMode = normalizeSubmissionReviewMode\(formData\.submissionReviewMode\)/);
  assert.match(read('src/routes/organiser/event-creation.js'), /submissionReviewMode: formData\.submissionReviewMode === 'manual' \? 'manual' : 'system'/);
  assert.match(read('src/utils/event-template.js'), /submissionReviewMode: 'system'/);
});

test('both auto-approval sites consult the mode before approving, and there are no others', () => {
  const standard = read('src/services/submission.service.js');
  const fn = standard.slice(standard.indexOf('async function applyAutoApprovalIfEligible'));
  const eligibility = fn.indexOf('isAutoApprovableSubmission(submission)');
  const lookup = fn.indexOf("select('submissionReviewMode')");
  const approve = fn.indexOf("submission.status = 'approved'");
  assert.ok(eligibility > -1 && lookup > eligibility && approve > lookup, 'lookup sits between the eligibility check and the approval');
  assert.match(fn, /if \(isManualSubmissionReview\(eventSettings\)\) \{\s*return submission;/);
  // Personal records have no event and must stay on system validation.
  assert.match(fn, /if \(submission\.eventId\) \{/);

  const accumulated = read('src/services/accumulated-activity.service.js');
  const afn = accumulated.slice(accumulated.indexOf('async function applyAccumulatedAutoApprovalIfEligible'));
  assert.ok(afn.indexOf('isManualSubmissionReview(eventDoc)') > -1);
  assert.ok(afn.indexOf('isManualSubmissionReview(eventDoc)') < afn.indexOf("activity.status = 'approved'"));
  // The event passed in by the create path must actually carry the field.
  assert.match(accumulated, /requireTrackingAppDevice submissionReviewMode'/);
  assert.match(afn, /virtualCompletionMode submissionReviewMode'/);

  // submission.auto_approved is only ever written by these two functions.
  const writers = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js') && /action:\s*'submission\.auto_approved'/.test(fs.readFileSync(full, 'utf8'))) {
        writers.push(path.relative(ROOT, full));
      }
    }
  })(path.join(ROOT, 'src'));
  assert.deepEqual(writers.sort(), ['src/services/accumulated-activity.service.js', 'src/services/submission.service.js']);
});

test('validation still runs in manual mode, so reviewers keep every signal', () => {
  // The mode only gates the final approval step; the payload validation that stores OCR and
  // integrity results happens before applyAutoApprovalIfEligible is called.
  const source = read('src/services/submission.service.js');
  const calls = source.match(/return applyAutoApprovalIfEligible\(/g) || [];
  assert.equal(calls.length, 3);
  assert.doesNotMatch(source, /isManualSubmissionReview[\s\S]{0,200}detectSuspiciousActivity/);
});

const options = mode.SUBMISSION_REVIEW_MODE_OPTIONS;
const renderField = (formData) => ejs.render(
  read('src/views/organizer/partials/submission-review-mode-field.ejs'),
  { formData, submissionReviewModeOptions: options }
);

test('the form control offers both options with the saved one selected', () => {
  const manual = renderField({ submissionReviewMode: 'manual' });
  assert.match(manual, /<input type="radio" name="submissionReviewMode" value="manual" checked>/);
  assert.match(manual, /<input type="radio" name="submissionReviewMode" value="system" >/);
  assert.match(manual, /Recommended/);
  assert.match(manual, /Applies to new submissions only/);

  // No saved value (new event) selects the recommended system option.
  assert.match(renderField({}), /value="system" checked/);
  assert.match(renderField({ submissionReviewMode: 'nonsense' }), /value="system" checked/);
});

test('create and edit forms both include the control and the app exposes the shared wording', () => {
  for (const file of ['src/views/organizer/create-event.ejs', 'src/views/organizer/edit-event.ejs']) {
    assert.match(read(file), /include\('partials\/submission-review-mode-field'\)/, file);
    assert.doesNotThrow(() => ejs.compile(read(file), { filename: path.join(ROOT, file) }));
  }
  assert.match(read('src/server.js'), /app\.locals\.submissionReviewModeOptions = require\('\.\/utils\/submission-review-mode'\)\.SUBMISSION_REVIEW_MODE_OPTIONS/);
  assert.match(read('src/public/css/create-event.css'), /\.review-mode-option:has\(input:checked\)/);
});

test('the event workspace summary states the review mode', () => {
  assert.match(read('src/services/organizer-event-detail.service.js'), /submissionReview: getSubmissionReviewModeLabel\(event\.submissionReviewMode\)/);
  assert.match(read('src/views/organizer/event-details.ejs'), /<dt>Submission review<\/dt><dd><%= p\.runnerExperience\.submissionReview %><\/dd>/);
});

const queueView = read('src/views/organizer/run-proof-review.ejs').replace(/<%-\s*include\([^%]+%>/g, '');
const renderQueue = (extra = {}, item = {}) => ejs.render(queueView, {
  title: 'Run Proof Review', user: {}, isAdminViewer: false, event: { _id: 'e1', title: 'Sample' },
  filters: { status: 'pending', sort: 'oldest', q: '', page: 1 }, message: null,
  counts: { pending: 1, all: 1, reviewed: 0, approved: 0, autoApproved: 0, rejected: 0 },
  pagination: { page: 1, totalPages: 1, totalItems: 1, pageSize: 50, prevHref: '', nextHref: '' },
  links: { pending: '#', approved: '#', autoApproved: '#', rejected: '#', all: '#', reset: '#', registrants: '#', reviewOldest: '' },
  reviewItems: [{
    id: 's1', participantName: 'Jordan', participantEmail: 'j@example.test', statusClass: 'submitted', statusLabel: 'Pending Review',
    submissionTypeLabel: 'Run Result', isAutoApproved: false, suspiciousFlag: false, hasOcrMismatch: false, distanceLabel: '5.00 km',
    elapsedLabel: '00:30:00', runDateLabel: 'Sep 1', submittedAtLabel: 'Sep 1', proofTypeLabel: 'GPS', sourceLabel: 'Manual upload',
    reviewSourceLabel: 'Awaiting', proofUrl: '', isImageProof: false, confirmationCode: 'HR-1', status: 'submitted', actionHref: '#',
    ...item
  }],
  ...extra
}, { filename: path.join(ROOT, 'src/views/organizer/run-proof-review.ejs') });

test('the queue header shows the event\'s mode, and stays quiet when it is not provided', () => {
  const manual = renderQueue({ submissionReviewMode: 'manual', submissionReviewModeLabel: 'Organizer reviews all' });
  assert.match(manual, /rpr-mode-pill rpr-mode-pill-manual/);
  assert.match(manual, /Submission review: <strong>Organizer reviews all<\/strong>/);
  assert.match(manual, /Nothing is approved automatically\./);

  const system = renderQueue({ submissionReviewMode: 'system', submissionReviewModeLabel: 'System validation' });
  assert.match(system, /rpr-mode-pill rpr-mode-pill-system/);
  assert.match(system, /Entries that pass the checks are approved automatically\./);

  assert.doesNotMatch(renderQueue(), /rpr-mode-pill/);
});

test('"Passed system checks" marks pending entries whose validation was clean', () => {
  assert.match(renderQueue({}, { passedSystemChecks: true }), /mode-passed-checks[^>]*>Passed system checks</);
  assert.doesNotMatch(renderQueue({}, { passedSystemChecks: false }), /Passed system checks/);
  assert.match(read('src/routes/organiser/_shared.js'), /passedSystemChecks: submission\.status === 'submitted' && Boolean\(submission\.validation\?\.autoApprovalEligible\)/);
  assert.match(read('src/routes/organiser/review.js'), /submissionReviewModeLabel: getSubmissionReviewModeLabel\(event\.submissionReviewMode\)/);
  assert.match(read('src/views/organizer/registrant-submissions.ejs'), /mode-passed-checks/);
});

test('the queue mode pill and badge styles are scoped to the review page', () => {
  const css = read('src/public/css/run-proof-review.css');
  assert.match(css, /\.run-proof-review-page \.rpr-mode-pill-manual/);
  assert.match(css, /\.run-proof-review-page \.mode-badge\.mode-passed-checks/);
});

test('runners are shown each event\'s mode, and the submit copy no longer promises auto-approval for manual events', () => {
  const service = read('src/services/submission.service.js');
  assert.match(service, /finalSubmissionDeadlineAt submissionReviewMode'/);
  assert.match(service, /submissionReviewMode: normalizeSubmissionReviewMode\(registration\.eventId\?\.submissionReviewMode\)/);

  const modal = read('src/public/js/run-proof-modal.js');
  assert.match(modal, /const isManualReviewOption = \(item\) => String\(\(item && item\.submissionReviewMode\) \|\| ''\) === 'manual'/);
  assert.match(modal, /The organiser reviews every submission for this event, so you will be notified once it has been reviewed\./);
  // Strava success, standard success and the confirm dialog all follow the mode.
  assert.match(modal, /isManualReviewOption\(selected\)\s*\?\s*'Your Strava activity has been received\. ' \+ MANUAL_REVIEW_NOTE/);
  assert.match(modal, /const manualReviewSelected = getSelectedOptions\(\)\.some\(isManualReviewOption\)/);
  assert.match(modal, /getSelectedOptions\(\)\.some\(isManualReviewOption\) \? ' ' \+ MANUAL_REVIEW_NOTE : ''/);
  // Events on system validation keep the original wording.
  assert.match(modal, /Clean synced activities may auto-approve; otherwise they remain available for review\./);
});

// ---- Behaviour of the two enforcement points -------------------------------------------
//
// Approval is detected by save() being reached: the sentinel error stops the flow before any
// downstream database work (certificate, notification, ranking) so nothing external is touched.

const { applyAutoApprovalIfEligible } = require('../src/services/submission.service');
const { applyAccumulatedAutoApprovalIfEligible } = require('../src/services/accumulated-activity.service');

const SAVE_REACHED = 'SAVE_REACHED';

function withEventStub(eventSettings, run) {
  const original = Event.findById;
  const lookups = [];
  Event.findById = (id) => {
    lookups.push(String(id));
    const chain = { select: () => chain, lean: async () => eventSettings, then: (resolve) => resolve(eventSettings) };
    return chain;
  };
  return Promise.resolve(run(lookups)).finally(() => { Event.findById = original; });
}

const cleanOcr = { nameMatchStatus: 'matched', extractedDistanceKm: 5, extractedTimeMs: 1800000, confidence: 0.95 };
const makeEntry = (overrides = {}) => ({
  _id: 'entry-1', eventId: 'event-1', status: 'submitted', source: 'manual_upload', ocrData: { ...cleanOcr },
  suspiciousFlag: false,
  save: async function save() { throw new Error(SAVE_REACHED); },
  ...overrides
});
const stravaEntry = () => makeEntry({
  source: 'strava', ocrData: {},
  stravaActivity: { id: 111, athleteId: 222, distanceKm: 5, elapsedTimeSeconds: 1800 }
});

test('system mode: a clean OCR proof proceeds to approval (today\'s behaviour is unchanged)', async () => {
  await withEventStub({ submissionReviewMode: 'system' }, async () => {
    await assert.rejects(() => applyAutoApprovalIfEligible(makeEntry()), new RegExp(SAVE_REACHED));
  });
});

test('a legacy event with no stored mode behaves exactly like system validation', async () => {
  await withEventStub({}, async () => {
    await assert.rejects(() => applyAutoApprovalIfEligible(makeEntry()), new RegExp(SAVE_REACHED));
  });
});

test('manual mode: a clean OCR proof stays pending and nothing is saved or approved', async () => {
  await withEventStub({ submissionReviewMode: 'manual' }, async () => {
    const entry = makeEntry();
    const result = await applyAutoApprovalIfEligible(entry);
    assert.equal(result, entry);
    assert.equal(entry.status, 'submitted');
    assert.equal(entry.reviewedBy, undefined);
  });
});

test('manual mode: a clean Strava sync also waits for the organizer', async () => {
  await withEventStub({ submissionReviewMode: 'system' }, async () => {
    await assert.rejects(() => applyAutoApprovalIfEligible(stravaEntry()), new RegExp(SAVE_REACHED), 'auto-approves under system mode');
  });
  await withEventStub({ submissionReviewMode: 'manual' }, async () => {
    const entry = stravaEntry();
    assert.equal(await applyAutoApprovalIfEligible(entry), entry);
    assert.equal(entry.status, 'submitted');
  });
});

test('entries that were never auto-approvable do not even look up the event', async () => {
  await withEventStub({ submissionReviewMode: 'manual' }, async (lookups) => {
    const flagged = makeEntry({ suspiciousFlag: true });
    assert.equal(await applyAutoApprovalIfEligible(flagged), flagged);
    const lowConfidence = makeEntry({ ocrData: { ...cleanOcr, confidence: 0.2 } });
    assert.equal(await applyAutoApprovalIfEligible(lowConfidence), lowConfidence);
    assert.deepEqual(lookups, [], 'no extra query for entries that were going to wait anyway');
  });
});

test('personal records have no event and stay on system validation', async () => {
  await withEventStub({ submissionReviewMode: 'manual' }, async (lookups) => {
    await assert.rejects(() => applyAutoApprovalIfEligible(makeEntry({ eventId: undefined })), new RegExp(SAVE_REACHED));
    assert.deepEqual(lookups, []);
  });
});

const accumulatedEvent = (submissionReviewMode) => ({
  title: 'Challenge', virtualCompletionMode: 'accumulated_activity', challengeMetrics: ['distance'],
  primaryChallengeMetric: 'distance', targetDistanceKm: 50, submissionReviewMode
});

test('accumulated activities follow the same rule, using the event they were created against', async () => {
  const activity = (overrides) => makeEntry({ runnerId: 'runner-1', registrationId: 'reg-1', ...overrides });

  const system = activity();
  await assert.rejects(() => applyAccumulatedAutoApprovalIfEligible(system, accumulatedEvent('system')), new RegExp(SAVE_REACHED));

  const manual = activity();
  assert.equal(await applyAccumulatedAutoApprovalIfEligible(manual, accumulatedEvent('manual')), manual);
  assert.equal(manual.status, 'submitted');

  // Without a passed-in event it loads one, and the lookup carries the mode.
  await withEventStub(accumulatedEvent('manual'), async (lookups) => {
    const viaLookup = activity();
    assert.equal(await applyAccumulatedAutoApprovalIfEligible(viaLookup), viaLookup);
    assert.equal(viaLookup.status, 'submitted');
    assert.deepEqual(lookups, ['event-1']);
  });
});
