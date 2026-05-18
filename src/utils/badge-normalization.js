function normalizeBadgeDistanceLabel(value) {
  const compact = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

  if (!compact) return '';
  return compact.replace(/^(\d+(?:\.\d+)?)KM$/, '$1K');
}

function normalizeBadgeParticipationMode(value) {
  return String(value || '').trim().toLowerCase();
}

module.exports = {
  normalizeBadgeDistanceLabel,
  normalizeBadgeParticipationMode
};
