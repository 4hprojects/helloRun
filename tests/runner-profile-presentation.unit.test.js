'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { NOTIFICATION_OPTIONS, buildRunnerProfilePresentation } = require('../src/services/runner-profile-presentation.service');

test('profile identity and first incomplete recovery target are deterministic', () => {
  const result = buildRunnerProfilePresentation({
    user: { firstName: 'Henson', email: 'Runner@Example.COM', avatarUrl: ' avatar.webp ' },
    profileData: {
      displayName: 'Trail Henz',
      firstName: 'Henson',
      dateOfBirth: '1992-07-18',
      mobile: '+63 917 123 4567',
      emergencyContactNumber: '+63 917 123 4567'
    },
    profileCompleteness: { percent: 78, completedCount: 7, requiredCount: 9, missingFields: ['Country', 'Timezone'] }
  });
  assert.deepEqual(result.identity, {
    displayName: 'Trail Henz', initials: 'TH', avatarUrl: 'avatar.webp', email: 'runner@example.com'
  });
  assert.equal(result.completion.recoveryHref, '#location');
  assert.equal(result.completion.recoveryLabel, 'Complete location');
  assert.equal(result.emergencyContactNumberMasked, '•••• •••• 4567');
  assert.equal(result.mobileMasked, '•••• •••• 4567');
  assert.equal(result.dateOfBirthMasked, '••/••/1992');
});

test('notification choices are unique and respect email opt-outs', () => {
  assert.equal(new Set(NOTIFICATION_OPTIONS.map((item) => item.key)).size, NOTIFICATION_OPTIONS.length);
  const result = buildRunnerProfilePresentation({ user: { notificationPreferences: { emailOptOut: ['badge.earned'] } } });
  assert.equal(result.notificationOptions.find((item) => item.key === 'badge.earned').enabled, false);
  assert.equal(result.notificationOptions.find((item) => item.key === 'result.approved').enabled, true);
  assert.equal(result.notificationPreferences.enabledCount, 5);
  assert.equal(result.notificationPreferences.totalCount, 6);
  assert.deepEqual(result.notificationPreferences.groups.map((group) => group.label), ['Results & recognition', 'Event communication']);
  assert.equal(result.notificationPreferences.groups.flatMap((group) => group.options).length, 6);
});

test('account and Strava states are normalized for presentation', () => {
  const result = buildRunnerProfilePresentation({
    user: { authProvider: 'google', googleId: 'google-1', passwordHash: 'hash' },
    stravaConnection: { connected: true, athleteName: 'Runner One', stravaAthleteId: 42 }
  });
  assert.deepEqual(result.account, {
    authProviderLabel: 'Google', googleLinked: true, localPasswordSet: true, passwordActionLabel: 'Change Password'
  });
  assert.equal(result.connection.connected, true);
  assert.equal(result.connection.athleteName, 'Runner One');
});

test('achievements expose compact previews and preserve remaining items', () => {
  const badges = Array.from({ length: 6 }, (_, index) => ({
    userBadgeId: `badge-${index}`,
    badgeType: index === 0 ? 'finisher' : 'challenge_progress',
    name: `Badge ${index}`,
    isFeatured: index === 0,
    mongoSubmissionId: index === 0 ? 'submission-1' : ''
  }));
  const progress = Array.from({ length: 5 }, (_, index) => ({ name: `Goal ${index}`, progressPercent: index === 4 ? 125 : index * 20 }));
  const result = buildRunnerProfilePresentation({
    badges,
    badgeProgress: progress,
    certifiedSubmissionIds: new Set(['submission-1']),
    badgePointsSummary: { totalPoints: 125 }
  }).achievements;
  assert.equal(result.featuredBadge.certificateUrl, '/my-submissions/submission-1/certificate');
  assert.equal(result.previewBadges.length, 3);
  assert.equal(result.remainingBadges.length, 2);
  assert.equal(result.previewProgress.length, 3);
  assert.equal(result.remainingProgress.length, 2);
  assert.equal(result.remainingProgress.at(-1).exactPercent, 125);
  assert.equal(result.remainingProgress.at(-1).barPercent, 100);
  assert.equal(result.hasMore, true);
  assert.equal(result.points, 125);
});
