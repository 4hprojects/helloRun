const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const BlogRevision = require('../models/BlogRevision');
const User = require('../models/User');
const uploadService = require('../services/upload.service');
const { BLOG_CATEGORIES, BLOG_STATUSES, slugifyBlogTitle, normalizeTags } = require('../utils/blog');
const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');

const EDITABLE_STATUSES = new Set(['draft', 'pending', 'rejected']);
const ADMIN_REVIEW_STATUSES = new Set(['pending', 'published', 'rejected', 'archived', 'draft']);
const MIN_REJECTION_REASON_LENGTH = 15;
const MAX_REJECTION_REASON_LENGTH = 500;
const REVISION_MAX_FIELD_LENGTH = 12000;
const ADMIN_AUTOSAVE_TRACKED_FIELDS = Object.freeze([
  'title',
  'slug',
  'excerpt',
  'contentHtml',
  'contentRaw',
  'coverImageUrl',
  'category',
  'customCategory',
  'tags',
  'status',
  'featured',
  'seoTitle',
  'seoDescription',
  'ogImageUrl',
  'moderationNotes',
  'readingTime'
]);

exports.getMyBlogs = async (req, res) => {
  try {
    const user = await getAuthorFromSession(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const status = normalizeStatusFilter(req.query.status);
    const query = {
      authorId: user._id,
      isDeleted: { $ne: true }
    };
    if (status) query.status = status;

    const posts = await Blog.find(query)
      .sort({ updatedAt: -1 })
      .select('title slug status category customCategory submittedAt approvedAt rejectedAt rejectionReason publishedAt updatedAt createdAt');

    return res.json({
      success: true,
      posts
    });
  } catch (error) {
    console.error('getMyBlogs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load posts.' });
  }
};

exports.getMyBlogById = async (req, res) => {
  try {
    const user = await getAuthorFromSession(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post id.' });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      authorId: user._id,
      isDeleted: { $ne: true }
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    return res.json({ success: true, post });
  } catch (error) {
    console.error('getMyBlogById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load post.' });
  }
};

exports.createDraft = async (req, res) => {
  const uploadedKeys = [];
  try {
    const user = await getAuthorFromSession(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.uploadError) {
      return res.status(400).json({ success: false, message: req.uploadError });
    }

    const payload = normalizeBlogPayload(req.body);
    const coverImageFile = req.file || null;
    if (coverImageFile) {
      const uploadedCover = await uploadService.uploadBlogCoverToR2({
        userId: user._id,
        coverImageFile: coverImageFile
      });
      uploadedKeys.push(uploadedCover.key);
      payload.coverImageUrl = uploadedCover.url;
    }

    const errors = validateBlogPayload(payload);
    if (errors.length) {
      if (uploadedKeys.length) {
        await uploadService.deleteObjects(uploadedKeys);
      }
      return res.status(400).json({ success: false, message: 'Validation failed.', errors });
    }

    const slug = await generateUniqueBlogSlug(payload.title);
    const shouldSubmit = String(req.body.action || '').trim() === 'submit_review';
    if (shouldSubmit) {
      const readyErrors = validateReadyForReview(payload);
      if (readyErrors.length) {
        if (uploadedKeys.length) {
          await uploadService.deleteObjects(uploadedKeys);
        }
        return res.status(400).json({
          success: false,
          message: 'Post is incomplete and cannot be submitted yet.',
          errors: readyErrors
        });
      }
    }
    const post = await Blog.create({
      authorId: user._id,
      title: payload.title,
      slug,
      excerpt: payload.excerpt,
      contentHtml: payload.contentHtml,
      contentText: payload.contentText,
      contentRaw: payload.contentRaw,
      coverImageUrl: payload.coverImageUrl,
      category: payload.category,
      customCategory: payload.customCategory,
      tags: payload.tags,
      status: shouldSubmit ? 'pending' : 'draft',
      submittedAt: shouldSubmit ? new Date() : null,
      readingTime: estimateReadingTime(payload.contentHtml)
    });

    return res.status(201).json({
      success: true,
      message: 'Draft created successfully.',
      post
    });
  } catch (error) {
    console.error('createDraft error:', error);
    if (uploadedKeys.length) {
      await uploadService.deleteObjects(uploadedKeys);
    }
    return res.status(500).json({ success: false, message: 'Failed to create draft.' });
  }
};

