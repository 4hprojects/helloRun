const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_PUBLISHER_ID,
  canRenderAdPlacement,
  normalizeAdSettings,
  normalizePublisherId,
  normalizeSlotId,
  resolveAdPageGroup,
  shouldLoadAdScript
} = require('../src/services/ad-setting.service');

test('ad settings normalize global controls, publisher id, page groups, placements, and slots', () => {
  const settings = normalizeAdSettings({
    enabled: 'on',
    scriptEnabled: '1',
    publisherId: 'ca-pub-4537208011192461',
    group_home_enabled: 'on',
    placement_home_after_features_enabled: 'on',
    slot_home_after_features: '123 456 7890',
    group_events_enabled: 'on',
    placement_events_in_feed_enabled: 'on',
    slot_events_in_feed: 'abc987654321xyz'
  });

  assert.equal(settings.enabled, true);
  assert.equal(settings.scriptEnabled, true);
  assert.equal(settings.publisherId, 'ca-pub-4537208011192461');
  assert.equal(settings.pageGroups.home.enabled, true);
  assert.equal(settings.pageGroups.home.placements.after_features.enabled, true);
  assert.equal(settings.pageGroups.home.placements.after_features.slotId, '1234567890');
  assert.equal(settings.pageGroups.events.placements.in_feed.slotId, '987654321');
});

test('ad settings reject invalid publisher ids and unchecked placement controls', () => {
  const settings = normalizeAdSettings({
    enabled: 'on',
    scriptEnabled: 'on',
    publisherId: 'not-valid',
    group_home_enabled: 'on',
    slot_home_after_features: '1234567890'
  });

  assert.equal(settings.publisherId, DEFAULT_PUBLISHER_ID);
  assert.equal(settings.pageGroups.home.enabled, true);
  assert.equal(settings.pageGroups.home.placements.after_features.enabled, false);
  assert.equal(canRenderAdPlacement(settings, 'home', 'after_features'), false);
  assert.equal(shouldLoadAdScript(settings, 'home'), false);
});

test('ad placement rendering requires global enablement, group enablement, placement enablement, and slot id', () => {
  const settings = normalizeAdSettings({
    enabled: 'on',
    scriptEnabled: 'on',
    group_blogPost_enabled: 'on',
    placement_blogPost_in_article_enabled: 'on',
    slot_blogPost_in_article: '111222333'
  });

  assert.equal(canRenderAdPlacement(settings, 'blogPost', 'in_article'), true);
  assert.equal(canRenderAdPlacement({ ...settings, enabled: false }, 'blogPost', 'in_article'), false);
  assert.equal(canRenderAdPlacement(settings, 'blogPost', 'before_related'), false);
  assert.equal(shouldLoadAdScript(settings, 'blogPost'), true);
  assert.equal(shouldLoadAdScript({ ...settings, scriptEnabled: false }, 'blogPost'), false);
});

test('ad page group resolver allows only public content and discovery routes', () => {
  assert.equal(resolveAdPageGroup('/'), 'home');
  assert.equal(resolveAdPageGroup('/events'), 'events');
  assert.equal(resolveAdPageGroup('/events/summer-5k'), 'eventDetails');
  assert.equal(resolveAdPageGroup('/events/summer-5k/register'), '');
  assert.equal(resolveAdPageGroup('/events/summer-5k/leaderboard'), '');
  assert.equal(resolveAdPageGroup('/leaderboard'), 'leaderboard');
  assert.equal(resolveAdPageGroup('/blog'), 'blogListing');
  assert.equal(resolveAdPageGroup('/blog/category/training'), 'blogListing');
  assert.equal(resolveAdPageGroup('/blog/my-post'), 'blogPost');
  assert.equal(resolveAdPageGroup('/blogs/me/dashboard'), '');
  assert.equal(resolveAdPageGroup('/shop'), 'shopDiscovery');
  assert.equal(resolveAdPageGroup('/shop/product-a'), '');
  assert.equal(resolveAdPageGroup('/events/summer-5k/shop'), 'shopDiscovery');
  assert.equal(resolveAdPageGroup('/events/summer-5k/shop/shirt'), '');
  assert.equal(resolveAdPageGroup('/admin/dashboard'), '');
  assert.equal(resolveAdPageGroup('/runner/dashboard'), '');
  assert.equal(resolveAdPageGroup('/login'), '');
});

test('slot and publisher normalizers keep only safe AdSense identifiers', () => {
  assert.equal(normalizePublisherId(' ca-pub-1234567890123456 '), 'ca-pub-1234567890123456');
  assert.equal(normalizePublisherId('pub-123'), DEFAULT_PUBLISHER_ID);
  assert.equal(normalizeSlotId('slot: 123-456 abc 789'), '123456789');
});
