'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Event = require('../models/Event');
const {
  SLUG,
  VENUE_NAME
} = require('../content/events/cns-move-more-challenge-2026');

const APPLY = process.argv.includes('--apply');

function removeTreadmillOption(markdown = '') {
  const updated = String(markdown || '')
    .replace('## Walk, jog, run, hike, or use a treadmill', '## Walk, jog, run, or hike')
    .replace(
      'Valid activities: walking, jogging, running, hiking, and treadmill walking or running.',
      'Valid activities: walking, jogging, running, and hiking.'
    )
    .replace(
      'another smartphone pedometer, a smartwatch companion app, or a treadmill activity record.',
      'another smartphone pedometer, or a smartwatch companion app.'
    );

  if (/treadmill/i.test(updated)) {
    throw new Error(`Unexpected treadmill wording remains in ${SLUG}; review the event content before applying.`);
  }
  return updated;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });

  const event = await Event.findOne({ slug: SLUG })
    .select('_id slug venueName eventDetailsMarkdown')
    .lean();
  if (!event) throw new Error(`Event not found: ${SLUG}`);

  const updatedMarkdown = removeTreadmillOption(event.eventDetailsMarkdown);

  const changes = {
    venueName: String(event.venueName || '') !== VENUE_NAME,
    eventDetailsMarkdown: String(event.eventDetailsMarkdown || '') !== updatedMarkdown
  };
  const needsUpdate = Object.values(changes).some(Boolean);

  if (!APPLY || !needsUpdate) {
    console.log(JSON.stringify({
      mode: APPLY ? 'apply' : 'dry-run',
      slug: event.slug,
      changes,
      mutationApplied: false
    }, null, 2));
    return;
  }

  const result = await Event.updateOne(
    { _id: event._id },
    {
      $set: {
        venueName: VENUE_NAME,
        eventDetailsMarkdown: updatedMarkdown
      }
    }
  );

  console.log(JSON.stringify({
    mode: 'apply',
    slug: event.slug,
    changes,
    mutationApplied: result.modifiedCount === 1
  }, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error?.stack || error);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
}

module.exports = { removeTreadmillOption };