exports.updateDraft = async (req, res) => {
  const uploadedKeys = [];
  const keysToDelete = [];
  try {
    const user = await getAuthorFromSession(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (req.uploadError) {
      return res.status(400).json({ success: false, message: req.uploadError });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post id.' });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      authorId: user._id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    if (!EDITABLE_STATUSES.has(post.status)) {
      return res.status(409).json({
        success: false,
        message: `Post with status "${post.status}" is locked for editing.`
      });
    }

    const payload = normalizeBlogPayload(req.body);
    const removeCoverImage = String(req.body.removeCoverImage || '').trim() === '1';
    const coverImageFile = req.file || null;
    if (coverImageFile) {
      const uploadedCover = await uploadService.uploadBlogCoverToR2({
        userId: user._id,
        coverImageFile: coverImageFile
      });
      uploadedKeys.push(uploadedCover.key);
      payload.coverImageUrl = uploadedCover.url;
    } else if (removeCoverImage) {
      payload.coverImageUrl = '';
    } else if (!payload.coverImageUrl) {
      payload.coverImageUrl = String(post.coverImageUrl || '').trim();
    }

    const errors = validateBlogPayload(payload);
    if (errors.length) {
      if (uploadedKeys.length) {
        await uploadService.deleteObjects(uploadedKeys);
      }
      return res.status(400).json({ success: false, message: 'Validation failed.', errors });
    }

    if (post.status === 'rejected') {
      post.rejectionReason = '';
      post.rejectedAt = null;
      post.rejectedBy = null;
    }

    if (payload.title !== post.title) {
      post.title = payload.title;
      post.slug = await generateUniqueBlogSlug(payload.title, post._id);
    }

    post.excerpt = payload.excerpt;
    post.contentHtml = payload.contentHtml;
    post.contentText = payload.contentText;
    post.contentRaw = payload.contentRaw;
    const previousCoverUrl = String(post.coverImageUrl || '').trim();
    post.coverImageUrl = payload.coverImageUrl;
    post.category = payload.category;
    post.customCategory = payload.customCategory;
    post.tags = payload.tags;
    post.readingTime = estimateReadingTime(payload.contentHtml);

    const shouldSubmit = String(req.body.action || '').trim() === 'submit_review';
    if (shouldSubmit) {
      const readyErrors = validateReadyForReview({
        ...post.toObject(),
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        coverImageUrl: payload.coverImageUrl,
        contentHtml: payload.contentHtml,
        contentText: payload.contentText,
        tags: payload.tags
      });
      if (readyErrors.length) {
        if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
        return res.status(400).render('blog/author-form', {
          title: 'Edit Blog Draft - helloRun',
          user,
          mode: 'edit',
          formAction: `/blogs/me/${post._id}/edit`,
          submitLabel: 'Save Changes',
          categories: BLOG_CATEGORIES,
          formData: getBlogFormData(payload),
          errors: readyErrors,
          message: null,
          post
        });
      }
      post.status = 'pending';
      post.submittedAt = new Date();
      post.reviewedAt = null;
      post.rejectionReason = '';
      post.rejectedAt = null;
      post.rejectedBy = null;
    }

    await post.save();

    if (previousCoverUrl && previousCoverUrl !== payload.coverImageUrl) {
      const oldCoverKey = uploadService.extractObjectKeyFromPublicUrl(previousCoverUrl);
      if (oldCoverKey) {
        keysToDelete.push(oldCoverKey);
      }
    }
    if (keysToDelete.length) {
      await uploadService.deleteObjects(keysToDelete);
    }

    return res.json({
      success: true,
      message: 'Draft updated successfully.',
      post
    });
  } catch (error) {
    console.error('updateDraft error:', error);
    if (uploadedKeys.length) {
      await uploadService.deleteObjects(uploadedKeys);
    }
    return res.status(500).json({ success: false, message: 'Failed to update draft.' });
  }
};

exports.submitForReview = async (req, res) => {
  try {
    const user = await getAuthorFromSession(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post id.' });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      authorId: user._id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    if (!EDITABLE_STATUSES.has(post.status)) {
      return res.status(409).json({
        success: false,
        message: `Post with status "${post.status}" cannot be submitted.`
      });
    }

    const validationErrors = validateReadyForReview(post);
    if (validationErrors.length) {
      return res.status(400).json({
        success: false,
        message: 'Post is incomplete and cannot be submitted yet.',
        errors: validationErrors
      });
    }

    post.status = 'pending';
    post.submittedAt = new Date();
    post.reviewedAt = null;
    post.rejectionReason = '';
    post.rejectedAt = null;
    post.rejectedBy = null;
    await post.save();

    return res.json({
      success: true,
      message: 'Post submitted for review.',
      post
    });
  } catch (error) {
    console.error('submitForReview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit post for review.' });
  }
};

exports.deleteMyDraft = async (req, res) => {
  try {
    const user = await getAuthorFromSession(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post id.' });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      authorId: user._id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    if (!EDITABLE_STATUSES.has(post.status)) {
      return res.status(409).json({
        success: false,
        message: `Post with status "${post.status}" cannot be deleted by author.`
      });
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = user._id;
    await post.save();

    return res.json({ success: true, message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('deleteMyDraft error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete post.' });
  }
};

exports.renderAuthorDashboard = async (req, res) => {
  try {
    const user = await getAuthorFromSession(req);
    if (!user) {
      return res.redirect('/login');
    }

    const selectedStatus = normalizeStatusFilter(req.query.status);
    const query = {
      authorId: user._id,
      isDeleted: { $ne: true }
    };
    if (selectedStatus) query.status = selectedStatus;

    const posts = await Blog.find(query)
      .sort({ updatedAt: -1 })
      .select('title slug status category customCategory submittedAt approvedAt rejectedAt rejectionReason publishedAt updatedAt createdAt');

    return res.render('blog/author-dashboard', {
      title: 'My Blogs - helloRun',
      user,
      posts,
      selectedStatus,
      message: getBlogPageMessage(req.query)
    });
  } catch (error) {
    console.error('renderAuthorDashboard error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your blog dashboard.'
    });
  }
};

exports.renderCreatePage = async (req, res) => {
  try {
    const user = await getAuthorFromSession(req);
    if (!user) return res.redirect('/login');

    return res.render('blog/author-form', {
      title: 'Create Blog Draft - helloRun',
      user,
      mode: 'create',
      formAction: '/blogs/me/new',
      submitLabel: 'Create Draft',
      categories: BLOG_CATEGORIES,
      formData: getBlogFormData(),
      errors: [],
      message: getBlogPageMessage(req.query),
      post: null
    });
  } catch (error) {
    console.error('renderCreatePage error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the blog form.'
    });
  }
};

exports.createDraftPage = async (req, res) => {
  const uploadedKeys = [];
  try {
    const user = await getAuthorFromSession(req);
    if (!user) return res.redirect('/login');
    if (req.uploadError) {
      return res.status(400).render('blog/author-form', {
        title: 'Create Blog Draft - helloRun',
        user,
        mode: 'create',
        formAction: '/blogs/me/new',
        submitLabel: 'Create Draft',
        categories: BLOG_CATEGORIES,
        formData: getBlogFormData(req.body),
        errors: [req.uploadError],
        message: null,
        post: null
      });
    }

    const payload = normalizeBlogPayload(req.body);
    const coverImageFile = req.file || null;
    if (coverImageFile) {
      const uploadedCover = await uploadService.uploadBlogCoverToR2({
        userId: user._id,
        coverImageFile
      });
      uploadedKeys.push(uploadedCover.key);
      payload.coverImageUrl = uploadedCover.url;
    }

    const errors = validateBlogPayload(payload);
    if (errors.length) {
      if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
      return res.status(400).render('blog/author-form', {
        title: 'Create Blog Draft - helloRun',
        user,
        mode: 'create',
        formAction: '/blogs/me/new',
        submitLabel: 'Create Draft',
        categories: BLOG_CATEGORIES,
        formData: getBlogFormData(payload),
        errors,
        message: null,
        post: null
      });
    }

    const slug = await generateUniqueBlogSlug(payload.title);
    const shouldSubmit = String(req.body.action || '').trim() === 'submit_review';
    if (shouldSubmit) {
      const readyErrors = validateReadyForReview(payload);
      if (readyErrors.length) {
        if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
        return res.status(400).render('blog/author-form', {
          title: 'Create Blog Draft - helloRun',
          user,
          mode: 'create',
          formAction: '/blogs/me/new',
          submitLabel: 'Create Draft',
          categories: BLOG_CATEGORIES,
          formData: getBlogFormData(payload),
          errors: readyErrors,
          message: null,
          post: null
        });
      }
    }
    await Blog.create({
      authorId: user._id,
      title: payload.title,
      slug,
      excerpt: payload.excerpt,
      contentHtml: payload.contentHtml,
      contentText: payload.contentText,
      contentRaw: payload.contentRaw,
      coverImageUrl: payload.coverImageUrl,
      category: payload.category,
      customCategory: payload.customCategory,
      tags: payload.tags,
      status: shouldSubmit ? 'pending' : 'draft',
      submittedAt: shouldSubmit ? new Date() : null,
      readingTime: estimateReadingTime(payload.contentHtml)
    });

    if (shouldSubmit) {
      return res.redirect('/blogs/me/dashboard?type=success&msg=Post%20submitted%20for%20review.');
    }
    return res.redirect('/blogs/me/dashboard?type=success&msg=Draft%20created%20successfully.');
  } catch (error) {
    console.error('createDraftPage error:', error);
    if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while creating your draft.'
    });
  }
};

exports.renderEditPage = async (req, res) => {
  try {
    const user = await getAuthorFromSession(req);
    if (!user) return res.redirect('/login');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render('error', {
        title: '404 - Post Not Found',
        status: 404,
        message: 'Blog post not found.'
      });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      authorId: user._id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.status(404).render('error', {
        title: '404 - Post Not Found',
        status: 404,
        message: 'Blog post not found.'
      });
    }
    if (!EDITABLE_STATUSES.has(post.status)) {
      return res.redirect('/blogs/me/dashboard?type=error&msg=Only%20draft,%20pending,%20or%20rejected%20posts%20can%20be%20edited.');
    }

    return res.render('blog/author-form', {
      title: 'Edit Blog Draft - helloRun',
      user,
      mode: 'edit',
      formAction: `/blogs/me/${post._id}/edit`,
      submitLabel: 'Save Changes',
      categories: BLOG_CATEGORIES,
      formData: getBlogFormData(post),
      errors: [],
      message: getBlogPageMessage(req.query),
      post
    });
  } catch (error) {
    console.error('renderEditPage error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the edit form.'
    });
  }
};

