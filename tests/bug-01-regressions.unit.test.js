'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Submission = require('../src/models/Submission');
const AccumulatedActivitySubmission = require('../src/models/AccumulatedActivitySubmission');
const {
  buildAuditIdempotencyKey,
  prepareCriticalAuditInput
} = require('../src/services/critical-audit.service');
const { sanitizeOcrData } = require('../src/services/submission-validation.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('standard submissions persist the runner honor-system confirmation', () => {
  const pathDefinition = Submission.schema.path('honorSystemConfirmed');
  assert.ok(pathDefinition);
  assert.equal(pathDefinition.instance, 'Boolean');
  assert.equal(pathDefinition.defaultValue, false);

  const document = new Submission({ honorSystemConfirmed: true });
  assert.equal(document.honorSystemConfirmed, true);
  assert.match(read('src/services/submission.service.js'), /honorSystemConfirmed: Boolean\(input\.honorSystemConfirmed\)/);
  assert.match(read('src/services/submission.service.js'), /existing\.honorSystemConfirmed = payload\.honorSystemConfirmed/);
});

test('both OCR payload schemas accept treadmill as an extracted run type', () => {
  for (const Model of [Submission, AccumulatedActivitySubmission]) {
    const enumValues = Model.schema.path('ocrData.extractedRunType').enumValues;
    assert.ok(enumValues.includes('treadmill'));
    const document = new Model({ ocrData: { extractedRunType: 'treadmill' } });
    const error = document.validateSync(['ocrData.extractedRunType']);
    assert.equal(error, undefined);
  }
  assert.equal(sanitizeOcrData({ extractedRunType: 'treadmill' }).extractedRunType, 'treadmill');
});

test('admin bulk rejection falls back only when the standard entry is absent', () => {
  const controller = read('src/controllers/admin/submissions.controller.js');
  assert.match(controller, /error\?\.code !== 'submission_not_found'/);
  assert.doesNotMatch(controller, /\.catch\(\(\) =>\s*reviewAccumulatedActivitySubmission/);

  const standard = read('src/services/submission.service.js');
  const accumulated = read('src/services/accumulated-activity.service.js');
  assert.match(standard, /error\.code = 'submission_not_found'/);
  assert.match(accumulated, /error\.code = 'activity_submission_not_found'/);
});

test('critical-audit retry payloads keep a stable timestamp and idempotency key', () => {
  const now = new Date('2026-10-20T10:00:00.000Z');
  const prepared = prepareCriticalAuditInput({
    action: 'submission.rejected',
    targetType: 'submission',
    targetId: 'submission-1',
    actorMongoUserId: 'actor-1'
  }, now);
  assert.equal(prepared.occurredAt, now);
  assert.equal(prepared.idempotencyKey, buildAuditIdempotencyKey(prepared));

  const service = read('src/services/critical-audit.service.js');
  const failureService = read('src/services/sync-failure.service.js');
  const worker = read('src/workers/pg-sync-worker.js');
  assert.match(service, /auditEvent:\s*\{/);
  assert.match(failureService, /sql\.json\(context\)/);
  assert.doesNotMatch(failureService, /JSON\.stringify\(context\)/);
  assert.match(worker, /recordCriticalAuditEvent\(auditEvent, \{ sql \}\)/);
  assert.match(worker, /legacy critical_audit failure has no retry payload/);
});

test('both scheduled publishers use the atomic shared claim service', () => {
  const service = read('src/services/scheduled-blog-publisher.service.js');
  const worker = read('src/workers/pg-sync-worker.js');
  const cron = read('src/scripts/publish-scheduled-blogs.js');
  assert.match(service, /findOneAndUpdate\(/);
  assert.match(service, /scheduledPublishClaimedBy/);
  assert.match(service, /scheduledPublishClaimedAt: \{ \$lte: staleBefore \}/);
  assert.match(worker, /publishDueScheduledPosts/);
  assert.match(cron, /publishDueScheduledPosts/);
});
