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
    status: 'scheduled',
    isDeleted: false
  };
  Object.assign(payload, buildTrustedEditorialReview(payload, null, new Date('2026-08-02T12:00:00.000Z')));
  return {
    _id: 'scheduled-id',
    publishedAt: new Date('2026-08-03T11:00:00.000Z'),
    approvedAt: null,
    approvedBy: null,
    saveCalls: 0,
    async save() { this.saveCalls += 1; },
    ...payload,
    ...overrides
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
  const BlogModel = {
    find(query) {
      assert.equal(query.status, 'scheduled');
      assert.deepEqual(query.isDeleted, { $ne: true });
      return [eligible, ineligible];
    }
  };
  const now = new Date('2026-08-03T11:03:00.000Z');
  const summary = await publishEligibleScheduledPosts({ BlogModel, now });

  assert.equal(summary.eligible, 1);
  assert.equal(summary.published, 1);
  assert.equal(summary.skipped, 1);
  assert.equal(eligible.status, 'published');
  assert.equal(eligible.approvedAt, now);
  assert.equal(eligible.saveCalls, 1);
  assert.equal(ineligible.status, 'scheduled');
  assert.equal(ineligible.saveCalls, 0);
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
  assert.equal(eligible.saveCalls, 0);
});
