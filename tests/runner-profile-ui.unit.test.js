'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('runner profile templates compile and expose the compact account hierarchy', () => {
  const shell = read('src/views/runner/profile.ejs');
  const main = read('src/views/runner/partials/profile-main.ejs');
  ejs.compile(shell, { filename: path.join(root, 'src/views/runner/profile.ejs') });
  ejs.compile(main, { filename: path.join(root, 'src/views/runner/partials/profile-main.ejs') });
  assert.match(main, /<h1>My Profile<\/h1>/);
  assert.match(main, /Profile completion/);
  for (const label of ['Personal details', 'Preferences', 'Connections', 'Security', 'Achievements']) {
    assert.match(main, new RegExp(label));
  }
  assert.equal((main.match(/<h1\b/g) || []).length, 1);
});

test('legacy profile anchors and mutation routes remain compatible', () => {
  const main = read('src/views/runner/partials/profile-main.ejs');
  const badgeCard = read('src/views/runner/partials/profile-badge-card.ejs');
  const profileMarkup = `${main}\n${badgeCard}`;
  for (const id of ['overview', 'identity', 'contact', 'location', 'emergency', 'notifications', 'badges', 'integrations', 'account']) {
    assert.match(main, new RegExp(`id="${id}"`));
  }
  for (const route of [
    '/runner/profile/identity', '/runner/profile/contact', '/runner/profile/location',
    '/runner/profile/emergency', '/runner/profile/notifications', '/runner/profile/badges/featured',
    '/integrations/strava/disconnect', '/runner/auth/google/unlink'
  ]) {
    assert.match(profileMarkup, new RegExp(route.replaceAll('/', '\\/')));
  }
  assert.ok((profileMarkup.match(/name="_csrf"/g) || []).length >= 8);
});

test('personal details use native edit disclosures with ordinary form submission', () => {
  const main = read('src/views/runner/partials/profile-main.ejs');
  assert.ok((main.match(/data-profile-editor/g) || []).length >= 4);
  assert.ok((main.match(/<details class="profile-edit-disclosure"/g) || []).length >= 4);
  assert.match(main, /data-cancel-profile-edit/);
  assert.match(main, /Email and running-group membership are managed through their own account workflows/);
  assert.match(main, /<dt>Contact number<\/dt><dd><%= p\.emergencyContactNumberMasked %><\/dd>/);
  assert.match(main, /<dt>Mobile<\/dt><dd><%= p\.mobileMasked %><\/dd>/);
  assert.match(main, /<dt>Date of birth<\/dt><dd><%= p\.dateOfBirthMasked %><\/dd>/);
  assert.match(main, /<dt>Email<\/dt><dd class="profile-value-email"><%= p\.identity\.email \|\| 'Not set' %><\/dd>/);
  assert.match(main, /name="emergencyContactNumber" value="<%= profileData\.emergencyContactNumber \|\| '' %>"/);
  assert.match(main, /official event deadlines remain based on Asia\/Manila/);
});

test('avatar and form enhancements provide validation, live feedback, and unsaved protection', () => {
  const main = read('src/views/runner/partials/profile-main.ejs');
  const script = read('src/public/js/runner-profile.js');
  assert.match(main, /id="js-avatar-status" role="status" aria-live="polite"/);
  assert.match(main, /onerror="this\.hidden=true;"/);
  assert.match(script, /image\/jpeg.*image\/png.*image\/webp/);
  assert.match(script, /5 \* 1024 \* 1024/);
  assert.match(script, /beforeunload/);
  assert.match(script, /aria-busy/);
  assert.match(script, /event\.key === 'Escape'/);
  assert.match(script, /event\.key !== 'Tab'/);
});

test('preferences use grouped switches, enabled counts, and explicit dirty-state saving', () => {
  const main = read('src/views/runner/partials/profile-main.ejs');
  const script = read('src/public/js/runner-profile.js');
  const css = read('src/public/css/runner-profile.css');
  assert.match(main, /Results &amp; recognition|group\.label/);
  assert.match(main, /data-preference-count/);
  assert.match(main, /role="switch"/);
  assert.match(main, /data-preference-save/);
  assert.match(main, /data-preference-status role="status" aria-live="polite"/);
  assert.match(script, /setupNotificationPreferences/);
  assert.match(script, /unsaved preference changes/);
  assert.match(script, /saveButton\.disabled = !dirty/);
  assert.match(css, /\.notif-groups[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.notif-checkbox:checked \+ span/);
});

test('achievements are compact by default while all management remains available', () => {
  const main = read('src/views/runner/partials/profile-main.ejs');
  assert.match(main, /previewProgress/);
  assert.match(main, /previewBadges/);
  assert.match(main, /profile-all-achievements/);
  assert.match(main, /View all achievements/);
  assert.match(main, /Public collection/);
  assert.match(read('src/views/runner/partials/profile-badge-card.ejs'), /Feature badge/);
});

test('profile CSS supports compact desktop, disclosed mobile navigation, zoom, and reduced motion', () => {
  const css = read('src/public/css/runner-profile.css');
  assert.match(css, /\.runner-profile-hero\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(230px, 300px\) auto/);
  assert.match(css, /\.profile-personal-grid,[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.profile-personal-grid,[\s\S]*?grid-template-columns: 1fr/);
  assert.match(css, /\.runner-profile-menu-mobile\s*\{ display: none; \}/);
  assert.match(css, /min-height: 2\.75rem/);
  assert.match(css, /focus-visible/);
  assert.match(css, /\.profile-readonly-grid dd[^}]*text-transform: none/);
  assert.match(css, /\.profile-edit-disclosure > summary[^}]*margin-inline: 0 auto/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
