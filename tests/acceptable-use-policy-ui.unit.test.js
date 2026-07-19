'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const policyViewPath = path.join(ROOT, 'src/views/pages/policy.ejs');
const partialPath = path.join(ROOT, 'src/views/pages/partials/acceptable-use-policy.ejs');
const policyView = fs.readFileSync(policyViewPath, 'utf8');
const partial = fs.readFileSync(partialPath, 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/public/css/acceptable-use-policy.css'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'docs/policy-markdown-pack/acceptable-use-policy.md'), 'utf8');
const legacy = fs.readFileSync(path.join(ROOT, 'docs/contents/Acceptable Use Policy.md'), 'utf8');
const policyController = fs.readFileSync(path.join(ROOT, 'src/controllers/admin/policy.controller.js'), 'utf8');

const { buildPublicPolicyPresentation, normalizePolicyHtml } = require('../src/services/public-policy-presentation.service');
const { prepareAcceptableUseDraft } = require('../src/services/acceptable-use-draft.service');
const { buildAcceptableUseNotice, buildDataUsageNotice, buildTermsNotice, processPolicyNoticeBatch } = require('../src/services/policy-notice.service');
const { buildNotificationPresentation } = require('../src/services/notification.service');

test('Acceptable Use presentation removes duplicate metadata and builds task guidance', () => {
  const presentation = buildPublicPolicyPresentation({
    policyDocument: { key: 'acceptableUse', title: 'Acceptable Use Policy', dbTitle: 'HelloRun Acceptable Use Policy' },
    policyHtml: '<h1>HelloRun Acceptable Use Policy</h1><p><strong>Last Updated:</strong> May 23, 2026</p><h2>Purpose</h2><p>Text</p>',
    policyMeta: { versionNumber: '1.0', effectiveDate: '2026-05-23T00:00:00+08:00', updatedAt: '2026-05-23T00:00:00+08:00' }
  });
  assert.equal(presentation.isAcceptableUse, true);
  assert.doesNotMatch(presentation.contentHtml, /HelloRun Acceptable Use Policy|Last Updated/);
  assert.equal(presentation.contents[0].id, 'purpose');
  assert.equal(presentation.acceptableUseRules.length, 7);
  assert.equal(presentation.acceptableUseEnforcement.length, 5);
  assert.equal(presentation.acceptableUseReporting.length, 3);
});

test('policy headings are collision-safe and contain no embedded h1', () => {
  const normalized = normalizePolicyHtml('<h1>Acceptable Use Policy</h1><h1>Review &amp; action</h1><h2>Review &amp; action</h2>', { title: 'Acceptable Use Policy' });
  assert.equal((normalized.html.match(/<h1/g) || []).length, 0);
  assert.deepEqual(normalized.contents.map((item) => item.id), ['review-action', 'review-action-2']);
});

test('Acceptable Use template is navigable, printable, responsive, and content-first', () => {
  assert.doesNotThrow(() => ejs.compile(policyView, { filename: policyViewPath }));
  assert.doesNotThrow(() => ejs.compile(partial, { filename: partialPath }));
  for (const marker of ['Use HelloRun fairly, safely, and honestly', 'Immediate safety risks', 'How a concern is handled', 'Report a concern without exposing more data', 'aup-mobile-contents', 'policy-changes', 'Print policy']) assert.match(partial, new RegExp(marker));
  assert.doesNotMatch(partial, /ad-unit|run-proof-modal-dialog/i);
  assert.match(css, /max-width:\s*70ch/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media print/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /content:\s*attr\(data-label\)/);
});

test('corrected policy covers current integrity risks without unsupported promises', () => {
  for (const phrase of ['Henson M. Sagorsor, operating as 4HProjects', 'misleading sponsorship or accreditation claims', 'Approved accumulated distance may exceed a selected goal', 'exposure of personal data', 'invalid advertising traffic', 'does not grant authorization to test HelloRun systems', 'non-blocking in-app notification']) assert.match(source, new RegExp(phrase, 'i'));
  assert.doesNotMatch(source, /Last Updated:|4HProjects Inc|guarantee AdSense|legal safe harbor is granted/i);
  assert.match(legacy, /Last Updated:\*\* May 23, 2026/);
});

test('draft preparation creates a notice-free v1.0 baseline and idempotent v1.1 draft', async () => {
  const records = [];
  const chain = (items) => ({ select: () => ({ lean: async () => items }), lean: async () => items[0] || null });
  const Model = {
    findOne: (query) => chain(records.filter((item) => Object.entries(query).every(([key, value]) => item[key] === value))),
    find: (query) => chain(records.filter((item) => item.slug === query.slug)),
    create: async (payload) => { const record = { _id: `id${records.length + 1}`, ...payload }; records.push(record); return { ...record, toObject: () => record }; }
  };
  const options = { Model, legacyMarkdown: legacy, contentMarkdown: source };
  const first = await prepareAcceptableUseDraft(options);
  const second = await prepareAcceptableUseDraft(options);
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

test('Acceptable Use notices are deduplicated and preserve other policy presentations', () => {
  const notice = buildAcceptableUseNotice({ _id: 'aup123', versionNumber: '1.1', summaryOfChanges: 'Clearer fair-use rules.' });
  assert.equal(notice.type, 'acceptable_use_policy_updated');
  assert.equal(notice.href, '/acceptable-use-policy#policy-changes');
  assert.equal(notice.dedupeKey, 'acceptable-use-policy:aup123');
  assert.equal(buildNotificationPresentation(notice).actionLabel, 'Review acceptable use');
  assert.equal(buildNotificationPresentation(buildTermsNotice({ _id: 'terms', versionNumber: '1.2' })).actionLabel, 'Review terms');
  assert.equal(buildNotificationPresentation(buildDataUsageNotice({ _id: 'data', versionNumber: '1.2' })).actionLabel, 'Review data use');
});

test('shared notice worker claims Acceptable Use and uses retry-safe account upserts', async () => {
  let claimQuery;
  let operations;
  const policy = { _id: 'aup123', slug: 'acceptable-use-policy', versionNumber: '1.1', publishedAt: new Date('2026-07-19'), noticeDispatch: { audienceBeforeAt: new Date('2026-07-19'), lastUserId: null } };
  const Policy = { findOneAndUpdate: (query) => { claimQuery = query; return { lean: async () => policy }; }, updateOne: async () => ({}) };
  const Users = { find: () => ({ select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ _id: 'user1' }] }) }) }) }) };
  const Notifications = { bulkWrite: async (ops) => { operations = ops; } };
  await processPolicyNoticeBatch({ Policy, Users, Notifications, now: new Date('2026-07-20') });
  assert.deepEqual(claimQuery.slug.$in.sort(), ['acceptable-use-policy', 'community-guidelines', 'cookie-policy', 'data-usage-policy', 'organiser-terms', 'privacy-policy', 'refund-and-cancellation-policy', 'terms-of-service']);
  assert.equal(operations[0].updateOne.upsert, true);
  assert.equal(operations[0].updateOne.filter.dedupeKey, 'acceptable-use-policy:aup123');
});

test('admin publication queues future Acceptable Use notices after persistence', () => {
  assert.match(policyController, /policyDocument\.key === 'acceptableUse'/);
  assert.match(policyController, /noticeDispatch = \{[\s\S]*status: 'pending'[\s\S]*audienceBeforeAt: now/);
  assert.match(policyController, /policy\.save\(\{ session \}\)[\s\S]*session\.commitTransaction\(\)/);
});
