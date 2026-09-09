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
  getOrCreateAdminRevision,
  applyRevisionSnapshotToPost,
  saveAuthorRevision,
  getActivePendingRevision,
  resolveReviewTarget,
  approveReviewTarget,
  getBlockingModerationFlags,
  rejectReviewTarget,
  validateBlogPayload,
  validateReadyForReview,
  estimateReadingTime,
  isValidHttpUrl,
  generateUniqueBlogSlug,
  getAuthorFromSession,
  getBlogPageMessage
} = require('./_shared');
const { recordCriticalAuditEventInBackground } = require('../../services/critical-audit.service');
const { invalidateIndexingReview } = require('../../utils/blog-indexing');
const { listManagedPosts } = require('../../services/admin-blog-management.service');

function recordBlogModerationAudit(req, input = {}) {
  recordCriticalAuditEventInBackground({
    action: input.action,
    targetType: 'blog',
    targetId: String(input.postId || ''),
    statusFrom: input.statusFrom || '',
    statusTo: input.statusTo || '',
    actorMongoUserId: req.session?.userId || '',
    notes: JSON.stringify(input.details || {}).slice(0, 4000),
    ipAddress: req.ip,
    userAgent: req.get?.('user-agent') || '',
    occurredAt: new Date()
  });
}

exports.listPendingBlogs = async (req, res) => {
  try {
    const result = await listManagedPosts(req.query);

    return res.json({
      success: true,
      ...result
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
      actorId: req.session.userId || null,
      reviewInput: req.body
    });

    recordBlogModerationAudit(req, {
      action: result.post.publicationReview?.overrideReason
        ? 'admin.blog.approved_with_override'
        : 'admin.blog.approved',
      postId: post._id,
      statusFrom: 'pending',
      statusTo: result.post.status,
      details: {
        revisionApplied: result.revisionApplied,
        policyVersion: result.post.contentEligibility?.policyVersion,
        sourceHash: result.post.contentEligibility?.sourceHash,
        review: result.post.publicationReview
      }
    });

    return res.json({
      success: true,
      message: result.post.status === 'scheduled'
        ? 'Post approved and scheduled successfully.'
        : (result.revisionApplied ? 'Revision approved and applied successfully.' : 'Post approved and published successfully.'),
      post: result.post
    });
  } catch (error) {
    logger.error('approveBlogPost error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Failed to approve post.',
      errors: error.validationErrors || []
    });
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

    recordBlogModerationAudit(req, {
      action: 'admin.blog.rejected',
      postId: post._id,
      statusFrom: 'pending',
      statusTo: 'rejected',
      details: { revisionRejected: result.revisionRejected, rejectionReason }
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

    if (!['published', 'scheduled'].includes(post.status)) {
      return res.status(409).json({
        success: false,
        message: `Only published or scheduled posts can be archived. Current status: "${post.status}".`
      });
    }

    const previousStatus = post.status;
    post.status = 'archived';
    post.scheduledFor = null;
    post.reviewedAt = new Date();
    await post.save();
    recordBlogModerationAudit(req, {
      action: 'admin.blog.archived', postId: post._id, statusFrom: previousStatus, statusTo: 'archived'
    });

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

async function changeBlogManagementState(req, res, action) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post id.' });
    }
    const post = await Blog.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const statusFrom = post.status;
    if (action === 'restore') {
      if (post.status !== 'archived') return res.status(409).json({ success: false, message: 'Only archived posts can be restored.' });
      post.status = 'draft';
      post.scheduledFor = null;
      post.publicationReview = null;
    } else if (action === 'feature' || action === 'unfeature') {
      post.featured = action === 'feature';
      const revision = await getActivePendingRevision(post._id);
      if (revision?.after) {
        revision.after.featured = post.featured;
        revision.editVersion = Number(revision.editVersion || 0) + 1;
        revision.editedAt = new Date();
        await revision.save();
      }
    }
    await post.save();
    recordBlogModerationAudit(req, {
      action: `admin.blog.${action}d`,
      postId: post._id,
      statusFrom,
      statusTo: post.status,
      details: { featured: post.featured }
    });
    if (req.accepts(['html', 'json']) === 'html') {
      return res.redirect(`/admin/blog/posts/${post._id}/review?type=success&msg=${encodeURIComponent(`Post ${action}d successfully.`)}`);
    }
    return res.json({ success: true, message: `Post ${action}d successfully.`, post });
  } catch (error) {
    logger.error(`changeBlogManagementState ${action} error:`, error);
    return res.status(500).json({ success: false, message: `Failed to ${action} post.` });
  }
}

