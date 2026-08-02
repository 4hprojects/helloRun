require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Blog = require('../models/Blog');
const User = require('../models/User');
const { EDITORIAL_TEAM_EMAIL, EDITORIAL_TEAM_NAME } = require('../utils/blog-author');
const { buildTrustedEditorialReview } = require('../utils/blog-content-eligibility');
const {
  ARTICLE: BEST_APPS_ARTICLE,
  buildArticlePayload: buildBestAppsArticlePayload
} = require('../content/best-apps-virtual-run');
const {
  ARTICLE: RUNNING_SAFETY_ARTICLE,
  buildArticlePayload: buildRunningSafetyArticlePayload
} = require('../content/running-safety-low-light');
const {
  ARTICLE: ORGANIZER_GUIDE_ARTICLE,
  buildArticlePayload: buildOrganizerGuideArticlePayload
} = require('../content/organize-virtual-run-playbook');
const {
  ARTICLE: RACE_COMPARISON_ARTICLE,
  buildArticlePayload: buildRaceComparisonArticlePayload
} = require('../content/virtual-vs-traditional-race');
const {
  ARTICLE: VIRTUAL_RUN_GUIDE_ARTICLE,
  buildArticlePayload: buildVirtualRunGuideArticlePayload
} = require('../content/what-is-virtual-run-guide');
const {
  ARTICLE: LEADERBOARD_GUIDE_ARTICLE,
  buildArticlePayload: buildLeaderboardGuideArticlePayload
} = require('../content/virtual-running-leaderboards');
const {
  ARTICLE: VALID_RUN_PROOF_ARTICLE,
  buildArticlePayload: buildValidRunProofArticlePayload
} = require('../content/valid-run-proof-guide');
const {
  ARTICLE: ACCUMULATED_DISTANCE_ARTICLE,
  buildArticlePayload: buildAccumulatedDistanceArticlePayload
} = require('../content/accumulated-distance-challenges');
const {
  ARTICLE: BEGINNER_5K_ARTICLE,
  buildArticlePayload: buildBeginner5kArticlePayload
} = require('../content/beginner-5k-training-plan');
const {
  ARTICLE: PROOF_SUBMISSION_ARTICLE,
  buildArticlePayload: buildProofSubmissionArticlePayload
} = require('../content/how-to-submit-run-proof');
const {
  ARTICLE: JOIN_PHILIPPINES_ARTICLE,
  buildArticlePayload: buildJoinPhilippinesArticlePayload
} = require('../content/join-virtual-run-philippines');
const {
  ARTICLE: HELLORUN_PLATFORM_ARTICLE,
  buildArticlePayload: buildHellorunPlatformArticlePayload
} = require('../content/hellorun-platform-guide');
const {
  ARTICLE: FIRST_VIRTUAL_RUN_ARTICLE,
  buildArticlePayload: buildFirstVirtualRunArticlePayload
} = require('../content/prepare-first-virtual-run');
const {
  ARTICLE: DISTANCE_CHOICE_ARTICLE,
  buildArticlePayload: buildDistanceChoiceArticlePayload
} = require('../content/choose-running-distance-guide');
const {
  ARTICLE: BEGINNER_PACE_ARTICLE,
  buildArticlePayload: buildBeginnerPaceArticlePayload
} = require('../content/beginner-running-pace-guide');
const {
  ARTICLE: RAINY_SEASON_RUNNING_ARTICLE,
  buildArticlePayload: buildRainySeasonRunningArticlePayload
} = require('../content/running-rainy-season-philippines');
const {
  ARTICLE: HOT_HUMID_WEATHER_RUNNING_ARTICLE,
  buildArticlePayload: buildHotHumidWeatherRunningArticlePayload
} = require('../content/hot-humid-weather-running');
const {
  ARTICLE: COMPLETE_50K_CHALLENGE_ARTICLE,
  buildArticlePayload: buildComplete50kChallengeArticlePayload
} = require('../content/complete-50k-accumulated-challenge');
const {
  ARTICLE: MONTH_LONG_CONSISTENCY_ARTICLE,
  buildArticlePayload: buildMonthLongConsistencyArticlePayload
} = require('../content/month-long-virtual-run-consistency');
const {
  ARTICLE: GPS_TRACKING_STOPS_ARTICLE,
  buildArticlePayload: buildGpsTrackingStopsArticlePayload
} = require('../content/gps-tracking-stops-guide');
const {
  ARTICLE: TREADMILL_VIRTUAL_EVENT_ARTICLE,
  buildArticlePayload: buildTreadmillVirtualEventArticlePayload
} = require('../content/treadmill-virtual-event-guide');
const {
  ARTICLE: SUBMISSION_REJECTION_ARTICLE,
  buildArticlePayload: buildSubmissionRejectionArticlePayload
} = require('../content/virtual-run-submission-rejection-guide');
const {
  ARTICLE: FIRST_TIME_ORGANIZER_CHECKLIST_ARTICLE,
  buildArticlePayload: buildFirstTimeOrganizerChecklistPayload
} = require('../content/virtual-run-checklist-first-time-organizers');
const {
  ARTICLE: SCHOOLS_ORGANIZATIONS_GUIDE_ARTICLE,
  buildArticlePayload: buildSchoolsOrganizationsGuidePayload
} = require('../content/schools-organizations-virtual-runs-guide');
const {
  ARTICLE: REALISTIC_MONTHLY_RUNNING_GOAL_ARTICLE,
  buildArticlePayload: buildRealisticMonthlyRunningGoalPayload
} = require('../content/realistic-monthly-running-goal');
const {
  ARTICLE: CLEAR_VIRTUAL_RUN_RULES_ARTICLE,
  buildArticlePayload: buildClearVirtualRunRulesPayload
} = require('../content/clear-virtual-run-rules-guide');
const {
  ARTICLE: RUN_WALK_METHOD_ARTICLE,
  buildArticlePayload: buildRunWalkMethodPayload
} = require('../content/run-walk-method-beginner-guide');
const {
  ARTICLE: PARTICIPANT_COMMUNICATION_TIMELINE_ARTICLE,
  buildArticlePayload: buildParticipantCommunicationTimelinePayload
} = require('../content/participant-communication-timeline-guide');
const {
  ARTICLE: CHOOSE_SAFE_VIRTUAL_RUN_ROUTE_ARTICLE,
  buildArticlePayload: buildChooseSafeVirtualRunRoutePayload
} = require('../content/choose-safe-virtual-run-route-guide');
const {
  ARTICLE: FAIR_DISTANCE_CATEGORIES_CHALLENGE_GOALS_ARTICLE,
  buildArticlePayload: buildFairDistanceCategoriesChallengeGoalsPayload
} = require('../content/fair-distance-categories-challenge-goals-guide');
const {
  ARTICLE: POST_RUN_RECOVERY_BASICS_ARTICLE,
  buildArticlePayload: buildPostRunRecoveryBasicsPayload
} = require('../content/post-run-recovery-basics-guide');
const {
  ARTICLE: FAIR_CONSISTENT_RUN_PROOF_REVIEW_CHECKLIST_ARTICLE,
  buildArticlePayload: buildFairConsistentRunProofReviewChecklistPayload
} = require('../content/fair-consistent-run-proof-review-checklist-guide');
const {
  ARTICLE: WEEKLY_RUNNING_SCHEDULE_WORK_SCHOOL_ARTICLE,
  buildArticlePayload: buildWeeklyRunningScheduleWorkSchoolPayload
} = require('../content/weekly-running-schedule-work-school-guide');
const {
  ARTICLE: DATA_PRIVACY_CHECKLIST_RUNNING_EVENT_ORGANIZERS_ARTICLE,
  buildArticlePayload: buildDataPrivacyChecklistRunningEventOrganizersPayload
} = require('../content/data-privacy-checklist-running-event-organizers-guide');
const {
  ARTICLE: RACE_DAY_PACKING_ONSITE_HYBRID_EVENTS_ARTICLE,
  buildArticlePayload: buildRaceDayPackingOnsiteHybridEventsPayload
} = require('../content/race-day-packing-onsite-hybrid-events-guide');

