require('dotenv').config();
const mongoose = require('mongoose');

const Event = require('../models/Event');
const { generateDefaultEventBadges, getEventBadgesByMongoEventId } = require('../services/event-badge.service');
const { seedPolicies } = require('./seed-policies');
const { formatPlatformDate } = require('../utils/platform-date');

const TARGET_EVENT_SLUGS = [
  '2026k-hellorun-challenge-4',
  'may-active-quest-2',
  'kalayaan-run-2026-celebrating-128-years-of-freedom',
  'june-active-quest-virtual-run'
];

const PLACEHOLDER_EVENT_PATTERN = /\b(?:shop[-_ ]?empty[-_ ]?event|empty[-_ ]?event|placeholder|submission service test event|smoke|smoke[-_ ]?test|test[-_ ]?event|test[-_ ]?run|dummy|qa|staging)\b/i;

async function run(options = {}) {
  const dryRun = options.dryRun === true;
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const result = {
    policies: null,
    archivedEvents: [],
    updatedEvents: [],
    badgeEvents: [],
    skippedBadges: []
  };

  result.policies = dryRun
    ? { seeded: [], skipped: ['dry run'] }
    : await seedPolicies({
      policyKeys: ['privacy', 'cookie', 'dataUsage'],
      publishCurrent: true
    });

  result.archivedEvents = await archivePlaceholderEvents({ dryRun });
  result.badgeEvents = await generateMissingBadges({ dryRun, skipped: result.skippedBadges });
  result.updatedEvents = await reconcileNamedEvents({ dryRun });

  await mongoose.disconnect();
  return result;
}

async function archivePlaceholderEvents({ dryRun }) {
  const events = await Event.find({
    status: 'published',
    $or: [
      { title: PLACEHOLDER_EVENT_PATTERN },
      { slug: PLACEHOLDER_EVENT_PATTERN },
      { description: PLACEHOLDER_EVENT_PATTERN }
    ]
  }).select('_id title slug').lean();

  if (!dryRun && events.length) {
    await Event.updateMany(
      { _id: { $in: events.map((event) => event._id) } },
      {
        $set: {
          status: 'archived',
          isDeleted: true,
          archivedAt: new Date()
        }
      }
    );
  }

  return events.map((event) => `${event.title} (${event.slug})`);
}

async function reconcileNamedEvents({ dryRun }) {
  const updated = [];
  const events = await Event.find({ slug: { $in: TARGET_EVENT_SLUGS } });

  for (const event of events) {
    const content = buildStructuredEventContent(event, {
      hasPublicBadges: await hasPublicEventBadges(event)
    });
    if (!content) continue;
    if (!dryRun) {
      event.description = content.description;
      event.eventDetailsMarkdown = content.eventDetailsMarkdown;
      await event.save();
    }
    updated.push(`${event.title} (${event.slug})`);
  }

  return updated;
}

async function generateMissingBadges({ dryRun, skipped }) {
  if (!process.env.DATABASE_URL) {
    skipped.push('DATABASE_URL is not set');
    return [];
  }

  const events = await Event.find({
    status: 'published',
    isDeleted: { $ne: true },
    isPersonalRecord: { $ne: true },
    digitalBadgeEnabled: true
  });
  const generated = [];

  for (const event of events) {
    const existing = await getEventBadgesByMongoEventId(event._id).catch(() => []);
    if (existing.length) continue;
    if (!dryRun) {
      try {
        const created = await generateDefaultEventBadges(event);
        if (!created.length) continue;
      } catch (error) {
        skipped.push(`${event.title} (${event.slug}): ${error.message}`);
        continue;
      }
    }
    generated.push(`${event.title} (${event.slug})`);
  }

  return generated;
}

async function hasPublicEventBadges(event) {
  if (event.digitalBadgeEnabled !== true || !process.env.DATABASE_URL) return false;
  const badges = await getEventBadgesByMongoEventId(event._id).catch(() => []);
  return badges.length > 0;
}

