'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { Window } = require('happy-dom');

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

test('security actions retain account protections and balance mobile controls', () => {
  const main = read('src/views/runner/partials/profile-main.ejs');
  const css = read('src/public/css/runner-profile.css');
  assert.match(main, /runner-profile-actions profile-security-actions/);
  assert.match(main, /data-open-password-modal/);
  assert.match(main, /method="POST" action="\/runner\/auth\/google\/unlink"/);
  assert.match(main, /name="_csrf" value="<%= _csrfToken %>"/);
  assert.match(main, /name="returnTo" value="\/runner\/profile"/);
  assert.match(main, /data-open-unlink-modal/);
  assert.match(main, /disabled aria-disabled="true"/);
  assert.match(main, /Set a password before unlinking Google to avoid losing account access/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.profile-security-actions\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.profile-security-actions > :only-child\s*\{ grid-column: 1 \/ -1; \}/);
  assert.match(css, /\.profile-security-actions \.btn\s*\{[^}]*min-height: 2\.75rem[^}]*overflow-wrap: anywhere/);
});

test('Strava connect and disconnect retain fallback routes behind accessible confirmations', () => {
  const main = read('src/views/runner/partials/profile-main.ejs');
  const shell = read('src/views/runner/profile.ejs');
  const script = read('src/public/js/runner-profile.js');
  const css = read('src/public/css/runner-profile.css');
  assert.match(main, /href="\/integrations\/strava\/connect\?returnTo=\/runner\/profile%23integrations"[^>]*data-open-strava-connect-confirm/);
  assert.match(main, /method="POST" action="\/integrations\/strava\/disconnect"[^>]*data-strava-disconnect-form/);
  assert.match(main, /type="submit"[^>]*data-open-strava-disconnect-confirm/);
  assert.match(main, /name="_csrf" value="<%= _csrfToken %>"/);
  assert.match(shell, /id="stravaConnectConfirmModal"[^>]*hidden aria-hidden="true"/);
  assert.match(shell, /id="stravaDisconnectConfirmModal"[^>]*hidden aria-hidden="true"/);
  assert.match(shell, /Continue to Strava/);
  assert.match(shell, /Existing submitted activity records remain available/);
  assert.match(script, /setupStravaConfirmations\(\)/);
  assert.match(script, /event\.preventDefault\(\)/);
  assert.match(script, /form\.submit\(\)/);
  assert.match(script, /lastTrigger\?\.focus\(\)/);
  assert.match(css, /\.strava-confirm-actions\s*\{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test('Strava confirmation dialogs open, cancel, restore focus, and submit once confirmed', () => {
  const window = new Window({ url: 'https://hellorun.test/runner/profile#integrations' });
  window.document.body.innerHTML = `
    <a href="/integrations/strava/connect?returnTo=%2Frunner%2Fprofile%23integrations" data-open-strava-connect-confirm>Connect</a>
    <form data-strava-disconnect-form><button type="submit" data-open-strava-disconnect-confirm>Disconnect</button></form>
    <div id="stravaConnectConfirmModal" hidden aria-hidden="true"><div class="modal-dialog" tabindex="-1"><button data-cancel-strava-connect>Cancel</button><a href="#" data-confirm-strava-connect>Continue</a></div></div>
    <div id="stravaDisconnectConfirmModal" hidden aria-hidden="true"><div class="modal-dialog" tabindex="-1"><button data-cancel-strava-disconnect>Cancel</button><button data-confirm-strava-disconnect>Confirm</button></div></div>`;
  const disconnectForm = window.document.querySelector('[data-strava-disconnect-form]');
  let submitCount = 0;
  disconnectForm.submit = () => { submitCount += 1; };
  window.eval(read('src/public/js/runner-profile.js'));

  const connectTrigger = window.document.querySelector('[data-open-strava-connect-confirm]');
  const connectModal = window.document.getElementById('stravaConnectConfirmModal');
  connectTrigger.click();
  assert.equal(connectModal.hidden, false);
  assert.equal(connectModal.getAttribute('aria-hidden'), 'false');
  assert.equal(window.document.activeElement, connectModal.querySelector('[data-cancel-strava-connect]'));
  connectModal.querySelector('[data-cancel-strava-connect]').click();
  assert.equal(connectModal.hidden, true);
  assert.equal(window.document.activeElement, connectTrigger);

  const disconnectTrigger = window.document.querySelector('[data-open-strava-disconnect-confirm]');
  const disconnectModal = window.document.getElementById('stravaDisconnectConfirmModal');
  const disconnectConfirm = disconnectModal.querySelector('[data-confirm-strava-disconnect]');
  disconnectTrigger.click();
  assert.equal(disconnectModal.hidden, false);
  disconnectConfirm.click();
  assert.equal(submitCount, 1);
  assert.equal(disconnectConfirm.disabled, true);
  assert.equal(disconnectConfirm.getAttribute('aria-busy'), 'true');
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
  assert.match(main, /<details class="runner-profile-card profile-preferences-card" data-preferences-disclosure>/);
  assert.doesNotMatch(main, /data-preferences-disclosure open/);
  assert.match(main, /<summary class="profile-preferences-summary">/);
  assert.match(main, /data-lucide="chevron-down"/);
  assert.match(main, /data-preference-count/);
  assert.match(main, /role="switch"/);
  assert.match(main, /data-preference-save/);
  assert.match(main, /data-preference-status role="status" aria-live="polite"/);
  assert.match(script, /setupNotificationPreferences/);
  assert.match(script, /form\.closest\('\[data-preferences-disclosure\]'\)/);
  assert.match(script, /disclosure\?\.querySelector\('\[data-preference-count\]'\)/);
  assert.match(script, /unsaved preference changes/);
  assert.match(script, /saveButton\.disabled = !dirty/);
  assert.match(css, /\.notif-groups[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.notif-checkbox:checked \+ span/);
  assert.match(css, /\.profile-preferences-summary\s*\{[^}]*min-height: 2\.75rem[^}]*cursor: pointer/);
  assert.match(css, /\.profile-preferences-card\[open\] > \.profile-preferences-summary/);
  assert.match(css, /\.profile-preferences-card\[open\] \.profile-preferences-summary-state svg\s*\{ transform: rotate\(180deg\); \}/);
});

test('preference edits remain dirty and counted while the disclosure is collapsed', () => {
  const window = new Window({ url: 'https://hellorun.test/runner/profile#notifications' });
  window.document.body.innerHTML = `
    <details data-preferences-disclosure>
      <summary>Email updates <span data-preference-count>1 of 2 enabled</span></summary>
      <form data-profile-edit-form data-notification-preferences>
        <input type="checkbox" name="emailEnabled" value="one" checked>
        <input type="checkbox" name="emailEnabled" value="two">
        <button type="submit" data-save-btn data-preference-save>Save preferences</button>
        <span data-preference-status></span>
      </form>
    </details>`;
  window.eval(read('src/public/js/runner-profile.js'));

  const disclosure = window.document.querySelector('[data-preferences-disclosure]');
  const inputs = Array.from(window.document.querySelectorAll('input[name="emailEnabled"]'));
  const count = window.document.querySelector('[data-preference-count]');
  const status = window.document.querySelector('[data-preference-status]');
  const save = window.document.querySelector('[data-preference-save]');
  assert.equal(disclosure.open, false);
  assert.equal(count.textContent, '1 of 2 enabled');
  assert.equal(save.disabled, true);

  inputs[1].checked = true;
  inputs[1].dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(disclosure.open, false);
  assert.equal(count.textContent, '2 of 2 enabled');
  assert.equal(status.textContent, 'You have unsaved preference changes.');
  assert.equal(save.disabled, false);

  disclosure.open = true;
  assert.equal(inputs[1].checked, true);
});

test('achievements are compact by default while all management remains available', () => {
  const main = read('src/views/runner/partials/profile-main.ejs');
  const badgeCard = read('src/views/runner/partials/profile-badge-card.ejs');
  assert.match(main, /previewProgress/);
  assert.match(main, /previewBadges/);
  assert.match(main, /profile-all-achievements/);
  assert.match(main, /View all achievements/);
  assert.match(main, /profile-achievement-title-row[\s\S]*Public collection/);
  assert.doesNotMatch(main, /profile-achievement-actions/);
  assert.match(badgeCard, /profile-badge-card-details/);
  assert.match(badgeCard, /Feature badge/);
});

test('badge actions render balanced footers for every available action state', () => {
  const template = ejs.compile(read('src/views/runner/partials/profile-badge-card.ejs'));
  const base = {
    badgeType: 'distance', icon: 'award', imageUrl: '', name: 'A deliberately long achievement name',
    description: 'A long description remains available without clipping important recognition details.',
    typeLabel: 'distance badge', userBadgeId: 'badge-1'
  };

  const both = template({ badge: { ...base, isFeatured: false, shareUrl: '/badges/badge-1', certificateUrl: '/certificate' }, _csrfToken: 'csrf-token' });
  assert.match(both, /profile-badge-card-actions(?![^\"]*has-one-secondary)/);
  assert.equal((both.match(/profile-badge-card-button/g) || []).length, 2);
  assert.match(both, /method="POST" action="\/runner\/profile\/badges\/featured"/);
  assert.match(both, /name="_csrf" value="csrf-token"/);
  assert.match(both, /name="userBadgeId" value="badge-1"/);

  const one = template({ badge: { ...base, isFeatured: false, shareUrl: '/badges/badge-1', certificateUrl: '' }, _csrfToken: 'csrf-token' });
  assert.match(one, /profile-badge-card-actions has-one-secondary/);
  assert.equal((one.match(/profile-badge-card-button/g) || []).length, 1);

  const featuredOne = template({ badge: { ...base, isFeatured: true, shareUrl: '', certificateUrl: '/certificate' }, _csrfToken: 'csrf-token' });
  assert.match(featuredOne, /profile-badge-card-actions has-one-secondary/);
  assert.doesNotMatch(featuredOne, /Feature badge|badges\/featured/);

  const featuredNone = template({ badge: { ...base, isFeatured: true, shareUrl: '', certificateUrl: '' }, _csrfToken: 'csrf-token' });
  assert.doesNotMatch(featuredNone, /profile-badge-card-actions|Feature badge/);
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
  assert.match(css, /\.profile-badge-card-actions\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.profile-badge-action\s*\{ grid-column: 1 \/ -1; \}/);
  assert.match(css, /\.profile-badge-card-actions\.has-one-secondary > \.profile-badge-card-button\s*\{ grid-column: 1 \/ -1; \}/);
  assert.match(css, /\.profile-badge-card-button,[\s\S]*?min-height: 2\.75rem/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.profile-achievement-title-row\s*\{ justify-content: space-between; \}/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
