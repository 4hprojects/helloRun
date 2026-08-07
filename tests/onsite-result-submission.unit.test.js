'use strict';

// Coverage for the bridge that turns an approved onsite result into an approved
// Submission, so onsite finishers reach rankings, the leaderboard and certificates.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const {
  parseDistanceLabelKm,
  resolveDistanceKm,
  buildSubmissionUpdate
} = require('../src/services/onsite-result-submission.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const submissionService = read('src/services/submission.service.js');
const onsiteService = read('src/services/onsite-operations.service.js');
const resultsScript = read('src/public/js/organizer-onsite-results.js');
const resultsView = read('src/views/organizer/event-onsite-results.ejs');

test('parseDistanceLabelKm reads the common label shapes', () => {
  assert.equal(parseDistanceLabelKm('10K'), 10);
  assert.equal(parseDistanceLabelKm('21.1K'), 21.1);
  assert.equal(parseDistanceLabelKm('5 km'), 5);
  assert.equal(parseDistanceLabelKm('42.195 kilometers'), 42.195);
  assert.equal(parseDistanceLabelKm('3'), 3);
});

test('parseDistanceLabelKm refuses anything it cannot read rather than guessing', () => {
  // A wrong distance would feed a ranking, so returning null is the safe answer.
  [null, undefined, '', '   ', 'fun run', '0K', '-5K'].forEach((value) => {
    assert.equal(parseDistanceLabelKm(value), null, `${JSON.stringify(value)} should not parse`);
  });
});

test('resolveDistanceKm prefers the recorded result distance', () => {
  const distance = resolveDistanceKm({
    resultDistanceKm: '10.5',
    event: { raceCategories: [{ categoryId: 'c1', distanceKm: 5 }] },
    registration: { raceDistance: '21K', pricingSnapshot: { raceCategoryId: 'c1' } }
  });
  assert.equal(distance, 10.5);
});

test('resolveDistanceKm falls back to the race category, then the label', () => {
  const fromCategory = resolveDistanceKm({
    resultDistanceKm: null,
    event: { raceCategories: [{ categoryId: 'c1', distanceKm: 5 }] },
    registration: { raceDistance: '21K', pricingSnapshot: { raceCategoryId: 'c1' } }
  });
  assert.equal(fromCategory, 5);

  const fromCategoryLabel = resolveDistanceKm({
    resultDistanceKm: null,
    event: { raceCategories: [{ categoryId: 'c1', distanceLabel: '15K' }] },
    registration: { raceDistance: '21K', pricingSnapshot: { raceCategoryId: 'c1' } }
  });
  assert.equal(fromCategoryLabel, 15);

  const fromRegistration = resolveDistanceKm({
    resultDistanceKm: null,
    event: { raceCategories: [] },
    registration: { raceDistance: '21.1K' }
  });
  assert.equal(fromRegistration, 21.1);
});

test('resolveDistanceKm returns null when no source knows the distance', () => {
  assert.equal(
    resolveDistanceKm({ resultDistanceKm: null, event: { raceCategories: [] }, registration: {} }),
    null
  );
});

test('the materialised submission is an approved onsite record with honest proof fields', () => {
  const performedBy = new mongoose.Types.ObjectId();
  const update = buildSubmissionUpdate({
    registration: {
      eventId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      raceDistance: '10K'
    },
    event: { startDate: new Date('2026-08-01T00:00:00.000Z') },
    elapsedMs: 3120000,
    distanceKm: 10,
    performedBy: String(performedBy)
  });

  assert.equal(update.participationMode, 'onsite');
  assert.equal(update.status, 'approved');
  assert.equal(update.elapsedMs, 3120000);
  assert.equal(update.distanceKm, 10);
  // No uploaded evidence exists for a marshal-recorded finish; do not fabricate any.
  assert.equal(update.proofType, 'manual');
  assert.match(update.proofNotes, /onsite/i);
  assert.equal(String(update.reviewedBy), String(performedBy));
});

test('a non-ObjectId approver is stored as null rather than crashing validation', () => {
  const update = buildSubmissionUpdate({
    registration: {
      eventId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      raceDistance: '5K'
    },
    event: {},
    elapsedMs: 1000,
    distanceKm: 5,
    performedBy: 'not-an-object-id'
  });
  assert.equal(update.reviewedBy, null);
});

test('approval side effects are shared between the virtual and onsite paths', () => {
  // One pipeline, so onsite results cannot drift away from how virtual approvals
  // reach rankings and certificates.
  assert.match(submissionService, /function applyApprovedSubmissionEffects/);
  assert.match(submissionService, /applyApprovedSubmissionEffects,/);
  assert.match(submissionService, /await applyApprovedSubmissionEffects\(reviewedSubmission, event/);
});

test('a failed materialisation is reported, not swallowed', () => {
  // The Postgres approval is already committed, so this must not throw — but staff
  // must not be told a finisher is ranked when they are not.
  assert.match(onsiteService, /submissionCreated: false, submissionError/);
  assert.match(onsiteService, /materialiseResultAsSubmission/);
  assert.match(resultsScript, /payload\.submissionCreated/);
  assert.match(resultsScript, /Approved, but not in the results yet/);
});

test('the results page no longer claims approval stops at badges', () => {
  assert.match(resultsView, /enters the runner\s+into the event leaderboard/);
  assert.doesNotMatch(resultsView, /does not yet place the finisher/);
});
