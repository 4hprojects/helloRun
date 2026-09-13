'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAdsenseContentLinks } = require('../src/scripts/validate-adsense-content-links');

test('every registered article link resolves to a route, redirect, or registered article', () => {
  const result = validateAdsenseContentLinks();
  assert.equal(result.articleCount, 69);
  assert.ok(result.linkCount > 0);
  assert.deepEqual(result.failures, []);
});
