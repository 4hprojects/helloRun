'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const policyViewPath = path.join(ROOT, 'src/views/pages/policy.ejs');
const partialPath = path.join(ROOT, 'src/views/pages/partials/cookie-policy.ejs');
const policyView = read('src/views/pages/policy.ejs');
const partial = read('src/views/pages/partials/cookie-policy.ejs');
const preferencePartial = read('src/views/partials/cookie-preferences.ejs');
const headPartial = read('src/views/partials/privacy-head.ejs');
const css = read('src/public/css/cookie-policy.css');
const preferenceCss = read('src/public/css/cookie-preferences.css');
const preferenceJs = read('src/public/js/cookie-preferences.js');
const head = read('src/views/layouts/head.ejs');
const mainLayout = read('src/views/layouts/main.ejs');
const adMiddleware = read('src/middleware/ad.middleware.js');
const source = read('docs/policy-markdown-pack/cookie-policy.md');
const legacy = read('docs/contents/Cookie Policy.md');
const { buildPublicPolicyPresentation } = require('../src/services/public-policy-presentation.service');
const { prepareCookiePolicyDraft } = require('../src/services/cookie-policy-draft.service');
const { buildCookiePolicyNotice } = require('../src/services/policy-notice.service');
const { buildNotificationPresentation } = require('../src/services/notification.service');

test('Cookie Policy presentation supplies the real category and storage inventory', () => {
  const presentation = buildPublicPolicyPresentation({
    policyDocument: { key: 'cookie', title: 'Cookie Policy', dbTitle: 'HelloRun Cookie Policy' },
    policyHtml: '<h1>HelloRun Cookie Policy</h1><p><strong>Last Updated:</strong> May 23, 2026</p><h2>Choices</h2><p>Text</p>',
    policyMeta: { versionNumber: '1.0', effectiveDate: '2026-05-23T00:00:00+08:00' }
  });
  assert.equal(presentation.isCookiePolicy, true);
  assert.doesNotMatch(presentation.contentHtml, /HelloRun Cookie Policy|Last Updated/);
  assert.equal(presentation.cookieCategories.length, 4);
  assert.equal(presentation.cookieStorageMatrix.length, 8);
  assert.match(JSON.stringify(presentation.cookieStorageMatrix), /hr\.sid/);
  assert.match(JSON.stringify(presentation.cookieStorageMatrix), /hr\.cookie_preferences/);
  assert.equal(presentation.cookieChoiceGuidance.length, 3);
});

test('policy, banner, dialog, and no-JavaScript form are accessible and responsive', () => {
  assert.doesNotThrow(() => ejs.compile(policyView, { filename: policyViewPath }));
  assert.doesNotThrow(() => ejs.compile(partial, { filename: partialPath }));
  for (const marker of ['Manage preferences', 'What HelloRun and configured providers store', 'What happens when optional storage is off', 'cookie-choices', 'Print policy', 'policy-changes']) assert.match(partial, new RegExp(marker));
  for (const marker of ['Reject optional', 'Accept all', 'Customize', 'Always on', 'aria-live', 'data-open-cookie-preferences']) assert.match(preferencePartial, new RegExp(marker));
  assert.match(partial, /method="POST" action="\/cookie-preferences"/);
  assert.match(css, /max-width:70ch/);
  assert.match(css, /@media print/);
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(preferenceCss, /min-height:44px/);
  assert.match(preferenceCss, /@media\(max-width:360px\)/);
  assert.doesNotMatch(partial, /ad-unit|run-proof-modal-dialog/i);
});

test('Google tags and ad placements are gated by independent choices', () => {
  assert.match(headPartial, /analytics_storage: 'denied'/);
  assert.match(headPartial, /ad_storage: 'denied'/);
  assert.match(headPartial, /ad_user_data: 'denied'/);
  assert.match(headPartial, /ad_personalization: 'denied'/);
  assert.match(head, /locals\.canUseAnalytics && process\.env\.GA_MEASUREMENT_ID/);
  assert.match(mainLayout, /locals\.canUseAnalytics && process\.env\.GA_MEASUREMENT_ID/);
  assert.match(adMiddleware, /!req\.cookiePreferences\?\.advertising/);
  assert.ok(head.indexOf("include('../partials/privacy-head')") < head.indexOf('pagead2.googlesyndication.com'));
});

test('Functional withdrawal clears only HelloRun-owned keys and browser features check consent', () => {
  assert.match(preferenceJs, /key\.startsWith\('helloRun:'\)/);
  assert.doesNotMatch(preferenceJs, /localStorage\.clear\(|sessionStorage\.clear\(/);
  assert.match(read('src/public/js/main.js'), /HelloRunPrivacy\?\.functional/);
  assert.match(read('src/public/js/run-proof-modal.js'), /canStoreRunProofDraft/);
  assert.match(read('src/public/js/runner-dashboard.js'), /canStorePreferences/);
});

test('corrected draft accurately separates policy agreement, choices, and provider boundaries', () => {
  for (const phrase of ['Henson M. Sagorsor, operating as 4HProjects', '`hr.sid`', '`hr.cookie_preferences`', 'Functional, Analytics, and Advertising are off', 'Google Consent Mode', 'not a Google-certified consent management platform', 'does not enable optional browser storage']) assert.match(source, new RegExp(phrase, 'i'));
  assert.doesNotMatch(source, /Last Updated:|4HProjects Inc|guarantee.*AdSense approval/i);
  assert.match(legacy, /Last Updated:\*\* May 23, 2026/);
});

test('draft preparation creates a notice-free baseline and an idempotent next draft', async () => {
  const records = [];
  const chain = (items) => ({ select: () => ({ lean: async () => items }), lean: async () => items[0] || null });
  const Model = {
    findOne: (query) => chain(records.filter((item) => Object.entries(query).every(([key, value]) => item[key] === value))),
    find: (query) => chain(records.filter((item) => item.slug === query.slug)),
    create: async (payload) => { const record = { _id: `id${records.length + 1}`, ...payload }; records.push(record); return { ...record, toObject: () => record }; }
  };
  const options = { Model, legacyMarkdown: legacy, contentMarkdown: source };
  const first = await prepareCookiePolicyDraft(options);
  const second = await prepareCookiePolicyDraft(options);
  assert.equal(first.baselineCreated, true);
  assert.equal(first.baseline.noticeDispatch.status, 'none');
  assert.equal(first.policy.versionNumber, '1.1');
  assert.equal(first.policy.status, 'draft');
  assert.equal(second.draftCreated, false);
  assert.equal(records.length, 2);
});

test('future Cookie Policy notifications are deduplicated and runner-safe', () => {
  const notice = buildCookiePolicyNotice({ _id: 'cookie123', versionNumber: '1.1', summaryOfChanges: 'Clearer browser choices.' });
  assert.equal(notice.type, 'cookie_policy_updated');
  assert.equal(notice.href, '/cookie-policy#policy-changes');
  assert.equal(notice.dedupeKey, 'cookie-policy:cookie123');
  assert.equal(buildNotificationPresentation(notice).actionLabel, 'Review cookie policy');
});
