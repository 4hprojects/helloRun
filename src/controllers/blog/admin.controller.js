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
    logger.error('listPendingBlogs error:', error);
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
    logger.error('previewBlogPost error:', error);
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
    logger.error('approveBlogPost error:', error);
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
    logger.error('rejectBlogPost error:', error);
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
    logger.error('archiveBlogPost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive post.' });
  }
};

exports.autosaveBlogPostAdmin = async (req, res) => {
  const uploadedKeys = [];
  let assetsPersisted = false;
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

    let requestBody = req.body || {};
    if (Object.prototype.hasOwnProperty.call(requestBody, 'payload')) {
      try {
        requestBody = JSON.parse(String(requestBody.payload || '{}'));
      } catch (_error) {
        return res.status(400).json({ success: false, message: 'Invalid autosave payload.' });
      }
      if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
        return res.status(400).json({ success: false, message: 'Invalid autosave payload.' });
      }
    }

    const pendingRevision = await getActivePendingRevision(post._id);
    const reviewSource = pendingRevision ? { ...post.toObject(), ...pendingRevision.after } : post;
    const beforeSnapshot = pendingRevision
      ? createRevisionSnapshot(reviewSource)
      : getAdminAutosaveSnapshot(post);
    const nextPayload = normalizeAdminAutosavePayload(requestBody, reviewSource);

    const coverImageFile = getUploadedFile(req, 'coverImageFile');
    const galleryImageFiles = getUploadedFiles(req, 'galleryImageFiles');
    const inlineImageFile = getUploadedFile(req, 'inlineImageFile');
    if (nextPayload.galleryImageUrls.length + galleryImageFiles.length > MAX_BLOG_GALLERY_IMAGES) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_BLOG_GALLERY_IMAGES} gallery images are allowed.`
      });
    }

    const actorId = req.session?.userId || 'admin';
    if (coverImageFile) {
      const uploadedCover = await uploadService.uploadBlogCoverToR2({ userId: actorId, coverImageFile });
      uploadedKeys.push(uploadedCover.key);
      nextPayload.coverImageUrl = uploadedCover.url;
    }
    if (galleryImageFiles.length) {
      const uploadedGallery = await uploadService.uploadBlogGalleryToR2({
        userId: actorId,
        galleryImageFiles
      });
      uploadedGallery.forEach((item) => uploadedKeys.push(item.key));
      nextPayload.galleryImageUrls = [
        ...nextPayload.galleryImageUrls,
        ...uploadedGallery.map((item) => item.url)
      ];
    }
    if (inlineImageFile) {
      const inlineImageIndex = Number(requestBody.inlineImageBlockIndex);
      const targetBlock = Number.isInteger(inlineImageIndex) ? nextPayload.contentBlocks[inlineImageIndex] : null;
      if (!targetBlock || targetBlock.type !== 'image') {
        if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
        return res.status(400).json({ success: false, message: 'Inline image target is invalid.' });
      }
      const uploadedInline = await uploadService.uploadBlogInlineToR2({
        userId: actorId,
        inlineImageFile
      });
      uploadedKeys.push(uploadedInline.key);
      targetBlock.content = { ...(targetBlock.content || {}), url: uploadedInline.url };
      nextPayload.contentHtml = renderContentBlocksToHtml(nextPayload.contentBlocks);
      nextPayload.contentText = getStructuredContentText(nextPayload.contentBlocks);
    }
    const validationErrors = validateBlogPayload(nextPayload, {
      requireCover: ['pending', 'published', 'scheduled'].includes(nextPayload.status)
    });
    if (validationErrors.length) {
      if (uploadedKeys.length) await uploadService.deleteObjects(uploadedKeys);
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
      assetsPersisted = true;

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
      assetsPersisted = true;
    }
    const afterSnapshot = pendingRevision
      ? createRevisionSnapshot({ ...post.toObject(), ...pendingRevision.after })
      : getAdminAutosaveSnapshot(post);
    const changedFields = getChangedFields(beforeSnapshot, afterSnapshot);

    if (changedFields.length) {
      const revisionActorId = mongoose.Types.ObjectId.isValid(req.session?.userId)
        ? req.session.userId
        : null;
      await BlogRevision.create({
        postId: post._id,
        editedBy: revisionActorId,
        source: 'admin_autosave',
        changedFields,
        before: pickFields(beforeSnapshot, changedFields),
        after: pickFields(afterSnapshot, changedFields),
        editedAt: new Date()
      });
    }

    const keysToDelete = [];
    const previousCoverUrl = String(beforeSnapshot.coverImageUrl || '');
    if (previousCoverUrl && previousCoverUrl !== nextPayload.coverImageUrl) {
      const previousCoverKey = uploadService.extractObjectKeyFromPublicUrl(previousCoverUrl);
      if (previousCoverKey) keysToDelete.push(previousCoverKey);
    }
    keysToDelete.push(...collectRemovedGalleryKeys(beforeSnapshot.galleryImageUrls, nextPayload.galleryImageUrls));
    const previousInlineUrls = (Array.isArray(beforeSnapshot.contentBlocks) ? beforeSnapshot.contentBlocks : [])
      .filter((block) => block?.type === 'image')
      .map((block) => String(block.content?.url || ''))
      .filter(Boolean);
    const nextInlineUrlSet = new Set(
      (Array.isArray(nextPayload.contentBlocks) ? nextPayload.contentBlocks : [])
        .filter((block) => block?.type === 'image')
        .map((block) => String(block.content?.url || ''))
        .filter(Boolean)
    );
    previousInlineUrls
      .filter((url) => !nextInlineUrlSet.has(url))
      .map((url) => uploadService.extractObjectKeyFromPublicUrl(url))
      .filter(Boolean)
      .forEach((key) => keysToDelete.push(key));
    if (keysToDelete.length) await uploadService.deleteObjects(Array.from(new Set(keysToDelete)));

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
    logger.error('autosaveBlogPostAdmin error:', error);
    if (!assetsPersisted && uploadedKeys.length) {
      await uploadService.deleteObjects(uploadedKeys);
    }
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
      .select('title slug status category customCategory coverImageUrl submittedAt publishedAt rejectedAt rejectionReason readingTime createdAt updatedAt activeRevisionStatus activeRevisionSubmittedAt activeRevisionUpdatedAt activeRevisionRejectionReason');

    return res.render('admin/blog-queue', {
      title: 'Blog Moderation - HelloRun Admin',
      posts,
      selectedStatus: status,
      searchQuery: q,
      message: getBlogPageMessage(req.query)
    });
  } catch (error) {
    logger.error('renderAdminQueuePage error:', error);
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
    logger.error('renderAdminReviewPage error:', error);
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
    logger.error('uploadAdminBlogAssets error:', error);
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
    logger.error('approveBlogPostPage error:', error);
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
    logger.error('rejectBlogPostPage error:', error);
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
    logger.error('archiveBlogPostPage error:', error);
    return res.redirect(`/admin/blog/posts/${req.params.id}/review?type=error&msg=Failed%20to%20archive%20post.`);
  }
};
