'use strict';

const RESTRICTED_PROVIDER_FILTER = Object.freeze({ source: { $ne: 'strava' } });

function hasBypass(options = {}) {
  return options.includeRestrictedProviderData === true;
}

/**
 * Strava-originated submissions are not part of HelloRun's official/shared data set.
 * Keeping this rule at the model boundary prevents a newly-added organizer, analytics,
 * certificate, or leaderboard query from accidentally disclosing a historical record.
 * The remediation script uses the raw Mongo collection API and therefore cannot
 * accidentally depend on this opt-out.
 */
function applyRestrictedProviderScope(schema) {
  const addQueryScope = function addQueryScope() {
    if (hasBypass(this.getOptions?.() || {})) return;
    this.where(RESTRICTED_PROVIDER_FILTER);
  };

  for (const operation of [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace',
    'countDocuments',
    'distinct'
  ]) {
    schema.pre(operation, addQueryScope);
  }

  schema.pre('aggregate', function addAggregateScope() {
    if (hasBypass(this.options || {})) return;
    const pipeline = this.pipeline();
    const restrictedMatch = { $match: RESTRICTED_PROVIDER_FILTER };
    if (pipeline[0]?.$geoNear || pipeline[0]?.$search || pipeline[0]?.$vectorSearch) pipeline.splice(1, 0, restrictedMatch);
    else pipeline.unshift(restrictedMatch);
  });
}

module.exports = {
  RESTRICTED_PROVIDER_FILTER,
  applyRestrictedProviderScope
};
