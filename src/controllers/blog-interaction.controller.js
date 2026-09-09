const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Blog = require('../models/Blog');
const BlogComment = require('../models/BlogComment');
const BlogLike = require('../models/BlogLike');
const BlogReport = require('../models/BlogReport');
const User = require('../models/User');
const { recordCriticalAuditEventInBackground } = require('../services/critical-audit.service');
const {
  COMMENTS_PAGE_SIZE,
  BlogCommentError,
  getPublishedBlogBySlug,
  listCommentThreads,
  listThreadReplies,
  listCommentHistory,
  createComment,
  editComment,
  redactCommentRevision,
  removeComment
} = require('../services/blog-comment.service');

const REPORT_REASONS = BlogReport.REPORT_REASONS;

function getSessionUserId(req) {
  return req.session?.userId || null;
}

function normalizeReportReason(value) {
  const safe = String(value || '').trim().toLowerCase();
  return REPORT_REASONS.includes(safe) ? safe : '';
}

function recordBlogCommunityAudit(req, action, targetType, targetId, details = {}) {
  recordCriticalAuditEventInBackground({
    action,
    targetType,
    targetId: String(targetId || ''),
    actorMongoUserId: req.session?.userId || '',
    notes: JSON.stringify(details).slice(0, 4000),
    ipAddress: req.ip,
    userAgent: req.get?.('user-agent') || '',
    occurredAt: new Date()
  });
}

async function loadAdminComments(queryInput = {}) {
  const page = Math.max(1, parseInt(queryInput.page, 10) || 1);
  const status = queryInput.status === 'removed' ? 'removed' : 'active';
  const q = String(queryInput.q || '').trim().slice(0, 120);
  const skip = (page - 1) * COMMENTS_PAGE_SIZE;
  const query = { status, isDeleted: status === 'removed' ? true : { $ne: true } };
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [blogIds, authorIds] = await Promise.all([
      Blog.find({ title: pattern }).distinct('_id'),
      User.find({ $or: [{ firstName: pattern }, { lastName: pattern }, { email: pattern }] }).distinct('_id')
    ]);
    query.$or = [{ content: pattern }, { blogId: { $in: blogIds } }, { authorId: { $in: authorIds } }];
  }
  const [comments, total] = await Promise.all([
    BlogComment.find(query).sort({ createdAt: -1 }).skip(skip).limit(COMMENTS_PAGE_SIZE)
      .populate({ path: 'authorId', select: 'firstName lastName email' })
      .populate({ path: 'blogId', select: 'title slug' }).lean(),
    BlogComment.countDocuments(query)
  ]);
  return { comments, selectedStatus: status, searchQuery: q, pagination: {
    page, pageSize: COMMENTS_PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / COMMENTS_PAGE_SIZE))
  } };
}

exports.listComments = async (req, res) => {
  try {
    const post = await getPublishedBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const result = await listCommentThreads(post, {
      page: req.query.page,
      focusThreadId: req.query.thread,
      focusReplyId: req.query.reply
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    logger.error('listComments error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load comments.' });
  }
};

exports.listCommentReplies = async (req, res) => {
  try {
    const post = await getPublishedBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const result = await listThreadReplies(post, req.params.commentId, { page: req.query.page });
    return res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof BlogCommentError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    logger.error('listCommentReplies error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load replies.' });
  }
};

exports.createComment = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

    const post = await getPublishedBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const comment = await createComment({
      post,
      userId,
      content: req.body.content,
      replyToCommentId: req.body.replyToCommentId
    });
    return res.status(201).json({ success: true, comment });
  } catch (error) {
    if (error instanceof BlogCommentError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    logger.error('createComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to post comment.' });
  }
};

exports.editComment = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const post = await getPublishedBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const comment = await editComment({
      post,
      commentId: req.params.commentId,
      userId,
      content: req.body.content,
      expectedUpdatedAt: req.body.expectedUpdatedAt
    });
    return res.json({ success: true, comment });
  } catch (error) {
    if (error instanceof BlogCommentError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    logger.error('editComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to edit comment.' });
  }
};

exports.getCommentHistory = async (req, res) => {
  try {
    const post = await getPublishedBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const history = await listCommentHistory(post, req.params.commentId);
    return res.json({ success: true, ...history });
  } catch (error) {
    if (error instanceof BlogCommentError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    logger.error('getCommentHistory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load comment history.' });
  }
};

