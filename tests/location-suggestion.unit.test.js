'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getCloudflareCountrySuggestion } = require('../src/utils/location-suggestion');

test('accepts a supported Cloudflare ISO country suggestion', () => {
  assert.equal(getCloudflareCountrySuggestion({ 'cf-ipcountry': 'ph' }), 'PH');
  assert.equal(getCloudflareCountrySuggestion({ 'cf-ipcountry': ['US'] }), 'US');
});

test('rejects missing, special, and unsupported country suggestions', () => {
  assert.equal(getCloudflareCountrySuggestion({}), '');
  assert.equal(getCloudflareCountrySuggestion({ 'cf-ipcountry': 'XX' }), '');
  assert.equal(getCloudflareCountrySuggestion({ 'cf-ipcountry': 'T1' }), '');
});