exports.updateDraftPage = async (req, res) => {
  const uploadedKeys = [];
  const keysToDelete = [];
  try {
    const user = await getAuthorFromSession(req);
    if (!user) return res.redirect('/login');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render('error', {
        title: '404 - Post Not Found',
        status: 404,
        message: 'Blog post not found.'
      });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      authorId: user._id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.status(404).render('error', {
        title: '404 - Post Not Found',
        status: 404,
        message: 'Blog post not found.'
      });
    }
    if (!EDITABLE_STATUSES.has(post.status)) {
      return res.redirect('/blogs/me/dashboard?type=error&msg=Only%20draft,%20pending,%20or%20rejected%20posts%20can%20be%20edited.');
    }

    if (req.uploadError) {
      return res.status(400).render('blog/author-form', {
        title: 'Edit Blog Draft - helloRun',
        user,
        mode: 'edit',
        formAction: `/blogs/me/${post._id}/edit`,
        submitLabel: 'Save Changes',
        categories: BLOG_CATEGORIES,
        formData: getBlogFormData(req.body),
        errors: [req.uploadError],
        message: null,
        post
      });
    }

    const payload = normalizeBlogPayload(req.body);
    const removeCoverImage = String(req.body.removeCoverImage || '').trim() === '1';
    const coverImageFile = req.file || null;
    if (coverImageFile) {
      const uploadedCover = await uploadService.uploadBlogCoverToR2({
        userId: user._id,
        coverImageFile
      });
      uploadedKeys.push(uploadedCover.key);
      payload.coverImageUrl = uploadedCover.url;
    } else if (removeCoverImage) {
      payload.coverImageUrl = '';
    } else if (!payload.coverImageUrl) {
      payload.coverImageUrl = String(post.coverImageUrl || '').trim();
    }

    const errors = validateBlogPayload(payload);
    if (errors.length) {
      if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
      return res.status(400).render('blog/author-form', {
        title: 'Edit Blog Draft - helloRun',
        user,
        mode: 'edit',
        formAction: `/blogs/me/${post._id}/edit`,
        submitLabel: 'Save Changes',
        categories: BLOG_CATEGORIES,
        formData: getBlogFormData(payload),
        errors,
        message: null,
        post
      });
    }

    if (post.status === 'rejected') {
      post.rejectionReason = '';
      post.rejectedAt = null;
      post.rejectedBy = null;
    }
    if (payload.title !== post.title) {
      post.title = payload.title;
      post.slug = await generateUniqueBlogSlug(payload.title, post._id);
    }

    const previousCoverUrl = String(post.coverImageUrl || '').trim();
    post.excerpt = payload.excerpt;
    post.contentHtml = payload.contentHtml;
    post.contentText = payload.contentText;
    post.contentRaw = payload.contentRaw;
    post.coverImageUrl = payload.coverImageUrl;
    post.category = payload.category;
    post.customCategory = payload.customCategory;
    post.tags = payload.tags;
    post.readingTime = estimateReadingTime(payload.contentHtml);

    const shouldSubmit = String(req.body.action || '').trim() === 'submit_review';
    if (shouldSubmit) {
      const readyErrors = validateReadyForReview({
        ...post.toObject(),
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        coverImageUrl: payload.coverImageUrl,
        contentHtml: payload.contentHtml,
        contentText: payload.contentText,
        tags: payload.tags
      });
      if (readyErrors.length) {
        if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
        return res.status(400).render('blog/author-form', {
          title: 'Edit Blog Draft - helloRun',
          user,
          mode: 'edit',
          formAction: `/blogs/me/${post._id}/edit`,
          submitLabel: 'Save Changes',
          categories: BLOG_CATEGORIES,
          formData: getBlogFormData(payload),
          errors: readyErrors,
          message: null,
          post
        });
      }
      post.status = 'pending';
      post.submittedAt = new Date();
      post.reviewedAt = null;
      post.rejectionReason = '';
      post.rejectedAt = null;
      post.rejectedBy = null;
    }

    await post.save();

    if (previousCoverUrl && previousCoverUrl !== payload.coverImageUrl) {
      const oldCoverKey = uploadService.extractObjectKeyFromPublicUrl(previousCoverUrl);
      if (oldCoverKey) keysToDelete.push(oldCoverKey);
    }
    if (keysToDelete.length) await uploadService.deleteObjects(keysToDelete);

    if (shouldSubmit) {
      return res.redirect('/blogs/me/dashboard?type=success&msg=Post%20submitted%20for%20review.');
    }
    return res.redirect(`/blogs/me/${post._id}/edit?type=success&msg=Draft%20updated%20successfully.`);
  } catch (error) {
    console.error('updateDraftPage error:', error);
    if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while updating your draft.'
    });
  }
};

exports.submitForReviewPage = async (req, res) => {
  try {
    const user = await getAuthorFromSession(req);
    if (!user) return res.redirect('/login');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/blogs/me/dashboard?type=error&msg=Invalid%20post%20id.');
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      authorId: user._id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.redirect('/blogs/me/dashboard?type=error&msg=Post%20not%20found.');
    }
    if (!EDITABLE_STATUSES.has(post.status)) {
      return res.redirect('/blogs/me/dashboard?type=error&msg=Post%20cannot%20be%20submitted%20from%20current%20status.');
    }

    const errors = validateReadyForReview(post);
    if (errors.length) {
      const msg = encodeURIComponent(errors[0]);
      return res.redirect(`/blogs/me/${post._id}/edit?type=error&msg=${msg}`);
    }

    post.status = 'pending';
    post.submittedAt = new Date();
    post.reviewedAt = null;
    post.rejectionReason = '';
    post.rejectedAt = null;
    post.rejectedBy = null;
    await post.save();

    return res.redirect('/blogs/me/dashboard?type=success&msg=Post%20submitted%20for%20review.');
  } catch (error) {
    console.error('submitForReviewPage error:', error);
    return res.redirect('/blogs/me/dashboard?type=error&msg=Failed%20to%20submit%20post%20for%20review.');
  }
};

exports.deleteMyDraftPage = async (req, res) => {
  try {
    const user = await getAuthorFromSession(req);
    if (!user) return res.redirect('/login');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/blogs/me/dashboard?type=error&msg=Invalid%20post%20id.');
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      authorId: user._id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.redirect('/blogs/me/dashboard?type=error&msg=Post%20not%20found.');
    }
    if (!EDITABLE_STATUSES.has(post.status)) {
      return res.redirect('/blogs/me/dashboard?type=error&msg=Only%20draft%20or%20rejected%20posts%20can%20be%20deleted.');
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = user._id;
    await post.save();

    return res.redirect('/blogs/me/dashboard?type=success&msg=Post%20deleted%20successfully.');
  } catch (error) {
    console.error('deleteMyDraftPage error:', error);
    return res.redirect('/blogs/me/dashboard?type=error&msg=Failed%20to%20delete%20post.');
  }
};

