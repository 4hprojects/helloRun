const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    logger.error('Please check:');
    logger.error('1. MongoDB Atlas Network Access (whitelist your IP)');
    logger.error('2. Connection string in .env file');
    logger.error('3. Internet connection');
    process.exit(1);
  }
};

module.exports = connectDB;