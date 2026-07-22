'use strict';

const {
  getGuidesAndResources,
  FeedCtorPromise,
  loadFeedCtor,
  getTopWriters,
  mongoose,
  logger,
  Blog,
  BlogRevision,
  User,
  uploadService,
  BLOG_CATEGORIES,
  BLOG_STATUSES,
  slugifyBlogTitle,
  normalizeTags,
  sanitizeHtml,
  htmlToPlainText,
  BlogReport,
  analyzePostSpamSignals,
  detectSimilarityFlags,
  normalizeTemplateKey,
  normalizeContentBlocks,
  validateContentBlocks,
  renderContentBlocksToHtml,
  getStructuredContentText,
  isStructuredPost,
  getComposerTemplateOptions,
  getComposerBlockTypeOptions,
  getComposerTemplateBlocksByKey,
  EDITABLE_STATUSES,
  ADMIN_REVIEW_STATUSES,
  MIN_REJECTION_REASON_LENGTH,
  MAX_REJECTION_REASON_LENGTH,
  REVISION_MAX_FIELD_LENGTH,
  MAX_BLOG_GALLERY_IMAGES,
  MAX_BLOG_TITLE_LENGTH,
  MAX_BLOG_EXCERPT_LENGTH,
  MAX_BLOG_CONTENT_HTML_LENGTH,
  MAX_BLOG_TAGS,
  MAX_BLOG_TAG_LENGTH,
  ADMIN_AUTOSAVE_TRACKED_FIELDS,
  normalizeStatusFilter,
  normalizeAdminStatusFilter,
  escapeRegex,
  normalizeBlogPayload,
  normalizeAdminAutosavePayload,
  getBlogFormData,
  normalizeGalleryImageUrls,
  splitTags,
  normalizeBoolean,
  getAdminAutosaveSnapshot,
  getChangedFields,
  pickFields,
  compactRevisionValue,
  applyAdminAutosaveStatusTransition,
  getUploadedFile,
  getUploadedFiles,
  uploadBlogAssetsForPayload,
  collectRemovedGalleryKeys,
  buildPostModerationSignals,
  evaluateBlogContentEligibility,
  applyPayloadToPost,
  createRevisionSnapshot,
  getRevisionChangedFields,
  syncBlogRevisionState,
  getOrCreateAuthorRevision,
  applyRevisionSnapshotToPost,
  saveAuthorRevision,
  getActivePendingRevision,
  resolveReviewTarget,
  approveReviewTarget,
  rejectReviewTarget,
  validateBlogPayload,
  validateReadyForReview,
  estimateReadingTime,
  isValidHttpUrl,
  generateUniqueBlogSlug,
  getAuthorFromSession,
  getBlogPageMessage
} = require('./_shared');

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
    logger.error('getMyBlogs error:', error);
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
    logger.error('getMyBlogById error:', error);
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
      moderationFlagSummary: moderation.summary,
      contentEligibility: evaluateBlogContentEligibility(payload),
      publicationReview: null
    });

    return res.status(201).json({
      success: true,
      message: 'Draft created successfully.',
      post
    });
  } catch (error) {
    logger.error('createDraft error:', error);
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
    post.contentEligibility = evaluateBlogContentEligibility(payload);
    post.publicationReview = null;

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
    logger.error('updateDraft error:', error);
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
    post.contentEligibility = evaluateBlogContentEligibility(post);
    post.publicationReview = null;
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
    logger.error('submitForReview error:', error);
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
    logger.error('deleteMyDraft error:', error);
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
    logger.error('discardRevision error:', error);
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
    logger.error('uploadBlogImagesForEditor error:', error);
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
      title: 'My Blogs - HelloRun',
      user,
      posts,
      selectedStatus,
      message: getBlogPageMessage(req.query)
    });
  } catch (error) {
    logger.error('renderAuthorDashboard error:', error);
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
      title: 'Create Blog Draft - HelloRun',
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
    logger.error('renderCreatePage error:', error);
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
        title: 'Create Blog Draft - HelloRun',
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
        title: 'Create Blog Draft - HelloRun',
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
          title: 'Create Blog Draft - HelloRun',
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
      moderationFlagSummary: moderation.summary,
      contentEligibility: evaluateBlogContentEligibility(payload),
      publicationReview: null
    });

    if (shouldSubmit) {
      return res.redirect('/blogs/me/dashboard?type=success&msg=Post%20submitted%20for%20review.');
    }
    return res.redirect('/blogs/me/dashboard?type=success&msg=Draft%20created%20successfully.');
  } catch (error) {
    logger.error('createDraftPage error:', error);
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
      title: 'Edit Blog Draft - HelloRun',
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
    logger.error('renderEditPage error:', error);
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
        title: 'Edit Blog Draft - HelloRun',
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
        title: 'Edit Blog Draft - HelloRun',
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
          title: 'Edit Published Blog - HelloRun',
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
    post.contentEligibility = evaluateBlogContentEligibility(payload);
    post.publicationReview = null;

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
          title: 'Edit Blog Draft - HelloRun',
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
    logger.error('updateDraftPage error:', error);
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
    post.contentEligibility = evaluateBlogContentEligibility(post);
    post.publicationReview = null;
    post.submittedAt = new Date();
    post.reviewedAt = null;
    post.rejectionReason = '';
    post.rejectedAt = null;
    post.rejectedBy = null;
    await post.save();

    return res.redirect('/blogs/me/dashboard?type=success&msg=Post%20submitted%20for%20review.');
  } catch (error) {
    logger.error('submitForReviewPage error:', error);
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
    logger.error('deleteMyDraftPage error:', error);
    return res.redirect('/blogs/me/dashboard?type=error&msg=Failed%20to%20delete%20post.');
  }
};
