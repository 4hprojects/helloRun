'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const policyViewPath = path.join(ROOT, 'src/views/pages/policy.ejs');
const partialPath = path.join(ROOT, 'src/views/pages/partials/community-guidelines.ejs');
const policyView = fs.readFileSync(policyViewPath, 'utf8');
const partial = fs.readFileSync(partialPath, 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/public/css/community-guidelines.css'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'docs/policy-markdown-pack/community-guidelines.md'), 'utf8');
const legacy = fs.readFileSync(path.join(ROOT, 'docs/contents/Community Guidelines.md'), 'utf8');
const policyController = fs.readFileSync(path.join(ROOT, 'src/controllers/admin/policy.controller.js'), 'utf8');

const { buildPublicPolicyPresentation, normalizePolicyHtml } = require('../src/services/public-policy-presentation.service');
const { prepareCommunityGuidelinesDraft } = require('../src/services/community-guidelines-draft.service');
const { buildCommunityGuidelinesNotice, buildTermsNotice, processPolicyNoticeBatch } = require('../src/services/policy-notice.service');
const { buildNotificationPresentation } = require('../src/services/notification.service');

test('Community Guidelines presentation removes embedded metadata and builds practical participation guidance', () => {
  const presentation = buildPublicPolicyPresentation({
    policyDocument: { key: 'communityGuidelines', title: 'Community Guidelines', dbTitle: 'HelloRun Community Guidelines' },
    policyHtml: '<h1>HelloRun Community Guidelines</h1><p><strong>Last Updated:</strong> May 23, 2026</p><h2>Purpose</h2><p>Text</p>',
    policyMeta: { versionNumber: '1.0', effectiveDate: '2026-05-23T00:00:00+08:00', updatedAt: '2026-05-23T00:00:00+08:00' }
  });
  assert.equal(presentation.isCommunityGuidelines, true);
  assert.doesNotMatch(presentation.contentHtml, /HelloRun Community Guidelines|Last Updated/);
  assert.equal(presentation.contents[0].id, 'purpose');
  assert.equal(presentation.communityApplicability.length, 8);
  assert.equal(presentation.communityPrinciples.length, 5);
  assert.equal(presentation.communitySituations.length, 9);
  assert.equal(presentation.communityChecklist.length, 7);
  assert.equal(presentation.communityModeration.length, 5);
  assert.equal(presentation.communityReporting.length, 3);
});

test('community policy headings are collision-safe and leave the template as the only h1', () => {
  const normalized = normalizePolicyHtml('<h1>Community Guidelines</h1><h1>Respect &amp; safety</h1><h2>Respect &amp; safety</h2>', { title: 'Community Guidelines' });
  assert.equal((normalized.html.match(/<h1/g) || []).length, 0);
  assert.deepEqual(normalized.contents.map((item) => item.id), ['respect-safety', 'respect-safety-2']);
});

test('template exposes participation, reporting, print, responsive, and role-aware presentation without ads', () => {
  assert.doesNotThrow(() => ejs.compile(policyView, { filename: policyViewPath }));
  assert.doesNotThrow(() => ejs.compile(partial, { filename: partialPath }));
  for (const marker of ['One standard across community spaces', 'Five principles for participating well', 'What constructive participation looks like', 'Before you publish', 'Experience, not diagnosis', 'How a community concern is handled', 'Report concerns without exposing more information', 'policy-changes', 'Print guidelines', 'Running Groups', 'Organizer Dashboard', 'Admin Dashboard']) assert.match(partial, new RegExp(marker));
  assert.doesNotMatch(partial, /ad-unit|run-proof-modal-dialog/i);
  assert.match(css, /max-width:\s*70ch/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /content:\s*attr\(data-label\)/);
  assert.match(css, /@media print/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /border-left-color/);
});

test('corrected draft covers current community workflows and policy boundaries', () => {
  for (const phrase of [
    'Henson M. Sagorsor, operating as 4HProjects',
    'one-level threaded replies',
    'public revision history',
    'report-time context',
    'running-group names',
    'diagnose another person',
    'Organizers must not retaliate',
    'neutral tombstone',
    'cannot report your own comment',
    'Automated and assisted signals'
  ]) assert.match(source, new RegExp(phrase, 'i'));
  assert.doesNotMatch(source, /Last Updated:|4HProjects Inc|guarantee AdSense|three strikes/i);
  assert.match(legacy, /Last Updated:\*\* May 23, 2026/);
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
  const first = await prepareCommunityGuidelinesDraft(options);
  const second = await prepareCommunityGuidelinesDraft(options);
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

test('future Community Guidelines notice is deduplicated and runner-safe', () => {
  const notice = buildCommunityGuidelinesNotice({ _id: 'cg123', versionNumber: '1.1', summaryOfChanges: 'Clearer participation guidance.' });
  assert.equal(notice.type, 'community_guidelines_updated');
  assert.equal(notice.href, '/community-guidelines#policy-changes');
  assert.equal(notice.dedupeKey, 'community-guidelines:cg123');
  assert.equal(buildNotificationPresentation(notice).actionLabel, 'Review community guidelines');
  assert.equal(buildNotificationPresentation(buildTermsNotice({ _id: 'terms', versionNumber: '1.2' })).actionLabel, 'Review terms');
});

test('shared notice worker delivers Community Guidelines updates to all eligible active accounts', async () => {
  let claimQuery;
  let userQuery;
  let operations;
  const policy = { _id: 'cg123', slug: 'community-guidelines', versionNumber: '1.1', publishedAt: new Date('2026-07-19'), noticeDispatch: { audienceBeforeAt: new Date('2026-07-19'), lastUserId: null } };
  const Policy = { findOneAndUpdate: (query) => { claimQuery = query; return { lean: async () => policy }; }, updateOne: async () => ({}) };
  const Users = { find: (query) => { userQuery = query; return { select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ _id: 'runner1' }, { _id: 'organizer1' }] }) }) }) }; } };
  const Notifications = { bulkWrite: async (ops) => { operations = ops; } };
  await processPolicyNoticeBatch({ Policy, Users, Notifications, now: new Date('2026-07-20') });
  assert.deepEqual(claimQuery.slug.$in.sort(), ['acceptable-use-policy', 'community-guidelines', 'cookie-policy', 'data-usage-policy', 'organiser-terms', 'privacy-policy', 'refund-and-cancellation-policy', 'terms-of-service']);
  assert.deepEqual(userQuery.accountStatus, { $ne: 'closed' });
  assert.equal(userQuery.role, undefined);
  assert.equal(operations.length, 2);
  assert.equal(operations[0].updateOne.filter.dedupeKey, 'community-guidelines:cg123');
});

test('admin publication queues future Community Guidelines notices without changing community APIs', () => {
  assert.match(policyController, /policyDocument\.key === 'communityGuidelines'/);
  assert.match(policyController, /noticeDispatch = \{[\s\S]*status: 'pending'[\s\S]*audienceBeforeAt: now/);
  assert.doesNotMatch(policyController, /BlogComment|BlogReport|RunningGroup/);
});
