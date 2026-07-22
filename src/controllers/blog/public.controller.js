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
  getCanonicalBlogSlug,
  getEligiblePublicBlogQuery,
  getPublicBlogQuery,
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
const { formatBlogAuthorName } = require('../../utils/blog-author');

// --- PUBLIC BLOG PAGES (Phase A/E) ---
// Render public blog index with growth features
exports.renderPublicBlogIndex = async (req, res) => {
  try {
    // Fetch trending posts
    const trendingRes = await exports.getTrendingBlogs({ query: { limit: 5 } }, { json: (d) => d });
    const trending = trendingRes && trendingRes.success ? (trendingRes.posts || []) : [];

    // Fetch top writers
    const topWritersRes = await exports.getTopWritersLeaderboard({ query: { limit: 5 } }, { json: (d) => d });
    const topWriters = topWritersRes && topWritersRes.success ? (topWritersRes.writers || []) : [];

    // Fetch guides/resources
    const guidesRes = await exports.getGuidesAndResources({ query: { limit: 8 } }, { json: (d) => d });
    // guidesRes may have guides and resources arrays, flatten for display
    let guides = [];
    if (guidesRes && guidesRes.success) {
      if (Array.isArray(guidesRes.guides)) guides = guides.concat(guidesRes.guides.map(g => ({ ...g, type: 'Guide' })));
      if (Array.isArray(guidesRes.resources)) guides = guides.concat(guidesRes.resources.map(g => ({ ...g, type: 'Resource' })));
    }

    // Render EJS template
    return res.render('public/blog/index', {
      trending,
      topWriters,
      guides
    });
  } catch (error) {
    logger.error('renderPublicBlogIndex error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the blog.'
    });
  }
};

// Render public blog post page
exports.renderPublicBlogPost = async (req, res) => {
  try {
    const slug = req.params.slug;
    if (!slug) return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Post not found.' });
    const canonicalSlug = getCanonicalBlogSlug(slug);
    if (canonicalSlug) return res.redirect(301, `/blog/${canonicalSlug}`);
    // Only published, not deleted, publishedAt <= now
    const post = await Blog.findOne({
      slug,
      status: 'published',
      isDeleted: { $ne: true },
      publishedAt: { $lte: new Date() }
    })
      .populate('authorId', 'displayName firstName lastName verifiedAuthor trustScore')
      .lean();
    if (!post) return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Post not found.' });

    // Author info
    post.authorName = formatBlogAuthorName(post.authorId || {}, 'Unknown');
    post.verifiedAuthor = post.authorId && post.authorId.verifiedAuthor;
    post.trustScore = post.authorId && post.authorId.trustScore;

    // Comments (Phase B+)
    const comments = [];

    // Render EJS template
    return res.render('public/blog/post', {
      post,
      comments
    });
  } catch (error) {
    logger.error('renderPublicBlogPost error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the blog post.'
    });
  }
};

exports.getGuidesAndResources = async (req, res) => {
  try {
    const limitPerGroup = Math.max(1, Math.min(Number(req.query.limit) || 12, 50));
    const data = await getGuidesAndResources({ limitPerGroup });
    return res.json({ success: true, ...data });
  } catch (error) {
    logger.error('getGuidesAndResources error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load guides/resources.' });
  }
};

// RSS/Atom feed for latest published posts
exports.getBlogFeed = async (req, res) => {
  try {
    const Feed = await loadFeedCtor();
    const posts = await Blog.find(getEligiblePublicBlogQuery({
      status: 'published',
      isDeleted: { $ne: true },
      publishedAt: { $lte: new Date() }
    }))
      .sort({ publishedAt: -1 })
      .limit(30)
      .select('title slug excerpt contentHtml publishedAt authorId')
      .populate('authorId', 'displayName firstName lastName');

    const siteUrl = req.protocol + '://' + req.get('host');
    const feed = new Feed({
      title: 'HelloRun Blog Feed',
      description: 'Latest published posts from HelloRun',
      id: siteUrl + '/blog',
      link: siteUrl + '/blog',
      language: 'en',
      favicon: siteUrl + '/favicon.ico',
      updated: posts[0]?.publishedAt || new Date(),
      generator: 'HelloRun Blog',
      feedLinks: {
        rss: siteUrl + '/feed.xml',
        atom: siteUrl + '/feed.atom'
      }
    });
    posts.forEach(post => {
      feed.addItem({
        title: post.title,
        id: siteUrl + '/blog/' + post.slug,
        link: siteUrl + '/blog/' + post.slug,
        description: post.excerpt,
        content: post.contentHtml,
        author: post.authorId ? [{ name: formatBlogAuthorName(post.authorId) }] : [],
        date: post.publishedAt
      });
    });
    res.set('Content-Type', 'application/xml');
    return res.send(feed.rss2());
  } catch (error) {
    logger.error('getBlogFeed error:', error);
    return res.status(500).send('Failed to generate feed.');
  }
};

exports.getTopWritersLeaderboard = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 10, 50));
    const writers = await getTopWriters({ limit });
    return res.json({ success: true, writers });
  } catch (error) {
    logger.error('getTopWritersLeaderboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load top writers.' });
  }
};

// Trending posts endpoint
exports.getTrendingBlogs = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 10, 50));
    const posts = await Blog.find(getEligiblePublicBlogQuery({
      status: 'published',
      isDeleted: { $ne: true },
      publishedAt: { $lte: new Date() }
    }))
      .sort({ trendingScore: -1, publishedAt: -1 })
      .limit(limit)
      .populate('authorId', 'displayName firstName lastName verifiedAuthor trustScore')
      .select('title slug excerpt category coverImageUrl publishedAt trendingScore views likesCount commentsCount authorId');

    return res.json({
      success: true,
      posts
    });
  } catch (error) {
    logger.error('getTrendingBlogs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load trending posts.' });
  }
};
