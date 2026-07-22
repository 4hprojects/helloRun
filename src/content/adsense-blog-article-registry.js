'use strict';

const bestApps = require('./best-apps-virtual-run');
const runningSafety = require('./running-safety-low-light');
const organizerGuide = require('./organize-virtual-run-playbook');
const raceComparison = require('./virtual-vs-traditional-race');
const virtualRunGuide = require('./what-is-virtual-run-guide');
const leaderboardGuide = require('./virtual-running-leaderboards');
const validRunProofGuide = require('./valid-run-proof-guide');
const accumulatedDistanceGuide = require('./accumulated-distance-challenges');
const beginner5kGuide = require('./beginner-5k-training-plan');
const proofSubmissionGuide = require('./how-to-submit-run-proof');
const joinPhilippinesGuide = require('./join-virtual-run-philippines');
const hellorunPlatformGuide = require('./hellorun-platform-guide');
const firstVirtualRunGuide = require('./prepare-first-virtual-run');
const distanceChoiceGuide = require('./choose-running-distance-guide');

const ARTICLE_MODULES = Object.freeze([bestApps, runningSafety, organizerGuide, raceComparison, virtualRunGuide, leaderboardGuide, validRunProofGuide, accumulatedDistanceGuide, beginner5kGuide, proofSubmissionGuide, joinPhilippinesGuide, hellorunPlatformGuide, firstVirtualRunGuide, distanceChoiceGuide]);
const ARTICLE_REGISTRY = Object.freeze(Object.fromEntries(
  ARTICLE_MODULES.map((articleModule) => [articleModule.ARTICLE.slug, articleModule])
));

function getArticleModule(slug) {
  return ARTICLE_REGISTRY[String(slug || '').trim()] || null;
}

function listArticleSlugs() {
  return Object.keys(ARTICLE_REGISTRY);
}

module.exports = {
  ARTICLE_REGISTRY,
  getArticleModule,
  listArticleSlugs
};