exports.restoreBlogPost = (req, res) => changeBlogManagementState(req, res, 'restore');
exports.featureBlogPost = (req, res) => changeBlogManagementState(req, res, 'feature');
exports.unfeatureBlogPost = (req, res) => changeBlogManagementState(req, res, 'unfeature');

exports.submitBlogPostForReview = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post id.' });
    }
    const post = await Blog.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (post.status !== 'draft') return res.status(409).json({ success: false, message: 'Only draft posts can be submitted for review.' });
    const errors = [...validateBlogPayload(post.toObject(), { requireCover: true }), ...validateReadyForReview(post.toObject())];
    if (errors.length) {
      if (req.accepts(['html', 'json']) === 'html') {
        return res.redirect(`/admin/blog/posts/${post._id}/review?type=error&msg=${encodeURIComponent(errors[0])}`);
      }
      return res.status(400).json({ success: false, message: 'The draft is not ready for review.', errors });
    }
    post.status = 'pending';
    post.submittedAt = new Date();
    await post.save();
    recordBlogModerationAudit(req, {
      action: 'admin.blog.submitted_for_review', postId: post._id, statusFrom: 'draft', statusTo: 'pending'
    });
    if (req.accepts(['html', 'json']) === 'html') {
      return res.redirect(`/admin/blog/posts/${post._id}/review?type=success&msg=Draft%20submitted%20for%20review.`);
    }
    return res.json({ success: true, message: 'Draft submitted for review.', post });
  } catch (error) {
    logger.error('submitBlogPostForReview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit draft for review.' });
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

    const requestedContentVersion = Number(requestBody.contentVersion);
    if (Number.isFinite(requestedContentVersion) && requestedContentVersion !== Number(post.contentVersion || 0)) {
      return res.status(409).json({ success: false, message: 'This post changed in another session. Reload before continuing.' });
    }

    let pendingRevision = await getActivePendingRevision(post._id);
    if (!pendingRevision && ['published', 'scheduled'].includes(post.status)) {
      pendingRevision = await getOrCreateAdminRevision(post, req.session?.userId || null);
    }
    const requestedEditVersion = Number(requestBody.editVersion);
    if (pendingRevision && Number.isFinite(requestedEditVersion) && requestedEditVersion !== Number(pendingRevision.editVersion || 0)) {
      return res.status(409).json({ success: false, message: 'This revision changed in another session. Reload before continuing.' });
    }
    const reviewSource = pendingRevision ? { ...post.toObject(), ...pendingRevision.after } : post;
    const beforeSnapshot = pendingRevision
      ? createRevisionSnapshot(reviewSource)
      : getAdminAutosaveSnapshot(post);
    const nextPayload = normalizeAdminAutosavePayload(requestBody, reviewSource);
    nextPayload.status = String(reviewSource.status || post.status || 'draft');

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
    if (['pending', 'published', 'scheduled'].includes(nextPayload.status)) {
      validationErrors.push(...validateReadyForReview(nextPayload));
    }
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
      pendingRevision.editVersion = Number(pendingRevision.editVersion || 0) + 1;
      pendingRevision.moderationFlags = moderation.flags;
      pendingRevision.moderationFlagSummary = moderation.summary;
      pendingRevision.eligibilitySnapshot = evaluateBlogContentEligibility(nextSnapshot);
      pendingRevision.publicationReview = null;
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
      const nextEligibility = evaluateBlogContentEligibility(nextPayload);
      const contentChangedSinceReview = post.contentEligibility?.sourceHash !== nextEligibility.sourceHash;
      post.contentEligibility = nextEligibility;
      if (contentChangedSinceReview) {
        post.publicationReview = null;
        invalidateIndexingReview(post);
      }

      post.contentVersion = Number(post.contentVersion || 0) + 1;
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
    // A staged revision must not delete media still referenced by the live post.
    // Superseded revision assets are reclaimed by the normal storage cleanup job.
    if (!pendingRevision && keysToDelete.length) {
      await uploadService.deleteObjects(Array.from(new Set(keysToDelete)));
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
        changedFields,
        contentVersion: Number(post.contentVersion || 0),
        editVersion: pendingRevision ? Number(pendingRevision.editVersion || 0) : null
      }
    });
  } catch (error) {
    logger.error('autosaveBlogPostAdmin error:', error);
    if (!assetsPersisted && uploadedKeys.length) {
      await uploadService.deleteObjects(uploadedKeys);
    }
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Failed to auto-save blog post.'
    });
  }
};

