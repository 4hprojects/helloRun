'use strict';

const MAX_RUNNING_GROUP_NAME_LENGTH = 120;

function cleanRunningGroupName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeRunningGroupKey(value) {
  return cleanRunningGroupName(value).toLowerCase();
}

function normalizeRunningGroupMemberships(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(/[\n,]/);
  const seen = new Set();
  const memberships = [];

  for (const item of values) {
    const name = cleanRunningGroupName(item);
    const key = normalizeRunningGroupKey(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    memberships.push(name);
  }

  return memberships;
}

module.exports = {
  MAX_RUNNING_GROUP_NAME_LENGTH,
  cleanRunningGroupName,
  normalizeRunningGroupKey,
  normalizeRunningGroupMemberships
};
