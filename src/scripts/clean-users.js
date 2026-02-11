require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function cleanUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Delete all users
    const result = await User.deleteMany({});
    console.log(`✓ Deleted ${result.deletedCount} users`);
    
    // Also reset the counter
    const Counter = require('../models/Counter');
    await Counter.findOneAndUpdate(
      { name: 'user' },
      { sequence: 0 },
      { upsert: true }
    );
    console.log('✓ Reset user counter');
    
    console.log('\n✅ Database cleaned! You can now create new users.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanUsers();