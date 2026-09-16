'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { POSTS, buildPostPayload } = require('../src/scripts/seed-adsense-blog-posts');
const { buildCreatePayload } = require('../src/scripts/create-adsense-blog');

const AUTHOR_ID = '507f1f77bcf86cd799439011';

test('every December article uses scheduledFor and keeps publishedAt empty before publication', () => {
  const decemberPosts = POSTS.filter((post) => (
    post.status === 'scheduled' && String(post.publishedAt || '').startsWith('2026-12-')
  ));

  assert.ok(decemberPosts.length > 0, 'Expected scheduled December articles in the canonical seed');
  for (const [index, post] of decemberPosts.entries()) {
    const scheduledFor = new Date(post.publishedAt);
    const seedPayload = buildPostPayload(post, { _id: AUTHOR_ID }, index);
    const creatorPayload = buildCreatePayload({
      slug: post.slug,
      authorId: AUTHOR_ID,
      now: new Date('2026-09-13T01:00:00.000Z'),
      publishAt: scheduledFor,
      confirmEditorialReview: true
    });

    assert.equal(seedPayload.scheduledFor.toISOString(), scheduledFor.toISOString(), post.slug);
    assert.equal(seedPayload.publishedAt, null, post.slug);
    assert.equal(creatorPayload.scheduledFor.toISOString(), scheduledFor.toISOString(), post.slug);
    assert.equal(creatorPayload.publishedAt, null, post.slug);
    assert.ok(creatorPayload.approvedAt, post.slug);
  }
});
