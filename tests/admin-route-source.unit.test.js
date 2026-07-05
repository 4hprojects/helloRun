const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readAdminRoutesSource() {
  return fs.readFileSync(path.resolve(__dirname, '../src/routes/admin.routes.js'), 'utf8');
}

test('admin.routes.js defines the new rate limiters', () => {
  const source = readAdminRoutesSource();
  ['adminContentSettingsLimiter', 'adminTestEmailLimiter', 'adminPromotionLimiter'].forEach((limiter) => {
    assert.match(source, new RegExp(`const ${limiter} = createRateLimiter\\(`));
  });
});

test('user delete/edit routes use the shared account action limiter', () => {
  const source = readAdminRoutesSource();
  assert.match(source, /'\/users\/delete'[\s\S]*?adminAccountActionLimiter/);
  assert.match(source, /'\/users\/:id\/edit'[\s\S]*?adminAccountActionLimiter/);
  assert.match(source, /'\/users\/:id\/delete'[\s\S]*?adminAccountActionLimiter/);
});

test('badge, event, and application mutation routes use the shared moderation limiter', () => {
  const source = readAdminRoutesSource();
  [
    "'/badges/recalculate'",
    "'/badge-definitions/:badgeDefinitionId/status'",
    "'/badge-definitions/:badgeDefinitionId/email'",
    "'/user-badges/:userBadgeId/revoke'",
    "'/events/:id/edit'",
    "'/events/:id/media/remove'",
    "'/events/:id/sitemap-toggle'",
    "'/applications/:id/approve'",
    "'/applications/:id/reject'"
  ].forEach((routePath) => {
    const pattern = new RegExp(`${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?adminModerationLimiter`);
    assert.match(source, pattern, `${routePath} should use adminModerationLimiter`);
  });
});

test('communications, homepage-carousel, ads, and policy CRUD routes use the shared content settings limiter', () => {
  const source = readAdminRoutesSource();
  [
    "'/communications/settings'",
    "'/communications/events/:eventKey'",
    "'/homepage-carousel'",
    "'/ads'",
    "'/privacy-policy'",
    "'/privacy-policy/:id/publish'",
    "'/terms-and-conditions/:id/publish'",
    "'/cookie-policy/:id/publish'"
  ].forEach((routePath) => {
    const pattern = new RegExp(`${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?adminContentSettingsLimiter`);
    assert.match(source, pattern, `${routePath} should use adminContentSettingsLimiter`);
  });

  assert.match(source, /adminSlug\}`, requireAdmin, adminContentSettingsLimiter, adminController\.createPolicyDocumentDraft/);
});

test('test-email route uses the dedicated test-email limiter', () => {
  const source = readAdminRoutesSource();
  assert.match(source, /'\/communications\/test-email'[\s\S]*?adminTestEmailLimiter/);
});

test('promote route uses the dedicated promotion limiter', () => {
  const source = readAdminRoutesSource();
  assert.match(source, /'\/promote'[\s\S]*?adminPromotionLimiter/);
});

test('every mutating admin route has a rate limiter', () => {
  const source = readAdminRoutesSource();
  const mutationLines = source
    .split('\n')
    .filter((line) => /router\.(post|put|patch|delete)\(/.test(line));

  const knownLimiters = [
    'adminModerationLimiter',
    'adminAccountActionLimiter',
    'adminBlogAutosaveLimiter',
    'adminContentSettingsLimiter',
    'adminTestEmailLimiter',
    'adminPromotionLimiter',
    'adminExportLimiter',
    'adminTestDataPurgeLimiter',
    'adminTestUserPurgeLimiter'
  ];

  const unprotected = mutationLines.filter((line) => !knownLimiters.some((limiter) => line.includes(limiter)));
  assert.deepEqual(unprotected, [], `Found mutating routes without a rate limiter: ${unprotected.join('\n')}`);
});