const AUTHOR_EMAIL = EDITORIAL_TEAM_EMAIL;
const EXISTING_GUIDE_AUTHOR_EMAIL = EDITORIAL_TEAM_EMAIL;
const COVER_IMAGE_URL = '/images/helloRun-icon.webp';
const BEST_APPS_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/69941482ab1333984de6c96c/1780845345476-349094234-chatgpt_image_jun_7__2026__11_15_14_pm.png';
const BEST_APPS_PAYLOAD = buildBestAppsArticlePayload({ coverImageUrl: BEST_APPS_COVER_IMAGE_URL });
const RUNNING_SAFETY_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784202233581-983735756-chatgpt_image_jul_16__2026__07_43_43_pm.webp';
const RUNNING_SAFETY_PAYLOAD = buildRunningSafetyArticlePayload({ coverImageUrl: RUNNING_SAFETY_COVER_IMAGE_URL });
const ORGANIZER_GUIDE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/69941482ab1333984de6c96c/1780844869483-189270819-chatgpt_image_jun_7__2026__11_07_27_pm.png';
const ORGANIZER_GUIDE_PAYLOAD = buildOrganizerGuideArticlePayload({ coverImageUrl: ORGANIZER_GUIDE_COVER_IMAGE_URL });
const RACE_COMPARISON_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/69941482ab1333984de6c96c/1780843552477-398711062-chatgpt_image_jun_7__2026__10_45_31_pm.png';
const RACE_COMPARISON_PAYLOAD = buildRaceComparisonArticlePayload({ coverImageUrl: RACE_COMPARISON_COVER_IMAGE_URL });
const VIRTUAL_RUN_GUIDE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/69941482ab1333984de6c96c/1780842621428-125005180-chatgpt_image_jun_7__2026__10_28_35_pm.png';
const VIRTUAL_RUN_GUIDE_PAYLOAD = buildVirtualRunGuideArticlePayload({ coverImageUrl: VIRTUAL_RUN_GUIDE_COVER_IMAGE_URL });
const LEADERBOARD_GUIDE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784201731810-201677285-chatgpt_image_jul_16__2026__07_35_14_pm.webp';
const LEADERBOARD_GUIDE_PAYLOAD = buildLeaderboardGuideArticlePayload({ coverImageUrl: LEADERBOARD_GUIDE_COVER_IMAGE_URL });
const VALID_RUN_PROOF_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784202689183-80888358-chatgpt_image_jul_16__2026__07_51_16_pm.webp';
const VALID_RUN_PROOF_PAYLOAD = buildValidRunProofArticlePayload({ coverImageUrl: VALID_RUN_PROOF_COVER_IMAGE_URL });
const ACCUMULATED_DISTANCE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784201471494-847806040-chatgpt_image_jul_16__2026__07_30_57_pm.webp';
const ACCUMULATED_DISTANCE_PAYLOAD = buildAccumulatedDistanceArticlePayload({ coverImageUrl: ACCUMULATED_DISTANCE_COVER_IMAGE_URL });
const BEGINNER_5K_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784201268972-365051176-chatgpt_image_jul_16__2026__07_27_23_pm.webp';
const BEGINNER_5K_PAYLOAD = buildBeginner5kArticlePayload({ coverImageUrl: BEGINNER_5K_COVER_IMAGE_URL });
const PROOF_SUBMISSION_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784201986565-267859622-chatgpt_image_jul_16__2026__07_39_09_pm.webp';
const PROOF_SUBMISSION_PAYLOAD = buildProofSubmissionArticlePayload({ coverImageUrl: PROOF_SUBMISSION_COVER_IMAGE_URL });
const JOIN_PHILIPPINES_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784200739553-127393422-chatgpt_image_jul_16__2026__06_51_47_pm.webp';
const JOIN_PHILIPPINES_PAYLOAD = buildJoinPhilippinesArticlePayload({ coverImageUrl: JOIN_PHILIPPINES_COVER_IMAGE_URL });
const HELLORUN_PLATFORM_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784201019285-302671518-chatgpt_image_jul_16__2026__07_23_15_pm.webp';
const HELLORUN_PLATFORM_PAYLOAD = buildHellorunPlatformArticlePayload({ coverImageUrl: HELLORUN_PLATFORM_COVER_IMAGE_URL });
const FIRST_VIRTUAL_RUN_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/6994299f568d52730107dc23/1784555622021-237177645-how-to-prepare-for-your-first-virtual-run.webp';
const FIRST_VIRTUAL_RUN_PAYLOAD = buildFirstVirtualRunArticlePayload({ coverImageUrl: FIRST_VIRTUAL_RUN_COVER_IMAGE_URL });
const DISTANCE_CHOICE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/6994299f568d52730107dc23/1784690449454-621961560-how-to-choose-between-running-distances.webp';
const DISTANCE_CHOICE_PAYLOAD = buildDistanceChoiceArticlePayload({ coverImageUrl: DISTANCE_CHOICE_COVER_IMAGE_URL });
const BEGINNER_PACE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784709599143-784201834-beginners-guide-running-pace.webp';
const BEGINNER_PACE_PAYLOAD = buildBeginnerPaceArticlePayload({ coverImageUrl: BEGINNER_PACE_COVER_IMAGE_URL });
const RAINY_SEASON_RUNNING_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785245902469-81172053-running-during-rainy-season-philippines.webp';
const RAINY_SEASON_RUNNING_PAYLOAD = buildRainySeasonRunningArticlePayload({ coverImageUrl: RAINY_SEASON_RUNNING_COVER_IMAGE_URL });
const HOT_HUMID_WEATHER_RUNNING_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785247262143-851271026-how-to-run-safely-hot-humid-weather.webp';
const HOT_HUMID_WEATHER_RUNNING_PAYLOAD = buildHotHumidWeatherRunningArticlePayload({ coverImageUrl: HOT_HUMID_WEATHER_RUNNING_COVER_IMAGE_URL });
const COMPLETE_50K_CHALLENGE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785248410488-243915403-how-to-complete-50k-accumulated-challenge.webp';
const COMPLETE_50K_CHALLENGE_PAYLOAD = buildComplete50kChallengeArticlePayload({ coverImageUrl: COMPLETE_50K_CHALLENGE_COVER_IMAGE_URL });
const MONTH_LONG_CONSISTENCY_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785283544392-252140112-how-to-stay-consistent-month-long-virtual-run.webp';
const MONTH_LONG_CONSISTENCY_PAYLOAD = buildMonthLongConsistencyArticlePayload({ coverImageUrl: MONTH_LONG_CONSISTENCY_COVER_IMAGE_URL });
const GPS_TRACKING_STOPS_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785284470949-66253374-what-to-do-when-gps-tracking-stops-during-a-run.webp';
const GPS_TRACKING_STOPS_PAYLOAD = buildGpsTrackingStopsArticlePayload({ coverImageUrl: GPS_TRACKING_STOPS_COVER_IMAGE_URL });
const TREADMILL_VIRTUAL_EVENT_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785285476875-831938576-how-to-record-a-treadmill-run-for-a-virtual-event.webp';
const TREADMILL_VIRTUAL_EVENT_PAYLOAD = buildTreadmillVirtualEventArticlePayload({ coverImageUrl: TREADMILL_VIRTUAL_EVENT_COVER_IMAGE_URL });
const SUBMISSION_REJECTION_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785384120791-554479927-why-a-virtual-run-submission-may-be-rejected.webp';
const SUBMISSION_REJECTION_PAYLOAD = buildSubmissionRejectionArticlePayload({ coverImageUrl: SUBMISSION_REJECTION_COVER_IMAGE_URL });
const FIRST_TIME_ORGANIZER_CHECKLIST_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785386059549-983600590-virtual-run-checklist-for-first-time-organizers.webp';
const FIRST_TIME_ORGANIZER_CHECKLIST_PAYLOAD = buildFirstTimeOrganizerChecklistPayload({ coverImageUrl: FIRST_TIME_ORGANIZER_CHECKLIST_COVER_IMAGE_URL });
const SCHOOLS_ORGANIZATIONS_GUIDE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785388535469-101481065-how-schools-and-organizations-can-use-virtual-runs.webp';
const SCHOOLS_ORGANIZATIONS_GUIDE_PAYLOAD = buildSchoolsOrganizationsGuidePayload({ coverImageUrl: SCHOOLS_ORGANIZATIONS_GUIDE_COVER_IMAGE_URL });
const REALISTIC_MONTHLY_RUNNING_GOAL_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785668498609-628989328-how-to-set-a-realistic-monthly-running-goal.webp';
const REALISTIC_MONTHLY_RUNNING_GOAL_PAYLOAD = buildRealisticMonthlyRunningGoalPayload({ coverImageUrl: REALISTIC_MONTHLY_RUNNING_GOAL_COVER_IMAGE_URL });
const CLEAR_VIRTUAL_RUN_RULES_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785670404268-504104721-how-to-write-clear-virtual-run-rules-participants-can-follow.webp';
const CLEAR_VIRTUAL_RUN_RULES_PAYLOAD = buildClearVirtualRunRulesPayload({ coverImageUrl: CLEAR_VIRTUAL_RUN_RULES_COVER_IMAGE_URL });
const RUN_WALK_METHOD_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785671459612-580542686-run-walk-method-beginner-friendly-way-build-endurance.webp';
const RUN_WALK_METHOD_PAYLOAD = buildRunWalkMethodPayload({ coverImageUrl: RUN_WALK_METHOD_COVER_IMAGE_URL });
const PARTICIPANT_COMMUNICATION_TIMELINE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785672741077-79846788-participant-communication-timeline-virtual-running-events.webp';
const PARTICIPANT_COMMUNICATION_TIMELINE_PAYLOAD = buildParticipantCommunicationTimelinePayload({ coverImageUrl: PARTICIPANT_COMMUNICATION_TIMELINE_COVER_IMAGE_URL });
const CHOOSE_SAFE_VIRTUAL_RUN_ROUTE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785678117646-898427735-how-to-choose-a-safe-route-for-your-virtual-run.webp';
const CHOOSE_SAFE_VIRTUAL_RUN_ROUTE_PAYLOAD = buildChooseSafeVirtualRunRoutePayload({ coverImageUrl: CHOOSE_SAFE_VIRTUAL_RUN_ROUTE_COVER_IMAGE_URL });
const FAIR_DISTANCE_CATEGORIES_CHALLENGE_GOALS_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785680107500-610435147-how-to-design-fair-distance-categories-and-challenge-goals.webp';
const FAIR_DISTANCE_CATEGORIES_CHALLENGE_GOALS_PAYLOAD = buildFairDistanceCategoriesChallengeGoalsPayload({ coverImageUrl: FAIR_DISTANCE_CATEGORIES_CHALLENGE_GOALS_COVER_IMAGE_URL });
const POST_RUN_RECOVERY_BASICS_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785684194043-524731892-post-run-recovery-basics-rest-hydration-when-to-ease-back.webp';
const POST_RUN_RECOVERY_BASICS_PAYLOAD = buildPostRunRecoveryBasicsPayload({ coverImageUrl: POST_RUN_RECOVERY_BASICS_COVER_IMAGE_URL });
const FAIR_CONSISTENT_RUN_PROOF_REVIEW_CHECKLIST_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785685456907-509035887-fair-and-consistent-run-proof-review-checklist-for-organizers.webp';
const FAIR_CONSISTENT_RUN_PROOF_REVIEW_CHECKLIST_PAYLOAD = buildFairConsistentRunProofReviewChecklistPayload({ coverImageUrl: FAIR_CONSISTENT_RUN_PROOF_REVIEW_CHECKLIST_COVER_IMAGE_URL });
const WEEKLY_RUNNING_SCHEDULE_WORK_SCHOOL_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785686943864-648488379-how-to-build-a-weekly-running-schedule-around-work-or-school.webp';
const WEEKLY_RUNNING_SCHEDULE_WORK_SCHOOL_PAYLOAD = buildWeeklyRunningScheduleWorkSchoolPayload({ coverImageUrl: WEEKLY_RUNNING_SCHEDULE_WORK_SCHOOL_COVER_IMAGE_URL });
const DATA_PRIVACY_CHECKLIST_RUNNING_EVENT_ORGANIZERS_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785687764281-767893634-data-privacy-checklist-running-event-organizers.webp';
const DATA_PRIVACY_CHECKLIST_RUNNING_EVENT_ORGANIZERS_PAYLOAD = buildDataPrivacyChecklistRunningEventOrganizersPayload({ coverImageUrl: DATA_PRIVACY_CHECKLIST_RUNNING_EVENT_ORGANIZERS_COVER_IMAGE_URL });
const RACE_DAY_PACKING_ONSITE_HYBRID_EVENTS_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785688505189-897783697-what-to-bring-race-day-onsite-hybrid-events.webp';
const RACE_DAY_PACKING_ONSITE_HYBRID_EVENTS_PAYLOAD = buildRaceDayPackingOnsiteHybridEventsPayload({ coverImageUrl: RACE_DAY_PACKING_ONSITE_HYBRID_EVENTS_COVER_IMAGE_URL });

