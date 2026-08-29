const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('runner dashboard promotes social pages safely and supports versioned dismissal', () => {
  const view = fs.readFileSync(path.join(root, 'src/views/runner/dashboard.ejs'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'src/public/js/runner-dashboard.js'), 'utf8');
  assert.match(view, /data-social-follow-card/);
  assert.match(view, /https:\/\/instagram\.com\/hellorunonline/);
  assert.match(view, /https:\/\/facebook\.com\/hellorunonline/);
  assert.equal((view.match(/rel="noopener noreferrer"/g) || []).length >= 2, true);
  assert.match(js, /hellorun\.social-follow-card\.dismissed\.v/);
  assert.match(js, /localStorage/);
});

test('analytics UI renders activation conversion and channel outcomes', () => {
  const view = fs.readFileSync(path.join(root, 'src/views/admin/analytics.ejs'), 'utf8');
  assert.match(view, /Runner Activation Reminders/);
  assert.match(view, /submissionConversionRate/);
  assert.match(view, /emailQueued/);
  assert.match(view, /emailSuppressed/);
  assert.match(view, /inAppSent/);
});