exports.listPendingBlogs = async (req, res) => {
  try {
    const status = normalizeAdminStatusFilter(req.query.status) || 'pending';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const query = { isDeleted: { $ne: true }, status };
    if (q) {
      const safePattern = new RegExp(escapeRegex(q), 'i');
      query.$or = [{ title: safePattern }, { slug: safePattern }, { category: safePattern }, { customCategory: safePattern }];
    }

    const posts = await Blog.find(query)
      .populate('authorId', 'firstName lastName email')
      .sort({ submittedAt: -1, updatedAt: -1 })
      .select('title slug status category customCategory submittedAt updatedAt publishedAt rejectionReason readingTime createdAt');

    return res.json({
      success: true,
      status,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('listPendingBlogs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load admin blog queue.' });
  }
};

exports.previewBlogPost = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post id.' });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    })
      .populate('authorId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    return res.json({ success: true, post });
  } catch (error) {
    console.error('previewBlogPost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load blog post preview.' });
  }
};

exports.approveBlogPost = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post id.' });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    if (post.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Cannot approve a post from "${post.status}" status.`
      });
    }

    const now = new Date();
    post.status = 'published';
    post.publishedAt = now;
    post.reviewedAt = now;
    post.approvedAt = now;
    post.approvedBy = req.session.userId || null;
    post.rejectedAt = null;
    post.rejectedBy = null;
    post.rejectionReason = '';
    await post.save();

    return res.json({
      success: true,
      message: 'Post approved and published successfully.',
      post
    });
  } catch (error) {
    console.error('approveBlogPost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve post.' });
  }
};

exports.rejectBlogPost = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post id.' });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    if (post.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Cannot reject a post from "${post.status}" status.`
      });
    }

    const rejectionReason = typeof req.body.rejectionReason === 'string'
      ? req.body.rejectionReason.trim()
      : '';
    if (
      rejectionReason.length < MIN_REJECTION_REASON_LENGTH ||
      rejectionReason.length > MAX_REJECTION_REASON_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message: `Rejection reason must be ${MIN_REJECTION_REASON_LENGTH}-${MAX_REJECTION_REASON_LENGTH} characters.`
      });
    }

    const now = new Date();
    post.status = 'rejected';
    post.reviewedAt = now;
    post.rejectedAt = now;
    post.rejectedBy = req.session.userId || null;
    post.rejectionReason = rejectionReason;
    post.approvedAt = null;
    post.approvedBy = null;
    await post.save();

    return res.json({
      success: true,
      message: 'Post rejected successfully.',
      post
    });
  } catch (error) {
    console.error('rejectBlogPost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject post.' });
  }
};

exports.archiveBlogPost = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post id.' });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    if (post.status !== 'published') {
      return res.status(409).json({
        success: false,
        message: `Only published posts can be archived. Current status: "${post.status}".`
      });
    }

    post.status = 'archived';
    post.reviewedAt = new Date();
    await post.save();

    return res.json({
      success: true,
      message: 'Post archived successfully.',
      post
    });
  } catch (error) {
    console.error('archiveBlogPost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive post.' });
  }
};

exports.autosaveBlogPostAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post id.' });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const beforeSnapshot = getAdminAutosaveSnapshot(post);
    const nextPayload = normalizeAdminAutosavePayload(req.body, post);
    const validationErrors = validateBlogPayload(nextPayload);
    if (validationErrors.length) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validationErrors
      });
    }

    if (nextPayload.title !== post.title) {
      post.title = nextPayload.title;
      post.slug = await generateUniqueBlogSlug(nextPayload.title, post._id);
    }

    post.excerpt = nextPayload.excerpt;
    post.contentHtml = nextPayload.contentHtml;
    post.contentText = nextPayload.contentText;
    post.contentRaw = nextPayload.contentRaw;
    post.coverImageUrl = nextPayload.coverImageUrl;
    post.category = nextPayload.category;
    post.customCategory = nextPayload.customCategory;
    post.tags = nextPayload.tags;
    post.readingTime = estimateReadingTime(nextPayload.contentHtml);
    post.featured = nextPayload.featured;
    post.seoTitle = nextPayload.seoTitle;
    post.seoDescription = nextPayload.seoDescription;
    post.ogImageUrl = nextPayload.ogImageUrl;
    post.moderationNotes = nextPayload.moderationNotes;

    if (nextPayload.status !== post.status) {
      applyAdminAutosaveStatusTransition(post, nextPayload.status, req.session?.userId || null);
    }

    await post.save();
    const afterSnapshot = getAdminAutosaveSnapshot(post);
    const changedFields = getChangedFields(beforeSnapshot, afterSnapshot);

    if (changedFields.length) {
      const actorId = mongoose.Types.ObjectId.isValid(req.session?.userId)
        ? req.session.userId
        : null;
      await BlogRevision.create({
        postId: post._id,
        editedBy: actorId,
        source: 'admin_autosave',
        changedFields,
        before: pickFields(beforeSnapshot, changedFields),
        after: pickFields(afterSnapshot, changedFields),
        editedAt: new Date()
      });
    }

    return res.json({
      success: true,
      message: 'Post auto-saved.',
      post: {
        _id: post._id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        contentHtml: post.contentHtml,
        contentRaw: post.contentRaw,
        coverImageUrl: post.coverImageUrl,
        category: post.category,
        customCategory: post.customCategory,
        tags: post.tags,
        featured: post.featured,
        status: post.status,
        readingTime: post.readingTime,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        ogImageUrl: post.ogImageUrl,
        moderationNotes: post.moderationNotes,
        updatedAt: post.updatedAt,
        changedFields
      }
    });
  } catch (error) {
    console.error('autosaveBlogPostAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to auto-save blog post.' });
  }
};

