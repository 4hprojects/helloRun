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
  assert.match(view, /homeLeaderboard\.entries\.forEach/);
  assert.match(view, /Full leaderboard/);
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

test('homepage leaderboard CSS provides desktop, stacked, and narrow-row layouts', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/public/css/helloRun.css'), 'utf8');

  assert.match(css, /\.hero-container\.has-leaderboard[\s\S]*grid-template-columns/);
  assert.match(css, /@media \(max-width: 1199px\)[\s\S]*\.hero-container\.has-leaderboard[\s\S]*display: block/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*\.home-leaderboard-entry[\s\S]*grid-template-columns/);
});
