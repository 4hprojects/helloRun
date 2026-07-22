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
    status: 'published',
    featured: typeof post.featured === 'boolean' ? post.featured : index < 3,
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
  Object.assign(payload, buildTrustedEditorialReview(payload, author._id, publishedAt));
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
  htmlToText
};