exports.renderAdminQueuePage = async (req, res) => {
  try {
    const status = normalizeAdminStatusFilter(req.query.status) || 'pending';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const query = { isDeleted: { $ne: true }, status };
    if (q) {
      const safePattern = new RegExp(escapeRegex(q), 'i');
      query.$or = [{ title: safePattern }, { slug: safePattern }, { category: safePattern }, { customCategory: safePattern }];
    }

    const posts = await Blog.find(query)
      .populate('authorId', 'firstName lastName email')
      .sort({ submittedAt: -1, updatedAt: -1 })
      .select('title slug status category customCategory submittedAt publishedAt rejectedAt rejectionReason readingTime createdAt updatedAt');

    return res.render('admin/blog-queue', {
      title: 'Blog Moderation - helloRun Admin',
      posts,
      selectedStatus: status,
      searchQuery: q,
      message: getBlogPageMessage(req.query)
    });
  } catch (error) {
    console.error('renderAdminQueuePage error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the blog moderation queue.'
    });
  }
};

exports.renderAdminReviewPage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render('error', {
        title: '404 - Post Not Found',
        status: 404,
        message: 'The requested blog post does not exist.'
      });
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    })
      .populate('authorId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email');

    if (!post) {
      return res.status(404).render('error', {
        title: '404 - Post Not Found',
        status: 404,
        message: 'The requested blog post does not exist.'
      });
    }

    const revisions = await BlogRevision.find({ postId: post._id })
      .populate('editedBy', 'firstName lastName email')
      .sort({ editedAt: -1 })
      .limit(25)
      .lean();

    return res.render('admin/blog-review', {
      title: `Review Blog - ${post.title}`,
      post,
      message: getBlogPageMessage(req.query),
      categories: BLOG_CATEGORIES,
      statuses: BLOG_STATUSES,
      revisions
    });
  } catch (error) {
    console.error('renderAdminReviewPage error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the review page.'
    });
  }
};

exports.approveBlogPostPage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/admin/blog/review?type=error&msg=Invalid%20post%20id.');
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.redirect('/admin/blog/review?type=error&msg=Post%20not%20found.');
    }
    if (post.status !== 'pending') {
      return res.redirect(`/admin/blog/posts/${post._id}/review?type=error&msg=Only%20pending%20posts%20can%20be%20approved.`);
    }

    const now = new Date();
    post.status = 'published';
    post.publishedAt = now;
    post.reviewedAt = now;
    post.approvedAt = now;
    post.approvedBy = req.session.userId || null;
    post.rejectedAt = null;
    post.rejectedBy = null;
    post.rejectionReason = '';
    await post.save();

    return res.redirect(`/admin/blog/posts/${post._id}/review?type=success&msg=Post%20approved%20and%20published.`);
  } catch (error) {
    console.error('approveBlogPostPage error:', error);
    return res.redirect(`/admin/blog/posts/${req.params.id}/review?type=error&msg=Failed%20to%20approve%20post.`);
  }
};

exports.rejectBlogPostPage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/admin/blog/review?type=error&msg=Invalid%20post%20id.');
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.redirect('/admin/blog/review?type=error&msg=Post%20not%20found.');
    }
    if (post.status !== 'pending') {
      return res.redirect(`/admin/blog/posts/${post._id}/review?type=error&msg=Only%20pending%20posts%20can%20be%20rejected.`);
    }

    const rejectionReason = typeof req.body.rejectionReason === 'string'
      ? req.body.rejectionReason.trim()
      : '';
    if (
      rejectionReason.length < MIN_REJECTION_REASON_LENGTH ||
      rejectionReason.length > MAX_REJECTION_REASON_LENGTH
    ) {
      return res.redirect(
        `/admin/blog/posts/${post._id}/review?type=error&msg=${encodeURIComponent(`Rejection reason must be ${MIN_REJECTION_REASON_LENGTH}-${MAX_REJECTION_REASON_LENGTH} characters.`)}`
      );
    }

    const now = new Date();
    post.status = 'rejected';
    post.reviewedAt = now;
    post.rejectedAt = now;
    post.rejectedBy = req.session.userId || null;
    post.rejectionReason = rejectionReason;
    post.approvedAt = null;
    post.approvedBy = null;
    await post.save();

    return res.redirect(`/admin/blog/posts/${post._id}/review?type=success&msg=Post%20rejected.`);
  } catch (error) {
    console.error('rejectBlogPostPage error:', error);
    return res.redirect(`/admin/blog/posts/${req.params.id}/review?type=error&msg=Failed%20to%20reject%20post.`);
  }
};

