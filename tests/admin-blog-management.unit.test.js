'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Blog = require('../src/models/Blog');
const BlogRevision = require('../src/models/BlogRevision');
const { normalizeStatusFilter, resolvePublicationSchedule } = require('../src/controllers/blog/_shared');
const { normalizeFilters } = require('../src/services/admin-blog-management.service');
const { migrateScheduledFor } = require('../src/scripts/migrate-blog-scheduled-for');
const { POSTS, buildPostPayload, preservePublishedSeedState } = require('../src/scripts/seed-adsense-blog-posts');
const { buildCreatePayload } = require('../src/scripts/create-adsense-blog');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('blog scheduling has a dedicated date and operational failure fields', () => {
  assert.ok(Blog.schema.path('scheduledFor'));
  assert.ok(Blog.schema.path('contentVersion'));
  assert.ok(Blog.schema.path('workflowVersion'));
  assert.ok(Blog.schema.path('scheduledPublishFailures'));
  assert.ok(BlogRevision.schema.path('baseContentVersion'));
  assert.ok(BlogRevision.schema.path('editVersion'));
  assert.ok(BlogRevision.schema.path('source').enumValues.includes('admin_revision'));
});

test('publication scheduling accepts now or a future ISO instant', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');
  assert.deepEqual(resolvePublicationSchedule({ publicationMode: 'now' }, now), {
    publicationMode: 'now', scheduledFor: null
  });
  const scheduled = resolvePublicationSchedule({
    publicationMode: 'scheduled', scheduledFor: '2026-08-31T08:00:00.000Z'
  }, now);
  assert.equal(scheduled.publicationMode, 'scheduled');
  assert.equal(scheduled.scheduledFor.toISOString(), '2026-08-31T08:00:00.000Z');
  assert.throws(() => resolvePublicationSchedule({ publicationMode: 'scheduled', scheduledFor: '2026-08-29T00:00:00.000Z' }, now), /future/);
});

test('queue filters cover scheduled posts, revisions, and bounded pagination input', () => {
  const filters = normalizeFilters({ status: 'scheduled', reviewType: 'revision', page: '-4', flagged: '1', reported: '1' });
  assert.equal(filters.status, 'scheduled');
  assert.equal(filters.reviewType, 'revision');
  assert.equal(filters.page, 1);
  assert.equal(filters.flagged, true);
  assert.equal(filters.reported, true);
});

test('author status normalization and dashboard support scheduled posts without author scheduling controls', () => {
  const dashboard = read('src/views/blog/author-dashboard.ejs');
  const authorForm = read('src/views/blog/author-form.ejs');
  const authorController = read('src/controllers/blog/author.controller.js');

  assert.equal(normalizeStatusFilter('scheduled'), 'scheduled');
  assert.match(dashboard, /option value="scheduled"/);
  assert.match(dashboard, /Propose Update/);
  assert.match(dashboard, /post\.scheduledFor/);
  assert.doesNotMatch(authorForm, /name="scheduledFor"|name="publishedAt"/);
  assert.match(authorController, /REVISION_SOURCE_STATUSES\.has\(post\.status\)/);
  assert.match(authorController, /authorId: user\._id/);
});

test('creator and seed payloads store future publication only in scheduledFor', () => {
  const seed = POSTS.find((post) => post.status === 'scheduled');
  const authorId = '507f1f77bcf86cd799439011';
  const seedPayload = buildPostPayload(seed, { _id: authorId }, 0);
  const createPayload = buildCreatePayload({
    slug: seed.slug,
    authorId,
    now: new Date('2026-07-01T00:00:00.000Z'),
    publishAt: new Date(seed.publishedAt),
    confirmEditorialReview: true
  });

  assert.equal(seedPayload.status, 'scheduled');
  assert.equal(seedPayload.scheduledFor.toISOString(), new Date(seed.publishedAt).toISOString());
  assert.equal(seedPayload.publishedAt, null);
  assert.equal(createPayload.status, 'scheduled');
  assert.equal(createPayload.scheduledFor.toISOString(), new Date(seed.publishedAt).toISOString());
  assert.equal(createPayload.publishedAt, null);
  assert.ok(createPayload.approvedAt);

  const reviewedAt = new Date('2026-07-01T00:00:00.000Z');
  preservePublishedSeedState(seedPayload, {
    status: 'scheduled',
    approvedAt: null,
    publicationReview: { reviewedAt }
  });
  assert.equal(seedPayload.approvedAt, reviewedAt);
});

test('scheduledFor migration previews and applies legacy publishedAt records', async () => {
  const reviewedAt = new Date('2026-08-31T12:00:00.000Z');
  const records = [{
    _id: 'one',
    publishedAt: new Date('2026-09-01T00:00:00.000Z'),
    approvedAt: null,
    publicationReview: { reviewedAt }
  }];
  const updates = [];
  const BlogModel = {
    find() { return { select() { return { lean: async () => records }; } }; },
    async updateOne(filter, update) { updates.push({ filter, update }); }
  };
  const preview = await migrateScheduledFor({ BlogModel, dryRun: true });
  assert.equal(preview.matched, 1);
  assert.equal(updates.length, 0);
  await migrateScheduledFor({ BlogModel, dryRun: false });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].update.$set.scheduledFor, records[0].publishedAt);
  assert.equal(updates[0].update.$set.publishedAt, null);
  assert.equal(updates[0].update.$set.approvedAt, reviewedAt);
});

test('admin blog routes and templates expose the unified management workspace', () => {
  const routes = read('src/routes/admin.routes.js');
  const review = read('src/views/admin/blog-review.ejs');
  const comments = read('src/views/admin/blog-comments.ejs');
  assert.match(routes, /router\.get\('\/blog'/);
  assert.match(routes, /'\/blog\/comments\.json'/);
  assert.match(routes, /'\/blog\/posts\/:id\/restore'/);
  assert.match(routes, /'\/blog\/posts\/:id\/reschedule'/);
  assert.match(routes, /'\/blog\/posts\/:id\/publish-now'/);
  assert.match(routes, /'\/blog\/posts\/:id\/return-draft'/);
  assert.match(review, /name="publicationMode" value="scheduled"/);
  assert.match(review, /class="scheduled-reschedule-form"/);
  assert.match(review, /name="workflowVersion"/);
  assert.match(review, /sourcePost\.status === 'pending' \|\| reviewTarget\?\.kind === 'revision'/);
  assert.match(review, /id="adminPreviewPanel"/);
  assert.match(review, /maxlength="120"/);
  assert.match(review, /maxlength="220"/);
  assert.match(comments, /data-comment-action/);
});

test('published autosaves stage revisions and approvals enforce optimistic concurrency', () => {
  const controller = read('src/controllers/blog/admin.controller.js');
  const shared = read('src/controllers/blog/_shared.js');

  assert.match(controller, /\['published', 'scheduled'\]\.includes\(post\.status\)[\s\S]*getOrCreateAdminRevision/);
  assert.match(controller, /requestedContentVersion[\s\S]*res\.status\(409\)/);
  assert.match(controller, /requestedEditVersion[\s\S]*res\.status\(409\)/);
  assert.match(shared, /revision\.baseContentVersion[\s\S]*post\.contentVersion[\s\S]*status = 409/);
  assert.match(shared, /session\.withTransaction[\s\S]*post\.\$where[\s\S]*revision\.\$where/);
  assert.match(shared, /DocumentNotFoundError[\s\S]*status = 409/);
});
