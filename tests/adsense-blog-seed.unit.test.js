const test = require('node:test');
const assert = require('node:assert/strict');

const {
  POSTS,
  buildContentHtml,
  htmlToText
} = require('../src/scripts/seed-adsense-blog-posts');

test('AdSense blog seed includes at least 15 substantial published guide topics', () => {
  assert.ok(POSTS.length >= 15);

  const slugs = new Set();
  for (const post of POSTS) {
    assert.ok(post.title);
    assert.ok(post.slug);
    assert.ok(!slugs.has(post.slug), `duplicate slug: ${post.slug}`);
    slugs.add(post.slug);
    assert.ok(post.excerpt.length >= 80, `${post.slug} should have a useful excerpt`);
    assert.ok(Array.isArray(post.tags) && post.tags.length >= 3, `${post.slug} should have at least 3 tags`);
    assert.ok(Array.isArray(post.links) && post.links.length >= 2, `${post.slug} should have internal links`);
    assert.ok(Array.isArray(post.sections) && post.sections.length >= 6, `${post.slug} should have guide sections`);

    const html = buildContentHtml(post);
    const text = htmlToText(html);
    assert.ok(text.split(/\s+/).filter(Boolean).length >= 250, `${post.slug} should have substantial seeded content`);
    assert.match(html, /Helpful links/);
  }
});
