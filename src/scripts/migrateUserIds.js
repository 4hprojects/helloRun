require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const counterService = require('../services/counter.service');

async function migrateUserIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Find all users without userId
    const usersWithoutId = await User.find({ userId: { $exists: false } });
    
    console.log(`Found ${usersWithoutId.length} users without userId`);

    if (usersWithoutId.length === 0) {
      console.log('✅ All users already have userId');
      process.exit(0);
    }

    // Assign userId to each user
    for (const user of usersWithoutId) {
      try {
        user.userId = await counterService.getNextUserId();
        await user.save();
        console.log(`✅ Assigned userId ${user.userIdFormatted} to ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to assign userId to ${user.email}:`, error.message);
      }
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateUserIds();