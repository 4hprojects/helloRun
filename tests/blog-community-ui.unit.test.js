const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const listingPath = path.join(ROOT, 'src/views/pages/blog.ejs');
const articlePath = path.join(ROOT, 'src/views/pages/blog-post.ejs');
const listing = fs.readFileSync(listingPath, 'utf8');
const article = fs.readFileSync(articlePath, 'utf8');
const listingCss = fs.readFileSync(path.join(ROOT, 'src/public/css/blog.css'), 'utf8');
const articleCss = fs.readFileSync(path.join(ROOT, 'src/public/css/blog-pages.css'), 'utf8');
const commentsClient = fs.readFileSync(path.join(ROOT, 'src/public/js/blog-comments.js'), 'utf8');
const commentsComponent = fs.readFileSync(path.join(ROOT, 'packages/threaded-comments/web/threaded-comments.js'), 'utf8');
const commentsPackage = fs.readFileSync(path.join(ROOT, 'packages/threaded-comments/src/engine.js'), 'utf8');
const commentsService = fs.readFileSync(path.join(ROOT, 'src/services/blog-comment.service.js'), 'utf8');
const publicBlogController = fs.readFileSync(path.join(ROOT, 'src/controllers/page/blog-public.controller.js'), 'utf8');
const blogInteractionController = fs.readFileSync(path.join(ROOT, 'src/controllers/blog-interaction.controller.js'), 'utf8');
const pageRoutes = fs.readFileSync(path.join(ROOT, 'src/routes/pageRoutes.js'), 'utf8');
const adminReportsPath = path.join(ROOT, 'src/views/admin/blog-reports.ejs');
const adminReports = fs.readFileSync(adminReportsPath, 'utf8');

test('community listing and article templates compile', () => {
  assert.doesNotThrow(() => ejs.compile(listing, { filename: listingPath }));
  assert.doesNotThrow(() => ejs.compile(article, { filename: articlePath }));
});

test('blog listing leads with community discovery and contribution actions', () => {
  assert.match(listing, /class="blog-community-header"/);
  assert.match(listing, /Stories from the running community/);
  assert.match(listing, />\s*Write a post\s*</);
  assert.match(listing, />\s*My Blogs\s*</);
  assert.match(listing, /class="blog-topic-paths"/);
  assert.match(listing, /Community spotlight/);
  assert.match(listing, />Top writers</);
});

