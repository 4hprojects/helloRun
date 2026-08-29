const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeLeaderboardDiscoveryFilters,
  buildLeaderboardDiscoveryUrl,
  buildLeaderboardDiscoveryCanonicalUrl,
  getClearedLeaderboardDiscoveryFilters,
  compareLeaderboardDiscoveryCards,
  buildEventLeaderboardUrl,
  buildEventLeaderboardCanonicalUrl,
  buildEventLeaderboardPresentation,
  buildEventLeaderboardGroups,
  buildEventWideLeaderboardGroup,
  buildLeaderboardCategoryCards,
  buildHighestStepsHighlight,
  buildHighestElevationHighlight,
  buildMostConsistentHighlight,
  filterEventLeaderboardGroups,
  filterEventWideLeaderboardGroup,
  applyPublicRankCutoff,
  buildAccumulatedProgressMetrics
} = require('../src/services/leaderboard.service');
const { resolveAccumulatedTargetDistanceKm } = require('../src/services/accumulated-target.service');

test('discovery filters normalize invalid values and keep legacy limits', () => {
  assert.deepEqual(normalizeLeaderboardDiscoveryFilters({ sort: 'unknown', page: '-2' }), {
    q: '', type: '', distance: '', mode: '', sort: 'recommended', page: 1, limit: 12
  });
  assert.equal(normalizeLeaderboardDiscoveryFilters({ limit: 100 }).limit, 100);
  assert.equal(normalizeLeaderboardDiscoveryFilters({ q: '  Sunrise  ', type: 'race_result', mode: 'virtual' }).q, 'Sunrise');
});

test('discovery URLs omit defaults, retain sort when clearing filters, and canonicalize sort', () => {
  const filters = { q: 'Sunrise', type: 'race_result', distance: '5k', mode: 'virtual', sort: 'recent', page: 2 };
  assert.equal(buildLeaderboardDiscoveryUrl(filters), '/leaderboard?q=Sunrise&type=race_result&distance=5K&mode=virtual&sort=recent&page=2');
  assert.equal(buildLeaderboardDiscoveryUrl(getClearedLeaderboardDiscoveryFilters(filters)), '/leaderboard?sort=recent');
  assert.equal(
    buildLeaderboardDiscoveryCanonicalUrl(filters, 2, 'https://hellorun.test/'),
    'https://hellorun.test/leaderboard?q=Sunrise&type=race_result&distance=5K&mode=virtual&page=2'
  );
});

test('all discovery sort modes are deterministic', () => {
  const older = { id: 'a', title: 'Sunrise Run', organiserName: 'A', verifiedCount: 4, isActiveOrUpcoming: true, lastUpdatedAt: '2026-07-01', eventStartAt: '2026-08-01' };
  const newer = { id: 'b', title: 'City Run', organiserName: 'Sunrise Club', verifiedCount: 9, isActiveOrUpcoming: true, lastUpdatedAt: '2026-07-15', eventStartAt: '2026-09-01' };
  assert.equal([newer, older].sort((a, b) => compareLeaderboardDiscoveryCards(a, b, { q: 'sunrise', sort: 'recommended' }))[0].id, 'a');
  assert.equal([older, newer].sort((a, b) => compareLeaderboardDiscoveryCards(a, b, { sort: 'recent' }))[0].id, 'b');
  assert.equal([older, newer].sort((a, b) => compareLeaderboardDiscoveryCards(a, b, { sort: 'most-results' }))[0].id, 'b');
  assert.equal([newer, older].sort((a, b) => compareLeaderboardDiscoveryCards(a, b, { sort: 'event-date' }))[0].id, 'a');
});

test('event URLs preserve result filters while canonical URLs keep distance and page only', () => {
  const filters = { distance: '10k', search: 'runner a', mode: 'virtual', status: 'pending', metric: 'elevation', page: 3, limit: 50 };
  assert.equal(buildEventLeaderboardUrl('city-run', filters), '/events/city-run/leaderboard?distance=10K&search=runner+a&mode=virtual&status=pending_review&metric=elevation&page=3&limit=50');
  assert.equal(buildEventLeaderboardCanonicalUrl('city-run', filters, 3, 'https://hellorun.test'), 'https://hellorun.test/events/city-run/leaderboard?distance=10K&page=3');
  assert.equal(buildEventLeaderboardUrl('city-run', { metric: 'consistency' }), '/events/city-run/leaderboard?metric=consistency');
  assert.equal(buildEventLeaderboardUrl('city-run', { metric: 'speed' }), '/events/city-run/leaderboard');
});

