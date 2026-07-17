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
  assert.match(articleCss, /\.blog-post-layout\s*\{[\s\S]*grid-template-columns:\s*84px minmax\(0, 1fr\) minmax\(220px, 260px\)/);
  assert.match(articleCss, /\.blog-engagement-rail-inner\s*\{[\s\S]*position:\s*sticky/);
  assert.match(articleCss, /@media \(max-width: 1024px\)[\s\S]*\.blog-engagement-rail-inner\s*\{[\s\S]*position:\s*static/);
});

test('article preserves interaction hooks and adds live and busy feedback', () => {
  for (const id of ['blogLikeBtn', 'blogLikeCount', 'blogCommentForm', 'blogCommentsList', 'blogReportForm', 'copyBlogLinkBtn', 'blogGalleryModal', 'blogPostTocListDesktop']) {
    assert.match(article, new RegExp(`id="${id}"`));
  }
  assert.match(article, /aria-live="polite"/);
  assert.match(article, /setAttribute\('aria-busy', 'true'\)/);
  assert.match(article, /removeAttribute\('aria-busy'\)/);
  assert.match(article, /<h3>Continue reading<\/h3>/);
  assert.doesNotMatch(article, /const audienceMap|const actionPanelLinks|const nextStepMap/);
});
