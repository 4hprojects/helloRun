'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const policyViewPath = path.join(ROOT, 'src/views/pages/policy.ejs');
const partialPath = path.join(ROOT, 'src/views/pages/partials/refund-policy.ejs');
const policyView = fs.readFileSync(policyViewPath, 'utf8');
const partial = fs.readFileSync(partialPath, 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/public/css/refund-policy.css'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'docs/policy-markdown-pack/refund-and-cancellation-policy.md'), 'utf8');
const legacy = fs.readFileSync(path.join(ROOT, 'docs/contents/Refund and Cancellation Policy.md'), 'utf8');
const policyController = fs.readFileSync(path.join(ROOT, 'src/controllers/admin/policy.controller.js'), 'utf8');
const shopController = fs.readFileSync(path.join(ROOT, 'src/controllers/shop.controller.js'), 'utf8');
const shopSnapshot = fs.readFileSync(path.join(ROOT, 'src/models/ShopPolicySnapshot.js'), 'utf8');

const { buildPublicPolicyPresentation, normalizePolicyHtml } = require('../src/services/public-policy-presentation.service');
const { prepareRefundPolicyDraft } = require('../src/services/refund-policy-draft.service');
const { buildRefundPolicyNotice, buildTermsNotice, processPolicyNoticeBatch } = require('../src/services/policy-notice.service');
const { buildNotificationPresentation } = require('../src/services/notification.service');

test('Refund Policy presentation removes embedded metadata and builds outcome guidance', () => {
  const presentation = buildPublicPolicyPresentation({
    policyDocument: { key: 'refund', title: 'Refund and Cancellation Policy', dbTitle: 'HelloRun Refund and Cancellation Policy' },
    policyHtml: '<h1>HelloRun Refund and Cancellation Policy</h1><p><strong>Last Updated:</strong> May 23, 2026</p><h2>Purpose</h2><p>Text</p>',
    policyMeta: { versionNumber: '1.0', effectiveDate: '2026-05-23T00:00:00+08:00', updatedAt: '2026-05-23T00:00:00+08:00' }
  });
  assert.equal(presentation.isRefundPolicy, true);
  assert.doesNotMatch(presentation.contentHtml, /HelloRun Refund and Cancellation Policy|Last Updated/);
  assert.equal(presentation.contents[0].id, 'purpose');
  assert.equal(presentation.refundOutcomes.length, 7);
  assert.equal(presentation.refundBoundaries.length, 5);
  assert.equal(presentation.refundResponsibilities.length, 3);
  assert.equal(presentation.refundJourney.length, 5);
  assert.equal(presentation.refundChecklist.length, 8);
});

test('refund policy headings are collision-safe and leave the template as the only h1', () => {
  const normalized = normalizePolicyHtml('<h1>Refund and Cancellation Policy</h1><h1>Cancel &amp; refund</h1><h2>Cancel &amp; refund</h2>', { title: 'Refund and Cancellation Policy' });
  assert.equal((normalized.html.match(/<h1/g) || []).length, 0);
  assert.deepEqual(normalized.contents.map((item) => item.id), ['cancel-refund', 'cancel-refund-2']);
});

test('template exposes outcome, responsibility, privacy, role, print, and responsive presentation without ads', () => {
  assert.doesNotThrow(() => ejs.compile(policyView, { filename: policyViewPath }));
  assert.doesNotThrow(() => ejs.compile(partial, { filename: partialPath }));
  for (const marker of ['Find the right next step', 'Cancellation and refund are not interchangeable', 'Know who controls each part', 'How a concern moves toward an outcome', 'What to include', 'Do not publish sensitive evidence', 'My Registrations', 'My Orders', 'Organizer Dashboard', 'Contact Support', 'policy-changes', 'Print policy']) assert.match(partial, new RegExp(marker));
  assert.doesNotMatch(partial, /ad-unit|run-proof-modal-dialog/i);
  assert.match(css, /max-width:\s*70ch/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /content:\s*attr\(data-label\)/);
  assert.match(css, /@media print/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /border-left-color/);
});

test('outcome guide keeps cancellation, request, status, and money movement distinct', () => {
  const presentation = buildPublicPolicyPresentation({ policyDocument: { key: 'refund' }, policyHtml: '<h2>Policy</h2>' });
  const boundaries = JSON.stringify(presentation.refundBoundaries);
  assert.match(boundaries, /does not itself send money/i);
  assert.match(boundaries, /not the payment transaction itself/i);
  assert.match(boundaries, /Requires action.*organizer.*payment-provider workflow/i);
  const outcomes = JSON.stringify(presentation.refundOutcomes);
  assert.match(outcomes, /Rejected proof does not mean money was returned/i);
  assert.match(outcomes, /Cancelling fulfilment does not itself prove.*refunded/i);
});

test('corrected draft covers present workflows without blanket exclusions or unsupported guarantees', () => {
  for (const phrase of [
    'Henson M. Sagorsor, operating as 4HProjects',
    'does not currently provide an automated endpoint',
    'Cancelling a registration does not automatically cancel an event-shop order',
    'Payment-proof rejection means',
    'blanket “no refund” statement',
    'defective, materially misdescribed',
    'organizer non-response',
    'does not guarantee approval, a fixed response time',
    'Previous consent or transaction records are not rewritten'
  ]) assert.match(source, new RegExp(phrase, 'i'));
  assert.doesNotMatch(source, /Last Updated:|4HProjects Inc|all payments are non-refundable|refund is guaranteed|within \d+ business days/i);
  assert.match(legacy, /Last Updated:\*\* May 23, 2026/);
});

test('existing order cancellation remains eligibility-limited and does not claim a refund', () => {
  assert.match(shopController, /fulfilment_status[^\n]+not_started/);
  assert.match(shopController, /CANCELLABLE_PAYMENT_STATUSES/);
  assert.match(shopController, /This order can no longer be cancelled/);
  assert.doesNotMatch(shopController, /refund.*payment|sendRefund|processRefund/i);
  assert.match(shopSnapshot, /refundPolicyVersion/);
});

test('draft preparation creates notice-free v1.0 baseline and idempotent v1.1 draft', async () => {
  const records = [];
  const chain = (items) => ({ select: () => ({ lean: async () => items }), lean: async () => items[0] || null });
  const Model = {
    findOne: (query) => chain(records.filter((item) => Object.entries(query).every(([key, value]) => item[key] === value))),
    find: (query) => chain(records.filter((item) => item.slug === query.slug)),
    create: async (payload) => { const record = { _id: `id${records.length + 1}`, ...payload }; records.push(record); return { ...record, toObject: () => record }; }
  };
  const options = { Model, legacyMarkdown: legacy, contentMarkdown: source };
  const first = await prepareRefundPolicyDraft(options);
  const second = await prepareRefundPolicyDraft(options);
  assert.equal(first.baselineCreated, true);
  assert.equal(first.baseline.versionNumber, '1.0');
  assert.equal(first.baseline.status, 'published');
  assert.equal(first.baseline.noticeDispatch.status, 'none');
  assert.equal(first.draftCreated, true);
  assert.equal(first.policy.versionNumber, '1.1');
  assert.equal(first.policy.status, 'draft');
  assert.equal(first.policy.isCurrent, false);
  assert.equal(second.baselineCreated, false);
  assert.equal(second.draftCreated, false);
  assert.equal(records.length, 2);
});

test('future Refund Policy notice is deduplicated and runner-safe', () => {
  const notice = buildRefundPolicyNotice({ _id: 'refund123', versionNumber: '1.1', summaryOfChanges: 'Clearer refund outcomes.' });
  assert.equal(notice.type, 'refund_policy_updated');
  assert.equal(notice.href, '/refund-and-cancellation-policy#policy-changes');
  assert.equal(notice.dedupeKey, 'refund-policy:refund123');
  assert.equal(buildNotificationPresentation(notice).actionLabel, 'Review refund policy');
  assert.equal(buildNotificationPresentation(buildTermsNotice({ _id: 'terms', versionNumber: '1.2' })).actionLabel, 'Review terms');
});

test('shared notice worker delivers Refund Policy updates to every eligible active account', async () => {
  let claimQuery;
  let userQuery;
  let operations;
  const policy = { _id: 'refund123', slug: 'refund-and-cancellation-policy', versionNumber: '1.1', publishedAt: new Date('2026-07-19'), noticeDispatch: { audienceBeforeAt: new Date('2026-07-19'), lastUserId: null } };
  const Policy = { findOneAndUpdate: (query) => { claimQuery = query; return { lean: async () => policy }; }, updateOne: async () => ({}) };
  const Users = { find: (query) => { userQuery = query; return { select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ _id: 'runner1' }, { _id: 'organizer1' }] }) }) }) }; } };
  const Notifications = { bulkWrite: async (ops) => { operations = ops; } };
  await processPolicyNoticeBatch({ Policy, Users, Notifications, now: new Date('2026-07-20') });
  assert.deepEqual(claimQuery.slug.$in.sort(), ['acceptable-use-policy', 'community-guidelines', 'cookie-policy', 'data-usage-policy', 'organiser-terms', 'privacy-policy', 'refund-and-cancellation-policy', 'terms-of-service']);
  assert.deepEqual(userQuery.accountStatus, { $ne: 'closed' });
  assert.equal(userQuery.role, undefined);
  assert.equal(operations.length, 2);
  assert.equal(operations[0].updateOne.filter.dedupeKey, 'refund-policy:refund123');
});

test('admin publication queues future Refund Policy notices without adding refund APIs', () => {
  assert.match(policyController, /policyDocument\.key === 'refund'/);
  assert.match(policyController, /noticeDispatch = \{[\s\S]*status: 'pending'[\s\S]*audienceBeforeAt: now/);
  assert.doesNotMatch(policyController, /refundRequest|processRefund|paymentProviderRefund/);
});
