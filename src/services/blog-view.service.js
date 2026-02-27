const Blog = require('../models/Blog');
const BlogView = require('../models/BlogView');

const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

async function registerBlogView({ blogId, userId, ipAddress }) {
  if (!blogId) return false;

  const now = new Date();
  const threshold = new Date(now.getTime() - VIEW_WINDOW_MS);
  const cleanIp = String(ipAddress || '').trim().slice(0, 100);

  let existingView = null;
  if (userId) {
    existingView = await BlogView.findOne({
      blogId,
      userId,
      viewedAt: { $gte: threshold }
    }).select('_id');
  } else if (cleanIp) {
    existingView = await BlogView.findOne({
      blogId,
      userId: null,
      ipAddress: cleanIp,
      viewedAt: { $gte: threshold }
    }).select('_id');
  }

  if (existingView) {
    return false;
  }

  await BlogView.create({
    blogId,
    userId: userId || null,
    ipAddress: userId ? '' : cleanIp,
    viewedAt: now
  });

  await Blog.updateOne({ _id: blogId }, { $inc: { views: 1 } });
  return true;
}

module.exports = {
  registerBlogView
};
