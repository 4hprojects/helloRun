const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ACTIVE_QUEST_METRIC_RULES,
  buildActiveQuestMonthlyMetrics,
  median
} = require('../src/services/active-quest-analytics.service');
const {
  ACTIVE_QUEST_ACHIEVEMENTS,
  calculateActiveQuestAchievementCodes,
  getFinalizedActiveQuestCompletions,
  longestConsecutiveRun
} = require('../src/services/active-quest-achievement.service');

function event(year, month, id = `${year}-${month}`) {
  return {
    _id: id,
    title: `Active Quest ${year}-${month}`,
    seriesYear: year,
    seriesMonth: month,
    raceCategories: [{ categoryId: '25', distanceKm: 25 }]
  };
}

function registration(id, eventId, userId, raceCategoryId = '25') {
  return { _id: id, eventId, userId, status: 'confirmed', pricingSnapshot: { raceCategoryId, raceDistance: '25K' } };
}

test('monthly analytics defines denominators and immediate-previous-month returning rate', () => {
  const october = event(2026, 10);
  const november = event(2026, 11);
  const registrations = [
    registration('r1', october._id, 'u1'),
    registration('r2', november._id, 'u1'),
    registration('r3', november._id, 'u2')
  ];
  const activities = [
    { registrationId: 'r2', eventId: november._id, status: 'approved', distanceKm: 25, submittedAt: new Date(0), reviewedAt: new Date(3600000) },
    { registrationId: 'r3', eventId: november._id, status: 'submitted', distanceKm: 25 },
    { registrationId: 'r3', eventId: november._id, status: 'rejected', distanceKm: 10, suspiciousFlag: true }
  ];
  const [metrics] = buildActiveQuestMonthlyMetrics({
    events: [november],
    allSeriesEvents: [october, november],
    registrations,
    activities
  });
  assert.equal(metrics.uniqueParticipants, 2);
  assert.equal(metrics.newParticipants, 1);
  assert.equal(metrics.returningParticipants, 1);
  assert.equal(metrics.returningRate, 0.5);
  assert.equal(metrics.completionRate, 0.5);
  assert.equal(metrics.pendingCount, 1);
  assert.equal(metrics.rejectedCount, 1);
  assert.equal(metrics.flaggedCount, 1);
  assert.equal(metrics.totalApprovedKm, 25);
  assert.match(ACTIVE_QUEST_METRIC_RULES.returning, /immediately previous calendar-month/i);
});

test('review median and OCR correction rate use reviewed source rows only', () => {
  const november = event(2026, 11);
  const metrics = buildActiveQuestMonthlyMetrics({
    events: [november],
    registrations: [registration('r1', november._id, 'u1')],
    activities: [
      { registrationId: 'r1', eventId: november._id, status: 'approved', distanceKm: 10, submittedAt: new Date(0), reviewedAt: new Date(1000), ocrData: { parserVersion: 'v1' }, organizerCorrections: [] },
      { registrationId: 'r1', eventId: november._id, status: 'approved', distanceKm: 15, submittedAt: new Date(0), reviewedAt: new Date(3000), ocrData: { parserVersion: 'v1' }, organizerCorrections: [{ changes: [{ field: 'distanceKm' }] }] }
    ]
  })[0];
  assert.equal(metrics.medianReviewDurationMs, 2000);
  assert.equal(metrics.ocrCorrectionRate, 0.5);
  assert.equal(median([3000, 1000]), 2000);
});

test('analytics output contains aggregates, not participant identities', () => {
  const november = event(2026, 11);
  const metrics = buildActiveQuestMonthlyMetrics({
    events: [november],
    registrations: [registration('r1', november._id, 'private-user-id')],
    activities: []
  })[0];
  assert.doesNotMatch(JSON.stringify(metrics), /private-user-id/);
  assert.equal(Object.hasOwn(metrics, 'participants'), false);
});

test('year boundary months remain consecutive and missed months break streaks', () => {
  assert.equal(longestConsecutiveRun([202611, 202612, 202701]), 3);
  assert.equal(longestConsecutiveRun([202611, 202701]), 1);
  assert.ok(calculateActiveQuestAchievementCodes([
    { year: 2026, month: 11 }, { year: 2026, month: 12 }, { year: 2027, month: 1 }
  ]).includes('active-quest-triple-quest'));
});

test('annual, half-year, and year-round achievements derive from finalized completion history', () => {
  const year = Array.from({ length: 12 }, (_, index) => ({ year: 2026, month: index + 1 }));
  const codes = calculateActiveQuestAchievementCodes(year);
  assert.ok(codes.includes('active-quest-first-quest'));
  assert.ok(codes.includes('active-quest-half-year-quest'));
  assert.ok(codes.includes('active-quest-year-round-quest'));
  assert.ok(codes.includes('active-quest-annual-quest-finisher'));
});

test('backdated correction deterministically removes broken streak eligibility', () => {
  const before = [{ year: 2026, month: 1 }, { year: 2026, month: 2 }, { year: 2026, month: 3 }];
  const after = before.filter((completion) => completion.month !== 2);
  assert.ok(calculateActiveQuestAchievementCodes(before).includes('active-quest-triple-quest'));
  assert.equal(calculateActiveQuestAchievementCodes(after).includes('active-quest-triple-quest'), false);
});

test('unfinalized edition and edition with pending review produce no completion', async () => {
  const dueEvent = { ...event(2026, 11), status: 'published', finalSubmissionDeadlineAt: new Date('2026-12-14T16:00:00Z') };
  const chain = (value) => ({ sort() { return this; }, lean: async () => value });
  const completions = await getFinalizedActiveQuestCompletions({ now: new Date('2026-12-20T00:00:00Z') }, {
    EventModel: { find: () => chain([dueEvent]) },
    RegistrationModel: { find: () => ({ lean: async () => [registration('r1', dueEvent._id, 'u1')] }) },
    ActivityModel: {
      countDocuments: async () => 1,
      find: () => ({ lean: async () => [{ registrationId: 'r1', status: 'approved', distanceKm: 25 }] })
    }
  });
  assert.deepEqual(completions, []);
});

test('lifetime distance candidates remain disabled until cross-event activity identity exists', () => {
  const codes = ACTIVE_QUEST_ACHIEVEMENTS.map((achievement) => achievement.code);
  assert.equal(codes.some((code) => /500|1000/.test(code)), false);
});
