'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = '';

const { buildEditorialCalendarReport, canonicalPosts } = require('../src/scripts/audit-editorial-calendar');
const { BLOG_CONTENT_POLICY_VERSION, buildBlogContentSourceHash } = require('../src/utils/blog-content-eligibility');

function record(slug, overrides = {}) {
  const value = {
    slug,
    status: 'scheduled',
    scheduledFor: new Date('2026-11-01T00:00:00Z'),
    contentRisk: 'general',
    title: 'Title', excerpt: 'Excerpt', category: 'Training', customCategory: '', contentHtml: '<p>Content</p>',
    coverImageUrl: '/cover.webp', coverImageAlt: 'Alt', seoTitle: 'SEO', seoDescription: 'Description', ogImageUrl: '/cover.webp',
    scheduledPublishLastError: '',
    ...overrides
  };
  const sourceHash = buildBlogContentSourceHash(value);
  if (!value.contentEligibility) value.contentEligibility = { eligible: true, policyVersion: BLOG_CONTENT_POLICY_VERSION, sourceHash, externalLinkCount: 0, healthReviewRequired: false };
  if (!value.publicationReview) value.publicationReview = { policyVersion: BLOG_CONTENT_POLICY_VERSION, sourceHash, originalityConfirmed: true, externalLinksConfirmed: true };
  return value;
}

test('canonical October through December calendar contains 47 unique posts', () => {
  const posts = canonicalPosts();
  assert.equal(posts.length, 47);
  assert.equal(new Set(posts.map((post) => post.slug)).size, 47);
});

test('calendar report separates due, future, missing, and unhealthy records', () => {
  const planned = [
    { slug: 'due-ok', scheduledFor: new Date('2026-10-20T00:00:00Z') },
    { slug: 'due-late', scheduledFor: new Date('2026-10-21T00:00:00Z') },
    { slug: 'future-ok', scheduledFor: new Date('2026-11-01T00:00:00Z') },
    { slug: 'missing', scheduledFor: new Date('2026-12-01T00:00:00Z') }
  ];
  const records = [
    record('due-ok', { status: 'published', publishedAt: new Date('2026-10-20T00:01:00Z') }),
    record('due-late', { scheduledFor: new Date('2026-10-21T00:00:00Z'), scheduledPublishLastError: 'worker failed' }),
    record('future-ok', { contentRisk: 'health_safety', contentEligibility: { eligible: false, sourceHash: 'old' } })
  ];
  const report = buildEditorialCalendarReport(planned, records, new Date('2026-10-27T00:00:00Z'));

  assert.equal(report.publishedDue, 1);
  assert.deepEqual(report.overdue, ['due-late']);
  assert.equal(report.scheduledFuture, 1);
  assert.deepEqual(report.missing, ['missing']);
  assert.deepEqual(report.schedulerErrors, ['due-late']);
  assert.deepEqual(report.ineligible, ['future-ok']);
  assert.equal(report.healthReviewFailures, 1);
});
