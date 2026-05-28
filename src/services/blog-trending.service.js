const Blog = require('../models/Blog');

/**
 * Calculate trending score for a blog post.
 * Formula: weighted sum of views, likes, comments, recency, and featured status.
 * This can be tuned as needed.
 */
function calculateTrendingScore({ views = 0, likes = 0, comments = 0, publishedAt, featured = false }) {
  const now = Date.now();
  const publishedTime = publishedAt ? new Date(publishedAt).getTime() : now;
  const hoursSincePublished = Math.max((now - publishedTime) / 36e5, 1);

  // Weight factors (tune as needed)
  const VIEW_WEIGHT = 1;
  const LIKE_WEIGHT = 8;
  const COMMENT_WEIGHT = 12;
  const FEATURED_BONUS = 50;
  const RECENCY_DECAY = 1.5; // Higher = faster decay

  let score = 0;
  score += views * VIEW_WEIGHT;
  score += likes * LIKE_WEIGHT;
  score += comments * COMMENT_WEIGHT;
  if (featured) score += FEATURED_BONUS;

  // Recency decay (newer posts get a boost)
  score = score / Math.pow(hoursSincePublished, RECENCY_DECAY);
  return Math.round(score);
}

/**
 * Recalculate trending scores for all published, non-deleted blog posts.
 * Should be run periodically (e.g., every 10-30 minutes).
 */
async function recalculateAllTrendingScores() {
  const posts = await Blog.find({
    status: 'published',
    isDeleted: { $ne: true },
    publishedAt: { $lte: new Date() }
  }).select('views likesCount commentsCount publishedAt featured').lean();

  const bulkOps = posts.map(post => {
    const trendingScore = calculateTrendingScore({
      views: post.views,
      likes: post.likesCount,
      comments: post.commentsCount,
      publishedAt: post.publishedAt,
      featured: post.featured
    });
    return {
      updateOne: {
        filter: { _id: post._id },
        update: { trendingScore }
      }
    };
  });

  if (bulkOps.length) {
    await Blog.bulkWrite(bulkOps);
  }
}

module.exports = {
  calculateTrendingScore,
  recalculateAllTrendingScores
};