exports.redactCommentRevision = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const post = await getPublishedBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const history = await redactCommentRevision({
      post,
      commentId: req.params.commentId,
      revisionId: req.params.revisionId,
      userId
    });
    return res.json({ success: true, ...history });
  } catch (error) {
    if (error instanceof BlogCommentError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    logger.error('redactCommentRevision error:', error);
    return res.status(500).json({ success: false, message: 'Failed to redact revision.' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

    const result = await removeComment({
      commentId: req.params.commentId,
      userId,
      isAdmin: req.session?.role === 'admin'
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof BlogCommentError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    logger.error('deleteComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete comment.' });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

    const post = await getPublishedBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const existing = await BlogLike.findOne({ blogId: post._id, userId });

    if (existing) {
      await BlogLike.deleteOne({ _id: existing._id });
      await Blog.updateOne(
        { _id: post._id, likesCount: { $gt: 0 } },
        { $inc: { likesCount: -1 } }
      );
      return res.json({ success: true, liked: false, likesCount: Math.max(0, post.likesCount - 1) });
    }

    await BlogLike.create({ blogId: post._id, userId });
    await Blog.updateOne({ _id: post._id }, { $inc: { likesCount: 1 } });
    return res.json({ success: true, liked: true, likesCount: post.likesCount + 1 });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Already liked.' });
    }
    logger.error('toggleLike error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle like.' });
  }
};

exports.reportPost = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

    const post = await getPublishedBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const reason = normalizeReportReason(req.body.reason);
    if (!reason) {
      return res.status(400).json({ success: false, message: 'A valid report reason is required.' });
    }

    const note = String(req.body.note || '').trim().slice(0, 500);
    await BlogReport.create({
      targetType: 'post',
      blogId: post._id,
      reporterId: userId,
      reason,
      note
    });

    return res.status(201).json({ success: true, message: 'Report submitted.' });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You already have an open report for this post.' });
    }
    logger.error('reportPost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
};

exports.reportComment = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

    const post = await getPublishedBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment id.' });
    }

    const comment = await BlogComment.findOne({
      _id: req.params.commentId,
      blogId: post._id,
      isDeleted: { $ne: true },
      status: 'active'
    }).lean();
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }
    if (String(comment.authorId) === String(userId)) {
      return res.status(403).json({ success: false, message: 'You cannot report your own comment.' });
    }

    const reason = normalizeReportReason(req.body.reason);
    if (!reason) {
      return res.status(400).json({ success: false, message: 'A valid report reason is required.' });
    }

    const note = String(req.body.note || '').trim().slice(0, 500);
    await BlogReport.create({
      targetType: 'comment',
      blogId: post._id,
      commentId: comment._id,
      commentContentSnapshot: String(comment.content || ''),
      commentAuthorIdSnapshot: comment.authorId,
      commentRevisionAtSnapshot: comment.lastEditedAt || comment.createdAt,
      commentEditCountSnapshot: Number(comment.editCount || 0),
      reporterId: userId,
      reason,
      note
    });

    return res.status(201).json({ success: true, message: 'Report submitted.' });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You already have an open report for this comment.' });
    }
    logger.error('reportComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
};

exports.adminListComments = async (req, res) => {
  try {
    return res.render('admin/blog-comments', { title: 'Blog Comments - HelloRun Admin', ...(await loadAdminComments(req.query)) });
  } catch (error) {
    logger.error('adminListComments error:', error);
    return res.status(500).render('error', { title: 'Server Error', status: 500, message: 'Failed to load comments.' });
  }
};

exports.adminListCommentsJson = async (req, res) => {
  try {
    return res.json({ success: true, ...(await loadAdminComments(req.query)) });
  } catch (error) {
    logger.error('adminListCommentsJson error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load comments.' });
  }
};

exports.adminRemoveComment = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    const result = await removeComment({
      commentId: req.params.commentId,
      userId,
      isAdmin: true,
      moderationNote: req.body.moderationNote
    });
    recordBlogCommunityAudit(req, 'admin.blog_comment.removed', 'blog_comment', req.params.commentId, {
      moderationNote: req.body.moderationNote || ''
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof BlogCommentError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    logger.error('adminRemoveComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove comment.' });
  }
};

exports.adminRestoreComment = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment id.' });
    }

    const comment = await BlogComment.findOne({
      _id: req.params.commentId,
      isDeleted: true,
      status: 'removed'
    });
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found or not removed.' });

    await comment.updateOne({
      $set: {
        status: 'active',
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        moderationNote: ''
      }
    });

    await Blog.updateOne({ _id: comment.blogId }, { $inc: { commentsCount: 1 } });
    recordBlogCommunityAudit(req, 'admin.blog_comment.restored', 'blog_comment', comment._id);

    return res.json({ success: true });
  } catch (error) {
    logger.error('adminRestoreComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to restore comment.' });
  }
};

