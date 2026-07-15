'use strict';

const { isValidCountryCode, normalizeCountryCode } = require('./country');

function getCloudflareCountrySuggestion(headers = {}) {
  const rawValue = Array.isArray(headers['cf-ipcountry'])
    ? headers['cf-ipcountry'][0]
    : headers['cf-ipcountry'];
  const country = normalizeCountryCode(rawValue);
  return country && isValidCountryCode(country) ? country : '';
}

module.exports = { getCloudflareCountrySuggestion };
