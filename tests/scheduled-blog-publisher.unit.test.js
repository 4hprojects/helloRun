'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCronBlock,
  reconcileCrontab,
  BEGIN_MARKER,
  END_MARKER
} = require('../src/scripts/install-scheduled-blog-publisher-cron');
const { publishEligibleScheduledPosts } = require('../src/scripts/publish-scheduled-blogs');
const { buildTrustedEditorialReview } = require('../src/utils/blog-content-eligibility');

function buildEligiblePost(overrides = {}) {
  const words = Array.from({ length: 520 }, (_, index) => `organizerword${index}`).join(' ');
  const payload = {
    title: 'A scheduled organizer guide',
    excerpt: 'A sufficiently useful summary for the scheduled organizer article.',
    category: 'Organizer Guide',
    customCategory: '',
    coverImageUrl: 'https://cdn.hellorun.online/blog/covers/example.webp',
    contentHtml: `<p>${words}</p><p>${words}</p><p>${words}</p>`,
    contentText: words,
    contentRaw: words,
    contentRisk: 'general',
    searchIndexingStatus: 'noindex',
    searchIndexingReason: 'pending_value_review',
    indexingReview: null,
    status: 'scheduled',
    isDeleted: false
  };
  Object.assign(payload, buildTrustedEditorialReview(payload, null, new Date('2026-08-02T12:00:00.000Z')));
  return {
    _id: 'scheduled-id',
    scheduledFor: new Date('2026-08-03T11:00:00.000Z'),
    publishedAt: null,
    approvedAt: new Date('2026-08-02T12:00:00.000Z'),
    approvedBy: null,
    ...payload,
    ...overrides
  };
}

function createBlogModel(posts) {
  function apply(post, update) {
    Object.assign(post, update.$set || {});
    for (const key of Object.keys(update.$unset || {})) delete post[key];
    for (const [key, amount] of Object.entries(update.$inc || {})) {
      post[key] = Number(post[key] || 0) + Number(amount);
    }
  }
  return {
    find: () => posts,
    async findOneAndUpdate(query, update) {
      if (typeof query._id === 'string') {
        const post = posts.find((entry) => entry._id === query._id
          && entry.status === query.status
          && entry.scheduledPublishClaimedBy === query.scheduledPublishClaimedBy);
        if (!post) return null;
        apply(post, update);
        return post;
      }
      const post = posts.find((entry) => entry.status === 'scheduled'
        && !entry.isDeleted
        && !entry.scheduledPublishClaimedAt
        && !(query._id?.$nin || []).includes(entry._id));
      if (!post) return null;
      apply(post, update);
      return post;
    },
    async updateOne(query, update) {
      const post = posts.find((entry) => entry._id === query._id
        && entry.status === query.status
        && entry.scheduledPublishClaimedBy === query.scheduledPublishClaimedBy);
      if (!post) return { modifiedCount: 0 };
      apply(post, update);
      return { modifiedCount: 1 };
    }
  };
}

test('cron reconciliation installs one managed five-minute publisher block', () => {
  const block = buildCronBlock({
    repositoryRoot: '/srv/hellorun',
    nodeExecutable: '/usr/bin/node',
    logPath: '/srv/logs/publisher.log'
  });
  const existing = [
    'MAILTO=ops@example.com',
    BEGIN_MARKER,
    '* * * * * old command',
    END_MARKER,
    '0 2 * * * backup'
  ].join('\n');
  const reconciled = reconcileCrontab(existing, block);
  const secondPass = reconcileCrontab(reconciled, block);

  assert.equal((reconciled.match(new RegExp(BEGIN_MARKER, 'g')) || []).length, 1);
  assert.equal(reconciled.split('publish-scheduled-blogs.js').length - 1, 1);
  assert.ok(reconciled.includes('*/5 * * * *'));
  assert.ok(reconciled.includes('MAILTO=ops@example.com'));
  assert.ok(reconciled.includes('0 2 * * * backup'));
  assert.equal(secondPass, reconciled);
});

test('scheduled publisher publishes only eligible due posts', async () => {
  const eligible = buildEligiblePost();
  const ineligible = buildEligiblePost({
    _id: 'ineligible-id',
    title: 'Ineligible scheduled guide',
    contentEligibility: { eligible: false }
  });
  const BlogModel = createBlogModel([eligible, ineligible]);
  const now = new Date('2026-08-03T11:03:00.000Z');
  const summary = await publishEligibleScheduledPosts({ BlogModel, now });

  assert.equal(summary.eligible, 1);
  assert.equal(summary.published, 1);
  assert.equal(summary.skipped, 1);
  assert.equal(eligible.status, 'published');
  assert.equal(eligible.scheduledFor, null);
  assert.equal(eligible.publishedAt, now);
  assert.equal(eligible.searchIndexingStatus, 'noindex');
  assert.equal(eligible.approvedAt.toISOString(), '2026-08-02T12:00:00.000Z');
  assert.equal(ineligible.status, 'scheduled');
  assert.equal(ineligible.scheduledPublishFailures, 1);
});

test('scheduled publisher publishes approved content while a revision remains pending', async () => {
  const eligible = buildEligiblePost({
    activeRevisionId: 'revision-id',
    activeRevisionStatus: 'pending',
    activeRevisionSubmittedAt: new Date('2026-08-03T10:00:00.000Z')
  });
  const BlogModel = createBlogModel([eligible]);
  const now = new Date('2026-08-03T11:03:00.000Z');

  const summary = await publishEligibleScheduledPosts({ BlogModel, now });

  assert.equal(summary.published, 1);
  assert.equal(eligible.status, 'published');
  assert.equal(eligible.activeRevisionId, 'revision-id');
  assert.equal(eligible.activeRevisionStatus, 'pending');
});

test('scheduled publisher dry-run reports without changing records', async () => {
  const eligible = buildEligiblePost();
  const BlogModel = { find: () => [eligible] };
  const summary = await publishEligibleScheduledPosts({
    BlogModel,
    now: new Date('2026-08-03T11:03:00.000Z'),
    dryRun: true
  });

  assert.equal(summary.eligible, 1);
  assert.equal(summary.published, 0);
  assert.equal(eligible.status, 'scheduled');
});

test('concurrent publishers cannot claim the same scheduled post', async () => {
  const eligible = buildEligiblePost();
  const BlogModel = createBlogModel([eligible]);
  const now = new Date('2026-08-03T11:03:00.000Z');

  const [first, second] = await Promise.all([
    publishEligibleScheduledPosts({ BlogModel, now }),
    publishEligibleScheduledPosts({ BlogModel, now })
  ]);

  assert.equal(first.published + second.published, 1);
  assert.equal(first.claimed + second.claimed, 1);
  assert.equal(eligible.status, 'published');
});
