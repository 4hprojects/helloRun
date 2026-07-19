'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const policyViewPath = path.join(ROOT, 'src/views/pages/policy.ejs');
const partialPath = path.join(ROOT, 'src/views/pages/partials/data-usage-policy.ejs');
const policyView = fs.readFileSync(policyViewPath, 'utf8');
const partial = fs.readFileSync(partialPath, 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/public/css/data-usage-policy.css'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'docs/policy-markdown-pack/data-usage-policy.md'), 'utf8');
const policyController = fs.readFileSync(path.join(ROOT, 'src/controllers/admin/policy.controller.js'), 'utf8');
const policyWorker = fs.readFileSync(path.join(ROOT, 'src/workers/policy-notice-worker.js'), 'utf8');

const { buildPublicPolicyPresentation, normalizePolicyHtml } = require('../src/services/public-policy-presentation.service');
const { prepareDataUsageDraft } = require('../src/services/data-usage-draft.service');
const { buildDataUsageNotice, buildTermsNotice, processPolicyNoticeBatch } = require('../src/services/policy-notice.service');
const { buildNotificationPresentation } = require('../src/services/notification.service');

test('Data Usage presentation removes embedded metadata and builds the complete data journey', () => {
  const presentation = buildPublicPolicyPresentation({
    policyDocument: { key: 'dataUsage', title: 'Data Usage Policy', dbTitle: 'HelloRun Data Usage Policy' },
    policyHtml: '<h1>HelloRun Data Usage Policy</h1><p><strong>Last Updated:</strong> May 23, 2026</p><h2>Purpose</h2><p>Text</p>',
    policyMeta: { versionNumber: '1.1', effectiveDate: '2026-06-17T00:00:00Z', updatedAt: '2026-06-17T00:00:00Z' }
  });
  assert.equal(presentation.isDataUsage, true);
  assert.doesNotMatch(presentation.contentHtml, /HelloRun Data Usage Policy|Last Updated/);
  assert.equal(presentation.contents[0].id, 'purpose');
  assert.equal(presentation.dataJourney.length, 5);
  assert.equal(presentation.dataCategories.length, 11);
  assert.equal(presentation.dataSummaries.length, 3);
});

test('policy normalization keeps one section hierarchy and collision-safe anchors', () => {
  const normalized = normalizePolicyHtml('<h1>Data Usage Policy</h1><p><br /></p><h1>Review &amp; Use</h1><h2>Review &amp; Use</h2>', { title: 'Data Usage Policy' });
  assert.match(normalized.html, /^<h2/);
  assert.equal((normalized.html.match(/<h1/g) || []).length, 0);
  assert.deepEqual(normalized.contents.map((item) => item.id), ['review-use', 'review-use-2']);
});

test('Data Usage template is server-navigable, printable, responsive, and content-first', () => {
  assert.doesNotThrow(() => ejs.compile(policyView, { filename: policyViewPath }));
  assert.doesNotThrow(() => ejs.compile(partial, { filename: partialPath }));
  for (const marker of ['How your data moves through HelloRun', 'What is used where', 'data-boundaries', 'data-mobile-contents', 'policy-changes', 'Print policy']) {
    assert.match(partial, new RegExp(marker));
  }
  assert.doesNotMatch(partial, /ad-unit|run-proof-modal-dialog/i);
  assert.match(css, /max-width:\s*70ch/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media print/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /data-label/);
});

test('data categories preserve private evidence and public-result boundaries', () => {
  const presentation = buildPublicPolicyPresentation({ policyDocument: { key: 'dataUsage' }, policyHtml: '<h2>Policy</h2>' });
  const joined = JSON.stringify(presentation.dataCategories);
  assert.match(joined, /Proof and internal signals stay private/);
  assert.match(joined, /pending\/internal review details are excluded/i);
  assert.match(joined, /report evidence is restricted/);
  assert.match(joined, /not intentionally sent as identifiable advertising data/);
});

test('review draft uses the selected identity and current workflows without unsupported automation claims', () => {
  for (const phrase of [
    'Henson M. Sagorsor, operating as 4HProjects',
    'Pending distance and activity counts remain separate',
    'Approved totals may exceed the selected goal',
    'immutable final snapshot',
    'public revision history',
    'restricted snapshot of the reported wording',
    'does not by itself establish fraud',
    'not intentionally pass account names'
  ]) assert.match(source, new RegExp(phrase, 'i'));
  assert.doesNotMatch(source, /Last Updated:|4HProjects Inc|Stripe|PayMongo|Xendit|guarantee AdSense approval/i);
});

test('Data Usage draft preparation is draft-only and idempotent', async () => {
  const markdown = '# Data Usage Policy\n\n## Purpose\n\nUse data carefully.';
  let created = 0;
  const existing = { _id: 'draft', versionNumber: '1.2', contentMarkdown: markdown };
  const Model = {
    findOne: () => ({ lean: async () => (created ? existing : null) }),
    find: () => ({ select: () => ({ lean: async () => [{ versionNumber: '1.1' }] }) }),
    create: async (payload) => { created += 1; return { ...payload, toObject: () => payload }; }
  };
  const first = await prepareDataUsageDraft({ Model, contentMarkdown: markdown });
  const second = await prepareDataUsageDraft({ Model, contentMarkdown: markdown });
  assert.equal(first.created, true);
  assert.equal(first.policy.versionNumber, '1.2');
  assert.equal(first.policy.status, 'draft');
  assert.equal(first.policy.isCurrent, false);
  assert.equal(second.created, false);
});

test('Data Usage notices are distinct, safe, and preserve Terms presentation', () => {
  const dataNotice = buildDataUsageNotice({ _id: 'data123', versionNumber: '1.2', summaryOfChanges: 'Clearer data controls.' });
  assert.equal(dataNotice.type, 'data_usage_policy_updated');
  assert.equal(dataNotice.href, '/data-usage-policy#policy-changes');
  assert.equal(dataNotice.dedupeKey, 'data-usage-policy:data123');
  const dataPresentation = buildNotificationPresentation(dataNotice);
  assert.equal(dataPresentation.category, 'Account and policy');
  assert.equal(dataPresentation.actionLabel, 'Review data use');
  assert.equal(buildNotificationPresentation(buildTermsNotice({ _id: 'terms123', versionNumber: '1.2' })).actionLabel, 'Review terms');
});

test('general policy notice batching claims configured policies and uses retry-safe user upserts', async () => {
  let claimQuery;
  let userQuery;
  let operations;
  const userId = { toString: () => 'user1' };
  const policy = {
    _id: 'data123',
    slug: 'data-usage-policy',
    versionNumber: '1.2',
    publishedAt: new Date('2026-07-19'),
    summaryOfChanges: 'Clearer controls.',
    noticeDispatch: { audienceBeforeAt: new Date('2026-07-19'), lastUserId: null }
  };
  const Policy = {
    findOneAndUpdate: (query) => { claimQuery = query; return { lean: async () => policy }; },
    updateOne: async () => ({})
  };
  const Users = { find: (query) => { userQuery = query; return { select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ _id: userId }] }) }) }) }; } };
  const Notifications = { bulkWrite: async (ops) => { operations = ops; } };
  const result = await processPolicyNoticeBatch({ Policy, Users, Notifications, now: new Date('2026-07-20') });
  assert.deepEqual(claimQuery.slug.$in.sort(), ['acceptable-use-policy', 'community-guidelines', 'cookie-policy', 'data-usage-policy', 'organiser-terms', 'privacy-policy', 'refund-and-cancellation-policy', 'terms-of-service']);
  assert.deepEqual(userQuery.accountStatus, { $ne: 'closed' });
  assert.equal(result.processed, 1);
  assert.equal(operations[0].updateOne.upsert, true);
  assert.equal(operations[0].updateOne.filter.dedupeKey, 'data-usage-policy:data123');
});

test('publishing either versioned policy queues the shared durable worker after transaction-safe persistence', () => {
  assert.match(policyController, /policyDocument\.key === 'terms' \|\| policyDocument\.key === 'dataUsage' \|\| policyDocument\.key === 'acceptableUse' \|\| policyDocument\.key === 'organiserTerms' \|\| policyDocument\.key === 'communityGuidelines' \|\| policyDocument\.key === 'refund'/);
  assert.match(policyController, /noticeDispatch = \{[\s\S]*status: 'pending'[\s\S]*audienceBeforeAt: now/);
  assert.match(policyController, /policy\.save\(\{ session \}\)[\s\S]*session\.commitTransaction\(\)/);
  assert.match(policyWorker, /processPolicyNoticeBatch/);
});