exports.archiveBlogPostPage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect('/admin/blog/review?type=error&msg=Invalid%20post%20id.');
    }

    const post = await Blog.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });
    if (!post) {
      return res.redirect('/admin/blog/review?type=error&msg=Post%20not%20found.');
    }
    if (post.status !== 'published') {
      return res.redirect(`/admin/blog/posts/${post._id}/review?type=error&msg=Only%20published%20posts%20can%20be%20archived.`);
    }

    post.status = 'archived';
    post.reviewedAt = new Date();
    await post.save();

    return res.redirect(`/admin/blog/posts/${post._id}/review?type=success&msg=Post%20archived.`);
  } catch (error) {
    console.error('archiveBlogPostPage error:', error);
    return res.redirect(`/admin/blog/posts/${req.params.id}/review?type=error&msg=Failed%20to%20archive%20post.`);
  }
};

function normalizeStatusFilter(input) {
  const value = String(input || '').trim().toLowerCase();
  const allowed = new Set(['draft', 'pending', 'published', 'rejected', 'archived']);
  return allowed.has(value) ? value : '';
}

function normalizeAdminStatusFilter(input) {
  const value = String(input || '').trim().toLowerCase();
  return ADMIN_REVIEW_STATUSES.has(value) ? value : '';
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeBlogPayload(body = {}) {
  const sanitizedContentHtml = sanitizeHtml(String(body.contentHtml || ''));
  const contentText = htmlToPlainText(sanitizedContentHtml);
  const category = String(body.category || '').trim();
  const customCategoryInput = String(body.customCategory || '').trim();
  const customCategory = category === 'Other' ? customCategoryInput : '';

  return {
    title: String(body.title || '').trim(),
    excerpt: String(body.excerpt || '').trim(),
    category,
    customCategory,
    coverImageUrl: String(body.coverImageUrl || '').trim(),
    contentHtml: sanitizedContentHtml,
    contentText,
    contentRaw: String(body.contentRaw || '').trim(),
    tags: normalizeTags(Array.isArray(body.tags) ? body.tags : splitTags(body.tags))
  };
}

function normalizeAdminAutosavePayload(body = {}, post) {
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(body, key);
  const category = hasOwn('category') ? String(body.category || '').trim() : String(post.category || '').trim();
  const rawContentHtml = hasOwn('contentHtml') ? String(body.contentHtml || '') : String(post.contentHtml || '');
  const contentHtml = sanitizeHtml(rawContentHtml);
  const contentRaw = hasOwn('contentRaw') ? String(body.contentRaw || '').trim() : String(post.contentRaw || '');
  const contentText = htmlToPlainText(contentHtml);
  const customCategoryInput = hasOwn('customCategory')
    ? String(body.customCategory || '').trim()
    : String(post.customCategory || '').trim();
  const customCategory = category === 'Other' ? customCategoryInput : '';

  const tags = hasOwn('tags')
    ? normalizeTags(Array.isArray(body.tags) ? body.tags : splitTags(body.tags))
    : normalizeTags(Array.isArray(post.tags) ? post.tags : []);

  const statusInput = hasOwn('status') ? String(body.status || '').trim().toLowerCase() : String(post.status || '').trim().toLowerCase();
  const status = BLOG_STATUSES.includes(statusInput) ? statusInput : String(post.status || 'draft');

  return {
    title: hasOwn('title') ? String(body.title || '').trim() : String(post.title || '').trim(),
    excerpt: hasOwn('excerpt') ? String(body.excerpt || '').trim() : String(post.excerpt || '').trim(),
    category,
    customCategory,
    coverImageUrl: hasOwn('coverImageUrl') ? String(body.coverImageUrl || '').trim() : String(post.coverImageUrl || '').trim(),
    contentHtml,
    contentText,
    contentRaw,
    tags,
    status,
    featured: hasOwn('featured') ? normalizeBoolean(body.featured, post.featured) : Boolean(post.featured),
    seoTitle: hasOwn('seoTitle') ? String(body.seoTitle || '').trim().slice(0, 160) : String(post.seoTitle || '').trim(),
    seoDescription: hasOwn('seoDescription') ? String(body.seoDescription || '').trim().slice(0, 320) : String(post.seoDescription || '').trim(),
    ogImageUrl: hasOwn('ogImageUrl') ? String(body.ogImageUrl || '').trim().slice(0, 2000) : String(post.ogImageUrl || '').trim(),
    moderationNotes: hasOwn('moderationNotes') ? String(body.moderationNotes || '').trim().slice(0, 1000) : String(post.moderationNotes || '').trim()
  };
}

function getBlogFormData(body = {}) {
  return {
    title: String(body.title || '').trim(),
    excerpt: String(body.excerpt || '').trim(),
    category: String(body.category || '').trim(),
    customCategory: String(body.customCategory || '').trim(),
    coverImageUrl: String(body.coverImageUrl || '').trim(),
    removeCoverImage: String(body.removeCoverImage || '').trim() === '1',
    contentHtml: String(body.contentHtml || '').trim(),
    contentText: String(body.contentText || '').trim(),
    contentRaw: String(body.contentRaw || '').trim(),
    tags: Array.isArray(body.tags)
      ? body.tags.join(', ')
      : String(body.tags || '').trim()
  };
}

function splitTags(value) {
  if (typeof value !== 'string') return [];
  return value.split(',').map((item) => item.trim());
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return Boolean(fallback);
}

function getAdminAutosaveSnapshot(post) {
  const snapshot = {
    title: String(post.title || ''),
    slug: String(post.slug || ''),
    excerpt: String(post.excerpt || ''),
    contentHtml: String(post.contentHtml || ''),
    contentRaw: String(post.contentRaw || ''),
    coverImageUrl: String(post.coverImageUrl || ''),
    category: String(post.category || ''),
    customCategory: String(post.customCategory || ''),
    tags: Array.isArray(post.tags) ? [...post.tags] : [],
    status: String(post.status || ''),
    featured: Boolean(post.featured),
    seoTitle: String(post.seoTitle || ''),
    seoDescription: String(post.seoDescription || ''),
    ogImageUrl: String(post.ogImageUrl || ''),
    moderationNotes: String(post.moderationNotes || ''),
    readingTime: Number(post.readingTime || 1)
  };

  return snapshot;
}

function getChangedFields(beforeSnapshot, afterSnapshot) {
  return ADMIN_AUTOSAVE_TRACKED_FIELDS.filter((field) => {
    return JSON.stringify(beforeSnapshot[field]) !== JSON.stringify(afterSnapshot[field]);
  });
}

function pickFields(snapshot, fields) {
  return fields.reduce((acc, field) => {
    acc[field] = compactRevisionValue(snapshot[field]);
    return acc;
  }, {});
}

function compactRevisionValue(value) {
  if (typeof value === 'string') {
    return value.length > REVISION_MAX_FIELD_LENGTH
      ? `${value.slice(0, REVISION_MAX_FIELD_LENGTH)}\n...[truncated]`
      : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => compactRevisionValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = compactRevisionValue(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function applyAdminAutosaveStatusTransition(post, nextStatus, actorId = null) {
  const now = new Date();
  post.status = nextStatus;
  post.reviewedAt = now;

  if (nextStatus === 'published') {
    post.publishedAt = post.publishedAt || now;
    post.approvedAt = post.approvedAt || now;
    post.approvedBy = post.approvedBy || actorId;
    post.rejectedAt = null;
    post.rejectedBy = null;
    post.rejectionReason = '';
    return;
  }

  if (nextStatus === 'rejected') {
    post.rejectedAt = post.rejectedAt || now;
    post.rejectedBy = post.rejectedBy || actorId;
    post.approvedAt = null;
    post.approvedBy = null;
    return;
  }

  if (nextStatus === 'pending') {
    post.submittedAt = post.submittedAt || now;
    post.approvedAt = null;
    post.approvedBy = null;
    post.rejectedAt = null;
    post.rejectedBy = null;
    post.rejectionReason = '';
    return;
  }

  if (nextStatus === 'archived') {
    post.approvedAt = post.approvedAt || now;
    post.approvedBy = post.approvedBy || actorId;
    post.rejectedAt = null;
    post.rejectedBy = null;
    post.rejectionReason = '';
    return;
  }

  // Draft reset
  post.approvedAt = null;
  post.approvedBy = null;
  post.rejectedAt = null;
  post.rejectedBy = null;
  post.rejectionReason = '';
}

function validateBlogPayload(payload, options = {}) {
  const errors = [];
  const allowedCategories = new Set(BLOG_CATEGORIES);
  const requireCover = options.requireCover === true;

  if (!payload.title || payload.title.length < 5 || payload.title.length > 150) {
    errors.push('Title must be between 5 and 150 characters.');
  }
  if (payload.excerpt.length > 320) {
    errors.push('Excerpt must be 320 characters or less.');
  }
  if (!allowedCategories.has(payload.category)) {
    errors.push('Category is invalid.');
  }
  if (payload.category === 'Other') {
    if (!payload.customCategory || payload.customCategory.length < 2 || payload.customCategory.length > 80) {
      errors.push('Please provide a custom category (2-80 characters) when selecting Other.');
    }
  }
  if (payload.coverImageUrl && payload.coverImageUrl.length > 2000) {
    errors.push('Cover image URL is too long.');
  } else if (payload.coverImageUrl && !isValidHttpUrl(payload.coverImageUrl)) {
    errors.push('Cover image URL must be a valid http/https URL.');
  }
  if (requireCover && !payload.coverImageUrl) {
    errors.push('Cover image is required before submitting for review.');
  }
  if (payload.contentHtml.length > 120000) {
    errors.push('Content exceeds maximum allowed length.');
  }
  if (!payload.contentText || payload.contentText.length < 50) {
    errors.push('Content body is too short. Add more details before saving.');
  }
  if (payload.tags.length > 12) {
    errors.push('Maximum 12 tags are allowed.');
  }

  return errors;
}

function validateReadyForReview(post) {
  const payload = {
    title: post.title,
    excerpt: post.excerpt || '',
    category: post.category,
    customCategory: post.customCategory || '',
    coverImageUrl: post.coverImageUrl || '',
    contentHtml: post.contentHtml || '',
    contentText: post.contentText || '',
    contentRaw: post.contentRaw || '',
    tags: Array.isArray(post.tags) ? post.tags : []
  };
  return validateBlogPayload(payload, { requireCover: true });
}

function estimateReadingTime(contentHtml) {
  const plainText = String(contentHtml || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = plainText ? plainText.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

async function generateUniqueBlogSlug(title, excludeId = null) {
  const base = slugifyBlogTitle(title) || 'post';
  let candidate = base;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug: candidate };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    // eslint-disable-next-line no-await-in-loop
    const exists = await Blog.exists(query);
    if (!exists) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

async function getAuthorFromSession(req) {
  if (!req.session?.userId) return null;
  const user = await User.findById(req.session.userId).select('_id role emailVerified');
  if (!user) return null;
  if (!user.emailVerified) return null;
  return user;
}

function getBlogPageMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  const type = query.type === 'error' ? 'error' : 'success';
  return {
    type,
    text: msg.slice(0, 220)
  };
}
