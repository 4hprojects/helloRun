const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('homepage hero renders a scoped leaderboard and retains a card-free fallback', () => {
  const view = fs.readFileSync(path.join(ROOT, 'src/views/pages/home.ejs'), 'utf8');

  assert.match(view, /homeLeaderboard \? ' has-leaderboard' : ''/);
  assert.match(view, /if \(homeLeaderboard\)/);
  assert.match(view, /Verified results/);
  assert.match(view, /homeLeaderboard\.eventTitle/);
  assert.match(view, /homeLeaderboard\.categoryLabel/);
  assert.match(view, /homeLeaderboard\.rankingExplanation/);
  assert.match(view, /homeLeaderboard\.entries\.forEach/);
  assert.match(view, /<table class="home-leaderboard-table">/);
  assert.match(view, /<caption>Top verified standings for/);
  assert.match(view, /aria-label="Top <%= homeLeaderboard\.entries\.length %> verified standings; scroll for more results"/);
  assert.match(view, /scope="col">Rank/);
  assert.match(view, /scope="row" class="home-leaderboard-runner"/);
  assert.match(view, /View full standings/);
  assert.doesNotMatch(view, /home-leaderboard-trophy/);
  assert.doesNotMatch(view, /home-leaderboard-live-dot/);
  assert.doesNotMatch(view, /home-leaderboard-entry/);
  assert.doesNotMatch(view, /hero-result-card/);
  assert.doesNotMatch(view, /June Active Quest 5K/);
});

test('homepage controller degrades leaderboard failures without failing the page', () => {
  const controller = fs.readFileSync(path.join(ROOT, 'src/controllers/page/home.controller.js'), 'utf8');

  assert.match(controller, /getHomepageLeaderboard\(\)\.catch/);
  assert.match(controller, /return null/);
  assert.match(controller, /homeLeaderboard/);
});

test('homepage leaderboard is scoped to the 2026K event', () => {
  const service = fs.readFileSync(path.join(ROOT, 'src/services/leaderboard.service.js'), 'utf8');

  assert.match(service, /HOMEPAGE_LEADERBOARD_EVENT_SLUG = '2026k-hellorun-challenge-4'/);
  assert.match(service, /eventSlug: HOMEPAGE_LEADERBOARD_EVENT_SLUG/);
  assert.match(service, /event\.virtualCompletionMode === 'accumulated_distance'[\s\S]*\? 'accumulated_challenge'/);
});

test('homepage leaderboard CSS provides a compact responsive sports table', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/public/css/helloRun.css'), 'utf8');

  assert.match(css, /\.hero-container\.has-leaderboard[\s\S]*grid-template-columns/);
  assert.match(css, /@media \(max-width: 1199px\)[\s\S]*\.hero-container\.has-leaderboard[\s\S]*display: block/);
  assert.match(css, /\.home-leaderboard\s*\{[\s\S]*max-width:\s*430px/);
  assert.match(css, /\.home-leaderboard-table\s*\{[\s\S]*table-layout:\s*fixed/);
  assert.match(css, /\.home-leaderboard-table-wrap\s*\{[\s\S]*max-height:\s*314px;[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.home-leaderboard-table thead\s*\{[\s\S]*position:\s*sticky/);
  assert.match(css, /\.home-leaderboard-table tbody tr \+ tr th,[\s\S]*border-top:/);
  assert.match(css, /\.home-leaderboard-rank-1[\s\S]*\.home-leaderboard-rank-2[\s\S]*\.home-leaderboard-rank-3/);
  assert.match(css, /\.home-leaderboard h2\s*\{[\s\S]*padding:\s*0;[\s\S]*text-align:\s*left/);
  assert.match(css, /\.home-leaderboard h2::after\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /\.hero \.home-leaderboard-context\s*\{[\s\S]*font-size:\s*0\.72rem/);
  assert.match(css, /\.home-leaderboard-link\s*\{[\s\S]*min-height:\s*44px/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*\.home-leaderboard-table thead th:last-child[\s\S]*width:\s*45%/);
});

test('desktop hero balances two-line copy against the fixed-width standings card', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/public/css/helloRun.css'), 'utf8');

  assert.match(css, /\.hero-container\.has-leaderboard\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) 430px/);
  assert.match(css, /\.hero-container\.has-leaderboard \.hero-text\s*\{[\s\S]*text-align:\s*left/);
  assert.match(css, /\.hero-container\.has-leaderboard \.hero-title \.highlight\s*\{[\s\S]*display:\s*block;[\s\S]*white-space:\s*nowrap/);
  assert.match(css, /\.hero-container\.has-leaderboard \.hero-cta-row\s*\{[\s\S]*justify-content:\s*flex-start/);
  assert.match(css, /@media \(max-width: 1199px\)[\s\S]*\.hero-container\.has-leaderboard \.hero-text[\s\S]*text-align:\s*center/);
  assert.match(css, /@media \(max-width: 1199px\)[\s\S]*\.hero-container\.has-leaderboard \.hero-title \.highlight[\s\S]*white-space:\s*normal/);
});