test('event presentation distinguishes guest, authenticated empty, and verified standing states', () => {
  const leaderboard = {
    event: { slug: 'city-run' },
    filters: { distance: '5K', search: 'ari' },
    pagination: { page: 1, totalPages: 2 }
  };
  const guest = buildEventLeaderboardPresentation(leaderboard, { isAuthenticated: false });
  assert.equal(guest.standing.state, 'guest');
  assert.match(guest.standing.loginUrl, /returnTo=/);
  assert.equal(guest.activeFilters.length, 1);

  const empty = buildEventLeaderboardPresentation(leaderboard, { isAuthenticated: true, myStanding: { standing: null } });
  assert.equal(empty.standing.state, 'none');

  const verified = buildEventLeaderboardPresentation(leaderboard, {
    isAuthenticated: true,
    myStanding: { standing: { status: 'verified', rank: 3 }, nearby: [{ rank: 2 }], stats: { verifiedEntries: 42 } }
  });
  assert.equal(verified.standing.state, 'verified');
  assert.equal(verified.standing.nearby.length, 1);
  assert.equal(verified.standing.verifiedEntries, 42);
});

test('public rank cutoff retains all exact cutoff ties and does not affect pending entries', () => {
  const groups = [{
    key: 'all-categories',
    entries: [
      { runnerName: 'Ninth', status: 'verified', rank: 9 },
      { runnerName: 'Tenth A', status: 'verified', rank: 10 },
      { runnerName: 'Tenth B', status: 'verified', rank: 10 },
      { runnerName: 'Twelfth', status: 'verified', rank: 12 },
      { runnerName: 'Pending', status: 'pending_review', rank: null }
    ]
  }];

  const [published] = applyPublicRankCutoff(groups, 10);
  assert.deepEqual(published.entries.map((entry) => entry.runnerName), ['Ninth', 'Tenth A', 'Tenth B', 'Pending']);
  assert.deepEqual(published.stats, { totalEntries: 4, verifiedEntries: 3, pendingEntries: 1 });
  assert.equal(applyPublicRankCutoff(groups, 0), groups);
});

test('event-wide public search runs only inside already-published ranks', () => {
  const [published] = applyPublicRankCutoff([{
    key: 'all-categories',
    entries: [
      { runnerName: 'Visible Runner', searchableText: 'visible runner', status: 'verified', rank: 10 },
      { runnerName: 'Hidden Runner', searchableText: 'hidden runner', status: 'verified', rank: 11 }
    ]
  }], 10);

  const searched = filterEventWideLeaderboardGroup(published, { search: 'Hidden Runner' });
  assert.equal(searched.entries.length, 0);
});

