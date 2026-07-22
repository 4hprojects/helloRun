'use strict';

// Shared imports, module state, and helpers for the blog/* sub-controllers (CQ-2 split).

// Guides/resources and feed endpoints
const { getGuidesAndResources } = require('../../services/blog-guides.service');

let FeedCtorPromise = null;

function loadFeedCtor() {
  if (!FeedCtorPromise) {
    FeedCtorPromise = import('feed').then((mod) => mod.Feed);
  }
  return FeedCtorPromise;
}

// Top writers leaderboard endpoint
const { getTopWriters } = require('../../services/blog-top-writers.service');

const mongoose = require('mongoose');

const logger = require('../../utils/logger');

const Blog = require('../../models/Blog');

const BlogRevision = require('../../models/BlogRevision');

const User = require('../../models/User');

const uploadService = require('../../services/upload.service');

const { BLOG_CATEGORIES, BLOG_STATUSES, slugifyBlogTitle, normalizeTags } = require('../../utils/blog');

const { sanitizeHtml, htmlToPlainText } = require('../../utils/sanitize');
const { getCanonicalBlogSlug, getEligiblePublicBlogQuery, getPublicBlogQuery } = require('../../utils/blog-canonical');

const BlogReport = require('../../models/BlogReport');

const { analyzePostSpamSignals, detectSimilarityFlags } = require('../../utils/blog-safety');
const {
  BLOG_CONTENT_POLICY_VERSION,
  HEALTH_REVIEW_CONFIRMATIONS,
  evaluateBlogContentEligibility,
  inspectBlogLinks,
  sanitizeUserBlogHtml
} = require('../../utils/blog-content-eligibility');

const {
  normalizeTemplateKey,
  normalizeContentBlocks,
  validateContentBlocks,
  renderContentBlocksToHtml,
  getStructuredContentText,
  isStructuredPost,
  isValidBlogImageUrl
} = require('../../utils/blog-composer');

const {
  getComposerTemplateOptions,
  getComposerBlockTypeOptions,
  getComposerTemplateBlocksByKey
} = require('../../services/blog-composer-options.service');

const EDITABLE_STATUSES = new Set(['draft', 'pending', 'rejected']);

const ADMIN_REVIEW_STATUSES = new Set(['pending', 'published', 'rejected', 'archived', 'draft']);

const MIN_REJECTION_REASON_LENGTH = 15;

const MAX_REJECTION_REASON_LENGTH = 500;

const REVISION_MAX_FIELD_LENGTH = 12000;

const MAX_BLOG_GALLERY_IMAGES = 3;

const MAX_BLOG_TITLE_LENGTH = 120;

const MAX_BLOG_EXCERPT_LENGTH = 220;

const MAX_BLOG_CONTENT_HTML_LENGTH = 50000;

const MAX_BLOG_TAGS = 8;

const MAX_BLOG_TAG_LENGTH = 30;

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