test('blog filters are labelled, balanced, explicit, and do not auto-submit', () => {
  assert.match(listing, /<details class="blog-filter-panel"/);
  assert.match(listing, /filters\?\.category \|\| filters\?\.author \? 'open' : ''/);
  assert.match(listing, /<label for="blogCategory">Topic<\/label>/);
  assert.match(listing, /<label for="blogAuthor">Writer<\/label>/);
  assert.match(listing, /<label for="blogSort">Sort by<\/label>/);
  assert.match(listing, />Apply filters<\/button>/);
  assert.match(listing, />Apply sort<\/button>/);
  assert.doesNotMatch(listing, /addEventListener\('change'.*submit/s);
  assert.match(listingCss, /\.blog-filter-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,/);
  assert.match(listingCss, /\.blog-field-group label\s*\{[\s\S]*min-height:\s*1\.5rem/);
  assert.match(listingCss, /\.blog-sort-control\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(140px, 1fr\) auto/);
  assert.match(listingCss, /\.blog-sort-control label\s*\{[\s\S]*white-space:\s*nowrap/);
});

test('community cards show author and engagement signals in a responsive grid', () => {
  for (const field of ['post.viewsLabel', 'post.likesLabel', 'post.commentsLabel', 'post.author.name']) {
    assert.match(listing, new RegExp(field.replace('.', '\\.')));
  }
  assert.match(listingCss, /\.blog-card-grid\s*\{[\s\S]*repeat\(3,/);
  assert.match(listingCss, /@media \(max-width: 1024px\)[\s\S]*\.blog-card-grid\s*\{[\s\S]*repeat\(2,/);
  assert.match(listingCss, /@media \(max-width: 760px\)[\s\S]*\.blog-card-grid[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(listingCss, /min-height:\s*44px/);
  assert.match(listingCss, /@media \(prefers-reduced-motion: reduce\)/);
});

test('article uses contributor metadata, centralized actions, and responsive engagement', () => {
  assert.match(article, /class="blog-post-byline"/);
  assert.match(article, /post\.authorId\?\.avatarUrl/);
  assert.match(article, /articlePresentation\?\.audience/);
  assert.match(article, /articlePresentation\?\.actions/);
  assert.match(article, /articlePresentation\?\.nextStep/);
  assert.match(article, /class="blog-engagement-rail"/);
  assert.match(articleCss, /\.blog-post-layout\s*\{[\s\S]*grid-template-columns:\s*88px minmax\(0, 1fr\) minmax\(220px, 260px\)/);
  assert.match(articleCss, /\.blog-engagement-rail-inner\s*\{[\s\S]*position:\s*sticky/);
  assert.match(articleCss, /@media \(max-width: 1024px\)[\s\S]*\.blog-engagement-rail-inner\s*\{[\s\S]*position:\s*static/);
});

test('desktop article rail uses one contained share trigger and an accessible labelled menu', () => {
  assert.match(article, /id="shareMobileToggle"[\s\S]*aria-haspopup="menu"[\s\S]*aria-controls="blogShareOptions"/);
  assert.match(article, /id="blogShareOptions" role="menu"/);
  const shareMenuMarkup = article.match(/<div class="share-options" id="blogShareOptions"[\s\S]*?<\/div>/)?.[0] || '';
  assert.equal((shareMenuMarkup.match(/role="menuitem"/g) || []).length, 6);
  for (const label of ['Copy link', 'Facebook', 'LinkedIn', 'WhatsApp', 'Email']) assert.match(article, new RegExp(`>${label}<`));
  assert.match(articleCss, /\.blog-engagement-rail \.share-mobile-toggle\s*\{[\s\S]*display:\s*flex/);
  assert.match(articleCss, /\.blog-engagement-rail \.share-options\s*\{[\s\S]*left:\s*calc\(100% \+ 0\.65rem\)[\s\S]*width:\s*196px/);
  assert.match(articleCss, /\.blog-engagement-rail \.share-options \.btn-icon\s*\{[\s\S]*width:\s*100%/);
  assert.match(articleCss, /\.blog-engagement-rail\s*\{[\s\S]*position:\s*relative[\s\S]*z-index:\s*20[\s\S]*overflow:\s*visible/);
  assert.match(articleCss, /\.blog-engagement-rail:has\(\.blog-share-row\.is-open\)\s*\{\s*z-index:\s*1000/);
  assert.match(articleCss, /\.blog-engagement-rail \.share-options\s*\{[\s\S]*z-index:\s*1001/);
  assert.match(article, /closeShareMenu\(true\)/);
});

test('article preserves interaction hooks and adds live and busy feedback', () => {
  for (const id of ['blogLikeBtn', 'blogLikeCount', 'blogComments', 'blogReportForm', 'copyBlogLinkBtn', 'blogGalleryModal', 'blogPostTocListDesktop']) {
    assert.match(article, new RegExp(`id="${id}"`));
  }
  assert.match(article, /<threaded-comments><\/threaded-comments>/);
  assert.match(commentsClient, /threaded-comments-component\.js/);
  assert.match(article, /aria-live="polite"/);
  assert.match(article, /setAttribute\('aria-busy', 'true'\)/);
  assert.match(article, /removeAttribute\('aria-busy'\)/);
  assert.match(article, /<h3>Continue reading<\/h3>/);
  assert.doesNotMatch(article, /const audienceMap|const actionPanelLinks|const nextStepMap/);
});

test('comment submission requires an accessible review confirmation', () => {
  assert.match(article, /src="\/js\/blog-comments\.js" defer/);
  assert.match(commentsComponent, /Review changes/);
  assert.match(commentsComponent, /Post this comment\?/);
  assert.match(commentsComponent, /showModal\(\)/);
  assert.match(commentsComponent, /confirm\.disabled=true/);
  assert.match(commentsComponent, /dialog::backdrop/);
  assert.match(commentsComponent, /@media\(max-width:430px\)/);
});

test('deleting a comment requires a separate permanent-action confirmation', () => {
  assert.match(commentsComponent, /data-delete=/);
  assert.match(commentsComponent, /Delete this comment\?/);
  assert.match(commentsComponent, /This cannot be undone/);
  assert.match(commentsComponent, /method:'DELETE'/);
  assert.match(publicBlogController, /if \(currentUserId\)[\s\S]*Cache-Control[\s\S]*private, no-store, max-age=0, must-revalidate/);
});

test('comment reports are owner-safe, reason-based, and visually subdued', () => {
  assert.match(commentsComponent, /mine\?`<button class="action" data-delete/);
  assert.match(commentsComponent, /data-report=/);
  const commentReasonLabels = {
    spam: 'Spam or repeated messages',
    plagiarism: 'Copied or impersonated comment',
    promotion: 'Advertising or unwanted promotion',
    unsafe_medical: 'Dangerous health or medical advice',
    abuse: 'Harassment, hate, or abusive language',
    other: 'Another concern about this comment'
  };
  for (const [reason, label] of Object.entries(commentReasonLabels)) {
    assert.match(commentsClient, new RegExp(`${reason}: '${label}'`));
  }
  assert.match(commentsComponent, /What is wrong with this comment\?/);
  assert.match(commentsComponent, /maxReportNoteLength\|\|500/);
  assert.match(commentsComponent, /data-reason required/);
  assert.match(commentsComponent, /min-height:44px/);
  assert.match(blogInteractionController, /String\(comment\.authorId\) === String\(userId\)[\s\S]*You cannot report your own comment/);
});

test('comments use a dedicated one-level threaded presentation', () => {
  assert.match(article, /data-blog-comments/);
  assert.match(article, /<threaded-comments>/);
  assert.match(commentsService, /parentCommentId = target\.parentCommentId \|\| target\._id/);
  assert.match(commentsService, /replyPreviewSize:\s*3/);
  assert.match(commentsComponent, /data-reply=/);
  assert.match(commentsComponent, /data-more=/);
  assert.match(commentsComponent, /Replying to/);
  assert.match(commentsComponent, /role="group" aria-label="Comment thread by/);
  assert.match(commentsComponent, /this\.collapsed=new Set\(\)/);
  assert.match(commentsComponent, /data-toggle=/);
  assert.match(commentsComponent, /aria-expanded=/);
  assert.match(commentsComponent, /aria-controls="replies-/);
  assert.match(commentsComponent, /\.replies:before/);
  assert.match(commentsComponent, /\.reply:before/);
  assert.match(commentsComponent, /@media\(max-width:430px\)/);
});

test('comment editing exposes a bounded inline workflow and public revision history', () => {
  assert.match(commentsComponent, /data-edit=/);
  assert.match(commentsComponent, /className='editor'/);
  assert.match(commentsComponent, /expectedVersion/);
  assert.match(commentsComponent, /method:edit\?'PATCH':'POST'/);
  assert.match(commentsComponent, /data-history=/);
  assert.match(commentsComponent, /Comment edit history/);
  assert.match(commentsPackage, /editWindowMs/);
  assert.match(commentsPackage, /maxEdits/);
  assert.match(pageRoutes, /router\.patch\('\/blog\/:slug\/comments\/:commentId'[\s\S]*commentEditLimiter[\s\S]*editComment/);
  assert.match(pageRoutes, /router\.get\('\/blog\/:slug\/comments\/:commentId\/history'/);
  assert.match(pageRoutes, /history\/:revisionId\/redact'[\s\S]*commentRevisionRedactionLimiter/);
  assert.match(pageRoutes, /maxRequests:\s*15[\s\S]*blog-comment-edit/);
  assert.match(pageRoutes, /maxRequests:\s*10[\s\S]*blog-comment-redaction/);
});

test('comment reports retain and distinguish immutable reported wording', () => {
  assert.doesNotThrow(() => ejs.compile(adminReports, { filename: adminReportsPath }));
  assert.match(blogInteractionController, /commentContentSnapshot:\s*String\(comment\.content/);
  assert.match(blogInteractionController, /commentRevisionAtSnapshot:\s*comment\.lastEditedAt \|\| comment\.createdAt/);
  assert.match(adminReports, /Reported version:/);
  assert.match(adminReports, /Current version:/);
  assert.match(adminReports, /changed after the reported version was captured/);
});

test('comment-specific report copy does not replace the article report control', () => {
  assert.match(article, /<summary>Report post<\/summary>/);
  assert.match(article, /<option value="">Select reason<\/option>[\s\S]*interactionState\?\.reportReasons/);
  assert.match(article, /placeholder="Optional note"/);
});

test('author dashboard replaces enhanced post deletion with a reusable confirmation dialog', () => {
  const dashboard = fs.readFileSync(path.join(ROOT, 'src/views/blog/author-dashboard.ejs'), 'utf8');
  assert.doesNotThrow(() => ejs.compile(dashboard, { filename: path.join(ROOT, 'src/views/blog/author-dashboard.ejs') }));
  assert.match(dashboard, /data-delete-post-form/);
  assert.match(dashboard, /onsubmit="return confirm\('Delete this post permanently\?'\);"/);
  assert.match(dashboard, /id="blogDeleteDialog"[\s\S]*aria-labelledby="blogDeleteDialogTitle"/);
  assert.match(dashboard, /form\.removeAttribute\('onsubmit'\)/);
  assert.match(dashboard, /dialog\.showModal\(\)/);
  assert.match(dashboard, /activeForm\.submit\(\)/);
  assert.match(dashboard, /aria-busy/);
});