function buildStructuredEventContent(event, options = {}) {
  const title = String(event.title || '').trim();
  if (!title) return null;

  const categories = getCategoryGoals(event);
  const categorySummary = categories.length
    ? categories.map((category) => `${category.name} (${category.distanceKmLabel})`).join(', ')
    : getRaceDistances(event).join(', ') || formatTargetDistance(event.targetDistanceKm);
  const isAccumulated = event.virtualCompletionMode === 'accumulated_distance';
  const completionRule = isAccumulated && categories.length > 1
    ? 'Completion is measured against the distance for the category selected during registration.'
    : `Completion is measured against ${formatTargetDistance(event.targetDistanceKm) || 'the listed event distance'}.`;
  const rewards = buildRewardLines(event, { hasPublicBadges: options.hasPublicBadges === true });
  const proofTypes = normalizeList(event.proofTypesAllowed).join(', ') || 'Activity proof accepted by the organizer';
  const activities = normalizeList(event.acceptedRunTypes).join(', ') || 'Run, walk, or other organizer-approved activities';

  const description = [
    `${title} is a HelloRun ${formatEventType(event.eventType)} event scheduled from ${formatPlatformDate(event.eventStartAt)} to ${formatPlatformDate(event.eventEndAt)}.`,
    categorySummary ? `Runners choose ${categorySummary}.` : '',
    completionRule,
    event.registrationCloseAt ? `Registration closes ${formatPlatformDate(event.registrationCloseAt)}.` : '',
    event.finalSubmissionDeadlineAt ? `Final submissions are due by ${formatPlatformDate(event.finalSubmissionDeadlineAt)}.` : ''
  ].filter(Boolean).join(' ');

  const eventDetailsMarkdown = [
    `# ${title}`,
    '',
    '## Event Window',
    `- Registration opens: ${formatPlatformDate(event.registrationOpenAt)}`,
    `- Registration closes: ${formatPlatformDate(event.registrationCloseAt)}`,
    `- Event starts: ${formatPlatformDate(event.eventStartAt)}`,
    `- Event ends: ${formatPlatformDate(event.eventEndAt)}`,
    event.finalSubmissionDeadlineAt ? `- Final submission deadline: ${formatPlatformDate(event.finalSubmissionDeadlineAt)}` : '',
    '',
    '## Distance and Completion Rules',
    categorySummary ? `Available categories: ${categorySummary}.` : '',
    completionRule,
    isAccumulated
      ? 'Runners may submit multiple valid activities during the event window until they reach their completion goal.'
      : 'Runners submit valid activity proof for the selected event distance.',
    '',
    '## Accepted Activities and Proof',
    `Accepted activities: ${activities}.`,
    `Accepted proof: ${proofTypes}.`,
    '',
    '## Rewards and Recognition',
    ...rewards.map((item) => `- ${item}`),
    '',
    'All submitted proof is reviewed before it counts toward completion, leaderboards, certificates, or badges.'
  ].filter(Boolean).join('\n');

  return { description, eventDetailsMarkdown };
}

function getCategoryGoals(event) {
  return (Array.isArray(event.raceCategories) ? event.raceCategories : [])
    .map((category) => {
      const distanceKm = Number(category?.distanceKm || 0);
      if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
      const distanceLabel = String(category.distanceLabel || `${distanceKm}K`).trim().toUpperCase();
      const name = String(category.name || distanceLabel).trim();
      return {
        name,
        distanceKm,
        distanceKmLabel: `${formatNumber(distanceKm)} km`
      };
    })
    .filter(Boolean);
}

function getRaceDistances(event) {
  return normalizeList(event.raceDistances).map((item) => item.toUpperCase());
}

function buildRewardLines(event, options = {}) {
  const rewards = [];
  if (event.digitalCertificateEnabled !== false) rewards.push('Digital certificate for approved finishers');
  if (event.digitalBadgeEnabled === true && options.hasPublicBadges) rewards.push('Digital event badges when badge requirements are met');
  if (event.leaderboardRecognitionEnabled !== false) rewards.push('Leaderboard recognition for approved submissions');
  if (event.physicalRewardsDescription) rewards.push(String(event.physicalRewardsDescription).trim());
  return rewards.length ? rewards : ['Organizer-listed recognition for valid completion'];
}

function formatTargetDistance(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return '';
  return `${formatNumber(number)} km`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value || '');
  return number.toLocaleString('en-US', {
    maximumFractionDigits: 2
  });
}

function formatEventType(value) {
  const normalized = String(value || '').trim();
  if (normalized === 'virtual') return 'virtual';
  if (normalized === 'onsite') return 'on-site';
  if (normalized === 'hybrid') return 'hybrid';
  return 'running';
}

function normalizeList(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function parseCliOptions(args = []) {
  return {
    dryRun: args.includes('--dry-run')
  };
}

if (require.main === module) {
  run(parseCliOptions(process.argv.slice(2)))
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('AdSense blocker cleanup failed:', error);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}

module.exports = {
  run,
  buildStructuredEventContent
};
