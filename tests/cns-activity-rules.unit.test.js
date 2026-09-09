const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAccumulatedProgress,
  validateActivityAgainstEvent
} = require('../src/services/accumulated-activity.service');

const cnsEvent = {
  virtualCompletionMode: 'accumulated_activity',
  challengeMetrics: ['distance'],
  primaryChallengeMetric: 'distance',
  targetDistanceKm: 50,
  acceptedRunTypes: ['run', 'walk', 'hike'],
  requireActivityScreenshot: true,
  requireTrackingAppDevice: true
};

test('CNS activity validation requires an image screenshot and tracker identity', () => {
  const valid = {
    distanceKm: 4.2,
    runType: 'hike',
    trackingAppDevice: 'Garmin Watch',
    proof: { url: 'https://example.com/activity.png', mimeType: 'image/png' }
  };
  assert.doesNotThrow(() => validateActivityAgainstEvent(valid, cnsEvent));
  assert.throws(() => validateActivityAgainstEvent({ ...valid, trackingAppDevice: '' }, cnsEvent), /tracking app or device is required/i);
  assert.throws(() => validateActivityAgainstEvent({ ...valid, proof: { url: 'https://strava.com/activities/1', mimeType: 'text\/uri-list' } }, cnsEvent), /screenshot is required/i);
  assert.throws(() => validateActivityAgainstEvent({ ...valid, runType: 'treadmill' }, cnsEvent), /activity type is not accepted/i);
});

test('CNS progress aggregates elevation and all review statuses without capping distance', () => {
  const progress = buildAccumulatedProgress({
    targetDistanceKm: 50,
    activities: [
      { status: 'approved', distanceKm: 60, elevationGain: 900 },
      { status: 'submitted', distanceKm: 3, elevationGain: 25 },
      { status: 'needs_clarification', distanceKm: 2, elevationGain: 15 },
      { status: 'rejected', distanceKm: 1, elevationGain: 5 }
    ]
  });
  assert.equal(progress.approvedDistanceKm, 60);
  assert.equal(progress.approvedElevationGain, 900);
  assert.equal(progress.pendingElevationGain, 25);
  assert.equal(progress.needsClarificationElevationGain, 15);
  assert.equal(progress.approvedActivityCount, 1);
  assert.equal(progress.pendingActivityCount, 1);
  assert.equal(progress.needsClarificationActivityCount, 1);
  assert.equal(progress.rejectedActivityCount, 1);
  assert.equal(progress.completed, true);
  assert.equal(progress.progressBarPercent, 100);
  assert.equal(progress.progressPercent, 120);
});