test('structured challenge categories produce ordered public-safe top-three cards', () => {
  const event = {
    raceDistances: ['25K', '50K'],
    raceCategories: [
      { categoryId: 'cns-25k', name: '25-Kilometer Challenge', distanceLabel: '25K', distanceKm: 25, targetSteps: 0 },
      { categoryId: 'cns-50k', name: '50-Kilometer Challenge', distanceLabel: '50K', distanceKm: 50, targetSteps: 0 },
      { categoryId: 'cns-steps', name: '120,000-Step Challenge', distanceLabel: '', distanceKm: 0, targetSteps: 120000 },
      { categoryId: 'cns-25k-steps', name: '25-Kilometer and 120,000-Step Challenge', distanceLabel: '', distanceKm: 25, targetSteps: 120000 },
      { categoryId: 'cns-50k-steps', name: '50-Kilometer and 120,000-Step Challenge', distanceLabel: '', distanceKm: 50, targetSteps: 120000 }
    ]
  };
  const entries = [
    { runnerName: 'Runner One', category: '25K', status: 'verified', totalDistanceKm: 40 },
    { runnerName: 'Runner Two', category: '25K', status: 'verified', totalDistanceKm: 30 },
    { runnerName: 'Runner Three', category: '25K', status: 'verified', totalDistanceKm: 20 },
    { runnerName: 'Runner Four', category: '25K', status: 'verified', totalDistanceKm: 10 },
    { runnerName: 'Pending Runner', category: '25K', status: 'pending_review', primaryTotal: 50, primaryMetricLabel: '50 km' }
  ];

  const groups = buildEventLeaderboardGroups(entries, event, { includeConfiguredDistances: true });
  const cards = buildLeaderboardCategoryCards(groups);

  assert.equal(groups.length, 5);
  assert.deepEqual(groups.map((group) => group.label), event.raceCategories.map((category) => category.name));
  assert.equal(cards[0].goalLabel, '25 km');
  assert.equal(cards[2].goalLabel, '120,000 steps');
  assert.equal(cards[3].goalLabel, '25 km + 120,000 steps');
  assert.deepEqual(cards[0].leaders.map((leader) => leader.runnerName), ['Runner One', 'Runner Two', 'Runner Three']);
  assert.deepEqual(cards[0].leaders.map((leader) => leader.primaryMetricLabel), ['160% complete', '120% complete', '80% complete']);
  assert.equal(cards[0].stats.verifiedEntries, 4);
  assert.equal(cards[0].stats.pendingEntries, 1);
  assert.equal(cards.some((card) => card.leaders.some((leader) => leader.runnerName === 'Pending Runner')), false);
  assert.equal(Object.prototype.hasOwnProperty.call(cards[0].leaders[0], 'userId'), false);
});

test('category card links discard overall metrics while award standings discard category filters', () => {
  const presentation = buildEventLeaderboardPresentation({
    event: { slug: 'move-more' },
    settings: { type: 'accumulated_challenge', primaryMetric: 'elevation', trackedMetrics: ['distance', 'steps', 'elevation', 'consistency'] },
    filters: { distance: '25K', metric: 'elevation', search: 'runner' },
    activeDistance: { key: 'all-categories', label: 'All categories' },
    isEventWideMetricView: true,
    categoryCards: [
      { key: '25K', label: '25K Challenge', stats: { totalEntries: 1, verifiedEntries: 1 }, leaders: [] },
      { key: '50K', label: '50K Challenge', stats: { totalEntries: 0, verifiedEntries: 0 }, leaders: [] }
    ],
    distanceOptions: [{ key: '25K' }, { key: '50K' }],
    pagination: { page: 1, totalPages: 1 }
  }, { isAuthenticated: false });

  assert.equal(presentation.showCategoryCards, true);
  assert.equal(presentation.showCategoryColumn, true);
  assert.deepEqual(presentation.overviewStats, {
    categoryCount: 2,
    totalEntries: 1,
    verifiedEntries: 1,
    pendingEntries: 0,
    lastUpdatedAt: null
  });
  assert.deepEqual(presentation.categoryCards.map((card) => card.active), [false, false]);
  assert.equal(presentation.categoryCards[1].href, '/events/move-more/leaderboard?distance=50K#official-standings');
  assert.doesNotMatch(presentation.categoryCards[1].href, /search=/);
  assert.equal(presentation.metricOptions.find((metric) => metric.key === 'elevation').label, 'Highest Elevation');
  assert.equal(presentation.getMetricUrl('elevation'), '/events/move-more/leaderboard?search=runner&metric=elevation');
  assert.equal(presentation.pagination.getPageUrl(2), '/events/move-more/leaderboard?search=runner&metric=elevation&page=2#official-standings');
});

