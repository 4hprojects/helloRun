const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'src/views/runner/notifications.ejs'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/public/css/runner-notifications.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'src/public/js/runner-notifications.js'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'src/routes/runner.routes.js'), 'utf8');

test('notification center exposes compact status views and runner controls', () => {
  assert.match(template, /Runner updates/);
  assert.match(template, /Notification preferences/);
  assert.match(template, /notification-view-nav/);
  assert.match(template, /notifications\.counts\.current/);
  assert.match(template, /notifications\.counts\.unread/);
  assert.match(template, /notifications\.counts\.archived/);
  assert.match(template, /Archive all read/);
  assert.match(template, /data-high-risk-confirm/);
  assert.match(template, /toolbarActionCount === 1 \? 'has-single-action'/);
  assert.doesNotMatch(template, /notification-type.*item\.type/);
});

test('notification rows retain a native disclosure fallback and enhanced accessible dialog', () => {
  assert.match(template, /<details class="notification-item/);
  assert.match(template, /<summary class="notification-summary">/);
  assert.match(template, /data-notification-read-form/);
  assert.match(template, /data-notification-state-form/);
  assert.match(template, /<dialog class="notification-dialog"/);
  assert.match(template, /aria-labelledby="notificationDialogTitle"/);
  assert.match(template, /aria-live="polite"/);
  assert.match(script, /dialog\.showModal\(\)/);
  assert.match(script, /activeSummary\.focus\(\)/);
  assert.match(script, /trapDialogFocus/);
  assert.match(script, /Accept: 'application\/json'/);
});

test('notification actions and visual treatment preserve accessibility invariants', () => {
  assert.match(routes, /notifications\/archive-read/);
  assert.match(routes, /notifications\/:notificationId\/archive/);
  assert.match(routes, /notifications\/:notificationId\/restore/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /border-left(?:-color)?\s*:/);
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /\.notifications-toolbar-actions\.has-single-action\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(css, /\.notifications-toolbar-actions \.btn\s*\{\s*width:\s*100%\s*!important/);
  assert.match(css, /\.notifications-toolbar-actions \.btn[\s\S]*?justify-content:\s*center\s*!important/);
  assert.match(css, /\.notifications-toolbar h2\s*\{\s*text-align:\s*center/);
  assert.match(css, /\.notification-dialog \.btn-secondary[\s\S]*?justify-content:\s*center\s*!important/);
  assert.match(css, /\.notification-list[\s\S]*?flex-direction:\s*column[\s\S]*?gap:\s*0\.6rem/);
  assert.match(css, /\.notification-item[\s\S]*?border:\s*1px solid var\(--notify-line\)[\s\S]*?border-radius:\s*14px/);
  assert.match(css, /\.notification-summary\s*\{[\s\S]*?grid-template-columns:\s*40px minmax\(0, 1fr\)[\s\S]*?align-items:\s*start/);
  assert.match(css, /\.notification-summary > \.notification-icon\s*\{\s*align-self:\s*start/);
  assert.match(css, /width:\s*min\(calc\(100% - 2rem\), 560px\)/);
  assert.match(css, /\.notification-dialog-heading h2[\s\S]*?text-align:\s*left/);
  assert.match(css, /\.notification-dialog-actions[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.notification-dialog-actions\.has-single-action\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(css, /\.notification-dialog-actions \.btn[\s\S]*?min-height:\s*48px\s*!important/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /white-space:\s*normal/);
  assert.match(script, /has-single-action/);
  assert.match(css, /\.notifications-pagination[\s\S]*?grid-template-columns:\s*minmax\(76px, 1fr\) auto minmax\(76px, 1fr\)/);
  assert.match(css, /grid-template-areas:\s*"page page" "previous next"/);
  assert.match(css, /\.notifications-pagination > \.btn[\s\S]*?width:\s*100%/);
});