const POSTS = [
  {
    ...HELLORUN_PLATFORM_ARTICLE,
    contentHtml: HELLORUN_PLATFORM_PAYLOAD.contentHtml,
    coverImageUrl: HELLORUN_PLATFORM_COVER_IMAGE_URL,
    coverImageAlt: HELLORUN_PLATFORM_ARTICLE.coverImageAlt,
    ogImageUrl: HELLORUN_PLATFORM_COVER_IMAGE_URL,
    publishedAt: '2026-05-28T12:33:45.937Z',
    links: [
      '/about',
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/data-usage-policy',
      '/organiser-terms',
      '/refund-and-cancellation-policy',
      '/acceptable-use-policy',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/how-to-join-a-virtual-run-philippines',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/running-safety-tips-early-morning-night-runs'
    ]
  },
  {
    ...JOIN_PHILIPPINES_ARTICLE,
    contentHtml: JOIN_PHILIPPINES_PAYLOAD.contentHtml,
    coverImageUrl: JOIN_PHILIPPINES_COVER_IMAGE_URL,
    coverImageAlt: JOIN_PHILIPPINES_ARTICLE.coverImageAlt,
    ogImageUrl: JOIN_PHILIPPINES_COVER_IMAGE_URL,
    publishedAt: '2026-06-01T01:00:00.000Z',
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/refund-and-cancellation-policy',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...PROOF_SUBMISSION_ARTICLE,
    contentHtml: PROOF_SUBMISSION_PAYLOAD.contentHtml,
    coverImageUrl: PROOF_SUBMISSION_COVER_IMAGE_URL,
    coverImageAlt: PROOF_SUBMISSION_ARTICLE.coverImageAlt,
    ogImageUrl: PROOF_SUBMISSION_COVER_IMAGE_URL,
    publishedAt: '2026-06-02T01:00:00.000Z',
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
      '/blog/beginner-5k-training-plan-new-runners'
    ],
  },
  {
    ...BEST_APPS_ARTICLE,
    contentHtml: BEST_APPS_PAYLOAD.contentHtml,
    coverImageUrl: BEST_APPS_COVER_IMAGE_URL,
    coverImageAlt: BEST_APPS_ARTICLE.coverImageAlt,
    ogImageUrl: BEST_APPS_COVER_IMAGE_URL,
    publishedAt: '2026-06-07T15:16:30.035Z',
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun'
    ]
  },
  {
    ...BEGINNER_5K_ARTICLE,
    contentHtml: BEGINNER_5K_PAYLOAD.contentHtml,
    coverImageUrl: BEGINNER_5K_COVER_IMAGE_URL,
    coverImageAlt: BEGINNER_5K_ARTICLE.coverImageAlt,
    ogImageUrl: BEGINNER_5K_COVER_IMAGE_URL,
    publishedAt: '2026-06-04T01:00:00.000Z',
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-accumulated-distance-challenges-work'
    ],
  },
  {
    ...ACCUMULATED_DISTANCE_ARTICLE,
    contentHtml: ACCUMULATED_DISTANCE_PAYLOAD.contentHtml,
    coverImageUrl: ACCUMULATED_DISTANCE_COVER_IMAGE_URL,
    coverImageAlt: ACCUMULATED_DISTANCE_ARTICLE.coverImageAlt,
    ogImageUrl: ACCUMULATED_DISTANCE_COVER_IMAGE_URL,
    publishedAt: '2026-06-05T01:00:00.000Z',
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...VALID_RUN_PROOF_ARTICLE,
    contentHtml: VALID_RUN_PROOF_PAYLOAD.contentHtml,
    coverImageUrl: VALID_RUN_PROOF_COVER_IMAGE_URL,
    coverImageAlt: VALID_RUN_PROOF_ARTICLE.coverImageAlt,
    ogImageUrl: VALID_RUN_PROOF_COVER_IMAGE_URL,
    publishedAt: '2026-06-06T01:00:00.000Z',
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...LEADERBOARD_GUIDE_ARTICLE,
    contentHtml: LEADERBOARD_GUIDE_PAYLOAD.contentHtml,
    coverImageUrl: LEADERBOARD_GUIDE_COVER_IMAGE_URL,
    coverImageAlt: LEADERBOARD_GUIDE_ARTICLE.coverImageAlt,
    ogImageUrl: LEADERBOARD_GUIDE_COVER_IMAGE_URL,
    publishedAt: '2026-06-07T01:00:00.000Z',
    links: [
      '/leaderboard',
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...RACE_COMPARISON_ARTICLE,
    contentHtml: RACE_COMPARISON_PAYLOAD.contentHtml,
    coverImageUrl: RACE_COMPARISON_COVER_IMAGE_URL,
    coverImageAlt: RACE_COMPARISON_ARTICLE.coverImageAlt,
    ogImageUrl: RACE_COMPARISON_COVER_IMAGE_URL,
    publishedAt: '2026-06-07T14:46:40.335Z',
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/privacy',
      '/refund-and-cancellation-policy',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...VIRTUAL_RUN_GUIDE_ARTICLE,
    contentHtml: VIRTUAL_RUN_GUIDE_PAYLOAD.contentHtml,
    coverImageUrl: VIRTUAL_RUN_GUIDE_COVER_IMAGE_URL,
    coverImageAlt: VIRTUAL_RUN_GUIDE_ARTICLE.coverImageAlt,
    ogImageUrl: VIRTUAL_RUN_GUIDE_COVER_IMAGE_URL,
    publishedAt: '2026-06-07T14:31:17.029Z',
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/refund-and-cancellation-policy',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...ORGANIZER_GUIDE_ARTICLE,
    contentHtml: ORGANIZER_GUIDE_PAYLOAD.contentHtml,
    coverImageUrl: ORGANIZER_GUIDE_COVER_IMAGE_URL,
    coverImageAlt: ORGANIZER_GUIDE_ARTICLE.coverImageAlt,
    ogImageUrl: ORGANIZER_GUIDE_COVER_IMAGE_URL,
    publishedAt: '2026-06-07T15:16:43.333Z',
    links: [
      '/organizer/complete-profile',
      '/organizer/create-event',
      '/events',
      '/how-it-works',
      '/faq',
      '/privacy',
      '/organiser-terms',
      '/refund-and-cancellation-policy'
    ]
  },
  {
    ...RUNNING_SAFETY_ARTICLE,
    contentHtml: RUNNING_SAFETY_PAYLOAD.contentHtml,
    coverImageUrl: RUNNING_SAFETY_COVER_IMAGE_URL,
    coverImageAlt: RUNNING_SAFETY_ARTICLE.coverImageAlt,
    ogImageUrl: RUNNING_SAFETY_COVER_IMAGE_URL,
    publishedAt: '2026-06-10T01:00:00.000Z',
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/best-apps-to-track-your-virtual-run'
    ]
  },
  {
    ...FIRST_VIRTUAL_RUN_ARTICLE,
    contentHtml: FIRST_VIRTUAL_RUN_PAYLOAD.contentHtml,
    coverImageUrl: FIRST_VIRTUAL_RUN_COVER_IMAGE_URL,
    coverImageAlt: FIRST_VIRTUAL_RUN_ARTICLE.coverImageAlt,
    ogImageUrl: FIRST_VIRTUAL_RUN_COVER_IMAGE_URL,
    publishedAt: '2026-07-20T14:00:53.532Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/refund-and-cancellation-policy',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-leaderboards-work-virtual-running-events'
    ]
  },
  {
    ...DISTANCE_CHOICE_ARTICLE,
    contentHtml: DISTANCE_CHOICE_PAYLOAD.contentHtml,
    coverImageUrl: DISTANCE_CHOICE_COVER_IMAGE_URL,
    coverImageAlt: DISTANCE_CHOICE_ARTICLE.coverImageAlt,
    ogImageUrl: DISTANCE_CHOICE_COVER_IMAGE_URL,
    publishedAt: '2026-07-22T03:27:02.320Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/how-to-prepare-for-your-first-virtual-run',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/how-leaderboards-work-virtual-running-events'
    ]
  },
  {
    ...BEGINNER_PACE_ARTICLE,
    contentHtml: BEGINNER_PACE_PAYLOAD.contentHtml,
    coverImageUrl: BEGINNER_PACE_COVER_IMAGE_URL,
    coverImageAlt: BEGINNER_PACE_ARTICLE.coverImageAlt,
    ogImageUrl: BEGINNER_PACE_COVER_IMAGE_URL,
    publishedAt: '2026-07-22T08:46:16.136Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/privacy',
      '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge',
      '/blog/how-to-prepare-for-your-first-virtual-run',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/running-safety-tips-early-morning-night-runs'
    ]
  },
  {
    ...RAINY_SEASON_RUNNING_ARTICLE,
    contentHtml: RAINY_SEASON_RUNNING_PAYLOAD.contentHtml,
    coverImageUrl: RAINY_SEASON_RUNNING_COVER_IMAGE_URL,
    coverImageAlt: RAINY_SEASON_RUNNING_ARTICLE.coverImageAlt,
    ogImageUrl: RAINY_SEASON_RUNNING_COVER_IMAGE_URL,
    publishedAt: '2026-07-28T13:44:55.589Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/how-to-join-a-virtual-run-philippines',
      '/blog/how-to-prepare-for-your-first-virtual-run',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/beginners-guide-to-running-pace',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/how-leaderboards-work-virtual-running-events'
    ]
  },
  {
    ...HOT_HUMID_WEATHER_RUNNING_ARTICLE,
    contentHtml: HOT_HUMID_WEATHER_RUNNING_PAYLOAD.contentHtml,
    coverImageUrl: HOT_HUMID_WEATHER_RUNNING_COVER_IMAGE_URL,
    coverImageAlt: HOT_HUMID_WEATHER_RUNNING_ARTICLE.coverImageAlt,
    ogImageUrl: HOT_HUMID_WEATHER_RUNNING_COVER_IMAGE_URL,
    publishedAt: '2026-07-28T14:09:44.615Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/running-during-rainy-season-philippines',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/how-to-prepare-for-your-first-virtual-run',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/beginners-guide-to-running-pace',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...COMPLETE_50K_CHALLENGE_ARTICLE,
    contentHtml: COMPLETE_50K_CHALLENGE_PAYLOAD.contentHtml,
    coverImageUrl: COMPLETE_50K_CHALLENGE_COVER_IMAGE_URL,
    coverImageAlt: COMPLETE_50K_CHALLENGE_ARTICLE.coverImageAlt,
    ogImageUrl: COMPLETE_50K_CHALLENGE_COVER_IMAGE_URL,
    publishedAt: '2026-07-28T14:27:08.938Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/how-to-prepare-for-your-first-virtual-run',
      '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/beginners-guide-to-running-pace',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/running-during-rainy-season-philippines',
      '/blog/how-to-run-safely-during-hot-and-humid-weather',
      '/blog/running-safety-tips-early-morning-night-runs'
    ]
  },
  {
    ...MONTH_LONG_CONSISTENCY_ARTICLE,
    contentHtml: MONTH_LONG_CONSISTENCY_PAYLOAD.contentHtml,
    coverImageUrl: MONTH_LONG_CONSISTENCY_COVER_IMAGE_URL,
    coverImageAlt: MONTH_LONG_CONSISTENCY_ARTICLE.coverImageAlt,
    ogImageUrl: MONTH_LONG_CONSISTENCY_COVER_IMAGE_URL,
    publishedAt: '2026-07-29T00:14:59.688Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/how-to-prepare-for-your-first-virtual-run',
      '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/beginners-guide-to-running-pace',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-to-complete-a-50k-accumulated-distance-challenge',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/running-during-rainy-season-philippines',
      '/blog/how-to-run-safely-during-hot-and-humid-weather',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...GPS_TRACKING_STOPS_ARTICLE,
    contentHtml: GPS_TRACKING_STOPS_PAYLOAD.contentHtml,
    coverImageUrl: GPS_TRACKING_STOPS_COVER_IMAGE_URL,
    coverImageAlt: GPS_TRACKING_STOPS_ARTICLE.coverImageAlt,
    ogImageUrl: GPS_TRACKING_STOPS_COVER_IMAGE_URL,
    publishedAt: '2026-07-29T00:27:29.788Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/how-to-prepare-for-your-first-virtual-run',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/running-during-rainy-season-philippines',
      '/blog/how-to-run-safely-during-hot-and-humid-weather',
      '/blog/beginners-guide-to-running-pace',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-to-complete-a-50k-accumulated-distance-challenge',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...TREADMILL_VIRTUAL_EVENT_ARTICLE,
    contentHtml: TREADMILL_VIRTUAL_EVENT_PAYLOAD.contentHtml,
    coverImageUrl: TREADMILL_VIRTUAL_EVENT_COVER_IMAGE_URL,
    coverImageAlt: TREADMILL_VIRTUAL_EVENT_ARTICLE.coverImageAlt,
    ogImageUrl: TREADMILL_VIRTUAL_EVENT_COVER_IMAGE_URL,
    publishedAt: '2026-07-29T00:43:25.934Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
      '/blog/how-to-prepare-for-your-first-virtual-run',
      '/blog/best-apps-to-track-your-virtual-run',
      '/blog/beginners-guide-to-running-pace',
      '/blog/what-to-do-when-gps-tracking-stops-during-a-run',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-to-complete-a-50k-accumulated-distance-challenge',
      '/blog/running-during-rainy-season-philippines',
      '/blog/how-to-run-safely-during-hot-and-humid-weather',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...SUBMISSION_REJECTION_ARTICLE,
    contentHtml: SUBMISSION_REJECTION_PAYLOAD.contentHtml,
    coverImageUrl: SUBMISSION_REJECTION_COVER_IMAGE_URL,
    coverImageAlt: SUBMISSION_REJECTION_ARTICLE.coverImageAlt,
    ogImageUrl: SUBMISSION_REJECTION_COVER_IMAGE_URL,
    publishedAt: '2026-07-30T04:06:41.345Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/what-to-do-when-gps-tracking-stops-during-a-run',
      '/blog/how-to-record-a-treadmill-run-for-a-virtual-event',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...FIRST_TIME_ORGANIZER_CHECKLIST_ARTICLE,
    contentHtml: FIRST_TIME_ORGANIZER_CHECKLIST_PAYLOAD.contentHtml,
    coverImageUrl: FIRST_TIME_ORGANIZER_CHECKLIST_COVER_IMAGE_URL,
    coverImageAlt: FIRST_TIME_ORGANIZER_CHECKLIST_ARTICLE.coverImageAlt,
    ogImageUrl: FIRST_TIME_ORGANIZER_CHECKLIST_COVER_IMAGE_URL,
    publishedAt: '2026-07-30T04:39:41.000Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/organizer/create-event',
      '/how-it-works',
      '/faq',
      '/organiser-terms',
      '/privacy',
      '/refund-and-cancellation-policy',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/why-a-virtual-run-submission-may-be-rejected',
      '/blog/what-to-do-when-gps-tracking-stops-during-a-run',
      '/blog/how-to-record-a-treadmill-run-for-a-virtual-event',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/running-safety-tips-early-morning-night-runs'
    ]
  },
  {
    ...SCHOOLS_ORGANIZATIONS_GUIDE_ARTICLE,
    contentHtml: SCHOOLS_ORGANIZATIONS_GUIDE_PAYLOAD.contentHtml,
    coverImageUrl: SCHOOLS_ORGANIZATIONS_GUIDE_COVER_IMAGE_URL,
    coverImageAlt: SCHOOLS_ORGANIZATIONS_GUIDE_ARTICLE.coverImageAlt,
    ogImageUrl: SCHOOLS_ORGANIZATIONS_GUIDE_COVER_IMAGE_URL,
    publishedAt: '2026-07-30T05:20:44.385Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/organizer/create-event',
      '/events',
      '/how-it-works',
      '/faq',
      '/contact',
      '/privacy',
      '/organiser-terms',
      '/refund-and-cancellation-policy',
      '/blog/virtual-run-checklist-for-first-time-organizers',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
      '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/why-a-virtual-run-submission-may-be-rejected',
      '/blog/what-to-do-when-gps-tracking-stops-during-a-run',
      '/blog/how-to-record-a-treadmill-run-for-a-virtual-event',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-leaderboards-work-virtual-running-events',
      '/blog/running-safety-tips-early-morning-night-runs'
    ]
  },
  {
    ...REALISTIC_MONTHLY_RUNNING_GOAL_ARTICLE,
    contentHtml: REALISTIC_MONTHLY_RUNNING_GOAL_PAYLOAD.contentHtml,
    coverImageUrl: REALISTIC_MONTHLY_RUNNING_GOAL_COVER_IMAGE_URL,
    coverImageAlt: REALISTIC_MONTHLY_RUNNING_GOAL_ARTICLE.coverImageAlt,
    ogImageUrl: REALISTIC_MONTHLY_RUNNING_GOAL_COVER_IMAGE_URL,
    publishedAt: '2026-08-02T11:04:09.434Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge',
      '/blog/how-to-stay-consistent-during-a-month-long-virtual-run',
      '/blog/beginner-5k-training-plan-new-runners'
    ]
  },
  {
    ...CLEAR_VIRTUAL_RUN_RULES_ARTICLE,
    contentHtml: CLEAR_VIRTUAL_RUN_RULES_PAYLOAD.contentHtml,
    coverImageUrl: CLEAR_VIRTUAL_RUN_RULES_COVER_IMAGE_URL,
    coverImageAlt: CLEAR_VIRTUAL_RUN_RULES_ARTICLE.coverImageAlt,
    ogImageUrl: CLEAR_VIRTUAL_RUN_RULES_COVER_IMAGE_URL,
    status: 'scheduled',
    publishedAt: '2026-08-03T11:00:00.000Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/how-it-works',
      '/faq',
      '/organiser-terms',
      '/community-guidelines',
      '/privacy',
      '/refund-and-cancellation-policy',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...RUN_WALK_METHOD_ARTICLE,
    contentHtml: RUN_WALK_METHOD_PAYLOAD.contentHtml,
    coverImageUrl: RUN_WALK_METHOD_COVER_IMAGE_URL,
    coverImageAlt: RUN_WALK_METHOD_ARTICLE.coverImageAlt,
    ogImageUrl: RUN_WALK_METHOD_COVER_IMAGE_URL,
    status: 'scheduled',
    publishedAt: '2026-08-06T11:00:00.000Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/beginners-guide-to-running-pace',
      '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/how-to-train-safely-for-virtual-runs-in-hot-and-humid-weather',
      '/blog/running-during-rainy-season-philippines',
      '/blog/how-to-record-a-treadmill-run-for-a-virtual-event',
      '/blog/running-safety-tips-early-morning-night-runs'
    ]
  },
  {
    ...PARTICIPANT_COMMUNICATION_TIMELINE_ARTICLE,
    contentHtml: PARTICIPANT_COMMUNICATION_TIMELINE_PAYLOAD.contentHtml,
    coverImageUrl: PARTICIPANT_COMMUNICATION_TIMELINE_COVER_IMAGE_URL,
    coverImageAlt: PARTICIPANT_COMMUNICATION_TIMELINE_ARTICLE.coverImageAlt,
    ogImageUrl: PARTICIPANT_COMMUNICATION_TIMELINE_COVER_IMAGE_URL,
    status: 'scheduled',
    publishedAt: '2026-08-08T11:00:00.000Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/organiser-terms',
      '/community-guidelines',
      '/privacy',
      '/data-usage-policy',
      '/refund-and-cancellation-policy',
      '/blog/how-to-write-clear-virtual-run-rules-participants-can-follow',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/why-a-virtual-run-submission-may-be-rejected'
    ]
  },
  {
    ...CHOOSE_SAFE_VIRTUAL_RUN_ROUTE_ARTICLE,
    contentHtml: CHOOSE_SAFE_VIRTUAL_RUN_ROUTE_PAYLOAD.contentHtml,
    coverImageUrl: CHOOSE_SAFE_VIRTUAL_RUN_ROUTE_COVER_IMAGE_URL,
    coverImageAlt: CHOOSE_SAFE_VIRTUAL_RUN_ROUTE_ARTICLE.coverImageAlt,
    ogImageUrl: CHOOSE_SAFE_VIRTUAL_RUN_ROUTE_COVER_IMAGE_URL,
    status: 'scheduled',
    publishedAt: '2026-08-10T11:00:00.000Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/privacy',
      '/data-usage-policy',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-to-run-safely-during-hot-and-humid-weather',
      '/blog/running-safety-tips-early-morning-night-runs',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/what-to-do-when-gps-tracking-stops-during-a-run',
      '/blog/how-to-record-a-treadmill-run-for-a-virtual-event'
    ]
  },
  {
    ...FAIR_DISTANCE_CATEGORIES_CHALLENGE_GOALS_ARTICLE,
    contentHtml: FAIR_DISTANCE_CATEGORIES_CHALLENGE_GOALS_PAYLOAD.contentHtml,
    coverImageUrl: FAIR_DISTANCE_CATEGORIES_CHALLENGE_GOALS_COVER_IMAGE_URL,
    coverImageAlt: FAIR_DISTANCE_CATEGORIES_CHALLENGE_GOALS_ARTICLE.coverImageAlt,
    ogImageUrl: FAIR_DISTANCE_CATEGORIES_CHALLENGE_GOALS_COVER_IMAGE_URL,
    status: 'scheduled',
    publishedAt: '2026-08-13T11:00:00.000Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/how-it-works',
      '/events',
      '/organiser-terms',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
      '/blog/how-to-write-clear-virtual-run-rules-participants-can-follow',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge',
      '/blog/how-leaderboards-work-virtual-running-events'
    ]
  },
  {
    ...POST_RUN_RECOVERY_BASICS_ARTICLE,
    contentHtml: POST_RUN_RECOVERY_BASICS_PAYLOAD.contentHtml,
    coverImageUrl: POST_RUN_RECOVERY_BASICS_COVER_IMAGE_URL,
    coverImageAlt: POST_RUN_RECOVERY_BASICS_ARTICLE.coverImageAlt,
    ogImageUrl: POST_RUN_RECOVERY_BASICS_COVER_IMAGE_URL,
    status: 'scheduled',
    publishedAt: '2026-08-15T11:00:00.000Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/faq',
      '/blog/how-to-run-safely-during-hot-and-humid-weather',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/run-walk-method-beginner-friendly-way-build-endurance',
      '/blog/how-to-stay-consistent-during-a-month-long-virtual-run',
      '/blog/how-to-choose-a-safe-route-for-your-virtual-run'
    ]
  },
  {
    ...FAIR_CONSISTENT_RUN_PROOF_REVIEW_CHECKLIST_ARTICLE,
    contentHtml: FAIR_CONSISTENT_RUN_PROOF_REVIEW_CHECKLIST_PAYLOAD.contentHtml,
    coverImageUrl: FAIR_CONSISTENT_RUN_PROOF_REVIEW_CHECKLIST_COVER_IMAGE_URL,
    coverImageAlt: FAIR_CONSISTENT_RUN_PROOF_REVIEW_CHECKLIST_ARTICLE.coverImageAlt,
    ogImageUrl: FAIR_CONSISTENT_RUN_PROOF_REVIEW_CHECKLIST_COVER_IMAGE_URL,
    status: 'scheduled',
    publishedAt: '2026-08-17T11:00:00.000Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/faq',
      '/organiser-terms',
      '/privacy',
      '/blog/how-to-write-clear-virtual-run-rules-participants-can-follow',
      '/blog/what-counts-as-valid-run-proof',
      '/blog/how-to-submit-run-proof-correctly-hellorun',
      '/blog/why-a-virtual-run-submission-may-be-rejected',
      '/blog/how-accumulated-distance-challenges-work',
      '/blog/how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
    ]
  },
  {
    ...WEEKLY_RUNNING_SCHEDULE_WORK_SCHOOL_ARTICLE,
    contentHtml: WEEKLY_RUNNING_SCHEDULE_WORK_SCHOOL_PAYLOAD.contentHtml,
    coverImageUrl: WEEKLY_RUNNING_SCHEDULE_WORK_SCHOOL_COVER_IMAGE_URL,
    coverImageAlt: WEEKLY_RUNNING_SCHEDULE_WORK_SCHOOL_ARTICLE.coverImageAlt,
    ogImageUrl: WEEKLY_RUNNING_SCHEDULE_WORK_SCHOOL_COVER_IMAGE_URL,
    status: 'scheduled',
    publishedAt: '2026-08-20T11:00:00.000Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/faq',
      '/blog/how-to-set-a-realistic-monthly-running-goal',
      '/blog/how-to-stay-consistent-during-a-month-long-virtual-run',
      '/blog/run-walk-method-beginner-friendly-way-build-endurance',
      '/blog/beginner-5k-training-plan-new-runners',
      '/blog/post-run-recovery-basics-rest-hydration-when-to-ease-back',
      '/blog/how-to-choose-a-safe-route-for-your-virtual-run',
      '/blog/how-to-run-safely-during-hot-and-humid-weather',
      '/blog/how-to-choose-between-a-5k-10k-21k-or-distance-challenge'
    ]
  },
  {
    ...DATA_PRIVACY_CHECKLIST_RUNNING_EVENT_ORGANIZERS_ARTICLE,
    contentHtml: DATA_PRIVACY_CHECKLIST_RUNNING_EVENT_ORGANIZERS_PAYLOAD.contentHtml,
    coverImageUrl: DATA_PRIVACY_CHECKLIST_RUNNING_EVENT_ORGANIZERS_COVER_IMAGE_URL,
    coverImageAlt: DATA_PRIVACY_CHECKLIST_RUNNING_EVENT_ORGANIZERS_ARTICLE.coverImageAlt,
    ogImageUrl: DATA_PRIVACY_CHECKLIST_RUNNING_EVENT_ORGANIZERS_COVER_IMAGE_URL,
    status: 'scheduled',
    publishedAt: '2026-08-22T11:00:00.000Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/privacy',
      '/data-usage-policy',
      '/organiser-terms',
      '/community-guidelines',
      '/contact?topic=privacy_data',
      '/how-it-works',
      '/blog/how-to-write-clear-virtual-run-rules-participants-can-follow',
      '/blog/fair-and-consistent-run-proof-review-checklist-for-organizers'
    ]
  },
  {
    ...RACE_DAY_PACKING_ONSITE_HYBRID_EVENTS_ARTICLE,
    contentHtml: RACE_DAY_PACKING_ONSITE_HYBRID_EVENTS_PAYLOAD.contentHtml,
    coverImageUrl: RACE_DAY_PACKING_ONSITE_HYBRID_EVENTS_COVER_IMAGE_URL,
    coverImageAlt: RACE_DAY_PACKING_ONSITE_HYBRID_EVENTS_ARTICLE.coverImageAlt,
    ogImageUrl: RACE_DAY_PACKING_ONSITE_HYBRID_EVENTS_COVER_IMAGE_URL,
    status: 'scheduled',
    publishedAt: '2026-08-24T11:00:00.000Z',
    featured: false,
    authorEmail: EXISTING_GUIDE_AUTHOR_EMAIL,
    links: [
      '/events',
      '/how-it-works',
      '/faq',
      '/blog/how-to-prepare-for-your-first-virtual-run',
      '/blog/virtual-run-vs-traditional-race-which-one-should-you-join',
      '/blog/how-to-run-safely-during-hot-and-humid-weather',
      '/blog/how-to-choose-a-safe-route-for-your-virtual-run'
    ]
  }
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to seed AdSense blog posts.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const author = await ensureAuthor(dryRun);
    const results = [];

    for (const [index, post] of POSTS.entries()) {
      const postAuthor = post.authorEmail
        ? await findExistingAuthor(post.authorEmail)
        : author;
      const payload = buildPostPayload(post, postAuthor, index);
      const existing = await Blog.findOne({ slug: post.slug }).select('_id title status approvedAt publishedAt').lean();
      preservePublishedSeedState(payload, existing);
      results.push({
        slug: post.slug,
        action: existing ? 'update' : 'create'
      });

      if (!dryRun) {
        await Blog.updateOne(
          { slug: post.slug },
          {
            $set: payload,
            $setOnInsert: {
              views: 0,
              likesCount: 0,
              commentsCount: 0
            }
          },
          { upsert: true }
        );
      }
    }

    console.log(JSON.stringify({
      dryRun,
      authorEmail: AUTHOR_EMAIL,
      postCount: POSTS.length,
      results
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

async function findExistingAuthor(email) {
  const author = await User.findOne({ email: String(email || '').trim().toLowerCase(), emailVerified: true, role: 'admin' });
  if (!author) throw new Error(`Existing verified admin guide author not found: ${email}`);
  return author;
}

async function ensureAuthor(dryRun) {
  const existing = await User.findOne({ email: AUTHOR_EMAIL });
  if (existing) {
    if (existing.role !== 'admin') throw new Error(`Configured guide author must be an admin: ${AUTHOR_EMAIL}`);
    if (!dryRun) {
      existing.displayName = EDITORIAL_TEAM_NAME;
      existing.emailVerified = true;
      existing.verifiedAuthor = true;
      existing.trustScore = 90;
      await existing.save();
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash(`HelloRunGuides-${Date.now()}`, 10);
  const author = new User({
    email: AUTHOR_EMAIL,
    passwordHash,
    role: 'admin',
    firstName: 'HelloRun',
    lastName: 'Admin',
    displayName: EDITORIAL_TEAM_NAME,
    emailVerified: true,
    verifiedAuthor: true,
    trustScore: 90
  });

  if (!dryRun) {
    await author.save();
  }

  return author;
}

function buildPostPayload(post, author, index) {
  const publishedAt = post.publishedAt
    ? new Date(post.publishedAt)
    : new Date(Date.UTC(2026, 5, 1 + index, 1, 0, 0));
  const contentHtml = buildContentHtml(post);
  const contentText = htmlToText(contentHtml);
  const coverImageUrl = post.coverImageUrl || COVER_IMAGE_URL;

  const payload = {
    authorId: author._id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    contentHtml,
    contentText,
    contentRaw: contentText,
    templateKey: 'custom',
    coverImageUrl,
    coverImageAlt: post.coverImageAlt || `${post.title} - HelloRun guide`,
    galleryImageUrls: [],
    category: post.category,
    customCategory: '',
    tags: post.tags,
    status: post.status || 'published',
    featured: typeof post.featured === 'boolean' ? post.featured : index < 3,
    readingTime: Math.max(4, Math.ceil(contentText.split(/\s+/).filter(Boolean).length / 180)),
    seoTitle: post.seoTitle || `${post.title} - HelloRun Guide`,
    seoDescription: post.seoDescription || post.excerpt,
    ogImageUrl: post.ogImageUrl || coverImageUrl,
    isDeleted: false,
    publishedAt,
    approvedAt: post.status === 'scheduled' ? null : publishedAt,
    rejectionReason: '',
    moderationNotes: '',
    moderationFlags: [],
    moderationFlagSummary: ''
  };
  Object.assign(payload, buildTrustedEditorialReview(payload, author._id, publishedAt));
  return payload;
}

function preservePublishedSeedState(payload, existing) {
  if (!payload || !existing) return payload;
  if (payload.status === 'scheduled' && existing.status === 'published') {
    payload.status = 'published';
    payload.approvedAt = existing.approvedAt || existing.publishedAt || payload.publishedAt;
  }
  return payload;
}

function buildContentHtml(post) {
  if (post.contentHtml) {
    return String(post.contentHtml).trim();
  }

  const internalLinks = post.links
    .map((href) => `<li><a href="${escapeHtml(href)}">${escapeHtml(formatLinkLabel(href))}</a></li>`)
    .join('');

  const sectionsHtml = post.sections
    .map(([heading, body]) => `<h2>${escapeHtml(heading)}</h2>\n<p>${escapeHtml(body)}</p>`)
    .join('\n');

  return [
    `<p>${escapeHtml(post.excerpt)} This HelloRun guide uses practical virtual running examples for runners and organizers in the Philippines.</p>`,
    sectionsHtml,
    '<h2>Practical takeaway</h2>',
    `<p>Before acting on this guide, compare the advice with the specific HelloRun event page you plan to join or manage. Event rules can differ by distance, payment setup, proof type, leaderboard setting, certificate availability, and final submission deadline.</p>`,
    '<h2>Quick checklist</h2>',
    '<ul><li>Read the event page before registering or publishing.</li><li>Confirm deadlines, accepted proof, and support contact paths.</li><li>Keep screenshots, receipts, and profile details clear and accurate.</li></ul>',
    '<h2>Helpful links</h2>',
    `<ul>${internalLinks}</ul>`
  ].join('\n');
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatLinkLabel(href) {
  if (href === '/events') return 'Browse HelloRun events';
  if (href === '/how-it-works') return 'Read how HelloRun works';
  if (href === '/faq') return 'Read the HelloRun FAQ';
  if (href === '/contact') return 'Contact HelloRun support';
  return href;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  POSTS,
  buildContentHtml,
  buildPostPayload,
  htmlToText,
  preservePublishedSeedState
};
