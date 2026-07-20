'use strict';

function buildRunnerGroupsPresentation(input = {}) {
  const currentGroups = Array.isArray(input.currentGroups) ? input.currentGroups : [];
  const query = String(input.query || '').trim();
  const sourceGroups = query
    ? (Array.isArray(input.searchResults) ? input.searchResults : [])
    : (Array.isArray(input.topGroups) ? input.topGroups : []);
  const currentNames = new Set(currentGroups.map((group) => normalizeName(group?.name)).filter(Boolean));
  const currentGroupNames = currentGroups.map((group) => String(group?.name || '').trim()).filter(Boolean);
  const hasMembership = currentGroupNames.length > 0;

  const decorate = (group) => {
    const name = String(group?.name || '').trim();
    const isMember = currentNames.has(normalizeName(name));
    return {
      id: String(group?._id || ''),
      name,
      slug: String(group?.slug || '').trim(),
      description: String(group?.description || '').trim(),
      memberCount: Math.max(0, Number.parseInt(group?.memberCount, 10) || 0),
      isMember,
      actionType: isMember ? 'joined' : 'join',
      actionLabel: isMember ? 'Joined' : 'Join group'
    };
  };

  return {
    query,
    joinedCount: currentGroups.length,
    hasMembership,
    currentGroupNames,
    currentGroups: currentGroups.map(decorate),
    discovery: {
      title: query ? 'Search results' : 'Popular groups',
      groups: sourceGroups.map(decorate),
      isSearch: Boolean(query),
      resultCount: sourceGroups.length
    }
  };
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

module.exports = { buildRunnerGroupsPresentation };