test('combined category leaders use the lower uncapped goal percentage and share exact ranks', () => {
  const groups = [{
    key: 'dual', label: 'Dual', goalLabel: '25 km + 120,000 steps', distanceKm: 25, targetSteps: 120000,
    stats: { totalEntries: 3, verifiedEntries: 3, pendingEntries: 0 },
    entries: [
      { registrationId: 'a', runnerName: 'Distance Heavy', status: 'verified', totalDistanceKm: 50, totalSteps: 60000 },
      { registrationId: 'b', runnerName: 'Balanced One', status: 'verified', totalDistanceKm: 30, totalSteps: 120000 },
      { registrationId: 'c', runnerName: 'Balanced Two', status: 'verified', totalDistanceKm: 25, totalSteps: 144000 }
    ]
  }];
  const leaders = buildLeaderboardCategoryCards(groups)[0].leaders;
  assert.deepEqual(leaders.map((leader) => [leader.runnerName, leader.rank, leader.primaryMetricLabel]), [
    ['Balanced One', 1, '100% complete'],
    ['Balanced Two', 1, '100% complete'],
    ['Distance Heavy', 3, '50% complete']
  ]);
});

test('event-wide step and consistency recognitions return exact eligible co-leaders', () => {
  const groups = [{ entries: [
    { runnerName: 'Ada R.', categoryLabel: '25K', status: 'verified', totalSteps: 200000, activeDays: 20, totalDistanceKm: 50, totalElevationGain: 100 },
    { runnerName: 'Bea T.', categoryLabel: 'Steps', status: 'verified', totalSteps: 200000, activeDays: 20, totalDistanceKm: 50, totalElevationGain: 100 },
    { runnerName: 'Cal U.', categoryLabel: '50K', status: 'verified', totalSteps: 210000, activeDays: 19, totalDistanceKm: 80, totalElevationGain: 200, suspiciousFlag: true },
    { runnerName: 'Pending', status: 'pending_review', totalSteps: 300000, activeDays: 25 }
  ] }];
  const settings = { type: 'accumulated_challenge', showHighestStepsCard: true, showMostConsistentCard: true };
  const steps = buildHighestStepsHighlight(groups, settings);
  const consistency = buildMostConsistentHighlight(groups, settings);
  assert.equal(steps.resultLabel, '200,000 steps');
  assert.deepEqual(steps.leaders.map((leader) => leader.runnerName), ['Ada R.', 'Bea T.']);
  assert.equal(consistency.resultLabel, '20 active days');
  assert.deepEqual(consistency.leaders.map((leader) => leader.runnerName), ['Ada R.', 'Bea T.']);
});

test('event-wide standings recombine categories and restore global shared ranks', () => {
  const group = buildEventWideLeaderboardGroup([
    { entries: [{ registrationId: 'a', status: 'verified', runnerName: 'A', primaryTotal: 100, categoryLabel: '25K', totalSteps: 100 }] },
    { entries: [
      { registrationId: 'b', status: 'verified', runnerName: 'B', primaryTotal: 200, categoryLabel: 'Steps', totalSteps: 200 },
      { registrationId: 'c', status: 'verified', runnerName: 'C', primaryTotal: 100, categoryLabel: 'Dual', totalSteps: 100 }
    ] }
  ], 'steps');
  assert.equal(group.key, 'all-categories');
  assert.deepEqual(group.entries.map((entry) => [entry.runnerName, entry.rank]), [['B', 1], ['A', 2], ['C', 2]]);
  assert.equal(group.stats.verifiedEntries, 3);
});

test('request filters are applied to cached base groups without mutating ranks or leaking between requests', () => {
  const baseGroups = [{
    key: '5K', label: '5K', stats: { totalEntries: 3, verifiedEntries: 2, pendingEntries: 1 }, entries: [
      { rank: 1, runnerName: 'Ari S.', category: '5K', participationMode: 'virtual', status: 'verified', searchableText: 'ari s hr-one' },
      { rank: 2, runnerName: 'Bea T.', category: '5K', participationMode: 'onsite', status: 'verified', searchableText: 'bea t hr-two' },
      { rank: null, runnerName: 'Cal U.', category: '5K', participationMode: 'virtual', status: 'pending_review', searchableText: 'cal u hr-three' }
    ]
  }];
  const event = { raceDistances: ['5K'] };
  const ari = filterEventLeaderboardGroups(baseGroups, event, { search: 'ari' });
  const onsite = filterEventLeaderboardGroups(baseGroups, event, { mode: 'onsite' });
  const pending = filterEventLeaderboardGroups(baseGroups, event, { status: 'pending_review' });

  assert.deepEqual(ari[0].entries.map((entry) => entry.runnerName), ['Ari S.']);
  assert.equal(ari[0].entries[0].rank, 1);
  assert.deepEqual(onsite[0].entries.map((entry) => entry.runnerName), ['Bea T.']);
  assert.equal(onsite[0].entries[0].rank, 2);
  assert.deepEqual(pending[0].entries.map((entry) => entry.runnerName), ['Cal U.']);
  assert.equal(baseGroups[0].entries.length, 3);
  assert.equal(Object.hasOwn(baseGroups[0].entries[0], 'searchableText'), true);
});

