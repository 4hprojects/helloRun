const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const {
  buildActiveQuestPublicPage,
  getPhtYearMonth
} = require('../src/services/active-quest-public.service');

function edition(overrides = {}) {
  return {
    _id: `event-${overrides.seriesMonth || 11}`,
    title: 'November Active Quest 2026',
    slug: 'november-active-quest-2026',
    status: 'published',
    seriesYear: 2026,
    seriesMonth: 11,
    registrationOpenAt: new Date('2026-10-24T16:00:00.000Z'),
    registrationCloseAt: new Date('2026-11-22T15:59:59.999Z'),
    eventStartAt: new Date('2026-10-31T16:00:00.000Z'),
    eventEndAt: new Date('2026-11-30T15:59:59.999Z'),
    raceDistances: ['25K', '50K', '75K', '100K', '150K', '200K'],
    seriesSnapshot: { categories: [], rewardRequirements: {} },
    ...overrides
  };
}

test('PHT month selection is stable across UTC day boundaries', () => {
  assert.deepEqual(getPhtYearMonth(new Date('2026-10-31T16:30:00.000Z')), { year: 2026, month: 11 });
});

test('landing features current published edition and truthful registration state', () => {
  const page = buildActiveQuestPublicPage({
    events: [edition()],
    now: new Date('2026-11-01T00:00:00.000Z')
  });
  assert.equal(page.featuredRelation, 'current');
  assert.equal(page.featured.registrationState, 'open');
  assert.equal(page.featured.registrationHref, '/events/november-active-quest-2026/register');
});

test('unpublished future edition is never presented as accepting registrations', () => {
  const page = buildActiveQuestPublicPage({
    events: [edition({ status: 'draft' })],
    now: new Date('2026-11-01T00:00:00.000Z')
  });
  assert.equal(page.featured, null);
  assert.equal(page.hasPublishedEditions, false);
});

test('year archive filters editions without renaming historical titles or slugs', () => {
  const historical = edition({
    title: 'September Active Run 2026',
    slug: 'september-active-run-2026',
    seriesMonth: 9
  });
  const page = buildActiveQuestPublicPage({ events: [historical, edition()], selectedYear: 2026 });
  assert.equal(page.archiveEvents[1].title, 'September Active Run 2026');
  assert.equal(page.archiveEvents[1].href, '/events/september-active-run-2026');
});

test('missing archive year returns an actionable empty state', () => {
  const page = buildActiveQuestPublicPage({ events: [edition()], selectedYear: 2027 });
  assert.equal(page.archiveEvents.length, 0);
  assert.equal(page.hasPublishedEditions, true);
});

test('public view compiles with landmarks, labels, archive, and no unconfigured reward claim', async () => {
  const filename = path.join(__dirname, '../src/views/pages/active-quest.ejs');
  const source = fs.readFileSync(filename, 'utf8');
  const page = buildActiveQuestPublicPage({ events: [edition()], now: new Date('2026-11-01T00:00:00.000Z') });
  const html = await ejs.render(source, {
    title: 'Active Quest',
    seo: {},
    page,
    locals: {
      isAuthenticated: false,
      isRunnerWorkspace: false,
      cspNonce: '',
      buildNavigation: () => ({ primary: [], account: [], accountMenu: [], auth: [], workspaceSwitch: null, bottom: null, isRunnerWorkspace: false }),
      ads: {},
      canUseAnalytics: false
    },
    process
  }, { filename });
  assert.match(html, /id="main-content"/);
  assert.match(html, /Your Distance\. Your Pace\. Your Quest\./);
  assert.match(html, /Screenshot submission is available/i);
  assert.match(html, /automatic sync is coming soon/i);
  assert.doesNotMatch(html, /Configured digital rewards/);
});

test('public routes are declared before the generic event slug route', () => {
  const routes = fs.readFileSync(path.join(__dirname, '../src/routes/pageRoutes.js'), 'utf8');
  assert.ok(routes.indexOf("router.get('/active-quest'") < routes.indexOf("router.get('/events/:slug'"));
  assert.match(routes, /router\.get\('\/active-quest\/:year', pageController\.getActiveQuestYear\)/);
});
