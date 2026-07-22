'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const policyViewPath = path.join(ROOT, 'src/views/pages/policy.ejs');
const partialPath = path.join(ROOT, 'src/views/pages/partials/privacy-policy.ejs');
const policyView = read('src/views/pages/policy.ejs');
const partial = read('src/views/pages/partials/privacy-policy.ejs');
const css = read('src/public/css/privacy-policy.css');
const source = read('docs/policy-markdown-pack/privacy-policy.md');
const legacy = read('docs/contents/Privacy Policy.md');
const registry = read('src/services/policy-registry.service.js');
const controller = read('src/controllers/admin/policy.controller.js');
const { buildPublicPolicyPresentation } = require('../src/services/public-policy-presentation.service');
const { preparePrivacyPolicyDraft } = require('../src/services/privacy-policy-draft.service');
const { buildPrivacyPolicyNotice } = require('../src/services/policy-notice.service');
const { buildNotificationPresentation } = require('../src/services/notification.service');

test('Privacy presentation is rights-first and normalizes the published agreement', () => {
  const presentation = buildPublicPolicyPresentation({
    policyDocument: { key: 'privacy', title: 'Privacy Policy', dbTitle: 'HelloRun Privacy Policy' },
    policyHtml: '<h1>HelloRun Privacy Policy</h1><p><strong>Last Updated:</strong> May 23, 2026</p><h1>Rights</h1><p>Text</p><h2>Rights</h2>',
    policyMeta: { versionNumber: '1.4', effectiveDate: '2026-06-18T00:00:00+08:00' }
  });
  assert.equal(presentation.isPrivacy, true);
  assert.doesNotMatch(presentation.contentHtml, /HelloRun Privacy Policy|Last Updated/);
  assert.equal(presentation.privacyBoundaries.length, 3);
  assert.equal(presentation.privacyRights.length, 9);
  assert.equal(presentation.privacyProcessing.length, 11);
  assert.equal(new Set(presentation.contents.map((item) => item.id)).size, presentation.contents.length);
  assert.match(JSON.stringify(presentation.privacyProcessing), /Activity proof|Organizer exports|Advertising/);
});

test('Privacy template provides server contents, practical controls, and responsive legal reading', () => {
  assert.doesNotThrow(() => ejs.compile(policyView, { filename: policyViewPath }));
  assert.doesNotThrow(() => ejs.compile(partial, { filename: partialPath }));
  assert.match(policyView, /policyPresentation\.isPrivacy/);
  for (const marker of ['Make a privacy request', 'Choose the right next step', 'How each information category is handled', 'policy-changes', 'Complete Privacy Policy']) assert.match(partial, new RegExp(marker));
  assert.match(partial, /\/contact\?topic=privacy_data/);
  assert.match(partial, /policyPresentation\.contents\.forEach/);
  assert.equal((partial.match(/<h1\b/g) || []).length, 1);
  assert.match(css, /max-width:70ch/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /@media print/);
  assert.match(css, /@media\(max-width:500px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(partial, /ad-unit|adsense|run-proof-modal-dialog/i);
  assert.equal(fs.existsSync(path.join(ROOT, 'src/views/pages/privacy.ejs')), false);
});

test('corrected draft covers current privacy workflows without unsupported promises', () => {
  for (const phrase of ['Henson M. Sagorsor, operating as 4HProjects', 'accumulated distance may exceed', 'Recognition records may snapshot', 'report preserves a private snapshot', 'Google Ads Settings', 'web beacons', 'IP addresses', 'previous visits', 'Google-certified consent management platform', 'Not every technical or security event']) assert.match(source, new RegExp(phrase, 'i'));
  assert.match(source, /transparently[\s\S]*legitimate purposes[\s\S]*proportionate/i);
  assert.match(source, /\/contact\?topic=privacy_data/);
  assert.doesNotMatch(source, /Last Updated:|Recommended Retention|4HProjects Inc|guarantee.*AdSense/i);
  assert.match(legacy, /Last Updated:\*\* May 23, 2026/);
  assert.match(registry, /key: 'privacy'[\s\S]*fallbackVersion: '1\.0'/);
});

test('draft preparation preserves a current v1.4 and creates one idempotent v1.5 draft', async () => {
  const records = [{ _id: 'live', slug: 'privacy-policy', versionNumber: '1.4', status: 'published', isCurrent: true, contentMarkdown: legacy }];
  const chain = (items) => ({ select: () => ({ lean: async () => items }), lean: async () => items[0] || null });
  const Model = {
    findOne: (query) => chain(records.filter((item) => Object.entries(query).every(([key, value]) => item[key] === value))),
    find: (query) => chain(records.filter((item) => item.slug === query.slug)),
    create: async (payload) => { const record = { _id: `id${records.length + 1}`, ...payload }; records.push(record); return { ...record, toObject: () => record }; }
  };
  const options = { Model, legacyMarkdown: legacy, contentMarkdown: source };
  const first = await preparePrivacyPolicyDraft(options);
  const second = await preparePrivacyPolicyDraft(options);
  assert.equal(first.baselineCreated, false);
  assert.equal(first.baseline.versionNumber, '1.4');
  assert.equal(first.policy.versionNumber, '1.5');
  assert.equal(first.policy.status, 'draft');
  assert.equal(second.draftCreated, false);
  assert.equal(records.length, 2);
});

test('future publication queues a non-blocking deduplicated Privacy notice', () => {
  const notice = buildPrivacyPolicyNotice({ _id: 'privacy15', versionNumber: '1.5', summaryOfChanges: 'Clearer rights and controls.' });
  assert.equal(notice.type, 'privacy_policy_updated');
  assert.equal(notice.href, '/privacy#policy-changes');
  assert.equal(notice.dedupeKey, 'privacy-policy:privacy15');
  assert.equal(buildNotificationPresentation(notice).actionLabel, 'Review privacy policy');
  assert.match(controller, /policyDocument\.key === 'privacy'/);
});