exports.adminListReports = async (req, res) => {
  try {
    const status = String(req.query.status || 'open').trim().toLowerCase();
    const safeStatus = ['open', 'resolved', 'dismissed'].includes(status) ? status : 'open';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const targetType = ['post', 'comment'].includes(req.query.targetType) ? req.query.targetType : '';
    const reason = REPORT_REASONS.includes(req.query.reason) ? req.query.reason : '';
    const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateFrom || '')) ? String(req.query.dateFrom) : '';
    const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateTo || '')) ? String(req.query.dateTo) : '';
    const query = { status: safeStatus };
    if (targetType) query.targetType = targetType;
    if (reason) query.reason = reason;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) query.createdAt.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    }
    const [reports, total] = await Promise.all([BlogReport.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * COMMENTS_PAGE_SIZE)
      .limit(COMMENTS_PAGE_SIZE)
      .populate('reporterId', 'firstName lastName email')
      .populate('blogId', 'title slug')
      .populate('commentId', 'content')
      .populate('commentAuthorIdSnapshot', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email')
      .lean(), BlogReport.countDocuments(query)]);

    return res.render('admin/blog-reports', {
      title: 'Blog Reports - HelloRun Admin',
      reports,
      selectedStatus: safeStatus,
      selectedTargetType: targetType,
      selectedReason: reason,
      dateFrom,
      dateTo,
      reasons: REPORT_REASONS,
      pagination: { page, pageSize: COMMENTS_PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / COMMENTS_PAGE_SIZE)) }
    });
  } catch (error) {
    logger.error('adminListReports error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'Failed to load blog reports.'
    });
  }
};

exports.adminResolveReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.reportId)) {
      return res.redirect('/admin/blog/reports?status=open');
    }
    const report = await BlogReport.findById(req.params.reportId);
    if (!report) {
      return res.redirect('/admin/blog/reports?status=open');
    }

    if (report.status !== 'open') {
      return res.redirect('/admin/blog/reports?status=open&type=error&msg=Report%20is%20already%20closed.');
    }
    const outcome = ['remove_target', 'retain_target', 'escalate'].includes(req.body.outcome)
      ? req.body.outcome
      : '';
    const resolutionNote = String(req.body.resolutionNote || '').trim().slice(0, 500);
    if (!outcome || resolutionNote.length < 10) {
      return res.redirect('/admin/blog/reports?status=open&type=error&msg=Choose%20an%20outcome%20and%20provide%20a%20resolution%20note.');
    }
    if (outcome === 'remove_target') {
      if (report.targetType === 'comment' && report.commentId) {
        await removeComment({ commentId: report.commentId, userId: req.session?.userId, isAdmin: true, moderationNote: resolutionNote });
        recordBlogCommunityAudit(req, 'admin.blog_comment.removed', 'blog_comment', report.commentId, { moderationNote: resolutionNote, reportId: report._id });
      } else if (report.targetType === 'post') {
        await Blog.updateOne(
          { _id: report.blogId, status: { $in: ['published', 'scheduled'] } },
          { $set: { status: 'archived', scheduledFor: null, reviewedAt: new Date() } }
        );
        recordBlogCommunityAudit(req, 'admin.blog.archived', 'blog', report.blogId, { reportId: report._id, resolutionNote });
      }
    }
    report.status = outcome === 'retain_target' ? 'dismissed' : 'resolved';
    report.resolvedAt = new Date();
    report.resolvedBy = req.session?.userId || null;
    report.resolutionNote = resolutionNote;
    report.outcome = outcome;
    await report.save();
    recordBlogCommunityAudit(req, 'admin.blog_report.resolved', 'blog_report', report._id, {
      outcome, targetType: report.targetType, targetId: report.commentId || report.blogId, resolutionNote
    });

    return res.redirect('/admin/blog/reports?status=open');
  } catch (error) {
    logger.error('adminResolveReport error:', error);
    return res.redirect('/admin/blog/reports?status=open');
  }
};

exports.adminDismissReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.reportId)) {
      return res.redirect('/admin/blog/reports?status=open');
    }
    const report = await BlogReport.findById(req.params.reportId);
    if (!report) {
      return res.redirect('/admin/blog/reports?status=open');
    }

    if (report.status !== 'open') return res.redirect('/admin/blog/reports?status=open');
    const resolutionNote = String(req.body.resolutionNote || '').trim().slice(0, 500);
    if (resolutionNote.length < 10) return res.redirect('/admin/blog/reports?status=open&type=error&msg=A%20dismissal%20note%20is%20required.');
    report.status = 'dismissed';
    report.resolvedAt = new Date();
    report.resolvedBy = req.session?.userId || null;
    report.resolutionNote = resolutionNote;
    report.outcome = 'retain_target';
    await report.save();
    recordBlogCommunityAudit(req, 'admin.blog_report.dismissed', 'blog_report', report._id, {
      targetType: report.targetType, targetId: report.commentId || report.blogId, resolutionNote: report.resolutionNote
    });

    return res.redirect('/admin/blog/reports?status=open');
  } catch (error) {
    logger.error('adminDismissReport error:', error);
    return res.redirect('/admin/blog/reports?status=open');
  }
};
