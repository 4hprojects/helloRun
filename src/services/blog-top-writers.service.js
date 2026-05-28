// blog-top-writers.service.js
// Service to aggregate top writers by published blog count, likes, and trending score

const Blog = require('../models/Blog');
const User = require('../models/User');

/**
 * Returns top writers ranked by published blog count, likes, and trending score.
 * @param {Object} opts
 * @param {number} opts.limit
 * @returns {Promise<Array>} Array of top writers with stats
 */
async function getTopWriters({ limit = 10 } = {}) {
  // Aggregate published, non-deleted blogs
  const pipeline = [
    {
      $match: {
        status: 'published',
        isDeleted: { $ne: true },
        publishedAt: { $lte: new Date() }
      }
    },
    {
      $group: {
        _id: '$authorId',
        publishedCount: { $sum: 1 },
        totalLikes: { $sum: '$likesCount' },
        totalTrendingScore: { $sum: '$trendingScore' },
        totalViews: { $sum: '$views' }
      }
    },
    {
      $sort: {
        publishedCount: -1,
        totalTrendingScore: -1,
        totalLikes: -1,
        totalViews: -1
      }
    },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'author'
      }
    },
    { $unwind: '$author' },
    {
      $project: {
        _id: 0,
        authorId: '$_id',
        publishedCount: 1,
        totalLikes: 1,
        totalTrendingScore: 1,
        totalViews: 1,
        firstName: '$author.firstName',
        lastName: '$author.lastName',
        verifiedAuthor: '$author.verifiedAuthor',
        trustScore: '$author.trustScore',
        avatarUrl: '$author.avatarUrl',
        country: '$author.country'
      }
    }
  ];
  return Blog.aggregate(pipeline).exec();
}

module.exports = {
  getTopWriters
};
