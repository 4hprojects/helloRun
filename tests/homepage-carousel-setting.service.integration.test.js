const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeHomepageCarouselSettings
} = require('../src/services/homepage-carousel-setting.service');

test('homepage carousel settings normalize admin form values', () => {
  const settings = normalizeHomepageCarouselSettings({
    enabled: 'on',
    loopEnabled: '1',
    maxItems: '10'
  });

  assert.deepEqual(settings, {
    enabled: true,
    loopEnabled: true,
    maxItems: 10
  });
});

test('homepage carousel settings clamp max items and handle unchecked boxes', () => {
  assert.deepEqual(normalizeHomepageCarouselSettings({ maxItems: '50' }), {
    enabled: false,
    loopEnabled: false,
    maxItems: 12
  });

  assert.deepEqual(normalizeHomepageCarouselSettings({ maxItems: '0' }), {
    enabled: false,
    loopEnabled: false,
    maxItems: 1
  });
});
