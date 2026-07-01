const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readAdminRoutesSource() {
  return fs.readFileSync(path.resolve(__dirname, '../src/routes/admin.routes.js'), 'utf8');
}

test('auth.middleware exports requireFullAdmin and isFullAdminTier', () => {
  const { requireFullAdmin, isFullAdminTier } = require('../src/middleware/auth.middleware');
  assert.equal(typeof requireFullAdmin, 'function');
  assert.equal(typeof isFullAdminTier, 'function');
});

test('isFullAdminTier treats missing/undefined adminTier as full, only "support" as restricted', () => {
  const { isFullAdminTier } = require('../src/middleware/auth.middleware');

  assert.equal(isFullAdminTier(null), false);
  assert.equal(isFullAdminTier(undefined), false);
  assert.equal(isFullAdminTier({}), true);
  assert.equal(isFullAdminTier({ adminTier: undefined }), true);
  assert.equal(isFullAdminTier({ adminTier: 'full' }), true);
  assert.equal(isFullAdminTier({ adminTier: 'support' }), false);
});

test('admin.routes.js imports requireFullAdmin from auth.middleware', () => {
  const source = readAdminRoutesSource();
  assert.match(source, /const\s*\{\s*requireAdmin,\s*requireFullAdmin\s*\}\s*=\s*require\('..\/middleware\/auth\.middleware'\)/);
});

test('user and event deletion routes require full admin', () => {
  const source = readAdminRoutesSource();
  ["'/users/delete'", "'/users/:id/delete'", "'/events/bulk-delete'", "'/events/:id/delete'"].forEach((routePath) => {
    const pattern = new RegExp(`${routePath}[\\s\\S]*?requireFullAdmin`);
    assert.match(source, pattern, `${routePath} should require full admin`);
  });
});

test('mass-email, settings, and site-config routes require full admin', () => {
  const source = readAdminRoutesSource();
  [
    "'/promote'",
    "'/communications/settings'",
    "'/communications/events/:eventKey'",
    "'/communications/test-email'",
    "'/homepage-carousel'",
    "'/ads'"
  ].forEach((routePath) => {
    const pattern = new RegExp(`${routePath}[\\s\\S]*?requireFullAdmin`);
    assert.match(source, pattern, `${routePath} should require full admin`);
  });
});

test('policy publish routes (hardcoded and dynamic) require full admin', () => {
  const source = readAdminRoutesSource();
  [
    "'/privacy-policy/:id/publish'",
    "'/terms-and-conditions/:id/publish'",
    "'/cookie-policy/:id/publish'"
  ].forEach((routePath) => {
    const pattern = new RegExp(`${routePath}[\\s\\S]*?requireFullAdmin`);
    assert.match(source, pattern, `${routePath} should require full admin`);
  });
  assert.match(source, /adminSlug\}\/:id\/publish`, requireAdmin, requireFullAdmin/);
});

test('all 6 export routes require full admin', () => {
  const source = readAdminRoutesSource();
  [
    "'/users/export.csv'", "'/users/export.xlsx'",
    "'/audit/export.csv'", "'/audit/export.xlsx'",
    "'/analytics/export.csv'", "'/analytics/export.xlsx'"
  ].forEach((routePath) => {
    const pattern = new RegExp(`${routePath}[\\s\\S]*?requireFullAdmin`);
    assert.match(source, pattern, `${routePath} should require full admin`);
  });
});

test('support-safe routes do NOT require full admin', () => {
  const source = readAdminRoutesSource();
  const lines = source.split('\n');

  const supportSafeRoutePaths = [
    "'/users/:id/edit'",
    "'/events/:id/edit'",
    "'/events/:id/media/remove'",
    "'/events/:id/sitemap-toggle'",
    "'/applications/:id/approve'",
    "'/applications/:id/reject'",
    "'/badges/recalculate'",
    "'/user-badges/:userBadgeId/revoke'"
  ];

  supportSafeRoutePaths.forEach((routePath) => {
    const line = lines.find((l) => l.includes(routePath));
    assert.ok(line, `expected to find a route registration for ${routePath}`);
    assert.ok(!line.includes('requireFullAdmin'), `${routePath} should stay support-safe (no requireFullAdmin), got: ${line}`);
  });
});

test('User model defines adminTier with a safe full default', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/models/User.js'), 'utf8');
  assert.match(source, /adminTier:\s*\{[\s\S]*?enum:\s*\['full', 'support'\][\s\S]*?default:\s*'full'/);
});
