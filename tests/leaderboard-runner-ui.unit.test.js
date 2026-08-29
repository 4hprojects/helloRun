const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.resolve(__dirname, '..');
const discovery = fs.readFileSync(path.join(root, 'src/views/pages/leaderboard.ejs'), 'utf8');
const standings = fs.readFileSync(path.join(root, 'src/views/pages/event-leaderboard.ejs'), 'utf8');
const standingPartial = fs.readFileSync(path.join(root, 'src/views/pages/_event-leaderboard-standing.ejs'), 'utf8');
const standingsTemplates = `${standings}\n${standingPartial}`;
const css = fs.readFileSync(path.join(root, 'src/public/css/leaderboard.css'), 'utf8');

test('leaderboard templates compile and retain server-rendered forms', () => {
  ejs.compile(discovery, { filename: path.join(root, 'src/views/pages/leaderboard.ejs') });
  ejs.compile(standings, { filename: path.join(root, 'src/views/pages/event-leaderboard.ejs') });
  ejs.compile(standingPartial, { filename: path.join(root, 'src/views/pages/_event-leaderboard-standing.ejs') });
  assert.match(discovery, /method="GET" action="\/leaderboard"/);
  assert.match(standings, /method="GET" action="\/events\/<%= event\.slug %>\/leaderboard"/);
});

