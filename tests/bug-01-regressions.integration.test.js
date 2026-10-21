'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const Blog = require('../src/models/Blog');
const { buildTrustedEditorialReview } = require('../src/utils/blog-content-eligibility');
const { publishDueScheduledPosts } = require('../src/services/scheduled-blog-publisher.service');
const { prepareCriticalAuditInput } = require('../src/services/critical-audit.service');
const { recordSyncFailure } = require('../src/services/sync-failure.service');
const { retryFailure } = require('../src/workers/pg-sync-worker');
const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');

const cleanup = { blogIds: [], auditKeys: [], failureIds: [] };

test.before(async () => {
  if (!process.env.MONGODB_URI || !process.env.DATABASE_URL) {
    throw new Error('MONGODB_URI and DATABASE_URL are required for BUG-01 integration tests.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
});

test.after(async () => {
  await Blog.deleteMany({ _id: { $in: cleanup.blogIds } });
  const sql = getPostgresClient();
  if (cleanup.auditKeys.length) await sql`delete from audit_critical where idempotency_key = any(${cleanup.auditKeys})`;
  if (cleanup.failureIds.length) await sql`delete from sync_failure_log where id = any(${cleanup.failureIds})`;
  await mongoose.disconnect();
  await closePostgresClient();
});

test('competing scheduled publishers atomically publish a due post once', async () => {
  const now = new Date('2026-10-20T10:00:00.000Z');
  const words = Array.from({ length: 520 }, (_, index) => `publisherword${index}`).join(' ');
  const payload = {
    authorId: new mongoose.Types.ObjectId(),
    title: `Atomic publisher ${Date.now()}`,
    slug: `atomic-publisher-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    excerpt: 'A complete scheduled article used to prove exclusive publication claims.',
    contentHtml: `<h2>One</h2><p>${words}</p><h2>Two</h2><p>${words}</p><h2>Three</h2><p>${words}</p>`,
    contentText: words,
    contentRaw: words,
    coverImageUrl: 'https://cdn.hellorun.online/blog/covers/atomic-test.webp',
    category: 'Organizer Guide',
    contentRisk: 'general',
    searchIndexingStatus: 'noindex',
    searchIndexingReason: 'pending_value_review',
    status: 'scheduled',
    scheduledFor: new Date(now.getTime() - 1000),
    publishedAt: null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };
  Object.assign(payload, buildTrustedEditorialReview(payload, null, new Date(now.getTime() - 5000)));
  const inserted = await Blog.collection.insertOne(payload);
  cleanup.blogIds.push(inserted.insertedId);

  const [first, second] = await Promise.all([
    publishDueScheduledPosts({ BlogModel: Blog, now, workerId: 'integration-a', limit: 1 }),
    publishDueScheduledPosts({ BlogModel: Blog, now, workerId: 'integration-b', limit: 1 })
  ]);
  assert.equal(first.published + second.published, 1);
  assert.equal(first.claimed + second.claimed, 1);

  const stored = await Blog.findById(inserted.insertedId).lean();
  assert.equal(stored.status, 'published');
  assert.equal(stored.scheduledFor, null);
  assert.equal(stored.scheduledPublishClaimedAt, undefined);
  assert.equal(stored.scheduledPublishClaimedBy, undefined);
});

test('a new critical-audit failure replays its original idempotent payload', async () => {
  const sql = getPostgresClient();
  const auditEvent = prepareCriticalAuditInput({
    action: 'test.critical_audit_retry',
    targetType: 'test_record',
    targetId: `bug-01-${Date.now()}`,
    notes: 'Isolated retry verification.'
  }, new Date('2026-10-20T10:05:00.000Z'));
  cleanup.auditKeys.push(auditEvent.idempotencyKey);

  await recordSyncFailure('critical_audit', auditEvent.targetId, new Error('simulated initial failure'), {
    auditEvent: {
      ...auditEvent,
      occurredAt: auditEvent.occurredAt.toISOString()
    }
  });
  const [failure] = await sql`
    select id, sync_type, entity_id, retry_count, context
    from sync_failure_log
    where sync_type = 'critical_audit' and entity_id = ${auditEvent.targetId}
    order by created_at desc
    limit 1
  `;
  assert.ok(failure);
  assert.equal(typeof failure.context, 'object');
  assert.equal(failure.context.auditEvent.idempotencyKey, auditEvent.idempotencyKey);
  cleanup.failureIds.push(failure.id);

  await retryFailure(failure);

  const [auditRows, failureRows] = await Promise.all([
    sql`select action, target_id, idempotency_key from audit_critical where idempotency_key = ${auditEvent.idempotencyKey}`,
    sql`select resolved_at, retry_count from sync_failure_log where id = ${failure.id}`
  ]);
  assert.equal(auditRows.length, 1);
  assert.equal(auditRows[0].action, auditEvent.action);
  assert.equal(auditRows[0].target_id, auditEvent.targetId);
  assert.ok(failureRows[0].resolved_at);
  assert.equal(failureRows[0].retry_count, 0);
});
