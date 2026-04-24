const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const BlogRevision = require('../models/BlogRevision');
const User = require('../models/User');
const uploadService = require('../services/upload.service');
const { BLOG_CATEGORIES, BLOG_STATUSES, slugifyBlogTitle, normalizeTags } = require('../utils/blog');
const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');
const BlogReport = require('../models/BlogReport');
const { analyzePostSpamSignals, detectSimilarityFlags } = require('../utils/blog-safety');
const {
  BLOG_BLOCK_TYPES,
  BLOG_TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  TEMPLATE_DESCRIPTIONS,
  BLOCK_LABELS,
  BLOCK_DESCRIPTIONS,
  getTemplateBlocks,
  normalizeTemplateKey,
  normalizeContentBlocks,
  validateContentBlocks,
  renderContentBlocksToHtml,
  getStructuredContentText,
  isStructuredPost
} = require('../utils/blog-composer');

const EDITABLE_STATUSES = new Set(['draft', 'pending', 'rejected']);
const ADMIN_REVIEW_STATUSES = new Set(['pending', 'published', 'rejected', 'archived', 'draft']);
const MIN_REJECTION_REASON_LENGTH = 15;
const MAX_REJECTION_REASON_LENGTH = 500;
const REVISION_MAX_FIELD_LENGTH = 12000;
const MAX_BLOG_GALLERY_IMAGES = 3;
const ADMIN_AUTOSAVE_TRACKED_FIELDS = Object.freeze([
  'title',
  'slug',
  'excerpt',
  'contentHtml',
  'contentRaw',
  'templateKey',
  'contentBlocks',
  'coverImageUrl',
  'coverImageAlt',
  'galleryImageUrls',
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
      .select('title slug status category customCategory submittedAt approvedAt rejectedAt rejectionReason publishedAt updatedAt createdAt views likesCount commentsCount activeRevisionId activeRevisionStatus activeRevisionSubmittedAt activeRevisionUpdatedAt activeRevisionRejectionReason');

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
    const shouldSubmit = String(req.body.action || '').trim() === 'submit_review';
    await uploadBlogAssetsForPayload({
      req,
      userId: user._id,
      payload,
      existingGallery: [],
      uploadedKeys
    });

    const errors = validateBlogPayload(payload);
    if (errors.length) {
      if (uploadedKeys.length) {
        await uploadService.deleteObjects(uploadedKeys);
      }
      return res.status(400).json({ success: false, message: 'Validation failed.', errors });
    }

    const slug = await generateUniqueBlogSlug(payload.title);
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
    const moderation = await buildPostModerationSignals({ payload });
    const post = await Blog.create({
      authorId: user._id,
      title: payload.title,
      slug,
      excerpt: payload.excerpt,
      contentHtml: payload.contentHtml,
      contentText: payload.contentText,
      contentRaw: payload.contentRaw,
      templateKey: payload.templateKey,
      contentBlocks: payload.contentBlocks,
      coverImageUrl: payload.coverImageUrl,
      coverImageAlt: payload.coverImageAlt,
      galleryImageUrls: payload.galleryImageUrls,
      category: payload.category,
      customCategory: payload.customCategory,
      tags: payload.tags,
      status: shouldSubmit ? 'pending' : 'draft',
      submittedAt: shouldSubmit ? new Date() : null,
      readingTime: estimateReadingTime(payload.contentHtml),
      seoTitle: payload.seoTitle,
      seoDescription: payload.seoDescription,
      ogImageUrl: payload.ogImageUrl,
      moderationFlags: moderation.flags,
      moderationFlagSummary: moderation.summary
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
    if (!EDITABLE_STATUSES.has(post.status) && post.status !== 'published') {
      return res.status(409).json({
        success: false,
        message: `Post with status "${post.status}" is locked for editing.`
      });
    }

    const payload = normalizeBlogPayload(req.body);
    const shouldSubmit = String(req.body.action || '').trim() === 'submit_review';
    const removeCoverImage = String(req.body.removeCoverImage || '').trim() === '1';
    const existingGallery = post.status === 'published' && post.activeRevisionId
      ? ((await getOrCreateAuthorRevision(post, user._id)).after?.galleryImageUrls || post.galleryImageUrls || [])
      : (post.galleryImageUrls || []);
    await uploadBlogAssetsForPayload({
      req,
      userId: user._id,
      payload,
      existingGallery,
      uploadedKeys
    });
    if (removeCoverImage) {
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

    if (post.status === 'published') {
      const readyErrors = shouldSubmit ? validateReadyForReview(payload) : [];
      if (readyErrors.length) {
        if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
        return res.status(400).json({
          success: false,
          message: 'Post is incomplete and cannot be submitted yet.',
          errors: readyErrors
        });
      }

      const revision = await saveAuthorRevision({
        post,
        payload,
        actorId: user._id,
        shouldSubmit
      });
      return res.json({
        success: true,
        message: shouldSubmit ? 'Revision submitted for review.' : 'Published-post revision saved.',
        revision
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
    const previousGalleryUrls = normalizeGalleryImageUrls(post.galleryImageUrls || []);
    applyPayloadToPost(post, payload);
    const moderation = await buildPostModerationSignals({ payload, excludePostId: post._id });
    post.moderationFlags = moderation.flags;
    post.moderationFlagSummary = moderation.summary;

    if (shouldSubmit) {
      const readyErrors = validateReadyForReview({
        ...post.toObject(),
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        coverImageUrl: payload.coverImageUrl,
        coverImageAlt: payload.coverImageAlt,
        templateKey: payload.templateKey,
        contentBlocks: payload.contentBlocks,
        contentHtml: payload.contentHtml,
        contentText: payload.contentText,
        tags: payload.tags,
        galleryImageUrls: payload.galleryImageUrls,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
        ogImageUrl: payload.ogImageUrl
      });
      if (readyErrors.length) {
        if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
        return res.status(400).json({
          success: false,
          message: 'Post is incomplete and cannot be submitted yet.',
          errors: readyErrors
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
    keysToDelete.push(...collectRemovedGalleryKeys(previousGalleryUrls, payload.galleryImageUrls));
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

exports.discardRevision = async (req, res) => {
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
      status: 'published',
      isDeleted: { $ne: true }
    });
    if (!post || !post.activeRevisionId) {
      return res.status(404).json({ success: false, message: 'No active revision found.' });
    }
    const revision = await BlogRevision.findOne({
      _id: post.activeRevisionId,
      postId: post._id,
      source: 'author_revision'
    });
    if (!revision) {
      syncBlogRevisionState(post, null);
      await post.save();
      return res.status(404).json({ success: false, message: 'No active revision found.' });
    }
    revision.status = 'discarded';
    revision.reviewedAt = new Date();
    await revision.save();
    syncBlogRevisionState(post, null);
    await post.save();
    return res.json({ success: true, message: 'Revision discarded.' });
  } catch (error) {
    console.error('discardRevision error:', error);
    return res.status(500).json({ success: false, message: 'Failed to discard revision.' });
  }
};

exports.discardRevisionPage = async (req, res) => {
  try {
    const response = await exports.discardRevision(req, {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return payload;
      }
    });
    if (response && response.success === true) {
      return res.redirect('/blogs/me/dashboard?type=success&msg=Revision%20discarded.');
    }
    return res.redirect('/blogs/me/dashboard?type=error&msg=Failed%20to%20discard%20revision.');
  } catch (_) {
    return res.redirect('/blogs/me/dashboard?type=error&msg=Failed%20to%20discard%20revision.');
  }
};

exports.uploadBlogImagesForEditor = async (req, res) => {
  const uploadedKeys = [];
  try {
    const user = await getAuthorFromSession(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (req.uploadError) {
      return res.status(400).json({ success: false, message: req.uploadError });
    }
    const galleryImageFiles = getUploadedFiles(req, 'galleryImageFiles');
    if (!galleryImageFiles.length) {
      return res.status(400).json({ success: false, message: 'No gallery images uploaded.' });
    }
    const uploadedGallery = await uploadService.uploadBlogGalleryToR2({ userId: user._id, galleryImageFiles });
    uploadedGallery.forEach((item) => uploadedKeys.push(item.key));
    return res.json({
      success: true,
      galleryImageUrls: uploadedGallery.map((item) => item.url)
    });
  } catch (error) {
    console.error('uploadBlogImagesForEditor error:', error);
    if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
    return res.status(500).json({ success: false, message: 'Failed to upload gallery images.' });
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
      .select('title slug status category customCategory submittedAt approvedAt rejectedAt rejectionReason publishedAt updatedAt createdAt views likesCount commentsCount activeRevisionId activeRevisionStatus activeRevisionSubmittedAt activeRevisionUpdatedAt activeRevisionRejectionReason');

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
      templates: getComposerTemplateOptions(),
      blockTypes: getComposerBlockTypeOptions(),
      templateBlocksByKey: getComposerTemplateBlocksByKey(),
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
        templates: getComposerTemplateOptions(),
        blockTypes: getComposerBlockTypeOptions(),
        templateBlocksByKey: getComposerTemplateBlocksByKey(),
        formData: getBlogFormData(req.body),
        errors: [req.uploadError],
        message: null,
        post: null
      });
    }

    const payload = normalizeBlogPayload(req.body);
    await uploadBlogAssetsForPayload({
      req,
      userId: user._id,
      payload,
      existingGallery: [],
      uploadedKeys
    });

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
        templates: getComposerTemplateOptions(),
        blockTypes: getComposerBlockTypeOptions(),
        templateBlocksByKey: getComposerTemplateBlocksByKey(),
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
          templates: getComposerTemplateOptions(),
          blockTypes: getComposerBlockTypeOptions(),
          templateBlocksByKey: getComposerTemplateBlocksByKey(),
          formData: getBlogFormData(payload),
          errors: readyErrors,
          message: null,
          post: null
        });
      }
    }
    const moderation = await buildPostModerationSignals({ payload });
    await Blog.create({
      authorId: user._id,
      title: payload.title,
      slug,
      excerpt: payload.excerpt,
      contentHtml: payload.contentHtml,
      contentText: payload.contentText,
      contentRaw: payload.contentRaw,
      templateKey: payload.templateKey,
      contentBlocks: payload.contentBlocks,
      coverImageUrl: payload.coverImageUrl,
      coverImageAlt: payload.coverImageAlt,
      galleryImageUrls: payload.galleryImageUrls,
      category: payload.category,
      customCategory: payload.customCategory,
      tags: payload.tags,
      status: shouldSubmit ? 'pending' : 'draft',
      submittedAt: shouldSubmit ? new Date() : null,
      readingTime: estimateReadingTime(payload.contentHtml),
      seoTitle: payload.seoTitle,
      seoDescription: payload.seoDescription,
      ogImageUrl: payload.ogImageUrl,
      moderationFlags: moderation.flags,
      moderationFlagSummary: moderation.summary
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
    let formPost = post;
    let mode = 'edit';
    let submitLabel = 'Save Changes';
    let revision = null;
    if (post.status === 'published') {
      revision = await getOrCreateAuthorRevision(post, user._id);
      formPost = {
        ...post.toObject(),
        ...revision.after,
        status: revision.status || 'draft',
        revisionStatus: revision.status || 'draft',
        revisionRejectionReason: revision.rejectionReason || '',
        sourcePostStatus: post.status
      };
      mode = 'edit-published';
      submitLabel = 'Save Revision Draft';
    } else if (!EDITABLE_STATUSES.has(post.status)) {
      return res.redirect('/blogs/me/dashboard?type=error&msg=This%20post%20cannot%20be%20edited.');
    }

    return res.render('blog/author-form', {
      title: 'Edit Blog Draft - helloRun',
      user,
      mode,
      formAction: `/blogs/me/${post._id}/edit`,
      submitLabel,
      categories: BLOG_CATEGORIES,
      templates: getComposerTemplateOptions(),
      blockTypes: getComposerBlockTypeOptions(),
      templateBlocksByKey: getComposerTemplateBlocksByKey(),
      formData: getBlogFormData(formPost),
      errors: [],
      message: getBlogPageMessage(req.query),
      post: formPost,
      livePost: post,
      revision
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
    if (!EDITABLE_STATUSES.has(post.status) && post.status !== 'published') {
      return res.redirect('/blogs/me/dashboard?type=error&msg=This%20post%20cannot%20be%20edited.');
    }

    if (req.uploadError) {
      return res.status(400).render('blog/author-form', {
        title: 'Edit Blog Draft - helloRun',
        user,
        mode: 'edit',
        formAction: `/blogs/me/${post._id}/edit`,
        submitLabel: 'Save Changes',
        categories: BLOG_CATEGORIES,
        templates: getComposerTemplateOptions(),
        blockTypes: getComposerBlockTypeOptions(),
        templateBlocksByKey: getComposerTemplateBlocksByKey(),
        formData: getBlogFormData(req.body),
        errors: [req.uploadError],
        message: null,
        post
      });
    }

    const payload = normalizeBlogPayload(req.body);
    const shouldSubmit = String(req.body.action || '').trim() === 'submit_review';
    const removeCoverImage = String(req.body.removeCoverImage || '').trim() === '1';
    const revisionForGallery = post.status === 'published' ? await getOrCreateAuthorRevision(post, user._id) : null;
    const existingGallery = revisionForGallery?.after?.galleryImageUrls || post.galleryImageUrls || [];
    await uploadBlogAssetsForPayload({
      req,
      userId: user._id,
      payload,
      existingGallery,
      uploadedKeys
    });
    if (removeCoverImage) {
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
        mode: post.status === 'published' ? 'edit-published' : 'edit',
        formAction: `/blogs/me/${post._id}/edit`,
        submitLabel: post.status === 'published' ? 'Save Revision Draft' : 'Save Changes',
        categories: BLOG_CATEGORIES,
        templates: getComposerTemplateOptions(),
        blockTypes: getComposerBlockTypeOptions(),
        templateBlocksByKey: getComposerTemplateBlocksByKey(),
        formData: getBlogFormData(payload),
        errors,
        message: null,
        post,
        livePost: post,
        revision: revisionForGallery
      });
    }

    if (post.status === 'published') {
      const readyErrors = shouldSubmit ? validateReadyForReview(payload) : [];
      if (readyErrors.length) {
        if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
        return res.status(400).render('blog/author-form', {
          title: 'Edit Published Blog - helloRun',
          user,
          mode: 'edit-published',
          formAction: `/blogs/me/${post._id}/edit`,
          submitLabel: 'Save Revision Draft',
          categories: BLOG_CATEGORIES,
          templates: getComposerTemplateOptions(),
          blockTypes: getComposerBlockTypeOptions(),
          templateBlocksByKey: getComposerTemplateBlocksByKey(),
          formData: getBlogFormData(payload),
          errors: readyErrors,
          message: null,
          post: {
            ...post.toObject(),
            ...payload
          },
          livePost: post,
          revision: revisionForGallery
        });
      }

      const revision = await saveAuthorRevision({
        post,
        payload,
        actorId: user._id,
        shouldSubmit
      });
      return res.redirect(
        shouldSubmit
          ? '/blogs/me/dashboard?type=success&msg=Revision%20submitted%20for%20review.'
          : `/blogs/me/${post._id}/edit?type=success&msg=Revision%20draft%20saved.`
      );
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
    const previousGalleryUrls = normalizeGalleryImageUrls(post.galleryImageUrls || []);
    applyPayloadToPost(post, payload);
    const moderation = await buildPostModerationSignals({ payload, excludePostId: post._id });
    post.moderationFlags = moderation.flags;
    post.moderationFlagSummary = moderation.summary;

    if (shouldSubmit) {
      const readyErrors = validateReadyForReview({
        ...post.toObject(),
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        coverImageUrl: payload.coverImageUrl,
        coverImageAlt: payload.coverImageAlt,
        templateKey: payload.templateKey,
        contentBlocks: payload.contentBlocks,
        contentHtml: payload.contentHtml,
        contentText: payload.contentText,
        tags: payload.tags,
        galleryImageUrls: payload.galleryImageUrls,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
        ogImageUrl: payload.ogImageUrl
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
          templates: getComposerTemplateOptions(),
          blockTypes: getComposerBlockTypeOptions(),
          templateBlocksByKey: getComposerTemplateBlocksByKey(),
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
    keysToDelete.push(...collectRemovedGalleryKeys(previousGalleryUrls, payload.galleryImageUrls));
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

    const query = status === 'pending'
      ? {
          isDeleted: { $ne: true },
          $or: [{ status }, { activeRevisionStatus: 'pending' }]
        }
      : { isDeleted: { $ne: true }, status };
    if (q) {
      const safePattern = new RegExp(escapeRegex(q), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [{ title: safePattern }, { slug: safePattern }, { category: safePattern }, { customCategory: safePattern }]
      });
    }

    const posts = await Blog.find(query)
      .populate('authorId', 'firstName lastName email')
      .sort({ activeRevisionSubmittedAt: -1, submittedAt: -1, updatedAt: -1 })
      .select('title slug status category customCategory submittedAt updatedAt publishedAt rejectionReason readingTime createdAt activeRevisionStatus activeRevisionSubmittedAt activeRevisionUpdatedAt activeRevisionRejectionReason');

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

    if (post.status !== 'pending' && post.activeRevisionStatus !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Cannot approve a post from "${post.status}" status.`
      });
    }

    const result = await approveReviewTarget({
      post,
      actorId: req.session.userId || null
    });

    return res.json({
      success: true,
      message: result.revisionApplied ? 'Revision approved and applied successfully.' : 'Post approved and published successfully.',
      post: result.post
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

    if (post.status !== 'pending' && post.activeRevisionStatus !== 'pending') {
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

    const result = await rejectReviewTarget({
      post,
      actorId: req.session.userId || null,
      rejectionReason
    });

    return res.json({
      success: true,
      message: result.revisionRejected ? 'Revision rejected successfully.' : 'Post rejected successfully.',
      post: result.post
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

    const pendingRevision = await getActivePendingRevision(post._id);
    const reviewSource = pendingRevision ? { ...post.toObject(), ...pendingRevision.after } : post;
    const beforeSnapshot = pendingRevision
      ? createRevisionSnapshot(reviewSource)
      : getAdminAutosaveSnapshot(post);
    const nextPayload = normalizeAdminAutosavePayload(req.body, reviewSource);
    const validationErrors = validateBlogPayload(nextPayload);
    if (validationErrors.length) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validationErrors
      });
    }

    if (pendingRevision) {
      const nextSnapshot = createRevisionSnapshot({
        ...reviewSource,
        ...nextPayload,
        slug: await generateUniqueBlogSlug(nextPayload.title, post._id),
        readingTime: estimateReadingTime(nextPayload.contentHtml)
      });
      const moderation = await buildPostModerationSignals({ payload: nextPayload, excludePostId: post._id });
      pendingRevision.editedBy = req.session?.userId || null;
      pendingRevision.after = nextSnapshot;
      pendingRevision.changedFields = getRevisionChangedFields(
        pendingRevision.before && Object.keys(pendingRevision.before).length ? pendingRevision.before : createRevisionSnapshot(post),
        nextSnapshot
      );
      pendingRevision.editedAt = new Date();
      pendingRevision.moderationFlags = moderation.flags;
      pendingRevision.moderationFlagSummary = moderation.summary;
      await pendingRevision.save();

      post.activeRevisionUpdatedAt = pendingRevision.editedAt;
      await post.save();
    } else {
      if (nextPayload.title !== post.title) {
        post.title = nextPayload.title;
        post.slug = await generateUniqueBlogSlug(nextPayload.title, post._id);
      }

      applyPayloadToPost(post, nextPayload);
      post.featured = nextPayload.featured;
      post.moderationNotes = nextPayload.moderationNotes;
      const moderation = await buildPostModerationSignals({ payload: nextPayload, excludePostId: post._id });
      post.moderationFlags = moderation.flags;
      post.moderationFlagSummary = moderation.summary;

      if (nextPayload.status !== post.status) {
        applyAdminAutosaveStatusTransition(post, nextPayload.status, req.session?.userId || null);
      }

      await post.save();
    }
    const afterSnapshot = pendingRevision
      ? createRevisionSnapshot({ ...post.toObject(), ...pendingRevision.after })
      : getAdminAutosaveSnapshot(post);
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
        title: pendingRevision ? afterSnapshot.title : post.title,
        slug: pendingRevision ? afterSnapshot.slug : post.slug,
        excerpt: pendingRevision ? afterSnapshot.excerpt : post.excerpt,
        contentHtml: pendingRevision ? afterSnapshot.contentHtml : post.contentHtml,
        contentRaw: pendingRevision ? afterSnapshot.contentRaw : post.contentRaw,
        templateKey: pendingRevision ? afterSnapshot.templateKey : post.templateKey,
        contentBlocks: pendingRevision ? afterSnapshot.contentBlocks : post.contentBlocks,
        coverImageUrl: pendingRevision ? afterSnapshot.coverImageUrl : post.coverImageUrl,
        coverImageAlt: pendingRevision ? afterSnapshot.coverImageAlt : post.coverImageAlt,
        galleryImageUrls: pendingRevision ? afterSnapshot.galleryImageUrls : post.galleryImageUrls,
        category: pendingRevision ? afterSnapshot.category : post.category,
        customCategory: pendingRevision ? afterSnapshot.customCategory : post.customCategory,
        tags: pendingRevision ? afterSnapshot.tags : post.tags,
        featured: pendingRevision ? afterSnapshot.featured : post.featured,
        status: pendingRevision ? pendingRevision.status : post.status,
        readingTime: pendingRevision ? afterSnapshot.readingTime : post.readingTime,
        seoTitle: pendingRevision ? afterSnapshot.seoTitle : post.seoTitle,
        seoDescription: pendingRevision ? afterSnapshot.seoDescription : post.seoDescription,
        ogImageUrl: pendingRevision ? afterSnapshot.ogImageUrl : post.ogImageUrl,
        moderationNotes: pendingRevision ? afterSnapshot.moderationNotes : post.moderationNotes,
        updatedAt: pendingRevision ? pendingRevision.updatedAt : post.updatedAt,
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

    const query = status === 'pending'
      ? {
          isDeleted: { $ne: true },
          $or: [{ status }, { activeRevisionStatus: 'pending' }]
        }
      : { isDeleted: { $ne: true }, status };
    if (q) {
      const safePattern = new RegExp(escapeRegex(q), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [{ title: safePattern }, { slug: safePattern }, { category: safePattern }, { customCategory: safePattern }]
      });
    }

    const posts = await Blog.find(query)
      .populate('authorId', 'firstName lastName email')
      .sort({ activeRevisionSubmittedAt: -1, submittedAt: -1, updatedAt: -1 })
      .select('title slug status category customCategory submittedAt publishedAt rejectedAt rejectionReason readingTime createdAt updatedAt activeRevisionStatus activeRevisionSubmittedAt activeRevisionUpdatedAt activeRevisionRejectionReason');

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

    const reviewTarget = await resolveReviewTarget(post);
    const reportCounts = await BlogReport.aggregate([
      {
        $match: {
          blogId: post._id,
          status: 'open'
        }
      },
      {
        $group: {
          _id: '$targetType',
          count: { $sum: 1 }
        }
      }
    ]);
    const openReportCounts = reportCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    const revisions = await BlogRevision.find({ postId: post._id })
      .populate('editedBy', 'firstName lastName email')
      .sort({ editedAt: -1 })
      .limit(25)
      .lean();

    return res.render('admin/blog-review', {
      title: `Review Blog - ${post.title}`,
      post: reviewTarget.reviewData,
      sourcePost: post,
      message: getBlogPageMessage(req.query),
      categories: BLOG_CATEGORIES,
      statuses: BLOG_STATUSES,
      templates: getComposerTemplateOptions(),
      blockTypes: getComposerBlockTypeOptions(),
      templateBlocksByKey: getComposerTemplateBlocksByKey(),
      revisions,
      reviewTarget,
      openReportCounts
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

exports.uploadAdminBlogAssets = async (req, res) => {
  const uploadedKeys = [];
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
    if (req.uploadError) {
      return res.status(400).json({ success: false, message: req.uploadError });
    }
    const galleryImageFiles = getUploadedFiles(req, 'galleryImageFiles');
    if (!galleryImageFiles.length) {
      return res.status(400).json({ success: false, message: 'No gallery images uploaded.' });
    }
    const uploadedGallery = await uploadService.uploadBlogGalleryToR2({
      userId: req.session?.userId || 'admin',
      galleryImageFiles
    });
    uploadedGallery.forEach((item) => uploadedKeys.push(item.key));
    return res.json({
      success: true,
      galleryImageUrls: uploadedGallery.map((item) => item.url)
    });
  } catch (error) {
    console.error('uploadAdminBlogAssets error:', error);
    if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
    return res.status(500).json({ success: false, message: 'Failed to upload admin blog assets.' });
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
    if (post.status !== 'pending' && post.activeRevisionStatus !== 'pending') {
      return res.redirect(`/admin/blog/posts/${post._id}/review?type=error&msg=Only%20pending%20posts%20can%20be%20approved.`);
    }
    const result = await approveReviewTarget({
      post,
      actorId: req.session.userId || null
    });

    return res.redirect(
      `/admin/blog/posts/${post._id}/review?type=success&msg=${encodeURIComponent(result.revisionApplied ? 'Revision approved and applied.' : 'Post approved and published.')}`
    );
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
    if (post.status !== 'pending' && post.activeRevisionStatus !== 'pending') {
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

    const result = await rejectReviewTarget({
      post,
      actorId: req.session.userId || null,
      rejectionReason
    });

    return res.redirect(
      `/admin/blog/posts/${post._id}/review?type=success&msg=${encodeURIComponent(result.revisionRejected ? 'Revision rejected.' : 'Post rejected.')}`
    );
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
  const contentBlocks = normalizeContentBlocks(body.contentBlocksJson || body.contentBlocks);
  const hasStructuredBlocks = contentBlocks.length > 0;
  const contentHtml = hasStructuredBlocks
    ? renderContentBlocksToHtml(contentBlocks)
    : sanitizeHtml(String(body.contentHtml || ''));
  const contentText = hasStructuredBlocks ? getStructuredContentText(contentBlocks) : htmlToPlainText(contentHtml);
  const category = String(body.category || '').trim();
  const customCategoryInput = String(body.customCategory || '').trim();
  const customCategory = category === 'Other' ? customCategoryInput : '';

  return {
    title: String(body.title || '').trim(),
    excerpt: String(body.excerpt || '').trim(),
    category,
    customCategory,
    coverImageUrl: String(body.coverImageUrl || '').trim(),
    coverImageAlt: String(body.coverImageAlt || '').trim().slice(0, 180),
    galleryImageUrls: normalizeGalleryImageUrls(body.galleryImageUrlsJson || body.galleryImageUrls),
    templateKey: normalizeTemplateKey(body.templateKey),
    contentBlocks,
    contentHtml,
    contentText,
    contentRaw: String(body.contentRaw || '').trim(),
    tags: normalizeTags(Array.isArray(body.tags) ? body.tags : splitTags(body.tags)),
    seoTitle: String(body.seoTitle || '').trim().slice(0, 160),
    seoDescription: String(body.seoDescription || '').trim().slice(0, 320),
    ogImageUrl: String(body.ogImageUrl || '').trim().slice(0, 2000)
  };
}

function normalizeAdminAutosavePayload(body = {}, post) {
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(body, key);
  const category = hasOwn('category') ? String(body.category || '').trim() : String(post.category || '').trim();
  const contentBlocks = hasOwn('contentBlocks') || hasOwn('contentBlocksJson')
    ? normalizeContentBlocks(body.contentBlocksJson || body.contentBlocks)
    : (Array.isArray(post.contentBlocks) ? normalizeContentBlocks(post.contentBlocks) : []);
  const hasStructuredBlocks = contentBlocks.length > 0;
  const rawContentHtml = hasOwn('contentHtml') ? String(body.contentHtml || '') : String(post.contentHtml || '');
  const contentHtml = hasStructuredBlocks ? renderContentBlocksToHtml(contentBlocks) : sanitizeHtml(rawContentHtml);
  const contentRaw = hasOwn('contentRaw') ? String(body.contentRaw || '').trim() : String(post.contentRaw || '');
  const contentText = hasStructuredBlocks ? getStructuredContentText(contentBlocks) : htmlToPlainText(contentHtml);
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
    coverImageAlt: hasOwn('coverImageAlt') ? String(body.coverImageAlt || '').trim().slice(0, 180) : String(post.coverImageAlt || '').trim(),
    galleryImageUrls: hasOwn('galleryImageUrls') || hasOwn('galleryImageUrlsJson')
      ? normalizeGalleryImageUrls(body.galleryImageUrlsJson || body.galleryImageUrls)
      : normalizeGalleryImageUrls(post.galleryImageUrls),
    templateKey: hasOwn('templateKey') ? normalizeTemplateKey(body.templateKey) : normalizeTemplateKey(post.templateKey),
    contentBlocks,
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
    coverImageAlt: String(body.coverImageAlt || '').trim(),
    galleryImageUrls: normalizeGalleryImageUrls(body.galleryImageUrlsJson || body.galleryImageUrls),
    galleryImageUrlsJson: JSON.stringify(normalizeGalleryImageUrls(body.galleryImageUrlsJson || body.galleryImageUrls)),
    removeCoverImage: String(body.removeCoverImage || '').trim() === '1',
    templateKey: normalizeTemplateKey(body.templateKey),
    contentBlocks: normalizeContentBlocks(body.contentBlocksJson || body.contentBlocks),
    contentBlocksJson: JSON.stringify(normalizeContentBlocks(body.contentBlocksJson || body.contentBlocks)),
    isStructured: isStructuredPost(body),
    contentHtml: String(body.contentHtml || '').trim(),
    contentText: String(body.contentText || '').trim(),
    contentRaw: String(body.contentRaw || '').trim(),
    tags: Array.isArray(body.tags)
      ? body.tags.join(', ')
      : String(body.tags || '').trim(),
    seoTitle: String(body.seoTitle || '').trim(),
    seoDescription: String(body.seoDescription || '').trim(),
    ogImageUrl: String(body.ogImageUrl || '').trim()
  };
}

function normalizeGalleryImageUrls(value) {
  const list = Array.isArray(value)
    ? value
    : splitTags(String(value || '').replace(/\n/g, ','));
  return list
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, MAX_BLOG_GALLERY_IMAGES);
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
    templateKey: normalizeTemplateKey(post.templateKey),
    contentBlocks: normalizeContentBlocks(post.contentBlocks || []),
    coverImageUrl: String(post.coverImageUrl || ''),
    coverImageAlt: String(post.coverImageAlt || ''),
    galleryImageUrls: normalizeGalleryImageUrls(post.galleryImageUrls || []),
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

function getUploadedFile(req, fieldName) {
  if (req.file && fieldName === 'coverImageFile') return req.file;
  const fileGroup = req.files && req.files[fieldName];
  if (Array.isArray(fileGroup) && fileGroup.length) {
    return fileGroup[0];
  }
  return null;
}

function getUploadedFiles(req, fieldName) {
  if (Array.isArray(req.files?.[fieldName])) {
    return req.files[fieldName];
  }
  return [];
}

async function uploadBlogAssetsForPayload({ req, userId, payload, existingGallery = [], uploadedKeys = [] }) {
  const coverImageFile = getUploadedFile(req, 'coverImageFile');
  if (coverImageFile) {
    const uploadedCover = await uploadService.uploadBlogCoverToR2({ userId, coverImageFile });
    uploadedKeys.push(uploadedCover.key);
    payload.coverImageUrl = uploadedCover.url;
  }

  const galleryImageFiles = getUploadedFiles(req, 'galleryImageFiles');
  if (galleryImageFiles.length) {
    const uploadedGallery = await uploadService.uploadBlogGalleryToR2({ userId, galleryImageFiles });
    uploadedGallery.forEach((item) => uploadedKeys.push(item.key));
    payload.galleryImageUrls = [
      ...normalizeGalleryImageUrls(existingGallery),
      ...uploadedGallery.map((item) => item.url)
    ].slice(0, MAX_BLOG_GALLERY_IMAGES);
  } else if (!Array.isArray(payload.galleryImageUrls) || !payload.galleryImageUrls.length) {
    payload.galleryImageUrls = normalizeGalleryImageUrls(existingGallery);
  }
}

function collectRemovedGalleryKeys(previousUrls, nextUrls) {
  const nextSet = new Set(normalizeGalleryImageUrls(nextUrls));
  return normalizeGalleryImageUrls(previousUrls)
    .filter((url) => !nextSet.has(url))
    .map((url) => uploadService.extractObjectKeyFromPublicUrl(url))
    .filter(Boolean);
}

async function buildPostModerationSignals({ payload, excludePostId = null }) {
  const spam = analyzePostSpamSignals({
    title: payload.title,
    excerpt: payload.excerpt,
    contentText: payload.contentText
  });
  const candidates = await Blog.find({
    isDeleted: { $ne: true },
    ...(excludePostId ? { _id: { $ne: excludePostId } } : {})
  })
    .select('_id title excerpt contentText')
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();
  const similarity = detectSimilarityFlags({
    title: payload.title,
    excerpt: payload.excerpt,
    contentText: payload.contentText,
    candidates,
    excludeId: excludePostId
  });

  const flags = Array.from(new Set([...(spam.flags || []), ...(similarity.flags || [])]));
  return {
    flags,
    summary: [spam.summary, similarity.summary].filter(Boolean).join('; ').slice(0, 500)
  };
}

function applyPayloadToPost(post, payload) {
  post.excerpt = payload.excerpt;
  post.contentHtml = payload.contentHtml;
  post.contentText = payload.contentText;
  post.contentRaw = payload.contentRaw;
  post.templateKey = payload.templateKey;
  post.contentBlocks = payload.contentBlocks;
  post.coverImageUrl = payload.coverImageUrl;
  post.coverImageAlt = payload.coverImageAlt;
  post.galleryImageUrls = payload.galleryImageUrls;
  post.category = payload.category;
  post.customCategory = payload.customCategory;
  post.tags = payload.tags;
  post.readingTime = estimateReadingTime(payload.contentHtml);
  post.seoTitle = payload.seoTitle;
  post.seoDescription = payload.seoDescription;
  post.ogImageUrl = payload.ogImageUrl;
}

function createRevisionSnapshot(post, payload = null) {
  const source = payload || post;
  const contentBlocks = normalizeContentBlocks(source.contentBlocks || source.contentBlocksJson || []);
  const contentHtml = payload ? source.contentHtml : String(source.contentHtml || '');
  const title = String(source.title || '').trim();

  return {
    title,
    slug: String(source.slug || '').trim(),
    excerpt: String(source.excerpt || '').trim(),
    contentHtml,
    contentText: payload ? source.contentText : String(source.contentText || ''),
    contentRaw: String(source.contentRaw || '').trim(),
    templateKey: normalizeTemplateKey(source.templateKey),
    contentBlocks,
    coverImageUrl: String(source.coverImageUrl || '').trim(),
    coverImageAlt: String(source.coverImageAlt || '').trim(),
    galleryImageUrls: normalizeGalleryImageUrls(source.galleryImageUrls || []),
    category: String(source.category || '').trim(),
    customCategory: String(source.customCategory || '').trim(),
    tags: normalizeTags(Array.isArray(source.tags) ? source.tags : splitTags(source.tags)),
    featured: Boolean(source.featured),
    status: String(source.status || '').trim(),
    readingTime: Number(source.readingTime || estimateReadingTime(contentHtml)),
    seoTitle: String(source.seoTitle || '').trim(),
    seoDescription: String(source.seoDescription || '').trim(),
    ogImageUrl: String(source.ogImageUrl || '').trim(),
    moderationNotes: String(source.moderationNotes || '').trim()
  };
}

function getRevisionChangedFields(beforeSnapshot, afterSnapshot) {
  return ADMIN_AUTOSAVE_TRACKED_FIELDS.filter((field) => {
    return JSON.stringify(beforeSnapshot[field]) !== JSON.stringify(afterSnapshot[field]);
  });
}

function syncBlogRevisionState(post, revision) {
  post.activeRevisionId = revision ? revision._id : null;
  post.activeRevisionStatus = revision ? String(revision.status || '') : '';
  post.activeRevisionSubmittedAt = revision ? revision.submittedAt || null : null;
  post.activeRevisionUpdatedAt = revision ? revision.editedAt || revision.updatedAt || new Date() : null;
  post.activeRevisionRejectedAt = revision ? revision.reviewedAt || null : null;
  post.activeRevisionRejectionReason = revision ? String(revision.rejectionReason || '') : '';
}

async function getOrCreateAuthorRevision(post, actorId) {
  let revision = null;
  if (post.activeRevisionId && mongoose.Types.ObjectId.isValid(post.activeRevisionId)) {
    revision = await BlogRevision.findOne({
      _id: post.activeRevisionId,
      postId: post._id,
      source: 'author_revision'
    });
  }
  if (!revision) {
    const liveSnapshot = createRevisionSnapshot(post);
    revision = await BlogRevision.create({
      postId: post._id,
      editedBy: actorId,
      source: 'author_revision',
      status: 'draft',
      changedFields: [],
      before: liveSnapshot,
      after: liveSnapshot,
      editedAt: new Date()
    });
  }
  syncBlogRevisionState(post, revision);
  return revision;
}

function applyRevisionSnapshotToPost(post, snapshot) {
  if (snapshot.title && snapshot.title !== post.title) {
    post.title = snapshot.title;
  }
  post.slug = String(snapshot.slug || post.slug || '').trim();
  post.excerpt = snapshot.excerpt;
  post.contentHtml = snapshot.contentHtml;
  post.contentText = snapshot.contentText;
  post.contentRaw = snapshot.contentRaw;
  post.templateKey = snapshot.templateKey;
  post.contentBlocks = normalizeContentBlocks(snapshot.contentBlocks || []);
  post.coverImageUrl = snapshot.coverImageUrl;
  post.coverImageAlt = snapshot.coverImageAlt;
  post.galleryImageUrls = normalizeGalleryImageUrls(snapshot.galleryImageUrls || []);
  post.category = snapshot.category;
  post.customCategory = snapshot.customCategory;
  post.tags = normalizeTags(snapshot.tags || []);
  post.featured = Boolean(snapshot.featured);
  post.readingTime = Number(snapshot.readingTime || estimateReadingTime(snapshot.contentHtml));
  post.seoTitle = snapshot.seoTitle;
  post.seoDescription = snapshot.seoDescription;
  post.ogImageUrl = snapshot.ogImageUrl;
  post.moderationNotes = snapshot.moderationNotes;
}

async function saveAuthorRevision({ post, payload, actorId, shouldSubmit }) {
  const revision = await getOrCreateAuthorRevision(post, actorId);
  const beforeSnapshot = revision.before && Object.keys(revision.before).length
    ? revision.before
    : createRevisionSnapshot(post);
  const previousAfter = revision.after && Object.keys(revision.after).length
    ? revision.after
    : beforeSnapshot;
  const nextSnapshot = createRevisionSnapshot({
    ...previousAfter,
    ...payload,
    title: payload.title,
    slug: await generateUniqueBlogSlug(payload.title, post._id),
    status: shouldSubmit ? 'pending' : 'draft',
    readingTime: estimateReadingTime(payload.contentHtml)
  });
  const changedFields = getRevisionChangedFields(beforeSnapshot, nextSnapshot);
  const moderation = await buildPostModerationSignals({ payload, excludePostId: post._id });

  revision.editedBy = actorId;
  revision.source = 'author_revision';
  revision.before = beforeSnapshot;
  revision.after = nextSnapshot;
  revision.changedFields = changedFields;
  revision.editedAt = new Date();
  revision.status = shouldSubmit ? 'pending' : 'draft';
  revision.submittedAt = shouldSubmit ? new Date() : null;
  revision.reviewedAt = null;
  revision.appliedAt = null;
  revision.rejectionReason = '';
  revision.moderationFlags = moderation.flags;
  revision.moderationFlagSummary = moderation.summary;
  await revision.save();

  syncBlogRevisionState(post, revision);
  await post.save();

  return revision;
}

async function getActivePendingRevision(postId) {
  return BlogRevision.findOne({
    postId,
    source: 'author_revision',
    status: 'pending'
  }).sort({ submittedAt: -1, editedAt: -1 });
}

async function resolveReviewTarget(post) {
  const revision = await getActivePendingRevision(post._id);
  if (!revision) {
    return {
      kind: 'post',
      post,
      reviewData: post.toObject ? post.toObject() : post,
      revision: null
    };
  }
  return {
    kind: 'revision',
    post,
    reviewData: {
      ...post.toObject(),
      ...revision.after,
      status: revision.status,
      rejectionReason: revision.rejectionReason || '',
      moderationFlags: revision.moderationFlags || [],
      moderationFlagSummary: revision.moderationFlagSummary || ''
    },
    revision
  };
}

async function approveReviewTarget({ post, actorId }) {
  const revision = await getActivePendingRevision(post._id);
  const now = new Date();

  if (revision) {
    const snapshot = revision.after || {};
    if (snapshot.title && snapshot.title !== post.title) {
      post.title = snapshot.title;
      post.slug = await generateUniqueBlogSlug(snapshot.title, post._id);
    }
    applyRevisionSnapshotToPost(post, {
      ...snapshot,
      slug: post.slug
    });
    const moderation = await buildPostModerationSignals({
      payload: {
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        customCategory: post.customCategory,
        coverImageUrl: post.coverImageUrl,
        coverImageAlt: post.coverImageAlt,
        galleryImageUrls: post.galleryImageUrls,
        templateKey: post.templateKey,
        contentBlocks: post.contentBlocks,
        contentHtml: post.contentHtml,
        contentText: post.contentText,
        contentRaw: post.contentRaw,
        tags: post.tags,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        ogImageUrl: post.ogImageUrl
      },
      excludePostId: post._id
    });
    post.moderationFlags = moderation.flags;
    post.moderationFlagSummary = moderation.summary;
    post.status = 'published';
    post.publishedAt = now;
    post.reviewedAt = now;
    post.approvedAt = now;
    post.approvedBy = actorId || null;
    post.rejectedAt = null;
    post.rejectedBy = null;
    post.rejectionReason = '';
    syncBlogRevisionState(post, null);
    await post.save();

    revision.status = 'approved';
    revision.reviewedAt = now;
    revision.appliedAt = now;
    revision.editedAt = now;
    await revision.save();
    return { revisionApplied: true, revision, post };
  }

  if (post.status !== 'pending') {
    throw new Error(`Cannot approve a post from "${post.status}" status.`);
  }
  post.status = 'published';
  post.publishedAt = now;
  post.reviewedAt = now;
  post.approvedAt = now;
  post.approvedBy = actorId || null;
  post.rejectedAt = null;
  post.rejectedBy = null;
  post.rejectionReason = '';
  await post.save();
  return { revisionApplied: false, revision: null, post };
}

async function rejectReviewTarget({ post, actorId, rejectionReason }) {
  const now = new Date();
  const revision = await getActivePendingRevision(post._id);
  if (revision) {
    revision.status = 'rejected';
    revision.reviewedAt = now;
    revision.rejectionReason = rejectionReason;
    revision.editedAt = now;
    await revision.save();
    syncBlogRevisionState(post, revision);
    await post.save();
    return { revisionRejected: true, revision, post };
  }

  if (post.status !== 'pending') {
    throw new Error(`Cannot reject a post from "${post.status}" status.`);
  }

  post.status = 'rejected';
  post.reviewedAt = now;
  post.rejectedAt = now;
  post.rejectedBy = actorId || null;
  post.rejectionReason = rejectionReason;
  post.approvedAt = null;
  post.approvedBy = null;
  await post.save();
  return { revisionRejected: false, revision: null, post };
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
  if (payload.coverImageAlt && payload.coverImageAlt.length > 180) {
    errors.push('Cover image alt text must be 180 characters or less.');
  }
  if (payload.galleryImageUrls.length > MAX_BLOG_GALLERY_IMAGES) {
    errors.push(`Maximum ${MAX_BLOG_GALLERY_IMAGES} gallery images are allowed.`);
  }
  for (const galleryUrl of payload.galleryImageUrls) {
    if (galleryUrl.length > 2000) {
      errors.push('Gallery image URL is too long.');
      break;
    }
    if (!isValidHttpUrl(galleryUrl)) {
      errors.push('Gallery image URLs must be valid http/https URLs.');
      break;
    }
  }
  if (requireCover && !payload.coverImageUrl) {
    errors.push('Cover image is required before submitting for review.');
  }
  if (Array.isArray(payload.contentBlocks) && payload.contentBlocks.length > 0) {
    errors.push(...validateContentBlocks(payload.contentBlocks));
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
  if (payload.seoTitle && payload.seoTitle.length > 160) {
    errors.push('SEO title must be 160 characters or less.');
  }
  if (payload.seoDescription && payload.seoDescription.length > 320) {
    errors.push('SEO description must be 320 characters or less.');
  }
  if (payload.ogImageUrl && !isValidHttpUrl(payload.ogImageUrl)) {
    errors.push('OG image URL must be a valid http/https URL.');
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
    coverImageAlt: post.coverImageAlt || '',
    galleryImageUrls: normalizeGalleryImageUrls(post.galleryImageUrls || []),
    templateKey: post.templateKey || 'custom',
    contentBlocks: Array.isArray(post.contentBlocks) ? post.contentBlocks : [],
    contentHtml: post.contentHtml || '',
    contentText: post.contentText || '',
    contentRaw: post.contentRaw || '',
    tags: Array.isArray(post.tags) ? post.tags : [],
    seoTitle: post.seoTitle || '',
    seoDescription: post.seoDescription || '',
    ogImageUrl: post.ogImageUrl || ''
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

function getComposerTemplateOptions() {
  return BLOG_TEMPLATE_KEYS.map((key) => ({
    key,
    label: TEMPLATE_LABELS[key] || key,
    description: TEMPLATE_DESCRIPTIONS[key] || ''
  }));
}

function getComposerBlockTypeOptions() {
  return BLOG_BLOCK_TYPES.map((key) => ({
    key,
    label: BLOCK_LABELS[key] || key,
    description: BLOCK_DESCRIPTIONS[key] || ''
  }));
}

function getComposerTemplateBlocksByKey() {
  return BLOG_TEMPLATE_KEYS.reduce((acc, key) => {
    acc[key] = getTemplateBlocks(key);
    return acc;
  }, {});
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
