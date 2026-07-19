require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Blog = require('../models/Blog');
const User = require('../models/User');
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

const AUTHOR_EMAIL = 'hellorunonline+guides@gmail.com';
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
    title: '5K vs 10K vs 21K: Which Distance Should You Choose?',
    slug: '5k-vs-10k-vs-21k-which-distance-should-you-choose',
    category: 'Training',
    tags: ['5k', '10k', 'half marathon'],
    excerpt: 'Compare common running distances and choose a HelloRun event that fits your current fitness, schedule, and goal.',
    sections: [
      ['Start with your current base', 'The best event distance is the one you can prepare for consistently and safely. A 5K is approachable for beginners, a 10K suits runners with a few weeks of regular activity, and a 21K requires a longer build with attention to recovery.'],
      ['When a 5K makes sense', 'Choose a 5K if you are new to running, returning from a break, walking with friends, or joining your first virtual event. It is long enough to feel meaningful but short enough to train for without a complex plan.'],
      ['When a 10K makes sense', 'A 10K is a useful next step when you already finish 5K comfortably and want a stronger endurance goal. You may need longer weekend runs, easier recovery days, and clearer pacing so the distance does not become a weekly stressor.'],
      ['When a 21K makes sense', 'A 21K or half-marathon distance should be chosen with more planning. Consider your recent mileage, available training time, hydration habits, route safety, and whether the event allows accumulated submissions or requires one continuous activity.'],
      ['Example', 'A beginner who can walk-run for 30 minutes may start with 5K. A runner who already completes 6K to 8K comfortably may choose 10K. A runner preparing for a long-term milestone may choose 21K only after several weeks of steady training.'],
      ['What to do next', 'Browse HelloRun events, read the event distance rules, and choose a category you can complete honestly within the activity window.']
    ],
    links: ['/events', '/how-it-works', '/faq']
  },
  {
    title: 'Common Virtual Run Mistakes and How to Avoid Them',
    slug: 'common-virtual-run-mistakes-and-how-to-avoid-them',
    category: 'Virtual Run Guide',
    tags: ['virtual run', 'mistakes', 'proof'],
    excerpt: 'Avoid common virtual run mistakes around registration, proof screenshots, deadlines, and event rules.',
    sections: [
      ['Mistake one: registering without reading rules', 'A virtual run is flexible, but it still has official rules. Read the event window, final submission deadline, accepted proof, distance options, payment requirements, and reward details before joining.'],
      ['Mistake two: recording proof too late', 'Do not wait until the final day to test your app, GPS, treadmill display, or screenshot process. If the app fails, the activity stops early, or the screenshot lacks a date, you may have little time to correct it.'],
      ['Mistake three: uploading the wrong file', 'Payment receipts and run proof are different records. Uploading a receipt as activity proof or a running screenshot as payment proof can delay review and create confusion for organizers.'],
      ['Mistake four: ignoring units and dates', 'If your app shows miles but the event uses kilometers, explain the conversion or use a screenshot with the expected unit when possible. Always make sure the activity date falls within the event period.'],
      ['Mistake five: assuming pending means approved', 'Pending submissions still need organizer review. Do not rely on pending proof for final leaderboard position, certificate release, or accumulated challenge completion until the submission is approved.'],
      ['What to do next', 'Check your registration dashboard after submitting and follow any rejection guidance carefully. If the issue is unclear, contact support with the event name and confirmation code.']
    ],
    links: ['/how-it-works', '/faq', '/contact']
  },
  {
    title: 'How Digital Certificates Help Runners Track Progress',
    slug: 'how-digital-certificates-help-runners-track-progress',
    category: 'Race Tips',
    tags: ['certificates', 'runner progress', 'recognition'],
    excerpt: 'Learn how digital certificates can document event completion and motivate consistent running progress.',
    sections: [
      ['Certificates are more than decoration', 'A digital certificate can mark a completed goal, document participation, and remind a runner that consistent effort led to a reviewed finish. It is especially useful for virtual events where participants may run alone.'],
      ['What certificate details should match', 'A trustworthy certificate should align with the event record. Names, event title, distance, completion date, and verification details should reflect the approved submission or completion rule.'],
      ['Why review matters first', 'Certificates should not be issued before proof is checked when the event requires proof review. Organizer review protects the value of the certificate and helps avoid recognition based on unclear or invalid submissions.'],
      ['Example', 'A runner who completes a 10K virtual event and submits clear proof may receive a certificate after approval. For an accumulated 50K challenge, the certificate may depend on reaching the total approved distance before the deadline.'],
      ['How runners can use certificates', 'Certificates can support personal progress tracking, social sharing, team wellness programs, school activities, and motivation for the next event. They should be shared responsibly and not edited in a way that misrepresents the result.'],
      ['What to do next', 'Check each event page to see whether certificates are enabled, then keep your profile details accurate before submitting proof.']
    ],
    links: ['/events', '/how-it-works', '/faq']
  },
  {
    title: 'Free Virtual Runs: What Runners Should Know',
    slug: 'free-virtual-runs-what-runners-should-know',
    category: 'Virtual Run Guide',
    tags: ['free virtual run', 'runner guide', 'registration'],
    excerpt: 'Understand what to check before joining a free virtual run, from event rules to proof review and recognition.',
    sections: [
      ['Free does not mean rule-free', 'A free virtual run can be a great way to start, but participants should still read the event page carefully. Deadlines, accepted proof, distance categories, leaderboard rules, and certificate availability may still apply.'],
      ['Check what is included', 'Some free events focus only on participation. Others may include leaderboards, digital certificates, badges, or community recognition. If physical rewards or shipping are involved, confirm whether any fee applies before registering.'],
      ['Know the proof requirements', 'Even free events may require clear proof before results count. Screenshots should show date, distance, duration, and activity source when the event asks for proof review.'],
      ['Example', 'A community group may host a free 5K wellness run where participants upload app screenshots. The organizer may approve valid submissions and publish a finisher list, but there may be no physical medal or package.'],
      ['Common assumptions to avoid', 'Do not assume all free runs include certificates. Do not assume late proof will be accepted. Do not create multiple accounts to submit duplicate results. Honest participation keeps free events sustainable.'],
      ['What to do next', 'Browse free and paid events on HelloRun, read the event details, and contact support if the registration or proof process is unclear.']
    ],
    links: ['/events', '/faq', '/contact']
  },
  {
    title: 'How to Review Run Proof Fairly as an Organizer',
    slug: 'how-to-review-run-proof-fairly-as-an-organizer',
    category: 'Organizer Guide',
    tags: ['organizer', 'proof review', 'fair review'],
    excerpt: 'A practical organizer guide for reviewing virtual run proof consistently and explaining decisions clearly.',
    sections: [
      ['Fair review starts before submissions arrive', 'Organizers should publish proof rules before registration opens. Participants need to know accepted apps, event dates, minimum distances, unit expectations, deadline rules, and whether treadmill or manual entries are allowed.'],
      ['Use consistent checks', 'Reviewers should check the same core details for every participant: event registration, date, distance, duration, activity type, duplicate proof, and whether the screenshot is readable. Consistency helps avoid disputes.'],
      ['Separate unclear from invalid', 'Some submissions are clearly invalid, while others are only unclear. A blurry screenshot may need resubmission. A wrong date outside the event window may need rejection. Clear rejection reasons help runners understand the difference.'],
      ['Document decisions', 'When possible, keep notes for rejected or corrected submissions. Notes make support easier if a participant asks why a result did not count, and they help multiple reviewers apply the same event rules.'],
      ['Example', 'If a 5K event requires at least 5.00 km, a 4.92 km screenshot should be handled according to the published tolerance rule. If no tolerance was published, the organizer should avoid making one-off exceptions that are unfair to other runners.'],
      ['What to do next', 'Before publishing your next HelloRun event, review your proof rules, payment flow, leaderboard settings, and certificate criteria from the participant point of view.']
    ],
    links: ['/contact', '/how-it-works', '/faq']
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
      const payload = buildPostPayload(post, author, index);
      const existing = await Blog.findOne({ slug: post.slug }).select('_id title').lean();
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

async function ensureAuthor(dryRun) {
  const existing = await User.findOne({ email: AUTHOR_EMAIL });
  if (existing) {
    if (!dryRun) {
      existing.firstName = 'Henz';
      existing.lastName = 'Sagorsor';
      existing.role = 'admin';
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
    firstName: 'Henz',
    lastName: 'Sagorsor',
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

  return {
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
    status: 'published',
    featured: index < 3,
    readingTime: Math.max(4, Math.ceil(contentText.split(/\s+/).filter(Boolean).length / 180)),
    seoTitle: post.seoTitle || `${post.title} - HelloRun Guide`,
    seoDescription: post.seoDescription || post.excerpt,
    ogImageUrl: post.ogImageUrl || coverImageUrl,
    isDeleted: false,
    publishedAt,
    approvedAt: publishedAt,
    rejectionReason: '',
    moderationNotes: '',
    moderationFlags: [],
    moderationFlagSummary: ''
  };
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
  htmlToText
};
