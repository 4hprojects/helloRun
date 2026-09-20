'use strict';

// DB-free unit tests for organizer corrections to a submitted entry's values.
//
// The validation and diffing rules are pure and are exercised directly. The parts that
// only run against a database (persistence, ranking, certificate, notification) are pinned
// at source level, the same way the approval-reversal tests do.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const {
  correctSubmissionValues,
  buildCorrection,
  describeChanges,
  normalizeCorrectionReason,
  MIN_REASON_LENGTH,
  MAX_REASON_LENGTH,
  RUN_TYPES
} = require('../src/services/submission-correction.service');

const baseRecord = () => ({
  distanceKm: 5.02,
  elapsedMs: 1872500,
  runDate: new Date('2026-09-18T00:00:00.000Z'),
  runLocation: 'Cebu',
  runType: 'run'
});

test('a reason is required, trimmed and length-bounded before anything else happens', async () => {
  for (const reason of [undefined, '', '   ', 'no']) {
    await assert.rejects(
      () => correctSubmissionValues({ submissionId: 'x', actorUserId: 'a', actorRole: 'organiser', changes: {}, reason }),
      /reason of at least 5 characters/i,
      `expected refusal for ${JSON.stringify(reason)}`
    );
  }
  assert.equal(MIN_REASON_LENGTH, 5);
  assert.equal(normalizeCorrectionReason('  typo in distance  '), 'typo in distance');
  assert.equal(normalizeCorrectionReason('x'.repeat(900)).length, MAX_REASON_LENGTH);
});

test('an unknown id is refused without touching the database', async () => {
  await assert.rejects(
    () => correctSubmissionValues({ submissionId: 'not-an-id', actorUserId: 'a', actorRole: 'admin', changes: {}, reason: 'valid reason' }),
    /Entry not found/
  );
});

test('a form submitted untouched is a no-op, even though stored elapsed time has milliseconds', () => {
  // The form can only express whole seconds; comparing raw milliseconds would report a
  // phantom change on every entry and notify the runner about nothing.
  assert.throws(
    () => buildCorrection(baseRecord(), {
      distanceKm: '5.02',
      elapsedMs: 1872000,
      runDate: '2026-09-18',
      runLocation: 'Cebu',
      runType: 'run'
    }),
    /No changes were made/
  );
});

test('only the fields that actually changed are reported, with before and after', () => {
  const { changes, values } = buildCorrection(baseRecord(), {
    distanceKm: '5.20',
    elapsedMs: 1872000,
    runDate: '2026-09-17',
    runLocation: 'Cebu',
    runType: 'walk'
  });
  assert.deepEqual(changes.map((c) => c.field).sort(), ['distanceKm', 'runDate', 'runType']);
  assert.deepEqual(changes.find((c) => c.field === 'distanceKm'), { field: 'distanceKm', from: 5.02, to: 5.2 });
  assert.equal(values.runType, 'walk');
  assert.ok(values.runDate instanceof Date);
  assert.equal(values.elapsedMs, undefined);
});

test('blank distance, time, date and type leave the entry as is, but a blank location clears it', () => {
  const { changes } = buildCorrection(baseRecord(), {
    distanceKm: '', elapsedMs: undefined, runDate: '', runType: '', runLocation: ''
  });
  assert.deepEqual(changes, [{ field: 'runLocation', from: 'Cebu', to: '' }]);
});

test('an accumulated entry with no recorded distance can be given one', () => {
  const { changes } = buildCorrection({ ...baseRecord(), distanceKm: null }, { distanceKm: '3' });
  assert.deepEqual(changes, [{ field: 'distanceKm', from: null, to: 3 }]);
});

test('out-of-range and malformed values are rejected with a specific message', () => {
  const cases = [
    [{ distanceKm: '0.05' }, /Distance must be between 0\.1 and 500/],
    [{ distanceKm: '501' }, /Distance must be between 0\.1 and 500/],
    [{ distanceKm: 'abc' }, /Distance must be between/],
    [{ elapsedMs: 500 }, /Elapsed time must be between/],
    [{ elapsedMs: 8 * 24 * 60 * 60 * 1000 }, /Elapsed time must be between/],
    [{ runDate: 'not-a-date' }, /Run date is invalid/],
    [{ runDate: '2999-01-01' }, /cannot be in the future/],
    [{ runType: 'flying' }, /Activity type is not recognized/]
  ];
  for (const [input, pattern] of cases) {
    assert.throws(() => buildCorrection(baseRecord(), input), pattern, JSON.stringify(input));
  }
  assert.deepEqual([...RUN_TYPES], ['run', 'walk', 'hike', 'trail_run', 'treadmill']);
});