exports.renderAdminQueuePage = async (req, res) => {
  try {
    const result = await listManagedPosts(req.query);

    return res.render('admin/blog-queue', {
      title: 'Blog Moderation - HelloRun Admin',
      ...result,
      selectedStatus: result.filters.status,
      searchQuery: result.filters.q,
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
    const historyPage = Math.max(1, Number.parseInt(req.query.historyPage, 10) || 1);
    const historyPageSize = 10;
    const [revisions, revisionTotal] = await Promise.all([BlogRevision.find({ postId: post._id })
      .populate('editedBy', 'firstName lastName email')
      .sort({ editedAt: -1 })
      .skip((historyPage - 1) * historyPageSize)
      .limit(historyPageSize)
      .lean(), BlogRevision.countDocuments({ postId: post._id })]);
    const publicationEligibility = evaluateBlogContentEligibility(reviewTarget.reviewData);
    const publicationOverrideFlags = getBlockingModerationFlags(reviewTarget.reviewData.moderationFlags || []);

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
      historyPagination: {
        page: historyPage,
        total: revisionTotal,
        totalPages: Math.max(1, Math.ceil(revisionTotal / historyPageSize))
      },
      reviewTarget,
      openReportCounts,
      publicationEligibility,
      publicationOverrideFlags
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
      actorId: req.session.userId || null,
      reviewInput: req.body
    });

    recordBlogModerationAudit(req, {
      action: result.post.publicationReview?.overrideReason
        ? 'admin.blog.approved_with_override'
        : 'admin.blog.approved',
      postId: post._id,
      statusFrom: 'pending',
      statusTo: result.post.status,
      details: {
        revisionApplied: result.revisionApplied,
        policyVersion: result.post.contentEligibility?.policyVersion,
        sourceHash: result.post.contentEligibility?.sourceHash,
        review: result.post.publicationReview
      }
    });

    return res.redirect(
      `/admin/blog/posts/${post._id}/review?type=success&msg=${encodeURIComponent(result.post.status === 'scheduled' ? 'Post approved and scheduled.' : (result.revisionApplied ? 'Revision approved and applied.' : 'Post approved and published.'))}`
    );
  } catch (error) {
    logger.error('approveBlogPostPage error:', error);
    const message = error.status ? error.message : 'Failed to approve post.';
    return res.redirect(`/admin/blog/posts/${req.params.id}/review?type=error&msg=${encodeURIComponent(message)}`);
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

    recordBlogModerationAudit(req, {
      action: 'admin.blog.rejected',
      postId: post._id,
      statusFrom: 'pending',
      statusTo: 'rejected',
      details: { revisionRejected: result.revisionRejected, rejectionReason }
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
    if (!['published', 'scheduled'].includes(post.status)) {
      return res.redirect(`/admin/blog/posts/${post._id}/review?type=error&msg=Only%20published%20or%20scheduled%20posts%20can%20be%20archived.`);
    }

    const previousStatus = post.status;
    post.status = 'archived';
    post.scheduledFor = null;
    post.reviewedAt = new Date();
    await post.save();
    recordBlogModerationAudit(req, {
      action: 'admin.blog.archived', postId: post._id, statusFrom: previousStatus, statusTo: 'archived'
    });

    return res.redirect(`/admin/blog/posts/${post._id}/review?type=success&msg=Post%20archived.`);
  } catch (error) {
    logger.error('archiveBlogPostPage error:', error);
    return res.redirect(`/admin/blog/posts/${req.params.id}/review?type=error&msg=Failed%20to%20archive%20post.`);
  }
};
