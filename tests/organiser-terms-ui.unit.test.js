'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const policyViewPath = path.join(ROOT, 'src/views/pages/policy.ejs');
const partialPath = path.join(ROOT, 'src/views/pages/partials/organiser-terms.ejs');
const policyView = fs.readFileSync(policyViewPath, 'utf8');
const partial = fs.readFileSync(partialPath, 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/public/css/organiser-terms.css'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'docs/policy-markdown-pack/organiser-terms.md'), 'utf8');
const legacy = fs.readFileSync(path.join(ROOT, 'docs/contents/Organiser Terms.md'), 'utf8');
const dashboard = fs.readFileSync(path.join(ROOT, 'src/views/organizer/dashboard.ejs'), 'utf8');
const policyController = fs.readFileSync(path.join(ROOT, 'src/controllers/admin/policy.controller.js'), 'utf8');

const { buildPublicPolicyPresentation, normalizePolicyHtml } = require('../src/services/public-policy-presentation.service');
const { prepareOrganiserTermsDraft } = require('../src/services/organiser-terms-draft.service');
const { buildOrganiserTermsNotice, buildTermsNotice, processPolicyNoticeBatch } = require('../src/services/policy-notice.service');
const { buildNotificationPresentation } = require('../src/services/notification.service');

test('Organiser Terms presentation removes embedded metadata and builds the organizer lifecycle', () => {
  const presentation = buildPublicPolicyPresentation({
    policyDocument: { key: 'organiserTerms', title: 'Organiser Terms', dbTitle: 'HelloRun Organiser Terms' },
    policyHtml: '<h1>HelloRun Organiser Terms</h1><p><strong>Last Updated:</strong> May 23, 2026</p><h2>Purpose</h2><p>Text</p>',
    policyMeta: { versionNumber: '1.0', effectiveDate: '2026-05-23T00:00:00+08:00', updatedAt: '2026-05-23T00:00:00+08:00' }
  });
  assert.equal(presentation.isOrganiserTerms, true);
  assert.doesNotMatch(presentation.contentHtml, /HelloRun Organiser Terms|Last Updated/);
  assert.equal(presentation.contents[0].id, 'purpose');
  assert.equal(presentation.organiserCapabilities.length, 4);
  assert.equal(presentation.organiserLifecycle.length, 6);
  assert.equal(presentation.organiserDuties.length, 6);
});

test('policy headings remain collision-safe with one page h1', () => {
  const normalized = normalizePolicyHtml('<h1>Organiser Terms</h1><h1>Review &amp; close</h1><h2>Review &amp; close</h2>', { title: 'Organiser Terms' });
  assert.equal((normalized.html.match(/<h1/g) || []).length, 0);
  assert.deepEqual(normalized.contents.map((item) => item.id), ['review-close', 'review-close-2']);
});

test('template exposes the lifecycle, support, print, and responsive presentation without ads', () => {
  assert.doesNotThrow(() => ejs.compile(policyView, { filename: policyViewPath }));
  assert.doesNotThrow(() => ejs.compile(partial, { filename: partialPath }));
  for (const marker of ['Capability grows with verified responsibility', 'Your responsibility continues through event closure', 'Six areas that need deliberate ownership', 'Registration is not the event shop', 'event-creation-access', 'org-mobile-contents', 'policy-changes', 'Print terms', 'Organizer Dashboard']) assert.match(partial, new RegExp(marker));
  assert.doesNotMatch(partial, /ad-unit|run-proof-modal-dialog/i);
  assert.match(css, /max-width:\s*70ch/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /content:\s*attr\(data-label\)/);
  assert.match(css, /@media print/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /border-left-color/);
});

test('capability and acknowledgement copy point to the authoritative organizer access section', () => {
  const presentation = buildPublicPolicyPresentation({ policyDocument: { key: 'organiserTerms' }, policyHtml: '<h2>Policy</h2>' });
  const capabilityText = JSON.stringify(presentation.organiserCapabilities);
  assert.match(capabilityText, /verified email.*acknowledgement.*free virtual/i);
  assert.match(capabilityText, /paid, physical-reward, delivery, onsite, and hybrid/i);
  assert.match(capabilityText, /Auto-publication is conditional/i);
  assert.match(dashboard, /\/organiser-terms#event-creation-access/);
  assert.match(dashboard, /signatureName/);
});

test('corrected draft covers current organizer operations without unsupported guarantees', () => {
  for (const phrase of [
    'Henson M. Sagorsor, operating as 4HProjects',
    'Creating or submitting an event does not guarantee publication',
    'Payment approval confirms payment evidence',
    'Pending distance does not affect rank',
    'Final certificates are prepared after the final submission deadline',
    'Participant exports remain under the organizer\'s responsibility',
    'An event shop is operationally separate from event registration',
    'does not automatically inspect a venue'
  ]) assert.match(source, new RegExp(phrase, 'i'));
  assert.doesNotMatch(source, /Last Updated:|4HProjects Inc|publication is guaranteed|no refunds? under any circumstances/i);
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
  const first = await prepareOrganiserTermsDraft(options);
  const second = await prepareOrganiserTermsDraft(options);
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

test('future Organiser Terms notice is runner-safe and distinct from general Terms', () => {
  const notice = buildOrganiserTermsNotice({ _id: 'org123', versionNumber: '1.1', summaryOfChanges: 'Clearer organizer duties.' });
  assert.equal(notice.type, 'organiser_terms_updated');
  assert.equal(notice.href, '/organiser-terms#policy-changes');
  assert.equal(notice.dedupeKey, 'organiser-terms:org123');
  assert.equal(buildNotificationPresentation(notice).actionLabel, 'Review organiser terms');
  assert.equal(buildNotificationPresentation(buildTermsNotice({ _id: 'terms', versionNumber: '1.2' })).actionLabel, 'Review terms');
});

test('shared notice worker restricts Organiser Terms delivery to active organizer accounts', async () => {
  let claimQuery;
  let userQuery;
  let operations;
  const policy = { _id: 'org123', slug: 'organiser-terms', versionNumber: '1.1', publishedAt: new Date('2026-07-19'), noticeDispatch: { audienceBeforeAt: new Date('2026-07-19'), lastUserId: null } };
  const Policy = { findOneAndUpdate: (query) => { claimQuery = query; return { lean: async () => policy }; }, updateOne: async () => ({}) };
  const Users = { find: (query) => { userQuery = query; return { select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ _id: 'organizer1' }] }) }) }) }; } };
  const Notifications = { bulkWrite: async (ops) => { operations = ops; } };
  await processPolicyNoticeBatch({ Policy, Users, Notifications, now: new Date('2026-07-20') });
  assert.deepEqual(claimQuery.slug.$in.sort(), ['acceptable-use-policy', 'community-guidelines', 'cookie-policy', 'data-usage-policy', 'organiser-terms', 'privacy-policy', 'refund-and-cancellation-policy', 'terms-of-service']);
  assert.equal(userQuery.role, 'organiser');
  assert.deepEqual(userQuery.accountStatus, { $ne: 'closed' });
  assert.equal(operations[0].updateOne.upsert, true);
  assert.equal(operations[0].updateOne.filter.dedupeKey, 'organiser-terms:org123');
});

test('admin publication queues organizer notice without changing acknowledgement persistence', () => {
  assert.match(policyController, /policyDocument\.key === 'organiserTerms'/);
  assert.match(policyController, /noticeDispatch = \{[\s\S]*status: 'pending'[\s\S]*audienceBeforeAt: now/);
  assert.doesNotMatch(policyController, /organizerEventCreationAcknowledgement/);
});