test('runner-facing change lines are human-readable', () => {
  const lines = describeChanges([
    { field: 'distanceKm', from: 5.2, to: 5.02 },
    { field: 'elapsedMs', from: 1912000, to: 1872000 },
    { field: 'runLocation', from: '', to: 'Cebu' },
    { field: 'runType', from: 'run', to: 'walk' }
  ]);
  assert.deepEqual(lines, [
    'Distance: 5.20 km to 5.02 km',
    'Elapsed time: 00:31:52 to 00:31:12',
    'Location: not set to Cebu',
    'Activity type: run to walk'
  ]);
});

test('access is scoped to owner, co-organizer or admin and enforced inside the service', () => {
  const source = read('src/services/submission-correction.service.js');
  assert.match(source, /resolveEventAccess\(\{[\s\S]*?eventId: event\._id/);
  assert.match(source, /normalizedRole !== 'admin'/);
  assert.match(source, /Entry not found or inaccessible/);
});

test('the change is persisted through save() with a structured history entry and an audit row', () => {
  const source = read('src/services/submission-correction.service.js');
  // save() rather than findOneAndUpdate, so Submission's post-save shadow sync fires.
  assert.match(source, /await record\.save\(\)/);
  assert.doesNotMatch(source, /findOneAndUpdate|updateOne\(/);
  assert.match(source, /record\.organizerCorrections\.push\(\{ editedBy: actorUserId/);
  assert.match(source, /action: 'submission\.values_corrected'/);
  // A self-correction is allowed but recorded, matching the review services.
  assert.match(source, /action: 'submission\.self_reviewed'/);
  assert.match(read('src/services/critical-audit-query.service.js'), /submissions: \[[\s\S]*?'submission\.values_corrected'[\s\S]*?\]/);
});

test('derived data is only recomputed for approved entries', () => {
  const source = read('src/services/submission-correction.service.js');
  assert.match(source, /if \(record\.status === 'approved'\) \{\s*certificateRegenerated = await applyApprovedEntryEffects/);
  // Standard: ranking + certificate. Accumulated: progress + certificate reconcile.
  assert.match(source, /syncEventRankingsInBackground\(record, event\.slug\)/);
  assert.match(source, /refreshAccumulatedChallengeProgress\(record\.registrationId/);
  assert.match(source, /reconcileAccumulatedCertificateAfterReview\(record\.registrationId, event\)/);
  assert.match(source, /invalidateLeaderboardCache\(event\.slug\)/);
  // Location and activity type do not appear on the certificate, so they do not regenerate it.
  assert.match(source, /\['distanceKm', 'elapsedMs', 'runDate'\]\.includes\(change\.field\)/);
});

test('the runner is notified, entries without an account are skipped, and a failed notice never undoes the edit', () => {
  const source = read('src/services/submission-correction.service.js');
  assert.match(source, /notifyWithRetry\('result\.corrected'/);
  assert.match(source, /if \(!record\.runnerId\) return;/);
  assert.match(source, /Correction saved but the runner notification failed/);
});

test('the result.corrected event is registered end to end', () => {
  assert.match(read('src/services/communication-events.registry.js'), /eventKey: 'result\.corrected'/);
  const communication = read('src/services/communication.service.js');
  assert.match(communication, /if \(eventKey === 'result\.corrected'\)/);
  assert.match(communication, /sendResultCorrectedEmailToRunner/);
  assert.match(communication, /'result\.corrected': `Result Corrected/);
  assert.match(read('src/services/email.service.js'), /exports\.sendResultCorrectedEmailToRunner/);
});

test('both submission models carry the additive correction history', () => {
  for (const file of ['src/models/Submission.js', 'src/models/AccumulatedActivitySubmission.js']) {
    assert.match(read(file), /organizerCorrections: \{\s*type: \[organizerCorrectionSchema\]/);
  }
});
