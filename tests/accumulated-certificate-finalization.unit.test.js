const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildAccumulatedProgress
} = require('../src/services/accumulated-activity.service');
const {
  resolveAccumulatedCertificateDeadline,
  isAccumulatedCertificateFinalizationDue,
  findThresholdCrossingActivity
} = require('../src/services/accumulated-certificate-finalization.service');
const {
  buildCertificateRenderData,
  renderTemplateText
} = require('../src/services/certificate.service');

const root = path.join(__dirname, '..');

test('over-goal progress remains uncapped while pending distance stays separate', () => {
  const progress = buildAccumulatedProgress({
    targetDistanceKm: 21,
    activities: [
      { status: 'approved', distanceKm: 30, reviewedAt: '2026-07-10T00:00:00.000Z' },
      { status: 'submitted', distanceKm: 4 },
      { status: 'rejected', distanceKm: 2 }
    ]
  });

  assert.equal(progress.approvedDistanceKm, 30);
  assert.equal(progress.pendingDistanceKm, 4);
  assert.equal(progress.potentialDistanceKm, 34);
  assert.equal(progress.overGoalDistanceKm, 9);
  assert.equal(progress.remainingDistanceKm, 0);
  assert.equal(Number(progress.progressPercent.toFixed(1)), 142.9);
  assert.equal(progress.progressBarPercent, 100);
  assert.equal(progress.completed, true);
});

test('certificate deadline uses final submission deadline and opens only after its boundary', () => {
  const event = {
    virtualCompletionMode: 'accumulated_distance',
    finalSubmissionDeadlineAt: '2026-08-01T00:00:00.000Z',
    virtualWindow: { endAt: '2026-07-31T00:00:00.000Z' }
  };
  assert.equal(resolveAccumulatedCertificateDeadline(event).toISOString(), '2026-08-01T00:00:00.000Z');
  assert.equal(isAccumulatedCertificateFinalizationDue(event, new Date('2026-08-01T00:00:00.000Z')), false);
  assert.equal(isAccumulatedCertificateFinalizationDue(event, new Date('2026-08-01T00:00:00.001Z')), true);
});

test('threshold crossing activity is deterministic and ignores pending distance', () => {
  const activities = [
    { _id: 'a1', status: 'approved', distanceKm: 10 },
    { _id: 'pending', status: 'submitted', distanceKm: 20 },
    { _id: 'a2', status: 'approved', distanceKm: 11 },
    { _id: 'a3', status: 'approved', distanceKm: 9 }
  ];
  assert.equal(findThresholdCrossingActivity(activities, 21)._id, 'a2');
});

test('accumulated certificate rendering exposes selected goal and final verified total', async () => {
  const data = await buildCertificateRenderData({
    submission: { _id: 'activity-1', eventId: 'event-1', raceDistance: '21K', elapsedMs: 1000 },
    registration: { raceDistance: '21K', confirmationCode: 'HR-ABC123' },
    event: { _id: 'event-1', title: 'Monthly Quest', eventStartAt: '2026-07-01T00:00:00.000Z' },
    runner: { firstName: 'Maria', lastName: 'Runner' },
    template: { content: { bodyText: 'Officially completed {{distance}} at {{eventTitle}}.' } },
    certificateNumber: 'HR-CERT-1',
    verificationUrl: '/certificates/verify/HR-CERT-1',
    issuedAt: new Date('2026-08-02T00:00:00.000Z'),
    accumulatedSnapshot: { goalDistanceKm: 21, verifiedDistanceKm: 30, approvedActivityCount: 3 }
  });

  assert.equal(data.goalDistance, '21 km');
  assert.equal(data.verifiedDistance, '30 km');
  assert.equal(data.finishTime, '');
  assert.match(renderTemplateText(data.content.bodyText, data), /21 km goal.*30 km verified/i);
});

test('finalizer waits for the event review queue and approval no longer issues certificates', () => {
  const finalizer = fs.readFileSync(path.join(root, 'src/services/accumulated-certificate-finalization.service.js'), 'utf8');
  const activityService = fs.readFileSync(path.join(root, 'src/services/accumulated-activity.service.js'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'src/workers/accumulated-certificate-worker.js'), 'utf8');

  assert.match(finalizer, /countDocuments\(\{\s*eventId: event\._id,\s*status: 'submitted'/);
  assert.match(finalizer, /accumulatedCertificateFinalization\.state': 'generating'/);
  assert.match(finalizer, /certificateNumber: priorNumber/);
  assert.match(finalizer, /existingSnapshotMatches/);
  assert.match(finalizer, /verifiedDistanceKm[^\n]*=== Number\(progress\.approvedDistanceKm/);
  assert.doesNotMatch(activityService, /issueSubmissionCertificate/);
  assert.match(worker, /runAccumulatedCertificateFinalizationCycle/);
});