test('multi-category accumulated leaderboard renders its standing partial', async () => {
  const categories = ['25K Challenge', '50K Challenge', '120K Steps', '25K + 120K Steps', '50K + 120K Steps'];
  const categoryCards = categories.map((label, index) => ({
    key: `category-${index + 1}`,
    label,
    goalLabel: label,
    active: index === 0,
    href: `/events/cns-move-more-challenge-2026/leaderboard?distance=category-${index + 1}`,
    stats: { totalEntries: 0, verifiedEntries: 0, pendingEntries: 0 },
    leaders: []
  }));
  const leaderboard = {
    event: {
      title: 'CNS Move More Challenge 2026',
      slug: 'cns-move-more-challenge-2026',
      modes: ['virtual'],
      dateLabel: 'September 1–30, 2026',
      primaryChallengeMetric: 'distance',
      targetDistanceLabel: 'Goal varies by category',
      targetStepsLabel: 'Goal varies by category'
    },
    settings: {
      type: 'accumulated_challenge',
      primaryMetric: 'distance',
      trackedMetrics: ['distance', 'steps'],
      showPending: false,
      publicRankCutoff: 10
    },
    filters: { distance: 'category-1', metric: '', mode: '', status: '', search: '' },
    activeDistance: { key: 'category-1', label: categories[0], goalLabel: categories[0] },
    categoryCards,
    distanceOptions: categoryCards,
    officialEntries: [],
    pendingEntries: [],
    stats: { totalEntries: 0, verifiedEntries: 0, pendingEntries: 0, lastUpdatedAt: null },
    pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
    rankingExplanation: 'Ranked by highest verified distance.'
  };
  const presentation = {
    isAccumulated: true,
    showCategoryCards: true,
    categoryCards,
    overviewStats: { categoryCount: 5, totalEntries: 0, verifiedEntries: 0, pendingEntries: 0 },
    recognitions: [
      { enabled: true, key: 'highestSteps', metric: 'steps', title: 'Highest Steps', icon: 'footprints', state: 'populated', resultLabel: '200,000 steps', leaders: [{ runnerName: 'Cia V.', categoryLabel: '120K Steps' }], href: '/events/cns-move-more-challenge-2026/leaderboard?metric=steps#official-standings' },
      { enabled: true, key: 'highestElevation', metric: 'elevation', title: 'Highest Elevation', icon: 'mountain-snow', state: 'populated', resultLabel: '740 m gained', leaders: [{ runnerName: 'Ada R.', categoryLabel: '25K Challenge' }, { runnerName: 'Bea T.', categoryLabel: '50K Challenge' }], href: '/events/cns-move-more-challenge-2026/leaderboard?metric=elevation#official-standings' },
      { enabled: true, key: 'mostConsistent', metric: 'consistency', title: 'Most Consistent', icon: 'calendar-check', state: 'awaiting_results', emptyLabel: 'No participant has reached 15 approved active days yet.', leaders: [], href: '/events/cns-move-more-challenge-2026/leaderboard?metric=consistency#official-standings' }
    ],
    showMetricNavigation: true,
    metricOptions: [],
    showCategoryColumn: false,
    showAdvancedFilters: false,
    activeFilters: [],
    hasActiveFilters: false,
    clearFiltersUrl: '/events/cns-move-more-challenge-2026/leaderboard',
    pagination: { page: 1, totalPages: 1, getPageUrl: () => '#' },
    standing: { state: 'guest', entry: null, loginUrl: '/login' },
    getMetricUrl: () => '#'
  };

  const renderLocals = {
    title: 'CNS Move More Challenge 2026 Leaderboard - HelloRun',
    leaderboard,
    presentation,
    myStanding: null,
    seo: { canonicalUrl: 'https://hellorun.online/events/cns-move-more-challenge-2026/leaderboard' },
    currentPath: '/events/cns-move-more-challenge-2026/leaderboard',
    isAuthenticated: false,
    isAdmin: false,
    isOrganizer: false,
    isApprovedOrganizer: false,
    isRunnerWorkspace: false,
    isOrganizerWorkspace: false,
    isFullAdmin: false,
    runnerUnreadNotifications: 0,
    renderRunProofModal: false,
    csrfToken: '',
    flash: null,
    canUseAnalytics: false,
    canUseFunctionalStorage: false,
    cookiePreferences: { functional: false, analytics: false, advertising: false },
    ads: { loadConsentScript: false, publisherId: '' }
  };
  const html = await ejs.renderFile(path.join(root, 'src/views/pages/event-leaderboard.ejs'), renderLocals);

  assert.match(html, /5 categories/);
  assert.match(html, /Find your personal result/);
  assert.match(html, /Category Leaders/);
  assert.match(html, /Event-wide Recognition/);
  assert.match(html, /Public standings show rank #10 or better, including exact ties/);
  assert.match(html, /Highest Steps/);
  assert.match(html, /Highest Elevation/);
  assert.match(html, /Most Consistent/);
  assert.match(html, /Ada R\./);
  assert.match(html, /Bea T\./);
  assert.match(html, /740 m gained/);
  assert.match(html, /metric=elevation#official-standings/);
  assert.doesNotMatch(html, /Aug 10, 2026|Aug 11, 2026/);

  const preEventHtml = await ejs.renderFile(path.join(root, 'src/views/pages/event-leaderboard.ejs'), {
    ...renderLocals,
    presentation: {
      ...presentation,
      recognitions: presentation.recognitions.map((item) => ({ ...item, state: 'pre_event', startLabel: 'September 1', leaders: [] }))
    }
  });
  assert.match(preEventHtml, /Recognition begins September 1/);
  assert.match(preEventHtml, /approved results across all five categories/);
  assert.doesNotMatch(preEventHtml, /Demo |260 m gained|View elevation standings|View steps standings|View consistency standings/);

  const emptyHtml = await ejs.renderFile(path.join(root, 'src/views/pages/event-leaderboard.ejs'), {
    ...renderLocals,
    presentation: {
      ...presentation,
      recognitions: presentation.recognitions.map((item) => ({
        ...item,
        state: 'awaiting_results',
        leaders: [],
        emptyLabel: item.metric === 'elevation' ? 'No approved elevation has been recorded yet.' : item.emptyLabel
      }))
    }
  });
  assert.match(emptyHtml, /No approved elevation has been recorded yet/);
  assert.doesNotMatch(emptyHtml, /Demo |260 m gained|View elevation standings/);
});

test('discovery uses compact search, aligned sorting, disclosed filters, chips, and pagination', () => {
  assert.match(discovery, /leaderboard-compact-header/);
  assert.match(discovery, /<label for="leaderboard-sort">Sort by<\/label>/);
  assert.match(discovery, /<details class="leaderboard-filter-panel"/);
  assert.match(discovery, /leaderboard-filter-chip/);
  assert.match(discovery, /leaderboard\.pagination/);
  assert.doesNotMatch(discovery, /after_results_meta/);
});

test('standings prioritize personal state and separate pending results from official ranks', () => {
  assert.match(standingPartial, /standingView\.state === 'verified'/);
  assert.match(standingPartial, /standingView\.state === 'guest'/);
  assert.match(standingPartial, /standing\.categoryLabel \|\| activeDistance\.label/);
  assert.match(standingPartial, /No result for this category yet/);
  assert.match(standings, /id="official-standings"/);
  assert.match(standings, /<details class="leaderboard-pending-section"/);
  assert.match(standings, /Public, but not officially ranked/);
  assert.match(standings, /<caption>/);
});

test('accumulated standings render progress metrics and isolate race time and pace columns', () => {
  assert.match(standingsTemplates, /Goal: \$\{selectedGoalLabel\}/);
  assert.match(standingsTemplates, /Verified distance/);
  assert.match(standingsTemplates, /Highest Elevation/);
  assert.match(standingsTemplates, /isAlternateRanking \? 'Viewing ranking' : 'Official ranking'/);
  assert.match(standingsTemplates, /primaryMetric === 'elevation' && hasDistanceMetric/);
  assert.match(standingsTemplates, /primaryMetric === 'elevation' && hasStepsMetric/);
  assert.match(standingsTemplates, /Goal progress/);
  assert.match(standingsTemplates, /Remaining/);
  assert.match(standingsTemplates, /Activities/);
  assert.match(standingsTemplates, /Latest verification/);
  assert.match(standingsTemplates, /role="progressbar"/);
  assert.match(standingsTemplates, /presentation\.showCategoryCards/);
  assert.match(standingsTemplates, /overviewStats\.verifiedEntries/);
  assert.match(standingsTemplates, /selectedGoalLabel/);
  assert.match(standingsTemplates, /entry\.categoryLabel \|\| entry\.category/);
  assert.match(standingsTemplates, /presentation\.showAdvancedFilters/);
  assert.match(standingsTemplates, /<% \} else \{ %>[\s\S]*<th scope="col">Time<\/th>[\s\S]*<th scope="col">Pace<\/th>/);
});

test('multi-category content orders categories, recognition, metrics, My Standing, and details', () => {
  const metricIndex = standings.indexOf('aria-label="Leaderboard metric"');
  const categoryIndex = standings.indexOf('leaderboard-category-overview');
  const recognitionIndex = standings.indexOf('leaderboard-recognition-overview');
  const standingIndex = standings.lastIndexOf("include('_event-leaderboard-standing',");
  const detailsIndex = standings.indexOf('leaderboard-result-controls');
  assert.ok(metricIndex > -1);
  assert.ok(categoryIndex < recognitionIndex);
  assert.ok(recognitionIndex < metricIndex);
  assert.ok(metricIndex < standingIndex);
  assert.ok(standingIndex < detailsIndex);
});

test('responsive CSS provides explicit 3-2-1 grids, touch targets, focus, and reduced motion', () => {
  assert.match(standings, /leaderboard-category-grid/);
  assert.match(standings, /No verified runners yet/);
  assert.match(standings, /aria-current="page"/);
  assert.match(css, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.leaderboard-category-grid \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.leaderboard-category-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.leaderboard-category-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.leaderboard-recognition-grid \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.leaderboard-recognition-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
