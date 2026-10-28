const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { getAutoApprovalEligibility } = require('../src/services/event-approval.service');
const { getActiveQuestPublicationErrors } = require('../src/services/active-quest-readiness.service');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/admin/active-quest.ejs');
const view = fs.readFileSync(viewPath, 'utf8');
const routes = fs.readFileSync(path.join(ROOT, 'src/routes/admin.routes.js'), 'utf8');
const controller = fs.readFileSync(path.join(ROOT, 'src/controllers/admin/active-quest.controller.js'), 'utf8');
const eventController = fs.readFileSync(path.join(ROOT, 'src/controllers/admin/events.controller.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/public/css/admin.css'), 'utf8');

test('Active Quest admin view compiles and exposes clear private-draft hierarchy', () => {
  assert.doesNotThrow(() => ejs.compile(view, { filename: viewPath }));
  assert.match(view, /Prepare templates and private monthly drafts/);
  assert.match(view, /Publication stays in the existing event review flow/);
  assert.match(view, /Generate Private Draft/);
  assert.match(view, /Auto-publication/);
  assert.match(view, /Locked off pending separate approval/);
});

test('every Active Quest admin route requires both admin and full-admin access', () => {
  const routeLines = routes.split('\n').filter((line) => line.includes("'/active-quest"));
  assert.ok(routeLines.length >= 8);
  for (const line of routeLines) {
    assert.match(line, /requireAdmin, requireFullAdmin/);
  }
  assert.match(routes, /router\.use\([\s\S]*requireCsrfProtection/);
  assert.match(routes, /active-quest\/editions'[\s\S]*adminContentSettingsLimiter/);
});

test('admin forms use visible labels, CSRF tokens, and useful disabled states', () => {
  assert.match(view, /name="_csrf"/);
  assert.match(view, /<label for="aqMonth">/);
  assert.match(view, /<label for="aqSettingsReason">/);
  assert.match(view, /aria-label="Reason for changing/);
  assert.match(view, /Enable both Series and Draft generation flags first/);
  assert.match(view, /No monthly editions yet/);
});

test('admin styling follows existing product cards, responsive grids, and 44px controls', () => {
  assert.match(css, /\.active-quest-admin-card/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*active-quest-admin-layout/);
  assert.doesNotMatch(css, /\.active-quest[^}]*transition:\s*all/i);
});

test('Active Quest event edits require full admin and persistent override provenance', () => {
  assert.match(eventController, /event\.seriesKey === 'active-quest'/);
  assert.match(eventController, /Active Quest edition changes require full admin access/);
  assert.match(eventController, /seriesAdminOverrides\.push/);
  assert.match(eventController, /active_quest\.edition_overridden/);
  assert.match(eventController, /actorIsFullAdmin/);
});

test('Active Quest cannot use organizer auto-approval', async () => {
  const eligibility = await getAutoApprovalEligibility({
    _id: 'event-1',
    status: 'pending_review',
    seriesKey: 'active-quest',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'free',
    pricingMode: 'free',
    organizerId: 'organizer-1'
  }, {
    organizer: {
      _id: 'organizer-1',
      role: 'organiser',
      organizerStatus: 'approved',
      emailVerified: true,
      accountStatus: 'active'
    }
  });
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.reasons.includes('active_quest_requires_manual_full_admin_approval'));
});

test('publication readiness blocks missing rewards, assets, and structured dates', () => {
  const errors = getActiveQuestPublicationErrors({
    seriesKey: 'active-quest',
    seriesYear: 2026,
    seriesMonth: 11,
    seriesTemplateVersionId: 'template-1',
    generatedFromKey: 'active-quest:2026-11:v1',
    seriesSnapshot: {
      categories: [25, 50, 75, 100, 150, 200].map((targetKm) => ({ targetKm, badgeAssetUrl: '' })),
      rewardRequirements: { certificateTemplateVersionId: null }
    },
    seriesSchedule: {
      timezone: 'Asia/Manila',
      boundaryMode: 'half_open',
      display: { activityStart: 'November 1, 2026' }
    },
    raceCategories: [25, 50, 75, 100, 150, 200].map((distanceKm) => ({ distanceKm })),
    status: 'pending_review',
    eventDetailsMarkdown: '',
    digitalBadgeEnabled: false,
    digitalCertificateEnabled: false,
    bannerImageUrl: '',
    posterImageUrl: '',
    autoEmailPromotionEnabled: false
  });
  assert.ok(errors.some((error) => /six category badge assets/i.test(error)));
  assert.ok(errors.some((error) => /certificate template/i.test(error)));
  assert.ok(errors.some((error) => /banner and poster/i.test(error)));
  assert.ok(errors.some((error) => /November 1, 2026/i.test(error)));
});

test('admin controller separates initialization, template versioning, flags, and edition generation', () => {
  for (const action of [
    'initializeActiveQuestFoundation',
    'createActiveQuestTemplateDraft',
    'publishActiveQuestTemplate',
    'updateActiveQuestFeatureFlag',
    'generateActiveQuestEdition'
  ]) assert.match(controller, new RegExp(action));
});
