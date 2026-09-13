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
const weeklyRunningScheduleWorkSchoolGuide = require('./weekly-running-schedule-work-school-guide');
const dataPrivacyChecklistRunningEventOrganizersGuide = require('./data-privacy-checklist-running-event-organizers-guide');
const raceDayPackingOnsiteHybridEventsGuide = require('./race-day-packing-onsite-hybrid-events-guide');
const inclusiveAccessibleRunningEventInstructionsGuide = require('./inclusive-accessible-running-event-instructions-guide');
const returningToRunningAfterBreakGuide = require('./returning-to-running-after-break-guide');
const closeVirtualRunFinalReviewsResultsRecognitionGuide = require('./close-virtual-run-final-reviews-results-recognition-guide');
const thirtyDayRunningChallengeBeginners = require('./thirty-day-running-challenge-beginners');
const tenKTrainingPlanBeginners = require('./ten-k-training-plan-beginners');
const howToBreatheWhileRunning = require('./how-to-breathe-while-running');
const howLongToRun5k10k21k = require('./how-long-to-run-5k-10k-21k');
const howToChooseRunningShoesForBeginners = require('./how-to-choose-running-shoes-for-beginners');
const runningCadenceExplained = require('./running-cadence-explained');
const howAccuratePhoneGpsRunning = require('./how-accurate-phone-gps-running');
const canYouWalkVirtualRun = require('./can-you-walk-virtual-run');
const howToRunFirst10kVirtualRun = require('./how-to-run-first-10k-virtual-run');
const gpsWatchVsRunningApp = require('./gps-watch-vs-running-app');
const howToPromoteVirtualRun = require('./how-to-promote-virtual-run');
const virtualRunRegistrationFeePricing = require('./virtual-run-registration-fee-pricing');
const twentyOneKHalfMarathonBeginners = require('./twenty-one-k-half-marathon-beginners');
const runningGoalsRestOfYear = require('./running-goals-rest-of-year');
const longRunForBeginners = require('./long-run-for-beginners');
const increaseRunningDistance = require('./increase-running-distance');
const runWithBusySchedule = require('./run-with-busy-schedule');
const hillRunningForBeginners = require('./hill-running-for-beginners');
const whatToEatBeforeRunning = require('./what-to-eat-before-running');
const whatToEatAfterRunning = require('./what-to-eat-after-running');
const hydrationForRunners = require('./hydration-for-runners');
const runningHeartRateExplained = require('./running-heart-rate-explained');
const easyRunExplained = require('./easy-run-explained');
const strengthTrainingForRunnersBeginners = require('./strength-training-for-runners-beginners');
const howToPrepareForALongRun = require('./how-to-prepare-for-a-long-run');
const howToUseStravaForRunning = require('./how-to-use-strava-for-running');
const howToCreateAVirtualRunCertificate = require('./how-to-create-a-virtual-run-certificate');
const virtualRunParticipantEngagement = require('./virtual-run-participant-engagement');
const whatToDoAfterYourFirst10k = require('./what-to-do-after-your-first-10k');
const nextRunningGoal5k10k21k = require('./5k-10k-or-21k-next-running-goal');
const whatIsARunningBase = require('./what-is-a-running-base');
const runningFormForBeginners = require('./running-form-for-beginners');
const runningStridesForBeginners = require('./running-strides-for-beginners');
const tempoRunExplained = require('./tempo-run-explained');
const intervalRunningForBeginners = require('./interval-running-for-beginners');
const tempoRunVsIntervalRun = require('./tempo-run-vs-interval-run');
const howToRunAFaster5k = require('./how-to-run-a-faster-5k');
const howToRunAFaster10k = require('./how-to-run-a-faster-10k');
const runningRecoveryDaysExplained = require('./running-recovery-days-explained');
const howToRecoverAfterALongRun = require('./how-to-recover-after-a-long-run');
const runningInCoolWeatherPhilippines = require('./running-in-cool-weather-philippines');
const maintainRunningFitnessDuringHolidays = require('./maintain-running-fitness-during-holidays');
const virtualRunParticipantRetention = require('./virtual-run-participant-retention');
const endOfYearVirtualRunningChallenge = require('./end-of-year-virtual-running-challenge');
const howToReviewYourRunningYear = require('./how-to-review-your-running-year');
const decemberRunningChallengeForBeginners = require('./december-running-challenge-for-beginners');
const runningStreaksForBeginners = require('./running-streaks-for-beginners');
const howOftenShouldYouRun = require('./how-often-should-you-run');
const runningMotivationVsHabits = require('./running-motivation-vs-habits');
const runningWhileTraveling = require('./running-while-traveling');

const ARTICLE_MODULES = Object.freeze([bestApps, runningSafety, organizerGuide, raceComparison, virtualRunGuide, leaderboardGuide, validRunProofGuide, accumulatedDistanceGuide, beginner5kGuide, proofSubmissionGuide, joinPhilippinesGuide, hellorunPlatformGuide, firstVirtualRunGuide, distanceChoiceGuide, beginnerPaceGuide, rainySeasonRunningGuide, hotHumidWeatherRunningGuide, complete50kChallengeGuide, monthLongConsistencyGuide, gpsTrackingStopsGuide, treadmillVirtualEventGuide, submissionRejectionGuide, firstTimeOrganizerChecklist, schoolsOrganizationsGuide, realisticMonthlyRunningGoal, clearVirtualRunRulesGuide, runWalkMethodBeginnerGuide, participantCommunicationTimelineGuide, chooseSafeVirtualRunRouteGuide, fairDistanceCategoriesChallengeGoalsGuide, postRunRecoveryBasicsGuide, fairConsistentRunProofReviewChecklistGuide, weeklyRunningScheduleWorkSchoolGuide, dataPrivacyChecklistRunningEventOrganizersGuide, raceDayPackingOnsiteHybridEventsGuide, inclusiveAccessibleRunningEventInstructionsGuide, returningToRunningAfterBreakGuide, closeVirtualRunFinalReviewsResultsRecognitionGuide, thirtyDayRunningChallengeBeginners, tenKTrainingPlanBeginners, howToBreatheWhileRunning, howLongToRun5k10k21k, howToChooseRunningShoesForBeginners, runningCadenceExplained, howAccuratePhoneGpsRunning, canYouWalkVirtualRun, howToRunFirst10kVirtualRun, gpsWatchVsRunningApp, howToPromoteVirtualRun, virtualRunRegistrationFeePricing, twentyOneKHalfMarathonBeginners, runningGoalsRestOfYear, longRunForBeginners, increaseRunningDistance, runWithBusySchedule, hillRunningForBeginners, whatToEatBeforeRunning, whatToEatAfterRunning, hydrationForRunners, runningHeartRateExplained, easyRunExplained, strengthTrainingForRunnersBeginners, howToPrepareForALongRun, howToUseStravaForRunning, howToCreateAVirtualRunCertificate, virtualRunParticipantEngagement, whatToDoAfterYourFirst10k, nextRunningGoal5k10k21k, whatIsARunningBase, runningFormForBeginners, runningStridesForBeginners, tempoRunExplained, intervalRunningForBeginners, tempoRunVsIntervalRun, howToRunAFaster5k, howToRunAFaster10k, runningRecoveryDaysExplained, howToRecoverAfterALongRun, runningInCoolWeatherPhilippines, maintainRunningFitnessDuringHolidays, virtualRunParticipantRetention, endOfYearVirtualRunningChallenge, howToReviewYourRunningYear, decemberRunningChallengeForBeginners, runningStreaksForBeginners, howOftenShouldYouRun, runningMotivationVsHabits, runningWhileTraveling]);
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