// Gallery images are optional for blog creation (MVP). Only cover image is required for submission.
// This matches the HelloRun Blog Feature spec: see docs/hellorun_blog_feature_phased_implementation_spec.md
function normalizeBlogPayload(body = {}) {
  const contentBlocks = normalizeContentBlocks(body.contentBlocksJson || body.contentBlocks);
  const hasStructuredBlocks = contentBlocks.length > 0;
  const unsanitizedContentHtml = hasStructuredBlocks
    ? renderContentBlocksToHtml(contentBlocks)
    : String(body.contentHtml || '');
  const linkInspection = inspectBlogLinks(unsanitizedContentHtml);
  const contentHtml = sanitizeUserBlogHtml(unsanitizedContentHtml);
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
    ogImageUrl: String(body.ogImageUrl || '').trim().slice(0, 2000),
    linkValidationErrors: linkInspection.issues
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
  const unsanitizedContentHtml = hasStructuredBlocks ? renderContentBlocksToHtml(contentBlocks) : rawContentHtml;
  const linkInspection = inspectBlogLinks(unsanitizedContentHtml);
  const contentHtml = sanitizeUserBlogHtml(unsanitizedContentHtml);
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
    moderationNotes: hasOwn('moderationNotes') ? String(body.moderationNotes || '').trim().slice(0, 1000) : String(post.moderationNotes || '').trim(),
    linkValidationErrors: linkInspection.issues
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
  revision.eligibilitySnapshot = evaluateBlogContentEligibility(nextSnapshot);
  revision.publicationReview = null;
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

function isAffirmative(value) {
  return value === true || ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function getBlockingModerationFlags(flags = []) {
  return Array.from(new Set((Array.isArray(flags) ? flags : []).filter((flag) => (
    String(flag).startsWith('possible_plagiarism_')
    || String(flag).startsWith('post_')
  ))));
}

function buildPublicationReview({ reviewData, moderationFlags = [], reviewInput = {}, actorId = null, reviewedAt = new Date() }) {
  const eligibility = evaluateBlogContentEligibility(reviewData, { evaluatedAt: reviewedAt });
  const errors = [];
  if (!eligibility.eligible) {
    errors.push(`Content is not publication eligible: ${eligibility.blockingReasons.join(', ')}.`);
  }
  if (!isAffirmative(reviewInput.originalityConfirmed)) {
    errors.push('Confirm originality and publishing rights before approval.');
  }
  if (eligibility.externalLinkCount > 0 && !isAffirmative(reviewInput.externalLinksConfirmed)) {
    errors.push('Confirm that every external link is relevant and safe before approval.');
  }

  const healthChecks = HEALTH_REVIEW_CONFIRMATIONS;
  if (eligibility.healthReviewRequired && healthChecks.some((key) => !isAffirmative(reviewInput[key]))) {
    errors.push('Complete every health-content safety confirmation before approval.');
  }

  const overrideFlags = getBlockingModerationFlags(moderationFlags);
  const overrideReason = String(reviewInput.overrideReason || '').trim();
  if (overrideFlags.length && (overrideReason.length < 20 || overrideReason.length > 500)) {
    errors.push('A 20–500 character moderation override reason is required for unresolved spam, promotional, repetitive, or similarity flags.');
  }
  if (errors.length) {
    const error = new Error(errors.join(' '));
    error.name = 'BlogPublicationReviewError';
    error.status = 400;
    error.validationErrors = errors;
    throw error;
  }

  return {
    eligibility,
    review: {
      policyVersion: BLOG_CONTENT_POLICY_VERSION,
      sourceHash: eligibility.sourceHash,
      originalityConfirmed: true,
      externalLinksConfirmed: eligibility.externalLinkCount > 0,
      healthSafetyConfirmed: eligibility.healthReviewRequired,
      healthChecks: eligibility.healthReviewRequired
        ? Object.fromEntries(healthChecks.map((key) => [key, true]))
        : {},
      overrideFlags,
      overrideReason: overrideFlags.length ? overrideReason : '',
      reviewSource: 'admin_moderation',
      reviewedBy: actorId || null,
      reviewedAt: new Date(reviewedAt)
    }
  };
}

async function approveReviewTarget({ post, actorId, reviewInput = {} }) {
  const revision = await getActivePendingRevision(post._id);
  const now = new Date();

  if (revision) {
    const snapshot = revision.after || {};
    const publication = buildPublicationReview({
      reviewData: { ...post.toObject(), ...snapshot },
      moderationFlags: revision.moderationFlags || [],
      reviewInput,
      actorId,
      reviewedAt: now
    });
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
    post.contentEligibility = publication.eligibility;
    post.publicationReview = publication.review;
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
    revision.eligibilitySnapshot = publication.eligibility;
    revision.publicationReview = publication.review;
    await revision.save();
    return { revisionApplied: true, revision, post };
  }

  if (post.status !== 'pending') {
    throw new Error(`Cannot approve a post from "${post.status}" status.`);
  }
  const publication = buildPublicationReview({
    reviewData: post.toObject ? post.toObject() : post,
    moderationFlags: post.moderationFlags || [],
    reviewInput,
    actorId,
    reviewedAt: now
  });
  post.contentEligibility = publication.eligibility;
  post.publicationReview = publication.review;
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

// Gallery images are optional for blog creation (MVP). Only cover image is required for submission.
// This matches the HelloRun Blog Feature spec: see docs/hellorun_blog_feature_phased_implementation_spec.md
function validateBlogPayload(payload, options = {}) {
  const errors = [];
  const allowedCategories = new Set(BLOG_CATEGORIES);
  const requireCover = options.requireCover === true;

  if (!payload.title || payload.title.length < 10 || payload.title.length > MAX_BLOG_TITLE_LENGTH) {
    errors.push(`Title must be between 10 and ${MAX_BLOG_TITLE_LENGTH} characters.`);
  }
  if (payload.excerpt.length > MAX_BLOG_EXCERPT_LENGTH) {
    errors.push(`Excerpt must be ${MAX_BLOG_EXCERPT_LENGTH} characters or less.`);
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
  } else if (payload.coverImageUrl && !isValidBlogImageUrl(payload.coverImageUrl)) {
    errors.push('Cover image URL must be a valid http/https URL or site-relative path.');
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
    if (!isValidBlogImageUrl(galleryUrl)) {
      errors.push('Gallery image URLs must be valid http/https URLs or site-relative paths.');
      break;
    }
  }
  if (requireCover && !payload.coverImageUrl) {
    errors.push('Cover image is required before submitting for review.');
  }
  if (Array.isArray(payload.contentBlocks) && payload.contentBlocks.length > 0) {
    errors.push(...validateContentBlocks(payload.contentBlocks));
  }
  if (payload.contentHtml.length > MAX_BLOG_CONTENT_HTML_LENGTH) {
    errors.push(`Content exceeds maximum allowed length of ${MAX_BLOG_CONTENT_HTML_LENGTH} characters.`);
  }
  if (!payload.contentText || payload.contentText.length < 50) {
    errors.push('Content body is too short. Add more details before saving.');
  }
  if (payload.tags.length > MAX_BLOG_TAGS) {
    errors.push(`Maximum ${MAX_BLOG_TAGS} tags are allowed.`);
  }
  if (payload.tags.some((tag) => tag.length > MAX_BLOG_TAG_LENGTH)) {
    errors.push(`Each tag must be ${MAX_BLOG_TAG_LENGTH} characters or less.`);
  }
  if (payload.seoTitle && payload.seoTitle.length > 160) {
    errors.push('SEO title must be 160 characters or less.');
  }
  if (payload.seoDescription && payload.seoDescription.length > 320) {
    errors.push('SEO description must be 320 characters or less.');
  }
  if (payload.ogImageUrl && !isValidBlogImageUrl(payload.ogImageUrl)) {
    errors.push('OG image URL must be a valid http/https URL or site-relative path.');
  }
  for (const issue of payload.linkValidationErrors || inspectBlogLinks(payload.contentHtml).issues) {
    errors.push(`Unsafe link rejected (${issue.code}): ${String(issue.href || '').slice(0, 180)}`);
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
  const errors = validateBlogPayload(payload, { requireCover: true });
  const eligibility = evaluateBlogContentEligibility(payload);
  if (!eligibility.eligible) {
    const labels = {
      minimum_500_words: 'Content must contain at least 500 substantive words.',
      minimum_3_semantic_units: 'Content must contain at least three meaningful paragraphs, lists, sections, or blockquotes.',
      insufficient_substantive_vocabulary: 'Content contains too much repeated filler to qualify as substantive.',
      repetitive_filler: 'Content contains too much repeated filler to qualify as substantive.'
    };
    for (const reason of eligibility.blockingReasons) {
      errors.push(labels[reason] || `Content is not publication eligible: ${reason}.`);
    }
  }
  return Array.from(new Set(errors));
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

module.exports = {
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
  getCanonicalBlogSlug,
  getEligiblePublicBlogQuery,
  getPublicBlogQuery,
  BlogReport,
  analyzePostSpamSignals,
  detectSimilarityFlags,
  evaluateBlogContentEligibility,
  inspectBlogLinks,
  sanitizeUserBlogHtml,
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
  buildPublicationReview,
  getBlockingModerationFlags,
  rejectReviewTarget,
  validateBlogPayload,
  validateReadyForReview,
  estimateReadingTime,
  isValidHttpUrl,
  generateUniqueBlogSlug,
  getAuthorFromSession,
  getBlogPageMessage
};