test('highest elevation recognition is event-wide, tied, verified, and presentation-safe', () => {
  const baseGroups = [
    {
      key: '25K',
      entries: [
        { runnerName: 'Ada R.', categoryLabel: '25K Challenge', status: 'verified', elevationGain: 740, latestVerificationLabel: 'Aug 10, 2026' },
        { runnerName: 'Pending Runner', categoryLabel: '25K Challenge', status: 'pending_review', elevationGain: 900 },
        { runnerName: 'Flagged Runner', categoryLabel: '25K Challenge', status: 'verified', elevationGain: 950, suspiciousFlag: true }
      ]
    },
    {
      key: '50K',
      entries: [
        { runnerName: 'Bea T.', categoryLabel: '50K Challenge', status: 'verified', elevationGain: 740 },
        { runnerName: 'Zero Runner', categoryLabel: '50K Challenge', status: 'verified', elevationGain: 0 }
      ]
    }
  ];

  const highlight = buildHighestElevationHighlight(baseGroups, {
    type: 'accumulated_challenge',
    showHighestElevationCard: true
  });

  assert.equal(highlight.enabled, true);
  assert.equal(highlight.totalElevationGain, 740);
  assert.equal(highlight.elevationLabel, '740 m gained');
  assert.deepEqual(highlight.leaders.map((leader) => leader.runnerName), ['Ada R.', 'Bea T.']);
  assert.deepEqual(highlight.leaders.map((leader) => leader.categoryLabel), ['25K Challenge', '50K Challenge']);
  assert.equal(Object.hasOwn(highlight.leaders[0], 'userId'), false);

  assert.deepEqual(
    buildHighestElevationHighlight(baseGroups, { type: 'accumulated_challenge' }),
    { enabled: false, leaders: [], totalElevationGain: 0, elevationLabel: '' }
  );
});

test('highest elevation presentation remains independent of selected category and metric', () => {
  const presentation = buildEventLeaderboardPresentation({
    event: { slug: 'move-more' },
    settings: { type: 'accumulated_challenge', primaryMetric: 'steps', trackedMetrics: ['distance', 'steps', 'elevation'] },
    filters: { distance: '25K', metric: 'steps', search: 'someone-else', page: 3 },
    highlights: {
      highestElevation: {
        enabled: true,
        leaders: [{ runnerName: 'Ada R.', categoryLabel: '50K Challenge', elevationGain: 740, elevationLabel: '740 m gained' }],
        totalElevationGain: 740,
        elevationLabel: '740 m gained'
      }
    },
    distanceOptions: [{ key: '25K' }, { key: '50K' }],
    pagination: { page: 3, totalPages: 3 }
  }, { isAuthenticated: false });

  assert.equal(presentation.highestElevation.leaders[0].runnerName, 'Ada R.');
  assert.equal(presentation.highestElevation.elevationLabel, '740 m gained');
  assert.equal(presentation.highestElevation.state, 'populated');
  assert.equal(presentation.highestElevation.href, '/events/move-more/leaderboard?metric=elevation#official-standings');
});

test('highest elevation presentation distinguishes pre-event and active empty states', () => {
  const leaderboard = {
    event: { slug: 'move-more', eventStartAt: '2026-09-01T00:00:00+08:00' },
    settings: { type: 'accumulated_challenge', primaryMetric: 'distance', trackedMetrics: ['distance', 'elevation'] },
    filters: {},
    highlights: {
      highestElevation: { enabled: true, leaders: [], totalElevationGain: 0, elevationLabel: '' }
    },
    pagination: { page: 1, totalPages: 1 }
  };

  const before = buildEventLeaderboardPresentation(leaderboard, {
    isAuthenticated: false,
    now: '2026-08-31T23:59:59+08:00'
  });
  assert.equal(before.highestElevation.state, 'pre_event');
  assert.equal(before.highestElevation.startLabel, 'September 1');

  const active = buildEventLeaderboardPresentation(leaderboard, {
    isAuthenticated: false,
    now: '2026-09-01T00:00:00+08:00'
  });
  assert.equal(active.highestElevation.state, 'awaiting_results');
});

