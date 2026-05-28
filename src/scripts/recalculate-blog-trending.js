// Run this script to recalculate trending scores for all blog posts
const mongoose = require('mongoose');
const { recalculateAllTrendingScores } = require('../services/blog-trending.service');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  await recalculateAllTrendingScores();
  await mongoose.disconnect();
  console.log('Trending scores recalculated.');
}

if (require.main === module) {
  main();
}
