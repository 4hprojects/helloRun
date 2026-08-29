'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Event = require('../models/Event');
const {
  SLUG,
  HIGHEST_ELEVATION_CLARIFICATION
} = require('../content/events/cns-move-more-challenge-2026');

const APPLY = process.argv.includes('--apply');
const LEGACY_HIGHEST_ELEVATION_CLARIFICATIONS = [
  'The leaderboard separates **five category leaders** from **three event-wide recognitions**. Category cards rank progress toward each selected goal; combined categories use the lower of distance-goal and step-goal progress. Highest Steps, Highest Elevation, and Most Consistent each compare publicly eligible approved results across all five categories exactly once. Their full standings are also event-wide, so category selection does not create duplicate awards.',
  'The **Highest Elevation** organization recognition is one overall award for the entire event, not one award per category. It compares approved cumulative elevation gain across all five registration categories and displays every exact co-leader. Category selection, search, pagination, and the leaderboard metric you are viewing do not change the recognized participant or participants.',
  'The **Overall Highest Elevation** recognition is one award for the entire event, not one award per category. Before September 1, the card explains when recognition begins without naming a leader. After the event starts, it compares approved cumulative elevation gain across all five registration categories and displays every exact co-leader. Category selection, search, pagination, and the leaderboard metric you are viewing do not change the recognized participant or participants.'
];

function addHighestElevationClarification(markdown = '') {
  const current = String(markdown || '').trim();
  if (current.includes(HIGHEST_ELEVATION_CLARIFICATION)) return current;
  const legacyClarification = LEGACY_HIGHEST_ELEVATION_CLARIFICATIONS.find((item) => current.includes(item));
  if (legacyClarification) {
    return current.replace(legacyClarification, HIGHEST_ELEVATION_CLARIFICATION);
  }

  const nextHeading = '## Move for your wellness, and for each other';
  if (current.includes(nextHeading)) {
    return current.replace(nextHeading, `${HIGHEST_ELEVATION_CLARIFICATION}\n\n${nextHeading}`);
  }
  return `${current}\n\n## Highest Elevation recognition\n\n${HIGHEST_ELEVATION_CLARIFICATION}`.trim();
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required.');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });

  const event = await Event.findOne({ slug: SLUG })
    .select('slug title eventDetailsMarkdown leaderboardSettings.showHighestStepsCard leaderboardSettings.showHighestElevationCard leaderboardSettings.showMostConsistentCard leaderboardSettings.publicRankCutoff')
    .lean();

  if (!event) {
    throw new Error(`Event not found: ${SLUG}`);
  }

  const currentSettings = {
    showHighestStepsCard: event.leaderboardSettings?.showHighestStepsCard === true,
    showHighestElevationCard: event.leaderboardSettings?.showHighestElevationCard === true,
    showMostConsistentCard: event.leaderboardSettings?.showMostConsistentCard === true,
    publicRankCutoff: Number(event.leaderboardSettings?.publicRankCutoff || 0)
  };
  const alreadyEnabled = currentSettings.showHighestStepsCard
    && currentSettings.showHighestElevationCard
    && currentSettings.showMostConsistentCard
    && currentSettings.publicRankCutoff === 10;
  const desiredSettings = {
    showHighestStepsCard: true,
    showHighestElevationCard: true,
    showMostConsistentCard: true,
    publicRankCutoff: 10
  };
  const updatedMarkdown = addHighestElevationClarification(event.eventDetailsMarkdown);
  const markdownAlreadyClarified = updatedMarkdown === String(event.eventDetailsMarkdown || '').trim();

  if (!APPLY || (alreadyEnabled && markdownAlreadyClarified)) {
    console.log(JSON.stringify({
      mode: APPLY ? 'apply' : 'dry-run',
      slug: event.slug,
      currentValue: currentSettings,
      desiredValue: desiredSettings,
      markdownAlreadyClarified,
      mutationApplied: false
    }, null, 2));
    return;
  }

  const result = await Event.updateOne(
    {
      _id: event._id,
      $or: [
        { 'leaderboardSettings.showHighestStepsCard': { $ne: true } },
        { 'leaderboardSettings.showHighestElevationCard': { $ne: true } },
        { 'leaderboardSettings.showMostConsistentCard': { $ne: true } },
        { 'leaderboardSettings.publicRankCutoff': { $ne: 10 } },
        { eventDetailsMarkdown: { $ne: updatedMarkdown } }
      ]
    },
    {
      $set: {
        'leaderboardSettings.showHighestStepsCard': true,
        'leaderboardSettings.showHighestElevationCard': true,
        'leaderboardSettings.showMostConsistentCard': true,
        'leaderboardSettings.publicRankCutoff': 10,
        eventDetailsMarkdown: updatedMarkdown
      }
    }
  );

  console.log(JSON.stringify({
    mode: 'apply',
    slug: event.slug,
    currentValue: currentSettings,
    desiredValue: desiredSettings,
    markdownAlreadyClarified: false,
    mutationApplied: result.modifiedCount === 1
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
