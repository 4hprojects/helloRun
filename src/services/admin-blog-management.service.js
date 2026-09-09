'use strict';

const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const BlogReport = require('../models/BlogReport');
const { BLOG_CATEGORIES } = require('../utils/blog');

const PAGE_SIZE = 20;
const SORTS = Object.freeze({
  newest: { activeRevisionSubmittedAt: -1, submittedAt: -1, updatedAt: -1 },
  oldest: { submittedAt: 1, createdAt: 1 },
  updated: { updatedAt: -1 },
  popular: { views: -1, likesCount: -1, publishedAt: -1 }
});

function regex(value) {
  return new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function normalizeFilters(input = {}) {
  const statusInput = String(input.status || 'pending').toLowerCase();
  const statuses = new Set(['all', 'pending', 'published', 'scheduled', 'rejected', 'archived', 'draft']);
  const reviewTypes = new Set(['all', 'post', 'revision']);
  return {
    page: Math.max(1, Number.parseInt(input.page, 10) || 1),
    status: statuses.has(statusInput) ? statusInput : 'pending',
    sort: SORTS[input.sort] ? input.sort : 'newest',
    q: String(input.q || '').trim().slice(0, 120),
    category: BLOG_CATEGORIES.includes(input.category) ? input.category : '',
    author: mongoose.Types.ObjectId.isValid(input.author) ? String(input.author) : '',
    reviewType: reviewTypes.has(input.reviewType) ? input.reviewType : 'all',
    flagged: String(input.flagged || '') === '1',
    reported: String(input.reported || '') === '1',
    dateFrom: /^\d{4}-\d{2}-\d{2}$/.test(String(input.dateFrom || '')) ? String(input.dateFrom) : '',
    dateTo: /^\d{4}-\d{2}-\d{2}$/.test(String(input.dateTo || '')) ? String(input.dateTo) : ''
  };
}

async function buildPostQuery(filters) {
  const query = { isDeleted: { $ne: true } };
  if (filters.status === 'pending') {
    query.$or = [{ status: 'pending' }, { activeRevisionStatus: 'pending' }];
  } else if (filters.status !== 'all') {
    query.status = filters.status;
  }
  if (filters.reviewType === 'post') {
    query.status = 'pending';
    query.activeRevisionStatus = { $ne: 'pending' };
    delete query.$or;
  } else if (filters.reviewType === 'revision') {
    query.activeRevisionStatus = 'pending';
    delete query.$or;
  }
  if (filters.q) {
    const pattern = regex(filters.q);
    query.$and = [{ $or: [{ title: pattern }, { slug: pattern }, { category: pattern }, { customCategory: pattern }] }];
  }
  if (filters.category) query.category = filters.category;
  if (filters.author) query.authorId = filters.author;
  if (filters.flagged) query['moderationFlags.0'] = { $exists: true };
  if (filters.dateFrom || filters.dateTo) {
    query.updatedAt = {};
    if (filters.dateFrom) query.updatedAt.$gte = new Date(`${filters.dateFrom}T00:00:00.000Z`);
    if (filters.dateTo) query.updatedAt.$lte = new Date(`${filters.dateTo}T23:59:59.999Z`);
  }
  if (filters.reported) {
    const reportedIds = await BlogReport.distinct('blogId', { status: 'open' });
    query._id = { $in: reportedIds };
  }
  return query;
}

async function listManagedPosts(input = {}) {
  const filters = normalizeFilters(input);
  const query = await buildPostQuery(filters);
  const skip = (filters.page - 1) * PAGE_SIZE;
  const [posts, total, statusRows] = await Promise.all([
    Blog.find(query)
      .populate('authorId', 'firstName lastName email')
      .sort(SORTS[filters.sort])
      .skip(skip)
      .limit(PAGE_SIZE)
      .select('title slug status category customCategory coverImageUrl submittedAt scheduledFor publishedAt rejectedAt rejectionReason readingTime createdAt updatedAt activeRevisionStatus activeRevisionSubmittedAt activeRevisionUpdatedAt activeRevisionRejectionReason views likesCount commentsCount featured moderationFlags scheduledPublishFailures scheduledPublishLastAttemptAt scheduledPublishLastError')
      .lean(),
    Blog.countDocuments(query),
    Blog.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);
  const ids = posts.map((post) => post._id);
  const reportRows = ids.length ? await BlogReport.aggregate([
    { $match: { blogId: { $in: ids }, status: 'open' } },
    { $group: { _id: '$blogId', count: { $sum: 1 } } }
  ]) : [];
  const reportCounts = new Map(reportRows.map((row) => [String(row._id), row.count]));
  posts.forEach((post) => { post.openReportCount = reportCounts.get(String(post._id)) || 0; });
  const counts = Object.fromEntries(statusRows.map((row) => [row._id, row.count]));
  counts.all = statusRows.reduce((sum, row) => sum + row.count, 0);
  counts.pendingRevisions = await Blog.countDocuments({ isDeleted: { $ne: true }, activeRevisionStatus: 'pending' });
  return {
    posts,
    filters,
    counts,
    categories: BLOG_CATEGORIES,
    pagination: { page: filters.page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
  };
}

module.exports = { PAGE_SIZE, normalizeFilters, buildPostQuery, listManagedPosts };
