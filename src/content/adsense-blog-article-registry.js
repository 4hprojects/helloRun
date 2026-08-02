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
const beginnerPaceGuide = require('./beginner-running-pace-guide');
const rainySeasonRunningGuide = require('./running-rainy-season-philippines');
const hotHumidWeatherRunningGuide = require('./hot-humid-weather-running');
const complete50kChallengeGuide = require('./complete-50k-accumulated-challenge');
const monthLongConsistencyGuide = require('./month-long-virtual-run-consistency');
const gpsTrackingStopsGuide = require('./gps-tracking-stops-guide');
const treadmillVirtualEventGuide = require('./treadmill-virtual-event-guide');
const submissionRejectionGuide = require('./virtual-run-submission-rejection-guide');
const firstTimeOrganizerChecklist = require('./virtual-run-checklist-first-time-organizers');
const schoolsOrganizationsGuide = require('./schools-organizations-virtual-runs-guide');
const realisticMonthlyRunningGoal = require('./realistic-monthly-running-goal');
const clearVirtualRunRulesGuide = require('./clear-virtual-run-rules-guide');
const runWalkMethodBeginnerGuide = require('./run-walk-method-beginner-guide');
const participantCommunicationTimelineGuide = require('./participant-communication-timeline-guide');
const chooseSafeVirtualRunRouteGuide = require('./choose-safe-virtual-run-route-guide');
const fairDistanceCategoriesChallengeGoalsGuide = require('./fair-distance-categories-challenge-goals-guide');
const postRunRecoveryBasicsGuide = require('./post-run-recovery-basics-guide');
const fairConsistentRunProofReviewChecklistGuide = require('./fair-consistent-run-proof-review-checklist-guide');

const ARTICLE_MODULES = Object.freeze([bestApps, runningSafety, organizerGuide, raceComparison, virtualRunGuide, leaderboardGuide, validRunProofGuide, accumulatedDistanceGuide, beginner5kGuide, proofSubmissionGuide, joinPhilippinesGuide, hellorunPlatformGuide, firstVirtualRunGuide, distanceChoiceGuide, beginnerPaceGuide, rainySeasonRunningGuide, hotHumidWeatherRunningGuide, complete50kChallengeGuide, monthLongConsistencyGuide, gpsTrackingStopsGuide, treadmillVirtualEventGuide, submissionRejectionGuide, firstTimeOrganizerChecklist, schoolsOrganizationsGuide, realisticMonthlyRunningGoal, clearVirtualRunRulesGuide, runWalkMethodBeginnerGuide, participantCommunicationTimelineGuide, chooseSafeVirtualRunRouteGuide, fairDistanceCategoriesChallengeGoalsGuide, postRunRecoveryBasicsGuide, fairConsistentRunProofReviewChecklistGuide]);
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
