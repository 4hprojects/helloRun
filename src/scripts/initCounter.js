require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Counter = require('../models/Counter');

async function initializeCounters() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Initialize userId counter
    const userCounter = await Counter.findById('userId');
    if (!userCounter) {
      await Counter.create({
        _id: 'userId',
        sequence: 0
      });
      console.log('✅ userId counter initialized (starting at 0)');
    } else {
      console.log(`✅ userId counter already exists (current: ${userCounter.sequence})`);
    }

    console.log('Counter initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing counters:', error);
    process.exit(1);
  }
}

initializeCounters();