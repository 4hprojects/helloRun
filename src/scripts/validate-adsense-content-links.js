'use strict';

const { ARTICLE_REGISTRY } = require('../content/adsense-blog-article-registry');
const { CANONICAL_BLOG_REDIRECTS } = require('../utils/blog-canonical');

const STATIC_ROUTES = new Set([
  '/about', '/acceptable-use-policy', '/community-guidelines', '/contact', '/data-usage-policy',
  '/events', '/faq', '/how-it-works', '/leaderboard', '/organiser-terms',
  '/organizer/complete-profile', '/organizer/create-event', '/privacy',
  '/refund-and-cancellation-policy', '/signup'
]);

function extractInternalLinks(html) {
  return [...String(html || '').matchAll(/<a\b[^>]*\bhref=["'](\/[^"']*)["']/gi)]
    .map((match) => match[1].split(/[?#]/)[0]);
}

function validateAdsenseContentLinks(registry = ARTICLE_REGISTRY) {
  const articleSlugs = new Set(Object.keys(registry));
  const failures = [];
  let linkCount = 0;
  for (const [sourceSlug, articleModule] of Object.entries(registry)) {
    const payload = articleModule.buildArticlePayload({ coverImageUrl: '/images/helloRun-icon.webp' });
    for (const href of extractInternalLinks(payload.contentHtml)) {
      linkCount += 1;
      if (STATIC_ROUTES.has(href)) continue;
      if (href.startsWith('/blog/')) {
        const slug = decodeURIComponent(href.slice('/blog/'.length));
        if (articleSlugs.has(slug) || CANONICAL_BLOG_REDIRECTS[slug]) continue;
      }
      failures.push({ sourceSlug, href });
    }
  }
  return { articleCount: articleSlugs.size, linkCount, failures };
}

function main() {
  const result = validateAdsenseContentLinks();
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { STATIC_ROUTES, extractInternalLinks, validateAdsenseContentLinks };
