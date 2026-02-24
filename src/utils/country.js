const countries = require('../data/countries');

const countryCodeSet = new Set(countries.map((item) => item.code));
const countryNameByCode = new Map(countries.map((item) => [item.code, item.name]));
const countryCodeByName = new Map(countries.map((item) => [item.name.toLowerCase(), item.code]));

function getCountries() {
  return countries;
}

function isValidCountryCode(value) {
  if (!value || typeof value !== 'string') return false;
  return countryCodeSet.has(value.trim().toUpperCase());
}

function normalizeCountryCode(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const upper = trimmed.toUpperCase();
  if (countryCodeSet.has(upper)) return upper;

  const byName = countryCodeByName.get(trimmed.toLowerCase());
  return byName || trimmed;
}

function getCountryName(value) {
  if (!value || typeof value !== 'string') return '';
  const normalized = value.trim().toUpperCase();
  return countryNameByCode.get(normalized) || value;
}

module.exports = {
  getCountries,
  isValidCountryCode,
  normalizeCountryCode,
  getCountryName
};
