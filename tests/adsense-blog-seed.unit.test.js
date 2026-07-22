const test = require('node:test');
const assert = require('node:assert/strict');

const {
  POSTS,
  buildContentHtml,
  htmlToText
} = require('../src/scripts/seed-adsense-blog-posts');

test('AdSense blog seed contains only the 14 publication-eligible registered guides', () => {
  assert.equal(POSTS.length, 14);

  const slugs = new Set();
  for (const post of POSTS) {
    assert.ok(post.title);
    assert.ok(post.slug);
    assert.ok(!slugs.has(post.slug), `duplicate slug: ${post.slug}`);
    slugs.add(post.slug);
    assert.ok(post.excerpt.length >= 80, `${post.slug} should have a useful excerpt`);
    assert.ok(Array.isArray(post.tags) && post.tags.length >= 3, `${post.slug} should have at least 3 tags`);
    assert.ok(Array.isArray(post.links) && post.links.length >= 2, `${post.slug} should have internal links`);
    assert.ok(
      (Array.isArray(post.sections) && post.sections.length >= 6) || post.contentHtml,
      `${post.slug} should have guide sections or complete custom content`
    );

    const html = buildContentHtml(post);
    const text = htmlToText(html);
    assert.ok(text.split(/\s+/).filter(Boolean).length >= 500, `${post.slug} should meet the publication word floor`);
    if (post.contentHtml) {
      assert.match(html, /Official(?: and platform)? sources/);
    } else {
      assert.match(html, /Helpful links/);
    }
  }
});
