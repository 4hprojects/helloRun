// Load environment variables FIRST
require('dotenv').config();

const mongoose = require('mongoose');
const Counter = require('../models/Counter');

async function initializeCounters() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check if user counter exists (using _id as the counter name)
    let userCounter = await Counter.findById('userId');
    
    if (!userCounter) {
      userCounter = await Counter.create({
        _id: 'userId',  // Use _id instead of name
        sequence: 0
      });
      console.log('✅ User counter initialized');
    } else {
      console.log('✅ User counter already exists');
    }
    
    console.log(`Current userId sequence: ${userCounter.sequence}`);
    
    await mongoose.disconnect();
    console.log('✅ Counters initialized successfully');
  } catch (error) {
    console.error('Error initializing counters:', error);
    process.exit(1);
  }
}

initializeCounters();