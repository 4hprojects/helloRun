const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const BlogComment = require('../models/BlogComment');
const BlogLike = require('../models/BlogLike');
const BlogReport = require('../models/BlogReport');
const { sanitizeHtml } = require('../utils/sanitize');
const { analyzeCommentSafety } = require('../utils/blog-safety');

function sanitizeText(input) {
  return sanitizeHtml(String(input || ''), { allowedTags: [], allowedAttributes: {} });
}

const MAX_COMMENT_LENGTH = BlogComment.MAX_COMMENT_LENGTH;
const COMMENTS_PAGE_SIZE = 20;
const REPORT_REASONS = BlogReport.REPORT_REASONS;

function getSessionUserId(req) {
  return req.session?.userId || null;
}

async function getPublishedBlogBySlug(slug) {
  return Blog.findOne({ slug, status: 'published', isDeleted: { $ne: true } })
    .select('_id slug likesCount commentsCount')
    .lean();
}

function normalizeReportReason(value) {
  const safe = String(value || '').trim().toLowerCase();
  return REPORT_REASONS.includes(safe) ? safe : '';
}

exports.listComments = async (req, res) => {
  try {
    const post = await getPublishedBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const skip = (page - 1) * COMMENTS_PAGE_SIZE;

    const [comments, total] = await Promise.all([
      BlogComment.find({ blogId: post._id, isDeleted: { $ne: true }, status: 'active' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(COMMENTS_PAGE_SIZE)
        .populate({ path: 'authorId', select: 'firstName lastName' })
        .lean(),
      BlogComment.countDocuments({ blogId: post._id, isDeleted: { $ne: true }, status: 'active' })
    ]);

    return res.json({
      success: true,
      comments,
      pagination: {
        page,
        pageSize: COMMENTS_PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / COMMENTS_PAGE_SIZE)
      }
    });
  } catch (error) {
    console.error('listComments error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load comments.' });
  }
};

exports.createComment = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

    const post = await getPublishedBlogBySlug(req.params.slug);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const rawContent = String(req.body.content || '').trim();
    if (!rawContent) {
      return res.status(400).json({ success: false, message: 'Comment content is required.' });
    }
    if (rawContent.length > MAX_COMMENT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Comment must not exceed ${MAX_COMMENT_LENGTH} characters.`
      });
    }

    const content = sanitizeText(rawContent);
    const safety = analyzeCommentSafety(content);

    const comment = await BlogComment.create({
      blogId: post._id,
      authorId: userId,
      content,
      moderationFlags: safety.flags,
      moderationFlagSummary: safety.summary
    });

    await Blog.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });

    return res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('createComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to post comment.' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

    if (!mongoose.Types.ObjectId.isValid(req.params.commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment id.' });
    }

    const comment = await BlogComment.findOne({
      _id: req.params.commentId,
      isDeleted: { $ne: true }
    }).lean();

    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });

    const isOwner = String(comment.authorId) === String(userId);
    const isAdmin = req.session?.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this comment.' });
    }

    await BlogComment.updateOne(
      { _id: comment._id },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId, status: 'removed' } }
    );

    await Blog.updateOne(
      { _id: comment.blogId, commentsCount: { $gt: 0 } },
      { $inc: { commentsCount: -1 } }
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('deleteComment error:', error);
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
    console.error('toggleLike error:', error);
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
    console.error('reportPost error:', error);
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

    const reason = normalizeReportReason(req.body.reason);
    if (!reason) {
      return res.status(400).json({ success: false, message: 'A valid report reason is required.' });
    }

    const note = String(req.body.note || '').trim().slice(0, 500);
    await BlogReport.create({
      targetType: 'comment',
      blogId: post._id,
      commentId: comment._id,
      reporterId: userId,
      reason,
      note
    });

    return res.status(201).json({ success: true, message: 'Report submitted.' });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You already have an open report for this comment.' });
    }
    console.error('reportComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
};

exports.adminListComments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const status = req.query.status === 'removed' ? 'removed' : 'active';
    const skip = (page - 1) * COMMENTS_PAGE_SIZE;

    const query = { status, isDeleted: status === 'removed' ? true : { $ne: true } };

    const [comments, total] = await Promise.all([
      BlogComment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(COMMENTS_PAGE_SIZE)
        .populate({ path: 'authorId', select: 'firstName lastName email' })
        .populate({ path: 'blogId', select: 'title slug' })
        .lean(),
      BlogComment.countDocuments(query)
    ]);

    return res.json({
      success: true,
      comments,
      pagination: {
        page,
        pageSize: COMMENTS_PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / COMMENTS_PAGE_SIZE)
      }
    });
  } catch (error) {
    console.error('adminListComments error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load comments.' });
  }
};

exports.adminRemoveComment = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!mongoose.Types.ObjectId.isValid(req.params.commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment id.' });
    }

    const comment = await BlogComment.findOne({
      _id: req.params.commentId,
      isDeleted: { $ne: true }
    });
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });

    const note = String(req.body.moderationNote || '').trim().slice(0, 500);

    await comment.updateOne({
      $set: {
        status: 'removed',
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        moderationNote: note
      }
    });

    await Blog.updateOne(
      { _id: comment.blogId, commentsCount: { $gt: 0 } },
      { $inc: { commentsCount: -1 } }
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('adminRemoveComment error:', error);
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

    return res.json({ success: true });
  } catch (error) {
    console.error('adminRestoreComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to restore comment.' });
  }
};

exports.adminListReports = async (req, res) => {
  try {
    const status = String(req.query.status || 'open').trim().toLowerCase();
    const safeStatus = ['open', 'resolved', 'dismissed'].includes(status) ? status : 'open';
    const reports = await BlogReport.find({ status: safeStatus })
      .sort({ createdAt: -1 })
      .populate('reporterId', 'firstName lastName email')
      .populate('blogId', 'title slug')
      .populate('commentId', 'content')
      .populate('resolvedBy', 'firstName lastName email')
      .lean();

    return res.render('admin/blog-reports', {
      title: 'Blog Reports - helloRun Admin',
      reports,
      selectedStatus: safeStatus
    });
  } catch (error) {
    console.error('adminListReports error:', error);
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

    report.status = 'resolved';
    report.resolvedAt = new Date();
    report.resolvedBy = req.session?.userId || null;
    report.resolutionNote = String(req.body.resolutionNote || '').trim().slice(0, 500);
    await report.save();

    return res.redirect('/admin/blog/reports?status=open');
  } catch (error) {
    console.error('adminResolveReport error:', error);
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

    report.status = 'dismissed';
    report.resolvedAt = new Date();
    report.resolvedBy = req.session?.userId || null;
    report.resolutionNote = String(req.body.resolutionNote || '').trim().slice(0, 500);
    await report.save();

    return res.redirect('/admin/blog/reports?status=open');
  } catch (error) {
    console.error('adminDismissReport error:', error);
    return res.redirect('/admin/blog/reports?status=open');
  }
};
