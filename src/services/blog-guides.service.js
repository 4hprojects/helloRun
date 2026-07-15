// blog-guides.service.js
// Service to fetch grouped guides and organizer resources

const Blog = require('../models/Blog');
const { getPublicBlogQuery } = require('../utils/blog-canonical');

/**
 * Returns grouped guides and organizer resources.
 * @param {Object} opts
 * @param {number} opts.limitPerGroup
 * @returns {Promise<Object>} { guides: [...], organizerResources: [...] }
 */
async function getGuidesAndResources({ limitPerGroup = 12 } = {}) {
  // Guides: category = 'Virtual Run Guide' or 'Training' or 'Race Tips' or 'Injury Prevention'
  const guideCategories = [
    'Virtual Run Guide',
    'Training',
    'Race Tips',
    'Injury Prevention',
    'Motivation',
    'Personal Stories'
  ];
  const guides = await Blog.find(getPublicBlogQuery({
    status: 'published',
    isDeleted: { $ne: true },
    publishedAt: { $lte: new Date() },
    category: { $in: guideCategories }
  }))
    .sort({ publishedAt: -1 })
    .limit(limitPerGroup * guideCategories.length)
    .select('title slug excerpt category coverImageUrl publishedAt authorId')
    .populate('authorId', 'firstName lastName verifiedAuthor trustScore');

  // Organizer resources: category = 'Organizer Guide'
  const organizerResources = await Blog.find(getPublicBlogQuery({
    status: 'published',
    isDeleted: { $ne: true },
    publishedAt: { $lte: new Date() },
    category: 'Organizer Guide'
  }))
    .sort({ publishedAt: -1 })
    .limit(limitPerGroup)
    .select('title slug excerpt category coverImageUrl publishedAt authorId')
    .populate('authorId', 'firstName lastName verifiedAuthor trustScore');

  return { guides, organizerResources };
}

module.exports = {
  getGuidesAndResources
};