test('highest elevation is built before request filtering', () => {
  const source = require('node:fs').readFileSync(require.resolve('../src/services/leaderboard.service'), 'utf8');
  const highlightIndex = source.indexOf('buildHighestElevationHighlight(recognitionGroups, settings)');
  const filteredGroupIndex = source.indexOf('filterEventLeaderboardGroups(publishedGroups, event, effectiveOptions)');
  assert.ok(filteredGroupIndex > -1);
  assert.ok(highlightIndex > filteredGroupIndex);
  assert.match(source, /settings\.primaryMetric === 'consistency'[\s\S]*primaryMetric: 'distance'/);
  assert.match(source, /hideFlagged: true/);
});

test('accumulated progress retains precise totals while clamping only the visual bar', () => {
  const progress = buildAccumulatedProgressMetrics(390.65, 2026);
  assert.equal(progress.progressPercentage, 19.3);
  assert.equal(progress.progressBarPercentage, 19.3);
  assert.equal(progress.remainingDistanceKm, 1635.35);
  assert.equal(progress.remainingDistanceLabel, '1,635.35 km');
  assert.equal(progress.progressLabel, '19.3% of 2,026 km');
  assert.equal(progress.isGoalComplete, false);

  const complete = buildAccumulatedProgressMetrics(2200, 2026);
  assert.equal(complete.progressPercentage, 108.6);
  assert.equal(complete.progressBarPercentage, 100);
  assert.equal(complete.remainingDistanceKm, 0);
  assert.equal(complete.isGoalComplete, true);

  const missing = buildAccumulatedProgressMetrics(20, 0);
  assert.equal(missing.progressPercentage, null);
  assert.equal(missing.remainingDistanceKm, null);
});

test('accumulated targets prefer category, then selected distance, then event fallback', () => {
  const event = {
    targetDistanceKm: 2026,
    raceCategories: [{ categoryId: 'cat-100', distanceKm: 100 }]
  };
  assert.equal(resolveAccumulatedTargetDistanceKm({ pricingSnapshot: { raceCategoryId: 'cat-100' }, raceDistance: '50K' }, event), 100);
  assert.equal(resolveAccumulatedTargetDistanceKm({ raceDistance: '50K' }, event), 50);
  assert.equal(resolveAccumulatedTargetDistanceKm({}, event), 2026);
});

test('accumulated presentation hides redundant single-category controls without changing race pages', () => {
  const base = {
    event: { slug: 'challenge', modes: ['virtual'] },
    settings: { type: 'accumulated_challenge', showPending: false },
    filters: { distance: '2026K' },
    distanceOptions: [{ key: '2026K', label: '2026K' }],
    pagination: { page: 1, totalPages: 1 }
  };
  const accumulated = buildEventLeaderboardPresentation(base, { isAuthenticated: false });
  assert.equal(accumulated.isAccumulated, true);
  assert.equal(accumulated.showDistanceNavigation, false);
  assert.equal(accumulated.showModeFilter, false);
  assert.equal(accumulated.showStatusFilter, false);
  assert.equal(accumulated.showAdvancedFilters, false);
  assert.equal(accumulated.showCategoryColumn, false);

  const race = buildEventLeaderboardPresentation({
    ...base,
    event: { slug: 'race', modes: ['virtual', 'onsite'] },
    settings: { type: 'race_result', showPending: true },
    distanceOptions: [{ key: '5K' }, { key: '10K' }]
  }, { isAuthenticated: false });
  assert.equal(race.isAccumulated, false);
  assert.equal(race.showDistanceNavigation, true);
  assert.equal(race.showAdvancedFilters, true);
  assert.equal(race.showCategoryColumn, true);
});
