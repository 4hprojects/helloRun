// publish-scheduled-blogs.js
// Script to auto-publish scheduled blog posts whose publishedAt <= now

const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const User = require('../models/User');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/hellorun';

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const now = new Date();
  const scheduledPosts = await Blog.find({
    status: 'scheduled',
    publishedAt: { $lte: now },
    isDeleted: { $ne: true }
  });
  if (!scheduledPosts.length) {
    console.log('No scheduled posts to publish.');
    await mongoose.disconnect();
    return;
  }
  for (const post of scheduledPosts) {
    post.status = 'published';
    post.approvedAt = now;
    post.approvedBy = post.approvedBy || null; // Optionally set to system user
    await post.save();
    console.log(`Published scheduled post: ${post.title} (${post._id})`);
  }
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error publishing scheduled blogs:', err);
  process.exit(1);
});
