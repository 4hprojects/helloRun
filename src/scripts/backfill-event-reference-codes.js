require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { generateUniqueReferenceCode } = require('../utils/referenceCode');

async function backfillEventReferenceCodes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const events = await Event.find({
      $or: [
        { referenceCode: { $exists: false } },
        { referenceCode: '' }
      ]
    }).sort({ createdAt: 1 });

    if (!events.length) {
      console.log('No events need backfill.');
      process.exit(0);
    }

    console.log(`Found ${events.length} event(s) to backfill.`);
    let updatedCount = 0;

    for (const event of events) {
      const referenceCode = await generateUniqueReferenceCode({
        title: event.title,
        date: event.createdAt || new Date(),
        existsFn: async (candidate) => Event.exists({ referenceCode: candidate, _id: { $ne: event._id } })
      });

      event.referenceCode = referenceCode;
      await event.save();
      updatedCount += 1;
      console.log(`Updated ${event._id} -> ${referenceCode}`);
    }

    console.log(`Backfill complete. Updated ${updatedCount} event(s).`);
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
}

backfillEventReferenceCodes();
