const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ACTIVE_QUEST_CATEGORY_UNMET_REVOKE_REASON,
  isActiveQuestCategoryBadgeEligible,
  resolveSelectedRaceDistance
} = require('../src/services/badge-progress.service');
const { resolveEventBadgeImageUrl } = require('../src/services/event-badge.service');
const {
  getRewardReadiness,
  isValidActiveQuestCertificateTemplate,
  materializeActiveQuestCertificateTemplate
} = require('../src/services/active-quest-generator.service');
const { buildPublicCertificateData } = require('../src/services/certificateVerification.service');

function context(approvedDistanceKm) {
  return {
    eventSeriesKey: 'active-quest',
    selectedTargetDistanceKm: 25,
    selectedRaceDistance: '25K',
    approvedDistanceKm
  };
}

function badge(distance) {
  return { id: distance, requirement_value: { raceDistance: `${distance}K` } };
}

test('selected category badge uses the exact approved-distance threshold', () => {
  assert.equal(isActiveQuestCategoryBadgeEligible(context(24.99), badge(25)), false);
  assert.equal(isActiveQuestCategoryBadgeEligible(context(25), badge(25)), true);
});

test('pending distance cannot qualify and over-target distance stays in selected category', () => {
  const pendingOnly = { ...context(0), pendingDistanceKm: 30 };
  assert.equal(isActiveQuestCategoryBadgeEligible(pendingOnly, badge(25)), false);
  assert.equal(isActiveQuestCategoryBadgeEligible(context(205), badge(25)), true);
  assert.equal(isActiveQuestCategoryBadgeEligible(context(205), badge(200)), false);
});

test('selected category resolves from category data before event-wide target', () => {
  const registration = { pricingSnapshot: { raceCategoryId: 'aq-50' } };
  const event = { raceCategories: [{ categoryId: 'aq-50', distanceLabel: '50K', distanceKm: 50 }] };
  assert.equal(resolveSelectedRaceDistance(registration, event, 200), '50K');
});

test('late reversal makes the selected badge ineligible with an auditable reason', () => {
  assert.equal(isActiveQuestCategoryBadgeEligible(context(25), badge(25)), true);
  assert.equal(isActiveQuestCategoryBadgeEligible(context(24.99), badge(25)), false);
  assert.match(ACTIVE_QUEST_CATEGORY_UNMET_REVOKE_REASON, /after review/i);
});

test('each distance badge receives its frozen category asset', () => {
  const event = {
    seriesSnapshot: {
      categories: [
        { targetKm: 25, badgeAssetUrl: 'https://cdn.example.com/25.png' },
        { targetKm: 50, badgeAssetUrl: 'https://cdn.example.com/50.png' }
      ]
    }
  };
  assert.equal(resolveEventBadgeImageUrl(event, {
    requirementType: 'distance_completed',
    requirementValue: { raceDistance: '50K' }
  }, 'fallback.png'), 'https://cdn.example.com/50.png');
});

test('reward readiness requires all six badges and a verifiable certificate design', () => {
  const certificateTemplate = {
    content: { heading: 'Certificate', bodyText: 'Completed {{goalDistance}} at {{eventTitle}}.' },
    displayOptions: { showCertificateNumber: true, showQrCode: true }
  };
  assert.equal(isValidActiveQuestCertificateTemplate(certificateTemplate), true);
  assert.deepEqual(getRewardReadiness({
    categories: [25, 50, 75, 100, 150, 200].map((targetKm) => ({ targetKm, badgeAssetUrl: `${targetKm}.png` })),
    rewardRequirements: { categoryBadgeRequired: true, digitalCertificateRequired: true, certificateTemplate }
  }), { badgesReady: true, certificateReady: true });
  assert.equal(getRewardReadiness({
    categories: [{ targetKm: 25, badgeAssetUrl: '' }],
    rewardRequirements: { categoryBadgeRequired: true, digitalCertificateRequired: true, certificateTemplate }
  }).badgesReady, false);
});

test('certificate materialization is idempotent for an edition', async () => {
  const existing = { _id: 'existing-template' };
  let createCalls = 0;
  const Model = {
    findOne: async () => existing,
    create: async () => { createCalls += 1; }
  };
  const result = await materializeActiveQuestCertificateTemplate({
    event: { _id: 'event-1', title: 'November Active Quest 2026' },
    config: {
      content: { heading: 'Certificate', bodyText: 'Completed {{goalDistance}}.' },
      displayOptions: { showCertificateNumber: true, showQrCode: true }
    },
    CertificateTemplateModel: Model
  });
  assert.equal(result, existing);
  assert.equal(createCalls, 0);
});

test('public certificate verification excludes private participant fields', () => {
  const publicData = buildPublicCertificateData({
    certificate: { certificateNumber: 'HR-AQ-1', status: 'generated' },
    eventId: { title: 'Active Quest' },
    registrationId: { raceDistance: '25K', participant: { email: 'private@example.com', mobile: '09170000000' } },
    runnerId: { firstName: 'Ana', lastName: 'R.' }
  });
  assert.equal(publicData.runnerName, 'Ana R.');
  assert.equal(Object.hasOwn(publicData, 'email'), false);
  assert.equal(Object.hasOwn(publicData, 'mobile'), false);
  assert.equal(Object.hasOwn(publicData, 'confirmationCode'), false);
});
